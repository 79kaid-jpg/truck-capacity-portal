-- email_setup.sql = migrations/0002_email.sql. Dán vào Supabase → SQL Editor → Run (chạy SAU setup_all.sql).
-- =====================================================================
-- 0002_email.sql : gửi email thông báo qua Resend
-- Cơ chế: mỗi thông báo trong ứng dụng thuộc loại quan trọng sẽ tạo một dòng
-- trong app.email_outbox; pg_cron mỗi phút gọi app.send_emails(), hàm này
-- gửi qua Resend API bằng pg_net. Khóa API nằm trong Supabase Vault
-- (tên 'resend_api_key'), không nằm trong mã nguồn hay bảng thường.
-- Chạy lại nhiều lần không sao.
-- =====================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists app.email_outbox (
  id              bigserial primary key,
  notification_id bigint references app.notifications(id) on delete set null,
  to_email        text not null,
  subject         text not null,
  html            text not null,
  status          text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  request_id      bigint,
  error           text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index if not exists email_outbox_status on app.email_outbox (status, id);
alter table app.email_outbox enable row level security;
revoke all on app.email_outbox from public, anon, authenticated;
revoke all on sequence app.email_outbox_id_seq from public, anon, authenticated;

-- Cấu hình mặc định (đổi bằng app.setup_email)
insert into app.settings (key, value) values
  ('emailOn', 'false'),
  ('emailFrom', '"Đặt Xe <onboarding@resend.dev>"'),
  ('siteUrl', '""'),
  ('emailTypes', '["Giữ chỗ","Xác nhận","Từ chối","Đổi ngày","Hủy booking","Sửa phần hàng","Chưa phân khu vực","Nhắc việc"]'),
  ('emailDailyCap', '95')
on conflict (key) do nothing;

update app.settings set value = value || '["Nhắc việc"]'::jsonb where key = 'emailTypes' and not (value ? 'Nhắc việc');

-- Bật/tắt và cấu hình email (chạy trong SQL Editor)
create or replace function app.setup_email(p_from text, p_site_url text, p_on boolean default true) returns text
language plpgsql security definer set search_path = '' as $$
begin
  insert into app.settings values ('emailFrom', to_jsonb(p_from)) on conflict (key) do update set value = excluded.value;
  insert into app.settings values ('siteUrl', to_jsonb(rtrim(coalesce(p_site_url, ''), '/'))) on conflict (key) do update set value = excluded.value;
  insert into app.settings values ('emailOn', to_jsonb(p_on)) on conflict (key) do update set value = excluded.value;
  return case when exists (select 1 from vault.decrypted_secrets where name = 'resend_api_key')
    then 'Đã cấu hình. Email ' || case when p_on then 'BẬT' else 'TẮT' end || ', gửi từ ' || p_from
    else 'Đã lưu cấu hình nhưng CHƯA có khóa resend_api_key trong Vault' end;
end $$;

-- Mẫu email
create or replace function app.email_html(p_name text, p_type text, p_text text, p_link jsonb) returns text
language sql stable security definer set search_path = '' as $$
  select '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#18212C">'
      || '<div style="background:#1F2C3D;color:#fff;padding:14px 18px;font-weight:bold;letter-spacing:.04em">ĐẶT XE · ' || replace(replace(p_type, '<', '&lt;'), '>', '&gt;') || '</div>'
      || '<div style="padding:18px;border:1px solid #D3D9DF;border-top:0">'
      || '<p style="margin:0 0 12px">Chào ' || replace(replace(coalesce(nullif(p_name, ''), 'bạn'), '<', '&lt;'), '>', '&gt;') || ',</p>'
      || '<p style="margin:0 0 16px;line-height:1.5">' || replace(replace(p_text, '<', '&lt;'), '>', '&gt;') || '</p>'
      || case when coalesce(app.setting('siteUrl') #>> '{}', '') <> '' then
           '<p style="margin:0 0 16px"><a href="' || (app.setting('siteUrl') #>> '{}') || '" style="background:#1F2C3D;color:#fff;padding:9px 16px;text-decoration:none;border-radius:6px;display:inline-block">Mở cổng Đặt Xe</a></p>'
         else '' end
      || '<p style="margin:0;font-size:12px;color:#5A6573">Email tự động từ Truck Capacity Booking Portal. Vui lòng không trả lời email này.</p>'
      || '</div></div>'
$$;

-- Trigger: thông báo mới → hàng đợi email
create or replace function app.enqueue_email() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p app.profiles;
begin
  if not coalesce((app.setting('emailOn') #>> '{}')::boolean, false) then return new; end if;
  if not exists (select 1 from jsonb_array_elements_text(coalesce(app.setting('emailTypes'), '[]'::jsonb)) t where t = new.type) then return new; end if;
  select * into p from app.profiles where user_id = new.user_id and active;
  if not found or coalesce(p.email, '') = '' then return new; end if;
  insert into app.email_outbox (notification_id, to_email, subject, html)
  values (new.id, p.email, '[Đặt Xe] ' || new.type || ': ' || left(new.text, 80), app.email_html(p.full_name, new.type, new.text, new.link));
  return new;
end $$;
drop trigger if exists notifications_email on app.notifications;
create trigger notifications_email after insert on app.notifications for each row execute function app.enqueue_email();

-- Gửi email đang chờ (pg_cron gọi mỗi phút)
create or replace function app.send_emails() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_key text; v_from text; v_cap int; v_today int; v_slots int; r record; v_rid bigint; n int := 0;
begin
  -- 1. Cập nhật kết quả các lần gửi trước
  update app.email_outbox o
     set status = case when h.status_code between 200 and 299 then 'sent' else 'failed' end,
         error = case when h.status_code between 200 and 299 then null else left(coalesce(h.error_msg, h.content::text, 'HTTP ' || h.status_code), 500) end,
         sent_at = now()
    from net._http_response h
   where o.status = 'sending' and h.id = o.request_id;
  update app.email_outbox set status = 'failed', error = 'Không nhận được phản hồi từ Resend'
   where status = 'sending' and created_at < now() - interval '30 minutes';

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then return 'Chưa có khóa resend_api_key trong Vault'; end if;
  v_from := coalesce(app.setting('emailFrom') #>> '{}', 'Đặt Xe <onboarding@resend.dev>');
  v_cap := coalesce(app.setn('emailDailyCap'), 95)::int;

  -- 2. Giới hạn gói Resend Free (100 email/ngày): vượt thì bỏ qua, vẫn còn thông báo trong ứng dụng
  select count(*) into v_today from app.email_outbox
   where status in ('sending','sent') and sent_at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh');
  v_slots := greatest(0, least(20, v_cap - v_today));
  if v_slots = 0 then
    update app.email_outbox set status = 'skipped', error = 'Vượt giới hạn email trong ngày'
     where status = 'queued' and created_at < now() - interval '2 hours';
    return 'Đã đạt giới hạn email hôm nay';
  end if;

  -- 3. Gửi
  for r in select * from app.email_outbox where status = 'queued' order by id limit v_slots for update skip locked loop
    v_rid := net.http_post(
      url := 'https://api.resend.com/emails',
      body := jsonb_build_object('from', v_from, 'to', jsonb_build_array(r.to_email), 'subject', r.subject, 'html', r.html),
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      timeout_milliseconds := 10000);
    update app.email_outbox set status = 'sending', request_id = v_rid, sent_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return 'Đã gửi ' || n || ' email';
end $$;

revoke all on function app.setup_email(text, text, boolean) from public, anon, authenticated;
revoke all on function app.email_html(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function app.enqueue_email() from public, anon, authenticated;
revoke all on function app.send_emails() from public, anon, authenticated;

-- Lịch chạy mỗi phút
do $$ begin
  perform cron.unschedule('send-emails');
exception when others then null; end $$;
select cron.schedule('send-emails', '* * * * *', 'select app.send_emails()');

-- Nhắc việc mỗi giờ (booking đổi ngày chưa xử lý, chờ xếp xe quá ngày bốc)
do $$ begin
  perform cron.unschedule('escalate');
exception when others then null; end $$;
select cron.schedule('escalate', '7 * * * *', 'select app.escalate()');

-- Admin: thống kê (thêm phần email) và gửi email thử
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles; v_start timestamptz := (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh');
begin
  me := app.require_perm('dash.system');
  return jsonb_build_object(
    'dbMb', round(pg_database_size(current_database()) / 1048576.0, 2),
    'bookings', (select count(*) from app.bookings),
    'notifsToday', (select count(*) from app.notifications where created_at >= v_start),
    'email', jsonb_build_object(
      'on', coalesce((app.setting('emailOn') #>> '{}')::boolean, false),
      'hasKey', exists (select 1 from vault.decrypted_secrets where name = 'resend_api_key'),
      'from', app.setting('emailFrom') #>> '{}',
      'cap', app.setn('emailDailyCap'),
      'sentToday', (select count(*) from app.email_outbox where status in ('sent','sending') and sent_at >= v_start),
      'queued', (select count(*) from app.email_outbox where status = 'queued'),
      'failedToday', (select count(*) from app.email_outbox where status = 'failed' and created_at >= v_start),
      'skippedToday', (select count(*) from app.email_outbox where status = 'skipped' and created_at >= v_start),
      'sentMonth', (select count(*) from app.email_outbox where status in ('sent','sending') and sent_at >= date_trunc('month', now())),
      'lastError', (select error from app.email_outbox where status = 'failed' order by id desc limit 1)
    )
  );
end $$;

create or replace function public.admin_test_email() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('dash.system');
  if not coalesce((app.setting('emailOn') #>> '{}')::boolean, false) then
    raise exception 'Email đang TẮT. Chạy select app.setup_email(...) trong Supabase SQL Editor để bật.';
  end if;
  insert into app.email_outbox (to_email, subject, html)
  values (me.email, '[Đặt Xe] Email thử', app.email_html(me.full_name, 'Email thử', 'Nếu bạn đọc được email này, cấu hình gửi email của cổng Đặt Xe đã hoạt động.', null));
  return me.email;
end $$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
revoke all on function public.admin_test_email() from public, anon;
grant execute on function public.admin_test_email() to authenticated;
