\set ON_ERROR_STOP 0
select id as kh_dd from app.customers where code='KH0102' \gset
select id as kh_da from app.customers where code='KH0201' \gset
select a.id as addr_dd from app.customer_addresses a where customer_id=:'kh_dd' limit 1 \gset
select a.id as addr_da from app.customer_addresses a where customer_id=:'kh_da' limit 1 \gset
select app.today()+2+(extract(dow from app.today()+2)=0)::int as d \gset
set role authenticated;
\echo '--- perms per role'
select r, jsonb_array_length(get_state(current_date,current_date)->'perms') n, get_state(current_date,current_date) ? 'roleMatrix' matrix
 from (values ('admin','00000000-0000-0000-0000-00000000000a'),('logistics','00000000-0000-0000-0000-0000000000b1'),('cs','00000000-0000-0000-0000-0000000000c1'),('sales','00000000-0000-0000-0000-0000000000d1'),('customer','00000000-0000-0000-0000-0000000000e1')) v(r,u)
 where set_config('request.jwt.claim.sub',u,false) is not null;
\echo '--- admin does CS + Logistics work'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false) \g /dev/null
select save_booking(jsonb_build_object('mode','hold','wh','PMY','day',:'d','customer_id',:'kh_dd','ref','SO-ADM','address_id',:'addr_dd','region','PMY-HCM','lines',jsonb_build_array(jsonb_build_object('p','INOK','c','Không màu','th',0.5,'w',1200,'t',10)))) as bk \gset
select :'bk' admin_booking, place_on_truck(:'bk','PMY-'||to_char(:'d'::date,'DDMMYY')||'-CN-04',10) full_on_truck;
select confirm_group(array[:'bk']) confirmed;
\echo '--- admin turns off CS cancel, grants Sales booking.create; tries to drop own perms.manage'
select get_state(current_date,current_date)->'roleMatrix' as m \gset
select save_role_permissions(jsonb_build_object(
  'cs', (:'m'::jsonb->'cs') - 'booking.cancel',
  'sales', (:'m'::jsonb->'sales') || '["booking.create"]'::jsonb,
  'admin', '[]'::jsonb)) changed_roles;
select get_state(current_date,current_date)->'roleMatrix'->'admin' admin_after_empty;
\echo '--- CS cancel now blocked'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select cancel_booking(:'bk','test');
\echo '--- Sales DD creates for own customer (ok) and for DA customer (blocked)'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false) \g /dev/null
select save_booking(jsonb_build_object('mode','draft','wh','PMY','day',:'d','customer_id',:'kh_dd','lines','[]'::jsonb)) sales_own;
select save_booking(jsonb_build_object('mode','draft','wh','PMY','day',:'d','customer_id',:'kh_da','lines','[]'::jsonb)) sales_other;
select upsert_fleet('PMY','[]'::jsonb);
\echo '--- customer blocked'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',false) \g /dev/null
select save_booking(jsonb_build_object('mode','draft','wh','PMY','day',:'d','customer_id',:'kh_dd','lines','[]'::jsonb));
\echo '--- non-admin cannot edit matrix; reset by admin'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select reset_role_permissions();
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false) \g /dev/null
select reset_role_permissions();
select k, jsonb_array_length(v) from jsonb_each(get_state(current_date,current_date)->'roleMatrix') x(k,v);
