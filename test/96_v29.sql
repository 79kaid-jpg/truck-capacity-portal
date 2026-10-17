-- v2.9 (SRS mục 14): nhập nhiều dòng, ngày nghỉ có xe, đổi ngày có lý do, đơn khẩn, hủy cận ngày,
-- xác nhận giao hàng + danh sách cuộn, load / giao / giao lỗi, tách đơn, đóng xe.
\set CS  '00000000-0000-0000-0000-0000000000c1'
\set LOG '00000000-0000-0000-0000-0000000000b1'
\set ADM '00000000-0000-0000-0000-00000000000a'
select (current_date + ((7 - extract(dow from current_date)::int) % 7 + 7))::text as sun \gset
select (current_date + 1)::text as d1, (current_date + 2)::text as d2, (current_date + 5)::text as d5 \gset
-- Ngày mai / mốt / +5 luôn có khai báo xe (test không phụ thuộc thứ trong tuần)
insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason)
select 'JM2', current_date + g, 9, 4, 'test' from generate_series(1, 5) g on conflict do nothing;

\echo --- 1. Nhập nhiều dòng: dòng 2 sai mã khách, dòng 3 vượt sức chứa -> 1 nhận, 2 không nhận, dòng 3 có ngày gợi ý
begin;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select x->>'row' as row, x->>'ok' as ok, left(coalesce(x->>'id', x->>'error'), 70) as result, jsonb_array_length(coalesce(x->'suggest', '[]')) as n_suggest
  from jsonb_array_elements(public.bulk_create_bookings(jsonb_build_array(
    jsonb_build_object('wh', 'JM2', 'day', :'d5', 'code', 'KH0101', 'tons', '12,5'),
    jsonb_build_object('wh', 'JM2', 'day', :'d5', 'code', 'XX999', 'tons', 10),
    jsonb_build_object('wh', 'JM2', 'day', :'d5', 'code', 'KH0102', 'tons', 250)), 'hold')->'rows') x;
\echo --- lưu tạm cả lô không cần khai báo xe (Chủ nhật chưa có xe)
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'sun', 'code', 'KH0101', 'tons', 5)), 'draft'))->>'ok' as draft_ok;
rollback;

\echo --- 2. Ngày nghỉ: Chủ nhật chưa khai báo xe -> chỉ Lưu tạm; Logistics khai báo xe cần lý do; sau đó giữ chỗ được, có cảnh báo
begin;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'sun', 'code', 'KH0101', 'tons', 5)), 'hold'))->'rows'->0->>'error' as err_sun;
select set_config('request.jwt.claim.sub', :'LOG', true);
\echo expect ERROR "nhập lý do khi khai báo xe giao ngày nghỉ"
savepoint a;
select public.upsert_fleet('JM2', jsonb_build_array(jsonb_build_object('day', :'sun', 'dk', 2, 'cn', 1, 'reason', '')));
rollback to a;
select public.upsert_fleet('JM2', jsonb_build_array(jsonb_build_object('day', :'sun', 'dk', 2, 'cn', 1, 'reason', 'Khách cần gấp')));
reset role;
select app.day_metrics('JM2', :'sun')->>'status' as sun_status, app.day_metrics('JM2', :'sun')->>'cap' as sun_cap;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'sun', 'code', 'KH0101', 'tons', 5)), 'hold'))->'rows'->0->>'holiday' as held_on_holiday;
reset role;
select count(*) as logistics_notified from app.notifications where text like '⚠ GIAO NGÀY NGHỈ%';
set local role authenticated;
rollback;

\echo --- 3. Đổi ngày booking đã giữ chỗ: thiếu lý do -> ERROR; có lý do -> giữ ngày gốc, đếm 1 lần đổi
begin;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'d5', 'code', 'KH0101', 'tons', 8)), 'hold'))->'rows'->0->>'id' as bk \gset
reset role;
select customer_id as cu from app.bookings where id = :'bk' \gset
set local role authenticated;
savepoint a;
\echo expect ERROR "chọn lý do và bên yêu cầu"
select public.save_booking(jsonb_build_object('id', :'bk', 'mode', 'hold', 'wh', 'JM2', 'day', :'d2', 'customer_id', :'cu', 'tons', 8));
rollback to a;
select public.save_booking(jsonb_build_object('id', :'bk', 'mode', 'hold', 'wh', 'JM2', 'day', :'d2', 'customer_id', :'cu', 'tons', 8,
                           'change_reason', 'CUST_REQ', 'change_by', 'customer', 'change_note', 'Khách xin lùi'));
reset role;
select original_day = :'d5'::date as keeps_original, day = :'d2'::date as new_day, change_count, status from app.bookings where id = :'bk';
set local role authenticated;
reset role;
select reason_code, note from app.booking_status_history where booking_id = :'bk' order by id desc limit 1;
set local role authenticated;
rollback;

