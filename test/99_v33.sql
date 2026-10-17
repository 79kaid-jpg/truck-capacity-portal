-- v3.3: xác nhận giao hàng sau ngày bốc -> nhập ngày bốc thực tế; xe thùng XT
\set CS  '00000000-0000-0000-0000-0000000000c1'
\echo --- 1. Xe thùng có mã XT
select string_agg(distinct type, ',' order by type) as types from app.daily_fleet f cross join lateral app.trucks(f.warehouse_code, f.day) where f.day = (select min(day) from app.daily_fleet where day >= current_date);
\echo --- 2. Đơn Đã xếp xe ở ngày đã qua
select b.id as bk, b.change_count as cc0 from app.bookings b join app.customers c on c.id = b.customer_id
 where b.status = 'ok' and exists (select 1 from app.allocations a where a.booking_id = b.id) order by b.id limit 1 \gset
update app.bookings set day = current_date - 3 where id = :'bk';
insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason) values ('JM2', current_date + 1, 9, 4, 'test') on conflict do nothing;
select set_config('request.jwt.claim.sub', :'CS', false);
\set coils '[{"lot":"V33-1","qty":"10","whs":"JM2"},{"lot":"V33-2","qty":"10","whs":"JM2"}]'
\echo expect ERROR "đã qua: nhập Ngày bốc thực tế"
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1', 'province', 'TP. Hồ Chí Minh', 'coils', :'coils'::jsonb, 'force', true, 'rest_mode', 'drop', 'rest_reason', 'x', 'update_tons', true));
\echo expect ERROR "từ hôm nay trở đi"
select public.confirm_delivery(jsonb_build_object('id', :'bk', 'address', 'KCN Phú Mỹ 1', 'province', 'TP. Hồ Chí Minh', 'coils', :'coils'::jsonb, 'force', true, 'actual_day', current_date - 1));
\echo --- 3. Ngày bốc thực tế = ngày mai: chuyển ngày, gỡ xe, Chờ xếp xe, không tính lần đổi ngày, báo Logistics
select (r->>'day') = (current_date + 1)::text as moved, r->>'status' as status from (select public.confirm_delivery(jsonb_build_object('id', :'bk',
  'address', 'KCN Phú Mỹ 1', 'province', 'TP. Hồ Chí Minh', 'coils', (select jsonb_agg(jsonb_build_object('lot', 'V33-' || g, 'qty', (app.bk_total(:'bk') / 2)::text, 'whs', 'JM2')) from generate_series(1, 2) g),
  'force', true, 'actual_day', current_date + 1)) r) x;
select status, day = current_date + 1 as new_day, original_day is not null as has_orig, change_count = :cc0 as cc_same,
       (select count(*) from app.allocations where booking_id = :'bk') as allocs, (select count(*) from app.delivery_items where booking_id = :'bk') as coils
  from app.bookings where id = :'bk';
select count(*) > 0 as logistics_notified from app.notifications where type = 'Giao hàng gấp' and text like :'bk' || '%';
select detail from app.audit_log where entity_id = :'bk' and detail like 'Đổi ngày bốc%' order by at desc limit 1;
