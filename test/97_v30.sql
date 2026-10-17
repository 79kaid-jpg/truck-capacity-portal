-- v3.0: mã kho mới, Lưu tạm → Gửi Logistics, nhắc / tự hủy nháp, cấu hình kho, đổi kho
\set CS  '00000000-0000-0000-0000-0000000000c1'
\set ADM '00000000-0000-0000-0000-00000000000a'
select (current_date + 5)::text as d5 \gset
\echo --- 1. Kho mới JM2 / JD8 / JD9, mã booking mới BK-JM2
select string_agg(code, ',' order by code) as whs from app.warehouses;
begin;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh','JM2','day',:'d5','code','KH0101','tons',5)), 'draft'))->'rows'->0->>'id' as bk \gset
select :'bk' like 'BK-JM2-%' as new_id;
\echo --- 2. Nháp không trừ năng lực; Gửi Logistics -> Chờ xếp xe
reset role;
select status, (app.day_metrics('JM2', :'d5')->>'held')::numeric as held_before from app.bookings where id = :'bk';
set local role authenticated;
select x->>'ok' as sent from jsonb_array_elements(public.send_to_logistics(array[:'bk'])) x;
reset role;
select status, original_day is not null as has_orig from app.bookings where id = :'bk';
rollback;
\echo --- 3. Nhắc nháp quá mốc chốt; nháp quá ngày bốc 2 ngày tự hủy
begin;
insert into app.bookings (id, warehouse_code, day, customer_id, status, cs_user_id)
select 'T-D1', 'JM2', current_date + 1, id, 'draft', :'CS' from app.customers where code = 'KH0101';
insert into app.bookings (id, warehouse_code, day, customer_id, status, cs_user_id)
select 'T-D2', 'JM2', current_date - 3, id, 'draft', :'CS' from app.customers where code = 'KH0101';
insert into app.settings values ('cutoff', '"00:00"') on conflict (key) do update set value = excluded.value;
select app.escalate() >= 2 as ran;
select id, status from app.bookings where id in ('T-D1','T-D2') order by id;
select count(*) as reminded from app.notifications where text like 'T-D1: nháp%';
rollback;
\echo --- 4. Cấu hình kho: thêm kho, ngừng dùng kho -> đơn đổi sang kho khác
begin;
select set_config('request.jwt.claim.sub', :'ADM', true);
set local role authenticated;
select public.save_warehouse('{"new":true,"code":"jd7","name":"Đà Nẵng"}');
savepoint a;
\echo expect ERROR mã đã có
select public.save_warehouse('{"new":true,"code":"JD7","name":"x"}');
rollback to a;
select public.save_warehouse('{"code":"JD9","name":"Cửa Lò","active":false}');
reset role;
insert into app.bookings (id, warehouse_code, day, customer_id, status, cs_user_id)
select 'T-W1', 'JD9', current_date + 3, id, 'hold', :'CS' from app.customers where code = 'KH0101';
set local role authenticated;
select public.change_booking_wh('T-W1', 'JM2');
reset role;
select warehouse_code, status from app.bookings where id = 'T-W1';
rollback;