\echo --- 4. Đơn khẩn: giữ chỗ cho ngày mai sau 16:00 hôm nay -> khẩn; Admin bỏ cờ cần lý do
begin;
reset role;
insert into app.settings values ('cutoff', '"00:00"') on conflict (key) do update set value = excluded.value;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'d1', 'code', 'KH0101', 'tons', 3)), 'hold'))->'rows'->0->>'id' as bk \gset
reset role;
select urgent from app.bookings where id = :'bk';
set local role authenticated;
reset role;
select type from app.notifications where text like :'bk' || '%' and type = 'Đơn khẩn' limit 1;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'ADM', true);
savepoint a;
\echo expect ERROR "Nhập lý do đặt cờ khẩn"
select public.set_urgent(:'bk', 'off', '');
rollback to a;
select public.set_urgent(:'bk', 'off', 'Khách tự lấy hàng');
reset role;
select urgent, urgent_override from app.bookings where id = :'bk';
set local role authenticated;
rollback;

\echo --- 5. Hủy cận ngày: booking đã xác nhận, sau mốc chốt -> late_cancel, giữ xe trong nhật ký
begin;
reset role;
insert into app.settings values ('cutoff', '"00:00"') on conflict (key) do update set value = excluded.value;
set local role authenticated;
reset role;
select id as bk from app.bookings where status = 'ok' order by day, id limit 1 \gset
update app.bookings set day = current_date + 1 where id = :'bk';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select public.cancel_booking(:'bk', 'Khách hủy gấp', 'CUSTOMER');
reset role;
select status, late_cancel from app.bookings where id = :'bk';
set local role authenticated;
reset role;
select detail like 'Hủy quá cận ngày giao%Xe đã gán: __-__ %' as audit_ok from app.audit_log where entity_id = :'bk' order by id desc limit 1;
set local role authenticated;
rollback;

\echo --- 6. Xác nhận giao hàng
begin;
reset role;
update app.customers set erp_code = 'C0101' where code = 'KH0101';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'d5', 'code', 'KH0101', 'tons', 30)), 'hold'))->'rows'->0->>'id' as bk \gset
\echo expect ERROR thiếu địa chỉ
savepoint a;
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', '', 'coils', '[{"lot":"L1","qty":5}]'::jsonb));
rollback to a;
\echo expect ERROR Lot trùng
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1', 'coils', '[{"lot":"L1","qty":5},{"lot":"L1","qty":5}]'::jsonb));
rollback to a;
\echo expect ERROR hai khách
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1', 'coils', '[{"lot":"L1","qty":5,"customer":"C0101"},{"lot":"L2","qty":5,"customer":"C0999"}]'::jsonb));
rollback to a;
\echo expect ERROR cảnh báo (hint warn): Customer khác Mã KH ERP, Whs khác kho
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1',
  'coils', '[{"whs":"JD8","lot":"L1","qty":10,"customer":"C0999"},{"whs":"JM2","lot":"L2","qty":8.88,"customer":"C0999"}]'::jsonb));
rollback to a;
\echo expect ERROR thiếu tấn (hint short): 18,88 / 30
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1', 'force', true,
  'coils', '[{"whs":"JD8","lot":"L1","qty":10,"customer":"C0999"},{"whs":"JM2","lot":"L2","qty":8.88,"customer":"C0999"}]'::jsonb));
rollback to a;
\echo --- thiếu tấn -> Tách đơn chờ hẹn (Nháp): đơn gốc 18,88 t, đơn -2 Nháp 11,12 t
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1', 'force', true, 'rest_mode', 'split',
  'coils', '[{"whs":"JD8","order_no":"SO-7788","lot":"L1","qty":10,"customer":"C0999"},{"whs":"JM2","lot":"L2","qty":8.88,"customer":"C0999"}]'::jsonb)) - 'child' as res;
