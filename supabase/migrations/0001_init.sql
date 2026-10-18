-- =====================================================================
-- Truck Capacity Booking Portal – POV
-- 0001_init.sql : bảng, hàm tính capacity, hàm nghiệp vụ (RPC), phân quyền
-- Chạy một lần trong Supabase → SQL Editor (hoặc `supabase db push`).
-- Nguyên tắc bảo mật:
--   * Mọi bảng nằm trong schema `app`, KHÔNG mở ra API, RLS bật, không policy
--     → người dùng không đọc/ghi trực tiếp được bảng nào.
--   * Trình duyệt chỉ gọi các hàm trong schema `public` (security definer),
--     mỗi hàm tự kiểm tra vai trò và chỉ trả dữ liệu được phép.
-- =====================================================================

create extension if not exists pgcrypto;
create schema if not exists app;

-- ---------------------------------------------------------------------
-- 1. Bảng
-- ---------------------------------------------------------------------
create table if not exists app.settings (
  key   text primary key,
  value jsonb not null
);

create table if not exists app.warehouses (
  code      text primary key,
  name      text not null,
  full_name text not null,
  active    boolean not null default true
);

create table if not exists app.regions (
  id              text primary key,
  warehouse_code  text not null references app.warehouses(code),
  code            text not null,
  name            text not null,
  new_province    text not null,
  round_trip_days int  not null default 1,
  active          boolean not null default true,
  unique (warehouse_code, name)
);

create table if not exists app.region_neighbors (
  region_a text not null references app.regions(id) on delete cascade,
  region_b text not null references app.regions(id) on delete cascade,
  primary key (region_a, region_b)
);

create table if not exists app.profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  phone             text,
  role              text not null check (role in ('customer','sales','cs','logistics','admin')),
  segment           text check (segment in ('DD','DA','EX')),
  customer_id       uuid,
  default_warehouse text not null default 'JM2' references app.warehouses(code),
  warehouses        text[] not null default '{}',
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists app.customers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  tax_code      text,
  segment       text not null check (segment in ('DD','DA','EX')),
  sales_user_id uuid references app.profiles(user_id),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
do $$ begin
  alter table app.profiles add constraint profiles_customer_fk foreign key (customer_id) references app.customers(id);
exception when duplicate_object then null; end $$;

-- CS phụ trách khách; nghỉ phép và người nhận thay của từng người dùng
alter table app.customers add column if not exists cs_user_id uuid references app.profiles(user_id);
alter table app.profiles  add column if not exists away_from date;
alter table app.profiles  add column if not exists away_to date;
alter table app.profiles  add column if not exists delegate_id uuid references app.profiles(user_id);
-- Phạm vi thống kê (chỉ ảnh hưởng số liệu tổng hợp, không mở quyền sửa): own = khách mình phụ trách, DD / DA = toàn segment, all = tất cả
alter table app.profiles  add column if not exists stat_scope text check (stat_scope in ('own','DD','DA','EX','all','team'));
-- v3.15: RSM – Sales báo cáo cho ai; RSM có phạm vi 'team' thấy khách của mình + các Sales mình quản lý
alter table app.profiles  add column if not exists manager_id uuid references app.profiles(user_id) on delete set null;
alter table app.profiles  add column if not exists notify_team boolean not null default false;
-- v3.18: tài khoản do Admin tạo → bắt đổi mật khẩu lần đầu; tên người đã xóa vẫn hiện trong lịch sử
alter table app.profiles  add column if not exists must_change_pw boolean not null default false;
-- v3.19: Chatbot
alter table app.customers add column if not exists chat_enabled boolean not null default false;
create table if not exists app.chat_log (
  id      bigserial primary key,
  user_id uuid not null,
  at      timestamptz not null default now(),
  tools   text[] not null default '{}'
);
create index if not exists chat_log_user_at on app.chat_log (user_id, at);
create table if not exists app.deleted_users (
  user_id    uuid primary key,
  full_name  text not null,
  email      text,
  role       text,
  deleted_at timestamptz not null default now(),
  deleted_by uuid
);

create table if not exists app.customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.customers(id) on delete cascade,
  label       text not null,
  ward        text not null default '',
  province    text not null,
  is_default  boolean not null default false
);

create table if not exists app.address_regions (
  address_id     uuid not null references app.customer_addresses(id) on delete cascade,
  warehouse_code text not null references app.warehouses(code),
  region_id      text not null references app.regions(id),
  primary key (address_id, warehouse_code)
);

create table if not exists app.products   (code text primary key, name text not null unique, active boolean not null default true);
create table if not exists app.colors     (code text primary key, name text not null unique, active boolean not null default true);
create table if not exists app.thicknesses(value_mm numeric(5,2) primary key check (value_mm between 0.1 and 10), active boolean not null default true);
create table if not exists app.widths     (value_mm int primary key check (value_mm between 100 and 2000), active boolean not null default true);

create table if not exists app.reason_codes (
  kind   text not null check (kind in ('reject','reschedule','cancel','override','fleet_cut')),
  code   text not null,
  name   text not null,
  active boolean not null default true,
  primary key (kind, code)
);

-- Danh mục quyền tính năng và ma trận Vai trò × Quyền (Admin cấu hình được)
create table if not exists app.permissions (
  code      text primary key,
  grp       text not null,
  name      text not null,
  descr     text not null default '',
  sort      int  not null default 0,
  def_roles text[] not null default '{}'
);
create table if not exists app.role_permissions (
  role    text not null check (role in ('sales','cs','logistics','admin')),
  perm    text not null references app.permissions(code) on delete cascade,
  allowed boolean not null,
  primary key (role, perm)
);

-- Phiên "Login as": Admin xem và thao tác với tư cách người dùng khác (tối đa 60 phút)
create table if not exists app.impersonations (
  admin_id   uuid primary key references app.profiles(user_id) on delete cascade,
  target_id  uuid not null references app.profiles(user_id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- v3.13: Yêu cầu đặt hàng (khách / Sales ghi nhanh, CS xử lý)
create table if not exists app.order_requests (
  id          bigserial primary key,
  customer_id uuid not null references app.customers(id) on delete cascade,
  wh          text not null,
  day         date not null,
  tons        numeric(10,2),
  body        text not null,
  status      text not null default 'new' check (status in ('new','done','declined','cancelled')),
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  handled_by  uuid,
  handled_at  timestamptz,
  reply       text,
  booking_id  text
);
create index if not exists order_requests_day on app.order_requests (day, status);
-- v3.23: khách / Sales ghi NGÀY GIAO; day = ngày bốc dự kiến (ngày giao − số ngày vận chuyển của kho), CS sửa được
alter table app.order_requests add column if not exists deliver_on date;
update app.order_requests set deliver_on = day where deliver_on is null;

-- v3.24: Trao đổi nội bộ theo đơn / xe / ngày-kho (khách hàng không thấy)
create table if not exists app.talk_threads (
  id          bigserial primary key,
  kind        text not null check (kind in ('bk','truck','day')),
  ref         text not null,
  wh          text,
  day         date,
  customer_id uuid,
  status      text not null default 'open' check (status in ('open','wait','answered','done')),
  asked_by    uuid,
  asked_at    timestamptz,
  wait_users  uuid[] not null default '{}',
  reminded    int not null default 0,
  pinned      text,
  pinned_by   uuid,
  pinned_at   timestamptz,
  last_at     timestamptz not null default now(),
  last_by     uuid,
  last_text   text,
  n           int not null default 0,
  created_at  timestamptz not null default now(),
  unique (kind, ref)
);
create table if not exists app.talk_files (
  id         bigserial primary key,
  data       bytea not null,
  mime       text not null,
  size       int not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create table if not exists app.talk_msgs (
  id         bigserial primary key,
  thread_id  bigint not null references app.talk_threads(id) on delete cascade,
  body       text not null default '',
  ask        boolean not null default false,
  mentions   uuid[] not null default '{}',
  tags       text[] not null default '{}',
  file_id    bigint references app.talk_files(id) on delete set null,
  reacts     jsonb not null default '{}',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);
create index if not exists talk_msgs_thread on app.talk_msgs (thread_id, id);
create table if not exists app.talk_reads (
  user_id   uuid not null,
  thread_id bigint not null references app.talk_threads(id) on delete cascade,
  read_at   timestamptz,
  mode      text not null default '' check (mode in ('','follow','mute')),
  primary key (user_id, thread_id)
);

-- v3.8: Admin "Xem như khách hàng" (chỉ xem) – không cần khách có tài khoản
create table if not exists app.cust_views (
  admin_id    uuid primary key references app.profiles(user_id) on delete cascade,
  customer_id uuid not null,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create table if not exists app.daily_fleet (
  warehouse_code text not null references app.warehouses(code),
  day            date not null,
  dk_count       int  not null check (dk_count between 0 and 99),
  cn_count       int  not null check (cn_count between 0 and 99),
  reason         text not null default '',
  updated_by     uuid,
  updated_at     timestamptz not null default now(),
  primary key (warehouse_code, day)
);

-- Thông tin từng xe trong ngày (xe thuê ngoài: thông số chỉ biết khi xe đến bốc)
-- cap = tải trọng đã chỉnh cho riêng xe này hôm đó (null = theo mặc định loại xe)
create table if not exists app.truck_days (
  truck_code     text primary key,
  warehouse_code text not null references app.warehouses(code),
  day            date not null,
  cap            numeric(6,2),
  plate          text not null default '',
  driver         text not null default '',
  phone          text not null default '',
  reason         text not null default '',
  updated_by     uuid,
  updated_at     timestamptz not null default now()
);
create index if not exists truck_days_wh_day on app.truck_days (warehouse_code, day);

create table if not exists app.booking_seq (
  warehouse_code text not null,
  day            date not null,
  last           int  not null,
  primary key (warehouse_code, day)
);

create table if not exists app.bookings (
  id             text primary key,
  warehouse_code text not null references app.warehouses(code),
  day            date not null,
  delivery_date  date,
  customer_id    uuid not null references app.customers(id),
  ref            text not null default '',
  address_id     uuid references app.customer_addresses(id) on delete set null,
  address_text   text not null default '',
  province       text not null default '',
  region_id      text references app.regions(id),
  status         text not null check (status in ('draft','hold','ok','rejected','resched','cancelled')),
  note           text not null default '',
  cs_user_id     uuid references app.profiles(user_id),
  held_at        timestamptz,
  confirmed_at   timestamptz,
  closed_at      timestamptz,
  reason_code    text,
  reason_note    text not null default '',
  proposed_day   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists bookings_wh_day_status on app.bookings (warehouse_code, day, status);
alter table app.bookings add column if not exists escalated_at timestamptz;
alter table app.bookings add column if not exists ship_remind_on date; -- v3.15: lần nhắc Logistics xác nhận giao gần nhất
create index if not exists bookings_customer on app.bookings (customer_id);

-- v2.9 (mục 14 SRS): trạng thái giao hàng, ngày bốc gốc, đơn khẩn, hủy cận ngày, tách đơn, danh sách cuộn
do $$ begin
  alter table app.bookings drop constraint if exists bookings_status_check;
  alter table app.bookings add constraint bookings_status_check
    check (status in ('draft','hold','ok','rejected','resched','cancelled','loaded','transit','delivered','failed'));
end $$;
alter table app.bookings add column if not exists original_day     date;            -- BR-40: ngày bốc lúc giữ chỗ lần đầu
alter table app.bookings add column if not exists change_count     int not null default 0;
alter table app.bookings add column if not exists urgent           boolean not null default false;  -- BR-41
alter table app.bookings add column if not exists urgent_override  boolean;        -- null = tự tính; true/false = Admin đặt
alter table app.bookings add column if not exists urgent_note      text not null default '';
alter table app.bookings add column if not exists late_cancel      boolean not null default false;  -- BR-42
alter table app.bookings add column if not exists parent_id        text references app.bookings(id); -- BR-46
alter table app.bookings add column if not exists requested_tons   numeric(9,2);   -- tấn khách yêu cầu ban đầu (khi đã tách / bớt)
alter table app.bookings add column if not exists undelivered_tons numeric(9,2);   -- phần không giao + lý do
alter table app.bookings add column if not exists undelivered_note text not null default '';
alter table app.bookings add column if not exists delivery_at      timestamptz;    -- BR-43: có chi tiết giao hàng lúc
alter table app.bookings add column if not exists loaded_at        timestamptz;    -- BR-45
alter table app.bookings add column if not exists short_tons       numeric(9,2);   -- load thiếu chờ CS xử lý
alter table app.bookings add column if not exists load_note        text not null default '';
alter table app.bookings add column if not exists eta              timestamptz;
alter table app.bookings add column if not exists delivered_at     timestamptz;
alter table app.bookings add column if not exists fail_note        text not null default '';
create index if not exists bookings_parent on app.bookings (parent_id);
update app.bookings set original_day = day where original_day is null and status not in ('draft');

create table if not exists app.delivery_items (
  id          bigserial primary key,
  booking_id  text not null references app.bookings(id) on delete cascade,
  seq         int  not null,
  whs         text not null default '',
  order_no    text not null default '',
  ln          text not null default '',
  itmno       text not null default '',
  name        text not null default '',
  lot         text not null,
  qty         numeric(9,3) not null check (qty > 0),
  attr        text not null default '',
  customer    text not null default '',
  loaded      boolean not null default true,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  unique (booking_id, lot)
);
create index if not exists delivery_items_lot on app.delivery_items (lot);

alter table app.truck_days add column if not exists closed        boolean not null default false;  -- BR-47
alter table app.truck_days add column if not exists closed_reason text not null default '';
alter table app.customers  add column if not exists erp_code      text not null default '';
alter table app.warehouses add column if not exists erp_code      text not null default '';
alter table app.profiles   add column if not exists email_level   text not null default 'all' check (email_level in ('all','urgent','none'));
alter table app.profiles   add column if not exists alt_email     text;
-- v3.0: kho mặc định của khách (khách vẫn đặt được từ mọi kho)
alter table app.customers add column if not exists default_wh text;

-- v3.0: đổi mã kho sang mã ERP (PMY → JM2, HPG → JD8, CLO → JD9). Đơn cũ giữ mã booking BK-PMY-…,
-- mọi dữ liệu khác chuyển sang mã mới. Chạy lại nhiều lần không sao (chỉ chạy khi còn mã cũ).
do $$
declare m record;
begin
  for m in select * from (values ('PMY','JM2'), ('HPG','JD8'), ('CLO','JD9')) v(o, n)
           where exists (select 1 from app.warehouses where code = v.o) loop
    insert into app.warehouses (code, name, full_name, active, erp_code)
    select m.n, name, full_name, active, m.n from app.warehouses where code = m.o
    on conflict (code) do nothing;
    update app.regions        set warehouse_code = m.n where warehouse_code = m.o;
    update app.address_regions set warehouse_code = m.n where warehouse_code = m.o;
    update app.daily_fleet    set warehouse_code = m.n where warehouse_code = m.o;
    update app.truck_days     set warehouse_code = m.n, truck_code = m.n || substr(truck_code, length(m.o) + 1) where warehouse_code = m.o;
    update app.allocations    set truck_code = m.n || substr(truck_code, length(m.o) + 1) where truck_code like m.o || '-%';
    update app.booking_seq    set warehouse_code = m.n where warehouse_code = m.o
       and not exists (select 1 from app.booking_seq s where s.warehouse_code = m.n and s.day = booking_seq.day);
    delete from app.booking_seq where warehouse_code = m.o;
    update app.bookings       set warehouse_code = m.n where warehouse_code = m.o;
    update app.merge_suggestion_log set warehouse_code = m.n, truck_code = m.n || substr(truck_code, length(m.o) + 1) where warehouse_code = m.o;
    update app.profiles       set default_warehouse = m.n where default_warehouse = m.o;
    update app.profiles       set warehouses = array_replace(warehouses, m.o, m.n) where m.o = any(warehouses);
    update app.customers      set default_wh = m.n where default_wh = m.o;
    update app.notifications  set link = jsonb_set(link, '{wh}', to_jsonb(m.n)) where link->>'wh' = m.o;
    delete from app.warehouses where code = m.o;
  end loop;
end $$;
alter table app.profiles alter column default_warehouse set default 'JM2';

do $$ begin
  alter table app.reason_codes drop constraint if exists reason_codes_kind_check;
  alter table app.reason_codes add constraint reason_codes_kind_check
    check (kind in ('reject','reschedule','cancel','override','fleet_cut','change','nodeliver','fail','close'));
end $$;

create table if not exists app.booking_lines (
  id           bigserial primary key,
  booking_id   text not null references app.bookings(id) on delete cascade,
  product      text,
  color        text,
  thickness_mm numeric(5,2),
  width_mm     int,
  tons         numeric(9,2) not null check (tons > 0)
);
create index if not exists booking_lines_bk on app.booking_lines (booking_id);

create table if not exists app.allocations (
  id              uuid primary key default gen_random_uuid(),
  booking_id      text not null references app.bookings(id) on delete cascade,
  truck_code      text not null,
  tons            numeric(9,2) not null check (tons > 0),
  override        boolean not null default false,
  override_reason text,
  created_at      timestamptz not null default now(),
  unique (booking_id, truck_code)
);
create index if not exists allocations_truck on app.allocations (truck_code);

create table if not exists app.booking_status_history (
  id          bigserial primary key,
  booking_id  text not null references app.bookings(id) on delete cascade,
  from_status text,
  to_status   text not null,
  reason_code text,
  note        text,
  actor       uuid,
  at          timestamptz not null default now()
);

create table if not exists app.audit_log (
  id        bigserial primary key,
  entity_id text not null,
  detail    text not null,
  actor     uuid,
  at        timestamptz not null default now()
);
create index if not exists audit_entity on app.audit_log (entity_id);

create table if not exists app.notifications (
  id         bigserial primary key,
  user_id    uuid not null references app.profiles(user_id) on delete cascade,
  type       text not null,
  text       text not null,
  link       jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on app.notifications (user_id, created_at desc);

create table if not exists app.merge_suggestion_log (
  id             bigserial primary key,
  warehouse_code text not null,
  day            date not null,
  booking_ids    text[] not null,
  truck_code     text,
  fill_ratio     numeric,
  outcome        text not null check (outcome in ('applied','skipped','expired')),
  actor          uuid,
  at             timestamptz not null default now()
);

-- Khóa toàn bộ schema app với người dùng API
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('alter table app.%I enable row level security', t.tablename);
  end loop;
end $$;
revoke all on schema app from public, anon, authenticated;
revoke all on all tables in schema app from public, anon, authenticated;
revoke all on all sequences in schema app from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Hàm nội bộ (schema app)
-- ---------------------------------------------------------------------
-- Chuẩn hóa để tìm kiếm: chữ thường, bỏ dấu tiếng Việt
create or replace function app.fold(t text) returns text
language sql immutable set search_path = '' as $$
  select lower(translate(coalesce(t, ''),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'))
$$;

create or replace function app.today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

create or replace function app.setting(k text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from app.settings where key = k
$$;

create or replace function app.setn(k text) returns numeric
language sql stable security definer set search_path = '' as $$
  select (value #>> '{}')::numeric from app.settings where key = k
$$;

-- Người dùng hiệu lực: người được "Login as" nếu Admin đang có phiên hợp lệ, ngược lại chính người đăng nhập
-- Xác thực 2 lớp (MFA, TOTP): vai trò có quyền 'auth.mfa' (mặc định Logistics, CS, Admin) hoặc người đã tự bật MFA
-- phải đăng nhập đủ 2 lớp (aal2). Chưa đủ thì app.real_uid() = null: mọi hàm coi như chưa đăng nhập.
create or replace function app.mfa_needed(p_uid uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  if p_uid is null then return false; end if;
  select role into v_role from app.profiles where user_id = p_uid and active;
  return (v_role is not null and app.role_has(v_role, 'auth.mfa'))
      or exists (select 1 from auth.mfa_factors f where f.user_id = p_uid and f.status::text = 'verified');
end $$;

create or replace function app.aal() returns text
language sql stable security definer set search_path = '' as $$ select coalesce(nullif(auth.jwt() ->> 'aal', ''), 'aal1') $$;

create or replace function app.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$ select app.aal() = 'aal2' or not app.mfa_needed(auth.uid()) $$;

create or replace function app.real_uid() returns uuid
language sql stable security definer set search_path = '' as $$ select case when app.mfa_ok() then auth.uid() end $$;

create or replace function app.has_mfa(p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.mfa_factors f where f.user_id = p_uid and f.status::text = 'verified') $$;

create or replace function app.uid() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  select i.target_id into v from app.impersonations i
    join app.profiles a on a.user_id = i.admin_id and a.active
    join app.profiles t on t.user_id = i.target_id and t.active
   where i.admin_id = app.real_uid() and i.expires_at > now() and app.role_has(a.role, 'users.impersonate');
  return coalesce(v, app.real_uid());
end $$;

create or replace function app.impersonating() returns boolean
language sql stable security definer set search_path = '' as $$ select app.uid() is distinct from app.real_uid() $$;

create or replace function app.me() returns app.profiles
language sql stable security definer set search_path = '' as $$
  select p.* from app.profiles p where p.user_id = app.uid() and p.active
$$;

create or replace function app.require_role(roles text[]) returns app.profiles
language plpgsql stable security definer set search_path = '' as $$
declare m app.profiles;
begin
  select * into m from app.profiles p where p.user_id = app.uid() and p.active;
  if not found then
    if auth.uid() is not null and not app.mfa_ok() then
      raise exception 'Cần xác thực 2 lớp: tải lại trang và nhập mã từ ứng dụng xác thực.' using errcode = '42501';
    end if;
    raise exception 'Tài khoản chưa được cấp quyền hoặc đã bị khóa.' using errcode = '42501';
  end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng (chỉ xem). Bấm Thoát trên thanh màu cam trước khi thao tác.' using errcode = '42501';
  end if;
  if not (m.role = any(roles)) then
    raise exception 'Vai trò % không được phép thực hiện thao tác này.', m.role using errcode = '42501';
  end if;
  return m;
end $$;

-- Quyền tính năng. Khách hàng không bao giờ có quyền nào (phạm vi cố định để bảo mật).
-- Admin luôn có perms.manage để không tự khóa mình.
create or replace function app.role_has(p_role text, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_role <> 'customer' and (
    (p_role = 'admin' and p_perm = 'perms.manage')
    or exists (select 1 from app.role_permissions rp where rp.role = p_role and rp.perm = p_perm and rp.allowed))
$$;

create or replace function app.has_perm(p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.profiles p where p.user_id = app.uid() and p.active and app.role_has(p.role, p_perm))
$$;

create or replace function app.my_perms(p_role text) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(code order by sort), '{}') from app.permissions where app.role_has(p_role, code)
$$;

create or replace function app.require_perm(p_perm text) returns app.profiles
language plpgsql stable security definer set search_path = '' as $$
declare m app.profiles; v_name text;
begin
  select * into m from app.profiles p where p.user_id = app.uid() and p.active;
  if not found then
    if auth.uid() is not null and not app.mfa_ok() then
      raise exception 'Cần xác thực 2 lớp: tải lại trang và nhập mã từ ứng dụng xác thực.' using errcode = '42501';
    end if;
    raise exception 'Tài khoản chưa được cấp quyền hoặc đã bị khóa.' using errcode = '42501';
  end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng (chỉ xem). Bấm Thoát trên thanh màu cam trước khi thao tác.' using errcode = '42501';
  end if;
  if not app.role_has(m.role, p_perm) then
    select name into v_name from app.permissions where code = p_perm;
    raise exception 'Vai trò của bạn chưa được cấp quyền "%". Liên hệ Admin.', coalesce(v_name, p_perm) using errcode = '42501';
  end if;
  return m;
end $$;

-- Sales chỉ được thao tác trên khách mình phụ trách
-- v3.15: Sales thấy khách mình phụ trách; RSM (phạm vi 'team') thấy thêm khách của Sales mình quản lý
create or replace function app.in_team(p_mgr uuid, p_sales uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_sales is not null and (p_sales = p_mgr or exists (select 1 from app.profiles r where r.user_id = p_sales and r.manager_id = p_mgr))
$$;
create or replace function app.sees_sales(m app.profiles, p_sales uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select m.role <> 'sales' or p_sales = m.user_id
      or (coalesce(m.stat_scope, 'own') = 'team' and app.in_team(m.user_id, p_sales))
$$;
-- RSM muốn nhận thông báo đơn của nhóm (từ chối / đổi ngày)
create or replace function app.rsm_of(p_sales uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.user_id), '{}') from app.profiles s join app.profiles m on m.user_id = s.manager_id
   where s.user_id = p_sales and m.active and m.notify_team and m.stat_scope = 'team'
$$;
create or replace function app.team_ids(m app.profiles) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case when coalesce(m.stat_scope, 'own') = 'team'
    then array[m.user_id] || coalesce((select array_agg(user_id order by user_id) from app.profiles where manager_id = m.user_id), '{}')
    else array[m.user_id] end
$$;

create or replace function app.check_scope(m app.profiles, p_customer uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if m.role = 'sales' and not app.sees_sales(m, (select c.sales_user_id from app.customers c where c.id = p_customer)) then
    raise exception 'Booking này thuộc khách hàng bạn không phụ trách.' using errcode = '42501';
  end if;
end $$;

create or replace function app.is_holiday(p_wh text, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select (coalesce((app.setting('sundayOff') #>> '{}')::boolean, true) and extract(dow from p_day) = 0)
      or exists (select 1 from jsonb_array_elements_text(coalesce(app.setting('holidays'), '[]'::jsonb)) h where h = p_day::text)
$$;

create or replace function app.truck_code(p_wh text, p_day date, p_type text, p_seq int) returns text
language sql immutable set search_path = '' as $$
  select p_wh || '-' || to_char(p_day, 'DDMMYY') || '-' || p_type || '-' || lpad(p_seq::text, 2, '0')
$$;

create or replace function app.trucks(p_wh text, p_day date)
returns table (code text, type text, seq int, cap numeric)
language sql stable security definer set search_path = '' as $$
  select t.code, t.type, t.seq, coalesce(td.cap, t.defcap)
    from (
      select app.truck_code(p_wh, p_day, 'DK', g) as code, 'DK' as type, g as seq, app.setn('capDK') as defcap
        from app.daily_fleet f, generate_series(1, f.dk_count) g
       where f.warehouse_code = p_wh and f.day = p_day
      union all
      select app.truck_code(p_wh, p_day, 'XT', g), 'XT', g, app.setn('capCN')
        from app.daily_fleet f, generate_series(1, f.cn_count) g
       where f.warehouse_code = p_wh and f.day = p_day
    ) t
    left join app.truck_days td on td.truck_code = t.code
$$;

create or replace function app.bk_total(p_id text) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(tons), 0) from app.booking_lines where booking_id = p_id
$$;

create or replace function app.alloc_sum(p_id text) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(tons), 0) from app.allocations where booking_id = p_id
$$;

-- Trạng thái đang chiếm tải trên xe / capacity ngày (BR-48)
create or replace function app.active_sts() returns text[]
language sql immutable set search_path = '' as $$ select array['hold','ok','loaded','transit','delivered'] $$;

-- Mốc chốt xe của một ngày bốc = giờ chốt (mặc định 16:00) của ngày hôm trước, giờ Việt Nam (BR-41)
create or replace function app.cutoff_at(p_day date) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select ((p_day - 1)::timestamp + coalesce(nullif(app.setting('cutoff') #>> '{}', ''), '16:00')::time) at time zone 'Asia/Ho_Chi_Minh'
$$;

create or replace function app.truck_closed(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select closed from app.truck_days where truck_code = p_code), false)
$$;

-- v3.16: xe đã chạy = có đơn trên xe Đang giao / Đã giao / Giao lỗi. Đã chạy hoặc đã đóng → khóa xếp thêm, chỗ trống không tính vào còn đặt được
create or replace function app.truck_departed(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.allocations a join app.bookings b on b.id = a.booking_id
                  where a.truck_code = p_code and b.status in ('transit','delivered','failed'))
$$;
create or replace function app.truck_locked(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.truck_closed(p_code) or app.truck_departed(p_code)
$$;

create or replace function app.uname(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select full_name from app.profiles where user_id = p_user),
                  (select full_name || ' (đã xóa)' from app.deleted_users where user_id = p_user))
$$;

create or replace function app.short_code(p_code text) returns text
language sql immutable set search_path = '' as $$ select split_part(p_code, '-', 3) || '-' || split_part(p_code, '-', 4) $$;

create or replace function app.truck_load(p_code text, p_except text default null) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(a.tons), 0)
    from app.allocations a join app.bookings b on b.id = a.booking_id
   where a.truck_code = p_code and b.status = any(app.active_sts()) and b.id is distinct from p_except
$$;

create or replace function app.truck_regions(p_code text, p_except text default null) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct coalesce(b.region_id, 'NONE')), '{}')
    from app.allocations a join app.bookings b on b.id = a.booking_id
   where a.truck_code = p_code and b.status = any(app.active_sts()) and b.id is distinct from p_except
$$;

create or replace function app.truck_stops(p_code text, p_except text default null) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct b.customer_id::text || '|' || b.address_text), '{}')
    from app.allocations a join app.bookings b on b.id = a.booking_id
   where a.truck_code = p_code and b.status = any(app.active_sts()) and b.id is distinct from p_except
$$;

create or replace function app.are_neighbors(a text, b text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.region_neighbors n where n.region_a = a and n.region_b = b)
$$;

-- Chỉ số một ngày của một kho (SRS mục 5.1)
create or replace function app.day_metrics(p_wh text, p_day date, p_except text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t record; l numeric;
  v_cap numeric := 0; v_loaded numeric := 0; v_free numeric := 0; v_held numeric := 0;
  v_avail numeric; v_usage numeric; v_status text;
  v_declared boolean; v_off boolean;
begin
  v_off := app.is_holiday(p_wh, p_day);
  v_declared := exists (select 1 from app.daily_fleet f where f.warehouse_code = p_wh and f.day = p_day);
  for t in select * from app.trucks(p_wh, p_day) loop
    l := app.truck_load(t.code, p_except);
    v_cap := v_cap + t.cap; v_loaded := v_loaded + l;
    if not app.truck_locked(t.code) then v_free := v_free + greatest(0, t.cap - l); end if;
  end loop;
  select coalesce(sum(greatest(0, app.bk_total(b.id) - app.alloc_sum(b.id))), 0) into v_held
    from app.bookings b
   where b.warehouse_code = p_wh and b.day = p_day and b.status = 'hold' and b.id is distinct from p_except;
  v_avail := greatest(0, round(v_free - v_held, 2));
  v_usage := case when v_cap > 0 then (v_loaded + v_held) / v_cap else 0 end;
  v_status := case
    when v_off and not v_declared then 'off'   -- BR-38: ngày nghỉ có khai báo xe thì đặt được như ngày thường
    when not v_declared then 'none'
    when v_avail <= 0.005 then 'full'
    when v_usage >= app.setn('near') / 100 then 'near'
    else 'ok' end;
  return jsonb_build_object('cap', v_cap, 'loaded', round(v_loaded, 2), 'held', round(v_held, 2), 'free', round(v_free, 2),
                            'avail', v_avail, 'usage', round(v_usage, 4), 'status', v_status,
                            'declared', v_declared, 'off', v_off);
end $$;

create or replace function app.lock_day(p_wh text, p_day date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from app.daily_fleet f where f.warehouse_code = p_wh and f.day = p_day for update;
end $$;

create or replace function app.audit(p_entity text, p_detail text) returns void
language sql security definer set search_path = '' as $$
  insert into app.audit_log (entity_id, detail, actor)
  values (p_entity, p_detail || case when app.impersonating() then ' · ' || coalesce((select full_name from app.profiles where user_id = app.real_uid()), 'Admin') || ' thao tác thay (Login as)' else '' end, app.uid())
$$;

create or replace function app.status_change(p_id text, p_from text, p_to text, p_reason text default null, p_note text default null) returns void
language sql security definer set search_path = '' as $$
  insert into app.booking_status_history (booking_id, from_status, to_status, reason_code, note, actor)
  values (p_id, p_from, p_to, p_reason, p_note, app.uid())
$$;

create or replace function app.notify(p_users uuid[], p_type text, p_text text, p_link jsonb default null) returns void
language sql security definer set search_path = '' as $$
  insert into app.notifications (user_id, type, text, link)
  select distinct u, p_type, p_text, p_link from unnest(p_users) u
   where u is not null and exists (select 1 from app.profiles p where p.user_id = u and p.active)
$$;

create or replace function app.is_away(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.profiles p where p.user_id = p_user and p.away_from is not null and app.today() between p.away_from and coalesce(p.away_to, p.away_from))
$$;

-- Gửi thông báo về booking cho CS: CS phụ trách khách (nếu nghỉ → người nhận thay), người tạo booking;
-- không còn CS nào nhận → gửi tất cả CS đang làm việc. Ghi chú khi khách chưa có tài khoản.
create or replace function app.notify_cs(p_customer uuid, p_creator uuid, p_type text, p_text text, p_link jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare c app.customers; cs app.profiles; d app.profiles; v_txt text; v_cov int := 0;
begin
  select * into c from app.customers where id = p_customer;
  v_txt := p_text || case when not exists (select 1 from app.profiles where customer_id = p_customer and role = 'customer' and active)
                          then ' · Khách chưa có tài khoản: báo khách qua điện thoại.' else '' end;
  if c.cs_user_id is not null then
    select * into cs from app.profiles where user_id = c.cs_user_id and active;
    if found then
      if not app.is_away(cs.user_id) then
        perform app.notify(array[cs.user_id], p_type, v_txt, p_link); v_cov := v_cov + 1;
      else
        select * into d from app.profiles where user_id = cs.delegate_id and active;
        if found and not app.is_away(d.user_id) then
          perform app.notify(array[d.user_id], p_type, '[Nhận thay cho ' || cs.full_name || '] ' || v_txt, p_link); v_cov := v_cov + 1;
        end if;
      end if;
    end if;
  end if;
  if p_creator is not null and p_creator is distinct from cs.user_id and p_creator is distinct from d.user_id and not app.is_away(p_creator) then
    perform app.notify(array[p_creator], p_type, v_txt, p_link);
    if exists (select 1 from app.profiles where user_id = p_creator and role = 'cs' and active) then v_cov := v_cov + 1; end if;
  end if;
  if v_cov = 0 then
    perform app.notify(array(select user_id from app.profiles where role = 'cs' and active and not app.is_away(user_id) and user_id is distinct from p_creator),
                       p_type, '[Chưa có CS phụ trách trực] ' || v_txt, p_link);
  end if;
end $$;

-- Thông báo booking: CS (theo notify_cs) + những người khác (Sales, tài khoản khách…)
create or replace function app.notify_bk(p_customer uuid, p_creator uuid, p_others uuid[], p_type text, p_text text, p_link jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.notify_cs(p_customer, p_creator, p_type, p_text, p_link);
  perform app.notify(p_others, p_type, p_text, p_link);
end $$;

create or replace function app.logistics_of(p_wh text) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(user_id), '{}') from app.profiles
   where role = 'logistics' and active and (p_wh = any(warehouses) or default_warehouse = p_wh)
$$;

create or replace function app.customer_users(p_customer uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(user_id), '{}') from app.profiles where role = 'customer' and active and customer_id = p_customer
$$;

create or replace function app.role_users(p_roles text[]) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(user_id), '{}') from app.profiles where role = any(p_roles) and active
$$;

create or replace function app.dm(p_day date) returns text
language sql immutable set search_path = '' as $$ select to_char(p_day, 'DD/MM') $$;

create or replace function app.fmt(n numeric) returns text
language sql immutable set search_path = '' as $$ select replace(to_char(round(n, 2), 'FM999999990.00'), '.', ',') $$;

-- Xác nhận booking (dùng chung cho confirm và confirm_group)
create or replace function app.confirm_internal(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare b app.bookings; c app.customers; v_trucks text; m jsonb;
begin
  select * into b from app.bookings where id = p_id;
  select * into c from app.customers where id = b.customer_id;
  update app.bookings set status = 'ok', confirmed_at = now(), updated_at = now() where id = p_id;
  perform app.status_change(p_id, b.status, 'ok');
  select string_agg(split_part(truck_code, '-', 3) || '-' || split_part(truck_code, '-', 4) || ' ' || app.fmt(tons) || ' MT', ', ' order by truck_code)
    into v_trucks from app.allocations where booking_id = p_id;
  perform app.audit(p_id, 'Xác nhận, xe: ' || coalesce(v_trucks, ''));
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Xác nhận',
    p_id || ' · ' || c.name || ' ' || app.fmt(app.bk_total(p_id)) || ' MT ngày ' || app.dm(b.day) || ' đã xác nhận. Xe: ' || coalesce(v_trucks, ''),
    jsonb_build_object('bk', p_id));
  perform app.notify(app.customer_users(c.id), 'Xác nhận',
    'Đơn ' || b.ref || ' ngày ' || app.dm(b.day) || ' đã được xác nhận, ' || app.fmt(app.bk_total(p_id)) || ' tấn',
    jsonb_build_object('bk', p_id, 'day', b.day));
  m := app.day_metrics(b.warehouse_code, b.day);
  if m->>'status' = 'full' then
    perform app.notify(app.role_users(array['cs','sales']) || app.logistics_of(b.warehouse_code), 'Đã đầy',
      'Kho ' || b.warehouse_code || ' ngày ' || app.dm(b.day) || ' đã hết chỗ', jsonb_build_object('day', b.day, 'wh', b.warehouse_code));
  end if;
end $$;

revoke all on all functions in schema app from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Hàm đọc dữ liệu (public, gọi từ trình duyệt)
-- ---------------------------------------------------------------------

-- Toàn bộ dữ liệu cho giao diện trong khoảng ngày, đã lọc theo vai trò
-- v3.1: p_cat = khóa danh mục khách trình duyệt đang giữ; trùng thì không gửi lại danh sách khách (null)
drop function if exists public.get_state(date, date);
-- v3.30: JSON một đơn cho nội bộ (dùng chung get_state / get_delta)
create or replace function app.bk_json(b app.bookings, me app.profiles, p_sales uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return case when not app.sees_sales(me, p_sales) then
                     -- Sales: hàng của khách không phụ trách chỉ còn số tấn để tính capacity
                     jsonb_build_object('id', b.id, 'wh', b.warehouse_code, 'date', b.day, 'customerId', '__other', 'ref', '', 'addrText', 'Khách khác',
                       'province', '', 'region', coalesce(b.region_id, 'NONE'), 'status', b.status, 'csId', null,
                       'heldAt', extract(epoch from b.held_at) / 60,
                       'lines', jsonb_build_array(jsonb_build_object('p', '', 'c', '', 'th', null, 'w', null, 't', app.bk_total(b.id))))
                   else
                     jsonb_build_object('id', b.id, 'wh', b.warehouse_code, 'date', b.day, 'delivery', b.delivery_date, 'customerId', b.customer_id,
                       'ref', b.ref, 'addrId', b.address_id, 'addrText', b.address_text, 'province', b.province, 'region', coalesce(b.region_id, 'NONE'),
                       'status', b.status, 'rev', b.rev, 'csId', b.cs_user_id, 'heldAt', extract(epoch from coalesce(b.held_at, b.created_at)) / 60,
                       'note', b.note, 'rejectReason', b.reason_note, 'reasonCode', b.reason_code, 'proposedDate', b.proposed_day,
                       'origDate', b.original_day, 'changes', b.change_count, 'urgent', b.urgent, 'urgentSet', b.urgent_override, 'urgentNote', b.urgent_note,
                       'lateCancel', b.late_cancel, 'parent', b.parent_id, 'requested', b.requested_tons, 'undelivered', b.undelivered_tons,
                       'undeliveredNote', b.undelivered_note, 'deliveryAt', extract(epoch from b.delivery_at) / 60,
                       'coils', (select count(*) from app.delivery_items di where di.booking_id = b.id),
                       'coilTons', (select sum(qty) from app.delivery_items di where di.booking_id = b.id),
                       'loadedAt', extract(epoch from b.loaded_at) / 60, 'shortTons', b.short_tons, 'loadNote', b.load_note,
                       'eta', extract(epoch from b.eta) / 60, 'deliveredAt', extract(epoch from b.delivered_at) / 60, 'failNote', b.fail_note,
                       'holiday', app.is_holiday(b.warehouse_code, b.day),
                       'lines', (select coalesce(jsonb_agg(jsonb_build_object('p', l.product, 'c', l.color, 'th', l.thickness_mm, 'w', l.width_mm, 't', l.tons) order by l.id), '[]')
                                 from app.booking_lines l where l.booking_id = b.id))
                   end;
end
$$;

create or replace function public.get_state(p_from date, p_to date, p_cat text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me app.profiles; res jsonb; v_cfg jsonb; v_internal boolean; v_cat text; v_cv app.cust_views; v_cvname text;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found then
    if auth.uid() is not null and not app.mfa_ok() then
      return jsonb_build_object('me', null, 'today', app.today(), 'error', 'mfa_required', 'enrolled', app.has_mfa(auth.uid()));
    end if;
    return jsonb_build_object('me', null, 'today', app.today(), 'error', 'no_profile');
  end if;
  v_internal := me.role <> 'customer';
  -- v3.8: Xem như khách hàng – trả dữ liệu đúng như khách thấy
  select * into v_cv from app.cust_views where admin_id = app.real_uid() and expires_at > now();
  if v_cv.admin_id is not null and app.role_has(me.role, 'users.impersonate') then
    select name into v_cvname from app.customers where id = v_cv.customer_id;
    me.role := 'customer'; me.customer_id := v_cv.customer_id; v_internal := false;
  else v_cv := null; end if;
  select jsonb_object_agg(key, value) into v_cfg from app.settings;
  v_cat := me.user_id || ':' || me.role || ':' || md5(array_to_string(app.team_ids(me), ',')) || ':' || (select last_value from app.cat_seq);

  res := jsonb_build_object(
    'today', app.today(),
    'now', extract(epoch from now()),
    'ver', app.ver_of(me.user_id),
    'me', jsonb_build_object('id', me.user_id, 'name', me.full_name, 'email', me.email, 'phone', me.phone, 'role', me.role,
                             'segment', me.segment, 'customerId', me.customer_id, 'wh', me.default_warehouse, 'whs', me.warehouses,
                             'awayFrom', me.away_from, 'awayTo', me.away_to, 'delegateId', me.delegate_id,
                             'mfa', app.has_mfa(me.user_id), 'mfaReq', app.role_has(me.role, 'auth.mfa'), 'statScope', app.stat_scope(me),
                             'emailLevel', me.email_level, 'altEmail', me.alt_email, 'shortcuts', me.shortcuts,
                             'team', to_jsonb(app.team_ids(me)), 'managerId', me.manager_id, 'notifyTeam', me.notify_team, 'mustChangePw', me.must_change_pw,
                             'chat', app.chat_allowed(me)),
    'cfg', v_cfg,
    'perms', to_jsonb(app.my_perms(me.role)),
    'imp', case when app.impersonating() then (select jsonb_build_object('by', a.full_name, 'expiresAt', extract(epoch from i.expires_at))
                from app.impersonations i join app.profiles a on a.user_id = i.admin_id where i.admin_id = app.real_uid()) end,
    'warehouses', (select jsonb_agg(jsonb_build_object('id', code, 'name', name, 'full', full_name, 'erp', erp_code, 'active', active) order by code) from app.warehouses),
    'reqs', (select coalesce(jsonb_agg(app.req_json(r) order by r.day, r.id), '[]') from app.order_requests r
              where r.day between p_from - 7 and p_to
                and (case when not v_internal then r.customer_id = me.customer_id
                          else r.created_by = me.user_id or app.sees_sales(me, (select c.sales_user_id from app.customers c where c.id = r.customer_id)) end)
                and (r.status = 'new' or r.handled_at > now() - interval '14 days' or r.day >= app.today())),
    'talk', case when v_internal and v_cv.admin_id is null then app.talk_list(me) else '[]'::jsonb end,
    'custView', case when v_cv.admin_id is not null then jsonb_build_object('customerId', v_cv.customer_id, 'name', v_cvname, 'expiresAt', extract(epoch from v_cv.expires_at)) end,
    'notifs', case when v_cv.admin_id is not null then '[]'::jsonb else (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'type', n.type, 'text', n.text, 'link', n.link,
                 'at', extract(epoch from n.created_at), 'read', n.read_at is not null) order by n.created_at desc), '[]')
               from (select * from app.notifications where user_id = me.user_id order by created_at desc limit 100) n) end
  );

  if not v_internal then
    -- Khách hàng: chỉ số tấn có thể đặt + trạng thái ngày + đơn của chính mình
    res := res || jsonb_build_object(
      'calendar', (select coalesce(jsonb_agg(jsonb_build_object('wh', w.code, 'day', d::date,
                      'avail', (m->>'avail')::numeric, 'status', m->>'status', 'declared', (m->>'declared')::boolean, 'off', (m->>'off')::boolean)), '[]')
                   from app.warehouses w cross join generate_series(p_from, p_to, interval '1 day') d
                   cross join lateral app.day_metrics(w.code, d::date) m where w.active),
      'customers', (select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name, 'segment', c.segment, 'salesId', c.sales_user_id, 'addresses', '[]'::jsonb))
                    from app.customers c where c.id = me.customer_id),
      'users', (select coalesce(jsonb_agg(jsonb_build_object('id', p.user_id, 'name', p.full_name, 'email', p.email, 'phone', p.phone, 'role', p.role)), '[]')
                from app.profiles p
               where p.user_id = me.user_id or p.user_id = (select c.sales_user_id from app.customers c where c.id = me.customer_id)),
      'bookings', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'wh', b.warehouse_code, 'date', b.day, 'delivery', b.delivery_date,
                      'customerId', b.customer_id, 'ref', b.ref, 'addrText', b.address_text, 'status', b.status,
                      'rejectReason', b.reason_note, 'proposedDate', b.proposed_day,
                      'eta', extract(epoch from b.eta) / 60, 'deliveredAt', extract(epoch from b.delivered_at) / 60, 'failNote', b.fail_note,
                      'coils', (select count(*) from app.delivery_items di where di.booking_id = b.id),
                      'lines', (select coalesce(jsonb_agg(jsonb_build_object('p', l.product, 'c', l.color, 'th', l.thickness_mm, 'w', l.width_mm, 't', l.tons) order by l.id), '[]')
                                from app.booking_lines l where l.booking_id = b.id))), '[]')
                   from app.bookings b where b.customer_id = me.customer_id and b.status <> 'draft' and b.day between p_from - 31 and p_to)
    );
    return res;
  end if;

  -- Nội bộ
  if app.role_has(me.role, 'perms.manage') then
    res := res || jsonb_build_object(
      'permCatalog', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'grp', grp, 'name', name, 'descr', descr, 'def', def_roles) order by sort), '[]') from app.permissions),
      'roleMatrix', (select jsonb_object_agg(r, to_jsonb(app.my_perms(r))) from unnest(array['logistics','cs','sales','admin']) r));
  end if;
  res := res || jsonb_build_object(
    'regions', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'wh', r.warehouse_code, 'code', r.code, 'name', r.name,
                  'newProvince', r.new_province, 'days', r.round_trip_days, 'active', r.active,
                  'neighbors', (select coalesce(jsonb_agg(n.region_b), '[]') from app.region_neighbors n where n.region_a = r.id)) order by r.warehouse_code, r.name), '[]')
                from app.regions r),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'active', active) order by code), '[]') from app.products),
    'colors',   (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'active', active) order by code), '[]') from app.colors),
    'thicks',   (select coalesce(jsonb_agg(jsonb_build_object('value', value_mm, 'active', active) order by value_mm), '[]') from app.thicknesses),
    'widths',   (select coalesce(jsonb_agg(jsonb_build_object('value', value_mm, 'active', active) order by value_mm), '[]') from app.widths),
    'reasons',  (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'code', code, 'name', name) order by kind, code), '[]') from app.reason_codes where active),
    'users', (select coalesce(jsonb_agg(jsonb_build_object('id', p.user_id, 'name', p.full_name, 'email', p.email, 'phone', p.phone, 'role', p.role,
                'segment', p.segment, 'customerId', p.customer_id, 'wh', p.default_warehouse, 'whs', p.warehouses, 'active', p.active,
                'awayFrom', p.away_from, 'awayTo', p.away_to, 'delegateId', p.delegate_id,
                'mfa', app.has_mfa(p.user_id), 'mfaReq', app.role_has(p.role, 'auth.mfa'), 'statScope', p.stat_scope, 'managerId', p.manager_id, 'notifyTeam', p.notify_team,
                'last', (select (u.last_sign_in_at at time zone 'Asia/Ho_Chi_Minh')::date from auth.users u where u.id = p.user_id)) order by p.full_name), '[]')
              from app.profiles p),
    'catKey', v_cat,
    'customers', case when p_cat = v_cat then null else (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name, 'segment', c.segment, 'salesId', c.sales_user_id, 'csId', c.cs_user_id, 'active', c.active, 'chatOn', c.chat_enabled,
                    'erp', c.erp_code, 'defWh', c.default_wh,
                    'addresses', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'label', a.label, 'province', a.province, 'ward', a.ward,
                                    'regions', (select coalesce(jsonb_object_agg(ar.warehouse_code, ar.region_id), '{}') from app.address_regions ar where ar.address_id = a.id))
                                    order by a.is_default desc, a.label), '[]')
                                  from app.customer_addresses a where a.customer_id = c.id)) order by c.name), '[]')
                  from app.customers c
                 where app.sees_sales(me, c.sales_user_id)) end,
    'truckInfo', (select coalesce(jsonb_agg(jsonb_build_object('code', td.truck_code, 'cap', td.cap, 'plate', td.plate, 'driver', td.driver, 'phone', td.phone,
                   'closed', td.closed, 'closedReason', td.closed_reason,
                   'reason', td.reason, 'by', coalesce(app.uname(td.updated_by), ''),
                   'at', to_char(td.updated_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'))), '[]')
                  from app.truck_days td where td.day between p_from and p_to),
    'fleet', (select coalesce(jsonb_agg(jsonb_build_object('wh', f.warehouse_code, 'date', f.day, 'dk', f.dk_count, 'cn', f.cn_count, 'reason', f.reason,
                'by', coalesce(app.uname(f.updated_by), 'Hệ thống'),
                'at', to_char(f.updated_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'))), '[]')
              from app.daily_fleet f where f.day between p_from and p_to),
    'bookings', (select coalesce(jsonb_agg(app.bk_json(b, me, c.sales_user_id)), '[]')
                 from app.bookings b join app.customers c on c.id = b.customer_id
                where (b.day between p_from and p_to or b.status in ('hold','resched','failed') or coalesce(b.short_tons, 0) > 0
                       or (b.status = 'draft' and b.parent_id is not null))
                  and (b.status <> 'draft' or b.cs_user_id = me.user_id or (b.parent_id is not null and me.role in ('cs','admin')))),
    'allocs', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'bk', a.booking_id, 'truck', a.truck_code, 'tons', a.tons,
                 'override', a.override, 'reason', a.override_reason)), '[]')
               from app.allocations a join app.bookings b on b.id = a.booking_id
              where b.day between p_from and p_to or b.status in ('hold','resched')),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('obj', l.entity_id, 'text', l.detail,
                'who', coalesce(app.uname(l.actor), 'Hệ thống'),
                'at', extract(epoch from l.at) / 60) order by l.at desc), '[]')
              from app.audit_log l
             where l.entity_id in (select b.id from app.bookings b join app.customers c on c.id = b.customer_id
                                    where b.day between p_from and p_to and app.sees_sales(me, c.sales_user_id)))
  );
  return res;
