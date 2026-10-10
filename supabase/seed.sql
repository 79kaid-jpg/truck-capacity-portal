-- =====================================================================
-- seed.sql : dữ liệu danh mục ban đầu (chạy SAU 0001_init.sql)
-- Chạy lại nhiều lần cũng không sao (on conflict do nothing).
-- =====================================================================

insert into app.settings (key, value) values
  ('near', '80'), ('capDK', '30'), ('capCN', '15'), ('split', '15'), ('sla', '60'),
  ('maxStops', '3'), ('fillMin', '70'), ('suggestOn', 'true'), ('sundayOff', 'true'), ('holidays', '[]'),
  ('capDKMin', '15'), ('capDKMax', '35'), ('capCNMin', '5'), ('capCNMax', '20'), ('escalateHours', '4')
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
  ('fleet.manage',    'Điều phối',  'Khai báo số xe theo ngày',            'Trucks capacity setting: số đầu kéo, container mỗi ngày mỗi kho', 110, '{logistics,admin}'),
  ('config.general',  'Cấu hình',   'Ngưỡng, tải trọng, ngày nghỉ',        'Ngưỡng gần đầy, tải trọng DK/CN, ngưỡng phân loại, SLA, ngày nghỉ lễ', 120, '{logistics,admin}'),
  ('config.regions',  'Cấu hình',   'Khu vực giao hàng',                   'Thêm khu vực, khu vực lân cận, ngừng dùng', 130, '{logistics,admin}'),
  ('config.catalog',  'Cấu hình',   'Sản phẩm, màu, độ dày, khổ',          'Thêm, sửa, ngừng dùng mục trong danh mục', 140, '{logistics,admin}'),
  ('dash.ops',        'Dashboard',  'Dashboard điều phối và hiệu quả xe',  'DB-01 Điều phối hôm nay, DB-02 Hiệu quả sử dụng xe, DB-04 Gộp xe', 150, '{logistics,admin}'),
  ('dash.service',    'Dashboard',  'Dashboard chất lượng phục vụ',        'DB-03 (bản sau)', 160, '{logistics,cs,admin}'),
  ('dash.sales',      'Dashboard',  'Dashboard khách hàng và Sales',       'DB-05 (bản sau)', 170, '{logistics,sales,admin}'),
  ('dash.system',     'Dashboard',  'Dashboard sức khỏe hệ thống',         'DB-06: dung lượng, đăng nhập, email, gửi email thử', 180, '{admin}'),
  ('users.manage',    'Quản trị',   'Quản lý tài khoản',                   'Cấp quyền, sửa, khóa tài khoản người dùng', 190, '{admin}'),
  ('customers.manage','Quản trị',   'Quản lý khách hàng',                  'Thêm khách hàng, địa chỉ, Sales phụ trách', 200, '{admin}'),
  ('users.impersonate','Quản trị',  'Login as người dùng khác',            'Xem và thao tác với tư cách một tài khoản khác tối đa 60 phút; mọi thao tác ghi nhật ký', 205, '{admin}'),
  ('perms.manage',    'Quản trị',   'Phân quyền vai trò',                  'Màn hình này. Admin luôn giữ quyền này', 210, '{admin}')
on conflict (code) do update set grp = excluded.grp, name = excluded.name, descr = excluded.descr, sort = excluded.sort, def_roles = excluded.def_roles;

-- Ma trận mặc định; không ghi đè cấu hình Admin đã chỉnh
insert into app.role_permissions (role, perm, allowed)
select r, p.code, r = any(p.def_roles) from app.permissions p cross join unnest(array['logistics','cs','sales','admin']) r
on conflict (role, perm) do nothing;
