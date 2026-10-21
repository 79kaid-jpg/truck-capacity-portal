-- v3.50: đặt theo ngày giao → hệ thống tính ngày bốc theo Zone; Cấu hình › Vận chuyển
\set AD '00000000-0000-0000-0000-00000000000a'
\set LOG '00000000-0000-0000-0000-0000000000b1'
\set CS '00000000-0000-0000-0000-0000000000c1'
\set S1 '00000000-0000-0000-0000-0000000000d1'
create function pg_temp.ok(b boolean, m text) returns void language plpgsql as $$
begin if not coalesce(b, false) then raise exception 'FAIL: %', m; end if; end $$;
update app.settings set value = 'true' where key = 'deliveryMode';
-- Đồng Nai (South East, 1 ngày): ngày giao D sao cho D−1 có xe, không phải ngày nghỉ, từ hôm nay +4
select x.d as dl, x.d - 1 as ld from generate_series(app.today() + 4, app.today() + 20, interval '1 day') g(d0), lateral (select d0::date d) x
 where exists (select 1 from app.daily_fleet f where f.warehouse_code = 'JM2' and f.day = x.d - 1) and not app.is_holiday('JM2', x.d - 1)
   and exists (select 1 from app.daily_fleet f where f.warehouse_code = 'JM2' and f.day = x.d - 2) and not app.is_holiday('JM2', x.d - 2)
 order by x.d limit 1 \gset
select id as cdn, (select id from app.customer_addresses a where a.customer_id = c.id) as adn from app.customers c where code = 'KH0106' \gset
select id as cdg, (select id from app.customer_addresses a where a.customer_id = c.id) as adg from app.customers c where code = 'KH0203' \gset

\echo --- hàm tính: Zone, số ngày riêng, đoán khu vực theo tỉnh cũ
select pg_temp.ok(app.region_days('PMY-DNA') = 1 and app.region_days('PMY-DNG') = 4 and app.region_days('PMY-BDI') = 2
                  and app.region_days('HPG-HGG') = 2 and app.region_days('CLO-QTR') = 2 and app.region_days('PMY-GLA') = 2, 'số ngày theo Zone / ngoại lệ');
select pg_temp.ok(app.guess_region('JD8', 'Thôn 3, Xã Yên Minh, Tỉnh Hà Giang', 'Tuyên Quang') = 'HPG-HGG', 'Hà Giang (cũ)');
select pg_temp.ok(app.guess_region('JD8', 'Số 5 đường Bình Thuận, Tuyên Quang', 'Tuyên Quang') = 'HPG-TQU', 'Tuyên Quang');
select pg_temp.ok(app.guess_region('JM2', '12 Nguyễn Huệ, TP. Quy Nhơn', 'Gia Lai') = 'PMY-BDI', 'Quy Nhơn → Bình Định');
select pg_temp.ok(app.guess_region('JM2', 'Q. Bình Tân, TPHCM', '') = 'PMY-HCM', 'TPHCM');
-- ngày bốc rơi vào Chủ nhật (nghỉ, chưa khai báo xe) → lùi về thứ Bảy
select pg_temp.ok(app.calc_load_day('JM2', 'PMY-HCM', d) = d - 2, 'lùi qua Chủ nhật')
  from (select x::date d from generate_series(app.today() + 30, app.today() + 40, interval '1 day') x where extract(dow from x) = 1 limit 1) m;

\echo --- CS đặt theo ngày giao: ngày bốc = ngày giao − 1; ngày bốc CS gửi lên bị bỏ qua
select set_config('request.jwt.claim.sub', :'CS', false);
select public.save_booking(jsonb_build_object('mode','hold','wh','JM2','delivery',:'dl','day',:'dl','customer_id',:'cdn','address_id',:'adn','tons',5)) as b1 \gset
select pg_temp.ok((select day = :'ld' and delivery_date = :'dl' and region_id = 'PMY-DNA' from app.bookings where id = :'b1'), 'CS: ngày bốc tự tính');