end $$;

-- v3.30: chỉ trả phần thay đổi từ lần tải trước (nội bộ). full = true → trình duyệt tải lại toàn bộ.
create or replace function public.get_delta(p_since bigint, p_from date, p_to date, p_s bigint, p_c bigint, p_m bigint, p_n bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles; v_ids text[]; v_in text[]; v_res jsonb;
begin
  select * into me from app.profiles where user_id = app.uid() and active;
  if not found or me.role = 'customer' or p_since is null then return jsonb_build_object('full', true); end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then return jsonb_build_object('full', true); end if;
  if p_s is distinct from (select case when is_called then last_value else 0 end from app.struct_seq) or p_c is distinct from (select last_value from app.cat_seq) then
    return jsonb_build_object('full', true);
  end if;
  select coalesce(array_agg(id), '{}') into v_ids from app.bookings where chg > p_since;
  if cardinality(v_ids) > 400 then return jsonb_build_object('full', true); end if;
  -- đơn đổi mà vẫn trong phạm vi tải (cùng điều kiện get_state)
  select coalesce(array_agg(b.id), '{}') into v_in from app.bookings b
   where b.id = any(v_ids)
     and (b.day between p_from and p_to or b.status in ('hold','resched','failed') or coalesce(b.short_tons, 0) > 0 or (b.status = 'draft' and b.parent_id is not null))
     and (b.status <> 'draft' or b.cs_user_id = me.user_id or (b.parent_id is not null and me.role in ('cs','admin')));
  v_res := jsonb_build_object(
    'full', false, 'today', app.today(), 'now', extract(epoch from now()), 'ver', app.ver_of(me.user_id),
    'bookings', (select coalesce(jsonb_agg(app.bk_json(b, me, c.sales_user_id)), '[]') from app.bookings b join app.customers c on c.id = b.customer_id where b.id = any(v_in)),
    'changed', to_jsonb(v_ids || array(select id from app.deleted_bk where seq > p_since)),
    'allocs', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'bk', a.booking_id, 'truck', a.truck_code, 'tons', a.tons,
                 'override', a.override, 'reason', a.override_reason)), '[]')
               from app.allocations a join app.bookings b on b.id = a.booking_id
              where a.booking_id = any(v_ids) and (b.day between p_from and p_to or b.status in ('hold','resched'))),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('obj', l.entity_id, 'text', l.detail, 'who', coalesce(app.uname(l.actor), 'Hệ thống'),
                'at', extract(epoch from l.at) / 60) order by l.at desc), '[]')
              from app.audit_log l
             where l.entity_id = any(v_in) and l.entity_id in (select b.id from app.bookings b join app.customers c on c.id = b.customer_id
                                    where b.day between p_from and p_to and app.sees_sales(me, c.sales_user_id))));
  if p_m is distinct from (select case when is_called then last_value else 0 end from app.misc_seq) then
    v_res := v_res || jsonb_build_object(
      'reqs', (select coalesce(jsonb_agg(app.req_json(r) order by r.day, r.id), '[]') from app.order_requests r
                where r.day between p_from - 7 and p_to
                  and (r.created_by = me.user_id or app.sees_sales(me, (select c.sales_user_id from app.customers c where c.id = r.customer_id)))
                  and (r.status = 'new' or r.handled_at > now() - interval '14 days' or r.day >= app.today())),
      'talk', app.talk_list(me));
  end if;
  if p_n is distinct from coalesce((select max(id) from app.notifications where user_id = me.user_id), 0) then
    v_res := v_res || jsonb_build_object('notifs', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'type', n.type, 'text', n.text, 'link', n.link,
                 'at', extract(epoch from n.created_at), 'read', n.read_at is not null) order by n.created_at desc), '[]')
               from (select * from app.notifications where user_id = me.user_id order by created_at desc limit 100) n));
  end if;
  return v_res;
end $$;

-- v3.30: theo dõi lượng dữ liệu tải về (ước tính băng thông) và lỗi phía trình duyệt
create table if not exists app.usage_daily (day date not null, user_id uuid not null, kind text not null, calls int not null default 0, bytes bigint not null default 0,
  primary key (day, user_id, kind));
create table if not exists app.client_errors (id bigserial primary key, at timestamptz not null default now(), user_id uuid, msg text not null, src text, ver text, n int not null default 1);
create index if not exists client_errors_at on app.client_errors (at);
-- p: {usage: {full: {calls, bytes}, delta: {...}, poll: {...}}, errors: [{msg, src}], ver}
create or replace function public.log_usage(p jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; k text; e jsonb; v_n int := 0;
begin
  select * into me from app.profiles where user_id = app.uid() and active;
  if not found then return; end if;
  for k in select jsonb_object_keys(coalesce(p->'usage', '{}')) loop
    continue when k not in ('full','delta','poll','other');
    insert into app.usage_daily (day, user_id, kind, calls, bytes)
    values (app.today(), me.user_id, k, least(greatest(coalesce((p->'usage'->k->>'calls')::int, 0), 0), 100000), least(greatest(coalesce((p->'usage'->k->>'bytes')::bigint, 0), 0), 10000000000))
    on conflict (day, user_id, kind) do update set calls = app.usage_daily.calls + excluded.calls, bytes = app.usage_daily.bytes + excluded.bytes;
  end loop;
  for e in select * from jsonb_array_elements(coalesce(p->'errors', '[]')) limit 20 loop
    exit when (select count(*) from app.client_errors where user_id = me.user_id and at > now() - interval '1 hour') > 50;
    update app.client_errors set n = n + 1, at = now() where user_id = me.user_id and msg = left(e->>'msg', 500) and at > now() - interval '1 day';
    if not found then insert into app.client_errors (user_id, msg, src, ver) values (me.user_id, left(e->>'msg', 500), left(e->>'src', 300), left(p->>'ver', 20)); end if;
  end loop;
  delete from app.client_errors where at < now() - interval '30 days';
  delete from app.usage_daily where day < app.today() - 90;
end $$;

create or replace function public.sys_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('dash.system');
  return jsonb_build_object(
    'dbMb', round(pg_database_size(current_database()) / 1048576.0, 1),
    'tables', (select coalesce(jsonb_agg(jsonb_build_array(relname, round(pg_total_relation_size(c.oid) / 1048576.0, 2)) order by pg_total_relation_size(c.oid) desc), '[]')
                 from (select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
                        where n.nspname = 'app' and c.relkind = 'r' order by pg_total_relation_size(c.oid) desc limit 8) c),
    'usage', (select coalesce(jsonb_object_agg(k, v), '{}') from (
               select 'today' k, jsonb_build_object('bytes', coalesce(sum(bytes), 0), 'calls', coalesce(sum(calls), 0)) v from app.usage_daily where day = app.today()
               union all select 'd7', jsonb_build_object('bytes', coalesce(sum(bytes), 0), 'calls', coalesce(sum(calls), 0)) from app.usage_daily where day > app.today() - 7
               union all select 'd30', jsonb_build_object('bytes', coalesce(sum(bytes), 0), 'calls', coalesce(sum(calls), 0)) from app.usage_daily where day > app.today() - 30
               union all select 'month', jsonb_build_object('bytes', coalesce(sum(bytes), 0), 'calls', coalesce(sum(calls), 0)) from app.usage_daily where day >= date_trunc('month', app.today())) z),
    'byKind', (select coalesce(jsonb_object_agg(kind, jsonb_build_object('bytes', b, 'calls', c)), '{}') from (select kind, sum(bytes) b, sum(calls) c from app.usage_daily where day > app.today() - 7 group by kind) z),
    'topUsers', (select coalesce(jsonb_agg(jsonb_build_array(app.uname(user_id), b) order by b desc), '[]') from (select user_id, sum(bytes) b from app.usage_daily where day > app.today() - 7 group by user_id order by 2 desc limit 5) z),
    'aiToday', (select count(*) from app.chat_log where at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh')),
    'aiCap', coalesce(app.setn('chatDailyTotal'), 2000),
    'errors', (select coalesce(jsonb_agg(jsonb_build_object('at', extract(epoch from e.at) / 60, 'who', app.uname(e.user_id), 'msg', e.msg, 'src', e.src, 'ver', e.ver, 'n', e.n) order by e.at desc), '[]')
                 from (select * from app.client_errors order by at desc limit 30) e),
    'files', (select jsonb_build_object('n', count(*), 'mb', round(coalesce(sum(size), 0) / 1048576.0, 1)) from app.talk_files));
end $$;

-- Thống kê hệ thống cho Admin (DB-06)
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('dash.system');
  return jsonb_build_object(
    'dbMb', round(pg_database_size(current_database()) / 1048576.0, 2),
    'bookings', (select count(*) from app.bookings),
    'notifsToday', (select count(*) from app.notifications where created_at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh'))
  );
end $$;

-- ---------------------------------------------------------------------
-- 4. Hàm nghiệp vụ – CS
-- ---------------------------------------------------------------------
create or replace function public.save_booking(p jsonb) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; old app.bookings; c app.customers;
  v_id text := nullif(p->>'id', ''); v_mode text := coalesce(p->>'mode', 'draft');
  v_wh text := p->>'wh'; v_day date := nullif(p->>'day', '')::date; v_cust uuid := nullif(p->>'customer_id', '')::uuid;
  v_total numeric; v_avail numeric; v_addr uuid; v_addr_text text := ''; v_prov text := ''; v_region text;
  v_seq int; v_changed boolean := false; v_status text; ln jsonb; i int := 0;
begin
  me := app.require_perm(case when nullif(p->>'id', '') is null then 'booking.create' else 'booking.edit' end);
  if v_mode not in ('draft','hold') then raise exception 'Chế độ lưu không hợp lệ.'; end if;
  if v_day is null or v_cust is null or v_wh is null then raise exception 'Chọn kho, khách hàng và ngày bốc.'; end if;
  if v_day < app.today() then raise exception 'Không đặt cho ngày đã qua.'; end if;
  select * into c from app.customers where id = v_cust and active;
  if not found then raise exception 'Khách hàng không tồn tại hoặc đã ngừng.'; end if;
  perform app.check_scope(me, v_cust);
  -- Nhập nhanh / nhiều dòng (BR-36, BR-37): chỉ có tổng tấn, không có dòng sản phẩm
  if jsonb_array_length(coalesce(p->'lines', '[]'::jsonb)) = 0 and coalesce(nullif(p->>'tons', '')::numeric, 0) > 0 then
    p := jsonb_set(p, '{lines}', jsonb_build_array(jsonb_build_object('t', p->>'tons')));
  end if;
  select coalesce(sum(nullif(l->>'t', '')::numeric), 0) into v_total from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb)) l;
  v_region := nullif(nullif(p->>'region', ''), 'NONE');
  if v_region is not null and not exists (select 1 from app.regions r where r.id = v_region and r.warehouse_code = v_wh and r.active) then
    raise exception 'Khu vực không thuộc kho đã chọn.';
  end if;

  -- Địa chỉ
  if coalesce(p->>'address_id', 'new') = 'new' then
    v_prov := coalesce(p->>'province', '');
    v_addr_text := concat_ws(', ', nullif(trim(p->>'street'), ''), nullif(trim(p->>'ward'), ''));
    if coalesce((p->>'save_addr')::boolean, false) and coalesce(trim(p->>'street'), '') <> '' and v_prov <> '' then
      insert into app.customer_addresses (customer_id, label, ward, province)
      values (v_cust, trim(p->>'street'), coalesce(trim(p->>'ward'), ''), v_prov) returning id into v_addr;
      if v_region is not null then
        insert into app.address_regions values (v_addr, v_wh, v_region);
      end if;
    end if;
  else
    select a.id, concat_ws(', ', a.label, nullif(a.ward, '')), a.province into v_addr, v_addr_text, v_prov
      from app.customer_addresses a where a.id = (p->>'address_id')::uuid and a.customer_id = v_cust;
    if v_addr is null then raise exception 'Địa chỉ không thuộc khách hàng này.'; end if;
    if v_region is not null then
      insert into app.address_regions values (v_addr, v_wh, v_region)
      on conflict (address_id, warehouse_code) do update set region_id = excluded.region_id;
    end if;
  end if;

  if v_mode = 'hold' then
    -- BR-38: ngày nghỉ vẫn giữ chỗ được khi Logistics đã khai báo xe
    if not exists (select 1 from app.daily_fleet f where f.warehouse_code = v_wh and f.day = v_day) then
      raise exception 'Ngày % chưa khai báo xe%; chỉ được Lưu tạm.', app.dm(v_day), case when app.is_holiday(v_wh, v_day) then ' (ngày nghỉ)' else '' end;
    end if;
    -- BR-37 / BR-39 (v2.9): Ref, địa chỉ, khu vực, dòng sản phẩm không bắt buộc khi giữ chỗ; bắt buộc địa chỉ khi xác nhận giao hàng
    if v_total <= 0 then raise exception 'Nhập số tấn lớn hơn 0.'; end if;
    for ln in select * from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb)) loop
      i := i + 1;
      if coalesce(nullif(ln->>'t', '')::numeric, 0) <= 0 then raise exception 'Dòng sản phẩm %: nhập số tấn > 0.', i; end if;
      if (coalesce(ln->>'p', '') <> '' and not exists (select 1 from app.products x where x.name = ln->>'p' and x.active))
         or (coalesce(ln->>'c', '') <> '' and not exists (select 1 from app.colors x where x.name = ln->>'c' and x.active))
         or (coalesce(ln->>'th', '') <> '' and not exists (select 1 from app.thicknesses x where x.value_mm = nullif(ln->>'th', '')::numeric and x.active))
         or (coalesce(ln->>'w', '') <> '' and not exists (select 1 from app.widths x where x.value_mm = nullif(ln->>'w', '')::numeric and x.active)) then
        raise exception 'Dòng sản phẩm %: sản phẩm, màu, độ dày hoặc khổ không có trong danh mục đang dùng.', i;
      end if;
    end loop;
    perform app.lock_day(v_wh, v_day);
    v_avail := (app.day_metrics(v_wh, v_day, v_id)->>'avail')::numeric;
    if v_total > v_avail + 0.001 then
      raise exception 'Tổng % MT vượt sức chứa còn lại % MT của ngày % (BR-09). Chọn ngày khác hoặc Lưu tạm.', app.fmt(v_total), app.fmt(v_avail), app.dm(v_day);
    end if;
  end if;

  if v_id is null then
    insert into app.booking_seq values (v_wh, v_day, 1)
    on conflict (warehouse_code, day) do update set last = app.booking_seq.last + 1
    returning last into v_seq;
    v_id := 'BK-' || v_wh || '-' || to_char(v_day, 'YYMMDD') || '-' || lpad(v_seq::text, 3, '0');
    insert into app.bookings (id, warehouse_code, day, delivery_date, customer_id, ref, address_id, address_text, province, region_id,
                              status, note, cs_user_id, held_at)
    values (v_id, v_wh, v_day, nullif(p->>'delivery', '')::date, v_cust, coalesce(trim(p->>'ref'), ''), v_addr, v_addr_text, v_prov, v_region,
            v_mode, coalesce(p->>'note', ''),
            case when v_mode = 'draft' or me.role = 'cs' then me.user_id else coalesce(c.cs_user_id, me.user_id) end,
            case when v_mode = 'hold' then now() end);
    if v_mode = 'hold' then update app.bookings set original_day = v_day where id = v_id; end if;
    perform app.status_change(v_id, null, v_mode);
    v_status := v_mode;
    perform app.audit(v_id, case when v_mode = 'draft' then 'Lưu nháp' else 'Giữ chỗ ' || app.fmt(v_total) || ' MT' end);
  else
    select * into old from app.bookings where id = v_id for update;
    if not found then raise exception 'Không tìm thấy booking %.', v_id; end if;
    perform app.check_scope(me, old.customer_id);
    if old.customer_id <> v_cust then raise exception 'Không đổi được khách hàng của booking đã tạo.'; end if;
    if old.status = 'cancelled' then raise exception 'Booking đã hủy, không sửa được.'; end if;
    -- BR-45: từ Đã load hàng trở đi không đổi ngày, số tấn, không hủy
    if old.status in ('loaded','transit','delivered') then raise exception 'Booking đã load hàng: không đổi ngày hay số tấn được nữa.'; end if;
    -- Booking bị từ chối / giao không thành công: CS đặt lại (giao lại) sang ngày khác, giữ nguyên mã booking
    if old.status = 'rejected' and v_mode <> 'hold' then raise exception 'Booking bị từ chối: chọn ngày mới rồi bấm Đặt lại để giữ chỗ.'; end if;
    if old.status = 'failed' and v_mode <> 'hold' then raise exception 'Booking giao không thành công: chọn ngày giao lại rồi bấm Giao lại.'; end if;
    if old.status = 'draft' and old.cs_user_id <> me.user_id then raise exception 'Chỉ CS tạo nháp mới sửa được nháp này.'; end if;
    v_changed := old.day <> v_day or abs(app.bk_total(v_id) - v_total) > 0.005;
    -- BR-40: đổi ngày bốc của booking đã giữ chỗ → bắt buộc lý do + bên yêu cầu
    if old.day <> v_day and old.original_day is not null then
      if coalesce(p->>'change_reason', '') = '' or coalesce(p->>'change_by', '') not in ('customer','cs','logistics') then
        raise exception 'Đổi ngày bốc: chọn lý do và bên yêu cầu đổi (Khách / CS / Logistics).';
      end if;
      if not exists (select 1 from app.reason_codes r where r.kind = 'change' and r.code = p->>'change_reason') then
        raise exception 'Lý do đổi ngày không hợp lệ.';
      end if;
    end if;
    v_status := old.status;
    if old.status = 'draft' and v_mode = 'hold' then v_status := 'hold';
    elsif old.status = 'resched' then v_status := 'hold'; delete from app.allocations where booking_id = v_id;
    elsif old.status in ('rejected','failed') then v_status := 'hold'; v_changed := true; delete from app.allocations where booking_id = v_id;
    elsif old.status = 'ok' and v_changed then v_status := 'hold'; delete from app.allocations where booking_id = v_id;
    elsif old.status = 'hold' and v_changed then delete from app.allocations where booking_id = v_id;
    end if;
    update app.bookings set day = v_day, delivery_date = nullif(p->>'delivery', '')::date, ref = coalesce(trim(p->>'ref'), ''),
           address_id = v_addr, address_text = v_addr_text, province = v_prov, region_id = v_region, note = coalesce(p->>'note', ''),
           status = v_status,
           held_at = case when v_status = 'hold' and (old.status <> 'hold' or v_changed) then now() else held_at end,
           proposed_day = case when old.status = 'resched' then null else proposed_day end,
           closed_at = case when old.status = 'rejected' then null else closed_at end,
           reason_code = case when old.status = 'rejected' then null else reason_code end,
           reason_note = case when old.status = 'rejected' then '' else reason_note end,
           original_day = coalesce(original_day, case when v_status = 'hold' then v_day end),
           change_count = change_count + case when old.day <> v_day and old.original_day is not null then 1 else 0 end,
           updated_at = now()
     where id = v_id;
    if old.day <> v_day and old.original_day is not null then
      perform app.status_change(v_id, old.status, v_status, p->>'change_reason',
        'Đổi ngày ' || app.dm(old.day) || ' → ' || app.dm(v_day) || ' do ' ||
        case p->>'change_by' when 'customer' then 'Khách' when 'cs' then 'CS' else 'Logistics' end ||
        coalesce(': ' || nullif(trim(p->>'change_note'), ''), ''));
    end if;
    if v_status <> old.status and not (old.day <> v_day and old.original_day is not null) then perform app.status_change(v_id, old.status, v_status); end if;
    perform app.audit(v_id, case when old.status = 'failed' then 'Giao lại: ngày ' || app.dm(v_day) || ', ' || app.fmt(v_total) || ' MT'
                                 when old.status = 'rejected' then 'Đặt lại sau khi bị từ chối: ngày ' || app.dm(v_day) || ', ' || app.fmt(v_total) || ' MT'
                                 when v_status <> old.status then 'Chuyển ' || old.status || ' → ' || v_status else 'Cập nhật booking' end
                            || case when v_changed then ' (đổi ngày/số tấn)' else '' end);
  end if;

  delete from app.booking_lines where booking_id = v_id;
  insert into app.booking_lines (booking_id, product, color, thickness_mm, width_mm, tons)
  select v_id, nullif(l->>'p', ''), nullif(l->>'c', ''), nullif(l->>'th', '')::numeric, nullif(l->>'w', '')::numeric::int, nullif(l->>'t', '')::numeric
    from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb)) l
   where coalesce(nullif(l->>'t', '')::numeric, 0) > 0;

  if v_status = 'hold' and (old.id is null or old.status <> 'hold' or v_changed) then
    perform app.refresh_urgent(v_id);
    perform app.notify(app.logistics_of(v_wh) || c.sales_user_id,
      case when (select urgent from app.bookings where id = v_id) then 'Đơn khẩn' else 'Giữ chỗ' end,
      case when app.is_holiday(v_wh, v_day) then '⚠ GIAO NGÀY NGHỈ (' || app.dm(v_day) || ') · ' else '' end ||
      v_id || ' · ' || c.name || ' giữ chỗ ' || app.fmt(v_total) || ' MT ngày ' || app.dm(v_day) || ', khu vực ' ||
      coalesce((select r.name from app.regions r where r.id = v_region), 'Chưa phân khu vực'),
      jsonb_build_object('bk', v_id));
    if old.status = 'rejected' then
      perform app.notify(app.customer_users(c.id), 'Giữ chỗ',
        v_id || ' (trước đó bị từ chối) đã được đặt lại sang ngày ' || app.dm(v_day) || ', ' || app.fmt(v_total) || ' MT, đang chờ xếp xe.', jsonb_build_object('bk', v_id, 'day', v_day));
    end if;
    if v_region is null and v_prov <> '' then
      perform app.notify(app.logistics_of(v_wh), 'Chưa phân khu vực',
        v_id || ': địa chỉ tỉnh ' || coalesce(nullif(v_prov, ''), '?') || ' chưa ứng với khu vực nào của kho ' || v_wh, jsonb_build_object('bk', v_id));
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.cancel_booking(p_id text, p_reason text, p_reason_code text default 'OTHER') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers; v_late boolean; v_trucks text;
begin
  me := app.require_perm('booking.cancel');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Nhập lý do hủy.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status in ('rejected','cancelled','delivered') then raise exception 'Booking không tồn tại hoặc đã đóng.'; end if;
  if b.status in ('loaded','transit') then raise exception 'Booking đã load hàng: không hủy được (BR-45).'; end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  -- BR-42: hủy booking đã xác nhận sau mốc chốt xe = Hủy quá cận ngày giao; giữ thông tin xe trong lịch sử
  v_late := b.status = 'ok' and now() > app.cutoff_at(b.day);
  select string_agg(app.short_code(truck_code) || ' ' || app.fmt(tons) || ' MT', ', ' order by truck_code) into v_trucks
    from app.allocations where booking_id = p_id;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set status = 'cancelled', closed_at = now(), reason_code = p_reason_code, reason_note = p_reason,
         late_cancel = v_late, updated_at = now() where id = p_id;
  perform app.status_change(p_id, b.status, 'cancelled', p_reason_code, p_reason);
  perform app.audit(p_id, case when v_late then 'Hủy quá cận ngày giao' else 'Hủy' end || ': ' || p_reason
                          || coalesce('. Xe đã gán: ' || v_trucks, ''));
  if b.status <> 'draft' then
    perform app.notify(app.logistics_of(b.warehouse_code) || c.sales_user_id,
      case when v_late then 'Hủy cận ngày' else 'Hủy booking' end,
      p_id || ' · ' || c.name || ' ngày ' || app.dm(b.day) || case when v_late then ' bị HỦY QUÁ CẬN NGÀY GIAO' else ' đã hủy' end
      || '. Lý do: ' || p_reason || coalesce('. Xe đã gán: ' || v_trucks, ''), jsonb_build_object('bk', p_id, 'day', b.day));
    perform app.notify(app.customer_users(c.id), 'Hủy booking',
      p_id || ' ngày ' || app.dm(b.day) || ' đã hủy. Lý do: ' || p_reason, jsonb_build_object('bk', p_id, 'day', b.day));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Hàm nghiệp vụ – Logistics
