-- =====================================================================
-- seed.sql : dữ liệu danh mục ban đầu (chạy SAU 0001_init.sql)
-- Chạy lại nhiều lần cũng không sao (on conflict do nothing).
-- =====================================================================

insert into app.settings (key, value) values
  ('near', '80'), ('capDK', '30'), ('capCN', '15'), ('split', '15'), ('sla', '60'),
  ('maxStops', '3'), ('fillMin', '70'), ('suggestOn', 'true'), ('sundayOff', 'true'), ('holidays', '[]'),
  ('capDKMin', '15'), ('capDKMax', '35'), ('capCNMin', '5'), ('capCNMax', '20'), ('escalateHours', '4'),
  ('cutoff', '"16:00"'), ('coilPct', '3'), ('coilTons', '0.5'), ('digestTimes', '["07:00","16:00"]'),
  ('requirePicking', 'true'), ('shipRemindHours', '6'), ('shipAdminDays', '2'),
  ('chatOn', 'true'), ('chatRoles', '["cs","sales","logistics","admin"]'), ('chatDaily', '150'),
  ('chatDailyRole', '{"cs":150,"sales":150,"logistics":150,"admin":150,"customer":30}'), ('chatDailyTotal', '2000'), ('transitDays', '{}'), ('talkRemindHours', '2'), ('uatOn', 'true'),
  ('aiEngine', '"free"'), ('aiModel', '"haiku"'), ('aiClaudeDaily', '200'), ('deliveryMode', 'true')
on conflict (key) do nothing;

insert into app.warehouses (code, name, full_name) values
  ('JM2', 'Phú Mỹ',   'Kho Phú Mỹ'),
  ('JD9', 'Cửa Lò',   'Kho Cửa Lò'),
  ('JD8', 'Hải Phòng','Kho Hải Phòng')
on conflict (code) do nothing;

-- Mã kho trong ERP (cột Whs của danh sách cuộn)
update app.warehouses set erp_code = v.erp from (values ('JM2','JM2'), ('JD8','JD8'), ('JD9','JD9')) v(code, erp)
 where warehouses.code = v.code and warehouses.erp_code = '';

