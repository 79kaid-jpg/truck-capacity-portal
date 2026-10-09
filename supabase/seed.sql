-- =====================================================================
-- seed.sql : dữ liệu danh mục ban đầu (chạy SAU 0001_init.sql)
-- Chạy lại nhiều lần cũng không sao (on conflict do nothing).
-- =====================================================================

insert into app.settings (key, value) values
  ('near', '80'), ('capDK', '30'), ('capCN', '15'), ('split', '15'), ('sla', '60'),
  ('maxStops', '3'), ('fillMin', '70'), ('suggestOn', 'true'), ('sundayOff', 'true'), ('holidays', '[]')
on conflict (key) do nothing;

insert into app.warehouses (code, name, full_name) values
  ('PMY', 'Phú Mỹ',   'Kho Phú Mỹ'),
  ('CLO', 'Cửa Lò',   'Kho Cửa Lò'),
  ('HPG', 'Hải Phòng','Kho Hải Phòng')
on conflict (code) do nothing;

-- Khu vực = tỉnh (tên cũ) theo từng kho, kèm tỉnh mới sau sáp nhập 01/07/2025 và số ngày đi-về
insert into app.regions (id, warehouse_code, code, name, new_province, round_trip_days) values
  ('PMY-HCM','PMY','HCM','TP.HCM','TP. Hồ Chí Minh',1),
  ('PMY-BDU','PMY','BDU','Bình Dương','TP. Hồ Chí Minh',1),
  ('PMY-VTA','PMY','VTA','Vũng Tàu','TP. Hồ Chí Minh',1),
  ('PMY-DNA','PMY','DNA','Đồng Nai','Đồng Nai',1),
  ('PMY-BTH','PMY','BTH','Bình Thuận','Lâm Đồng',2),
  ('PMY-LAN','PMY','LAN','Long An','Tây Ninh',1),
  ('PMY-GLA','PMY','GLA','Gia Lai','Gia Lai',3),
  ('PMY-DLK','PMY','DLK','Đắk Lắk','Đắk Lắk',3),
  ('PMY-DNG','PMY','DNG','Đà Nẵng','Đà Nẵng',4),
  ('CLO-NAN','CLO','NAN','Nghệ An','Nghệ An',1),
  ('CLO-HTI','CLO','HTI','Hà Tĩnh','Hà Tĩnh',1),
  ('CLO-THO','CLO','THO','Thanh Hóa','Thanh Hóa',1),
  ('CLO-QTR','CLO','QTR','Quảng Trị','Quảng Trị',2),
  ('HPG-HPH','HPG','HPH','Hải Phòng','Hải Phòng',1),
  ('HPG-HNO','HPG','HNO','Hà Nội','Hà Nội',1),
  ('HPG-QNI','HPG','QNI','Quảng Ninh','Quảng Ninh',1),
  ('HPG-BNI','HPG','BNI','Bắc Ninh','Bắc Ninh',1),
  ('HPG-HYE','HPG','HYE','Hưng Yên','Hưng Yên',1)
on conflict (id) do nothing;

insert into app.region_neighbors (region_a, region_b)
select a, b from (values
  ('PMY-HCM','PMY-BDU'),('PMY-HCM','PMY-LAN'),('PMY-BDU','PMY-DNA'),('PMY-DNA','PMY-VTA'),('PMY-VTA','PMY-HCM'),
  ('PMY-DNA','PMY-BTH'),('PMY-GLA','PMY-DLK'),('CLO-NAN','CLO-HTI'),('CLO-NAN','CLO-THO'),
  ('HPG-HPH','HPG-QNI'),('HPG-HPH','HPG-HYE'),('HPG-HNO','HPG-BNI')
) v(x, y), lateral (values (x, y), (y, x)) p(a, b)
on conflict do nothing;

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
  ('fleet_cut','OTHER','Lý do khác')
on conflict do nothing;
