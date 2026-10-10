-- Phạm vi thống kê: Sales mặc định khách mình; DD/DA = toàn segment; khách hàng không gọi được
\echo --- s1 mặc định own: chỉ khách của s1
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',true); set local role authenticated;
select (public.booking_stats(current_date-40, current_date+40))->>'scope' as scope,
       (select bool_and(c->>'salesId' = '00000000-0000-0000-0000-0000000000d1') from jsonb_array_elements((public.booking_stats(current_date-40, current_date+40))->'customers') c) as only_own;
rollback;
\echo --- s1 phạm vi DA: thấy khách Dự án (của s2), không thấy Dân dụng
begin;
update app.profiles set stat_scope = 'DA' where user_id = '00000000-0000-0000-0000-0000000000d1';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',true); set local role authenticated;
select (select bool_and(c->>'segment' = 'DA') from jsonb_array_elements((public.booking_stats(current_date-40, current_date+40))->'customers') c) as only_da,
       jsonb_array_length((public.booking_stats(current_date-40, current_date+40))->'rows') > 0 as has_rows;
rollback;
\echo --- Khách hàng gọi -> expect ERROR
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',true); set local role authenticated;
select public.booking_stats(current_date, current_date+5);
rollback;
\echo --- Admin đặt phạm vi qua admin_upsert_profile; giá trị sai -> expect ERROR
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true); set local role authenticated;
select public.admin_upsert_profile('{"email":"s1@demo.vn","name":"Phạm Quốc Bảo","role":"sales","phone":"0903","segment":"DD","wh":"PMY","stat_scope":"DD"}');
reset role; select stat_scope from app.profiles where email = 's1@demo.vn';
set local role authenticated;
select public.admin_upsert_profile('{"email":"s1@demo.vn","name":"Phạm Quốc Bảo","role":"sales","phone":"0903","segment":"DD","wh":"PMY","stat_scope":"xyz"}');
rollback;
