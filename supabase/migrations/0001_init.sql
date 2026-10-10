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
  segment           text check (segment in ('DD','DA')),
  customer_id       uuid,
  default_warehouse text not null default 'PMY' references app.warehouses(code),
  warehouses        text[] not null default '{}',
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists app.customers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  tax_code      text,
  segment       text not null check (segment in ('DD','DA')),
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
create index if not exists bookings_customer on app.bookings (customer_id);

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
-- Xác thực 2 lớp (MFA, TOTP): vai trò có quyền 'auth.mfa' (Admin luôn có) hoặc người đã tự bật MFA
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
    (p_role = 'admin' and p_perm in ('perms.manage', 'auth.mfa'))
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
  if not app.role_has(m.role, p_perm) then
    select name into v_name from app.permissions where code = p_perm;
    raise exception 'Vai trò của bạn chưa được cấp quyền "%". Liên hệ Admin.', coalesce(v_name, p_perm) using errcode = '42501';
  end if;
  return m;
end $$;

-- Sales chỉ được thao tác trên khách mình phụ trách
create or replace function app.check_scope(m app.profiles, p_customer uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if m.role = 'sales' and not exists (select 1 from app.customers c where c.id = p_customer and c.sales_user_id = m.user_id) then
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
       where f.warehouse_code = p_wh and f.day = p_day and not app.is_holiday(p_wh, p_day)
      union all
      select app.truck_code(p_wh, p_day, 'CN', g), 'CN', g, app.setn('capCN')
        from app.daily_fleet f, generate_series(1, f.cn_count) g
       where f.warehouse_code = p_wh and f.day = p_day and not app.is_holiday(p_wh, p_day)
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

create or replace function app.truck_load(p_code text, p_except text default null) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(a.tons), 0)
    from app.allocations a join app.bookings b on b.id = a.booking_id
   where a.truck_code = p_code and b.status in ('hold','ok') and b.id is distinct from p_except
$$;

create or replace function app.truck_regions(p_code text, p_except text default null) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct coalesce(b.region_id, 'NONE')), '{}')
    from app.allocations a join app.bookings b on b.id = a.booking_id
   where a.truck_code = p_code and b.status in ('hold','ok') and b.id is distinct from p_except
$$;

