\set ON_ERROR_STOP 1
select array_agg(id order by id) as ids from (select id from app.bookings where status='hold' and day=app.today() order by id limit 3) x \gset
select (select id from app.bookings where status='hold' and day=app.today() order by id offset 3 limit 1) as h4,
       (select id from app.bookings where status='hold' and day=app.today() order by id offset 4 limit 1) as h5 \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select reject_booking(:'h4','Hết xe','NO_TRUCK');
select propose_day(:'h5', app_today_plus_1, 'Thử') from (select (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1 as app_today_plus_1) z;
select skip_group('PMY', (now() at time zone 'Asia/Ho_Chi_Minh')::date, :'ids'::text[], 0.5);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select cancel_booking((:'ids'::text[])[1], 'Khách hủy', 'CUSTOMER');
-- state sizes per role
select 'logistics' r, jsonb_array_length(s->'bookings') bk, jsonb_array_length(s->'allocs') al, jsonb_array_length(s->'customers') cu, jsonb_array_length(s->'notifs') nt, s ? 'calendar' cal
  from (select get_state(date_trunc('month',now())::date-7, date_trunc('month',now())::date+52) s) x
  where set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) is not null;
select 'sales DD' r, jsonb_array_length(s->'bookings') bk,
       (select count(*) from jsonb_array_elements(s->'bookings') b where b->>'customerId'='__other') masked,
       jsonb_array_length(s->'customers') cu
  from (select get_state(date_trunc('month',now())::date-7, date_trunc('month',now())::date+52) s) x
  where set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false) is not null;
select 'customer' r, jsonb_array_length(s->'bookings') bk, jsonb_array_length(s->'calendar') cal, s ? 'fleet' has_fleet, s ? 'allocs' has_alloc,
       (select string_agg(distinct k, ',') from jsonb_array_elements(s->'calendar') c, jsonb_object_keys(c) k) cal_keys,
       (select string_agg(distinct k, ',') from jsonb_array_elements(s->'bookings') c, jsonb_object_keys(c) k) bk_keys
  from (select get_state(date_trunc('month',now())::date-7, date_trunc('month',now())::date+52) s) x
  where set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',false) is not null;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',false);
select c->>'day', c->>'avail', c->>'status' from jsonb_array_elements(get_state(current_date, current_date+3)->'calendar') c where c->>'wh'='PMY';
select set_config('request.jwt.claim.sub','',false);
select get_state(current_date, current_date);
reset role;
set role anon;
\set ON_ERROR_STOP 0
select get_state(current_date, current_date);
select app.today();
