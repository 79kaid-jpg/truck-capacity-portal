-- v3.27: mở lại đơn Đã load; khóa tải trọng xe đã chạy
\set LOG '00000000-0000-0000-0000-0000000000b1'
\set KH  '00000000-0000-0000-0000-0000000000e1'
update app.settings set value = 'false' where key = 'requirePicking';
select a.truck_code as trk, b.id as bk from app.allocations a join app.bookings b on b.id = a.booking_id where b.status = 'ok' and b.day >= current_date
  and not exists (select 1 from app.allocations a2 where a2.booking_id = b.id and a2.truck_code <> a.truck_code) order by b.day limit 1 \gset
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.mark_loaded(:'bk', '{}', '')->>'short' as loaded;
\echo expect ERROR lý do
select public.unload_booking(:'bk', '');
select public.unload_booking(:'bk', 'Xếp lại hàng cho cân xe');
select status = 'ok' as back_ok, loaded_at is null as cleared from app.bookings where id = :'bk';
select count(*) > 0 as audit from app.audit_log where entity_id = :'bk' and detail like 'Mở lại để điều chỉnh%';
select count(*) = 0 as kh_not_notified from app.notifications where user_id = :'KH' and text like '%mở lại%';
\echo --- đã load lại rồi Đang giao → không mở lại được, khóa tải trọng
select public.mark_loaded(:'bk', '{}', '')->>'short' as loaded2;
select public.mark_transit(:'bk', null);
\echo expect ERROR chỉ Đã load
select public.unload_booking(:'bk', 'thử lại');
\echo expect ERROR tải trọng
select public.set_truck_info(:'trk', 12, null, null, null, 'thử');
select public.set_truck_info(:'trk', (select cap from app.trucks(split_part(:'trk','-',1), to_date(split_part(:'trk','-',2),'DDMMYY')) where code = :'trk'), '51C-999.99', 'Tài xế A', null, null) is not null as plate_ok;