\echo --- Logistics: bốc sớm hơn được (không cần CS duyệt), muộn hơn bị chặn
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.set_load_day(:'b1', :'ld'::date - 1, 'còn xe trống');
select pg_temp.ok((select day = :'ld'::date - 1 and delivery_date = :'dl' and status = 'hold' from app.bookings where id = :'b1'), 'Logistics bốc sớm 1 ngày');
\echo expect ERROR muộn hơn ngày gợi ý
select public.set_load_day(:'b1', :'dl');
\echo expect ERROR Admin sửa đơn với ngày bốc muộn hơn gợi ý
select set_config('request.jwt.claim.sub', :'AD', false);
select public.save_booking(jsonb_build_object('id',:'b1','mode','hold','wh','JM2','delivery',:'dl','day',:'dl','customer_id',:'cdn','address_id',:'adn','tons',5,
  'change_reason',(select code from app.reason_codes where kind = 'change' limit 1),'change_by','logistics'));

\echo --- CS sửa ghi chú, ngày giao giữ nguyên → giữ ngày bốc Logistics đã chọn
select set_config('request.jwt.claim.sub', :'CS', false);
select public.save_booking(jsonb_build_object('id',:'b1','mode','hold','wh','JM2','delivery',:'dl','customer_id',:'cdn','address_id',:'adn','tons',5,'note','gọi trước'));
select pg_temp.ok((select day = :'ld'::date - 1 from app.bookings where id = :'b1'), 'giữ ngày bốc của Logistics');

\echo --- Đà Nẵng (Central, 4 ngày)
select x.d as dg from generate_series(app.today() + 8, app.today() + 25, interval '1 day') g(d0), lateral (select d0::date d) x
 where app.calc_load_day('JM2', 'PMY-DNG', x.d) = x.d - 4 and exists (select 1 from app.daily_fleet f where f.warehouse_code = 'JM2' and f.day = x.d - 4)
 order by x.d limit 1 \gset
select public.save_booking(jsonb_build_object('mode','hold','wh','JM2','delivery',:'dg','customer_id',:'cdg','address_id',:'adg','tons',3)) as b2 \gset
select pg_temp.ok((select day = :'dg'::date - 4 from app.bookings where id = :'b2'), 'Central 4 ngày');

\echo --- giao gấp: không kịp lịch thường → lỗi; chọn Đơn khẩn → bốc hôm nay, cờ khẩn
\echo expect ERROR không kịp
select public.save_booking(jsonb_build_object('mode','hold','wh','JM2','delivery',app.today() + 1,'customer_id',:'cdg','address_id',:'adg','tons',2));
select public.save_booking(jsonb_build_object('mode','draft','wh','JM2','delivery',app.today() + 1,'customer_id',:'cdg','address_id',:'adg','tons',2,'urgent',true)) as b3 \gset
select pg_temp.ok((select day = app.today() and urgent and urgent_override from app.bookings where id = :'b3'), 'đơn khẩn bốc hôm nay');

