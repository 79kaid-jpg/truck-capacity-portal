-- v3.31: link tài xế, ảnh giao hàng, tổng quan khách, email tuần
-- "Hôm nay" theo Portal (app.today), lấy trước khi đổi vai trò
select app.today() as td \gset
\set LOG '00000000-0000-0000-0000-0000000000b1'
\set KH  '00000000-0000-0000-0000-0000000000e1'
\set S1  '00000000-0000-0000-0000-0000000000d1'
update app.settings set value = 'false' where key = 'requirePicking';
select a.truck_code as trk, b.id as bk from app.allocations a join app.bookings b on b.id = a.booking_id where b.status = 'ok' and b.day >= :'td'::date order by b.day limit 1 \gset
select set_config('request.jwt.claim.sub', :'KH', false);
\echo expect ERROR khách không tạo link
select public.driver_link_create(:'trk');
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.driver_link_create(:'trk')->>'token' as tok \gset
select public.driver_link_create(:'trk')->>'token' = :'tok' as same_token;
select public.mark_loaded(:'bk', '{}', '') is not null as loaded;
select set_config('request.jwt.claim.sub', '', false);
\echo expect ERROR link sai
select public.driver_get('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
select jsonb_array_length(public.driver_get(:'tok')->'stops') > 0 as stops;
select (public.driver_mark(:'tok', null, 'transit')->'stops'->0->>'status') is not null as transit_ok;
select status = 'transit' as is_transit from app.bookings where id = :'bk';
\echo expect ERROR không giao được thiếu lý do
select public.driver_mark(:'tok', :'bk', 'failed', '');
select public.driver_mark(:'tok', :'bk', 'delivered', 'Khách ký nhận', encode('\xffd8ffe000104a46'::bytea, 'base64')) is not null as delivered;
select status = 'delivered' as is_delivered from app.bookings where id = :'bk';
select count(*) = 1 as pod from app.pod_files where booking_id = :'bk';
select count(*) > 0 as cs_notified from app.notifications where type = 'Đã giao' and text like '%Tài xế%';
select set_config('request.jwt.claim.sub', :'LOG', false);
select jsonb_array_length(public.pod_list(:'bk')) = 1 as pod_list;
select public.driver_link_revoke(:'trk');
select set_config('request.jwt.claim.sub', '', false);
\echo expect ERROR đã thu hồi
select public.driver_get(:'tok');
\echo --- tổng quan khách
select set_config('request.jwt.claim.sub', :'S1', false);
select jsonb_typeof(public.cust_overview((select id from app.customers where sales_user_id = :'S1' limit 1))->'months') = 'array' as overview;
\echo expect ERROR khách không phụ trách
select public.cust_overview((select id from app.customers where sales_user_id is distinct from :'S1' limit 1));
\echo --- email tuần
select app.send_weekly(true) >= 0 as weekly;
