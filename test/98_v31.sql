-- v3.1: phiên bản dữ liệu / danh mục, phát hiện sửa trùng, segment Export, nhập khách hàng từ file
\set CS  '00000000-0000-0000-0000-0000000000c1'
\set ADM '00000000-0000-0000-0000-00000000000a'
\echo --- 1. get_ver: đổi đơn -> d tăng, c giữ nguyên; sửa khách -> c tăng
select set_config('request.jwt.claim.sub', :'ADM', false);
select (public.get_ver()->>'d')::bigint as d0, (public.get_ver()->>'c')::bigint as c0 \gset
select id as bk from app.bookings where status = 'hold' order by id limit 1 \gset
update app.bookings set note = 'v31' where id = :'bk';
select (public.get_ver()->>'d')::bigint > :d0 as d_up, (public.get_ver()->>'c')::bigint = :c0 as c_same;
update app.customers set name = name || '' where code = 'KH0101';
select (public.get_ver()->>'c')::bigint > :c0 as c_up;
\echo --- 2. get_state: gửi đúng khóa danh mục -> customers = null; sai khóa -> có danh sách
select public.get_state(current_date, current_date + 3)->>'catKey' as ck \gset
select jsonb_typeof(public.get_state(current_date, current_date + 3, :'ck')->'customers') as with_key,
       jsonb_typeof(public.get_state(current_date, current_date + 3, 'x')->'customers') as wrong_key,
       public.get_state(current_date, current_date + 3)->'ver' ? 'n' as has_ver;
\echo --- 3. Sửa trùng: ADM sửa (rev+1) -> CS gửi rev cũ -> ERROR; rev mới -> OK; nhiều lần sửa trong 1 giao dịch -> OK
select rev as r0 from app.bookings where id = :'bk' \gset
update app.bookings set note = 'adm' where id = :'bk';
select rev = :r0 + 1 as rev_up, updated_by = :'ADM' as by_adm from app.bookings where id = :'bk';
select set_config('request.jwt.claim.sub', :'CS', false);
select set_config('request.headers', json_build_object('x-bk-rev', :'bk' || ':' || :r0)::text, false);
\echo expect ERROR "vừa được ... cập nhật"
update app.bookings set note = 'cs-old' where id = :'bk';
select set_config('request.headers', json_build_object('x-bk-rev', :'bk' || ':' || (:r0 + 1))::text, false);
begin;
update app.bookings set note = 'cs-1' where id = :'bk';
update app.bookings set note = 'cs-2' where id = :'bk';
commit;
select note, rev = :r0 + 2 as one_bump from app.bookings where id = :'bk';
update app.bookings set escalated_at = now() where id = :'bk';
select rev = :r0 + 2 as housekeeping_no_bump from app.bookings where id = :'bk';
select set_config('request.headers', '', false);
\echo --- 4. Segment Export
update app.customers set segment = 'EX' where code = 'KH0101';
select segment from app.customers where code = 'KH0101';
update app.customers set segment = 'DD' where code = 'KH0101';
\echo --- 5. Nhập khách hàng: kiểm tra (không ghi) rồi ghi
select set_config('request.jwt.claim.sub', :'ADM', false);
select public.import_customers(
  '[{"row":2,"code":"900001","name":"Khách nhập 1","segment":"EX","sales_email":"nobody@x.vn","default_wh":"JD8","erp":"C900001","active":true},
    {"row":3,"code":"900002","name":"Khách nhập 2","segment":"","active":true},
    {"row":4,"code":"900002","name":"Trùng","segment":"DA"},
    {"row":5,"code":"","name":"Thiếu mã"},
    {"row":6,"code":"KH0101","name":"","segment":"DA"}]'::jsonb,
  '[{"row":2,"code":"900001","ext":"D0001","label":"Số 3 Đường 9A, KCN Biên Hòa 2","province":"Đồng Nai","active":true},
    {"row":3,"code":"900001","ext":"D0002","label":"Kho cũ","province":"Đồng Nai","active":false},
    {"row":4,"code":"999999","ext":"D0001","label":"x","province":""},
    {"row":5,"code":"900002","ext":"KH","label":"Đường không rõ tỉnh","province":""}]'::jsonb, false) - 'errors' - 'warnings' as dry;
select count(*) as not_written from app.customers where code like '9000%';
select r - 'errors' - 'warnings' as applied, jsonb_array_length(r->'errors') as n_err, jsonb_array_length(r->'warnings') as n_warn from (select public.import_customers(
  '[{"row":2,"code":"900001","name":"Khách nhập 1","segment":"EX","sales_email":"nobody@x.vn","default_wh":"JD8","erp":"C900001","active":true},
    {"row":3,"code":"900002","name":"Khách nhập 2","segment":"","active":true},
    {"row":6,"code":"KH0101","name":"","segment":"DA"}]'::jsonb,
  '[{"row":2,"code":"900001","ext":"D0001","label":"Số 3 Đường 9A, KCN Biên Hòa 2","province":"Đồng Nai","active":true},
    {"row":5,"code":"900002","ext":"KH","label":"Đường không rõ tỉnh","province":""}]'::jsonb, true) r) x;
select c.code, c.segment, c.default_wh, c.erp_code, a.ext_code, a.province, a.is_default,
       (select count(*) from app.address_regions ar where ar.address_id = a.id) as regions
  from app.customers c left join app.customer_addresses a on a.customer_id = c.id where c.code like '9000%' order by 1, 5;
select segment as kh0101_seg from app.customers where code = 'KH0101';
\echo --- chạy lại cùng file -> không đổi gì
select (r->>'custSame')::int as same, (r->>'custNew')::int as new, (r->>'addrSame')::int as asame from (select public.import_customers(
  '[{"row":2,"code":"900001","name":"Khách nhập 1","segment":"EX","default_wh":"JD8","erp":"C900001","active":true}]'::jsonb,
  '[{"row":2,"code":"900001","ext":"D0001","label":"Số 3 Đường 9A, KCN Biên Hòa 2","province":"Đồng Nai","active":true}]'::jsonb, true) r) x;
