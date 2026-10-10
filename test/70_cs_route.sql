\set ON_ERROR_STOP 0
-- 2 CS: Trúc (c1) phụ trách KH0105, CS2 (c2) là người nhận thay
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000c2','cs2@demo.vn');
insert into app.profiles(user_id,full_name,email,role) values ('00000000-0000-0000-0000-0000000000c2','Lê Thu CS2','cs2@demo.vn','cs');
update app.customers set cs_user_id='00000000-0000-0000-0000-0000000000c1' where code='KH0105';
select id as kh from app.customers where code='KH0105' \gset
select id as kh_nocs from app.customers where code='KH0107' \gset
select a.id as addr from app.customer_addresses a where customer_id=:'kh' limit 1 \gset
select a.id as addr2 from app.customer_addresses a where customer_id=:'kh_nocs' limit 1 \gset
select app.today()+2+(extract(dow from app.today()+2)=0)::int as d \gset
set role authenticated;
\echo '--- Admin books for KH0105 -> CS of record becomes Trúc'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false) \g /dev/null
select save_booking(jsonb_build_object('mode','hold','wh','PMY','day',:'d','customer_id',:'kh','ref','222','address_id',:'addr','region','PMY-DLK','lines',jsonb_build_array(jsonb_build_object('p','Hoa Cương','c','Không màu','th',0.35,'w',1070,'t',4)))) as bk \gset
select save_booking(jsonb_build_object('mode','hold','wh','PMY','day',:'d','customer_id',:'kh_nocs','ref','333','address_id',:'addr2','region','PMY-BDU','lines',jsonb_build_array(jsonb_build_object('p','Hoa Cương','c','Không màu','th',0.35,'w',1070,'t',3)))) as bk2 \gset
\echo '--- Trúc on leave, delegate CS2'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false) \g /dev/null
select set_away(null, current_date, current_date+3, '00000000-0000-0000-0000-0000000000c2');
\echo '--- Logistics proposes new day for both'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select propose_day(:'bk', :'d'::date+1, 'Hết xe');
select propose_day(:'bk2', :'d'::date+1, 'Hết xe');
reset role;
select n.link->>'bk' bk, p.full_name, p.role, left(n.text,60) txt from app.notifications n join app.profiles p on p.user_id=n.user_id where n.type='Đổi ngày' order by n.link->>'bk', p.role, p.full_name;
select cs_user_id = '00000000-0000-0000-0000-0000000000c1' assigned_to_truc from app.bookings where id=:'bk';
\echo '--- escalation (simulate 5h old)'
update app.bookings set updated_at = now() - interval '5 hours' where id in (:'bk', :'bk2');
select app.escalate() escalated; select app.escalate() escalated_again;
select count(distinct user_id) reminder_recipients from app.notifications where type='Nhắc việc';
\echo --- Người nhận thay phải là CS: chọn Sales -> expect ERROR; Sales tự đặt nghỉ -> expect ERROR; CS nhận thay đang nghỉ trùng -> expect ERROR
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true);
set local role authenticated;
select set_away(null, current_date, current_date+3, '00000000-0000-0000-0000-0000000000d1');
rollback;
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',true);
set local role authenticated;
select set_away(null, current_date, current_date+3, null);
rollback;
begin;
update app.profiles set away_from = current_date+1, away_to = current_date+5 where user_id = '00000000-0000-0000-0000-0000000000c2';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true);
set local role authenticated;
select set_away(null, current_date, current_date+3, '00000000-0000-0000-0000-0000000000c2');
rollback;
