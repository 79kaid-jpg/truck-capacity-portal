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
  ('chatDailyRole', '{"cs":150,"sales":150,"logistics":150,"admin":150,"customer":30}'), ('chatDailyTotal', '2000'), ('transitDays', '{}'), ('talkRemindHours', '2'), ('uatOn', 'true')
on conflict (key) do nothing;

insert into app.warehouses (code, name, full_name) values
  ('JM2', 'Phú Mỹ',   'Kho Phú Mỹ'),
  ('JD9', 'Cửa Lò',   'Kho Cửa Lò'),
  ('JD8', 'Hải Phòng','Kho Hải Phòng')
on conflict (code) do nothing;

-- Mã kho trong ERP (cột Whs của danh sách cuộn)
update app.warehouses set erp_code = v.erp from (values ('JM2','JM2'), ('JD8','JD8'), ('JD9','JD9')) v(code, erp)
 where warehouses.code = v.code and warehouses.erp_code = '';

-- Khu vực = tỉnh (tên cũ) theo từng kho, kèm tỉnh mới sau sáp nhập 01/07/2025 và số ngày đi-về
insert into app.regions (id, warehouse_code, code, name, new_province, round_trip_days) values
  ('PMY-HCM','JM2','HCM','TP.HCM','TP. Hồ Chí Minh',1),
  ('PMY-BDU','JM2','BDU','Bình Dương','TP. Hồ Chí Minh',1),
  ('PMY-VTA','JM2','VTA','Vũng Tàu','TP. Hồ Chí Minh',1),
  ('PMY-DNA','JM2','DNA','Đồng Nai','Đồng Nai',1),
  ('PMY-BTH','JM2','BTH','Bình Thuận','Lâm Đồng',2),
  ('PMY-LAN','JM2','LAN','Long An','Tây Ninh',1),
  ('PMY-GLA','JM2','GLA','Gia Lai','Gia Lai',3),
  ('PMY-DLK','JM2','DLK','Đắk Lắk','Đắk Lắk',3),
  ('PMY-DNG','JM2','DNG','Đà Nẵng','Đà Nẵng',4),
  ('CLO-NAN','JD9','NAN','Nghệ An','Nghệ An',1),
  ('CLO-HTI','JD9','HTI','Hà Tĩnh','Hà Tĩnh',1),
  ('CLO-THO','JD9','THO','Thanh Hóa','Thanh Hóa',1),
  ('CLO-QTR','JD9','QTR','Quảng Trị','Quảng Trị',2),
  ('HPG-HPH','JD8','HPH','Hải Phòng','Hải Phòng',1),
  ('HPG-HNO','JD8','HNO','Hà Nội','Hà Nội',1),
  ('HPG-QNI','JD8','QNI','Quảng Ninh','Quảng Ninh',1),
  ('HPG-BNI','JD8','BNI','Bắc Ninh','Bắc Ninh',1),
  ('HPG-HYE','JD8','HYE','Hưng Yên','Hưng Yên',1)
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