-- Khu vực = tỉnh (tên cũ) theo từng kho, kèm tỉnh mới sau sáp nhập 01/07/2025 và số ngày ĐI một chiều (xe thuê theo chuyến).
-- v3.41: dựng lại theo địa chỉ giao hàng trong ERP; lân cận = tỉnh kề nhau trên cùng tuyến đường.
insert into app.regions (id, warehouse_code, code, name, new_province, round_trip_days) values
  ('PMY-VTA','JM2','VTA','Bà Rịa – Vũng Tàu','TP. Hồ Chí Minh',1),
  ('PMY-HCM','JM2','HCM','TP.HCM','TP. Hồ Chí Minh',1),
  ('PMY-BDU','JM2','BDU','Bình Dương','TP. Hồ Chí Minh',1),
  ('PMY-DNA','JM2','DNA','Đồng Nai','Đồng Nai',1),
  ('PMY-LAN','JM2','LAN','Long An','Tây Ninh',1),
  ('PMY-TNI','JM2','TNI','Tây Ninh','Tây Ninh',1),
  ('PMY-TGI','JM2','TGI','Tiền Giang','Đồng Tháp',1),
  ('PMY-VLO','JM2','VLO','Vĩnh Long','Vĩnh Long',1),
  ('PMY-TVI','JM2','TVI','Trà Vinh','Vĩnh Long',2),
  ('PMY-CTH','JM2','CTH','Cần Thơ','Cần Thơ',1),
  ('PMY-HGI','JM2','HGI','Hậu Giang','Cần Thơ',2),
  ('PMY-STR','JM2','STR','Sóc Trăng','Cần Thơ',2),
  ('PMY-BLI','JM2','BLI','Bạc Liêu','Cà Mau',2),
  ('PMY-CMA','JM2','CMA','Cà Mau','Cà Mau',2),
  ('PMY-KGI','JM2','KGI','Kiên Giang','An Giang',2),
  ('PMY-BTH','JM2','BTH','Bình Thuận','Lâm Đồng',1),
  ('PMY-LDG','JM2','LDG','Lâm Đồng','Lâm Đồng',2),
  ('PMY-DNO','JM2','DNO','Đắk Nông','Lâm Đồng',1),
  ('PMY-DLK','JM2','DLK','Đắk Lắk','Đắk Lắk',2),
  ('PMY-GLA','JM2','GLA','Gia Lai','Gia Lai',2),
  ('PMY-PYE','JM2','PYE','Phú Yên','Đắk Lắk',2),
  ('PMY-BDI','JM2','BDI','Bình Định','Gia Lai',2),
  ('PMY-QNG','JM2','QNG','Quảng Ngãi','Quảng Ngãi',3),
  ('PMY-QNA','JM2','QNA','Quảng Nam','Đà Nẵng',3),
  ('PMY-DNG','JM2','DNG','Đà Nẵng','Đà Nẵng',3),
  ('CLO-THO','JD9','THO','Thanh Hóa','Thanh Hóa',1),
  ('CLO-NAN','JD9','NAN','Nghệ An','Nghệ An',1),
  ('CLO-HTI','JD9','HTI','Hà Tĩnh','Hà Tĩnh',1),
  ('CLO-QTR','JD9','QTR','Quảng Trị','Quảng Trị',1),
  ('HPG-HPH','JD8','HPH','Hải Phòng','Hải Phòng',1),
  ('HPG-HDU','JD8','HDU','Hải Dương','Hải Phòng',1),
  ('HPG-HYE','JD8','HYE','Hưng Yên','Hưng Yên',1),
  ('HPG-TBI','JD8','TBI','Thái Bình','Hưng Yên',1),
  ('HPG-HNO','JD8','HNO','Hà Nội','Hà Nội',1),
  ('HPG-BNI','JD8','BNI','Bắc Ninh','Bắc Ninh',1),
  ('HPG-LSO','JD8','LSO','Lạng Sơn','Lạng Sơn',1),
  ('HPG-PTH','JD8','PTH','Phú Thọ','Phú Thọ',1),
  ('HPG-TQU','JD8','TQU','Tuyên Quang','Tuyên Quang',1),
  ('HPG-LCA','JD8','LCA','Lào Cai','Lào Cai',2)
on conflict (id) do nothing;

insert into app.region_neighbors (region_a, region_b)
select a, b from (values
  ('PMY-VTA','PMY-HCM'),
  ('PMY-VTA','PMY-BDU'),
  ('PMY-VTA','PMY-DNA'),
  ('PMY-HCM','PMY-BDU'),
  ('PMY-HCM','PMY-DNA'),
  ('PMY-HCM','PMY-LAN'),
  ('PMY-HCM','PMY-TNI'),
  ('PMY-BDU','PMY-DNA'),
  ('PMY-BDU','PMY-TNI'),
  ('PMY-LAN','PMY-TNI'),
  ('PMY-LAN','PMY-TGI'),
  ('PMY-DNA','PMY-BTH'),
  ('PMY-DNA','PMY-LDG'),
  ('PMY-BTH','PMY-LDG'),
  ('PMY-TGI','PMY-VLO'),
  ('PMY-VLO','PMY-TVI'),
  ('PMY-VLO','PMY-CTH'),
  ('PMY-CTH','PMY-HGI'),
  ('PMY-CTH','PMY-STR'),
  ('PMY-CTH','PMY-KGI'),
  ('PMY-HGI','PMY-KGI'),
  ('PMY-HGI','PMY-STR'),
  ('PMY-STR','PMY-TVI'),
  ('PMY-STR','PMY-BLI'),
  ('PMY-BLI','PMY-CMA'),
  ('PMY-CMA','PMY-KGI'),
  ('PMY-DNO','PMY-DLK'),
  ('PMY-DLK','PMY-GLA'),
  ('PMY-DLK','PMY-PYE'),
  ('PMY-GLA','PMY-BDI'),
  ('PMY-PYE','PMY-BDI'),
  ('PMY-BDI','PMY-QNG'),
  ('PMY-QNG','PMY-QNA'),
  ('PMY-QNA','PMY-DNG'),
  ('CLO-NAN','CLO-HTI'),
  ('CLO-NAN','CLO-THO'),
  ('CLO-HTI','CLO-QTR'),
  ('HPG-HPH','HPG-HDU'),
  ('HPG-HPH','HPG-TBI'),
  ('HPG-HDU','HPG-HYE'),
  ('HPG-HDU','HPG-BNI'),
  ('HPG-HYE','HPG-TBI'),
  ('HPG-HYE','HPG-HNO'),
  ('HPG-HNO','HPG-BNI'),
  ('HPG-HNO','HPG-PTH'),
  ('HPG-BNI','HPG-LSO'),
  ('HPG-PTH','HPG-TQU'),
  ('HPG-PTH','HPG-LCA')
) v(x, y), lateral (values (x, y), (y, x)) p(a, b)
on conflict do nothing;