-- ---------------------------------------------------------------------
create or replace function public.save_allocations(p_id text, p_rows jsonb, p_reason text, p_confirm boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; b app.bookings; r jsonb; t record;
  v_total numeric; v_sum numeric := 0; v_tons numeric; v_ex numeric; v_pref text; v_regs text[]; v_stops text[];
  v_warn text[] := '{}'; v_ov boolean; v_key text;
begin
  me := app.require_perm('alloc.assign');
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status not in ('hold','ok') then raise exception 'Booking không ở trạng thái chờ xếp xe hoặc đã xác nhận.'; end if;
  perform app.check_scope(me, b.customer_id);
  if b.day < app.today() then raise exception 'Ngày đã qua, không thay đổi được (BR-12).'; end if;
  perform app.lock_day(b.warehouse_code, b.day);
  v_total := app.bk_total(p_id);
  v_pref := case when v_total > app.setn('split') then 'DK' else 'XT' end;
  v_key := b.customer_id::text || '|' || b.address_text;
  select coalesce(sum(nullif(x->>'tons', '')::numeric), 0) into v_sum from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) x where coalesce(nullif(x->>'tons', '')::numeric, 0) > 0;
  if v_sum > v_total + 0.001 then raise exception 'Tổng gán % MT vượt số tấn booking % MT.', app.fmt(v_sum), app.fmt(v_total); end if;
  if p_confirm and abs(v_sum - v_total) > 0.005 then raise exception 'Tổng tấn gán phải bằng tổng tấn booking (BR-07): % / % MT.', app.fmt(v_sum), app.fmt(v_total); end if;

  delete from app.allocations where booking_id = p_id;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_tons := coalesce(nullif(r->>'tons', '')::numeric, 0);
    continue when v_tons <= 0;
    select * into t from app.trucks(b.warehouse_code, b.day) x where x.code = r->>'truck';
    if not found then raise exception 'Xe % không thuộc ngày % của kho %.', r->>'truck', app.dm(b.day), b.warehouse_code; end if;
    v_ov := false;
    v_ex := app.truck_load(t.code, p_id);
    if app.truck_closed(t.code) and v_ex + v_tons > t.cap + 0.001 then
      raise exception 'Xe % đã đóng, không xếp thêm được (BR-47). Mở lại xe trước.', app.short_code(t.code);
    end if;
    if app.truck_departed(t.code) and not exists (select 1 from app.allocations a where a.booking_id = p_id and a.truck_code = t.code) then
      raise exception 'Xe % đã chạy (có đơn Đang giao / Đã giao), không xếp thêm được.', app.short_code(t.code);
    end if;
    if v_ex + v_tons > t.cap + 0.001 then v_warn := v_warn || (t.type || '-' || lpad(t.seq::text, 2, '0') || ' vượt tải trọng'); v_ov := true; end if;
    if t.type <> v_pref then v_warn := v_warn || (t.type || '-' || lpad(t.seq::text, 2, '0') || ' khác loại xe gợi ý'); v_ov := true; end if;
    v_regs := app.truck_regions(t.code, p_id);
    if cardinality(v_regs) > 0 and b.region_id is not null
       and not exists (select 1 from unnest(v_regs) g where g = b.region_id or app.are_neighbors(g, b.region_id)) then
      v_warn := v_warn || (t.type || '-' || lpad(t.seq::text, 2, '0') || ' đang chở khu vực khác'); v_ov := true;
    end if;
    v_stops := app.truck_stops(t.code, p_id);
    if not (v_key = any(v_stops)) and cardinality(v_stops) >= app.setn('maxStops') then
      v_warn := v_warn || (t.type || '-' || lpad(t.seq::text, 2, '0') || ' vượt số điểm giao'); v_ov := true;
    end if;
    insert into app.allocations (booking_id, truck_code, tons, override, override_reason)
    values (p_id, t.code, v_tons, v_ov, case when v_ov then p_reason end);
  end loop;
  if cardinality(v_warn) > 0 and coalesce(trim(p_reason), '') = '' then
    raise exception 'Cần lý do override: %.', array_to_string(v_warn, '; ');
  end if;

  if p_confirm then
    perform app.confirm_internal(p_id);
  else
    if b.status = 'ok' and abs(v_sum - v_total) > 0.005 then
      update app.bookings set status = 'hold', held_at = now(), updated_at = now() where id = p_id;
      perform app.status_change(p_id, 'ok', 'hold', null, 'Xếp lại chưa đủ tấn');
    end if;
    perform app.audit(p_id, 'Lưu xếp tạm ' || app.fmt(v_sum) || '/' || app.fmt(v_total) || ' MT');
  end if;
end $$;

create or replace function public.place_on_truck(p_id text, p_truck text, p_tons numeric) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; t record; v_rem numeric;
begin
  me := app.require_perm('alloc.assign');
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status <> 'hold' then raise exception 'Booking không ở trạng thái chờ xếp xe.'; end if;
  perform app.check_scope(me, b.customer_id);
  if b.day < app.today() then raise exception 'Ngày đã qua, không thay đổi được.'; end if;
  perform app.lock_day(b.warehouse_code, b.day);
  select * into t from app.trucks(b.warehouse_code, b.day) x where x.code = p_truck;
  if not found then raise exception 'Xe không thuộc ngày của booking.'; end if;
  if app.truck_locked(t.code) then raise exception 'Xe % đã đóng hoặc đã chạy, không xếp thêm được (BR-47).', app.short_code(t.code); end if;
  v_rem := app.bk_total(p_id) - app.alloc_sum(p_id);
  if coalesce(p_tons, 0) <= 0 then raise exception 'Nhập số tấn lớn hơn 0.'; end if;
  if p_tons > v_rem + 0.001 then raise exception 'Vượt phần chưa gán của booking (% MT).', app.fmt(v_rem); end if;
  if app.truck_load(t.code) + p_tons > t.cap + 0.001 then
    raise exception 'Vượt tải trọng xe. Dùng màn hình gán xe để override kèm lý do.';
  end if;
  insert into app.allocations (booking_id, truck_code, tons) values (p_id, t.code, p_tons)
  on conflict (booking_id, truck_code) do update set tons = app.allocations.tons + excluded.tons;
  perform app.audit(p_id, 'Xếp ' || app.fmt(p_tons) || ' MT lên ' || t.type || '-' || lpad(t.seq::text, 2, '0'));
  return app.alloc_sum(p_id) >= app.bk_total(p_id) - 0.001;
end $$;

create or replace function public.edit_allocation(p_id text, p_truck text, p_mode text, p_tons numeric, p_target text, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers; t record; tg record; v_cur numeric; v_on_target numeric; v_txt text;
begin
  me := app.require_perm('alloc.assign');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Nhập lý do sửa.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status not in ('hold','ok') then raise exception 'Booking không hợp lệ.'; end if;
  perform app.check_scope(me, b.customer_id);
  if b.day < app.today() then raise exception 'Ngày đã qua, không thay đổi được.'; end if;
  perform app.lock_day(b.warehouse_code, b.day);
  select * into c from app.customers where id = b.customer_id;
  select * into t from app.trucks(b.warehouse_code, b.day) x where x.code = p_truck;
  select coalesce(sum(tons), 0) into v_cur from app.allocations where booking_id = p_id and truck_code = p_truck;
  if v_cur <= 0 then raise exception 'Booking không có hàng trên xe này.'; end if;
  if p_mode = 'adjust' then
    if p_tons is null or p_tons < 0 then raise exception 'Số tấn không hợp lệ.'; end if;
    if app.truck_locked(p_truck) and p_tons > v_cur + 0.001 then raise exception 'Xe % đã đóng hoặc đã chạy, không tăng hàng được (BR-47).', app.short_code(p_truck); end if;
    delete from app.allocations where booking_id = p_id and truck_code = p_truck;
    if p_tons > 0 then
      insert into app.allocations (booking_id, truck_code, tons, override, override_reason)
      values (p_id, p_truck, p_tons, app.truck_load(p_truck, p_id) + p_tons > t.cap + 0.001,
              case when app.truck_load(p_truck, p_id) + p_tons > t.cap + 0.001 then p_reason end);
    end if;
    v_txt := 'Sửa ' || split_part(p_truck, '-', 3) || '-' || split_part(p_truck, '-', 4) || ': ' || app.fmt(v_cur) || ' → ' || app.fmt(p_tons) || ' MT (' || p_reason || ')';
  elsif p_mode = 'move' then
    select * into tg from app.trucks(b.warehouse_code, b.day) x where x.code = p_target;
    if not found or p_target = p_truck then raise exception 'Chọn xe đích hợp lệ.'; end if;
    if app.truck_locked(p_target) then raise exception 'Xe % đã đóng hoặc đã chạy, không chuyển hàng sang được (BR-47).', app.short_code(p_target); end if;
    if p_tons is null or p_tons <= 0 or p_tons > v_cur + 0.001 then raise exception 'Số tấn chuyển phải > 0 và ≤ % MT.', app.fmt(v_cur); end if;
    if v_cur - p_tons > 0.001 then
      update app.allocations set tons = v_cur - p_tons where booking_id = p_id and truck_code = p_truck;
    else
      delete from app.allocations where booking_id = p_id and truck_code = p_truck;
    end if;
    select coalesce(sum(tons), 0) into v_on_target from app.allocations where booking_id = p_id and truck_code = p_target;
    delete from app.allocations where booking_id = p_id and truck_code = p_target;
    insert into app.allocations (booking_id, truck_code, tons, override, override_reason)
    values (p_id, p_target, v_on_target + p_tons, app.truck_load(p_target, p_id) + v_on_target + p_tons > tg.cap + 0.001,
            case when app.truck_load(p_target, p_id) + v_on_target + p_tons > tg.cap + 0.001 then p_reason end);
    v_txt := 'Chuyển ' || app.fmt(p_tons) || ' MT từ ' || split_part(p_truck, '-', 3) || '-' || split_part(p_truck, '-', 4)
             || ' sang ' || tg.type || '-' || lpad(tg.seq::text, 2, '0') || ' (' || p_reason || ')';
  elsif p_mode = 'remove' then
    delete from app.allocations where booking_id = p_id and truck_code = p_truck;
    v_txt := 'Gỡ khỏi ' || split_part(p_truck, '-', 3) || '-' || split_part(p_truck, '-', 4) || ' (' || p_reason || ')';
  else
    raise exception 'Kiểu sửa không hợp lệ.';
  end if;
  if b.status = 'ok' and app.alloc_sum(p_id) < app.bk_total(p_id) - 0.001 then
    update app.bookings set status = 'hold', held_at = now(), updated_at = now() where id = p_id;
    perform app.status_change(p_id, 'ok', 'hold', null, 'Sửa phần hàng');
  end if;
  perform app.audit(p_id, v_txt);
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Sửa phần hàng', p_id || ' · ' || c.name || ': ' || v_txt, jsonb_build_object('bk', p_id));
end $$;

create or replace function public.reject_booking(p_id text, p_reason text, p_reason_code text default 'OTHER') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers;
begin
  me := app.require_perm('booking.reject');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Nhập lý do từ chối.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status <> 'hold' then raise exception 'Chỉ từ chối được booking đang chờ xếp xe.'; end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set status = 'rejected', closed_at = now(), reason_code = p_reason_code, reason_note = p_reason, updated_at = now() where id = p_id;
  perform app.status_change(p_id, 'hold', 'rejected', p_reason_code, p_reason);
  perform app.audit(p_id, 'Từ chối: ' || p_reason);
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id] || app.customer_users(c.id) || app.rsm_of(c.sales_user_id), 'Từ chối',
    p_id || ' · ' || c.name || ' ngày ' || app.dm(b.day) || ' bị từ chối. Lý do: ' || p_reason, jsonb_build_object('bk', p_id, 'day', b.day));
end $$;

create or replace function public.propose_day(p_id text, p_day date, p_reason text, p_reason_code text default 'OTHER') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers;
begin
  me := app.require_perm('booking.reject');
  if p_day is null or coalesce(trim(p_reason), '') = '' then raise exception 'Chọn ngày đề xuất và nhập lý do.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status <> 'hold' then raise exception 'Chỉ đề nghị đổi ngày cho booking đang chờ xếp xe.'; end if;
  perform app.check_scope(me, b.customer_id);
  if p_day < app.today() then raise exception 'Ngày đề xuất phải từ hôm nay trở đi.'; end if;
  if not exists (select 1 from app.daily_fleet f where f.warehouse_code = b.warehouse_code and f.day = p_day) then
    raise exception 'Ngày đề xuất chưa khai báo xe.';
  end if;
  select * into c from app.customers where id = b.customer_id;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set status = 'resched', proposed_day = p_day, reason_code = p_reason_code, reason_note = p_reason, updated_at = now() where id = p_id;
  perform app.status_change(p_id, 'hold', 'resched', p_reason_code, p_reason);
  perform app.audit(p_id, 'Đề nghị đổi sang ' || app.dm(p_day) || ': ' || p_reason);
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id] || app.customer_users(c.id) || app.rsm_of(c.sales_user_id), 'Đổi ngày',
    p_id || ' · ' || c.name || ': đề nghị đổi từ ' || app.dm(b.day) || ' sang ' || app.dm(p_day) || '. Lý do: ' || p_reason,
    jsonb_build_object('bk', p_id, 'day', b.day));
end $$;

-- v3.28: p_save_addr = lưu luôn khu vực cho địa chỉ giao (lần sau không phải gán lại)
drop function if exists public.set_region(text, text);
create or replace function public.set_region(p_id text, p_region text, p_save_addr boolean default false) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; v_region text := nullif(nullif(p_region, ''), 'NONE');
begin
  me := app.require_perm('booking.region');
  select * into b from app.bookings where id = p_id for update;
  if not found then raise exception 'Không tìm thấy booking.'; end if;
  perform app.check_scope(me, b.customer_id);
  if v_region is not null and not exists (select 1 from app.regions r where r.id = v_region and r.warehouse_code = b.warehouse_code) then
    raise exception 'Khu vực không thuộc kho của booking.';
  end if;
  update app.bookings set region_id = v_region, updated_at = now() where id = p_id;
  perform app.audit(p_id, 'Đổi khu vực ' || coalesce(b.region_id, 'NONE') || ' → ' || coalesce(v_region, 'NONE'));
  if p_save_addr and v_region is not null and b.address_id is not null then
    insert into app.address_regions (address_id, warehouse_code, region_id) values (b.address_id, b.warehouse_code, v_region)
      on conflict (address_id, warehouse_code) do update set region_id = excluded.region_id;
    -- các đơn khác cùng địa chỉ, cùng kho, còn chưa có khu vực → gán luôn
    update app.bookings set region_id = v_region, updated_at = now()
     where address_id = b.address_id and warehouse_code = b.warehouse_code and region_id is null and id <> p_id and status in ('draft','hold','ok','resched');
  end if;
end $$;

create or replace function public.apply_group(p_ids text[], p_tons numeric[], p_truck text, p_neighbor boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; t record; i int; v_wh text; v_day date;
begin
  me := app.require_perm('merge.apply');
  if coalesce(array_length(p_ids, 1), 0) < 1 or array_length(p_ids, 1) <> array_length(p_tons, 1) then raise exception 'Dữ liệu nhóm không hợp lệ.'; end if;
  select warehouse_code, day into v_wh, v_day from app.bookings where id = p_ids[1];
  perform app.lock_day(v_wh, v_day);
  select * into t from app.trucks(v_wh, v_day) x where x.code = p_truck;
  if not found then raise exception 'Xe không thuộc ngày của nhóm.'; end if;
  if app.truck_locked(p_truck) then raise exception 'Xe % đã đóng hoặc đã chạy, không xếp thêm được (BR-47).', app.short_code(p_truck); end if;
  if app.truck_load(p_truck) + (select sum(x) from unnest(p_tons) x) > t.cap + 0.001 then raise exception 'Nhóm vượt tải trọng xe; dữ liệu đã thay đổi, hãy tải lại.'; end if;
  for i in 1 .. array_length(p_ids, 1) loop
    select * into b from app.bookings where id = p_ids[i] for update;
    if not found or b.status <> 'hold' or b.warehouse_code <> v_wh or b.day <> v_day then raise exception 'Booking % không còn chờ xếp xe.', p_ids[i]; end if;
    perform app.check_scope(me, b.customer_id);
    if p_tons[i] > app.bk_total(b.id) - app.alloc_sum(b.id) + 0.001 then raise exception 'Booking % đã thay đổi, hãy tải lại.', b.id; end if;
    insert into app.allocations (booking_id, truck_code, tons, override, override_reason)
    values (b.id, p_truck, p_tons[i], p_neighbor, case when p_neighbor then 'Gộp khu vực lân cận theo gợi ý' end)
    on conflict (booking_id, truck_code) do update set tons = app.allocations.tons + excluded.tons;
    perform app.audit(b.id, 'Áp dụng gợi ý gộp xe lên ' || t.type || '-' || lpad(t.seq::text, 2, '0'));
  end loop;
  insert into app.merge_suggestion_log (warehouse_code, day, booking_ids, truck_code, fill_ratio, outcome, actor)
  values (v_wh, v_day, p_ids, p_truck, app.truck_load(p_truck) / t.cap, 'applied', me.user_id);
end $$;

create or replace function public.skip_group(p_wh text, p_day date, p_ids text[], p_fill numeric) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('merge.apply');
  insert into app.merge_suggestion_log (warehouse_code, day, booking_ids, fill_ratio, outcome, actor)
  values (p_wh, p_day, p_ids, p_fill, 'skipped', me.user_id);
end $$;

create or replace function public.confirm_group(p_ids text[]) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_id text; n int := 0; b app.bookings;
begin
  me := app.require_perm('alloc.assign');
  foreach v_id in array p_ids loop
    select * into b from app.bookings where id = v_id for update;
    if found and b.status = 'hold' and abs(app.alloc_sum(v_id) - app.bk_total(v_id)) < 0.005
       and app.sees_sales(me, (select c.sales_user_id from app.customers c where c.id = b.customer_id)) then
      perform app.confirm_internal(v_id); n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.upsert_fleet(p_wh text, p_rows jsonb) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; r jsonb; v_day date; v_dk int; v_cn int; v_reason text; f app.daily_fleet; v_busy_dk int; v_busy_cn int; n int := 0; v_txt text;
begin
  me := app.require_perm('fleet.manage');
  for r in select * from jsonb_array_elements(p_rows) loop
    v_day := (r->>'day')::date; v_dk := (r->>'dk')::int; v_cn := (r->>'cn')::int; v_reason := coalesce(trim(r->>'reason'), '');
    if v_day < app.today() then raise exception 'Ngày % đã qua, không sửa được.', app.dm(v_day); end if;
    -- BR-38: ngày nghỉ được khai báo xe, bắt buộc lý do
    if app.is_holiday(p_wh, v_day) and coalesce((r->>'dk')::int, 0) + coalesce((r->>'cn')::int, 0) > 0 and v_reason = '' then
      raise exception 'Ngày % là ngày nghỉ: nhập lý do khi khai báo xe giao ngày nghỉ.', app.dm(v_day);
    end if;
    if v_dk is null or v_cn is null or v_dk not between 0 and 99 or v_cn not between 0 and 99 then raise exception 'Ngày %: số xe phải là số nguyên 0–99.', app.dm(v_day); end if;
    perform app.lock_day(p_wh, v_day);
    select coalesce(max(seq) filter (where type = 'DK'), 0), coalesce(max(seq) filter (where type = 'XT'), 0) into v_busy_dk, v_busy_cn
      from app.trucks(p_wh, v_day) t where app.truck_load(t.code) > 0.001;
    if v_dk < v_busy_dk then raise exception 'Ngày %: DK-% đang chở hàng; chuyển hoặc gỡ hàng trước khi giảm dưới % đầu kéo.', app.dm(v_day), lpad(v_busy_dk::text, 2, '0'), v_busy_dk; end if;
    if v_cn < v_busy_cn then raise exception 'Ngày %: XT-% đang chở hàng; chuyển hoặc gỡ hàng trước khi giảm dưới % xe thùng.', app.dm(v_day), lpad(v_busy_cn::text, 2, '0'), v_busy_cn; end if;
    select * into f from app.daily_fleet where warehouse_code = p_wh and day = v_day;
    if found and (v_dk < f.dk_count or v_cn < f.cn_count) and v_reason = '' then raise exception 'Ngày %: nhập lý do khi giảm số xe.', app.dm(v_day); end if;
    insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason, updated_by, updated_at)
    values (p_wh, v_day, v_dk, v_cn, v_reason, me.user_id, now())
    on conflict (warehouse_code, day) do update set dk_count = excluded.dk_count, cn_count = excluded.cn_count, reason = excluded.reason,
      updated_by = excluded.updated_by, updated_at = now();
    delete from app.truck_days td where td.warehouse_code = p_wh and td.day = v_day
       and td.truck_code not in (select t.code from app.trucks(p_wh, v_day) t);
    v_txt := 'Kho ' || p_wh || ' ngày ' || app.dm(v_day) || ': ' || coalesce(f.dk_count::text || ' → ', '') || v_dk || ' đầu kéo, '
             || coalesce(f.cn_count::text || ' → ', '') || v_cn || ' xe thùng' || case when v_reason <> '' then '. Lý do: ' || v_reason else '' end;
    perform app.audit('fleet', v_txt);
    perform app.notify(array_remove(app.role_users(array['cs','sales']) || app.logistics_of(p_wh), me.user_id), 'Capacity', v_txt,
                       jsonb_build_object('day', v_day, 'wh', p_wh));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Thông tin một xe trong ngày: tải trọng riêng (null = mặc định), biển số, tài xế, SĐT.
