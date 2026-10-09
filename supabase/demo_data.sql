-- =====================================================================
-- demo_data.sql : dữ liệu mẫu để chạy thử (TÙY CHỌN)
-- Chạy SAU khi đã tạo các tài khoản Sales/CS trong ứng dụng, rồi gọi:
--     select app.load_demo();
-- Hàm tạo 10 khách hàng mẫu, khai báo xe 30 ngày tới cho 3 kho
-- và một số booking quanh ngày hôm nay. Chạy lại sẽ bỏ qua phần đã có.
-- Xóa dữ liệu mẫu:  select app.clear_demo();
-- =====================================================================

create or replace function app.load_demo() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_dd uuid; v_da uuid; v_cs uuid; d date; i int; v_today date := app.today();
  r record; v_cust uuid; v_addr uuid; v_id text; v_seq int; n_bk int := 0;
  -- (profiles.customer_id của tài khoản khách bị gỡ khi clear_demo; gán lại trong màn hình Người dùng)
begin
  select user_id into v_dd from app.profiles where role = 'sales' and segment = 'DD' and active order by created_at limit 1;
  select user_id into v_da from app.profiles where role = 'sales' and segment = 'DA' and active order by created_at limit 1;
  select user_id into v_cs from app.profiles where role = 'cs' and active order by created_at limit 1;

  -- Khách hàng + địa chỉ
  for r in select * from (values
    ('KH0101','Vạn Đạt Thành UQ','DD','Kho Bà Rịa','TP. Hồ Chí Minh','Phường Bà Rịa','PMY','PMY-VTA'),
    ('KH0102','Vạn Thành','DD','Kho Bình Chánh','TP. Hồ Chí Minh','Xã Bình Chánh','PMY','PMY-HCM'),
    ('KH0201','Lysaght','DA','Nhà máy Long Bình','Đồng Nai','Phường Long Bình','PMY','PMY-DNA'),
    ('KH0202','Austdoor Nhơn Trạch','DA','Nhà máy Nhơn Trạch','Đồng Nai','Xã Nhơn Trạch','PMY','PMY-DNA'),
    ('KH0103','Tôn Long Phát','DD','Cửa hàng Pleiku','Gia Lai','Phường Pleiku','PMY','PMY-GLA'),
    ('KH0104','Hoàng Sa','DD','Kho Buôn Ma Thuột','Đắk Lắk','Phường Buôn Ma Thuột','PMY','PMY-DLK'),
    ('KH0105','Đại Lộc','DD','Cửa hàng Ea Kar','Đắk Lắk','Xã Ea Kar','PMY','PMY-DLK'),
    ('KH0106','Lộc Mỹ Khánh','DD','Kho Biên Hòa','Đồng Nai','Phường Biên Hòa','PMY','PMY-DNA'),
    ('KH0203','Tân Huy Hoàng UQ','DA','Công trình Hải Châu','Đà Nẵng','Phường Hải Châu','PMY','PMY-DNG'),
    ('KH0107','Kim Phát Bình Dương','DD','Kho Thủ Dầu Một','TP. Hồ Chí Minh','Phường Thủ Dầu Một','PMY','PMY-BDU')
  ) v(code, name, seg, label, prov, ward, wh, region) loop
    if not exists (select 1 from app.customers where code = r.code) then
      insert into app.customers (code, name, segment, sales_user_id)
      values (r.code, r.name, r.seg, case when r.seg = 'DD' then v_dd else v_da end) returning id into v_cust;
      insert into app.customer_addresses (customer_id, label, ward, province, is_default)
      values (v_cust, r.label, r.ward, r.prov, true) returning id into v_addr;
      insert into app.address_regions values (v_addr, r.wh, r.region);
    end if;
  end loop;
  -- Lysaght có thêm địa chỉ ở Hải Phòng
  select id into v_cust from app.customers where code = 'KH0201';
  if not exists (select 1 from app.customer_addresses where customer_id = v_cust and label = 'KCN Đình Vũ') then
    insert into app.customer_addresses (customer_id, label, ward, province) values (v_cust, 'KCN Đình Vũ', 'Phường Đông Hải', 'Hải Phòng') returning id into v_addr;
    insert into app.address_regions values (v_addr, 'HPG', 'HPG-HPH');
  end if;

  -- Khai báo xe 30 ngày tới (bỏ Chủ nhật)
  for i in 0 .. 30 loop
    d := v_today + i;
    continue when extract(dow from d) = 0;
    insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason) values
      ('PMY', d, case when i = 6 then 5 else 9 end, case when i = 6 then 2 else 4 end, case when i = 6 then 'Bảo dưỡng định kỳ 4 xe' else '' end),
      ('CLO', d, 5, 3, ''), ('HPG', d, 6, 3, '')
    on conflict do nothing;
  end loop;

  -- Booking mẫu (chỉ tạo khi chưa có booking nào)
  if v_cs is not null and not exists (select 1 from app.bookings) then
    for r in select * from (values
      -- offset ngày, mã KH, trạng thái, sản phẩm, màu, dày, khổ, tấn, xe (rỗng = chưa gán), phút trước khi giữ chỗ
      (0,'KH0102','ok','Hoa Cương','Xám Trắng',0.5,1200,26.0,'DK-01',0),
      (0,'KH0104','ok','Tôn mạ màu','Xanh Rêu',0.45,1200,24.0,'DK-02',0),
      (0,'KH0106','ok','INOK','Không màu',0.45,1200,7.0,'CN-01',0),
      (0,'KH0202','hold','Tôn lạnh AZ150','Không màu',0.4,1200,6.5,'',25),
      (0,'KH0105','hold','Hoa Cương','Đỏ Đô',0.4,1070,5.2,'',50),
      (0,'KH0103','hold','Tôn mạ màu','Xanh Ngọc',0.4,1200,8.8,'',85),
      (0,'KH0201','hold','Tôn mạ màu','Trắng Sữa',0.45,1200,45.0,'',40),
      (0,'KH0101','hold','Hoa Cương','Xám Trắng',0.45,1200,9.0,'',15),
      (1,'KH0107','ok','Tôn lạnh AZ150','Không màu',0.4,1200,12.0,'CN-01',0),
      (1,'KH0102','ok','Hoa Cương','Xám Trắng',0.45,1200,28.0,'DK-01',0),
      (1,'KH0201','ok','Tôn mạ màu','Trắng Sữa',0.4,1200,30.0,'DK-02',0),
      (1,'KH0203','ok','Hoa Cương','Đỏ Đô',0.5,1200,26.0,'DK-03',0),
      (1,'KH0106','hold','INOK','Không màu',0.5,1200,14.0,'',100),
      (3,'KH0202','ok','Tôn lạnh AZ150','Không màu',0.45,1200,28.0,'DK-01',0),
      (4,'KH0102','hold','Hoa Cương','Xám Trắng',0.45,1200,20.0,'',30),
      (4,'KH0201','ok','Tôn mạ màu','Trắng Sữa',0.4,1200,30.0,'DK-01',0),
      (5,'KH0104','ok','Hoa Cương','Xanh Rêu',0.45,1200,30.0,'DK-01',0),
      (5,'KH0101','ok','Hoa Cương','Xám Trắng',0.45,1200,28.0,'DK-02',0),
      (5,'KH0103','hold','Tôn mạ màu','Đỏ Đô',0.4,1200,10.0,'',20)
    ) v(off, code, st, p, c, th, w, t, truck, mins) loop
      d := v_today + r.off;
      if extract(dow from d) = 0 then d := d + 1; end if;
      select c.id into v_cust from app.customers c where c.code = r.code;
      select a.id into v_addr from app.customer_addresses a join app.address_regions ar on ar.address_id = a.id
       where a.customer_id = v_cust and ar.warehouse_code = 'PMY' limit 1;
      insert into app.booking_seq values ('PMY', d, 1)
      on conflict (warehouse_code, day) do update set last = app.booking_seq.last + 1 returning last into v_seq;
      v_id := 'BK-PMY-' || to_char(d, 'YYMMDD') || '-' || lpad(v_seq::text, 3, '0');
      insert into app.bookings (id, warehouse_code, day, customer_id, ref, address_id, address_text, province, region_id,
                                status, cs_user_id, held_at, confirmed_at, created_at)
      select v_id, 'PMY', d, v_cust, 'SO-' || (4500000 + n_bk * 37), a.id, a.label || ', ' || a.ward, a.province, ar.region_id,
             r.st, v_cs, now() - make_interval(mins => r.mins + 60 * (r.st = 'ok')::int),
             case when r.st = 'ok' then now() - interval '30 minutes' end, now() - interval '1 day'
        from app.customer_addresses a join app.address_regions ar on ar.address_id = a.id and ar.warehouse_code = 'PMY'
       where a.id = v_addr;
      insert into app.booking_lines (booking_id, product, color, thickness_mm, width_mm, tons) values (v_id, r.p, r.c, r.th, r.w, r.t);
      if r.truck <> '' then
        insert into app.allocations (booking_id, truck_code, tons) values (v_id, app.truck_code('PMY', d, split_part(r.truck, '-', 1), split_part(r.truck, '-', 2)::int), r.t);
      end if;
      insert into app.booking_status_history (booking_id, from_status, to_status, actor) values (v_id, null, r.st, v_cs);
      insert into app.audit_log (entity_id, detail, actor) values (v_id, 'Dữ liệu mẫu', v_cs);
      n_bk := n_bk + 1;
    end loop;
  end if;
  return format('Khách hàng: %s, ngày khai báo xe: %s, booking mẫu: %s%s',
    (select count(*) from app.customers), (select count(*) from app.daily_fleet), n_bk,
    case when v_cs is null then ' (chưa có tài khoản CS nên bỏ qua booking mẫu)' else '' end);
end $$;

create or replace function app.clear_demo() returns text
language plpgsql security definer set search_path = '' as $$
begin
  delete from app.merge_suggestion_log; delete from app.notifications; delete from app.audit_log;
  delete from app.allocations; delete from app.booking_lines; delete from app.booking_status_history;
  delete from app.bookings; delete from app.booking_seq; delete from app.daily_fleet;
  update app.profiles set customer_id = null where role = 'customer' and customer_id in (select id from app.customers where code in
    ('KH0101','KH0102','KH0201','KH0202','KH0103','KH0104','KH0105','KH0106','KH0203','KH0107'));
  delete from app.customers where code in ('KH0101','KH0102','KH0201','KH0202','KH0103','KH0104','KH0105','KH0106','KH0203','KH0107');
  return 'Đã xóa dữ liệu mẫu';
end $$;

revoke all on function app.load_demo() from public, anon, authenticated;
revoke all on function app.clear_demo() from public, anon, authenticated;
