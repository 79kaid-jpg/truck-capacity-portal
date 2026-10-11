# Đặt xe – bản nhanh trên Google Sheets + Google Calendar

Bản chạy ngay bằng Google Sheet + Apps Script, giữ các quy tắc nghiệp vụ của POV (sức chứa DK×30 + CN×15, giữ chỗ / xác nhận / từ chối / đề nghị đổi ngày / đặt lại, ngày nghỉ, nhắc việc, email 7:00).

Cài đặt: tạo Google Sheet → Tiện ích mở rộng → Apps Script → dán `Code.gs`, `appsscript.json`, thêm 2 file HTML tên `Sidebar` và `Action` → chạy `setup`.
Hướng dẫn đầy đủ: tài liệu "Đặt xe – bản nhanh trên Google Sheets + Calendar".

Kiểm thử logic (Node, mô phỏng dịch vụ Google): `node google-sheets/test/scenarios.js`
