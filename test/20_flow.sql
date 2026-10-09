\set ON_ERROR_STOP 1
select id as kh from app.customers where code='KH0102' \gset
select id as kh2 from app.customers where code='KH0201' \gset
select a.id as addr from app.customer_addresses a join app.customers c on c.id=a.customer_id where c.code='KH0102' \gset
select app.today() + case when extract(dow from app.today()+2)=0 then 3 else 2 end as d2 \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select admin_upsert_profile(jsonb_build_object('email','kh@demo.vn','name','Văn Phú','role','customer','customer_id',:'kh'));
-- CS: hold booking
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select save_booking(jsonb_build_object('mode','hold','wh','PMY','day',:'d2','customer_id',:'kh','ref','SO-TEST1','address_id',:'addr','region','PMY-HCM',
  'lines',jsonb_build_array(jsonb_build_object('p','Hoa Cương','c','Xám Trắng','th',0.45,'w',1200,'t',22)))) as bk \gset
select :'bk';
-- draft with new address
select save_booking(jsonb_build_object('mode','draft','wh','PMY','day',:'d2','customer_id',:'kh2','address_id','new','province','Đồng Nai','ward','Phường X','street','12 Đường A','save_addr',true,'region','PMY-DNA',
  'lines',jsonb_build_array(jsonb_build_object('p','INOK','c','Không màu','th',0.5,'w',1200,'t',5)))) as dr \gset
-- Logistics allocate & confirm
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select save_allocations(:'bk', jsonb_build_array(jsonb_build_object('truck','PMY-'||to_char(:'d2'::date,'DDMMYY')||'-DK-05','tons',22)), '', true);
-- CN preferred? 22>15 so DK fine. Try CN for over-capacity => need reason
\set ON_ERROR_STOP 0
select save_allocations(:'bk', jsonb_build_array(jsonb_build_object('truck','PMY-'||to_char(:'d2'::date,'DDMMYY')||'-CN-01','tons',22)), '', true);
\set ON_ERROR_STOP 1
-- CS edits tons on confirmed -> back to hold (BR-11)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select save_booking(jsonb_build_object('id',:'bk','mode','hold','wh','PMY','day',:'d2','customer_id',:'kh','ref','SO-TEST1','address_id',:'addr','region','PMY-HCM',
  'lines',jsonb_build_array(jsonb_build_object('p','Hoa Cương','c','Xám Trắng','th',0.45,'w',1200,'t',25))));
reset role; select id,status,(select count(*) from app.allocations a where a.booking_id=b.id) n_alloc from app.bookings b where id=:'bk'; set role authenticated;
-- logistics: place_on_truck, edit move, confirm_group, fleet, propose, reject
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select place_on_truck(:'bk','PMY-'||to_char(:'d2'::date,'DDMMYY')||'-DK-06',20);
select place_on_truck(:'bk','PMY-'||to_char(:'d2'::date,'DDMMYY')||'-DK-07',5);
select edit_allocation(:'bk','PMY-'||to_char(:'d2'::date,'DDMMYY')||'-DK-07','move',5,'PMY-'||to_char(:'d2'::date,'DDMMYY')||'-DK-06','gom 1 xe');
select confirm_group(array[:'bk']);
select upsert_fleet('PMY', jsonb_build_array(jsonb_build_object('day',:'d2','dk',8,'cn',4,'reason','test')));
\set ON_ERROR_STOP 0
select upsert_fleet('PMY', jsonb_build_array(jsonb_build_object('day',:'d2','dk',5,'cn',4,'reason','test')));
\set ON_ERROR_STOP 1
select update_settings('{"near":85}');
select add_region('PMY','Tây Ninh','Tây Ninh',1,array['PMY-LAN']);
select catalog_save('products',null,'SP06','Tôn sóng ngói',null);
select catalog_save('thicks',null,null,null,0.6);
select catalog_toggle('colors','M05');
-- hold bookings today: group
select id as h1 from app.bookings where status='hold' and day=app.today() order by id limit 1 \gset
