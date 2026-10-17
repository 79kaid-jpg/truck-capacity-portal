-- v3.15: phạm vi yêu cầu theo Sales, RSM (team), công tắc picking list, nhắc xác nhận giao
\set S1 '00000000-0000-0000-0000-0000000000d1'
\set S2 '00000000-0000-0000-0000-0000000000d2'
\set CS '00000000-0000-0000-0000-0000000000c1'
\set AD '00000000-0000-0000-0000-00000000000a'
\set LOG '00000000-0000-0000-0000-0000000000b1'
select id as c1 from app.customers where sales_user_id = :'S1' limit 1 \gset
select id as c2 from app.customers where sales_user_id = :'S2' limit 1 \gset
\echo --- 1. Sales chỉ thấy yêu cầu trong phạm vi
select set_config('request.jwt.claim.sub', :'S2', false);
select (public.req_create(jsonb_build_object('customerId', :'c2','wh','JM2','day',current_date+2,'body','S2 yêu cầu')) ->> 'id') as r2 \gset
select set_config('request.jwt.claim.sub', :'S1', false);
select (public.req_create(jsonb_build_object('customerId', :'c1','wh','JM2','day',current_date+2,'body','S1 yêu cầu')) ->> 'id') as r1 \gset
select string_agg(x->>'body', ',' order by x->>'body') as s1_sees from jsonb_array_elements(public.get_state(current_date, current_date+30)->'reqs') x;
\echo expect ERROR Chỉ người gửi hoặc CS (S1 hủy yêu cầu của S2)
select public.req_update(:r2, 'cancelled');
select set_config('request.jwt.claim.sub', :'CS', false);
select jsonb_array_length(public.get_state(current_date, current_date+30)->'reqs') as cs_sees;
\echo --- 2. RSM: S1 quản lý S2
update app.profiles set manager_id = :'S1' where user_id = :'S2';
update app.profiles set stat_scope = 'team', notify_team = true where user_id = :'S1';
select set_config('request.jwt.claim.sub', :'S1', false);
select string_agg(x->>'body', ',' order by x->>'body') as rsm_sees from jsonb_array_elements(public.get_state(current_date, current_date+30)->'reqs') x;
select jsonb_array_length(public.get_state(current_date, current_date+30)->'me'->'team') as team_n,
       (select count(*) from jsonb_array_elements(public.get_state(current_date, current_date+30)->'customers')) as rsm_customers,
       (select count(*) from jsonb_array_elements(public.get_state(current_date, current_date+30)->'bookings') b where b->>'customerId' = '__other') as masked;
select public.req_create(jsonb_build_object('customerId', :'c2','wh','JM2','day',current_date+3,'body','RSM gửi cho khách S2'))->>'status' as rsm_create;
select set_config('request.jwt.claim.sub', :'S2', false);
select string_agg(x->>'body', ',' order by x->>'body') as s2_sees from jsonb_array_elements(public.get_state(current_date, current_date+30)->'reqs') x;
\echo expect ERROR không phụ trách (S2 không thấy khách của RSM)
select public.req_create(jsonb_build_object('customerId', :'c1','wh','JM2','day',current_date+3,'body','abc def'));
\echo --- RSM nhận thông báo khi đơn nhóm bị từ chối
select b.id as bk2 from app.bookings b where b.customer_id in (select id from app.customers where sales_user_id = :'S2') and b.status = 'hold' limit 1 \gset
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.reject_booking(:'bk2', 'CAP', 'Kho đầy') is null as rejected;
select count(*) as rsm_notified from app.notifications where user_id = :'S1' and type = 'Từ chối';
\echo --- 3. Công tắc picking list
select set_config('request.jwt.claim.sub', :'CS', false);
\echo expect ERROR Chỉ Admin
select public.update_settings('{"requirePicking": false}');
select b.id as bk from app.bookings b where b.status = 'ok' and b.delivery_at is null limit 1 \gset
select set_config('request.jwt.claim.sub', :'LOG', false);
\echo expect ERROR chưa có danh sách cuộn
select public.mark_loaded(:'bk', '{}', null);
select set_config('request.jwt.claim.sub', :'AD', false);
select public.update_settings('{"requirePicking": false}');
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.mark_loaded(:'bk', '{}', null)->>'status' as loaded_without_coils;
select status, short_tons from app.bookings where id = :'bk';
\echo --- 4. Đang giao báo Sales; nhắc chưa xác nhận giao
select public.mark_transit(:'bk', now() - interval '8 hours');
select count(*) > 0 as sales_transit from app.notifications n join app.bookings b on b.id = :'bk' join app.customers c on c.id = b.customer_id where n.user_id = c.sales_user_id and n.type = 'Đang giao';
update app.bookings set day = current_date - 3 where id = :'bk';
select app.escalate() >= 0 as ran;
-- chỉ nhắc 7h–20h giờ VN: ngoài giờ thì kỳ vọng 0
select extract(hour from now() at time zone 'Asia/Ho_Chi_Minh') between 7 and 20 as work_hours,
       count(*) filter (where user_id = :'LOG') as log_n, count(*) filter (where user_id = :'AD') as admin_n
  from app.notifications where type = 'Nhắc việc' and link->>'bk' = :'bk';
select app.escalate() >= 0 as ran2;
select count(*) as still_once from app.notifications where type = 'Nhắc việc' and link->>'bk' = :'bk' and user_id = :'LOG';
