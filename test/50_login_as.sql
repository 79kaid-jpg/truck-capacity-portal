\set ON_ERROR_STOP 0
select id as kh from app.customers where code='KH0102' \gset
select a.id as addr from app.customer_addresses a where customer_id=:'kh' limit 1 \gset
select app.today()+2+(extract(dow from app.today()+2)=0)::int as d \gset
insert into app.notifications(user_id,type,text) values('00000000-0000-0000-0000-0000000000c1','Test','chưa đọc');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false) \g /dev/null
\echo '--- admin starts Login as CS'
select impersonate_start('00000000-0000-0000-0000-0000000000c1');
select s->'me'->>'name' me, s->'me'->>'role' role, jsonb_array_length(s->'perms') perms, s->'imp'->>'by' by_ from (select get_state(current_date,current_date) s) x;
select save_booking(jsonb_build_object('mode','hold','wh','PMY','day',:'d','customer_id',:'kh','ref','SO-LA','address_id',:'addr','region','PMY-HCM','lines',jsonb_build_array(jsonb_build_object('p','INOK','c','Không màu','th',0.5,'w',1200,'t',5)))) as bk \gset
select mark_notifs_read(null);
select update_my_profile('Hack','1');
\echo '--- CS (real) cannot Login as; admin stops'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select impersonate_start('00000000-0000-0000-0000-00000000000a');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false) \g /dev/null
select impersonate_stop();
select get_state(current_date,current_date)->'me'->>'role' role_after_stop;
\echo '--- Login as customer, then expired session is ignored'
select impersonate_start('00000000-0000-0000-0000-0000000000e1')->>'role';
select get_state(current_date,current_date) ? 'calendar' customer_view;
reset role; update app.impersonations set expires_at = now() - interval '1 minute'; set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false) \g /dev/null
select get_state(current_date,current_date)->'me'->>'role' role_after_expiry;
reset role;
\echo '--- checks'
select cs_user_id = '00000000-0000-0000-0000-0000000000c1' booked_as_cs from app.bookings where id=:'bk';
select detail from app.audit_log where entity_id in (:'bk','login-as') order by id;
select count(*) unread_kept from app.notifications where user_id='00000000-0000-0000-0000-0000000000c1' and read_at is null and type='Test';
