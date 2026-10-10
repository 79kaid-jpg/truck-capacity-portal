\set ON_ERROR_STOP 0
select 'PMY-'||to_char(app.today(),'DDMMYY')||'-DK-01' as tr, 'PMY-'||to_char(app.today(),'DDMMYY')||'-DK-09' as tr9 \gset
select app.today()+3+(extract(dow from app.today()+3)=0)::int as d3 \gset
select (app.day_metrics('PMY',app.today())->>'avail') avail_before, app.truck_load(:'tr') load_dk01;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
\echo '--- no reason / out of range'
select set_truck_info(:'tr', 25, '51C-111.11', 'Anh Tư', '0909', '');
select set_truck_info(:'tr', 40, '', '', '', 'thử');
\echo '--- lower DK-01 to 25 t (loaded 26) -> over 1 t'
select set_truck_info(:'tr', 25, '51C-111.11', 'Anh Tư', '0909', 'Xe NCC chỉ chở 25 t');
\echo '--- raise DK-09 to 32 t'
select set_truck_info(:'tr9', 32, '', '', '', 'Xe lớn');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',false) \g /dev/null
select c->>'avail' customer_avail_after from jsonb_array_elements(get_state(current_date,current_date)->'calendar') c where c->>'wh'='PMY' and c->>'day'=current_date::text;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select set_truck_info(:'tr', 30, '', '', '', 'cs thử');
\echo '--- reset DK-09 to standard; plate-only update needs no reason'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select set_truck_info(:'tr9', null, '', '', '', '');
select set_truck_info(:'tr', 25, '51C-222.22', 'Anh Tư', '0909', '');
reset role;
select truck_code, cap, plate, reason from app.truck_days order by 1;
select (app.day_metrics('PMY',app.today())->>'avail') avail_now;
select count(*) capacity_notifs from app.notifications where type='Capacity' and text like '%tải trọng%';