create or replace function app.truck_stops(p_code text, p_except text default null) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct b.customer_id::text || '|' || b.address_text), '{}')
    from app.allocations a join app.bookings b on b.id = a.booking_id
   where a.truck_code = p_code and b.status in ('hold','ok') and b.id is distinct from p_except
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
    v_cap := v_cap + t.cap; v_loaded := v_loaded + l; v_free := v_free + greatest(0, t.cap - l);
  end loop;
  select coalesce(sum(greatest(0, app.bk_total(b.id) - app.alloc_sum(b.id))), 0) into v_held
    from app.bookings b
   where b.warehouse_code = p_wh and b.day = p_day and b.status = 'hold' and b.id is distinct from p_except;
  v_avail := greatest(0, round(v_free - v_held, 2));
  v_usage := case when v_cap > 0 then (v_loaded + v_held) / v_cap else 0 end;
  v_status := case
    when v_off then 'off'
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
  select string_agg(split_part(truck_code, '-', 3) || '-' || split_part(truck_code, '-', 4) || ' ' || app.fmt(tons) || ' t', ', ' order by truck_code)
    into v_trucks from app.allocations where booking_id = p_id;
  perform app.audit(p_id, 'Xác nhận, xe: ' || coalesce(v_trucks, ''));
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id], 'Xác nhận',
    p_id || ' · ' || c.name || ' ' || app.fmt(app.bk_total(p_id)) || ' t ngày ' || app.dm(b.day) || ' đã xác nhận. Xe: ' || coalesce(v_trucks, ''),
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
create or replace function public.get_state(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me app.profiles; res jsonb; v_cfg jsonb; v_internal boolean;
begin
  select * into me from app.profiles p where p.user_id = app.uid() and p.active;
  if not found then
    if auth.uid() is not null and not app.mfa_ok() then
      return jsonb_build_object('me', null, 'today', app.today(), 'error', 'mfa_required', 'enrolled', app.has_mfa(auth.uid()));
    end if;
    return jsonb_build_object('me', null, 'today', app.today(), 'error', 'no_profile');
  end if;
  v_internal := me.role <> 'customer';
  select jsonb_object_agg(key, value) into v_cfg from app.settings;

  res := jsonb_build_object(
    'today', app.today(),
    'now', extract(epoch from now()),
    'me', jsonb_build_object('id', me.user_id, 'name', me.full_name, 'email', me.email, 'phone', me.phone, 'role', me.role,
                             'segment', me.segment, 'customerId', me.customer_id, 'wh', me.default_warehouse, 'whs', me.warehouses,
                             'awayFrom', me.away_from, 'awayTo', me.away_to, 'delegateId', me.delegate_id,
                             'mfa', app.has_mfa(me.user_id), 'mfaReq', app.role_has(me.role, 'auth.mfa')),
    'cfg', v_cfg,
    'perms', to_jsonb(app.my_perms(me.role)),
    'imp', case when app.impersonating() then (select jsonb_build_object('by', a.full_name, 'expiresAt', extract(epoch from i.expires_at))
                from app.impersonations i join app.profiles a on a.user_id = i.admin_id where i.admin_id = app.real_uid()) end,
    'warehouses', (select jsonb_agg(jsonb_build_object('id', code, 'name', name, 'full', full_name) order by code) from app.warehouses where active),
    'notifs', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'type', n.type, 'text', n.text, 'link', n.link,
                 'at', extract(epoch from n.created_at), 'read', n.read_at is not null) order by n.created_at desc), '[]')
               from (select * from app.notifications where user_id = me.user_id order by created_at desc limit 100) n)
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
                'mfa', app.has_mfa(p.user_id), 'mfaReq', app.role_has(p.role, 'auth.mfa'),
                'last', (select (u.last_sign_in_at at time zone 'Asia/Ho_Chi_Minh')::date from auth.users u where u.id = p.user_id)) order by p.full_name), '[]')
              from app.profiles p),
    'customers', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name, 'segment', c.segment, 'salesId', c.sales_user_id, 'csId', c.cs_user_id, 'active', c.active,
                    'addresses', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'label', a.label, 'province', a.province, 'ward', a.ward,
                                    'regions', (select coalesce(jsonb_object_agg(ar.warehouse_code, ar.region_id), '{}') from app.address_regions ar where ar.address_id = a.id))
                                    order by a.is_default desc, a.label), '[]')
                                  from app.customer_addresses a where a.customer_id = c.id)) order by c.name), '[]')
                  from app.customers c
                 where me.role <> 'sales' or c.sales_user_id = me.user_id),
    'truckInfo', (select coalesce(jsonb_agg(jsonb_build_object('code', td.truck_code, 'cap', td.cap, 'plate', td.plate, 'driver', td.driver, 'phone', td.phone,
                   'reason', td.reason, 'by', coalesce((select p.full_name from app.profiles p where p.user_id = td.updated_by), ''),
                   'at', to_char(td.updated_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'))), '[]')
                  from app.truck_days td where td.day between p_from and p_to),
    'fleet', (select coalesce(jsonb_agg(jsonb_build_object('wh', f.warehouse_code, 'date', f.day, 'dk', f.dk_count, 'cn', f.cn_count, 'reason', f.reason,
                'by', coalesce((select p.full_name from app.profiles p where p.user_id = f.updated_by), 'Hệ thống'),
                'at', to_char(f.updated_at at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'))), '[]')
              from app.daily_fleet f where f.day between p_from and p_to),
    'bookings', (select coalesce(jsonb_agg(
                   case when me.role = 'sales' and c.sales_user_id is distinct from me.user_id then
                     -- Sales: hàng của khách không phụ trách chỉ còn số tấn để tính capacity
                     jsonb_build_object('id', b.id, 'wh', b.warehouse_code, 'date', b.day, 'customerId', '__other', 'ref', '', 'addrText', 'Khách khác',
                       'province', '', 'region', coalesce(b.region_id, 'NONE'), 'status', b.status, 'csId', null,
                       'heldAt', extract(epoch from b.held_at) / 60,
                       'lines', jsonb_build_array(jsonb_build_object('p', '', 'c', '', 'th', null, 'w', null, 't', app.bk_total(b.id))))
                   else
                     jsonb_build_object('id', b.id, 'wh', b.warehouse_code, 'date', b.day, 'delivery', b.delivery_date, 'customerId', b.customer_id,
                       'ref', b.ref, 'addrId', b.address_id, 'addrText', b.address_text, 'province', b.province, 'region', coalesce(b.region_id, 'NONE'),
                       'status', b.status, 'csId', b.cs_user_id, 'heldAt', extract(epoch from coalesce(b.held_at, b.created_at)) / 60,
                       'note', b.note, 'rejectReason', b.reason_note, 'reasonCode', b.reason_code, 'proposedDate', b.proposed_day,
                       'lines', (select coalesce(jsonb_agg(jsonb_build_object('p', l.product, 'c', l.color, 'th', l.thickness_mm, 'w', l.width_mm, 't', l.tons) order by l.id), '[]')
                                 from app.booking_lines l where l.booking_id = b.id))
                   end), '[]')
                 from app.bookings b join app.customers c on c.id = b.customer_id
                where (b.day between p_from and p_to or b.status in ('hold','resched'))
                  and (b.status <> 'draft' or b.cs_user_id = me.user_id)),
    'allocs', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'bk', a.booking_id, 'truck', a.truck_code, 'tons', a.tons,
                 'override', a.override, 'reason', a.override_reason)), '[]')
               from app.allocations a join app.bookings b on b.id = a.booking_id
              where b.day between p_from and p_to or b.status in ('hold','resched')),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('obj', l.entity_id, 'text', l.detail,
                'who', coalesce((select p.full_name from app.profiles p where p.user_id = l.actor), 'Hệ thống'),
                'at', extract(epoch from l.at) / 60) order by l.at desc), '[]')
              from app.audit_log l
             where l.entity_id in (select b.id from app.bookings b join app.customers c on c.id = b.customer_id
                                    where b.day between p_from and p_to and (me.role <> 'sales' or c.sales_user_id = me.user_id)))
  );
  return res;
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
    if app.is_holiday(v_wh, v_day) or not exists (select 1 from app.daily_fleet f where f.warehouse_code = v_wh and f.day = v_day) then
      raise exception 'Ngày % chưa khai báo xe hoặc là ngày nghỉ; chỉ được Lưu tạm.', app.dm(v_day);
    end if;
    if coalesce(trim(p->>'ref'), '') = '' then raise exception 'Nhập Ref đơn hàng.'; end if;
    if v_addr_text = '' or v_prov = '' then raise exception 'Nhập đủ địa chỉ giao: tỉnh/thành, phường/xã, số nhà/đường.'; end if;
    if coalesce(p->>'region', '') = '' then raise exception 'Chọn khu vực (hoặc "Chưa phân khu vực").'; end if;
    if jsonb_array_length(coalesce(p->'lines', '[]'::jsonb)) = 0 then raise exception 'Cần ít nhất một dòng sản phẩm.'; end if;
    for ln in select * from jsonb_array_elements(p->'lines') loop
      i := i + 1;
      if not exists (select 1 from app.products x where x.name = ln->>'p' and x.active)
         or not exists (select 1 from app.colors x where x.name = ln->>'c' and x.active)
         or not exists (select 1 from app.thicknesses x where x.value_mm = nullif(ln->>'th', '')::numeric and x.active)
         or not exists (select 1 from app.widths x where x.value_mm = nullif(ln->>'w', '')::numeric and x.active)
         or coalesce(nullif(ln->>'t', '')::numeric, 0) <= 0 then
        raise exception 'Dòng sản phẩm %: chọn đủ sản phẩm, màu, độ dày, khổ (đang dùng) và nhập số tấn > 0.', i;
      end if;
    end loop;
    perform app.lock_day(v_wh, v_day);
    v_avail := (app.day_metrics(v_wh, v_day, v_id)->>'avail')::numeric;
    if v_total > v_avail + 0.001 then
      raise exception 'Tổng % t vượt sức chứa còn lại % t của ngày % (BR-09). Chọn ngày khác hoặc Lưu tạm.', app.fmt(v_total), app.fmt(v_avail), app.dm(v_day);
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
    perform app.status_change(v_id, null, v_mode);
    v_status := v_mode;
    perform app.audit(v_id, case when v_mode = 'draft' then 'Lưu nháp' else 'Giữ chỗ ' || app.fmt(v_total) || ' t' end);
  else
    select * into old from app.bookings where id = v_id for update;
    if not found then raise exception 'Không tìm thấy booking %.', v_id; end if;
    perform app.check_scope(me, old.customer_id);
    if old.customer_id <> v_cust then raise exception 'Không đổi được khách hàng của booking đã tạo.'; end if;
    if old.status = 'cancelled' then raise exception 'Booking đã hủy, không sửa được.'; end if;
    -- Booking bị từ chối: CS đặt lại sang ngày khác (giữ nguyên mã booking, lịch sử từ chối vẫn còn)
    if old.status = 'rejected' and v_mode <> 'hold' then raise exception 'Booking bị từ chối: chọn ngày mới rồi bấm Đặt lại để giữ chỗ.'; end if;
    if old.status = 'draft' and old.cs_user_id <> me.user_id then raise exception 'Chỉ CS tạo nháp mới sửa được nháp này.'; end if;
    v_changed := old.day <> v_day or abs(app.bk_total(v_id) - v_total) > 0.005;
    v_status := old.status;
    if old.status = 'draft' and v_mode = 'hold' then v_status := 'hold';
    elsif old.status = 'resched' then v_status := 'hold'; delete from app.allocations where booking_id = v_id;
    elsif old.status = 'rejected' then v_status := 'hold'; v_changed := true; delete from app.allocations where booking_id = v_id;
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
           updated_at = now()
     where id = v_id;
    if v_status <> old.status then perform app.status_change(v_id, old.status, v_status); end if;
    perform app.audit(v_id, case when old.status = 'rejected' then 'Đặt lại sau khi bị từ chối: ngày ' || app.dm(v_day) || ', ' || app.fmt(v_total) || ' t'
                                 when v_status <> old.status then 'Chuyển ' || old.status || ' → ' || v_status else 'Cập nhật booking' end
                            || case when v_changed then ' (đổi ngày/số tấn)' else '' end);
  end if;

  delete from app.booking_lines where booking_id = v_id;
  insert into app.booking_lines (booking_id, product, color, thickness_mm, width_mm, tons)
  select v_id, nullif(l->>'p', ''), nullif(l->>'c', ''), nullif(l->>'th', '')::numeric, nullif(l->>'w', '')::numeric::int, nullif(l->>'t', '')::numeric
    from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb)) l
   where coalesce(nullif(l->>'t', '')::numeric, 0) > 0;

  if v_status = 'hold' and (old.id is null or old.status <> 'hold' or v_changed) then
    perform app.notify(app.logistics_of(v_wh) || c.sales_user_id, 'Giữ chỗ',
      v_id || ' · ' || c.name || ' giữ chỗ ' || app.fmt(v_total) || ' t ngày ' || app.dm(v_day) || ', khu vực ' ||
      coalesce((select r.name from app.regions r where r.id = v_region), 'Chưa phân khu vực'),
      jsonb_build_object('bk', v_id));
    if old.status = 'rejected' then
      perform app.notify(app.customer_users(c.id), 'Giữ chỗ',
        v_id || ' (trước đó bị từ chối) đã được đặt lại sang ngày ' || app.dm(v_day) || ', ' || app.fmt(v_total) || ' t, đang chờ xếp xe.', jsonb_build_object('bk', v_id, 'day', v_day));
    end if;
    if v_region is null then
      perform app.notify(app.logistics_of(v_wh), 'Chưa phân khu vực',
        v_id || ': địa chỉ tỉnh ' || coalesce(nullif(v_prov, ''), '?') || ' chưa ứng với khu vực nào của kho ' || v_wh, jsonb_build_object('bk', v_id));
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.cancel_booking(p_id text, p_reason text, p_reason_code text default 'OTHER') returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me app.profiles; b app.bookings; c app.customers;
begin
  me := app.require_perm('booking.cancel');
  if coalesce(trim(p_reason), '') = '' then raise exception 'Nhập lý do hủy.'; end if;
  select * into b from app.bookings where id = p_id for update;
  if not found or b.status in ('rejected','cancelled') then raise exception 'Booking không tồn tại hoặc đã đóng.'; end if;
  perform app.check_scope(me, b.customer_id);
  select * into c from app.customers where id = b.customer_id;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set status = 'cancelled', closed_at = now(), reason_code = p_reason_code, reason_note = p_reason, updated_at = now() where id = p_id;
  perform app.status_change(p_id, b.status, 'cancelled', p_reason_code, p_reason);
  perform app.audit(p_id, 'Hủy: ' || p_reason);
  if b.status <> 'draft' then
    perform app.notify(app.logistics_of(b.warehouse_code) || c.sales_user_id || app.customer_users(c.id), 'Hủy booking',
      p_id || ' · ' || c.name || ' ngày ' || app.dm(b.day) || ' đã hủy. Lý do: ' || p_reason, jsonb_build_object('bk', p_id, 'day', b.day));
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
  v_pref := case when v_total > app.setn('split') then 'DK' else 'CN' end;
  v_key := b.customer_id::text || '|' || b.address_text;
  select coalesce(sum(nullif(x->>'tons', '')::numeric), 0) into v_sum from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) x where coalesce(nullif(x->>'tons', '')::numeric, 0) > 0;
  if v_sum > v_total + 0.001 then raise exception 'Tổng gán % t vượt số tấn booking % t.', app.fmt(v_sum), app.fmt(v_total); end if;
  if p_confirm and abs(v_sum - v_total) > 0.005 then raise exception 'Tổng tấn gán phải bằng tổng tấn booking (BR-07): % / % t.', app.fmt(v_sum), app.fmt(v_total); end if;

  delete from app.allocations where booking_id = p_id;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_tons := coalesce(nullif(r->>'tons', '')::numeric, 0);
    continue when v_tons <= 0;
    select * into t from app.trucks(b.warehouse_code, b.day) x where x.code = r->>'truck';
    if not found then raise exception 'Xe % không thuộc ngày % của kho %.', r->>'truck', app.dm(b.day), b.warehouse_code; end if;
    v_ov := false;
    v_ex := app.truck_load(t.code, p_id);
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
    perform app.audit(p_id, 'Lưu xếp tạm ' || app.fmt(v_sum) || '/' || app.fmt(v_total) || ' t');
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
  v_rem := app.bk_total(p_id) - app.alloc_sum(p_id);
  if coalesce(p_tons, 0) <= 0 then raise exception 'Nhập số tấn lớn hơn 0.'; end if;
  if p_tons > v_rem + 0.001 then raise exception 'Vượt phần chưa gán của booking (% t).', app.fmt(v_rem); end if;
  if app.truck_load(t.code) + p_tons > t.cap + 0.001 then
    raise exception 'Vượt tải trọng xe. Dùng màn hình gán xe để override kèm lý do.';
  end if;
  insert into app.allocations (booking_id, truck_code, tons) values (p_id, t.code, p_tons)
  on conflict (booking_id, truck_code) do update set tons = app.allocations.tons + excluded.tons;
  perform app.audit(p_id, 'Xếp ' || app.fmt(p_tons) || ' t lên ' || t.type || '-' || lpad(t.seq::text, 2, '0'));
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
    delete from app.allocations where booking_id = p_id and truck_code = p_truck;
    if p_tons > 0 then
      insert into app.allocations (booking_id, truck_code, tons, override, override_reason)
      values (p_id, p_truck, p_tons, app.truck_load(p_truck, p_id) + p_tons > t.cap + 0.001,
              case when app.truck_load(p_truck, p_id) + p_tons > t.cap + 0.001 then p_reason end);
    end if;
    v_txt := 'Sửa ' || split_part(p_truck, '-', 3) || '-' || split_part(p_truck, '-', 4) || ': ' || app.fmt(v_cur) || ' → ' || app.fmt(p_tons) || ' t (' || p_reason || ')';
  elsif p_mode = 'move' then
    select * into tg from app.trucks(b.warehouse_code, b.day) x where x.code = p_target;
    if not found or p_target = p_truck then raise exception 'Chọn xe đích hợp lệ.'; end if;
    if p_tons is null or p_tons <= 0 or p_tons > v_cur + 0.001 then raise exception 'Số tấn chuyển phải > 0 và ≤ % t.', app.fmt(v_cur); end if;
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
    v_txt := 'Chuyển ' || app.fmt(p_tons) || ' t từ ' || split_part(p_truck, '-', 3) || '-' || split_part(p_truck, '-', 4)
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
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id] || app.customer_users(c.id), 'Từ chối',
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
  if not exists (select 1 from app.daily_fleet f where f.warehouse_code = b.warehouse_code and f.day = p_day) or app.is_holiday(b.warehouse_code, p_day) then
    raise exception 'Ngày đề xuất chưa khai báo xe.';
  end if;
  select * into c from app.customers where id = b.customer_id;
  delete from app.allocations where booking_id = p_id;
  update app.bookings set status = 'resched', proposed_day = p_day, reason_code = p_reason_code, reason_note = p_reason, updated_at = now() where id = p_id;
  perform app.status_change(p_id, 'hold', 'resched', p_reason_code, p_reason);
  perform app.audit(p_id, 'Đề nghị đổi sang ' || app.dm(p_day) || ': ' || p_reason);
  perform app.notify_bk(c.id, b.cs_user_id, array[c.sales_user_id] || app.customer_users(c.id), 'Đổi ngày',
    p_id || ' · ' || c.name || ': đề nghị đổi từ ' || app.dm(b.day) || ' sang ' || app.dm(p_day) || '. Lý do: ' || p_reason,
    jsonb_build_object('bk', p_id, 'day', b.day));