-- v3.50: Zone vận chuyển và số ngày xe chạy từ kho (file "Customer and loading estimation" của Logistics, 21/10/2026).
-- Logistics sửa ở Cấu hình › Vận chuyển; chạy lại file này không ghi đè số liệu đã sửa.
insert into app.zones (warehouse_code, code, name, days) values
  ('JM2','SE','South East',1), ('JM2','HL','Highland',2), ('JM2','MK','Mekong',1), ('JM2','CT','Central',4),
  ('JD8','NO','North',1), ('JD8','RR','Red River',1),
  ('JD9','RR','Red River',1), ('JD9','CT','Central',2)
on conflict do nothing;

-- Khu vực chưa có trong danh mục (tên tỉnh cũ). Hà Giang tách khỏi Tuyên Quang vì đi 2 ngày.
insert into app.regions (id, warehouse_code, code, name, new_province, round_trip_days, zone_code) values
  ('PMY-BPH','JM2','BPH','Bình Phước','Đồng Nai',1,'SE'),
  ('PMY-KHO','JM2','KHO','Khánh Hòa','Khánh Hòa',1,'SE'),
  ('PMY-NTH','JM2','NTH','Ninh Thuận','Khánh Hòa',1,'SE'),
  ('PMY-HUE','JM2','HUE','Thừa Thiên Huế','Huế',4,'CT'),
  ('PMY-KTU','JM2','KTU','Kon Tum','Quảng Ngãi',2,'HL'),
  ('PMY-AGI','JM2','AGI','An Giang','An Giang',1,'MK'),
  ('PMY-BTR','JM2','BTR','Bến Tre','Vĩnh Long',1,'MK'),
  ('PMY-DTH','JM2','DTH','Đồng Tháp','Đồng Tháp',1,'MK'),
  ('CLO-QBI','JD9','QBI','Quảng Bình','Quảng Trị',2,'CT'),
  ('HPG-BGI','JD8','BGI','Bắc Giang','Bắc Ninh',1,'NO'),
  ('HPG-BKA','JD8','BKA','Bắc Kạn','Thái Nguyên',1,'NO'),
  ('HPG-CBA','JD8','CBA','Cao Bằng','Cao Bằng',1,'NO'),
  ('HPG-HGG','JD8','HGG','Hà Giang','Tuyên Quang',2,null),
  ('HPG-HBI','JD8','HBI','Hòa Bình','Phú Thọ',1,'NO'),
  ('HPG-SLA','JD8','SLA','Sơn La','Sơn La',1,'NO'),
  ('HPG-TNG','JD8','TNG','Thái Nguyên','Thái Nguyên',1,'NO'),
  ('HPG-VPH','JD8','VPH','Vĩnh Phúc','Phú Thọ',1,'NO'),
  ('HPG-YBA','JD8','YBA','Yên Bái','Lào Cai',1,'NO'),
  ('HPG-HNA','JD8','HNA','Hà Nam','Ninh Bình',1,'RR'),
  ('HPG-NDI','JD8','NDI','Nam Định','Ninh Bình',1,'RR'),
  ('HPG-NBI','JD8','NBI','Ninh Bình','Ninh Bình',1,'RR'),
  ('HPG-QNI','JD8','QNI','Quảng Ninh','Quảng Ninh',1,'RR'),
  ('HPG-THO','JD8','THO','Thanh Hóa','Thanh Hóa',1,'RR')
