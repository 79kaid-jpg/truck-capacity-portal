# Truck Capacity Booking Portal – POV

Cổng đặt tải xe cho kho Phú Mỹ, Cửa Lò, Hải Phòng. Bản POV chạy hoàn toàn trên hạ tầng miễn phí:

| Thành phần | Dịch vụ | Vai trò |
|---|---|---|
| Giao diện | Cloudflare Pages (thư mục `web/`, không cần build) | Trang web tĩnh |
| Dữ liệu, đăng nhập | Supabase Free, region Singapore | Postgres + Auth + hàm nghiệp vụ |
| Mã nguồn | GitHub (repo private) | Mỗi lần push, Cloudflare tự deploy lại |

**Bảo mật:** mọi bảng nằm trong schema `app`, không mở ra API, đã bật RLS. Trình duyệt chỉ gọi các hàm trong schema `public`. Mỗi hàm tự kiểm tra vai trò và chỉ trả dữ liệu được phép, ví dụ khách hàng chỉ thấy số tấn còn đặt được và đơn của mình. `web/config.js` chỉ chứa URL và khóa **anon public**, đây là khóa công khai. Không bao giờ dán `service_role` / secret key hay mật khẩu database vào repo.

---

## Hướng dẫn deploy từng bước

### Bước 1 – Tạo cơ sở dữ liệu (Supabase)
1. Vào project Supabase `truck-capacity-pov`, chọn **SQL Editor → New query**.
2. Mở file [`supabase/setup_all.sql`](supabase/setup_all.sql) trên GitHub, bấm **Raw**, chọn hết và copy.
3. Dán vào SQL Editor rồi bấm **Run**. Kết quả mong đợi: `Success. No rows returned`.
   Chạy lại nhiều lần cũng không mất dữ liệu.

### Bước 2 – Tạo tài khoản Admin đầu tiên
1. Vào **Authentication → Users → Add user → Create new user**. Nhập email và mật khẩu của bạn, tick **Auto Confirm User**.
2. Quay lại **SQL Editor**, chạy câu sau (thay email và tên):
   ```sql
   select app.bootstrap_admin('email-cua-ban@congty.vn', 'Họ Tên');
   ```

### Bước 3 – Điền cấu hình kết nối
1. Trong Supabase vào **Project Settings → API** (hoặc **Data API**). Copy hai giá trị:
   - **Project URL**, dạng `https://abcd1234.supabase.co`
   - Khóa **anon public** (hoặc **Publishable key**)
2. Trên GitHub, mở file `web/config.js`, bấm biểu tượng ✏️ (Edit), thay hai giá trị `YOUR-...`, rồi bấm **Commit changes**.

### Bước 4 – Đưa web lên Cloudflare Pages
1. Vào Cloudflare dashboard, chọn **Workers & Pages → Create → Pages → Connect to Git**.
2. Chọn repo `truck-capacity-portal`.
3. Thiết lập build:
   - Framework preset: **None**
   - Build command: *(để trống)*
   - Build output directory: **`web`**
4. Bấm **Save and Deploy**. Sau khoảng 1 phút bạn có địa chỉ dạng `https://truck-capacity-portal.pages.dev`.

### Bước 5 – Đăng nhập và tạo người dùng
1. Mở địa chỉ `.pages.dev` và đăng nhập bằng tài khoản Admin.
2. Với mỗi người dùng (Logistics, CS, Sales, khách hàng):
   - **Supabase → Authentication → Add user**: nhập email và mật khẩu tạm, tick *Auto Confirm User*.
   - **Ứng dụng → Setting user account → Cấp quyền tài khoản**: nhập đúng email đó và chọn vai trò. Sales cần có segment và số điện thoại; tài khoản khách hàng cần chọn công ty.
   - Người dùng tự đổi mật khẩu trong **Hồ sơ cá nhân**.
3. Tài khoản khách hàng cần công ty có sẵn. Thêm công ty ở tab **Khách hàng**, sau khi đã có Sales cùng segment.

### Bước 6 (tùy chọn) – Nạp dữ liệu mẫu để chạy thử
Làm sau khi đã cấp quyền ít nhất một Sales Dân dụng, một Sales Dự án và một CS. Chạy trong SQL Editor:
```sql
select app.load_demo();   -- 10 khách hàng mẫu, khai báo xe 30 ngày tới, ~19 booking quanh hôm nay
-- select app.clear_demo();  -- xóa toàn bộ booking, khai báo xe và 10 khách hàng mẫu
```

---

## Cập nhật phiên bản
- **Giao diện:** sửa file trong `web/` rồi push hoặc commit lên GitHub. Cloudflare tự deploy lại.
- **Cơ sở dữ liệu:** chạy lại `supabase/setup_all.sql` trong SQL Editor. Các hàm được thay mới, dữ liệu giữ nguyên.

## Lưu ý gói miễn phí
- Supabase Free tự **tạm dừng** project sau 7 ngày không ai dùng. Vào Supabase bấm **Restore** để chạy lại.
- Gói Free **không có backup tự động**. Mỗi tuần nên export các bảng chính (Table Editor → schema `app` → Export CSV).
- Giới hạn: database 500 MB, egress 5 GB/tháng, 50.000 người dùng hoạt động/tháng. Theo dõi ở Dashboard DB-06 và trang Usage của Supabase.
- Email thông báo chưa có trong v0.1; thông báo hiện chỉ hiển thị trong ứng dụng.

## Cấu trúc mã nguồn
```
web/                      Giao diện (HTML + JS thuần, không cần build)
  index.html              Khung trang + CSS
  app.js                  Toàn bộ màn hình, gọi Supabase RPC
  config.js               URL + anon key (công khai)
supabase/
  migrations/0001_init.sql  Bảng, phân quyền, hàm nghiệp vụ
  seed.sql                  Danh mục: kho, khu vực, sản phẩm, màu, độ dày, khổ, cấu hình
  demo_data.sql             Hàm load_demo() / clear_demo()
  setup_all.sql             Gộp 3 file trên, dùng để dán vào SQL Editor
test/                     Kiểm thử cục bộ (Postgres 16 + Playwright), không deploy
```