end $$;

create or replace function public.set_region(p_id text, p_region text) returns void
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
       and (me.role <> 'sales' or exists (select 1 from app.customers c where c.id = b.customer_id and c.sales_user_id = me.user_id)) then
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
    if app.is_holiday(p_wh, v_day) then raise exception 'Ngày % là ngày nghỉ.', app.dm(v_day); end if;
    if v_dk is null or v_cn is null or v_dk not between 0 and 99 or v_cn not between 0 and 99 then raise exception 'Ngày %: số xe phải là số nguyên 0–99.', app.dm(v_day); end if;
    perform app.lock_day(p_wh, v_day);
    select coalesce(max(seq) filter (where type = 'DK'), 0), coalesce(max(seq) filter (where type = 'CN'), 0) into v_busy_dk, v_busy_cn
      from app.trucks(p_wh, v_day) t where app.truck_load(t.code) > 0.001;
    if v_dk < v_busy_dk then raise exception 'Ngày %: DK-% đang chở hàng; chuyển hoặc gỡ hàng trước khi giảm dưới % đầu kéo.', app.dm(v_day), lpad(v_busy_dk::text, 2, '0'), v_busy_dk; end if;
    if v_cn < v_busy_cn then raise exception 'Ngày %: CN-% đang chở hàng; chuyển hoặc gỡ hàng trước khi giảm dưới % container.', app.dm(v_day), lpad(v_busy_cn::text, 2, '0'), v_busy_cn; end if;
    select * into f from app.daily_fleet where warehouse_code = p_wh and day = v_day;
    if found and (v_dk < f.dk_count or v_cn < f.cn_count) and v_reason = '' then raise exception 'Ngày %: nhập lý do khi giảm số xe.', app.dm(v_day); end if;
    insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason, updated_by, updated_at)
    values (p_wh, v_day, v_dk, v_cn, v_reason, me.user_id, now())
    on conflict (warehouse_code, day) do update set dk_count = excluded.dk_count, cn_count = excluded.cn_count, reason = excluded.reason,
      updated_by = excluded.updated_by, updated_at = now();
    delete from app.truck_days td where td.warehouse_code = p_wh and td.day = v_day
       and td.truck_code not in (select t.code from app.trucks(p_wh, v_day) t);
    v_txt := 'Kho ' || p_wh || ' ngày ' || app.dm(v_day) || ': ' || coalesce(f.dk_count::text || ' → ', '') || v_dk || ' đầu kéo, '
             || coalesce(f.cn_count::text || ' → ', '') || v_cn || ' container' || case when v_reason <> '' then '. Lý do: ' || v_reason else '' end;
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
  v_def := app.setn(case when t.type = 'DK' then 'capDK' else 'capCN' end);
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
  if v_cap is null and coalesce(trim(p_plate), '') = '' and coalesce(trim(p_driver), '') = '' and coalesce(trim(p_phone), '') = '' then
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
    v_txt := 'Kho ' || v_wh || ' ngày ' || app.dm(v_day) || ': xe ' || v_short || ' tải trọng ' || app.fmt(v_old_cap) || ' → ' || app.fmt(coalesce(v_cap, v_def)) || ' t. ' || case when v_cap is null then 'Về tải trọng chuẩn.' else 'Lý do: ' || trim(p_reason) end;
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
    if k not in ('near','capDK','capCN','split','sla','maxStops','fillMin','suggestOn','sundayOff','holidays','capDKMin','capDKMax','capCNMin','capCNMax','escalateHours') then
      raise exception 'Cấu hình % không hợp lệ.', k;
    end if;
    if k in ('near','capDK','capCN','split','sla','maxStops','fillMin','capDKMin','capDKMax','capCNMin','capCNMax','escalateHours') and not ((p->>k)::numeric > 0) then
      raise exception 'Giá trị % phải lớn hơn 0.', k;
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
  insert into app.profiles (user_id, full_name, email, phone, role, segment, customer_id, default_warehouse, warehouses, active)
  values (v_uid, trim(p->>'name'), lower(trim(p->>'email')), nullif(trim(p->>'phone'), ''), v_role,
          case when v_role = 'sales' then v_seg end, case when v_role = 'customer' then v_cust end,
          coalesce(nullif(p->>'wh', ''), 'PMY'),
          case when v_role = 'logistics' then array[coalesce(nullif(p->>'wh', ''), 'PMY')] else '{}' end, true)
  on conflict (user_id) do update set full_name = excluded.full_name, phone = excluded.phone, role = excluded.role, segment = excluded.segment,
    customer_id = excluded.customer_id, default_warehouse = excluded.default_warehouse, warehouses = excluded.warehouses, active = true;
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
  insert into app.customers (code, name, segment, sales_user_id, cs_user_id) values (trim(p->>'code'), trim(p->>'name'), p->>'segment', v_sales.user_id, nullif(p->>'cs_id', '')::uuid) returning id into v_id;
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
declare r record; n int := 0; v_h numeric := coalesce(app.setn('escalateHours'), 4); v_cs uuid[];
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
           and (me.role <> 'sales' or c.sales_user_id = me.user_id)
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
                 where (me.role <> 'sales' or c.sales_user_id = me.user_id)
                   and (app.fold(c.name) like '%' || q || '%' or app.fold(c.code) like '%' || q || '%'
                        or exists (select 1 from app.customer_addresses a where a.customer_id = c.id
                                    and (app.fold(a.label) like '%' || q || '%' or app.fold(a.ward) like '%' || q || '%')))
                 order by c.active desc, c.name limit 6) c));
      if length(qd) >= 3 then
        res := res || jsonb_build_object('trucks', (
          select coalesce(jsonb_agg(jsonb_build_object('code', td.truck_code, 'date', td.day, 'wh', td.warehouse_code, 'plate', td.plate, 'driver', td.driver,
                   'phone', td.phone, 'cap', td.cap, 'load', app.truck_load(td.truck_code),
                   'bookings', (select count(*) from app.allocations a join app.bookings b on b.id = a.booking_id where a.truck_code = td.truck_code and b.status in ('hold','ok')))
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
    select r, pm.code, pm.code in (select jsonb_array_elements_text(p->r)) or (r = 'admin' and pm.code in ('perms.manage', 'auth.mfa'))
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
  if coalesce(trim(p->>'code'), '') = '' or coalesce(trim(p->>'name'), '') = '' or coalesce(p->>'segment', '') not in ('DD','DA') then
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
  update app.customers set code = trim(p->>'code'), name = trim(p->>'name'), segment = p->>'segment', sales_user_id = v_sales.user_id,
         cs_user_id = nullif(p->>'cs_id', '')::uuid where id = c.id;
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

-- Thêm / sửa địa chỉ giao: p = {id (rỗng = thêm), customer_id, label, ward, province, regions: {"PMY": "PMY-HCM", ...}}
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
  values (v_uid, p_name, lower(p_email), 'admin', 'PMY')
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
       'impersonate_start','impersonate_stop','update_region','set_truck_info','set_away','search','admin_reset_mfa')
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