on conflict do nothing;

-- Gắn Zone, số ngày riêng (ngoại lệ) và tên gọi khác cho khu vực chưa cấu hình
update app.regions r set zone_code = v.z, days_own = v.own
  from (values
    ('PMY-VTA','SE',null),('PMY-HCM','SE',null),('PMY-BDU','SE',null),('PMY-DNA','SE',null),('PMY-LAN','SE',null),('PMY-TNI','SE',null),
    ('PMY-BTH','SE',null),('PMY-PYE','SE',null),
    ('PMY-TGI','MK',null),('PMY-VLO','MK',null),('PMY-TVI','MK',null),('PMY-CTH','MK',null),('PMY-HGI','MK',null),('PMY-STR','MK',null),
    ('PMY-BLI','MK',null),('PMY-CMA','MK',null),('PMY-KGI','MK',null),
    ('PMY-LDG','HL',null),('PMY-DNO','HL',null),('PMY-DLK','HL',null),('PMY-GLA','HL',null),
    ('PMY-BDI','CT',2),('PMY-QNG','CT',null),('PMY-QNA','CT',null),('PMY-DNG','CT',null),
    ('CLO-THO','RR',null),('CLO-NAN','RR',null),('CLO-HTI','RR',null),('CLO-QTR','CT',null),
    ('HPG-HPH','NO',null),('HPG-HDU','NO',null),('HPG-HYE','NO',null),('HPG-TBI','RR',null),('HPG-HNO','NO',null),('HPG-BNI','NO',null),
    ('HPG-LSO','NO',null),('HPG-PTH','NO',null),('HPG-TQU','NO',null),('HPG-LCA','NO',null),('HPG-HGG','NO',2)
  ) v(id, z, own)
 where r.id = v.id and r.zone_code is null;

update app.regions r set aliases = v.al
  from (values
    ('PMY-VTA','Bà Rịa - Vũng Tàu; ba ria; vung tau; brvt; phu my'),
    ('PMY-HCM','Hồ Chí Minh; binh chanh; binh tan; tan binh; thu duc; cu chi; hoc mon; nha be; can gio; go vap; binh thanh; tan phu; phu nhuan; quan 12; q12'),
    ('PMY-BDU','thu dau mot; thuan an; di an; ben cat; tan uyen'),
    ('PMY-DNA','bien hoa; long khanh; long thanh; nhon trach; trang bom'),
    ('PMY-LAN','tan an; ben luc; duc hoa'),
    ('PMY-BTH','phan thiet; la gi; lagi'),
    ('PMY-PYE','tuy hoa'),
    ('PMY-BPH','dong xoai'),
    ('PMY-KHO','Khánh Hoà; nha trang; cam ranh'),
    ('PMY-NTH','phan rang'),
    ('PMY-TGI','my tho'),
    ('PMY-KGI','rach gia'),
    ('PMY-AGI','long xuyen; chau doc'),
    ('PMY-DTH','cao lanh; sa dec'),
    ('PMY-LDG','da lat; bao loc'),
    ('PMY-DNO','daknong; dak nong; gia nghia'),
    ('PMY-DLK','daklak; dac lac; buon ma thuot; bmt'),
    ('PMY-GLA','pleiku'),
    ('PMY-BDI','quy nhon'),
    ('PMY-QNA','tam ky; hoi an'),
    ('PMY-HUE','Huế'),
    ('CLO-QBI','dong hoi'),
    ('CLO-QTR','dong ha'),
    ('CLO-THO','Thanh Hoá'),
    ('HPG-THO','Thanh Hoá'),
    ('HPG-HNO','hn'),
    ('HPG-HBI','Hoà Bình'),
    ('HPG-PTH','viet tri'),
    ('HPG-VPH','vinh yen'),
    ('HPG-HNA','phu ly'),
    ('HPG-QNI','ha long; cam pha; uong bi')
  ) v(id, al)
 where r.id = v.id and r.aliases = '';

do $$ declare w text; begin for w in select code from app.warehouses loop perform app.sync_region_days(w); end loop; end $$;

