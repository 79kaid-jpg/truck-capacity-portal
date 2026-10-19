-- v3.16: xe đã chạy bị khóa, chỗ trống không tính vào còn đặt được
-- "Hôm nay" theo Portal (app.today), lấy trước khi đổi vai trò
select app.today() as td \gset
\set LOG '00000000-0000-0000-0000-0000000000b1'
\set AD '00000000-0000-0000-0000-00000000000a'
select set_config('request.jwt.claim.sub', :'AD', false);
select public.update_settings('{"requirePicking": false}');
select a.truck_code as tk, b.id as bk, b.warehouse_code as wh, b.day as d from app.allocations a join app.bookings b on b.id = a.booking_id
 where b.status = 'ok' and b.day > :'td'::date and app.truck_load(a.truck_code) < (select cap from app.trucks(b.warehouse_code, b.day) t where t.code = a.truck_code) - 1
 order by b.day limit 1 \gset
select (app.day_metrics(:'wh', :'d')->>'avail')::numeric as avail0 \gset
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.mark_loaded(:'bk', '{}', null) is not null as loaded;
select app.truck_departed(:'tk') as departed_after_load;
select public.mark_transit(:'bk', null);
select app.truck_departed(:'tk') as departed_after_transit;
select (app.day_metrics(:'wh', :'d')->>'avail')::numeric < :avail0 as avail_dropped;
select id as hold from app.bookings where status = 'hold' and warehouse_code = :'wh' and day = :'d' limit 1 \gset
\echo expect ERROR đã chạy (nếu có booking hold cùng ngày)
select public.place_on_truck(:'hold', :'tk', 1) where :'hold' <> '';