-- Được hạ dưới số tấn đã xếp (xe đến mới biết chở ít hơn) → xe thành Quá tải, Logistics chuyển bớt hàng.
create or replace function public.set_truck_info(p_code text, p_cap numeric, p_plate text, p_driver text, p_phone text, p_reason text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; v_wh text := split_part(p_code, '-', 1); v_day date; t record; old app.truck_days;
  v_def numeric; v_min numeric; v_max numeric; v_cap numeric; v_load numeric; v_old_cap numeric; v_txt text; v_short text;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found or not (app.role_has(me.role, 'fleet.manage') or app.role_has(me.role, 'alloc.assign')) then
    raise exception 'Vai trò của bạn chưa được cấp quyền khai báo xe hoặc gán xe.' using errcode = '42501';
  end if;
  begin v_day := to_date(split_part(p_code, '-', 2), 'DDMMYY'); exception when others then raise exception 'Mã xe không hợp lệ.'; end;
  if v_day < app.today() then raise exception 'Ngày đã qua, không thay đổi được (BR-12).'; end if;
  perform app.lock_day(v_wh, v_day);
  select * into t from app.trucks(v_wh, v_day) x where x.code = p_code;
  if not found then raise exception 'Xe % không có trong khai báo ngày % của kho %.', p_code, app.dm(v_day), v_wh; end if;
  if app.truck_closed(p_code) and p_cap is not null and abs(p_cap - t.cap) >= 0.005 then
    raise exception 'Xe % đã đóng: mở lại xe trước khi đổi tải trọng.', app.short_code(p_code);
  end if;
  v_def := app.setn(case when t.type = 'DK' then 'capDK' else 'capCN' end);
  -- v3.27: xe đã chạy (có đơn Đang giao / Đã giao) → khóa tải trọng; biển số / tài xế / SĐT vẫn sửa được
  if app.truck_departed(p_code) and abs(coalesce(p_cap, v_def) - t.cap) >= 0.005 then
    raise exception 'Xe % đã chạy: không đổi tải trọng được (biển số, tài xế, SĐT vẫn sửa được).', app.short_code(p_code);
  end if;
  v_min := coalesce(app.setn(case when t.type = 'DK' then 'capDKMin' else 'capCNMin' end), case when t.type = 'DK' then 15 else 5 end);
  v_max := coalesce(app.setn(case when t.type = 'DK' then 'capDKMax' else 'capCNMax' end), case when t.type = 'DK' then 35 else 20 end);
  v_cap := case when p_cap is null or abs(p_cap - v_def) < 0.005 then null else round(p_cap, 2) end;
  if v_cap is not null and (v_cap < v_min or v_cap > v_max) then
    raise exception 'Tải trọng xe % phải trong khoảng % – % tấn (chỉnh giới hạn ở Configuration).', t.type, app.fmt(v_min), app.fmt(v_max);
  end if;
  select * into old from app.truck_days where truck_code = p_code;
  v_old_cap := coalesce(old.cap, v_def);
  if v_cap is not null and v_cap <> v_old_cap and coalesce(trim(p_reason), '') = '' then
    raise exception 'Nhập lý do khi đổi tải trọng xe.';
  end if;
  v_short := t.type || '-' || lpad(t.seq::text, 2, '0');
  if v_cap is null and coalesce(trim(p_plate), '') = '' and coalesce(trim(p_driver), '') = '' and coalesce(trim(p_phone), '') = '' and not app.truck_closed(p_code) then
    delete from app.truck_days where truck_code = p_code;
  else
    insert into app.truck_days (truck_code, warehouse_code, day, cap, plate, driver, phone, reason, updated_by, updated_at)
    values (p_code, v_wh, v_day, v_cap, coalesce(trim(p_plate), ''), coalesce(trim(p_driver), ''), coalesce(trim(p_phone), ''),
            case when v_cap is null then '' else coalesce(trim(p_reason), old.reason, '') end, me.user_id, now())
    on conflict (truck_code) do update set cap = excluded.cap, plate = excluded.plate, driver = excluded.driver, phone = excluded.phone,
      reason = case when excluded.cap is distinct from app.truck_days.cap then excluded.reason else app.truck_days.reason end,
      updated_by = excluded.updated_by, updated_at = now();
  end if;
  v_load := app.truck_load(p_code);
  if coalesce(v_cap, v_def) <> v_old_cap then
    v_txt := 'Kho ' || v_wh || ' ngày ' || app.dm(v_day) || ': xe ' || v_short || ' tải trọng ' || app.fmt(v_old_cap) || ' → ' || app.fmt(coalesce(v_cap, v_def)) || ' MT. ' || case when v_cap is null then 'Về tải trọng chuẩn.' else 'Lý do: ' || trim(p_reason) end;
    perform app.audit('fleet', v_txt);
    perform app.notify(array_remove(app.role_users(array['cs','sales']) || app.logistics_of(v_wh), me.user_id), 'Capacity', v_txt,
                       jsonb_build_object('day', v_day, 'wh', v_wh));
  elsif coalesce(old.plate, '') <> coalesce(trim(p_plate), '') or coalesce(old.driver, '') <> coalesce(trim(p_driver), '') then
    perform app.audit('fleet', 'Xe ' || v_short || ' ngày ' || app.dm(v_day) || ': biển số ' || coalesce(nullif(trim(p_plate), ''), '–') || ', tài xế ' || coalesce(nullif(trim(p_driver), ''), '–'));
  end if;
  return jsonb_build_object('cap', coalesce(v_cap, v_def), 'load', v_load, 'over', greatest(0, round(v_load - coalesce(v_cap, v_def), 2)));
end $$;

-- ---------------------------------------------------------------------
-- 6. Cấu hình – Logistics
-- ---------------------------------------------------------------------
create or replace function public.update_settings(p jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; k text; v_bad text;
begin
  me := app.require_perm('config.general');
  for k in select jsonb_object_keys(p) loop
    if k not in ('near','capDK','capCN','split','sla','maxStops','fillMin','suggestOn','sundayOff','holidays','capDKMin','capDKMax','capCNMin','capCNMax','escalateHours',
                 'shipRemindHours','shipAdminDays','requirePicking','chatOn','chatRoles','chatDaily','chatDailyRole','chatDailyTotal','transitDays','talkRemindHours','uatOn') then
      raise exception 'Cấu hình % không hợp lệ.', k;
    end if;
    -- v3.15: bật/tắt bắt buộc picking list – chỉ Admin
    if k = 'requirePicking' then
      if me.role <> 'admin' then raise exception 'Chỉ Admin được bật/tắt bắt buộc nhập danh sách cuộn.' using errcode = '42501'; end if;
      if jsonb_typeof(p->k) <> 'boolean' then raise exception 'Giá trị requirePicking phải là true/false.'; end if;
      insert into app.audit_log (entity_id, detail, actor) values ('config', me.full_name || case when (p->>k)::boolean then ' BẬT' else ' TẮT' end
        || ' bắt buộc CS nhập danh sách cuộn (picking list) trước khi load hàng', me.user_id);
    end if;
    if k in ('near','capDK','capCN','split','sla','maxStops','fillMin','capDKMin','capDKMax','capCNMin','capCNMax','escalateHours','shipRemindHours','shipAdminDays','chatDaily','chatDailyTotal','talkRemindHours') and not ((p->>k)::numeric > 0) then
      raise exception 'Giá trị % phải lớn hơn 0.', k;
    end if;
    if k = 'uatOn' and jsonb_typeof(p->k) <> 'boolean' then raise exception 'Giá trị uatOn phải là true/false.'; end if;
    if k = 'transitDays' and (jsonb_typeof(p->k) <> 'object' or exists (select 1 from jsonb_each(p->k) e
        where not exists (select 1 from app.warehouses w where w.code = e.key) or jsonb_typeof(e.value) <> 'number'
           or (e.value #>> '{}')::numeric not between 0 and 15 or (e.value #>> '{}')::numeric <> round((e.value #>> '{}')::numeric))) then
      raise exception 'Số ngày vận chuyển phải là số nguyên từ 0 đến 15 cho từng kho.';
    end if;
    if k = 'chatDailyRole' and (jsonb_typeof(p->k) <> 'object' or exists (select 1 from jsonb_each(p->k) e
        where e.key not in ('cs','sales','logistics','admin','customer') or jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric < 0)) then
      raise exception 'Hạn mức trợ lý theo vai trò không hợp lệ (số ≥ 0 cho cs, sales, logistics, admin, customer).';
    end if;
    -- Không đánh dấu nghỉ một ngày đang có booking (khách sẽ không thấy đơn của mình trên lịch)
    if k = 'holidays' then
      select string_agg(x.d, '; ') into v_bad from (
        select app.dm(b.day) || ': ' || string_agg(b.id, ', ' order by b.id) as d
          from app.bookings b
         where b.status in ('hold','ok') and b.day >= app.today()
           and b.day::text in (select jsonb_array_elements_text(p->'holidays'))
           and b.day::text not in (select jsonb_array_elements_text(coalesce(app.setting('holidays'), '[]'::jsonb)))
         group by b.day order by b.day) x;
      if v_bad is not null then
        raise exception 'Ngày định cho nghỉ đang có booking (%). Đổi ngày hoặc hủy các booking đó trước khi đánh dấu nghỉ.', v_bad;
      end if;
    end if;
    if k = 'sundayOff' and (p->>k)::boolean and not coalesce((app.setting('sundayOff') #>> '{}')::boolean, false) then
      select string_agg(x.d, '; ') into v_bad from (
        select app.dm(b.day) || ': ' || string_agg(b.id, ', ' order by b.id) as d
          from app.bookings b
         where b.status in ('hold','ok') and b.day >= app.today() and extract(dow from b.day) = 0
         group by b.day order by b.day limit 5) x;
      if v_bad is not null then
        raise exception 'Chủ nhật đang có booking (%). Đổi ngày các booking đó trước khi cho Chủ nhật nghỉ.', v_bad;
      end if;
    end if;
    insert into app.settings values (k, p->k) on conflict (key) do update set value = excluded.value;
  end loop;
  perform app.audit('settings', 'Cập nhật cấu hình: ' || p::text);
end $$;

create or replace function public.add_region(p_wh text, p_name text, p_new_province text, p_days int, p_neighbors text[]) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_code text; v_id text; n text;
begin
  me := app.require_perm('config.regions');
  if coalesce(trim(p_name), '') = '' or coalesce(p_new_province, '') = '' then raise exception 'Nhập tên khu vực và chọn tỉnh mới tương ứng.'; end if;
  if exists (select 1 from app.regions where warehouse_code = p_wh and lower(name) = lower(trim(p_name))) then raise exception 'Kho này đã có khu vực cùng tên.'; end if;
  v_code := upper(left(regexp_replace(translate(trim(p_name),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'),
    '[^A-Za-z]', '', 'g'), 3));
  v_id := p_wh || '-' || v_code;
  if exists (select 1 from app.regions where id = v_id) then v_id := v_id || (select count(*) from app.regions); end if;
  insert into app.regions (id, warehouse_code, code, name, new_province, round_trip_days)
  values (v_id, p_wh, split_part(v_id, '-', 2), trim(p_name), p_new_province, coalesce(p_days, 1));
  foreach n in array coalesce(p_neighbors, '{}') loop
    insert into app.region_neighbors values (v_id, n), (n, v_id) on conflict do nothing;
  end loop;
  return v_id;
end $$;

-- Sửa khu vực: tên, tỉnh mới, số ngày đi-về, khu vực lân cận (mã/ID giữ nguyên để không ảnh hưởng booking, địa chỉ)
create or replace function public.update_region(p_id text, p_name text, p_new_province text, p_days int, p_neighbors text[]) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; r app.regions; n text; v_txt text := '';
begin
  me := app.require_perm('config.regions');
  select * into r from app.regions where id = p_id for update;
  if not found then raise exception 'Không tìm thấy khu vực.'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(p_new_province, '') = '' then raise exception 'Nhập tên khu vực và chọn tỉnh mới tương ứng.'; end if;
  if coalesce(p_days, 0) < 1 or p_days > 30 then raise exception 'Số ngày đi-về phải từ 1 đến 30.'; end if;
  if exists (select 1 from app.regions where warehouse_code = r.warehouse_code and lower(name) = lower(trim(p_name)) and id <> p_id) then
    raise exception 'Kho này đã có khu vực cùng tên.';
  end if;
  foreach n in array coalesce(p_neighbors, '{}') loop
    if n = p_id or not exists (select 1 from app.regions where id = n and warehouse_code = r.warehouse_code) then
      raise exception 'Khu vực lân cận % không hợp lệ (phải cùng kho, khác khu vực đang sửa).', n;
    end if;
  end loop;
  if r.name <> trim(p_name) then v_txt := v_txt || 'tên ' || r.name || ' → ' || trim(p_name) || '; '; end if;
  if r.new_province <> p_new_province then v_txt := v_txt || 'tỉnh mới → ' || p_new_province || '; '; end if;
  if r.round_trip_days <> p_days then v_txt := v_txt || 'đi-về ' || r.round_trip_days || ' → ' || p_days || ' ngày; '; end if;
  update app.regions set name = trim(p_name), new_province = p_new_province, round_trip_days = p_days where id = p_id;
  delete from app.region_neighbors where region_a = p_id or region_b = p_id;
  foreach n in array coalesce(p_neighbors, '{}') loop
    insert into app.region_neighbors values (p_id, n), (n, p_id) on conflict do nothing;
  end loop;
  perform app.audit('region:' || p_id, 'Sửa khu vực ' || r.name || ': ' || v_txt || 'lân cận: ' || coalesce(array_to_string(p_neighbors, ', '), ''));
end $$;

create or replace function public.toggle_region(p_id text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; r app.regions; v_act int;
begin
  me := app.require_perm('config.regions');
  select * into r from app.regions where id = p_id;
  if r.active then
    select count(*) into v_act from app.bookings where region_id = p_id and status in ('hold','ok') and day >= app.today();
    if v_act > 0 then raise exception 'Khu vực % đang có % booking hoạt động; chuyển sang khu vực khác trước khi ngừng dùng.', r.name, v_act; end if;
  end if;
  update app.regions set active = not active where id = p_id;
end $$;

create or replace function public.catalog_save(p_kind text, p_key text, p_code text, p_name text, p_value numeric) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_old text; v_used int;
begin
  me := app.require_perm('config.catalog');
  if p_kind in ('products','colors') then
    if coalesce(trim(p_code), '') = '' or coalesce(trim(p_name), '') = '' then raise exception 'Nhập mã và tên.'; end if;
    if p_key is null then
      execute format('insert into app.%I (code, name) values ($1, $2)', p_kind) using trim(p_code), trim(p_name);
    else
      execute format('select name from app.%I where code = $1', p_kind) into v_old using p_key;
      execute format('update app.%I set code = $1, name = $2 where code = $3', p_kind) using trim(p_code), trim(p_name), p_key;
      if v_old is distinct from trim(p_name) then
        if p_kind = 'products' then update app.booking_lines set product = trim(p_name) where product = v_old;
        else update app.booking_lines set color = trim(p_name) where color = v_old; end if;
      end if;
    end if;
  elsif p_kind = 'thicks' then
    if p_value is null or p_value < 0.1 or p_value > 10 then raise exception 'Độ dày phải trong khoảng 0,10–10 mm.'; end if;
    if p_key is null then insert into app.thicknesses (value_mm) values (round(p_value, 2));
    else
      select count(*) into v_used from app.booking_lines where thickness_mm = p_key::numeric;
      if v_used > 0 and p_key::numeric <> round(p_value, 2) then raise exception 'Đang dùng trong % dòng booking, không sửa giá trị được. Hãy ngừng dùng và thêm giá trị mới.', v_used; end if;
      update app.thicknesses set value_mm = round(p_value, 2) where value_mm = p_key::numeric;
    end if;
  elsif p_kind = 'widths' then
    if p_value is null or p_value < 100 or p_value > 2000 or p_value <> trunc(p_value) then raise exception 'Khổ rộng phải là số nguyên 100–2000 mm.'; end if;
    if p_key is null then insert into app.widths (value_mm) values (p_value::int);
    else
      select count(*) into v_used from app.booking_lines where width_mm = p_key::int;
      if v_used > 0 and p_key::int <> p_value::int then raise exception 'Đang dùng trong % dòng booking, không sửa giá trị được. Hãy ngừng dùng và thêm giá trị mới.', v_used; end if;
      update app.widths set value_mm = p_value::int where value_mm = p_key::int;
    end if;
  else
    raise exception 'Danh mục không hợp lệ.';
  end if;
exception when unique_violation then
  raise exception 'Mã, tên hoặc giá trị đã tồn tại trong danh mục.';
end $$;

create or replace function public.catalog_toggle(p_kind text, p_key text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_tbl text; v_col text; v_active int;
begin
  me := app.require_perm('config.catalog');
  v_tbl := case p_kind when 'products' then 'products' when 'colors' then 'colors' when 'thicks' then 'thicknesses' when 'widths' then 'widths' end;
  v_col := case when p_kind in ('products','colors') then 'code' else 'value_mm' end;
  if v_tbl is null then raise exception 'Danh mục không hợp lệ.'; end if;
  execute format('select count(*) from app.%I where active', v_tbl) into v_active;
  if v_col = 'code' then
    execute format('update app.%I set active = not active where code = $1 and (not active or $2 > 1)', v_tbl) using p_key, v_active;
  else
    execute format('update app.%I set active = not active where value_mm = $1::numeric and (not active or $2 > 1)', v_tbl) using p_key, v_active;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. Người dùng, khách hàng – Admin; hồ sơ cá nhân; thông báo
-- ---------------------------------------------------------------------
-- Gán vai trò cho một tài khoản đã tạo trong Supabase Authentication (theo email)
create or replace function public.admin_upsert_profile(p jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_uid uuid; v_role text := p->>'role'; v_seg text := nullif(p->>'segment', ''); v_cust uuid := nullif(p->>'customer_id', '')::uuid;
begin
  me := app.require_perm('users.manage');
  select id into v_uid from auth.users where lower(email) = lower(trim(p->>'email'));
  if v_uid is null then
    raise exception 'Chưa có tài khoản đăng nhập cho email này. Tạo trước trong Supabase → Authentication → Users → Add user.';
  end if;
  if coalesce(trim(p->>'name'), '') = '' then raise exception 'Nhập họ tên.'; end if;
  if v_role = 'sales' and (v_seg is null or coalesce(trim(p->>'phone'), '') = '') then raise exception 'Sales cần segment và số điện thoại.'; end if;
  if v_role = 'customer' and v_cust is null then raise exception 'Chọn công ty khách hàng.'; end if;
  if nullif(p->>'stat_scope', '') is not null and p->>'stat_scope' not in ('own','DD','DA','EX','all','team') then raise exception 'Phạm vi thống kê không hợp lệ.'; end if;
  if nullif(p->>'manager_id', '') is not null and (nullif(p->>'manager_id', '')::uuid = v_uid
     or not exists (select 1 from app.profiles where user_id = (p->>'manager_id')::uuid and role = 'sales' and active)) then
    raise exception 'Người quản lý trực tiếp phải là một tài khoản Sales đang hoạt động (không phải chính người này).';
  end if;
  insert into app.profiles (user_id, full_name, email, phone, role, segment, customer_id, default_warehouse, warehouses, active, stat_scope)
  values (v_uid, trim(p->>'name'), lower(trim(p->>'email')), nullif(trim(p->>'phone'), ''), v_role,
          case when v_role = 'sales' then v_seg end, case when v_role = 'customer' then v_cust end,
          coalesce(nullif(p->>'wh', ''), 'JM2'),
          case when v_role = 'logistics' then array[coalesce(nullif(p->>'wh', ''), 'JM2')] else '{}' end, true,
          case when v_role = 'customer' then null else nullif(p->>'stat_scope', '') end)
  on conflict (user_id) do update set full_name = excluded.full_name, phone = excluded.phone, role = excluded.role, segment = excluded.segment,
    customer_id = excluded.customer_id, default_warehouse = excluded.default_warehouse, warehouses = excluded.warehouses, active = true,
    stat_scope = excluded.stat_scope;
  update app.profiles set manager_id = case when v_role = 'sales' then nullif(p->>'manager_id', '')::uuid end,
         notify_team = coalesce((p->>'notify_team')::boolean, false) and v_role = 'sales'
   where user_id = v_uid;
  return v_uid;
end $$;

create or replace function public.admin_toggle_user(p_user uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; u app.profiles; alt uuid;
begin
  me := app.require_perm('users.manage');
  if p_user = me.user_id then raise exception 'Không tự khóa tài khoản của mình.'; end if;
  select * into u from app.profiles where user_id = p_user;
  if u.active and u.role = 'sales' and exists (select 1 from app.customers where sales_user_id = p_user) then
    select user_id into alt from app.profiles where role = 'sales' and active and segment = u.segment and user_id <> p_user limit 1;
    if alt is null then raise exception '% đang phụ trách khách hàng; tạo Sales thay thế cùng segment trước khi khóa.', u.full_name; end if;
    update app.customers set sales_user_id = alt where sales_user_id = p_user;
  end if;
  update app.profiles set active = not active where user_id = p_user;
  return case when u.active then 'locked' else 'unlocked' end;
end $$;

create or replace function public.admin_add_customer(p jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_id uuid; v_addr uuid; v_sales app.profiles; v_region text := nullif(p->>'region', '');
begin
  me := app.require_perm('customers.manage');
  if coalesce(trim(p->>'code'), '') = '' or coalesce(trim(p->>'name'), '') = '' or coalesce(p->>'label', '') = ''
     or coalesce(p->>'province', '') = '' or coalesce(trim(p->>'ward'), '') = '' then
    raise exception 'Điền đủ các trường bắt buộc.';
  end if;
  select * into v_sales from app.profiles where user_id = nullif(p->>'sales_id', '')::uuid and role = 'sales' and active;
  if not found or v_sales.segment <> p->>'segment' then raise exception 'Chọn Sales phụ trách cùng segment (BR-17).'; end if;
  if nullif(p->>'cs_id', '') is not null and not exists (select 1 from app.profiles where user_id = (p->>'cs_id')::uuid and role = 'cs' and active) then
    raise exception 'CS phụ trách không hợp lệ.';
  end if;
  insert into app.customers (code, name, segment, sales_user_id, cs_user_id, default_wh) values (trim(p->>'code'), trim(p->>'name'), p->>'segment', v_sales.user_id, nullif(p->>'cs_id', '')::uuid,
    (select code from app.warehouses where code = nullif(p->>'default_wh', ''))) returning id into v_id;
  insert into app.customer_addresses (customer_id, label, ward, province, is_default) values (v_id, trim(p->>'label'), trim(p->>'ward'), p->>'province', true) returning id into v_addr;
  if v_region is not null then
    insert into app.address_regions select v_addr, r.warehouse_code, r.id from app.regions r where r.id = v_region;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Mã khách hàng đã tồn tại.';
end $$;

-- Nghỉ phép và người nhận thay. p_user null = chính mình; người khác cần quyền Quản lý tài khoản.
-- Dọn dữ liệu cũ: người nhận thay chỉ là CS; chỉ CS có nghỉ phép
update app.profiles p set delegate_id = null
 where delegate_id is not null and not exists (select 1 from app.profiles d where d.user_id = p.delegate_id and d.role = 'cs');
update app.profiles set away_from = null, away_to = null, delegate_id = null where role <> 'cs' and (away_from is not null or delegate_id is not null);

create or replace function public.set_away(p_user uuid, p_from date, p_to date, p_delegate uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; t app.profiles; d app.profiles;
begin
  if p_user is null then
    if app.impersonating() then raise exception 'Đang Login as: đặt nghỉ phép cho người này ở màn hình Người dùng.'; end if;
    select * into me from app.profiles where user_id = app.real_uid() and active;
    if not found then raise exception 'Tài khoản chưa được cấp quyền.'; end if;
    t := me;
  else
    me := app.require_perm('users.manage');
    select * into t from app.profiles where user_id = p_user;
    if not found then raise exception 'Không tìm thấy tài khoản.'; end if;
  end if;
  if t.role <> 'cs' then raise exception 'Nghỉ phép và người nhận thay chỉ dùng cho tài khoản CS.'; end if;
  if p_from is null and p_to is null then
    update app.profiles set away_from = null, away_to = null, delegate_id = null where user_id = t.user_id;
    perform app.audit('user:' || t.user_id, t.full_name || ' tắt nghỉ phép');
    return;
  end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Chọn ngày bắt đầu và kết thúc nghỉ (kết thúc ≥ bắt đầu).'; end if;
  if p_to < app.today() then raise exception 'Ngày kết thúc nghỉ đã qua.'; end if;
  if p_delegate is not null then
    -- Người nhận thay phải là CS khác (cùng quyền xử lý booking của khách), đang hoạt động và không nghỉ trùng thời gian
    select * into d from app.profiles where user_id = p_delegate and active and role = 'cs';
    if not found or d.user_id = t.user_id then raise exception 'Người nhận thay phải là một CS khác đang hoạt động.'; end if;
    if d.away_from is not null and d.away_from <= p_to and d.away_to >= p_from then
      raise exception '% cũng nghỉ từ % đến %, trùng thời gian nghỉ này. Chọn CS khác.', d.full_name, app.dm(d.away_from), app.dm(d.away_to);
    end if;
  end if;
  update app.profiles set away_from = p_from, away_to = p_to, delegate_id = p_delegate where user_id = t.user_id;
  perform app.audit('user:' || t.user_id, t.full_name || ' nghỉ ' || app.dm(p_from) || '–' || app.dm(p_to)
                    || coalesce(', nhận thay: ' || d.full_name, ', không có người nhận thay'));
end $$;

-- Nhắc việc: booking Đề nghị đổi ngày quá N giờ chưa xử lý, hoặc Chờ xếp xe đã quá ngày bốc → nhắc tất cả CS (+ Logistics kho).
create or replace function app.escalate() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; v_h numeric := coalesce(app.setn('escalateHours'), 4); v_cs uuid[]; tt app.talk_threads;
begin
  v_cs := array(select user_id from app.profiles where role = 'cs' and active and not app.is_away(user_id));
  for r in select b.*, c.name as cname from app.bookings b join app.customers c on c.id = b.customer_id
            where ((b.status = 'resched' and b.updated_at < now() - make_interval(secs => (v_h * 3600)::int))
                or (b.status = 'hold' and b.day < app.today()))
              and (b.escalated_at is null or b.escalated_at < b.updated_at)
  loop
    perform app.notify(v_cs || case when r.status = 'hold' then app.logistics_of(r.warehouse_code) else '{}'::uuid[] end, 'Nhắc việc',
      r.id || ' · ' || r.cname || case when r.status = 'resched'
        then ': đề nghị đổi ngày sang ' || coalesce(app.dm(r.proposed_day), '?') || ' chưa được CS xử lý quá ' || app.fmt(v_h) || ' giờ.'
        else ': chờ xếp xe nhưng ngày bốc ' || app.dm(r.day) || ' đã qua; cần đổi ngày hoặc từ chối.' end,
      jsonb_build_object('bk', r.id));
    update app.bookings set escalated_at = now() where id = r.id;
    n := n + 1;
  end loop;
  -- v3.0: nháp (Lưu tạm) chưa gửi Logistics khi đã qua mốc chốt xe → nhắc CS tạo nháp (một lần)
  for r in select b.* from app.bookings b
            where b.status = 'draft' and now() > app.cutoff_at(b.day) and b.day + 2 >= app.today() and b.escalated_at is null loop
    perform app.notify(array[r.cs_user_id], 'Nhắc việc',
      r.id || ': nháp ngày bốc ' || app.dm(r.day) || ' chưa gửi Logistics (đã qua mốc chốt xe). Bấm Gửi Logistics hoặc đổi ngày.', jsonb_build_object('bk', r.id));
    update app.bookings set escalated_at = now() where id = r.id;
    n := n + 1;
  end loop;
  -- Nháp quá ngày bốc 2 ngày → tự hủy
  for r in select b.* from app.bookings b where b.status = 'draft' and b.day + 2 < app.today() loop
    update app.bookings set status = 'cancelled', closed_at = now(), reason_note = 'Nháp quá ngày bốc 2 ngày, hệ thống tự hủy', updated_at = now() where id = r.id;
    perform app.status_change(r.id, 'draft', 'cancelled', null, 'Tự hủy nháp quá hạn');
    perform app.audit(r.id, 'Tự hủy nháp: quá ngày bốc ' || app.dm(r.day) || ' hơn 2 ngày');
    perform app.notify(array[r.cs_user_id], 'Hủy booking', r.id || ': nháp ngày ' || app.dm(r.day) || ' đã tự hủy vì quá ngày bốc 2 ngày.', jsonb_build_object('bk', r.id));
    n := n + 1;
  end loop;
  -- v3.15: đơn Đã load / Đang giao chưa xác nhận giao → nhắc Logistics kho đó mỗi ngày một lần; quá N ngày báo thêm Admin
  for r in select b.*, c.name as cname from app.bookings b join app.customers c on c.id = b.customer_id
            where b.status in ('loaded','transit')
              and (b.day < app.today() or (b.eta is not null and b.eta < now() - make_interval(secs => (coalesce(app.setn('shipRemindHours'), 6) * 3600)::int)))
              and (b.ship_remind_on is null or b.ship_remind_on < app.today())
              and extract(hour from now() at time zone 'Asia/Ho_Chi_Minh') between 7 and 20 loop
    perform app.notify(app.logistics_of(r.warehouse_code)
        || case when app.today() - r.day >= coalesce(app.setn('shipAdminDays'), 2)
                then array(select user_id from app.profiles where role = 'admin' and active) else '{}'::uuid[] end,
      'Nhắc việc', r.id || ' · ' || r.cname || ': ' || case when r.status = 'loaded' then 'đã load' else 'đang giao' end
        || ' từ ' || app.dm(r.day) || ' nhưng chưa xác nhận Đã giao / Giao không thành công.', jsonb_build_object('bk', r.id));
    update app.bookings set ship_remind_on = app.today() where id = r.id;
    n := n + 1;
  end loop;
  -- v3.24: câu hỏi trong Trao đổi chưa ai trả lời quá N giờ → nhắc người được hỏi; quá 2N giờ → báo trưởng nhóm + Admin
  if extract(hour from now() at time zone 'Asia/Ho_Chi_Minh') between 7 and 20 then
    for tt in select t.* from app.talk_threads t
              where t.status = 'wait' and t.reminded < 2
                and t.asked_at < now() - make_interval(secs => (coalesce(app.setn('talkRemindHours'), 2) * 3600 * (t.reminded + 1))::int) loop
      if tt.reminded = 0 then
        perform app.notify(tt.wait_users, 'Nhắc việc', 'Chưa trả lời câu hỏi của ' || coalesce(app.uname(tt.asked_by), '?') || ' · ' || app.talk_title(tt) || ': ' || left(coalesce(tt.last_text, ''), 100),
                           jsonb_build_object('talk', jsonb_build_object('k', tt.kind, 'r', tt.ref)));
      else
        perform app.notify(array(select distinct x from unnest(
                   array(select manager_id from app.profiles where user_id = any(tt.wait_users) and manager_id is not null)
                   || array(select user_id from app.profiles where role = 'admin' and active)) x where x is not null),
          'Nhắc việc', 'Câu hỏi chưa ai trả lời quá ' || app.fmt(coalesce(app.setn('talkRemindHours'), 2) * 2) || ' giờ · ' || app.talk_title(tt)
            || ' (hỏi: ' || coalesce(app.uname(tt.asked_by), '?') || ', chờ: ' || coalesce((select string_agg(full_name, ', ') from app.profiles where user_id = any(tt.wait_users)), '?') || ')',
          jsonb_build_object('talk', jsonb_build_object('k', tt.kind, 'r', tt.ref)));
      end if;
      update app.talk_threads set reminded = reminded + 1 where id = tt.id;
      n := n + 1;
    end loop;
  end if;
  return n;
end $$;

-- Global Search: tìm theo mã booking / SO, khách hàng, địa chỉ, biển số / tài xế, người dùng; số tấn còn đặt được theo ngày.
-- Cùng phạm vi dữ liệu với get_state: khách chỉ đơn mình; Sales chỉ khách mình; nháp chỉ người tạo; người dùng chỉ khi có quyền quản trị.
create or replace function public.search(p_q text, p_day date default null, p_tons numeric default null, p_wh text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me app.profiles; q text := app.fold(trim(coalesce(p_q, ''))); qd text; v_int boolean; res jsonb := '{}'::jsonb;
  w record; d date; m jsonb; v_days jsonb := '[]'::jsonb; k int;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found then return res; end if;
  v_int := me.role <> 'customer';
  qd := regexp_replace(q, '[^a-z0-9]', '', 'g');
  if length(q) >= 2 then
    res := res || jsonb_build_object('bookings', (
      select coalesce(jsonb_agg(x.j order by x.rk, x.day desc), '[]') from (
        select jsonb_build_object('id', b.id, 'date', b.day, 'wh', b.warehouse_code, 'status', b.status, 'ref', b.ref,
                 'customer', case when v_int then c.name else '' end, 'customerId', b.customer_id, 'tons', app.bk_total(b.id),
                 'trucks', case when v_int then (select string_agg(split_part(a.truck_code, '-', 3) || '-' || split_part(a.truck_code, '-', 4), ', ' order by a.truck_code)
                                  from app.allocations a where a.booking_id = b.id) end) j,
               case when app.fold(b.id) = q or app.fold(b.ref) = q or regexp_replace(app.fold(b.ref), '[^a-z0-9]', '', 'g') = qd then 0 else 1 end rk, b.day
          from app.bookings b join app.customers c on c.id = b.customer_id
         where (v_int or (b.customer_id = me.customer_id and b.status <> 'draft'))
           and app.sees_sales(me, c.sales_user_id)
           and (b.status <> 'draft' or b.cs_user_id = me.user_id)
           and (app.fold(b.id) like '%' || q || '%' or app.fold(b.ref) like '%' || q || '%'
                or (length(qd) >= 3 and regexp_replace(app.fold(b.ref), '[^a-z0-9]', '', 'g') like '%' || qd || '%')
                or (v_int and (app.fold(c.name) like '%' || q || '%' or app.fold(c.code) like '%' || q || '%' or app.fold(b.address_text) like '%' || q || '%'))
                or (v_int and length(qd) >= 3 and exists (select 1 from app.allocations a join app.truck_days td on td.truck_code = a.truck_code
                     where a.booking_id = b.id and regexp_replace(app.fold(td.plate), '[^a-z0-9]', '', 'g') like '%' || qd || '%')))
         order by rk, b.day desc limit 8) x));
    if v_int then
      res := res || jsonb_build_object('customers', (
        select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name, 'segment', c.segment, 'active', c.active,
                 'sales', (select full_name from app.profiles where user_id = c.sales_user_id),
                 'cs', (select full_name from app.profiles where user_id = c.cs_user_id),
                 'address', (select a.label || ', ' || a.province from app.customer_addresses a where a.customer_id = c.id order by a.is_default desc limit 1),
                 'open', (select count(*) from app.bookings b where b.customer_id = c.id and b.status in ('hold','ok','resched') and b.day >= app.today()))
                 order by c.active desc, c.name), '[]')
          from (select * from app.customers c
                 where app.sees_sales(me, c.sales_user_id)
                   and (app.fold(c.name) like '%' || q || '%' or app.fold(c.code) like '%' || q || '%'
                        or exists (select 1 from app.customer_addresses a where a.customer_id = c.id
                                    and (app.fold(a.label) like '%' || q || '%' or app.fold(a.ward) like '%' || q || '%')))
                 order by c.active desc, c.name limit 6) c));
      if length(qd) >= 3 then
        res := res || jsonb_build_object('trucks', (
          select coalesce(jsonb_agg(jsonb_build_object('code', td.truck_code, 'date', td.day, 'wh', td.warehouse_code, 'plate', td.plate, 'driver', td.driver,
                   'phone', td.phone, 'cap', td.cap, 'load', app.truck_load(td.truck_code),
                   'bookings', (select count(*) from app.allocations a join app.bookings b on b.id = a.booking_id where a.truck_code = td.truck_code and b.status = any(app.active_sts())))
                   order by td.day desc), '[]')
            from (select * from app.truck_days td
                   where regexp_replace(app.fold(td.plate), '[^a-z0-9]', '', 'g') like '%' || qd || '%'
                      or app.fold(td.driver) like '%' || q || '%' or regexp_replace(td.phone, '[^0-9]', '', 'g') like '%' || qd || '%'
                   order by td.day desc limit 6) td));
      end if;
      if app.role_has(me.role, 'users.manage') or app.role_has(me.role, 'users.impersonate') then
        res := res || jsonb_build_object('users', (
          select coalesce(jsonb_agg(jsonb_build_object('id', p.user_id, 'name', p.full_name, 'email', p.email, 'role', p.role, 'active', p.active,
                   'company', (select name from app.customers where id = p.customer_id)) order by p.full_name), '[]')
            from (select * from app.profiles p
                   where app.fold(p.full_name) like '%' || q || '%' or lower(p.email) like '%' || q || '%'
                      or (length(qd) >= 4 and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') like '%' || qd || '%')
                   order by p.full_name limit 6) p));
      end if;
    end if;
  end if;
  -- Số tấn còn đặt được: theo một ngày, hoặc các ngày gần nhất đủ p_tons
  if p_day is not null then
    for w in select code, full_name from app.warehouses where active order by (code = coalesce(p_wh, me.default_warehouse)) desc, code loop
      m := app.day_metrics(w.code, p_day);
      v_days := v_days || jsonb_build_array(jsonb_build_object('wh', w.code, 'whName', w.full_name, 'date', p_day, 'avail', (m->>'avail')::numeric,
                  'status', m->>'status', 'fits', p_tons is null or (m->>'avail')::numeric >= p_tons));
    end loop;
  elsif p_tons is not null then
    for w in select code, full_name from app.warehouses where active order by (code = coalesce(p_wh, me.default_warehouse)) desc, code loop
      k := 0;
      for d in select g::date from generate_series(app.today(), app.today() + 45, interval '1 day') g loop
        m := app.day_metrics(w.code, d);
        if m->>'status' not in ('off','none') and (m->>'avail')::numeric >= p_tons then
          v_days := v_days || jsonb_build_array(jsonb_build_object('wh', w.code, 'whName', w.full_name, 'date', d, 'avail', (m->>'avail')::numeric,
                      'status', m->>'status', 'fits', true));
          k := k + 1; exit when k >= 3;
        end if;
      end loop;
    end loop;
  end if;
  if jsonb_array_length(v_days) > 0 then res := res || jsonb_build_object('days', v_days); end if;
  return res;
end $$;

-- Login as: bắt đầu / kết thúc. Kiểm tra quyền theo người đăng nhập thật (không theo người đang được xem).
create or replace function public.impersonate_start(p_user uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare a app.profiles; t app.profiles; v_min int := 60;
begin
  select * into a from app.profiles where user_id = app.real_uid() and active;
  if not found or not app.role_has(a.role, 'users.impersonate') then
    raise exception 'Vai trò của bạn chưa được cấp quyền "Login as".' using errcode = '42501';
  end if;
  select * into t from app.profiles where user_id = p_user;
  if not found then raise exception 'Không tìm thấy tài khoản.'; end if;
  if not t.active then raise exception 'Tài khoản % đang bị khóa, không Login as được.', t.email; end if;
  if t.user_id = a.user_id then raise exception 'Không Login as chính mình.'; end if;
  insert into app.impersonations (admin_id, target_id, expires_at) values (a.user_id, t.user_id, now() + make_interval(mins => v_min))
  on conflict (admin_id) do update set target_id = excluded.target_id, started_at = now(), expires_at = excluded.expires_at;
  delete from app.cust_views where admin_id = a.user_id;
  insert into app.audit_log (entity_id, detail, actor) values ('login-as', a.full_name || ' bắt đầu Login as ' || t.full_name || ' (' || t.email || ', ' || t.role || ')', a.user_id);
  return jsonb_build_object('name', t.full_name, 'role', t.role, 'minutes', v_min);
end $$;

create or replace function public.impersonate_stop() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare i app.impersonations; v_a text; v_t text;
begin
  delete from app.impersonations where admin_id = app.real_uid() returning * into i;
  if found then
    select full_name into v_a from app.profiles where user_id = i.admin_id;
    select full_name into v_t from app.profiles where user_id = i.target_id;
    insert into app.audit_log (entity_id, detail, actor) values ('login-as', coalesce(v_a, 'Admin') || ' kết thúc Login as ' || coalesce(v_t, '?'), i.admin_id);
  end if;
end $$;

-- Lưu ma trận quyền: p = {"logistics": ["perm",...], "cs": [...], "sales": [...], "admin": [...]}
create or replace function public.save_role_permissions(p jsonb) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; r text; n int := 0; v_old text[]; v_new text[];
begin
  me := app.require_perm('perms.manage');
  foreach r in array array['logistics','cs','sales','admin'] loop
    continue when not (p ? r);
    v_old := app.my_perms(r);
    insert into app.role_permissions (role, perm, allowed)
    select r, pm.code, pm.code in (select jsonb_array_elements_text(p->r)) or (r = 'admin' and pm.code = 'perms.manage')
      from app.permissions pm
    on conflict (role, perm) do update set allowed = excluded.allowed;
    v_new := app.my_perms(r);
    if v_old is distinct from v_new then
      n := n + 1;
      perform app.audit('permissions', 'Phân quyền ' || r || ': ' || array_to_string(v_new, ', '));
    end if;
  end loop;
  return n;
end $$;

create or replace function public.reset_role_permissions() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('perms.manage');
  insert into app.role_permissions (role, perm, allowed)
  select r, pm.code, r = any(pm.def_roles) from app.permissions pm cross join unnest(array['logistics','cs','sales','admin']) r
  on conflict (role, perm) do update set allowed = excluded.allowed;
  perform app.audit('permissions', 'Khôi phục phân quyền mặc định');
end $$;

-- Sửa thông tin khách hàng: p = {id, code, name, segment, sales_id}
create or replace function public.admin_update_customer(p jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; c app.customers; v_sales app.profiles; v_txt text := '';
begin
  me := app.require_perm('customers.manage');
  select * into c from app.customers where id = nullif(p->>'id', '')::uuid for update;
  if not found then raise exception 'Không tìm thấy khách hàng.'; end if;
  if coalesce(trim(p->>'code'), '') = '' or coalesce(trim(p->>'name'), '') = '' or coalesce(p->>'segment', '') not in ('DD','DA','EX') then
    raise exception 'Điền đủ mã, tên công ty và segment.';
  end if;
  select * into v_sales from app.profiles where user_id = nullif(p->>'sales_id', '')::uuid and role = 'sales' and active;
  if not found or v_sales.segment <> p->>'segment' then raise exception 'Chọn Sales phụ trách đang hoạt động, cùng segment (BR-17).'; end if;
  if c.code <> trim(p->>'code') then v_txt := v_txt || 'mã ' || c.code || ' → ' || trim(p->>'code') || '; '; end if;
  if c.name <> trim(p->>'name') then v_txt := v_txt || 'tên → ' || trim(p->>'name') || '; '; end if;
  if c.segment <> p->>'segment' then v_txt := v_txt || 'segment ' || c.segment || ' → ' || (p->>'segment') || '; '; end if;
  if c.sales_user_id is distinct from v_sales.user_id then v_txt := v_txt || 'Sales → ' || v_sales.full_name || '; '; end if;
  if nullif(p->>'cs_id', '') is not null and not exists (select 1 from app.profiles where user_id = (p->>'cs_id')::uuid and role = 'cs' and active) then
    raise exception 'CS phụ trách không hợp lệ.';
  end if;
  if c.cs_user_id is distinct from nullif(p->>'cs_id', '')::uuid then
    v_txt := v_txt || 'CS → ' || coalesce((select full_name from app.profiles where user_id = (p->>'cs_id')::uuid), 'chưa gán') || '; ';
  end if;
  if c.default_wh is distinct from nullif(p->>'default_wh', '') then v_txt := v_txt || 'kho mặc định → ' || coalesce(nullif(p->>'default_wh', ''), 'không') || '; '; end if;
  update app.customers set code = trim(p->>'code'), name = trim(p->>'name'), segment = p->>'segment', sales_user_id = v_sales.user_id,
         cs_user_id = nullif(p->>'cs_id', '')::uuid,
         default_wh = (select code from app.warehouses where code = nullif(p->>'default_wh', '')) where id = c.id;
  if v_txt <> '' then perform app.audit('customer:' || c.id, 'Sửa khách hàng ' || c.name || ': ' || v_txt); end if;
exception when unique_violation then
  raise exception 'Mã khách hàng đã tồn tại.';
end $$;

-- Ngừng dùng / dùng lại khách hàng. Ngừng dùng: không tạo booking mới; booking đã có vẫn xử lý bình thường.
create or replace function public.admin_toggle_customer(p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; c app.customers; v_open int;
begin
  me := app.require_perm('customers.manage');
  select * into c from app.customers where id = p_id for update;
  if not found then raise exception 'Không tìm thấy khách hàng.'; end if;
  select count(*) into v_open from app.bookings where customer_id = p_id and status in ('draft','hold','ok','resched') and day >= app.today();
  update app.customers set active = not active where id = p_id;
  perform app.audit('customer:' || p_id, case when c.active then 'Ngừng dùng' else 'Dùng lại' end || ' khách hàng ' || c.name);
  return jsonb_build_object('active', not c.active, 'openBookings', v_open);
end $$;

-- Thêm / sửa địa chỉ giao: p = {id (rỗng = thêm), customer_id, label, ward, province, regions: {"JM2": "PMY-HCM", ...}}
create or replace function public.admin_save_address(p jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_id uuid := nullif(p->>'id', '')::uuid; v_cust uuid := nullif(p->>'customer_id', '')::uuid; k text; v text;
begin
  me := app.require_perm('customers.manage');
  if not exists (select 1 from app.customers where id = v_cust) then raise exception 'Không tìm thấy khách hàng.'; end if;
  if coalesce(trim(p->>'label'), '') = '' or coalesce(p->>'province', '') = '' or coalesce(trim(p->>'ward'), '') = '' then
    raise exception 'Nhập tên điểm giao, tỉnh/thành và phường/xã.';
  end if;
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(p->'regions', '{}'::jsonb)) loop
    if coalesce(v, '') <> '' and not exists (select 1 from app.regions r where r.id = v and r.warehouse_code = k) then
      raise exception 'Khu vực % không thuộc kho %.', v, k;
    end if;
  end loop;
  if v_id is null then
    insert into app.customer_addresses (customer_id, label, ward, province, is_default)
    values (v_cust, trim(p->>'label'), trim(p->>'ward'), p->>'province', not exists (select 1 from app.customer_addresses where customer_id = v_cust))
    returning id into v_id;
  else
    update app.customer_addresses set label = trim(p->>'label'), ward = trim(p->>'ward'), province = p->>'province'
     where id = v_id and customer_id = v_cust;
    if not found then raise exception 'Địa chỉ không thuộc khách hàng này.'; end if;
    delete from app.address_regions where address_id = v_id;
  end if;
  insert into app.address_regions (address_id, warehouse_code, region_id)
  select v_id, key, value #>> '{}' from jsonb_each(coalesce(p->'regions', '{}'::jsonb)) where coalesce(value #>> '{}', '') <> '';
  perform app.audit('customer:' || v_cust, 'Lưu địa chỉ ' || trim(p->>'label'));
  return v_id;
end $$;

-- Xóa địa chỉ giao (booking cũ giữ nguyên địa chỉ dạng chữ). Phải còn ít nhất một địa chỉ.
create or replace function public.admin_delete_address(p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; a app.customer_addresses;
begin
  me := app.require_perm('customers.manage');
  select * into a from app.customer_addresses where id = p_id;
  if not found then raise exception 'Không tìm thấy địa chỉ.'; end if;
  if (select count(*) from app.customer_addresses where customer_id = a.customer_id) <= 1 then
    raise exception 'Khách hàng cần ít nhất một địa chỉ giao. Thêm địa chỉ mới trước khi xóa địa chỉ này.';
  end if;
  delete from app.customer_addresses where id = p_id;
  if a.is_default then
    update app.customer_addresses set is_default = true
     where id = (select id from app.customer_addresses where customer_id = a.customer_id order by label limit 1);
  end if;
  perform app.audit('customer:' || a.customer_id, 'Xóa địa chỉ ' || a.label);
end $$;

create or replace function public.update_my_profile(p_name text, p_phone text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if app.impersonating() then raise exception 'Đang Login as người dùng khác: không sửa hồ sơ của họ.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Nhập họ tên.'; end if;
  update app.profiles set full_name = trim(p_name), phone = nullif(trim(p_phone), '') where user_id = app.real_uid() and active;
end $$;

create or replace function public.mark_notifs_read(p_ids bigint[] default null) returns void
language sql volatile security definer set search_path = '' as $$
  update app.notifications set read_at = now()
   where user_id = app.real_uid() and read_at is null and (p_ids is null or id = any(p_ids)) and not app.impersonating()
$$;

-- Tạo Admin đầu tiên (chạy trong SQL Editor với quyền postgres, không gọi được từ trình duyệt)
create or replace function app.bootstrap_admin(p_email text, p_name text default 'Admin') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then raise exception 'Chưa có tài khoản % trong Authentication → Users.', p_email; end if;
  insert into app.profiles (user_id, full_name, email, role, default_warehouse)
  values (v_uid, p_name, lower(p_email), 'admin', 'JM2')
  on conflict (user_id) do update set role = 'admin', active = true;
  return v_uid;
end $$;

-- Admin gỡ thiết bị xác thực của một người (mất điện thoại, đổi máy). Lần đăng nhập sau họ đăng ký lại.
create or replace function public.admin_reset_mfa(p_user uuid) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; t app.profiles; n int;
begin
  me := app.require_perm('users.manage');
  select * into t from app.profiles where user_id = p_user;
  if not found then raise exception 'Không tìm thấy người dùng.'; end if;
  begin
    delete from auth.mfa_factors where user_id = p_user;
    get diagnostics n = row_count;
  exception when insufficient_privilege then
    raise exception 'Supabase không cho xóa trực tiếp. Vào Supabase → Authentication → Users → % → xóa MFA factor.', t.email;
  end;
  perform app.audit('user', 'Gỡ xác thực 2 lớp của ' || t.full_name || ' (' || n || ' thiết bị)');
  return n;
end $$;

-- Danh sách booking theo khoảng ngày bốc (màn hình Danh sách booking: lọc tuần này, tháng trước…)
-- Phạm vi giống get_state: nháp chỉ của người tạo; Sales chỉ khách mình phụ trách. Tối đa 2000 dòng.
create or replace function public.list_bookings(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('booking.list');
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Khoảng ngày không hợp lệ.'; end if;
  if p_to - p_from > 400 then raise exception 'Chọn khoảng tối đa khoảng 13 tháng.'; end if;
  return (select coalesce(jsonb_agg(x.j order by x.day desc, x.id), '[]') from (
    select b.id, b.day, jsonb_build_object('id', b.id, 'wh', b.warehouse_code, 'date', b.day, 'delivery', b.delivery_date, 'customerId', b.customer_id,
             'ref', b.ref, 'addrText', b.address_text, 'province', b.province, 'region', coalesce(b.region_id, 'NONE'),
             'status', b.status, 'csId', b.cs_user_id, 'rejectReason', b.reason_note, 'proposedDate', b.proposed_day,
             'origDate', b.original_day, 'changes', b.change_count, 'urgent', b.urgent, 'lateCancel', b.late_cancel, 'parent', b.parent_id,
             'coils', (select count(*) from app.delivery_items di where di.booking_id = b.id), 'shortTons', b.short_tons,
             'lines', (select coalesce(jsonb_agg(jsonb_build_object('p', l.product, 'c', l.color, 'th', l.thickness_mm, 'w', l.width_mm, 't', l.tons) order by l.id), '[]')
                       from app.booking_lines l where l.booking_id = b.id),
             'trucks', (select string_agg(split_part(a.truck_code, '-', 3) || '-' || split_part(a.truck_code, '-', 4), ', ' order by a.truck_code)
                        from app.allocations a where a.booking_id = b.id)) j
      from app.bookings b join app.customers c on c.id = b.customer_id
     where b.day between p_from and p_to
       and (b.status <> 'draft' or b.cs_user_id = me.user_id)
       and app.sees_sales(me, c.sales_user_id)
     order by b.day desc, b.id limit 2000) x);
end $$;

-- Phạm vi thống kê hiệu lực: mặc định Sales = khách mình, vai trò nội bộ khác = tất cả
create or replace function app.stat_scope(p app.profiles) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(p.stat_scope, case when p.role = 'sales' then 'own' else 'all' end) $$;

-- Thống kê đặt hàng theo khách (cột "Khách" trên lịch, DB-05). Chỉ trả số liệu tổng hợp theo khách × kho × ngày × trạng thái,
-- trong phạm vi thống kê của người dùng. Không gồm đơn đã hủy; đơn bị từ chối rồi đặt lại chỉ còn trạng thái mới.
create or replace function public.booking_stats(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles; v_scope text;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found or me.role = 'customer' then raise exception 'Tài khoản chưa được cấp quyền.' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then raise exception 'Khoảng ngày không hợp lệ.'; end if;
  v_scope := app.stat_scope(me);
  return jsonb_build_object('scope', v_scope,
    'customers', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name, 'segment', c.segment, 'active', c.active,
                    'salesId', c.sales_user_id, 'salesName', sp.full_name) order by c.name), '[]')
                  from app.customers c left join app.profiles sp on sp.user_id = c.sales_user_id
                 where v_scope = 'all' or (v_scope in ('DD','DA','EX') and c.segment = v_scope) or (v_scope = 'own' and c.sales_user_id = me.user_id) or (v_scope = 'team' and app.in_team(me.user_id, c.sales_user_id))),
    'rows', (select coalesce(jsonb_agg(jsonb_build_array(x.customer_id, x.warehouse_code, x.day, x.status, x.reason_code, x.tons, x.n)), '[]') from (
              select b.customer_id, b.warehouse_code, b.day, b.status, case when b.status = 'rejected' then coalesce(b.reason_code, 'OTHER') end as reason_code,
                     sum(app.bk_total(b.id)) as tons, count(*) as n
                from app.bookings b join app.customers c on c.id = b.customer_id
               where b.day between p_from and p_to and b.status in ('ok','hold','resched','draft','rejected','loaded','transit','delivered','failed')
                 and (v_scope = 'all' or (v_scope in ('DD','DA','EX') and c.segment = v_scope) or (v_scope = 'own' and c.sales_user_id = me.user_id) or (v_scope = 'team' and app.in_team(me.user_id, c.sales_user_id)))
               group by 1, 2, 3, 4, 5) x));
end $$;

-- ---------------------------------------------------------------------
-- 7b. v2.9 – tính năng mang từ bản Google Sheets (SRS mục 14)
-- ---------------------------------------------------------------------

-- BR-41: cờ khẩn tự tính theo mốc chốt xe, trừ khi Admin đã đặt
create or replace function app.refresh_urgent(p_id text) returns void
language sql security definer set search_path = '' as $$
  update app.bookings set urgent = coalesce(urgent_override, now() > app.cutoff_at(day)) where id = p_id
$$;

-- BR-09 / BR-38: tối đa 3 ngày gần nhất (±7 ngày, từ hôm nay) cùng kho còn đủ chỗ, không đề xuất ngày nghỉ
create or replace function app.suggest_days(p_wh text, p_day date, p_tons numeric, p_except text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', y.d, 'avail', y.avail) order by y.dist, y.d), '[]') from (
  select x.* from (
    select d::date as d, abs(d::date - p_day) as dist, (app.day_metrics(p_wh, d::date, p_except)->>'avail')::numeric as avail
      from generate_series(greatest(p_day - 7, app.today()), p_day + 7, interval '1 day') d
     where d::date <> p_day and not app.is_holiday(p_wh, d::date)
       and exists (select 1 from app.daily_fleet f where f.warehouse_code = p_wh and f.day = d::date)
  ) x where x.avail >= p_tons - 0.001 and x.dist > 0
  order by x.dist, x.d limit 3) y
$$;

-- Đổi tổng tấn booking (xác nhận giao hàng, load thiếu): giữ tấn khách yêu cầu ban đầu, gọt phần hàng trên xe nếu dư
create or replace function app.set_tons(p_id text, p_tons numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare l app.booking_lines; a record; v_over numeric;
begin
  update app.bookings set requested_tons = coalesce(requested_tons, app.bk_total(p_id)), updated_at = now() where id = p_id;
  select * into l from app.booking_lines where booking_id = p_id order by id limit 1;
  delete from app.booking_lines where booking_id = p_id;
  insert into app.booking_lines (booking_id, product, color, thickness_mm, width_mm, tons)
  values (p_id, l.product, l.color, l.thickness_mm, l.width_mm, round(p_tons, 2));
  v_over := app.alloc_sum(p_id) - round(p_tons, 2);
  for a in select * from app.allocations where booking_id = p_id order by truck_code desc loop
    exit when v_over <= 0.001;
    if a.tons <= v_over + 0.001 then
      delete from app.allocations where id = a.id; v_over := v_over - a.tons;
    else
      update app.allocations set tons = a.tons - v_over where id = a.id; v_over := 0;
    end if;
  end loop;
end $$;

-- BR-46: tạo đơn con <gốc>-N cho phần còn lại. p_day null = Nháp (không trừ capacity, chờ hẹn)
create or replace function app.split_child(p_id text, p_tons numeric, p_day date) returns text
language plpgsql security definer set search_path = '' as $$
declare b app.bookings; l app.booking_lines; v_root text; v_id text; v_n int; v_avail numeric;
begin
  select * into b from app.bookings where id = p_id;
  v_root := coalesce(b.parent_id, b.id);
  select count(*) + 2 into v_n from app.bookings where parent_id = v_root;
  v_id := v_root || '-' || v_n;
  if p_day is not null then
    if p_day < app.today() then raise exception 'Ngày hẹn phần còn lại phải từ hôm nay trở đi.'; end if;
    if not exists (select 1 from app.daily_fleet f where f.warehouse_code = b.warehouse_code and f.day = p_day) then
      raise exception 'Ngày % chưa khai báo xe: chọn ngày khác hoặc để chờ hẹn (Lưu tạm).', app.dm(p_day);
    end if;
    perform app.lock_day(b.warehouse_code, p_day);
    v_avail := (app.day_metrics(b.warehouse_code, p_day)->>'avail')::numeric;
    if p_tons > v_avail + 0.001 then
      raise exception 'Phần còn lại % MT vượt sức chứa còn lại % MT của ngày %. Chọn ngày khác hoặc để chờ hẹn.', app.fmt(p_tons), app.fmt(v_avail), app.dm(p_day);
    end if;
  end if;
  insert into app.bookings (id, warehouse_code, day, delivery_date, customer_id, ref, address_id, address_text, province, region_id,
                            status, note, cs_user_id, held_at, parent_id, original_day)
  values (v_id, b.warehouse_code, coalesce(p_day, b.day), null, b.customer_id, b.ref, b.address_id, b.address_text, b.province, b.region_id,
          case when p_day is null then 'draft' else 'hold' end, 'Phần còn lại của ' || p_id, app.uid(),
          case when p_day is not null then now() end, v_root, p_day);
  select * into l from app.booking_lines where booking_id = p_id order by id limit 1;
  insert into app.booking_lines (booking_id, product, color, thickness_mm, width_mm, tons)
  values (v_id, l.product, l.color, l.thickness_mm, l.width_mm, round(p_tons, 2));
  perform app.status_change(v_id, null, case when p_day is null then 'draft' else 'hold' end, null, 'Tách từ ' || p_id);
  perform app.audit(v_id, 'Tách từ ' || p_id || ': ' || app.fmt(p_tons) || ' MT, ' ||
                          case when p_day is null then 'chờ hẹn ngày' else 'giữ chỗ ngày ' || app.dm(p_day) end);
  if p_day is not null then
    perform app.refresh_urgent(v_id);
    perform app.notify(app.logistics_of(b.warehouse_code), 'Giữ chỗ',
      v_id || ' (phần còn lại của ' || p_id || ') giữ chỗ ' || app.fmt(p_tons) || ' MT ngày ' || app.dm(p_day), jsonb_build_object('bk', v_id));
  end if;
  return v_id;
end $$;

-- Ngưỡng coi như khớp giữa tổng cuộn và số tấn booking (BR-44)
create or replace function app.coil_tol(p_tons numeric) returns numeric
language sql stable security definer set search_path = '' as $$
  select greatest(p_tons * coalesce(app.setn('coilPct'), 3) / 100, coalesce(app.setn('coilTons'), 0.5))
$$;

-- Xử lý phần chưa giao (dùng chung cho xác nhận giao hàng thiếu và load thiếu)
create or replace function app.handle_rest(p_id text, p_rest numeric, p_mode text, p_day date, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_child text;
begin
  if p_mode = 'split' then
    v_child := app.split_child(p_id, p_rest, p_day);
    perform app.audit(p_id, 'Tách phần còn lại ' || app.fmt(p_rest) || ' MT sang ' || v_child);
  elsif p_mode = 'drop' then
    if not exists (select 1 from app.reason_codes r where r.kind = 'nodeliver' and r.code = p_reason) then
      raise exception 'Chọn lý do không giao phần còn lại.';
    end if;
    update app.bookings set undelivered_tons = coalesce(undelivered_tons, 0) + round(p_rest, 2),
           undelivered_note = concat_ws('; ', nullif(undelivered_note, ''),
             (select name from app.reason_codes where kind = 'nodeliver' and code = p_reason) || coalesce(': ' || nullif(trim(p_note), ''), ''))
     where id = p_id;
    perform app.audit(p_id, 'Không giao phần còn lại ' || app.fmt(p_rest) || ' MT: ' ||
      (select name from app.reason_codes where kind = 'nodeliver' and code = p_reason) || coalesce(' – ' || nullif(trim(p_note), ''), ''));
  else
    raise exception 'Chọn Tách đơn hoặc Không giao phần còn lại.' using hint = 'short';
  end if;
  return v_child;
end $$;

-- Nhập nhiều dòng (BR-36). p_rows = [{wh, day, code, tons, address, ref, note}], p_mode = 'hold' | 'draft'.
-- Mỗi dòng là một booking riêng, xét theo thứ tự; dòng lỗi không chặn dòng sau.
create or replace function public.bulk_create_bookings(p_rows jsonb, p_mode text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; r jsonb; i int := 0; res jsonb := '[]'; v_id text; c app.customers; v_addr uuid; v_region text;
  v_ok int := 0; v_day date; v_wh text; v_tons numeric; v_err text; v_hint text;
begin
  me := app.require_perm('booking.create');
  if p_mode not in ('hold','draft') then raise exception 'Chế độ lưu không hợp lệ.'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'Chưa có dòng nào.'; end if;
  if jsonb_array_length(p_rows) > 300 then raise exception 'Tối đa 300 dòng một lần (đang có %).', jsonb_array_length(p_rows); end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1; v_id := null; v_day := null; v_wh := upper(trim(coalesce(r->>'wh', ''))); v_tons := null;
    begin
      select * into c from app.customers where lower(code) = lower(trim(coalesce(r->>'code', '')));
      if not found then raise exception 'Mã khách % không có trong danh mục.', coalesce(nullif(trim(r->>'code'), ''), '(trống)'); end if;
      if not c.active then raise exception 'Khách % đã ngừng dùng.', c.code; end if;
      if not exists (select 1 from app.warehouses w where w.code = v_wh and w.active) then raise exception 'Kho % không hợp lệ.', coalesce(nullif(v_wh, ''), '(trống)'); end if;
      begin v_day := (r->>'day')::date; exception when others then raise exception 'Ngày bốc % không hợp lệ.', coalesce(r->>'day', ''); end;
      if v_day is null then raise exception 'Thiếu ngày bốc.'; end if;
      begin v_tons := replace(r->>'tons', ',', '.')::numeric; exception when others then raise exception 'Số tấn % không hợp lệ.', coalesce(r->>'tons', ''); end;
      if coalesce(v_tons, 0) <= 0 then raise exception 'Số tấn phải lớn hơn 0.'; end if;
      -- Không nhập địa chỉ: dùng địa chỉ mặc định của khách (kèm khu vực đã lưu)
      v_addr := (select a.id from app.customer_addresses a where a.id::text = nullif(r->>'address_id', '') and a.customer_id = c.id);
      v_region := case when v_addr is not null then (select ar.region_id from app.address_regions ar where ar.address_id = v_addr and ar.warehouse_code = v_wh)
                       else (select x.id from app.regions x where x.id = nullif(r->>'region', '') and x.warehouse_code = v_wh) end;
      if v_addr is null and coalesce(trim(r->>'address'), '') = '' then
        select a.id, ar.region_id into v_addr, v_region from app.customer_addresses a
          left join app.address_regions ar on ar.address_id = a.id and ar.warehouse_code = v_wh
         where a.customer_id = c.id order by a.is_default desc, a.label limit 1;
      end if;
      v_id := public.save_booking(jsonb_build_object(
        'mode', p_mode, 'wh', v_wh, 'day', v_day, 'customer_id', c.id, 'tons', v_tons,
        'ref', coalesce(trim(r->>'ref'), ''), 'note', coalesce(trim(r->>'note'), ''),
        'address_id', coalesce(v_addr::text, 'new'), 'street', coalesce(trim(r->>'address'), ''),
        'province', coalesce(r->>'province', ''), 'save_addr', coalesce((r->>'save_addr')::boolean, false),
        'region', coalesce(v_region, 'NONE')));
      update app.bookings set note = trim(note) where id = v_id;
      v_ok := v_ok + 1;
      res := res || jsonb_build_object('row', i, 'ok', true, 'id', v_id, 'wh', v_wh, 'day', v_day, 'code', c.code, 'name', c.name, 'tons', v_tons,
                                       'holiday', app.is_holiday(v_wh, v_day));
    exception when others then
      get stacked diagnostics v_err = message_text;
      res := res || jsonb_build_object('row', i, 'ok', false, 'error', v_err, 'wh', v_wh, 'day', v_day, 'code', r->>'code', 'tons', coalesce(v_tons::text, r->>'tons'),
                                       'suggest', case when v_day is not null and coalesce(v_tons, 0) > 0 and v_wh <> ''
                                                       then app.suggest_days(v_wh, v_day, v_tons) else '[]'::jsonb end);
    end;
  end loop;
  perform app.audit('bulk', 'Nhập nhiều dòng (' || case when p_mode = 'hold' then 'giữ chỗ' else 'lưu tạm' end || '): '
                            || v_ok || ' nhận / ' || (i - v_ok) || ' không nhận');
  return jsonb_build_object('ok', v_ok, 'failed', i - v_ok, 'rows', res);
end $$;

-- Gợi ý ngày còn chỗ (dùng ở form và màn kết quả)
create or replace function public.suggest_days(p_wh text, p_day date, p_tons numeric) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('booking.create');
  return app.suggest_days(p_wh, p_day, p_tons);
end $$;

-- BR-41: Admin đặt / bỏ cờ khẩn (p_mode = 'on' | 'off' | 'auto')
create or replace function public.set_urgent(p_id text, p_mode text, p_note text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings;
begin
  me := app.require_perm('booking.urgent');
  if p_mode not in ('on','off','auto') then raise exception 'Chọn Khẩn / Không khẩn / Tự tính.'; end if;
  if p_mode <> 'auto' and coalesce(trim(p_note), '') = '' then raise exception 'Nhập lý do đặt cờ khẩn.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found then raise exception 'Không tìm thấy booking.'; end if;
  update app.bookings set urgent_override = case p_mode when 'on' then true when 'off' then false end,
         urgent_note = case when p_mode = 'auto' then '' else trim(p_note) end, updated_at = now() where id = p_id;
  perform app.refresh_urgent(p_id);
  perform app.audit(p_id, case p_mode when 'on' then 'Admin đặt cờ khẩn: ' || trim(p_note) when 'off' then 'Admin bỏ cờ khẩn: ' || trim(p_note) else 'Cờ khẩn về tự tính' end);
  if p_mode = 'on' then
    perform app.notify(app.logistics_of(b.warehouse_code), 'Đơn khẩn', p_id || ' được Admin đặt cờ khẩn: ' || trim(p_note), jsonb_build_object('bk', p_id));
  end if;
end $$;

-- BR-43 / BR-44: CS xác nhận giao hàng. p = {id, address_id | address + province, coils: [{whs, order_no, ln, itmno, name, lot, qty, attr, customer}],
--   force (đã kiểm tra cảnh báo), rest_mode ('split'|'drop'), rest_day, rest_reason, rest_note, update_tons}
create or replace function public.confirm_delivery(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; b app.bookings; c app.customers; w app.warehouses; cx jsonb; i int := 0;
  v_lots text[] := '{}'; v_lot text; v_qty numeric; v_total numeric := 0; v_tons numeric; v_tol numeric;
  v_dup text; v_cust text[]; v_other text; v_warn text[] := '{}'; v_child text; v_addr uuid; v_addr_text text; v_prov text; v_region text;
  v_avail numeric; v_status text; v_n int; v_newday date;
begin
  me := app.require_perm('delivery.confirm');
  select * into b from app.bookings where id = p->>'id' for update;
  if not found then raise exception 'Không tìm thấy booking.'; end if;
  if b.status not in ('hold','ok') then raise exception 'Chỉ xác nhận giao hàng cho booking Chờ xếp xe hoặc Đã xác nhận.'; end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  select * into w from app.warehouses where code = b.warehouse_code;

  -- Địa chỉ giao bắt buộc (BR-39)
  if nullif(p->>'address_id', '') is not null then
    select a.id, concat_ws(', ', a.label, nullif(a.ward, '')), a.province, ar.region_id into v_addr, v_addr_text, v_prov, v_region
      from app.customer_addresses a left join app.address_regions ar on ar.address_id = a.id and ar.warehouse_code = b.warehouse_code
     where a.id = (p->>'address_id')::uuid and a.customer_id = b.customer_id;
    if v_addr is null then raise exception 'Địa chỉ không thuộc khách hàng này.'; end if;
  else
    v_addr_text := trim(coalesce(p->>'address', ''));
    v_prov := coalesce(p->>'province', b.province);
    v_addr := case when v_addr_text = b.address_text then b.address_id end;
  end if;
  if coalesce(v_addr_text, '') = '' then raise exception 'Nhập địa chỉ giao (bắt buộc khi xác nhận giao hàng).'; end if;

  -- v3.3: ngày bốc đã qua mà chưa giao -> bắt buộc nhập ngày bốc thực tế (từ hôm nay); đơn chuyển sang ngày đó, gỡ xe cũ, chờ xếp xe
  if b.day < app.today() then
    v_newday := nullif(p->>'actual_day', '')::date;
    if v_newday is null then
      raise exception 'Ngày bốc % đã qua: nhập Ngày bốc thực tế (từ hôm nay trở đi).', app.dm(b.day) using hint = 'late_day';
    end if;
    if v_newday < app.today() then raise exception 'Ngày bốc thực tế phải từ hôm nay trở đi.'; end if;
    if not exists (select 1 from app.warehouses where code = b.warehouse_code and active) then
      raise exception 'Kho % đã ngừng dùng: đổi kho cho đơn trước.', b.warehouse_code;
    end if;
  end if;

  -- Danh sách cuộn
  if jsonb_typeof(p->'coils') <> 'array' or jsonb_array_length(p->'coils') = 0 then raise exception 'Dán danh sách cuộn (có dòng tiêu đề).'; end if;
  if jsonb_array_length(p->'coils') > 300 then raise exception 'Tối đa 300 cuộn một đơn.'; end if;
  for cx in select * from jsonb_array_elements(p->'coils') loop
    i := i + 1;
    v_lot := trim(coalesce(cx->>'lot', ''));
    begin v_qty := replace(coalesce(cx->>'qty', ''), ',', '.')::numeric; exception when others then v_qty := null; end;
    if v_lot = '' then raise exception 'Cuộn dòng %: thiếu Lot number.', i; end if;
    if coalesce(v_qty, 0) <= 0 then raise exception 'Cuộn % (dòng %): Allocated qty phải lớn hơn 0.', v_lot, i; end if;
    v_lots := v_lots || v_lot; v_total := v_total + v_qty;
  end loop;
  select string_agg(l, ', ') into v_dup from (select l from unnest(v_lots) l group by l having count(*) > 1) d;
  if v_dup is not null then raise exception 'Lot number bị trùng trong danh sách: %.', v_dup; end if;
  select array_agg(distinct nullif(trim(x->>'customer'), '')) into v_cust from jsonb_array_elements(p->'coils') x where nullif(trim(x->>'customer'), '') is not null;
  if coalesce(cardinality(v_cust), 0) > 1 then raise exception 'Danh sách cuộn có nhiều khách (%); mỗi đơn chỉ giao cho một khách.', array_to_string(v_cust, ', '); end if;
  select string_agg(distinct di.lot || ' (' || di.booking_id || ')', ', ') into v_other
    from app.delivery_items di join app.bookings ob on ob.id = di.booking_id
   where di.lot = any(v_lots) and di.booking_id <> b.id and ob.status not in ('cancelled','failed','rejected');
  if v_other is not null then raise exception 'Cuộn đã thuộc booking khác còn hiệu lực: %.', v_other; end if;

  -- Cảnh báo cần CS xác nhận "Đã kiểm tra – vẫn lưu"
  if c.erp_code <> '' and coalesce(cardinality(v_cust), 0) = 1 and v_cust[1] <> c.erp_code then
    v_warn := v_warn || ('Customer trên cuộn (' || v_cust[1] || ') khác Mã KH ERP của ' || c.name || ' (' || c.erp_code || ')');
  end if;
  if w.erp_code <> '' then
    select count(*) into v_n from jsonb_array_elements(p->'coils') x where nullif(trim(x->>'whs'), '') is not null and trim(x->>'whs') <> w.erp_code;
    if v_n > 0 then v_warn := v_warn || (v_n || ' cuộn có Whs khác kho ' || w.name || ' (' || w.erp_code || ')'); end if;
  end if;
  if cardinality(v_warn) > 0 and not coalesce((p->>'force')::boolean, false) then
    raise exception 'Cần kiểm tra: %.', array_to_string(v_warn, '; ') using hint = 'warn';
  end if;

  if v_newday is not null then
    perform app.lock_day(b.warehouse_code, v_newday);
    delete from app.allocations where booking_id = b.id;
    update app.bookings set day = v_newday, status = 'hold', held_at = now(), original_day = coalesce(original_day, b.day), updated_at = now()
     where id = b.id;
    if b.status <> 'hold' then
      perform app.status_change(b.id, b.status, 'hold', null, 'CS xác nhận giao sau ngày bốc ' || app.dm(b.day) || ', gỡ xe cũ');
    end if;
    perform app.audit(b.id, 'Đổi ngày bốc ' || app.dm(b.day) || ' → ' || app.dm(v_newday)
                            || ': CS xác nhận giao sau ngày bốc (giao trễ, không tính lần đổi ngày); gỡ xe ngày cũ, chờ Logistics xếp xe');
    b.day := v_newday; b.status := 'hold';
  end if;

  update app.bookings set address_id = v_addr, address_text = v_addr_text, province = coalesce(v_prov, ''),
         region_id = coalesce(v_region, region_id), delivery_at = now(),
         ref = case when ref = '' then coalesce((select trim(e->>'order_no') from jsonb_array_elements(p->'coils') e
                                                  where coalesce(trim(e->>'order_no'), '') <> '' limit 1), '') else ref end,
         updated_at = now()
   where id = b.id;

  -- So tổng cuộn với số tấn (BR-44)
  v_tons := app.bk_total(b.id); v_tol := app.coil_tol(v_tons); v_status := b.status;
  if v_tons - v_total > v_tol then
    if coalesce(p->>'rest_mode', '') = '' then
      raise exception 'Tổng cuộn % MT thiếu % MT so với booking % MT. Chọn Tách đơn hoặc Không giao phần còn lại.',
        app.fmt(v_total), app.fmt(v_tons - v_total), app.fmt(v_tons) using hint = 'short';
    end if;
    perform app.set_tons(b.id, v_total);
    v_child := app.handle_rest(b.id, v_tons - v_total, p->>'rest_mode', nullif(p->>'rest_day', '')::date, p->>'rest_reason', p->>'rest_note');
  elsif v_total - v_tons > v_tol then
    if not coalesce((p->>'update_tons')::boolean, false) then
      raise exception 'Tổng cuộn % MT nhiều hơn booking % MT. Tick "Cập nhật số tấn theo cuộn" để lưu.', app.fmt(v_total), app.fmt(v_tons) using hint = 'excess';
    end if;
    perform app.lock_day(b.warehouse_code, b.day);
    v_avail := (app.day_metrics(b.warehouse_code, b.day, b.id)->>'avail')::numeric;
    if v_total > v_avail + 0.001 then
      raise exception 'Ngày % chỉ còn đặt được % MT cho booking này, không đủ % MT theo cuộn.', app.dm(b.day), app.fmt(v_avail), app.fmt(v_total);
    end if;
    perform app.set_tons(b.id, v_total);
    if b.status = 'ok' and app.alloc_sum(b.id) < v_total - 0.001 then
      v_status := 'hold';
      update app.bookings set status = 'hold', held_at = now() where id = b.id;
      perform app.status_change(b.id, 'ok', 'hold', null, 'Tăng số tấn theo danh sách cuộn');
    end if;
    perform app.audit(b.id, 'Cập nhật số tấn theo cuộn: ' || app.fmt(v_tons) || ' → ' || app.fmt(v_total) || ' MT');
  end if;

  delete from app.delivery_items where booking_id = b.id;
  insert into app.delivery_items (booking_id, seq, whs, order_no, ln, itmno, name, lot, qty, attr, customer, created_by)
  select b.id, o, trim(coalesce(x->>'whs', '')), trim(coalesce(x->>'order_no', '')), trim(coalesce(x->>'ln', '')), trim(coalesce(x->>'itmno', '')),
         trim(coalesce(x->>'name', '')), trim(x->>'lot'), replace(x->>'qty', ',', '.')::numeric, trim(coalesce(x->>'attr', '')), trim(coalesce(x->>'customer', '')), me.user_id
    from jsonb_array_elements(p->'coils') with ordinality t(x, o);
  perform app.audit(b.id, 'Xác nhận giao hàng: ' || i || ' cuộn, ' || app.fmt(v_total) || ' MT, giao tới ' || v_addr_text
                          || case when cardinality(v_warn) > 0 then '. Đã kiểm tra: ' || array_to_string(v_warn, '; ') else '' end);
  perform app.notify(app.logistics_of(b.warehouse_code),
    case when v_status = 'hold' or b.day <= app.today() + 1 then 'Giao hàng gấp' else 'Chi tiết giao hàng' end,
    b.id || ' · ' || c.name || ' ngày ' || app.dm(b.day) || ': đã có danh sách ' || i || ' cuộn, ' || app.fmt(v_total) || ' MT'
    || case when v_status = 'hold' then '. Hàng sẵn sàng – cần xếp xe ngay' else '' end,
    jsonb_build_object('bk', b.id));
  if v_newday is not null then perform app.refresh_urgent(b.id); end if;
  return jsonb_build_object('coils', i, 'tons', v_total, 'child', v_child, 'status', v_status, 'day', b.day);
end $$;

-- Danh sách cuộn của một booking (nội bộ; khách xem được cuộn của đơn mình)
create or replace function public.get_coils(p_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles; b app.bookings;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found then raise exception 'Tài khoản chưa được cấp quyền.' using errcode = '42501'; end if;
  select * into b from app.bookings where id = p_id;
  if not found then raise exception 'Không tìm thấy booking.'; end if;
  if me.role = 'customer' and b.customer_id is distinct from me.customer_id then raise exception 'Không có quyền xem.' using errcode = '42501'; end if;
  if not app.sees_sales(me, (select c.sales_user_id from app.customers c where c.id = b.customer_id)) then
    raise exception 'Không có quyền xem.' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'whs', whs, 'order_no', order_no, 'ln', ln, 'itmno', itmno, 'name', name,
            'lot', lot, 'qty', qty, 'attr', attr, 'customer', customer, 'loaded', loaded) order by seq), '[]')
            from app.delivery_items where booking_id = p_id);
end $$;

-- BR-45: Logistics load hàng. p_unloaded = các Lot không lên xe
create or replace function public.mark_loaded(p_id text, p_unloaded text[], p_note text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers; v_short numeric; v_tons numeric; v_n int;
begin
  me := app.require_perm('delivery.ship');
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status <> 'ok' then raise exception 'Chỉ load hàng cho booking Đã xác nhận.'; end if;
  if b.delivery_at is null and coalesce((app.setting('requirePicking') #>> '{}')::boolean, true) then
    raise exception 'Booking chưa có danh sách cuộn: CS cần Xác nhận giao hàng trước.';
  end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  update app.delivery_items set loaded = not (lot = any(coalesce(p_unloaded, '{}'))) where booking_id = p_id;
  select coalesce(sum(qty) filter (where not loaded), 0), count(*) filter (where not loaded) into v_short, v_n from app.delivery_items where booking_id = p_id;
  if v_n > 0 and coalesce(trim(p_note), '') = '' then raise exception 'Nhập ghi chú cho các cuộn không lên xe.'; end if;
  v_tons := app.bk_total(p_id);
  update app.bookings set status = 'loaded', loaded_at = now(), load_note = coalesce(trim(p_note), ''),
         short_tons = case when v_short > app.coil_tol(v_tons) then round(v_short, 2) end, updated_at = now() where id = p_id;
  perform app.status_change(p_id, 'ok', 'loaded', null, nullif(trim(p_note), ''));
  perform app.audit(p_id, 'Đã load hàng' || case when v_n > 0 then ', ' || v_n || ' cuộn không lên xe (' || app.fmt(v_short) || ' MT): ' || trim(p_note) else '' end);
  if v_short > app.coil_tol(v_tons) then
    perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Load thiếu',
      p_id || ' · ' || c.name || ': load thiếu ' || app.fmt(v_short) || ' MT (' || v_n || ' cuộn). Chọn tách đơn hoặc không giao phần còn lại. Ghi chú: ' || trim(p_note),
      jsonb_build_object('bk', p_id));
  else
    perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Đã load', p_id || ' · ' || c.name || ' đã load hàng', jsonb_build_object('bk', p_id));
  end if;
  perform app.notify(app.customer_users(c.id), 'Đã load', 'Đơn ' || coalesce(nullif(b.ref, ''), p_id) || ' ngày ' || app.dm(b.day) || ' đã load lên xe',
                     jsonb_build_object('bk', p_id, 'day', b.day));
  return jsonb_build_object('short', v_short, 'shortCoils', v_n, 'needAction', v_short > app.coil_tol(v_tons));
end $$;

-- v3.27: Đã load nhưng xe chưa xuất phát → Logistics mở lại để điều chỉnh (đơn về Đã xếp xe, sửa / chuyển xe rồi bốc lại).
-- Bắt buộc lý do, ghi nhật ký, báo CS + Sales; không báo khách (điều chỉnh nội bộ).
create or replace function public.unload_booking(p_id text, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers; v_trk text;
begin
  me := app.require_perm('delivery.ship');
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Nhập lý do mở lại (ví dụ: xếp lại hàng cho cân xe).'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status <> 'loaded' then raise exception 'Chỉ mở lại được đơn Đã load (chưa Đang giao).'; end if;
  perform app.check_scope(me, b.customer_id);
  select string_agg(distinct app.short_code(a.truck_code), ', ') into v_trk from app.allocations a where a.booking_id = p_id and app.truck_departed(a.truck_code);
  if v_trk is not null then raise exception 'Xe % đã xuất phát (có đơn Đang giao): không mở lại được. Dùng Giao không thành công nếu cần.', v_trk; end if;
  select * into c from app.customers where id = b.customer_id;
  update app.delivery_items set loaded = true where booking_id = p_id;
  update app.bookings set status = 'ok', loaded_at = null, load_note = '', short_tons = null, ship_remind_on = null, updated_at = now() where id = p_id;
  perform app.status_change(p_id, 'loaded', 'ok', null, 'Mở lại để điều chỉnh: ' || trim(p_reason));
  perform app.audit(p_id, 'Mở lại để điều chỉnh (Đã load → Đã xếp xe): ' || trim(p_reason));
  perform app.notify_bk(c.id, null, array[c.sales_user_id], 'Nhắc việc',
    p_id || ' · ' || c.name || ': Logistics ' || me.full_name || ' mở lại đơn đã load để điều chỉnh xếp xe. Lý do: ' || trim(p_reason), jsonb_build_object('bk', p_id));
end $$;

-- CS xử lý load thiếu: tách đơn phần còn lại hoặc không giao (BR-44, BR-46)
create or replace function public.resolve_short(p_id text, p_mode text, p_day date, p_reason text, p_note text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; v_child text; v_tons numeric;
begin
  me := app.require_perm('delivery.confirm');
  select * into b from app.bookings where id = p_id for update;
  if not found or coalesce(b.short_tons, 0) <= 0 or b.status not in ('loaded','transit','delivered') then raise exception 'Booking không có load thiếu cần xử lý.'; end if;
  perform app.check_scope(me, b.customer_id);
  v_tons := app.bk_total(p_id);
  perform app.set_tons(p_id, v_tons - b.short_tons);
  v_child := app.handle_rest(p_id, b.short_tons, p_mode, p_day, p_reason, p_note);
  update app.bookings set short_tons = null, updated_at = now() where id = p_id;
  return v_child;
end $$;

create or replace function public.mark_transit(p_id text, p_eta timestamptz) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers;
begin
  me := app.require_perm('delivery.ship');
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status <> 'loaded' then raise exception 'Chỉ chuyển Đang giao cho booking Đã load hàng.'; end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  update app.bookings set status = 'transit', eta = p_eta, updated_at = now() where id = p_id;
  perform app.status_change(p_id, 'loaded', 'transit', null, case when p_eta is not null then 'Dự kiến tới ' || to_char(p_eta at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI') end);
  perform app.audit(p_id, 'Đang giao' || coalesce(', dự kiến tới ' || to_char(p_eta at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'), ''));
  perform app.notify(app.customer_users(c.id), 'Đang giao', 'Đơn ' || coalesce(nullif(b.ref, ''), p_id) || ' đang giao'
    || coalesce(', dự kiến tới ' || to_char(p_eta at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'), ''), jsonb_build_object('bk', p_id, 'day', b.day));
  -- v3.15: báo thêm Sales phụ trách
  perform app.notify(array[c.sales_user_id], 'Đang giao', p_id || ' · ' || c.name || ' đang giao'
    || coalesce(', dự kiến tới ' || to_char(p_eta at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'), ''), jsonb_build_object('bk', p_id));
end $$;

create or replace function public.mark_delivered(p_id text, p_at timestamptz) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers; v_at timestamptz := coalesce(p_at, now());
begin
  me := app.require_perm('delivery.ship');
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status not in ('loaded','transit') then raise exception 'Chỉ xác nhận Đã giao cho booking Đã load hoặc Đang giao.'; end if;
  perform app.check_scope(me, b.customer_id);
  if v_at > now() + interval '5 minutes' then raise exception 'Giờ tới nơi không được ở tương lai.'; end if;
  select * into c from app.customers where id = b.customer_id;
  update app.bookings set status = 'delivered', delivered_at = v_at, closed_at = now(), updated_at = now() where id = p_id;
  perform app.status_change(p_id, b.status, 'delivered', null, 'Tới nơi ' || to_char(v_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'));
  perform app.audit(p_id, 'Đã giao, tới nơi ' || to_char(v_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'));
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Đã giao', p_id || ' · ' || c.name || ' đã giao', jsonb_build_object('bk', p_id));
  perform app.notify(app.customer_users(c.id), 'Đã giao', 'Đơn ' || coalesce(nullif(b.ref, ''), p_id) || ' đã giao lúc '
    || to_char(v_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM'), jsonb_build_object('bk', p_id, 'day', b.day));
end $$;

create or replace function public.mark_failed(p_id text, p_reason text, p_reason_code text default 'OTHER') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers;
begin
  me := app.require_perm('delivery.ship');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Nhập lý do giao không thành công.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status not in ('loaded','transit') then raise exception 'Chỉ báo Giao không thành công cho booking Đã load hoặc Đang giao.'; end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set status = 'failed', fail_note = trim(p_reason), reason_code = p_reason_code, short_tons = null, updated_at = now() where id = p_id;
  perform app.status_change(p_id, b.status, 'failed', p_reason_code, p_reason);
  perform app.audit(p_id, 'Giao không thành công: ' || trim(p_reason));
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Giao lỗi',
    p_id || ' · ' || c.name || ' giao không thành công: ' || trim(p_reason) || '. Chọn ngày giao lại hoặc hủy.', jsonb_build_object('bk', p_id));
  perform app.notify(app.customer_users(c.id), 'Giao lỗi', 'Đơn ' || coalesce(nullif(b.ref, ''), p_id) || ' giao không thành công: ' || trim(p_reason),
                     jsonb_build_object('bk', p_id, 'day', b.day));
end $$;

-- BR-47: đóng xe (tải trọng = số đã xếp, không xếp thêm) hoặc mở lại (p_cap null = tải trọng chuẩn)
create or replace function public.close_truck(p_code text, p_close boolean, p_reason text, p_cap numeric default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; v_wh text := split_part(p_code, '-', 1); v_day date; t record; v_load numeric; m jsonb; v_def numeric;
  v_min numeric; v_max numeric; v_txt text;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found or not (app.role_has(me.role, 'fleet.manage') or app.role_has(me.role, 'alloc.assign')) then
    raise exception 'Vai trò của bạn chưa được cấp quyền khai báo xe hoặc gán xe.' using errcode = '42501';
  end if;
  begin v_day := to_date(split_part(p_code, '-', 2), 'DDMMYY'); exception when others then raise exception 'Mã xe không hợp lệ.'; end;
  if v_day < app.today() then raise exception 'Ngày đã qua, không thay đổi được (BR-12).'; end if;
  perform app.lock_day(v_wh, v_day);
  select * into t from app.trucks(v_wh, v_day) x where x.code = p_code;
  if not found then raise exception 'Xe % không có trong khai báo ngày % của kho %.', p_code, app.dm(v_day), v_wh; end if;
  v_load := app.truck_load(p_code);
  if p_close then
    if app.truck_closed(p_code) then raise exception 'Xe đã đóng.'; end if;
    if coalesce(trim(p_reason), '') = '' then raise exception 'Nhập lý do đóng xe.'; end if;
    m := app.day_metrics(v_wh, v_day);
    if (m->>'free')::numeric - greatest(0, t.cap - v_load) < (m->>'held')::numeric - 0.001 then
      raise exception 'Đóng xe % làm sức chứa ngày % nhỏ hơn số tấn đang giữ chỗ (% MT). Xếp các booking chờ trước.',
        app.short_code(p_code), app.dm(v_day), app.fmt((m->>'held')::numeric);
    end if;
    insert into app.truck_days (truck_code, warehouse_code, day, cap, closed, closed_reason, updated_by, updated_at)
    values (p_code, v_wh, v_day, round(v_load, 2), true, trim(p_reason), me.user_id, now())
    on conflict (truck_code) do update set cap = excluded.cap, closed = true, closed_reason = excluded.closed_reason,
      updated_by = excluded.updated_by, updated_at = now();
    v_txt := 'Kho ' || v_wh || ' ngày ' || app.dm(v_day) || ': đóng xe ' || app.short_code(p_code) || ' ở ' || app.fmt(v_load) || ' MT. Lý do: ' || trim(p_reason);
  else
    if not app.truck_closed(p_code) then raise exception 'Xe đang mở.'; end if;
    v_def := app.setn(case when t.type = 'DK' then 'capDK' else 'capCN' end);
    if p_cap is not null and abs(p_cap - v_def) >= 0.005 then
      v_min := coalesce(app.setn(case when t.type = 'DK' then 'capDKMin' else 'capCNMin' end), case when t.type = 'DK' then 15 else 5 end);
      v_max := coalesce(app.setn(case when t.type = 'DK' then 'capDKMax' else 'capCNMax' end), case when t.type = 'DK' then 35 else 20 end);
      if p_cap < v_min or p_cap > v_max then raise exception 'Tải trọng xe % phải trong khoảng % – % tấn.', t.type, app.fmt(v_min), app.fmt(v_max); end if;
    end if;
    update app.truck_days set closed = false, closed_reason = '',
           cap = case when p_cap is null or abs(p_cap - v_def) < 0.005 then null else round(p_cap, 2) end,
           reason = case when p_cap is null or abs(p_cap - v_def) < 0.005 then '' else coalesce(nullif(trim(p_reason), ''), 'Mở lại xe') end,
           updated_by = me.user_id, updated_at = now()
     where truck_code = p_code;
    v_txt := 'Kho ' || v_wh || ' ngày ' || app.dm(v_day) || ': mở lại xe ' || app.short_code(p_code) || ', tải trọng ' || app.fmt(coalesce(p_cap, v_def)) || ' MT';
  end if;
  perform app.audit('fleet', v_txt);
  perform app.notify(array_remove(app.role_users(array['cs','sales']) || app.logistics_of(v_wh), me.user_id), 'Capacity', v_txt,
                     jsonb_build_object('day', v_day, 'wh', v_wh));
  return app.day_metrics(v_wh, v_day);
end $$;

-- Hồ sơ cá nhân: mức nhận email và email nhận riêng (BR-49)
create or replace function public.set_email_prefs(p_level text, p_alt text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if app.impersonating() then raise exception 'Đang Login as người dùng khác: không sửa hồ sơ của họ.'; end if;
  if p_level not in ('all','urgent','none') then raise exception 'Mức nhận email không hợp lệ.'; end if;
  if nullif(trim(p_alt), '') is not null and trim(p_alt) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email nhận riêng không hợp lệ.'; end if;
  update app.profiles set email_level = p_level, alt_email = nullif(lower(trim(p_alt)), '') where user_id = app.real_uid() and active;
end $$;


-- v3.0: CS gửi các nháp (Lưu tạm) cho Logistics → Chờ xếp xe (lúc này mới trừ năng lực giao)
create or replace function public.send_to_logistics(p_ids text[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers; v_id text; v_avail numeric; v_t numeric; res jsonb := '[]'; v_err text;
begin
  me := app.require_perm('booking.create');
  foreach v_id in array coalesce(p_ids, '{}') loop
    begin
      select * into b from app.bookings where id = v_id for update;
      if not found or b.status <> 'draft' then raise exception 'Không phải nháp.'; end if;
      perform app.check_scope(me, b.customer_id);
      if b.day < app.today() then raise exception 'Ngày bốc % đã qua: sửa ngày rồi gửi.', app.dm(b.day); end if;
      if not exists (select 1 from app.warehouses w where w.code = b.warehouse_code and w.active) then raise exception 'Kho % đã ngừng dùng: đổi kho trước.', b.warehouse_code; end if;
      if not exists (select 1 from app.daily_fleet f where f.warehouse_code = b.warehouse_code and f.day = b.day) then
        raise exception 'Ngày % chưa khai báo xe.', app.dm(b.day);
      end if;
      v_t := app.bk_total(b.id);
      if v_t <= 0 then raise exception 'Số tấn phải lớn hơn 0.'; end if;
      perform app.lock_day(b.warehouse_code, b.day);
      v_avail := (app.day_metrics(b.warehouse_code, b.day, b.id)->>'avail')::numeric;
      if v_t > v_avail + 0.001 then raise exception 'Vượt sức chứa: còn % MT, cần % MT.', app.fmt(v_avail), app.fmt(v_t); end if;
      select * into c from app.customers where id = b.customer_id;
      update app.bookings set status = 'hold', held_at = now(), original_day = coalesce(original_day, day), escalated_at = null, updated_at = now() where id = b.id;
      perform app.status_change(b.id, 'draft', 'hold', null, 'Gửi Logistics');
      perform app.audit(b.id, 'Gửi Logistics: ' || app.fmt(v_t) || ' MT ngày ' || app.dm(b.day));
      perform app.refresh_urgent(b.id);
      perform app.notify(app.logistics_of(b.warehouse_code) || c.sales_user_id,
        case when (select urgent from app.bookings where id = b.id) then 'Đơn khẩn' else 'Giữ chỗ' end,
        case when app.is_holiday(b.warehouse_code, b.day) then '⚠ GIAO NGÀY NGHỈ (' || app.dm(b.day) || ') · ' else '' end ||
        b.id || ' · ' || c.name || ' giữ chỗ ' || app.fmt(v_t) || ' MT ngày ' || app.dm(b.day), jsonb_build_object('bk', b.id));
      res := res || jsonb_build_object('id', v_id, 'ok', true);
    exception when others then
      get stacked diagnostics v_err = message_text;
      res := res || jsonb_build_object('id', v_id, 'ok', false, 'error', v_err);
    end;
  end loop;
  return res;
end $$;

-- v3.0: cấu hình kho. Mã kho chỉ đặt khi thêm mới; đơn của kho ngừng dùng được đổi sang kho khác.
create or replace function public.save_warehouse(p jsonb) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_code text := upper(trim(coalesce(p->>'code', ''))); w app.warehouses;
begin
  me := app.require_perm('config.warehouses');
  if v_code !~ '^[A-Z0-9]{2,6}$' then raise exception 'Mã kho 2–6 ký tự chữ / số (ví dụ JM2).'; end if;
  if coalesce(trim(p->>'name'), '') = '' then raise exception 'Nhập tên kho.'; end if;
  select * into w from app.warehouses where code = v_code;
  if not found then
    if not coalesce((p->>'new')::boolean, false) then raise exception 'Không tìm thấy kho %.', v_code; end if;
    insert into app.warehouses (code, name, full_name, erp_code, active)
    values (v_code, trim(p->>'name'), coalesce(nullif(trim(p->>'full'), ''), 'Kho ' || trim(p->>'name')), coalesce(nullif(trim(p->>'erp'), ''), v_code), true);
    perform app.audit('warehouse', 'Thêm kho ' || v_code || ' – ' || trim(p->>'name'));
  else
    if coalesce((p->>'new')::boolean, false) then raise exception 'Mã kho % đã có.', v_code; end if;
    update app.warehouses set name = trim(p->>'name'), full_name = coalesce(nullif(trim(p->>'full'), ''), full_name),
           erp_code = coalesce(nullif(trim(p->>'erp'), ''), erp_code), active = coalesce((p->>'active')::boolean, active)
     where code = v_code;
    perform app.audit('warehouse', 'Sửa kho ' || v_code || ': ' || p::text);
  end if;
  return v_code;
end $$;

create or replace function public.change_booking_wh(p_id text, p_wh text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings;
begin
  me := app.require_perm('booking.edit');
  select * into b from app.bookings where id = p_id for update;
  if not found then raise exception 'Không tìm thấy booking.'; end if;
  perform app.check_scope(me, b.customer_id);
  if exists (select 1 from app.warehouses where code = b.warehouse_code and active) then raise exception 'Kho của booking vẫn đang dùng: sửa booking để đổi kho.'; end if;
  if not exists (select 1 from app.warehouses where code = p_wh and active) then raise exception 'Chọn kho đang dùng.'; end if;
  if b.status in ('loaded','transit','delivered','cancelled') then raise exception 'Booking đã bốc hàng hoặc đã đóng.'; end if;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set warehouse_code = p_wh, region_id = null, status = 'draft', updated_at = now() where id = p_id;
  if b.status <> 'draft' then perform app.status_change(p_id, b.status, 'draft', null, 'Đổi kho ' || b.warehouse_code || ' → ' || p_wh); end if;
  perform app.audit(p_id, 'Đổi kho ' || b.warehouse_code || ' → ' || p_wh || ' (kho cũ ngừng dùng); chuyển về Lưu tạm, CS gửi lại Logistics');
end $$;
-- ---------------------------------------------------------------------
-- v3.1: tốc độ + dữ liệu thật
--  F1 danh mục khách gửi lại chỉ khi đổi (cat_seq); F3 phiên bản dữ liệu (data_seq) để trình duyệt hỏi "có gì mới";
--  F2 phát hiện người khác vừa sửa đơn (rev + header x-bk-rev); F6 nhập khách hàng / địa chỉ từ file; F7 segment Export
-- ---------------------------------------------------------------------
create sequence if not exists app.data_seq;
create sequence if not exists app.cat_seq;

create or replace function app.bump_data() returns trigger language plpgsql set search_path = '' as $$
begin perform nextval('app.data_seq'); return null; end $$;
create or replace function app.bump_cat() returns trigger language plpgsql set search_path = '' as $$
begin perform nextval('app.cat_seq'); return null; end $$;

do $$
declare t text;
begin
  foreach t in array array['bookings','order_requests','talk_threads','talk_msgs','booking_lines','allocations','daily_fleet','truck_days','delivery_items','profiles',
                           'regions','region_neighbors','warehouses','settings','holidays','reason_codes'] loop
    if to_regclass('app.' || t) is not null then
      execute format('drop trigger if exists zz_bump_data on app.%I', t);
      execute format('create trigger zz_bump_data after insert or update or delete on app.%I for each row execute function app.bump_data()', t);
    end if;
  end loop;
  foreach t in array array['customers','customer_addresses','address_regions'] loop
    execute format('drop trigger if exists zz_bump_cat on app.%I', t);
    execute format('create trigger zz_bump_cat after insert or update or delete on app.%I for each row execute function app.bump_cat()', t);
  end loop;
end $$;

-- d = dữ liệu chung, c = danh mục khách, n = thông báo mới nhất của người dùng
-- v3.30: mở Trao đổi (ghi "đã đọc") không còn làm mọi người tải lại dữ liệu
drop trigger if exists zz_bump_data on app.talk_reads;
-- v3.30: tải phần thay đổi. s = cấu trúc (xe, cấu hình, người dùng, khu vực…) → tải lại toàn bộ; m = yêu cầu + Trao đổi;
-- đơn: cột chg tăng mỗi khi đơn / dòng hàng / phần xe / cuộn / nhật ký đổi; đơn bị xóa ghi vào deleted_bk
create sequence if not exists app.struct_seq;
create sequence if not exists app.misc_seq;
create or replace function app.bump_struct() returns trigger language plpgsql set search_path = '' as $$
begin perform nextval('app.struct_seq'); return null; end $$;
create or replace function app.bump_misc() returns trigger language plpgsql set search_path = '' as $$
begin perform nextval('app.misc_seq'); return null; end $$;
do $$
declare t text;
begin
  foreach t in array array['daily_fleet','truck_days','profiles','regions','region_neighbors','warehouses','settings','holidays','reason_codes',
                           'products','colors','thicknesses','widths','permissions','role_permissions','impersonations','cust_views'] loop
    if to_regclass('app.' || t) is not null then
      execute format('drop trigger if exists zz_bump_s on app.%I', t);
      execute format('create trigger zz_bump_s after insert or update or delete on app.%I for each statement execute function app.bump_struct()', t);
    end if;
  end loop;
  foreach t in array array['order_requests','talk_threads','talk_msgs'] loop
    execute format('drop trigger if exists zz_bump_m on app.%I', t);
    execute format('create trigger zz_bump_m after insert or update or delete on app.%I for each statement execute function app.bump_misc()', t);
  end loop;
end $$;
alter table app.bookings add column if not exists chg bigint not null default 0;
create index if not exists bookings_chg on app.bookings (chg);
create table if not exists app.deleted_bk (id text not null, seq bigint not null, at timestamptz not null default now());
create index if not exists deleted_bk_seq on app.deleted_bk (seq);
create or replace function app.bk_chg() returns trigger language plpgsql set search_path = '' as $$
begin new.chg := nextval('app.data_seq'); return new; end $$;
drop trigger if exists bk_chg on app.bookings;
create trigger bk_chg before insert or update on app.bookings for each row execute function app.bk_chg();
create or replace function app.bk_child_chg() returns trigger language plpgsql set search_path = '' as $$
declare v_id text;
begin
  if tg_table_name = 'audit_log' then v_id := new.entity_id;
  elsif tg_op = 'DELETE' then v_id := old.booking_id;
  else v_id := new.booking_id; end if;
  if v_id is not null then update app.bookings set chg = 0 where id = v_id; end if;   -- bk_chg gán số mới
  return null;
end $$;
do $$
declare t text;
begin
  foreach t in array array['booking_lines','allocations','delivery_items'] loop
    execute format('drop trigger if exists zz_bk_chg on app.%I', t);
    execute format('create trigger zz_bk_chg after insert or update or delete on app.%I for each row execute function app.bk_child_chg()', t);
  end loop;
end $$;
drop trigger if exists zz_bk_chg on app.audit_log;
create trigger zz_bk_chg after insert on app.audit_log for each row when (new.entity_id like 'BK-%') execute function app.bk_child_chg();
create or replace function app.bk_deleted() returns trigger language plpgsql set search_path = '' as $$
begin insert into app.deleted_bk (id, seq) values (old.id, nextval('app.data_seq')); return null; end $$;
drop trigger if exists zz_bk_del on app.bookings;
create trigger zz_bk_del after delete on app.bookings for each row execute function app.bk_deleted();

create or replace function app.ver_of(p_uid uuid) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('d', (select last_value from app.data_seq), 'c', (select last_value from app.cat_seq),
                            's', (select case when is_called then last_value else 0 end from app.struct_seq), 'm', (select case when is_called then last_value else 0 end from app.misc_seq),
                            'n', coalesce((select max(id) from app.notifications where user_id = p_uid), 0))
$$;
create or replace function public.get_ver() returns jsonb
language sql stable security definer set search_path = '' as $$
  select app.ver_of(p.user_id) from app.profiles p where p.user_id = app.uid() and p.active
$$;

-- F2: mỗi lần đơn đổi nội dung thì rev + 1 (một lần mỗi giao dịch). Trình duyệt gửi header x-bk-rev = "mã:rev" của đơn đang mở;
-- nếu người khác đã sửa sau lúc đó thì báo lỗi, không ghi đè.
alter table app.bookings add column if not exists rev        int not null default 0;
alter table app.bookings add column if not exists rev_tx     bigint;
alter table app.bookings add column if not exists updated_by uuid;
create or replace function app.bk_rev() returns trigger language plpgsql set search_path = '' as $$
declare h text; v_who text;
  skip constant text[] := array['rev','rev_tx','updated_at','updated_by','escalated_at','urgent','ship_remind_on','chg'];
begin
  if (to_jsonb(new) - skip) = (to_jsonb(old) - skip) then return new; end if;
  if old.rev_tx is distinct from txid_current() then
    begin h := nullif(current_setting('request.headers', true), '')::json ->> 'x-bk-rev'; exception when others then h := null; end;
    if h is not null and split_part(h, ':', 1) = new.id and split_part(h, ':', 2) ~ '^\d+$' and old.rev > split_part(h, ':', 2)::int then
      select full_name into v_who from app.profiles where user_id = old.updated_by;
      raise exception 'Đơn % vừa được % cập nhật lúc %. Đã tải lại bản mới – kiểm tra rồi thao tác lại.',
        new.id, coalesce(v_who, 'hệ thống'), to_char(old.updated_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM');
    end if;
    new.rev := old.rev + 1;
  end if;
  new.rev_tx := txid_current(); new.updated_by := app.uid(); new.updated_at := now();
  return new;
end $$;
drop trigger if exists bk_rev on app.bookings;
create trigger bk_rev before update on app.bookings for each row execute function app.bk_rev();

-- F7: segment Export
alter table app.customers drop constraint if exists customers_segment_check;
alter table app.customers add constraint customers_segment_check check (segment in ('DD','DA','EX'));
alter table app.profiles drop constraint if exists profiles_segment_check;
alter table app.profiles add constraint profiles_segment_check check (segment in ('DD','DA','EX'));
alter table app.profiles drop constraint if exists profiles_stat_scope_check;
alter table app.profiles add constraint profiles_stat_scope_check check (stat_scope in ('own','DD','DA','EX','all','team'));

-- F6: nhập khách hàng + địa chỉ giao từ file (trình duyệt đọc Excel/CSV, chuẩn hóa segment / tỉnh rồi gửi lên).
-- p_custs: [{row, code, name, segment (DD/DA/EX/''), sales_email, cs_email, default_wh, erp, active}]
-- p_addrs: [{row, code (Mã KH), ext (Mã địa chỉ), label, province, active}]
-- p_apply = false: chỉ kiểm tra, trả số dòng mới / cập nhật / lỗi; true: ghi. Khách không có trong file giữ nguyên.
alter table app.customer_addresses add column if not exists ext_code text not null default '';
create unique index if not exists customer_addresses_ext on app.customer_addresses (customer_id, ext_code) where ext_code <> '';

create or replace function public.import_customers(p_custs jsonb, p_addrs jsonb, p_apply boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me app.profiles; r jsonb; c app.customers; a app.customer_addresses;
  v_code text; v_name text; v_seg text; v_sales uuid; v_cs uuid; v_wh text; v_act boolean; v_erp text; v_sp app.profiles; v_area text; v_aread text;
  v_dups text[]; v_dupseen text[] := '{}'; v_cid uuid; v_aid uuid; v_label text; v_prov text; v_ext text; w text; v_reg text;
  n_new int := 0; n_upd int := 0; n_same int := 0; a_new int := 0; a_upd int := 0; a_same int := 0; a_skip int := 0;
  errs jsonb := '[]'; warns jsonb := '[]'; ne int := 0; nw int := 0;
begin
  me := app.require_perm('customers.manage');
  select coalesce(array_agg(k), '{}') into v_dups
    from (select trim(x->>'code') k from jsonb_array_elements(coalesce(p_custs, '[]')) x group by 1 having count(*) > 1) t;

  for r in select * from jsonb_array_elements(coalesce(p_custs, '[]')) loop
    v_code := trim(coalesce(r->>'code', '')); v_name := trim(coalesce(r->>'name', ''));
    if v_code = '' then
      ne := ne + 1; if ne <= 300 then errs := errs || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', 'Thiếu Mã KH'); end if; continue;
    end if;
    if v_code = any(v_dups) then
      if v_code = any(v_dupseen) then
        ne := ne + 1; if ne <= 300 then errs := errs || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', 'Mã KH ' || v_code || ' trùng trong file, bỏ dòng này'); end if; continue;
      end if;
      v_dupseen := v_dupseen || v_code;
    end if;
    c := null; select * into c from app.customers where code = v_code;
    if v_name = '' then v_name := c.name; end if;
    if v_name is null then
      ne := ne + 1; if ne <= 300 then errs := errs || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', 'Thiếu tên khách hàng ' || v_code); end if; continue;
    end if;
    v_seg := nullif(r->>'segment', '');
    if v_seg is not null and v_seg not in ('DD','DA','EX') then v_seg := null; end if;
    if v_seg is null then
      v_seg := coalesce(c.segment, 'DD');
      if c.id is null then nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', v_code || ': chưa có segment, tạm để Dân dụng'); end if; end if;
    end if;
    v_sales := c.sales_user_id; v_cs := c.cs_user_id; v_wh := c.default_wh;
    if coalesce(trim(r->>'sales_email'), '') <> '' then
      v_sp := null; select * into v_sp from app.profiles where lower(email) = lower(trim(r->>'sales_email')) and role = 'sales' and active;
      if v_sp.user_id is null then
        nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', v_code || ': chưa có Sales ' || trim(r->>'sales_email') || ' – chưa gán'); end if;
      elsif v_sp.segment is distinct from v_seg then
        nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', v_code || ': Sales ' || v_sp.full_name || ' khác segment – chưa gán'); end if;
      else v_sales := v_sp.user_id; end if;
    end if;
    if v_sales is not null and (select segment from app.profiles where user_id = v_sales) is distinct from v_seg then
      v_sales := null;
      nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', v_code || ': đổi segment, Sales cũ khác segment – bỏ gán'); end if;
    end if;
    if coalesce(trim(r->>'cs_email'), '') <> '' then
      v_sp := null; select * into v_sp from app.profiles where lower(email) = lower(trim(r->>'cs_email')) and role = 'cs' and active;
      if v_sp.user_id is null then
        nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', v_code || ': chưa có CS ' || trim(r->>'cs_email') || ' – giữ như cũ'); end if;
      else v_cs := v_sp.user_id; end if;
    end if;
    if coalesce(trim(r->>'default_wh'), '') <> '' then
      if exists (select 1 from app.warehouses where code = upper(trim(r->>'default_wh'))) then v_wh := upper(trim(r->>'default_wh'));
      else nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'KH', 'row', r->'row', 'msg', v_code || ': kho ' || trim(r->>'default_wh') || ' không có'); end if; end if;
    end if;
    v_act := coalesce((r->>'active')::boolean, true);
    v_area := coalesce(nullif(trim(r->>'area'), ''), c.area, ''); v_aread := coalesce(nullif(trim(r->>'area_detail'), ''), c.area_detail, '');
    v_erp := coalesce(nullif(trim(r->>'erp'), ''), c.erp_code, '');
    if c.id is null then
      n_new := n_new + 1;
      if p_apply then
        insert into app.customers (code, name, segment, sales_user_id, cs_user_id, default_wh, erp_code, active, area, area_detail)
        values (v_code, v_name, v_seg, v_sales, v_cs, v_wh, v_erp, v_act, v_area, v_aread);
      end if;
    elsif (c.name, c.segment, c.sales_user_id, c.cs_user_id, c.default_wh, c.erp_code, c.active, c.area, c.area_detail)
          is distinct from (v_name, v_seg, v_sales, v_cs, v_wh, v_erp, v_act, v_area, v_aread) then
      n_upd := n_upd + 1;
      if p_apply then
        update app.customers set name = v_name, segment = v_seg, sales_user_id = v_sales, cs_user_id = v_cs, default_wh = v_wh,
               erp_code = v_erp, active = v_act, area = v_area, area_detail = v_aread where id = c.id;
      end if;
    else n_same := n_same + 1; end if;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p_addrs, '[]')) loop
    v_code := trim(coalesce(r->>'code', '')); v_ext := trim(coalesce(r->>'ext', ''));
    v_label := trim(coalesce(r->>'label', '')); v_prov := trim(coalesce(r->>'province', ''));
    if not coalesce((r->>'active')::boolean, true) then a_skip := a_skip + 1; continue; end if;
    if v_code = '' or v_ext = '' or v_label = '' then
      ne := ne + 1; if ne <= 300 then errs := errs || jsonb_build_object('sheet', 'DC', 'row', r->'row', 'msg', 'Thiếu Mã KH, Mã địa chỉ hoặc địa chỉ'); end if; continue;
    end if;
    select id into v_cid from app.customers where code = v_code;
    if v_cid is null and not exists (select 1 from jsonb_array_elements(coalesce(p_custs, '[]')) x where trim(x->>'code') = v_code) then
      ne := ne + 1; if ne <= 300 then errs := errs || jsonb_build_object('sheet', 'DC', 'row', r->'row', 'msg', 'Không có khách ' || v_code); end if; continue;
    end if;
    if v_prov = '' then
      nw := nw + 1; if nw <= 300 then warns := warns || jsonb_build_object('sheet', 'DC', 'row', r->'row', 'msg', v_code || '/' || v_ext || ': chưa nhận ra tỉnh – nhập sau trong hồ sơ khách'); end if;
    end if;
    a := null;
    if v_cid is not null then select * into a from app.customer_addresses where customer_id = v_cid and ext_code = v_ext; end if;
    if a.id is null then
      a_new := a_new + 1;
      if p_apply then
        insert into app.customer_addresses (customer_id, label, ward, province, is_default, ext_code)
        values (v_cid, v_label, '', v_prov, not exists (select 1 from app.customer_addresses where customer_id = v_cid), v_ext)
        returning id into v_aid;
      end if;
    elsif (a.label, a.province) is distinct from (v_label, coalesce(nullif(v_prov, ''), a.province)) then
      a_upd := a_upd + 1; v_aid := a.id;
      if p_apply then update app.customer_addresses set label = v_label, province = coalesce(nullif(v_prov, ''), province) where id = a.id; end if;
    else a_same := a_same + 1; v_aid := null; end if;
    -- khu vực giao: kho nào có đúng một khu vực của tỉnh này thì gán luôn
    if p_apply and v_aid is not null and v_prov <> '' then
      for w in select code from app.warehouses where active loop
        select min(id) into v_reg from app.regions where warehouse_code = w and active and new_province = v_prov having count(*) = 1;
        if v_reg is not null then
          insert into app.address_regions (address_id, warehouse_code, region_id) values (v_aid, w, v_reg) on conflict do nothing;
        end if;
      end loop;
    end if;
  end loop;

  if p_apply then
    perform app.audit('import', format('Nhập khách hàng từ file: %s mới, %s cập nhật; địa chỉ %s mới, %s cập nhật', n_new, n_upd, a_new, a_upd));
  end if;
  return jsonb_build_object('custNew', n_new, 'custUpd', n_upd, 'custSame', n_same, 'addrNew', a_new, 'addrUpd', a_upd, 'addrSame', a_same,
                            'addrSkip', a_skip, 'errCount', ne, 'warnCount', nw, 'errors', errs, 'warnings', warns, 'applied', p_apply);
end $$;

-- ---------------------------------------------------------------------
-- v3.3: xe container (CN) đổi thành xe thùng (XT): mã xe ...-CN-01 -> ...-XT-01 cho dữ liệu cũ
-- ---------------------------------------------------------------------
update app.truck_days t set truck_code = replace(t.truck_code, '-CN-', '-XT-')
 where t.truck_code like '%-CN-%' and not exists (select 1 from app.truck_days x where x.truck_code = replace(t.truck_code, '-CN-', '-XT-'));
update app.allocations set truck_code = replace(truck_code, '-CN-', '-XT-') where truck_code like '%-CN-%';
update app.merge_suggestion_log set truck_code = replace(truck_code, '-CN-', '-XT-') where truck_code like '%-CN-%';

-- ---------------------------------------------------------------------
-- v3.5: Bảng thống kê mới (như bản Google Sheets) – Area của khách, mục tiêu tấn theo tháng × segment, dữ liệu dashboard gọn
-- ---------------------------------------------------------------------
alter table app.customers add column if not exists area        text not null default '';
alter table app.customers add column if not exists area_detail text not null default '';

create table if not exists app.targets (
  month      text not null check (month ~ '^\d{4}-\d{2}$'),
  segment    text not null check (segment in ('DD','DA','EX')),
  tons       numeric(12,2) not null default 0 check (tons >= 0),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (month, segment)
);
alter table app.targets enable row level security;

-- Lưu mục tiêu: p = [{month:'2026-10', seg:'DD', tons:4000}, ...]; tons trống/0 = xóa
create or replace function public.save_targets(p jsonb) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; r jsonb; n int := 0;
begin
  me := app.require_perm('config.targets');
  for r in select * from jsonb_array_elements(coalesce(p, '[]')) loop
    if coalesce(r->>'month', '') !~ '^\d{4}-\d{2}$' or coalesce(r->>'seg', '') not in ('DD','DA','EX') then raise exception 'Dòng mục tiêu không hợp lệ.'; end if;
    if coalesce(nullif(r->>'tons', '')::numeric, 0) <= 0 then
      delete from app.targets where month = r->>'month' and segment = r->>'seg';
    else
      insert into app.targets (month, segment, tons, updated_by) values (r->>'month', r->>'seg', (r->>'tons')::numeric, me.user_id)
      on conflict (month, segment) do update set tons = excluded.tons, updated_by = me.user_id, updated_at = now();
    end if;
    n := n + 1;
  end loop;
  perform app.audit('targets', 'Cập nhật mục tiêu tấn: ' || n || ' ô');
  return n;
end $$;

-- Dữ liệu cho Bảng thống kê: một lần gọi theo kỳ; lọc kho / segment làm ở trình duyệt.
-- b = [id, ngày bốc, kho, id khách, trạng thái, tấn, khẩn, hủy cận ngày, giữ chỗ (phút), xác nhận (phút), mã lý do, tạo lúc (phút), CS, ngày đề xuất]
create or replace function public.dash_data(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles; v_scope text; v_len int; v_pfrom date; v_today date := app.today(); v_y text;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found or me.role = 'customer' or not exists (select 1 from unnest(app.my_perms(me.role)) x where x like 'dash.%') then
    raise exception 'Tài khoản chưa được cấp quyền xem thống kê.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then raise exception 'Khoảng ngày không hợp lệ (tối đa 400 ngày).'; end if;
  v_scope := app.stat_scope(me); v_len := p_to - p_from + 1; v_pfrom := p_from - v_len; v_y := to_char(p_to, 'YYYY');
  return jsonb_build_object('from', p_from, 'to', p_to, 'pfrom', v_pfrom, 'today', v_today, 'scope', v_scope,
    'b', (select coalesce(jsonb_agg(jsonb_build_array(b.id, b.day, b.warehouse_code, b.customer_id, b.status, app.bk_total(b.id),
                 case when b.urgent then 1 else 0 end, case when b.late_cancel then 1 else 0 end,
                 floor(extract(epoch from b.held_at) / 60), floor(extract(epoch from b.confirmed_at) / 60), b.reason_code,
                 floor(extract(epoch from b.created_at) / 60), b.cs_user_id, b.proposed_day)), '[]')
            from app.bookings b join app.customers c on c.id = b.customer_id
           where (b.day between v_pfrom and greatest(p_to, v_today + 14) or b.status in ('hold','resched','draft'))
             and (v_scope = 'all' or (v_scope in ('DD','DA','EX') and c.segment = v_scope) or (v_scope = 'own' and c.sales_user_id = me.user_id) or (v_scope = 'team' and app.in_team(me.user_id, c.sales_user_id)))),
    'c', (select coalesce(jsonb_object_agg(c.id, jsonb_build_array(c.code, c.name, c.segment, c.sales_user_id, c.area, c.area_detail)), '{}')
            from app.customers c
           where exists (select 1 from app.bookings b where b.customer_id = c.id and (b.day >= v_pfrom or b.status in ('hold','resched','draft')))
             and (v_scope = 'all' or (v_scope in ('DD','DA','EX') and c.segment = v_scope) or (v_scope = 'own' and c.sales_user_id = me.user_id) or (v_scope = 'team' and app.in_team(me.user_id, c.sales_user_id)))),
    'u', (select coalesce(jsonb_object_agg(p.user_id, p.full_name), '{}') from app.profiles p where p.role in ('sales','cs','logistics','admin')),
    'cap', (select coalesce(jsonb_agg(jsonb_build_array(w.code, d::date, (m->>'cap')::numeric, (m->>'loaded')::numeric, (m->>'held')::numeric,
                   case when (m->>'off')::boolean then 1 else 0 end, case when (m->>'declared')::boolean then 1 else 0 end)), '[]')
              from app.warehouses w
              cross join (select generate_series(p_from, p_to, interval '1 day') d union select generate_series(v_today, v_today + 13, interval '1 day')) dd
              cross join lateral app.day_metrics(w.code, d::date) m where w.active),
    'tgt', (select coalesce(jsonb_agg(jsonb_build_array(t.month, t.segment, t.tons)), '[]') from app.targets t where left(t.month, 4) in (v_y, to_char(p_from, 'YYYY'))),
    'yr', (select coalesce(jsonb_agg(jsonb_build_array(x.m, x.seg, x.booked, x.ok)), '[]') from (
             select to_char(b.day, 'YYYY-MM') m, c.segment seg,
                    sum(app.bk_total(b.id)) filter (where b.status in ('ok','loaded','transit','delivered','failed','hold','resched')) booked,
                    sum(app.bk_total(b.id)) filter (where b.status in ('ok','loaded','transit','delivered','failed')) ok
               from app.bookings b join app.customers c on c.id = b.customer_id
              where to_char(b.day, 'YYYY') = v_y
                and (v_scope = 'all' or (v_scope in ('DD','DA','EX') and c.segment = v_scope) or (v_scope = 'own' and c.sales_user_id = me.user_id) or (v_scope = 'team' and app.in_team(me.user_id, c.sales_user_id)))
              group by 1, 2) x),
    'r', (select coalesce(jsonb_object_agg(code, name), '{}') from (select distinct on (code) code, name from app.reason_codes order by code, kind) rc),
    'canTgt', app.role_has(me.role, 'config.targets'));
end $$;

-- ---------------------------------------------------------------------
-- v3.7: phím tắt – mỗi người tự đổi (profiles.shortcuts), Admin đặt mặc định công ty (settings.shortcuts) và reset
-- ---------------------------------------------------------------------
alter table app.profiles add column if not exists shortcuts jsonb not null default '{}';

-- Người dùng lưu phím tắt của mình: p = {"actionId": "Ctrl+Enter", "x": ""(tắt)}; {} = dùng mặc định công ty
create or replace function public.save_my_shortcuts(p jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if jsonb_typeof(coalesce(p, '{}')) <> 'object' or length(p::text) > 8000 then raise exception 'Dữ liệu phím tắt không hợp lệ.'; end if;
  update app.profiles set shortcuts = coalesce(p, '{}') where user_id = app.real_uid() and active;
  if not found then raise exception 'Tài khoản chưa được cấp quyền.' using errcode = '42501'; end if;
end $$;

-- Admin: mặc định công ty p = {enabled, single, map:{...}}
create or replace function public.admin_save_shortcuts(p jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('config.shortcuts');
  if jsonb_typeof(coalesce(p, '{}')) <> 'object' or length(p::text) > 8000 then raise exception 'Dữ liệu phím tắt không hợp lệ.'; end if;
  insert into app.settings (key, value) values ('shortcuts', p) on conflict (key) do update set value = excluded.value;
  perform app.audit('shortcuts', 'Cập nhật phím tắt mặc định của công ty');
end $$;

-- Admin: đưa phím tắt của một người (p_user) hoặc mọi người (null) về mặc định công ty
create or replace function public.admin_reset_shortcuts(p_user uuid default null) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; n int;
begin
  me := app.require_perm('config.shortcuts');
  update app.profiles set shortcuts = '{}' where (p_user is null or user_id = p_user) and shortcuts <> '{}';
  get diagnostics n = row_count;
  perform app.audit('shortcuts', 'Reset phím tắt về mặc định công ty: ' || coalesce((select full_name from app.profiles where user_id = p_user), 'tất cả người dùng') || ' (' || n || ')');
  return n;
end $$;

-- ---------------------------------------------------------------------
-- v3.8: Xem như khách hàng (chỉ xem, 60 phút, ghi nhật ký)
-- ---------------------------------------------------------------------
create or replace function public.cust_view_start(p_customer uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare a app.profiles; c app.customers; v_min int := 60;
begin
  select * into a from app.profiles where user_id = app.real_uid() and active;
  if not found or not app.role_has(a.role, 'users.impersonate') then
    raise exception 'Vai trò của bạn chưa được cấp quyền "Login as".' using errcode = '42501';
  end if;
  select * into c from app.customers where id = p_customer;
  if not found then raise exception 'Không tìm thấy khách hàng.'; end if;
  delete from app.impersonations where admin_id = a.user_id;
  insert into app.cust_views (admin_id, customer_id, expires_at) values (a.user_id, c.id, now() + make_interval(mins => v_min))
  on conflict (admin_id) do update set customer_id = excluded.customer_id, started_at = now(), expires_at = excluded.expires_at;
  insert into app.audit_log (entity_id, detail, actor) values ('login-as', a.full_name || ' bắt đầu Xem như khách hàng ' || c.name || ' (' || c.code || ')', a.user_id);
  return jsonb_build_object('name', c.name, 'minutes', v_min);
end $$;

create or replace function public.cust_view_stop() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v app.cust_views; v_a text; v_c text;
begin
  delete from app.cust_views where admin_id = app.real_uid() returning * into v;
  if v.admin_id is not null then
    select full_name into v_a from app.profiles where user_id = v.admin_id;
    select name into v_c from app.customers where id = v.customer_id;
    insert into app.audit_log (entity_id, detail, actor) values ('login-as', coalesce(v_a, 'Admin') || ' kết thúc Xem như khách hàng ' || coalesce(v_c, '?'), v.admin_id);
  end if;
end $$;


-- v3.13: Yêu cầu đặt hàng ----------------------------------------------------
-- số ngày vận chuyển kho → khách (Cấu hình → Chung), mặc định 1
create or replace function app.transit_days(p_wh text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((app.setting('transitDays') ->> p_wh)::int, 1)
$$;

create or replace function app.req_json(r app.order_requests) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'customerId', r.customer_id, 'wh', r.wh, 'date', r.day, 'deliver', coalesce(r.deliver_on, r.day), 'tons', r.tons, 'body', r.body,
    'status', r.status, 'by', r.created_by, 'byName', app.uname(r.created_by),
    'byCust', (select role = 'customer' from app.profiles where user_id = r.created_by),
    'at', extract(epoch from r.created_at), 'handledBy', app.uname(r.handled_by),
    'handledAt', extract(epoch from r.handled_at), 'reply', r.reply, 'bookingId', r.booking_id)
$$;

create or replace function public.req_create(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; v_cust uuid; v_day date; v_dl date := coalesce(nullif(p->>'deliver', ''), nullif(p->>'day', ''))::date; v_wh text := p->>'wh'; v_t numeric := nullif(p->>'tons', '')::numeric;
        v_body text := trim(coalesce(p->>'body', '')); r app.order_requests; c app.customers; v_txt text;
begin
  select * into m from app.profiles where user_id = app.uid() and active;
  if not found then raise exception 'Tài khoản chưa được cấp quyền.' using errcode = '42501'; end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng (chỉ xem). Bấm Thoát trên thanh màu cam trước khi thao tác.' using errcode = '42501';
  end if;
  if m.role = 'customer' then v_cust := m.customer_id;
  else
    perform app.require_perm('req.create');
    v_cust := (p->>'customerId')::uuid;
    perform app.check_scope(m, v_cust);
  end if;
  select * into c from app.customers where id = v_cust;
  if not found then raise exception 'Chọn khách hàng.'; end if;
  if not exists (select 1 from app.warehouses where code = v_wh and active) then raise exception 'Chọn kho.'; end if;
  if v_dl is null or v_dl < app.today() then raise exception 'Chọn ngày giao từ hôm nay trở đi.'; end if;
  v_day := greatest(app.today(), v_dl - app.transit_days(v_wh));
  if length(v_body) < 3 then raise exception 'Ghi nội dung yêu cầu (sản phẩm, màu, độ dày, số MT…).'; end if;
  if length(v_body) > 2000 then raise exception 'Nội dung quá dài (tối đa 2000 ký tự).'; end if;
  if v_t is not null and (v_t <= 0 or v_t > 5000) then raise exception 'Số MT không hợp lệ.'; end if;
  insert into app.order_requests (customer_id, wh, day, deliver_on, tons, body, created_by) values (v_cust, v_wh, v_day, v_dl, v_t, v_body, m.user_id) returning * into r;
  v_txt := 'Yêu cầu đặt hàng · ' || c.name || ' · ' || v_wh || ' giao ' || app.dm(v_dl) || ' (bốc dự kiến ' || app.dm(v_day) || ')' || coalesce(' · ' || trim(to_char(v_t, 'FM999G990D00')) || ' MT', '') || ': ' || left(v_body, 120);
  -- CS phụ trách (nghỉ → người nhận thay; không có → mọi CS) + Sales phụ trách; không gửi lại cho người gửi
  perform app.notify(array(select x from unnest(
      case when c.cs_user_id is not null and exists (select 1 from app.profiles where user_id = c.cs_user_id and active and not app.is_away(user_id))
             then array[c.cs_user_id]
           when c.cs_user_id is not null and exists (select 1 from app.profiles where user_id = c.cs_user_id and active and delegate_id is not null)
             then array[(select delegate_id from app.profiles where user_id = c.cs_user_id)]
           else array(select user_id from app.profiles where role = 'cs' and active and not app.is_away(user_id)) end
      || array[c.sales_user_id]) x where x is not null and x <> m.user_id),
    'Yêu cầu', v_txt, jsonb_build_object('req', r.id, 'day', v_day, 'wh', v_wh));
  insert into app.audit_log (entity_id, detail, actor) values ('REQ-' || r.id, m.full_name || ' gửi ' || v_txt, m.user_id);
  return app.req_json(r);
end $$;

-- p_status: done | declined (CS) · cancelled (người gửi hoặc CS)
create or replace function public.req_update(p_id bigint, p_status text, p_reply text default null, p_booking text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; r app.order_requests; c app.customers; v_txt text;
begin
  select * into m from app.profiles where user_id = app.uid() and active;
  if not found then raise exception 'Tài khoản chưa được cấp quyền.' using errcode = '42501'; end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng (chỉ xem). Bấm Thoát trên thanh màu cam trước khi thao tác.' using errcode = '42501';
  end if;
  select * into r from app.order_requests where id = p_id for update;
  if not found then raise exception 'Không tìm thấy yêu cầu.'; end if;
  if r.status <> 'new' then raise exception 'Yêu cầu này đã được xử lý.'; end if;
  if p_status not in ('done','declined','cancelled') then raise exception 'Trạng thái không hợp lệ.'; end if;
  if p_status = 'cancelled' then
    if r.created_by <> m.user_id and not app.role_has(m.role, 'req.handle') then raise exception 'Chỉ người gửi hoặc CS được hủy yêu cầu.' using errcode = '42501'; end if;
  else
    perform app.require_perm('req.handle');
    if p_status = 'declined' and length(trim(coalesce(p_reply, ''))) < 3 then raise exception 'Ghi lý do không nhận để báo lại người gửi.'; end if;
  end if;
  update app.order_requests set status = p_status, handled_by = m.user_id, handled_at = now(), reply = nullif(trim(coalesce(p_reply, '')), ''),
         booking_id = nullif(p_booking, '') where id = p_id returning * into r;
  select * into c from app.customers where id = r.customer_id;
  v_txt := case p_status when 'done' then 'Đã nhận yêu cầu đặt hàng' when 'declined' then 'Không nhận yêu cầu đặt hàng' else 'Đã hủy yêu cầu đặt hàng' end
           || ' · ' || c.name || ' · ' || r.wh || ' giao ' || app.dm(coalesce(r.deliver_on, r.day)) || coalesce(' · booking ' || r.booking_id, '') || coalesce(': ' || r.reply, '');
  if r.created_by <> m.user_id then perform app.notify(array[r.created_by], 'Yêu cầu', v_txt, jsonb_build_object('req', r.id, 'day', r.day, 'wh', r.wh)); end if;
  if p_status <> 'cancelled' then
    perform app.notify(array(select x from unnest(app.customer_users(r.customer_id) || array[c.sales_user_id]) x where x is not null and x <> m.user_id and x <> r.created_by),
                       'Yêu cầu', v_txt, jsonb_build_object('req', r.id, 'day', r.day, 'wh', r.wh));
  end if;
  insert into app.audit_log (entity_id, detail, actor) values ('REQ-' || r.id, m.full_name || ': ' || v_txt, m.user_id);
  return app.req_json(r);
end $$;

-- v3.23: CS đổi ngày bốc dự kiến của yêu cầu (ngày giao giữ nguyên)
create or replace function public.req_set_day(p_id bigint, p_day date) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; r app.order_requests; v_old date;
begin
  m := app.require_perm('req.handle');
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng (chỉ xem).' using errcode = '42501';
  end if;
  select * into r from app.order_requests where id = p_id for update;
  if not found then raise exception 'Không tìm thấy yêu cầu.'; end if;
  if r.status <> 'new' then raise exception 'Yêu cầu này đã được xử lý.'; end if;
  if p_day is null or p_day < app.today() then raise exception 'Chọn ngày bốc từ hôm nay trở đi.'; end if;
  if p_day > coalesce(r.deliver_on, r.day) then raise exception 'Ngày bốc không được sau ngày giao (%).', app.dm(coalesce(r.deliver_on, r.day)); end if;
  v_old := r.day;
  update app.order_requests set day = p_day where id = p_id returning * into r;
  insert into app.audit_log (entity_id, detail, actor) values ('REQ-' || r.id, m.full_name || ' đổi ngày bốc dự kiến ' || app.dm(v_old) || ' → ' || app.dm(p_day), m.user_id);
  return app.req_json(r);
end $$;


-- v3.18: Admin tạo / xóa tài khoản, đặt lại mật khẩu ----------------------------
create or replace function app.hash_pw(p text) returns text
language sql volatile security definer set search_path = extensions, public, pg_temp as $$
  select crypt(p, gen_salt('bf'))
$$;

create or replace function app.require_admin() returns app.profiles
language plpgsql stable security definer set search_path = '' as $$
declare m app.profiles;
begin
  m := app.require_perm('users.manage');
  if m.role <> 'admin' then raise exception 'Chỉ Admin được tạo / xóa tài khoản và đặt lại mật khẩu.' using errcode = '42501'; end if;
  return m;
end $$;

create or replace function app.check_pw(p text) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p is null or length(p) < 8 then raise exception 'Mật khẩu tạm tối thiểu 8 ký tự.'; end if;
  if length(p) > 72 then raise exception 'Mật khẩu tối đa 72 ký tự.'; end if;
end $$;

-- p: email, name, role, segment, phone, customer_id, wh, stat_scope, manager_id, password, welcome (bool), force_change (bool, mặc định true)
create or replace function public.admin_create_user(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_email text := lower(trim(coalesce(p->>'email', ''))); v_id uuid; v_pw text := p->>'password'; v_sent boolean := false;
begin
  me := app.require_admin();
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email không hợp lệ: %', v_email; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Email % đã có tài khoản đăng nhập. Dùng "Gán vai trò" nếu chưa có vai trò.', v_email;
  end if;
  perform app.check_pw(v_pw);
  if coalesce(p->>'role', '') not in ('admin','cs','logistics','sales','customer') then raise exception 'Chọn vai trò.'; end if;
  v_id := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          app.hash_pw(v_pw), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', trim(p->>'name')),
          now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), 'email', null, now(), now());
  perform public.admin_upsert_profile(p || jsonb_build_object('email', v_email));
  update app.profiles set must_change_pw = coalesce((p->>'force_change')::boolean, true) where user_id = v_id;
  if coalesce((p->>'welcome')::boolean, false) and coalesce((app.setting('emailOn') #>> '{}')::boolean, false) then
    insert into app.email_outbox (to_email, subject, html)
    values (v_email, '[Đặt Xe] Tài khoản của bạn đã sẵn sàng',
            app.email_html(trim(p->>'name'), 'Tài khoản mới',
              'Admin ' || me.full_name || ' đã tạo tài khoản cổng Đặt Xe BlueScope cho bạn. Tên đăng nhập: ' || v_email
              || ' · Mật khẩu tạm: ' || v_pw || ' · Lần đầu đăng nhập, hệ thống yêu cầu đổi mật khẩu.', null));
    v_sent := true;
  end if;
  insert into app.audit_log (entity_id, detail, actor) values ('user', me.full_name || ' tạo tài khoản ' || v_email || ' (' || (p->>'role') || ')'
    || case when v_sent then ', đã gửi email chào mừng' else '' end, me.user_id);
  return jsonb_build_object('id', v_id, 'email', v_email, 'emailSent', v_sent);
end $$;

create or replace function public.admin_reset_password(p_user uuid, p_pw text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; u app.profiles;
begin
  me := app.require_admin();
  select * into u from app.profiles where user_id = p_user;
  if not found then raise exception 'Không tìm thấy người dùng.'; end if;
  perform app.check_pw(p_pw);
  update auth.users set encrypted_password = app.hash_pw(p_pw), updated_at = now() where id = p_user;
  update app.profiles set must_change_pw = (p_user <> me.user_id) where user_id = p_user;
  insert into app.audit_log (entity_id, detail, actor) values ('user', me.full_name || ' đặt lại mật khẩu cho ' || u.email, me.user_id);
end $$;

-- Người dùng đã tự đổi mật khẩu (sau lần đầu / sau khi Admin đặt lại)
create or replace function public.my_pw_changed() returns void
language sql volatile security definer set search_path = '' as $$
  update app.profiles set must_change_pw = false where user_id = auth.uid()
$$;

-- Dữ liệu đang gắn với một người dùng (để chuyển giao trước khi xóa)
create or replace function public.admin_user_refs(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_admin();
  return jsonb_build_object(
    'salesCust', (select count(*) from app.customers where sales_user_id = p_user),
    'csCust',    (select count(*) from app.customers where cs_user_id = p_user),
    'bookings',  (select count(*) from app.bookings where cs_user_id = p_user),
    'openBk',    (select count(*) from app.bookings where cs_user_id = p_user and status in ('draft','hold','ok','resched','loaded','transit')),
    'delegateOf',(select count(*) from app.profiles where delegate_id = p_user),
    'reports',   (select count(*) from app.profiles where manager_id = p_user),
    'requests',  (select count(*) from app.order_requests where created_by = p_user and status = 'new'),
    'role',      (select role from app.profiles where user_id = p_user),
    'lastSignIn',(select last_sign_in_at from auth.users where id = p_user));
end $$;

-- Xóa hẳn tài khoản (đăng nhập + hồ sơ). Còn dữ liệu đang gắn thì phải chọn người nhận chuyển giao.
create or replace function public.admin_delete_user(p_user uuid, p_transfer uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; u app.profiles; t app.profiles; r jsonb; v_need int; v_txt text := '';
begin
  me := app.require_admin();
  if p_user = me.user_id or p_user = app.real_uid() then raise exception 'Không xóa được chính tài khoản đang đăng nhập.'; end if;
  select * into u from app.profiles where user_id = p_user for update;
  if not found then raise exception 'Không tìm thấy người dùng.'; end if;
  if u.role = 'admin' and (select count(*) from app.profiles where role = 'admin' and active and user_id <> p_user) = 0 then
    raise exception 'Không xóa được Admin cuối cùng.';
  end if;
  r := public.admin_user_refs(p_user);
  v_need := (r->>'salesCust')::int + (r->>'csCust')::int + (r->>'bookings')::int + (r->>'delegateOf')::int;
  if v_need > 0 then
    if p_transfer is null then
      raise exception 'Tài khoản đang gắn dữ liệu (% khách phụ trách Sales, % khách phụ trách CS, % booking, % người nhận thay). Chọn người nhận chuyển giao hoặc Khóa tài khoản thay vì xóa.',
        r->>'salesCust', r->>'csCust', r->>'bookings', r->>'delegateOf';
    end if;
    select * into t from app.profiles where user_id = p_transfer and active;
    if not found or p_transfer = p_user then raise exception 'Người nhận chuyển giao không hợp lệ.'; end if;
    if (r->>'salesCust')::int > 0 and t.role <> 'sales' then raise exception 'Khách đang do Sales phụ trách: người nhận phải là Sales.'; end if;
    if ((r->>'csCust')::int > 0 or (r->>'bookings')::int > 0) and t.role not in ('cs','admin') and (r->>'salesCust')::int = 0 then
      raise exception 'Khách / booking đang do CS phụ trách: người nhận phải là CS.';
    end if;
    update app.customers set sales_user_id = p_transfer where sales_user_id = p_user;
    update app.customers set cs_user_id = p_transfer where cs_user_id = p_user;
    update app.bookings set cs_user_id = p_transfer where cs_user_id = p_user;
    update app.profiles set delegate_id = p_transfer where delegate_id = p_user;
    v_txt := ', chuyển giao cho ' || t.full_name || ' (' || (r->>'salesCust') || ' khách Sales, ' || (r->>'csCust') || ' khách CS, ' || (r->>'bookings') || ' booking)';
  end if;
  update app.profiles set manager_id = null where manager_id = p_user;
  update app.order_requests set status = 'cancelled', handled_at = now(), reply = 'Người gửi đã bị xóa tài khoản' where created_by = p_user and status = 'new';
  insert into app.deleted_users (user_id, full_name, email, role, deleted_by) values (p_user, u.full_name, u.email, u.role, me.user_id)
  on conflict (user_id) do nothing;
  delete from app.impersonations where target_id = p_user or admin_id = p_user;
  delete from auth.users where id = p_user;   -- hồ sơ, thông báo, MFA xóa theo (cascade)
  delete from app.profiles where user_id = p_user;
  insert into app.audit_log (entity_id, detail, actor) values ('user', me.full_name || ' xóa tài khoản ' || u.email || ' (' || u.role || ')' || v_txt, me.user_id);
  return jsonb_build_object('email', u.email, 'transferred', v_need > 0);
end $$;


-- v3.19: Chatbot ------------------------------------------------------------------
create or replace function app.chat_allowed(m app.profiles) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((app.setting('chatOn') #>> '{}')::boolean, true)
     and case when m.role = 'customer' then coalesce((select chat_enabled from app.customers where id = m.customer_id), false)
              else m.role in (select jsonb_array_elements_text(coalesce(app.setting('chatRoles'), '["cs","sales","logistics","admin"]'::jsonb))) end
$$;

-- Gọi trước mỗi lượt hỏi AI (Cloudflare Function gọi bằng token của người dùng): kiểm tra quyền + hạn mức ngày, ghi nhật ký
create or replace function public.chat_use(p_tools text[] default '{}') returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_lim int; v_used int; v_tot int := coalesce(app.setn('chatDailyTotal'), 2000)::int; v_all int;
begin
  select * into me from app.profiles where user_id = app.uid() and active;
  if not found then raise exception 'Tài khoản chưa được cấp quyền.' using errcode = '42501'; end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng: chatbot tạm tắt.' using errcode = '42501';
  end if;
  if not app.chat_allowed(me) then raise exception 'Chatbot chưa được bật cho tài khoản của bạn.' using errcode = '42501'; end if;
  -- v3.20: hạn mức theo vai trò (chatDailyRole), mặc định chatDaily; chặn tổng toàn hệ thống (chatDailyTotal)
  v_lim := coalesce(nullif(app.setting('chatDailyRole') ->> me.role, '')::numeric, app.setn('chatDaily'), 150)::int;
  select count(*) into v_all from app.chat_log where at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh');
  if v_all >= v_tot then raise exception 'Trợ lý đã dùng hết hạn mức chung của hệ thống hôm nay (% lượt). Mai dùng tiếp nhé.', v_tot using errcode = '42501'; end if;
  if v_all + 1 >= ceil(v_tot * 0.8)::int and not exists (select 1 from app.notifications where type = 'Nhắc việc' and text like 'Trợ lý (chatbot) đã dùng 80%%'
       and created_at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh')) then
    perform app.notify(array(select user_id from app.profiles where role = 'admin' and active), 'Nhắc việc',
      'Trợ lý (chatbot) đã dùng 80% hạn mức chung hôm nay (' || (v_all + 1) || '/' || v_tot || ' lượt). Tăng hạn mức hoặc nhắc người dùng.', null);
  end if;
  select count(*) into v_used from app.chat_log where user_id = me.user_id and at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh');
  if v_used >= v_lim then raise exception 'Bạn đã dùng hết % lượt chatbot hôm nay. Mai dùng tiếp nhé.', v_lim using errcode = '42501'; end if;
  insert into app.chat_log (user_id, tools) values (me.user_id, coalesce(p_tools, '{}'));
  return jsonb_build_object('left', v_lim - v_used - 1, 'limit', v_lim);
end $$;

create or replace function public.set_customer_chat(p_customer uuid, p_on boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; v_name text;
begin
  me := app.require_perm('customers.manage');
  update app.customers set chat_enabled = coalesce(p_on, false) where id = p_customer returning name into v_name;
  if v_name is null then raise exception 'Không tìm thấy khách hàng.'; end if;
  insert into app.audit_log (entity_id, detail, actor) values ('chat', me.full_name || case when p_on then ' bật' else ' tắt' end || ' chatbot cho khách ' || v_name, me.user_id);
end $$;

create or replace function public.chat_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me app.profiles;
begin
  me := app.require_perm('config.general');
  return jsonb_build_object(
    'days', (select coalesce(jsonb_agg(jsonb_build_array(d, n) order by d), '[]') from (
              select (at at time zone 'Asia/Ho_Chi_Minh')::date d, count(*) n from app.chat_log where at > now() - interval '14 days' group by 1) x),
    'top', (select coalesce(jsonb_agg(jsonb_build_array(app.uname(user_id), n) order by n desc), '[]') from (
              select user_id, count(*) n from app.chat_log where at > now() - interval '7 days' group by 1 order by 2 desc limit 5) y),
    'today', (select count(*) from app.chat_log where at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh')),
    'roles', (select coalesce(jsonb_object_agg(r, jsonb_build_array(t, w)), '{}') from (
              select coalesce(p.role, d.role, '?') r,
                     count(*) filter (where l.at >= (app.today()::timestamp at time zone 'Asia/Ho_Chi_Minh')) t, count(*) w
                from app.chat_log l left join app.profiles p on p.user_id = l.user_id left join app.deleted_users d on d.user_id = l.user_id
               where l.at > now() - interval '7 days' group by 1) z),
    'total', coalesce(app.setn('chatDailyTotal'), 2000));
end $$;


-- v3.24: Trao đổi nội bộ ----------------------------------------------------
-- Người dùng nội bộ đang hoạt động, không ở chế độ Xem như khách hàng
create or replace function app.talk_me() returns app.profiles
language plpgsql stable security definer set search_path = '' as $$
declare m app.profiles;
begin
  select * into m from app.profiles where user_id = app.uid() and active;
  if not found or m.role = 'customer' then raise exception 'Trao đổi chỉ dành cho nhân viên nội bộ.' using errcode = '42501'; end if;
  if exists (select 1 from app.cust_views v where v.admin_id = app.real_uid() and v.expires_at > now()) then
    raise exception 'Đang ở chế độ Xem như khách hàng (chỉ xem). Bấm Thoát trên thanh màu cam trước khi thao tác.' using errcode = '42501';
  end if;
  return m;
end $$;

create or replace function app.talk_access(m app.profiles, p_kind text, p_ref text) returns boolean
language sql stable security definer set search_path = '' as $$
  select m.user_id is not null and m.role <> 'customer' and case p_kind
    when 'bk' then exists (select 1 from app.bookings b join app.customers c on c.id = b.customer_id
                            where b.id = p_ref and app.sees_sales(m, c.sales_user_id))
    when 'truck' then p_ref ~ '^[A-Z0-9]{2,8}-[0-9]{6}-(DK|XT)-[0-9]{2}$'
    when 'day' then p_ref ~ '^[A-Z0-9]{2,8}:[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    else false end
$$;

create or replace function app.talk_title(t app.talk_threads) returns text
language sql stable security definer set search_path = '' as $$
  select case t.kind
    when 'bk' then t.ref || coalesce(' · ' || (select name from app.customers where id = t.customer_id), '')
    when 'truck' then 'Xe ' || split_part(t.ref, '-', 3) || '-' || split_part(t.ref, '-', 4) || ' · ' || t.wh || ' ' || app.dm(t.day)
    else 'Ngày ' || app.dm(t.day) || ' · kho ' || t.wh end
$$;

create or replace function app.talk_ensure(p_kind text, p_ref text) returns app.talk_threads
language plpgsql security definer set search_path = '' as $$
declare t app.talk_threads; b app.bookings;
begin
  select * into t from app.talk_threads where kind = p_kind and ref = p_ref;
  if found then return t; end if;
  if p_kind = 'bk' then
    select * into b from app.bookings where id = p_ref;
    insert into app.talk_threads (kind, ref, wh, day, customer_id) values (p_kind, p_ref, b.warehouse_code, b.day, b.customer_id)
      on conflict (kind, ref) do nothing;
  elsif p_kind = 'truck' then
    insert into app.talk_threads (kind, ref, wh, day) values (p_kind, p_ref, split_part(p_ref, '-', 1), to_date(split_part(p_ref, '-', 2), 'DDMMYY'))
      on conflict (kind, ref) do nothing;
  else
    insert into app.talk_threads (kind, ref, wh, day) values (p_kind, p_ref, split_part(p_ref, ':', 1), split_part(p_ref, ':', 2)::date)
      on conflict (kind, ref) do nothing;
  end if;
  select * into t from app.talk_threads where kind = p_kind and ref = p_ref;
  return t;
end $$;

-- CS phụ trách khách (nghỉ → người nhận thay)
create or replace function app.talk_cs_of(p_customer uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(case when app.is_away(p.user_id) and p.delegate_id is not null then p.delegate_id else p.user_id end), '{}')
    from app.customers c join app.profiles p on p.user_id = c.cs_user_id and p.active where c.id = p_customer
$$;

-- Những người liên quan mặc định: đơn → CS, Sales của khách + CS tạo đơn + Logistics kho; xe / ngày → Logistics kho + CS, Sales các đơn trên xe / ngày
create or replace function app.talk_related(t app.talk_threads) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct x) filter (where x is not null), '{}') from unnest(
    app.logistics_of(t.wh)
    || case when t.kind = 'bk' then
         app.talk_cs_of(t.customer_id)
         || array(select sales_user_id from app.customers where id = t.customer_id)
         || array(select cs_user_id from app.bookings where id = t.ref)
       when t.kind = 'truck' then
         array(select c.cs_user_id from app.allocations a join app.bookings b on b.id = a.booking_id join app.customers c on c.id = b.customer_id where a.truck_code = t.ref)
         || array(select c.sales_user_id from app.allocations a join app.bookings b on b.id = a.booking_id join app.customers c on c.id = b.customer_id where a.truck_code = t.ref)
       else '{}'::uuid[] end) x
$$;

-- @nhóm: log = Logistics kho; cs = CS phụ trách khách (không có → mọi CS); sales = Sales phụ trách khách; admin
create or replace function app.talk_tag_users(t app.talk_threads, p_tag text) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case p_tag
    when 'log' then app.logistics_of(t.wh)
    when 'cs' then case when t.kind = 'bk' and cardinality(app.talk_cs_of(t.customer_id)) > 0 then app.talk_cs_of(t.customer_id)
                        else array(select user_id from app.profiles where role = 'cs' and active and not app.is_away(user_id)) end
    when 'sales' then case when t.kind = 'bk' then array(select sales_user_id from app.customers where id = t.customer_id and sales_user_id is not null)
                           else array(select distinct c.sales_user_id from app.allocations a join app.bookings b on b.id = a.booking_id join app.customers c on c.id = b.customer_id
                                       where a.truck_code = t.ref and c.sales_user_id is not null) end
    when 'admin' then array(select user_id from app.profiles where role = 'admin' and active)
    else '{}'::uuid[] end
$$;

create or replace function app.talk_inv(t app.talk_threads, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_uid = any(t.wait_users) or p_uid = t.asked_by or p_uid = any(app.talk_related(t))
      or exists (select 1 from app.talk_msgs m where m.thread_id = t.id and (m.created_by = p_uid or p_uid = any(m.mentions)))
      or exists (select 1 from app.talk_reads r where r.thread_id = t.id and r.user_id = p_uid and r.mode = 'follow')
$$;

-- Danh sách trao đổi cho get_state (đang chờ trả lời, có ghim, hoặc có tin trong 45 ngày)
create or replace function app.talk_list(me app.profiles) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(j order by lt desc), '[]') from (
    select t.last_at as lt, jsonb_build_object('id', t.id, 'k', t.kind, 'ref', t.ref, 'wh', t.wh, 'day', t.day, 'cid', t.customer_id, 'st', t.status,
      'askedBy', t.asked_by, 'askedAt', extract(epoch from t.asked_at) / 60, 'wait', to_jsonb(t.wait_users), 'pin', t.pinned,
      'lastAt', extract(epoch from t.last_at) / 60, 'lastBy', app.uname(t.last_by), 'lastById', t.last_by, 'lastText', t.last_text, 'n', t.n,
      'unread', (select count(*) from app.talk_msgs x where x.thread_id = t.id and x.deleted_at is null and x.created_by <> me.user_id
                   and x.created_at > coalesce(r.read_at, '-infinity'::timestamptz)),
      'mode', coalesce(r.mode, ''), 'inv', app.talk_inv(t, me.user_id) and coalesce(r.mode, '') <> 'mute',
      'mine', exists (select 1 from app.talk_msgs x where x.thread_id = t.id and x.created_by = me.user_id)) j
      from app.talk_threads t left join app.talk_reads r on r.thread_id = t.id and r.user_id = me.user_id
     where (t.n > 0 or t.pinned is not null)
       and (t.status = 'wait' or t.last_at > now() - interval '45 days' or (t.pinned is not null and t.day >= app.today() - 7))
     order by t.last_at desc limit 400) z
  where app.talk_access(me, z.j->>'k', z.j->>'ref')
$$;

create or replace function app.talk_json(t app.talk_threads, me app.profiles) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'thread', jsonb_build_object('id', t.id, 'k', t.kind, 'ref', t.ref, 'wh', t.wh, 'day', t.day, 'cid', t.customer_id, 'st', t.status, 'title', app.talk_title(t),
      'askedBy', app.uname(t.asked_by), 'askedById', t.asked_by, 'askedAt', extract(epoch from t.asked_at) / 60,
      'wait', (select coalesce(jsonb_agg(jsonb_build_object('id', user_id, 'name', full_name)), '[]') from app.profiles where user_id = any(t.wait_users)),
      'pin', t.pinned, 'pinBy', app.uname(t.pinned_by), 'pinAt', extract(epoch from t.pinned_at) / 60,
      'mode', coalesce((select mode from app.talk_reads where thread_id = t.id and user_id = me.user_id), '')),
    'msgs', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'by', m.created_by, 'byName', coalesce(app.uname(m.created_by), 'Người dùng đã xóa'),
               'role', (select role from app.profiles where user_id = m.created_by),
               'body', case when m.deleted_at is null then m.body else '' end, 'del', m.deleted_at is not null, 'ask', m.ask,
               'at', extract(epoch from m.created_at) / 60, 'edited', m.edited_at is not null, 'file', case when m.deleted_at is null then m.file_id end,
               'reacts', m.reacts, 'tags', to_jsonb(m.tags),
               'ment', (select coalesce(jsonb_agg(full_name), '[]') from app.profiles where user_id = any(m.mentions))) order by m.id), '[]')
               from (select * from app.talk_msgs where thread_id = t.id order by id desc limit 300) m),
    'reads', (select coalesce(jsonb_agg(jsonb_build_object('name', app.uname(r.user_id), 'id', r.user_id, 'at', extract(epoch from r.read_at) / 60) order by r.read_at), '[]')
                from app.talk_reads r where r.thread_id = t.id and r.user_id <> me.user_id and r.read_at is not null))
$$;

create or replace function public.talk_get(p_kind text, p_ref text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; t app.talk_threads;
begin
  m := app.talk_me();
  if not app.talk_access(m, p_kind, p_ref) then raise exception 'Bạn không có quyền xem trao đổi này.' using errcode = '42501'; end if;
  select * into t from app.talk_threads where kind = p_kind and ref = p_ref;
  if not found then return jsonb_build_object('thread', null, 'msgs', '[]'::jsonb, 'reads', '[]'::jsonb); end if;
  insert into app.talk_reads (user_id, thread_id, read_at) values (m.user_id, t.id, now())
    on conflict (user_id, thread_id) do update set read_at = now();
  return app.talk_json(t, m);
end $$;

-- p: {kind, ref, body, ask (true/false/null = tự nhận: có "?" hoặc có @), mentions: [uuid], tags: ['log','cs','sales','admin'], fileId}
create or replace function public.talk_post(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; t app.talk_threads; v_k text := p->>'kind'; v_r text := p->>'ref'; v_body text := trim(coalesce(p->>'body', ''));
        v_ment uuid[]; v_tags text[]; v_tagu uuid[] := '{}'; v_ask boolean; v_file bigint := nullif(p->>'fileId', '')::bigint;
        v_wait uuid[]; v_rcpt uuid[]; v_mid bigint; tg text; v_txt text;
begin
  m := app.talk_me();
  if not app.talk_access(m, v_k, v_r) then raise exception 'Bạn không có quyền trao đổi ở đây.' using errcode = '42501'; end if;
  if length(v_body) = 0 and v_file is null then raise exception 'Nhập nội dung tin nhắn.'; end if;
  if length(v_body) > 2000 then raise exception 'Tin nhắn quá dài (tối đa 2000 ký tự).'; end if;
  if v_file is not null and not exists (select 1 from app.talk_files where id = v_file and created_by = m.user_id) then raise exception 'Ảnh không hợp lệ.'; end if;
  v_ment := array(select distinct x::uuid from jsonb_array_elements_text(coalesce(p->'mentions', '[]')) x
                   where exists (select 1 from app.profiles where user_id = x::uuid and active and role <> 'customer'));
  v_tags := array(select distinct x from jsonb_array_elements_text(coalesce(p->'tags', '[]')) x where x in ('log','cs','sales','admin'));
  t := app.talk_ensure(v_k, v_r);
  foreach tg in array v_tags loop v_tagu := v_tagu || app.talk_tag_users(t, tg); end loop;
  v_ask := coalesce((p->>'ask')::boolean, v_body like '%?%' or cardinality(v_ment) + cardinality(v_tags) > 0);
  insert into app.talk_msgs (thread_id, body, ask, mentions, tags, file_id, created_by)
  values (t.id, v_body, v_ask, v_ment, v_tags, v_file, m.user_id) returning id into v_mid;
  if v_ask then
    v_wait := array(select distinct x from unnest(v_ment || v_tagu) x where x is not null and x <> m.user_id);
    if cardinality(v_wait) = 0 then
      v_wait := array(select distinct x from unnest(app.talk_related(t)) x join app.profiles pp on pp.user_id = x
                       where x <> m.user_id and pp.role <> m.role);
    end if;
    update app.talk_threads set status = 'wait', asked_by = m.user_id, asked_at = now(), wait_users = v_wait, reminded = 0 where id = t.id;
  elsif t.status = 'wait' and m.user_id <> t.asked_by then
    update app.talk_threads set status = 'answered' where id = t.id;
  elsif t.status = 'done' then
    update app.talk_threads set status = 'open' where id = t.id;
  end if;
  update app.talk_threads set last_at = now(), last_by = m.user_id, n = n + 1,
         last_text = case when v_body = '' then '📷 Ảnh' else left(v_body, 200) end where id = t.id returning * into t;
  insert into app.talk_reads (user_id, thread_id, read_at) values (m.user_id, t.id, now())
    on conflict (user_id, thread_id) do update set read_at = now();
  -- Người nhận: được @ (luôn nhận) + người đã tham gia / theo dõi + (không @ ai thì) những người liên quan; bỏ người tắt theo dõi
  v_rcpt := array(select distinct x from unnest(
      v_ment || v_tagu
      || array(select x2 from unnest(
           array(select created_by from app.talk_msgs where thread_id = t.id)
           || array(select user_id from app.talk_reads where thread_id = t.id and mode = 'follow')
           || case when cardinality(v_ment) + cardinality(v_tags) = 0 then app.talk_related(t) else '{}'::uuid[] end) x2
         where not exists (select 1 from app.talk_reads r where r.thread_id = t.id and r.user_id = x2 and r.mode = 'mute'))) x
    where x is not null and x <> m.user_id);
  v_txt := app.talk_title(t) || ' · ' || m.full_name || case when v_ask then ' hỏi: ' else ': ' end || case when v_body = '' then '📷 Ảnh' else left(v_body, 160) end;
  perform app.notify(v_rcpt, 'Trao đổi', v_txt, jsonb_build_object('talk', jsonb_build_object('k', t.kind, 'r', t.ref)));
  return app.talk_json(t, m);
end $$;

-- Sửa / xóa tin của mình trong 5 phút (ghi nhật ký)
create or replace function public.talk_edit(p_id bigint, p_body text, p_delete boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; x app.talk_msgs; t app.talk_threads;
begin
  m := app.talk_me();
  select * into x from app.talk_msgs where id = p_id for update;
  if not found or x.deleted_at is not null then raise exception 'Không tìm thấy tin nhắn.'; end if;
  if x.created_by <> m.user_id then raise exception 'Chỉ sửa / xóa được tin của mình.' using errcode = '42501'; end if;
  if x.created_at < now() - interval '5 minutes' then raise exception 'Chỉ sửa / xóa được trong 5 phút sau khi gửi.'; end if;
  if p_delete then
    update app.talk_msgs set deleted_at = now() where id = p_id;
    insert into app.audit_log (entity_id, detail, actor) values ('TALK-' || x.thread_id, m.full_name || ' xóa tin: ' || left(x.body, 300), m.user_id);
  else
    if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Nhập nội dung tin nhắn.'; end if;
    update app.talk_msgs set body = left(trim(p_body), 2000), edited_at = now() where id = p_id;
    insert into app.audit_log (entity_id, detail, actor) values ('TALK-' || x.thread_id, m.full_name || ' sửa tin: "' || left(x.body, 200) || '" → "' || left(trim(p_body), 200) || '"', m.user_id);
  end if;
  select * into t from app.talk_threads where id = x.thread_id;
  update app.talk_threads set last_text = (select case when body = '' then '📷 Ảnh' else left(body, 200) end from app.talk_msgs
                                            where thread_id = t.id and deleted_at is null order by id desc limit 1) where id = t.id returning * into t;
  return app.talk_json(t, m);
end $$;

-- Thả cảm xúc (bấm lại để bỏ). Người đang được hỏi thả 👍 / ✅ = đã trả lời.
create or replace function public.talk_react(p_id bigint, p_emoji text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; x app.talk_msgs; t app.talk_threads; v_arr jsonb; v_me text;
begin
  m := app.talk_me(); v_me := m.user_id::text;
  if p_emoji not in ('👍','✅','👀','🙏','❤️') then raise exception 'Biểu tượng không hợp lệ.'; end if;
  select * into x from app.talk_msgs where id = p_id for update;
  if not found or x.deleted_at is not null then raise exception 'Không tìm thấy tin nhắn.'; end if;
  select * into t from app.talk_threads where id = x.thread_id;
  if not app.talk_access(m, t.kind, t.ref) then raise exception 'Bạn không có quyền.' using errcode = '42501'; end if;
  v_arr := coalesce(x.reacts->p_emoji, '[]');
  if v_arr ? v_me then v_arr := (select coalesce(jsonb_agg(e), '[]') from jsonb_array_elements_text(v_arr) e where e <> v_me);
  else v_arr := v_arr || to_jsonb(v_me); end if;
  update app.talk_msgs set reacts = case when jsonb_array_length(v_arr) = 0 then reacts - p_emoji else jsonb_set(reacts, array[p_emoji], v_arr) end where id = p_id;
  if p_emoji in ('👍','✅') and t.status = 'wait' and m.user_id = any(t.wait_users) and v_arr ? v_me then
    update app.talk_threads set status = 'answered' where id = t.id;
  end if;
  insert into app.talk_reads (user_id, thread_id, read_at) values (m.user_id, t.id, now())
    on conflict (user_id, thread_id) do update set read_at = now();
  select * into t from app.talk_threads where id = t.id;
  return app.talk_json(t, m);
end $$;

-- ✓ Đã xong / mở lại; ghim ghi chú; theo dõi / tắt theo dõi
create or replace function public.talk_set(p_kind text, p_ref text, p_what text, p_value text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; t app.talk_threads; v text := nullif(trim(coalesce(p_value, '')), '');
begin
  m := app.talk_me();
  if not app.talk_access(m, p_kind, p_ref) then raise exception 'Bạn không có quyền.' using errcode = '42501'; end if;
  t := app.talk_ensure(p_kind, p_ref);
  if p_what = 'status' then
    if v not in ('done','open') then raise exception 'Trạng thái không hợp lệ.'; end if;
    update app.talk_threads set status = v, wait_users = case when v = 'done' then '{}' else wait_users end where id = t.id;
    insert into app.audit_log (entity_id, detail, actor) values ('TALK-' || t.id, m.full_name || case when v = 'done' then ' đánh dấu Đã xong' else ' mở lại' end || ' trao đổi ' || app.talk_title(t), m.user_id);
  elsif p_what = 'pin' then
    if length(coalesce(v, '')) > 300 then raise exception 'Ghi chú ghim tối đa 300 ký tự.'; end if;
    update app.talk_threads set pinned = v, pinned_by = case when v is null then null else m.user_id end, pinned_at = case when v is null then null else now() end where id = t.id;
    insert into app.audit_log (entity_id, detail, actor) values (case when t.kind = 'bk' then t.ref else 'TALK-' || t.id end,
      m.full_name || case when v is null then ' bỏ ghim ghi chú' else ' ghim ghi chú: ' || v end, m.user_id);
  elsif p_what = 'mode' then
    if coalesce(v, '') not in ('', 'follow', 'mute') then raise exception 'Chế độ không hợp lệ.'; end if;
    insert into app.talk_reads (user_id, thread_id, mode) values (m.user_id, t.id, coalesce(v, ''))
      on conflict (user_id, thread_id) do update set mode = coalesce(v, '');
  else raise exception 'Thao tác không hợp lệ.';
  end if;
  select * into t from app.talk_threads where id = t.id;
  return app.talk_json(t, m);
end $$;

-- Ảnh đính kèm (trình duyệt đã nén ≤ 1600px, JPEG) – lưu trong database, chỉ người có quyền xem trao đổi mới tải được
create or replace function public.talk_upload(p_b64 text, p_mime text) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare m app.profiles; v_data bytea; v_id bigint;
begin
  m := app.talk_me();
  if p_mime not in ('image/jpeg','image/png','image/webp') then raise exception 'Chỉ gửi được ảnh JPG / PNG / WebP.'; end if;
  v_data := decode(p_b64, 'base64');
  if length(v_data) > 700000 then raise exception 'Ảnh quá lớn (tối đa 700 KB sau khi nén).'; end if;
  if (select count(*) from app.talk_files where created_by = m.user_id and created_at > now() - interval '1 day') >= 60 then
    raise exception 'Đã gửi quá 60 ảnh hôm nay.';
  end if;
  insert into app.talk_files (data, mime, size, created_by) values (v_data, p_mime, length(v_data), m.user_id) returning id into v_id;
  return v_id;
end $$;

create or replace function public.talk_file(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m app.profiles; f app.talk_files;
begin
  m := app.talk_me();
  select * into f from app.talk_files where id = p_id;
  if not found then raise exception 'Không tìm thấy ảnh.'; end if;
  if f.created_by <> m.user_id and not exists (select 1 from app.talk_msgs x join app.talk_threads t on t.id = x.thread_id
                                                where x.file_id = p_id and x.deleted_at is null and app.talk_access(m, t.kind, t.ref)) then
    raise exception 'Bạn không có quyền xem ảnh này.' using errcode = '42501';
  end if;
  return jsonb_build_object('mime', f.mime, 'b64', encode(f.data, 'base64'));
end $$;

-- Thông báo mới sau id (dùng khi ứng dụng chạy nền để hiện thông báo trên máy)
create or replace function public.my_new_notifs(p_after bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'type', n.type, 'text', n.text, 'link', n.link) order by n.id), '[]')
    from (select * from app.notifications where user_id = app.uid() and id > coalesce(p_after, 0) and read_at is null
           and created_at > now() - interval '1 hour' order by id limit 10) n
$$;

-- ---------------------------------------------------------------------
-- 8. Quyền gọi hàm
-- ---------------------------------------------------------------------
revoke all on all functions in schema app from public, anon, authenticated;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in (
       'get_state','admin_stats','save_booking','cancel_booking','save_allocations','place_on_truck','edit_allocation',
       'reject_booking','propose_day','set_region','apply_group','skip_group','confirm_group','upsert_fleet',
       'update_settings','add_region','toggle_region','catalog_save','catalog_toggle',
       'admin_upsert_profile','admin_toggle_user','admin_add_customer','update_my_profile','mark_notifs_read',
       'save_role_permissions','reset_role_permissions',
       'admin_update_customer','admin_toggle_customer','admin_save_address','admin_delete_address',
       'impersonate_start','impersonate_stop','update_region','set_truck_info','set_away','search','admin_reset_mfa','list_bookings','booking_stats',
       'bulk_create_bookings','suggest_days','set_urgent','confirm_delivery','get_coils','mark_loaded','resolve_short','mark_transit',
       'mark_delivered','mark_failed','close_truck','set_email_prefs','send_to_logistics','save_warehouse','change_booking_wh',
       'get_ver','import_customers','save_targets','dash_data','save_my_shortcuts','admin_save_shortcuts','admin_reset_shortcuts','cust_view_start','cust_view_stop','req_create','req_update','admin_create_user','admin_reset_password','my_pw_changed','admin_user_refs','admin_delete_user','chat_use','set_customer_chat','chat_stats','req_set_day','unload_booking','get_delta','log_usage','sys_health','talk_get','talk_post','talk_edit','talk_react','talk_set','talk_upload','talk_file','my_new_notifs')
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