-- Một lần: địa chỉ đã gắn khu vực theo tỉnh mới (vd. Tuyên Quang) nhưng địa chỉ ghi tỉnh cũ có khu vực riêng (vd. Hà Giang) → chuyển sang khu vực riêng
do $$
begin
  if not exists (select 1 from app.settings where key = 'v350Remap') then
    update app.address_regions ar set region_id = g.rid
      from (select ar2.address_id, ar2.warehouse_code, app.guess_region(ar2.warehouse_code, concat_ws(', ', a.label, nullif(a.ward, '')), '') rid
              from app.address_regions ar2 join app.customer_addresses a on a.id = ar2.address_id) g
      join app.regions nr on nr.id = g.rid
     where ar.address_id = g.address_id and ar.warehouse_code = g.warehouse_code
       and nr.id in ('HPG-HGG','PMY-BPH','PMY-KHO','PMY-NTH','PMY-HUE','PMY-KTU','PMY-AGI','PMY-BTR','PMY-DTH','CLO-QBI','HPG-BGI','HPG-BKA',
                     'HPG-CBA','HPG-HBI','HPG-SLA','HPG-TNG','HPG-VPH','HPG-YBA','HPG-HNA','HPG-NDI','HPG-NBI','HPG-QNI','HPG-THO')
       and ar.region_id <> nr.id
       and (select r0.new_province from app.regions r0 where r0.id = ar.region_id) = nr.new_province;
    insert into app.settings (key, value) values ('v350Remap', 'true');
  end if;
end $$;

-- Ngày giao cho đơn cũ = ngày bốc + số ngày đi (trigger bk_deliv tự điền khi để trống)
update app.bookings set delivery_date = null where delivery_date is null;

insert into app.products (code, name) values
  ('SP01','Hoa Cương'),('SP02','INOK'),('SP03','Tôn lạnh AZ150'),('SP04','Tôn mạ màu'),('SP05','Xà gồ mạ kẽm')
on conflict do nothing;

insert into app.colors (code, name) values
  ('M01','Xám Trắng'),('M02','Xanh Rêu'),('M03','Đỏ Đô'),('M04','Trắng Sữa'),('M05','Xanh Ngọc'),('M00','Không màu')
on conflict do nothing;

insert into app.thicknesses (value_mm) select unnest(array[0.3,0.35,0.4,0.42,0.45,0.5,2,2.5]) on conflict do nothing;
insert into app.widths (value_mm) select unnest(array[200,250,914,1070,1200]) on conflict do nothing;

insert into app.reason_codes (kind, code, name) values
  ('reject','NO_TRUCK','Không còn xe phù hợp'),
  ('reject','ROUTE','Không có xe đi tuyến này'),
  ('reject','OTHER','Lý do khác'),
  ('reschedule','NO_TRUCK','Hết xe ngày yêu cầu'),
  ('reschedule','ROUTE','Không có xe đi tuyến này'),
  ('reschedule','OTHER','Lý do khác'),
  ('cancel','CUSTOMER','Khách hủy đơn'),
  ('cancel','WRONG','Nhập sai thông tin'),
  ('cancel','OTHER','Lý do khác'),
  ('override','LONG_ROUTE','Tuyến dài, dùng đầu kéo'),
  ('override','MERGE','Ghép cùng tuyến'),
  ('override','OTHER','Lý do khác'),
  ('fleet_cut','MAINT','Bảo dưỡng xe'),
  ('fleet_cut','LONG_TRIP','Xe đi tuyến dài chưa về'),
  ('fleet_cut','OTHER','Lý do khác'),
  ('change','CUST_REQ','Khách đổi ngày nhận'),
  ('change','CUST_NOT_READY','Khách chưa sẵn sàng nhận hàng'),
  ('change','GOODS_NOT_READY','Hàng chưa sẵn sàng'),
  ('change','NO_TRUCK','Hết xe ngày cũ'),
  ('change','WRONG','Nhập sai ngày'),
  ('change','OTHER','Lý do khác'),
  ('nodeliver','CUST_CUT','Khách giảm số lượng'),
  ('nodeliver','NO_STOCK','Không đủ hàng'),
  ('nodeliver','OTHER','Lý do khác'),
  ('fail','CUST_CLOSED','Khách không nhận / đóng cửa'),
  ('fail','WRONG_ADDR','Sai địa chỉ'),
  ('fail','TRUCK','Sự cố xe'),
  ('fail','OTHER','Lý do khác'),
  ('close','FULL','Xe đã đủ hàng'),
  ('close','ROUTE','Không ghép thêm tuyến khác'),
  ('close','OTHER','Lý do khác')