\echo --- đặt nhiều dòng theo ngày giao
select public.bulk_create_bookings(jsonb_build_array(jsonb_build_object('wh','JM2','delivery',:'dl','code','KH0106','tons','4')), 'draft') as r \gset
select pg_temp.ok((select day = :'ld' and delivery_date = :'dl' from app.bookings where id = (:'r'::jsonb #>> '{rows,0,id}')), 'bulk theo ngày giao');
select pg_temp.ok((:'r'::jsonb #>> '{rows,0,delivery}') = :'dl', 'bulk trả ngày giao');

\echo --- yêu cầu đặt hàng: ngày bốc dự kiến theo Zone địa chỉ khách
select (public.req_create(jsonb_build_object('customerId',:'cdg','wh','JM2','deliver',:'dg','body','20 MT tôn lạnh'))->>'id')::bigint as rq \gset
select pg_temp.ok((select day = :'dg'::date - 4 from app.order_requests where id = :'rq'), 'yêu cầu: bốc dự kiến theo Central');

\echo --- Cấu hình › Vận chuyển
\echo expect ERROR CS không có quyền
select public.save_zone('JM2', 'SE', 'South East', 2);
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.save_zone('JM2', 'SE', 'South East', 2);
select pg_temp.ok(app.region_days('PMY-DNA') = 2 and (select round_trip_days from app.regions where id = 'PMY-DNA') = 2, 'đổi số ngày Zone');
select pg_temp.ok(exists (select 1 from jsonb_array_elements(public.transport_drift()) e where e->>'id' = :'b1') is false, 'b1 bốc sớm hơn → không lệch');
select public.save_zone('JM2', 'SE', 'South East', 3);
select pg_temp.ok(exists (select 1 from jsonb_array_elements(public.transport_drift()) e where e->>'id' = :'b2') is false
                  and exists (select 1 from jsonb_array_elements(public.transport_drift()) e where e->>'id' = :'b1'), 'drift: liệt kê đơn bốc muộn hơn gợi ý');
select public.save_zone('JM2', 'SE', 'South East', 1);
select public.save_region_transport('PMY-DNG', 'CT', 3, 'hai chau; son tra');
select pg_temp.ok(app.region_days('PMY-DNG') = 3 and app.guess_region('JM2', 'P. Sơn Trà', '') = 'PMY-DNG', 'số ngày riêng + tên gọi khác');
select public.save_region_transport('PMY-DNG', 'CT', null, '');
\echo expect ERROR Zone không thuộc kho
select public.save_region_transport('PMY-DNG', 'NO', null, '');
-- nạp Excel: xem trước không ghi, có lỗi thì không ghi
select public.import_transport('zones', '[{"wh":"JM2","zone":"Highland","days":"3"},{"wh":"JM2","zone":"Miền Tây xa","days":"2"},{"wh":"XX","zone":"A","days":"1"}]', false) as pv \gset
select pg_temp.ok(jsonb_array_length(:'pv'::jsonb->'rows') = 2 and jsonb_array_length(:'pv'::jsonb->'errors') = 1 and app.region_days('PMY-GLA') = 2, 'xem trước');
\echo expect ERROR nạp file còn lỗi
select public.import_transport('zones', '[{"wh":"JM2","zone":"Highland","days":"3"},{"wh":"XX","zone":"A","days":"1"}]', true);
select public.import_transport('zones', '[{"wh":"JM2","zone":"Highland","days":"3"},{"wh":"JM2","zone":"Miền Tây xa","days":"2"}]', true);
select pg_temp.ok(app.region_days('PMY-GLA') = 3 and exists (select 1 from app.zones where warehouse_code = 'JM2' and name = 'Miền Tây xa'), 'nạp Ngày vận chuyển');
select public.import_transport('regions', '[{"wh":"JM2","name":"Cà Mau","zone":"Miền Tây xa","days":"","aliases":"nam can"},{"wh":"JM2","name":"Bình Định","zone":"Central","days":"2"},{"wh":"JM2","name":"Phú Quốc","zone":"Mekong","province":"An Giang"}]', true) as ri \gset
select pg_temp.ok(app.region_days('PMY-CMA') = 2 and app.guess_region('JM2', 'Năm Căn', '') = 'PMY-CMA'
                  and exists (select 1 from app.regions where name = 'Phú Quốc' and zone_code = 'MK'), 'nạp Vùng giao');
select pg_temp.ok((select count(*) from jsonb_array_elements(:'ri'::jsonb->'rows') e where e->>'act' = 'same') = 1, 'Bình Định không đổi');

\echo --- tắt chế độ: đặt thẳng ngày bốc như cũ, ngày giao tự điền = ngày bốc + số ngày đi
update app.settings set value = 'false' where key = 'deliveryMode';
select set_config('request.jwt.claim.sub', :'CS', false);
select public.save_booking(jsonb_build_object('mode','draft','wh','JM2','day',:'ld','customer_id',:'cdn','address_id',:'adn','tons',1)) as b4 \gset
select pg_temp.ok((select day = :'ld' and delivery_date = :'ld'::date + 1 from app.bookings where id = :'b4'), 'chế độ cũ + trigger ngày giao');
\echo expect ERROR chỉ Admin bật/tắt
select public.update_settings('{"deliveryMode":true}');
