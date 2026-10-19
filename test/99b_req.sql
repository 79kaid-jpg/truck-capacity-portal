-- v3.13: yêu cầu đặt hàng
-- "Hôm nay" theo Portal (app.today), lấy trước khi đổi vai trò
select app.today() as td \gset
\set CS  '00000000-0000-0000-0000-0000000000c1'
\set KH  '00000000-0000-0000-0000-0000000000e1'
select user_id as sales from app.profiles where role = 'sales' and user_id in (select sales_user_id from app.customers) limit 1 \gset
select id as mycust from app.customers where sales_user_id = :'sales' limit 1 \gset
select id as other from app.customers where sales_user_id is distinct from :'sales' limit 1 \gset
\echo --- khách gửi yêu cầu
select set_config('request.jwt.claim.sub', :'KH', false);
select (r->>'id') as rid, r->>'status' as st, (r->>'byCust')::boolean as bycust from (select public.req_create(jsonb_build_object('wh','JM2','day',:'td'::date+2,'tons',50,'body','20MT HC 0.5 Xanh dương, 30MT Titan'))) x(r) \gset
\echo :rid :st :bycust
\echo expect ERROR ngày
select public.req_create(jsonb_build_object('wh','JM2','day',:'td'::date-1,'body','abc def'));
\echo expect ERROR CS mới xử lý
select public.req_update(:rid, 'done');
select count(*) > 0 as notified_cs from app.notifications where type = 'Yêu cầu' and user_id <> :'KH';
select jsonb_array_length(public.get_state(:'td'::date, :'td'::date + 30)->'reqs') as kh_sees;
\echo --- Sales: chỉ khách mình phụ trách
select set_config('request.jwt.claim.sub', :'sales', false);
select public.req_create(jsonb_build_object('customerId', :'mycust','wh','JM2','day',:'td'::date+3,'body','Anh Ánh 20MT HC 0.5 xanh dương'))->>'status' as sales_ok;
\echo expect ERROR không phụ trách
select public.req_create(jsonb_build_object('customerId', :'other','wh','JM2','day',:'td'::date+3,'body','abc def'));
\echo expect ERROR CS mới xử lý (sales done)
select public.req_update(:rid, 'done');
\echo --- CS xử lý
select set_config('request.jwt.claim.sub', :'CS', false);
\echo expect ERROR lý do
select public.req_update(:rid, 'declined', '');
select public.req_update(:rid, 'done', 'Đã tạo 2 đơn', 'BK-TEST')->>'status' as done;
\echo expect ERROR đã được xử lý
select public.req_update(:rid, 'cancelled');
select count(*) as kh_notified from app.notifications where user_id = :'KH' and text like 'Đã nhận yêu cầu%';
select jsonb_array_length(public.get_state(:'td'::date, :'td'::date + 30)->'reqs') as cs_sees;