on conflict do nothing;

-- Danh mục quyền tính năng (tên/mô tả được cập nhật khi chạy lại; def_roles = mặc định)
insert into app.permissions (code, grp, name, descr, sort, def_roles) values
  ('day.view',        'Xem',        'Xem chi tiết ngày và đội xe',         'Thẻ xe, phần hàng trên xe, booking chờ, gợi ý gộp của một ngày', 10, '{logistics,cs,sales,admin}'),
  ('booking.list',    'Xem',        'Danh sách booking',                   'Màn hình Danh sách booking (Sales chỉ thấy khách mình phụ trách)', 20, '{logistics,cs,sales,admin}'),
  ('booking.create',  'Đặt hàng',   'Tạo booking, giữ chỗ, lưu nháp',      'Nút Đặt hàng trên lịch, chi tiết ngày, danh sách booking', 30, '{cs,admin}'),
  ('booking.edit',    'Đặt hàng',   'Sửa booking',                         'Đổi ngày, số tấn, địa chỉ, sản phẩm; booking đã xác nhận quay về Chờ xếp xe (BR-11)', 40, '{cs,admin}'),
  ('booking.cancel',  'Đặt hàng',   'Hủy booking',                         'Hủy kèm lý do, trả lại số tấn', 50, '{cs,admin}'),
  ('approvals.view',  'Điều phối',  'Xem Approval request',                'Danh sách booking đang giữ chỗ chờ xử lý', 60, '{logistics,admin}'),
  ('alloc.assign',    'Điều phối',  'Gán xe và xác nhận booking',          'Gợi ý xếp xe, xếp đơn lên xe, sửa / chuyển / gỡ phần hàng, xác nhận', 70, '{logistics,admin}'),
  ('booking.reject',  'Điều phối',  'Từ chối, đề nghị đổi ngày',           'Từ chối booking hoặc đề nghị ngày khác kèm lý do', 80, '{logistics,admin}'),
  ('merge.apply',     'Điều phối',  'Áp dụng gợi ý gộp xe',                'Áp dụng hoặc bỏ qua nhóm gộp xe theo khu vực', 90, '{logistics,admin}'),
  ('booking.region',  'Điều phối',  'Đổi khu vực của booking',             'Chọn lại khu vực giao hàng trên booking', 100, '{logistics,admin}'),
  ('fleet.manage',    'Điều phối',  'Khai báo số xe theo ngày',            'Trucks capacity setting: số đầu kéo, xe thùng mỗi ngày mỗi kho', 110, '{logistics,admin}'),
  ('config.general',  'Cấu hình',   'Ngưỡng, tải trọng, ngày nghỉ',        'Ngưỡng gần đầy, tải trọng DK/CN, ngưỡng phân loại, SLA, ngày nghỉ lễ', 120, '{logistics,admin}'),
  ('config.regions',  'Cấu hình',   'Khu vực giao hàng',                   'Thêm khu vực, khu vực lân cận, ngừng dùng', 130, '{logistics,admin}'),
  ('config.transport','Cấu hình',   'Vận chuyển (Zone, số ngày đi)',       'Zone, số ngày xe chạy từ kho, số ngày riêng và tên gọi khác của khu vực; nạp / xuất Excel', 131, '{logistics,admin}'),
  ('config.catalog',  'Cấu hình',   'Sản phẩm, màu, độ dày, khổ',          'Thêm, sửa, ngừng dùng mục trong danh mục', 140, '{logistics,admin}'),
  ('dash.ops',        'Dashboard',  'Bảng thống kê · tab Logistics',      'Năng lực giao, lấp đầy 14 ngày tới, thời gian xác nhận, đơn chờ xếp xe (kèm tab Tổng quan, Ngoại lệ, Lịch đơn, Mục tiêu)', 150, '{logistics,admin}'),
  ('dash.service',    'Dashboard',  'Bảng thống kê · tab CS',             'Trạng thái đơn, việc cần làm (đổi ngày, quá ngày chưa chốt, lưu tạm sắp đến ngày), top khách', 160, '{logistics,cs,admin}'),
  ('dash.sales',      'Dashboard',  'Bảng thống kê · tab Sales',          'Khách, segment, Sales phụ trách, nhu cầu bị mất', 170, '{logistics,sales,admin}'),
  ('dash.system',     'Dashboard',  'Bảng thống kê · tab Hệ thống',         'DB-06: dung lượng, đăng nhập, email, gửi email thử', 180, '{admin}'),
  ('users.manage',    'Quản trị',   'Quản lý tài khoản',                   'Cấp quyền, sửa, khóa tài khoản người dùng', 190, '{admin}'),
  ('customers.manage','Quản trị',   'Quản lý khách hàng',                  'Thêm khách hàng, địa chỉ, Sales phụ trách', 200, '{admin}'),
  ('users.impersonate','Quản trị',  'Login as người dùng khác',            'Xem và thao tác với tư cách một tài khoản khác tối đa 60 phút; mọi thao tác ghi nhật ký', 205, '{admin}'),
  ('auth.mfa',        'Bảo mật',    'Bắt buộc xác thực 2 lớp (MFA)',       'Đăng nhập phải nhập thêm mã 6 số từ ứng dụng Google / Microsoft Authenticator. Nên bật cho Admin khi chạy thật', 220, '{logistics,cs,admin}'),
  ('perms.manage',    'Quản trị',   'Phân quyền vai trò',                  'Màn hình này. Admin luôn giữ quyền này', 210, '{admin}'),
  ('delivery.confirm','Giao hàng',  'Xác nhận giao hàng, xử lý phần còn lại', 'Nhập địa chỉ và danh sách cuộn, tách đơn / không giao phần còn lại (BR-43, BR-44, BR-46)', 52, '{cs,admin}'),
  ('delivery.ship',   'Giao hàng',  'Load, đang giao, đã giao',            'Đã load hàng, Đang giao, Đã giao, Giao không thành công (BR-45)', 112, '{logistics,admin}'),
  ('booking.urgent',  'Đặt hàng',   'Đặt / bỏ cờ đơn khẩn',                'Ghi đè cờ khẩn tự tính, bắt buộc lý do (BR-41)', 55, '{admin}'),
  ('config.shortcuts','Cấu hình','Phím tắt','Đặt phím tắt mặc định của công ty; reset phím tắt của một người hoặc mọi người',127,'{admin}'),
  ('config.targets','Cấu hình','Mục tiêu','Nhập mục tiêu tấn theo tháng × segment (tab Mục tiêu của Bảng thống kê)',126,'{admin}'),
  ('req.create','Đặt hàng','Gửi yêu cầu đặt hàng','Ghi nhanh yêu cầu của khách (ví dụ "20 MT HC 0.5 xanh dương") lên lịch để CS tạo đơn',31,'{sales,cs,admin}'),
  ('req.handle','Đặt hàng','Xử lý yêu cầu đặt hàng','Đánh dấu yêu cầu đã tạo đơn / không nhận (kèm lý do)',32,'{cs,admin}'),
  ('config.warehouses','Cấu hình',  'Kho',                                 'Thêm kho, sửa tên, mã ERP, ngừng dùng kho', 125, '{logistics,admin}')
on conflict (code) do update set grp = excluded.grp, name = excluded.name, descr = excluded.descr, sort = excluded.sort, def_roles = excluded.def_roles;

-- Ma trận mặc định; không ghi đè cấu hình Admin đã chỉnh
insert into app.role_permissions (role, perm, allowed)
select r, p.code, r = any(p.def_roles) from app.permissions p cross join unnest(array['logistics','cs','sales','admin']) r
on conflict (role, perm) do nothing;