reset role;
select id, status, app.bk_total(id) as tons, requested_tons, ref, address_text, parent_id from app.bookings where id = :'bk' or parent_id = :'bk' order by id;
set local role authenticated;
\echo --- cuộn L1 không dùng lại được cho booking khác (expect ERROR)
reset role;
select id as other from app.bookings where status = 'hold' and day = :'d5'::date and id <> :'bk' and parent_id is null order by id limit 1 \gset
set local role authenticated;
select (public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh', 'JM2', 'day', :'d5', 'code', 'KH0102', 'tons', 10)), 'hold'))->'rows'->0->>'id' as other \gset
savepoint b;
select public.confirm_delivery(jsonb_build_object('id', :'other', 'address', 'X', 'coils', '[{"lot":"L1","qty":10}]'::jsonb));
rollback to b;
\echo --- 7. Logistics xếp xe, load bỏ 1 cuộn -> load thiếu; CS tách phần còn lại sang ngày khác
select set_config('request.jwt.claim.sub', :'LOG', true);
reset role;
select app.truck_code('JM2', :'d5'::date, 'DK', 9) as t9 \gset
set local role authenticated;
select public.save_allocations(:'bk', jsonb_build_array(jsonb_build_object('truck', :'t9', 'tons', 18.88)), 'test', true);
reset role;
select status from app.bookings where id = :'bk';
set local role authenticated;
\echo expect ERROR cần ghi chú khi bỏ cuộn
savepoint c;
select public.mark_loaded(:'bk', array['L2'], '');
rollback to c;
select public.mark_loaded(:'bk', array['L2'], 'Cuộn L2 móp');
reset role;
select status, short_tons from app.bookings where id = :'bk';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
select public.resolve_short(:'bk', 'drop', null, 'NO_STOCK', 'Hết hàng') as child_none;
reset role;
select app.bk_total(id) as tons, undelivered_tons, short_tons, app.alloc_sum(id) as on_truck from app.bookings where id = :'bk';
set local role authenticated;
\echo --- 8. Đang giao -> Giao không thành công -> CS giao lại (Chờ xếp xe ngày mới, giữ cuộn)
select set_config('request.jwt.claim.sub', :'LOG', true);
select public.mark_transit(:'bk', now() + interval '3 hours');
select public.mark_failed(:'bk', 'Khách đóng cửa', 'CUST_CLOSED');
reset role;
select status, app.alloc_sum(id) as on_truck from app.bookings where id = :'bk';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
reset role;
select customer_id as cu from app.bookings where id = :'bk' \gset
set local role authenticated;
select public.save_booking(jsonb_build_object('id', :'bk', 'mode', 'hold', 'wh', 'JM2', 'day', :'d2', 'customer_id', :'cu', 'tons', 10,
                           'address_id', 'new', 'street', 'KCN Phú Mỹ 1', 'change_reason', 'CUST_NOT_READY', 'change_by', 'customer'));
reset role;
select status, day = :'d2'::date as new_day, (select count(*) from app.delivery_items where booking_id = :'bk') as coils_kept from app.bookings where id = :'bk';
set local role authenticated;
\echo --- giao lại -> load -> đã giao; hủy đơn đã giao -> expect ERROR "đã đóng"
select set_config('request.jwt.claim.sub', :'LOG', true);
reset role;
select app.truck_code('JM2', :'d2'::date, 'XT', 4) as c4 \gset
set local role authenticated;
select public.save_allocations(:'bk', jsonb_build_array(jsonb_build_object('truck', :'c4', 'tons', 10)), 'test', true);
select public.mark_loaded(:'bk', '{}', '');
select public.mark_delivered(:'bk', now());
reset role;
select status from app.bookings where id = :'bk';
set local role authenticated;
select set_config('request.jwt.claim.sub', :'CS', true);
savepoint d;
select public.cancel_booking(:'bk', 'x', 'OTHER');
rollback to d;
rollback;

\echo --- 9. Đóng xe: không xếp thêm; mở lại về tải trọng chuẩn
begin;
select set_config('request.jwt.claim.sub', :'LOG', true);
set local role authenticated;
reset role;
select app.truck_code('JM2', :'d5'::date, 'DK', 8) as tk \gset
set local role authenticated;
reset role;
select set_config('request.jwt.claim.sub', :'CS', true);
select x->>'id' as h1 from jsonb_array_elements(public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh','JM2','day',:'d5','code','KH0101','tons',20)), 'hold')->'rows') x \gset
select x->>'id' as h2 from jsonb_array_elements(public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh','JM2','day',:'d5','code','KH0102','tons',20)), 'hold')->'rows') x \gset
select set_config('request.jwt.claim.sub', :'LOG', true);
set local role authenticated;
select public.place_on_truck(:'h1', :'tk', 10);
select (public.close_truck(:'tk', true, 'Đủ hàng'))->>'cap' as day_cap_after_close;
reset role;
select cap, closed from app.truck_days where truck_code = :'tk';
set local role authenticated;
\echo expect ERROR xe đã đóng
savepoint e;
select public.place_on_truck(:'h2', :'tk', 1);
rollback to e;
select (public.close_truck(:'tk', false, '', null))->>'cap' as day_cap_after_open;
reset role;
select cap, closed from app.truck_days where truck_code = :'tk';
set local role authenticated;
rollback;

\echo --- 10. Email: việc gấp vào hàng gửi ngay, còn lại vào tóm tắt; mức "Chỉ việc gấp" bỏ tóm tắt; email nhận riêng
begin;
update app.settings set value = 'true' where key = 'emailOn';
select set_config('request.jwt.claim.sub', :'CS', true);
set local role authenticated;
select public.set_email_prefs('urgent', 'truc@outlook.com');
reset role;
select app.notify(array[:'CS'::uuid, :'LOG'::uuid], 'Đơn khẩn', 'BK-TEST khẩn');
select app.notify(array[:'CS'::uuid, :'LOG'::uuid], 'Xác nhận', 'BK-TEST đã xác nhận');
select to_email, left(subject, 40) as subject from app.email_outbox order by id;
select p.email, d.type from app.email_digest_items d join app.profiles p on p.user_id = d.user_id order by d.id;
select app.send_digests(true) as digests_sent;
select to_email, left(subject, 30) as subject from app.email_outbox order by id;
rollback;
