# Truck Capacity Booking Portal – POV

Cổng đặt tải xe cho kho Phú Mỹ, Cửa Lò, Hải Phòng. Bản POV chạy hoàn toàn trên hạ tầng miễn phí:

| Thành phần | Dịch vụ | Vai trò |
|---|---|---|
| Giao diện | Cloudflare Pages (thư mục `web/`, không cần build) | Trang web tĩnh |
| Dữ liệu, đăng nhập | Supabase Free, region Singapore | Postgres + Auth + hàm nghiệp vụ |
| Email | Resend Free | Email thông báo và đặt lại mật khẩu |
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

## Bật email thông báo và quên mật khẩu

Email gửi qua **Resend** (miễn phí 100 email/ngày, 3.000 email/tháng). Có hai loại email:
- **Email thông báo nghiệp vụ** (giữ chỗ, xác nhận, từ chối, đổi ngày, hủy, sửa phần hàng): database tự gửi mỗi phút qua Resend API.
- **Email đặt lại mật khẩu**: Supabase Auth gửi qua SMTP của Resend.

> **Cần một tên miền** (ví dụ `congty.vn`) để gửi tới mọi người. Chưa có tên miền thì Resend chỉ cho gửi tới đúng email bạn đăng ký Resend, đủ để tự thử nhưng không đủ để chạy pilot.

### E1 – Tạo tài khoản và khóa Resend
1. Đăng ký tại resend.com.
2. Có tên miền: vào **Domains → Add Domain**, nhập tên miền, chọn region **Tokyo (ap-northeast-1)**. Thêm các bản ghi DNS Resend đưa ra (MX, TXT/SPF, DKIM) ở nơi quản lý tên miền, rồi bấm **Verify**. Thường mất vài phút đến vài giờ.
3. Vào **API Keys → Create API Key**, quyền **Sending access**, rồi copy khóa (bắt đầu bằng `re_`). Khóa này là **bí mật**: không gửi cho ai và không dán vào GitHub.

### E2 – Cài phần gửi email vào database
1. Supabase → **SQL Editor** → New query, dán nội dung [`supabase/email_setup.sql`](supabase/email_setup.sql) rồi bấm **Run**. Nếu hiện cảnh báo, chọn **Run without RLS**, vì script đã tự bật RLS.
2. Lưu khóa Resend vào Vault. Cách 1: vào **Integrations → Vault → Add new secret**, tên **`resend_api_key`**, giá trị là khóa `re_...`. Cách 2: chạy trong SQL Editor (thay khóa thật):
   ```sql
   select vault.create_secret('re_xxxxxxxxxxxx', 'resend_api_key');
   ```
3. Bật email, thay địa chỉ gửi và địa chỉ trang web của bạn:
   ```sql
   select app.setup_email('Đặt Xe <noreply@congty.vn>', 'https://truck-capacity-portal.pages.dev');
   -- Chưa có tên miền:  select app.setup_email('Đặt Xe <onboarding@resend.dev>', 'https://truck-capacity-portal.pages.dev');
   -- Tắt email:         select app.setup_email('Đặt Xe <noreply@congty.vn>', 'https://truck-capacity-portal.pages.dev', false);
   ```
4. Kiểm tra: đăng nhập Admin → **Dashboard → DB-06 → Gửi email thử cho tôi**. Email thường đến trong 1–2 phút. Thẻ "Email thông báo" hiện số đã gửi và lỗi gần nhất nếu có.

Hệ thống tự dừng gửi khi đạt 95 email/ngày, để không vượt gói miễn phí. Thông báo trong ứng dụng vẫn hoạt động bình thường.

### E3 – Quên mật khẩu (Supabase Auth gửi qua SMTP của Resend)
1. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://truck-capacity-portal.pages.dev`
   - **Redirect URLs:** thêm `https://truck-capacity-portal.pages.dev/**`
2. Supabase → **Authentication → Emails → SMTP Settings**, bật **Enable custom SMTP** rồi điền:
   - Sender email: `noreply@congty.vn` · Sender name: `Đặt Xe`
   - Host: `smtp.resend.com` · Port: `465`
   - Username: `resend` · Password: khóa Resend `re_...`
3. (Nên làm) **Authentication → Emails → Templates → Reset Password**, sửa sang tiếng Việt:
   - Subject: `[Đặt Xe] Đặt lại mật khẩu`
   - Body:
     ```html
     <p>Chào bạn,</p>
     <p>Bấm vào nút dưới đây để đặt mật khẩu mới cho cổng Đặt Xe. Link dùng được một lần và hết hạn sau 1 giờ.</p>
     <p><a href="{{ .ConfirmationURL }}">Đặt mật khẩu mới</a></p>
     <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
     ```
4. Kiểm tra: màn hình đăng nhập → **Quên mật khẩu?** → nhập email → mở link trong email → đặt mật khẩu mới.

Nếu không cấu hình SMTP riêng, Supabase chỉ gửi email đặt lại mật khẩu tới các thành viên của project Supabase, tối đa vài email mỗi giờ.

---

## Cập nhật phiên bản
- **Sau mỗi lần mình báo có thay đổi database:** mở `supabase/setup_all.sql` trên GitHub, copy toàn bộ, dán vào Supabase SQL Editor và Run (chọn **Run without RLS** nếu có cảnh báo). Dữ liệu, cấu hình và phân quyền đã chỉnh được giữ nguyên.
- **Giao diện:** sửa file trong `web/` rồi push hoặc commit lên GitHub. Cloudflare tự deploy lại.
- **Cơ sở dữ liệu:** chạy lại `supabase/setup_all.sql` trong SQL Editor. Các hàm được thay mới, dữ liệu giữ nguyên.

## Phân quyền
Admin vào **Setting user account → Phân quyền** để bật/tắt từng tính năng cho Logistics, CS, Sales, Admin. Máy chủ kiểm tra quyền ở mọi thao tác. Phạm vi dữ liệu cố định theo vai trò: Sales chỉ thao tác trên khách mình phụ trách; Khách hàng chỉ xem số tấn còn đặt được và đơn của mình. Admin luôn giữ quyền "Phân quyền vai trò" để không tự khóa mình.

## Login as
Admin (hoặc vai trò được cấp quyền "Login as người dùng khác") bấm **Login as** ở danh sách người dùng để xem và thao tác đúng như người đó, không cần mật khẩu của họ. Phiên tối đa 60 phút, có dải cảnh báo và nút **Thoát Login as** ở đầu trang. Nhật ký ghi lúc bắt đầu, lúc kết thúc và mọi thao tác kèm "… thao tác thay (Login as)". Trong phiên này không sửa được hồ sơ, mật khẩu, và không đổi trạng thái đã đọc thông báo của người kia.

## CS phụ trách, nghỉ phép và nhắc việc
- Mỗi khách hàng có **CS phụ trách** (Setting user account → Khách hàng → Sửa). Thông báo về booking của khách (xác nhận, từ chối, đổi ngày, sửa phần hàng) gửi cho CS phụ trách, người tạo booking và Sales.
- Mỗi CS tự khai **Nghỉ phép và người nhận thay** trong Hồ sơ cá nhân (Admin cũng đặt được ở màn hình Người dùng). Người nhận thay chỉ chọn được CS khác, không nghỉ trùng thời gian; Sales, Logistics, khách hàng không nhận thay vì không có quyền xử lý booking như CS. Khi CS nghỉ, thông báo chuyển cho người nhận thay, ghi rõ "[Nhận thay cho …]". Không có ai nhận thì gửi tất cả CS.
- Mỗi giờ hệ thống **nhắc tất cả CS** các booking Đề nghị đổi ngày chưa xử lý quá N giờ (Configuration, mặc định 4) và booking chờ xếp xe đã quá ngày bốc.
- CS có tab **Cần xử lý** trong Danh sách booking.
- **Booking bị từ chối:** CS mở chi tiết booking → **Đặt lại ngày khác** → chọn ngày còn chỗ → **Đặt lại (giữ chỗ)**. Mã booking và lịch sử từ chối được giữ; Logistics nhận lại yêu cầu giữ chỗ, khách nhận thông báo.
- **Khách hàng** thấy thống kê tháng tách theo trạng thái (Đã xác nhận, Chờ xếp xe, Đề nghị đổi ngày, Bị từ chối) và danh sách từng đơn; ô lịch hiện cả số tấn bị từ chối hoặc đề nghị đổi ngày.

## Thống kê cho Sales (cột phải màn hình Lịch)
Chỉ tính khách Sales phụ trách, theo tháng đang xem, chọn **Tất cả kho** hoặc kho đang xem:
- **Tổng đã đặt** = Đã xác nhận + Chờ xếp xe (+ Đề nghị đổi ngày nếu có) + Đang lưu tạm (nháp CS đã lưu cho khách), kèm số đơn.
- **Đã xác nhận đến hôm qua**: từ ngày 1 đến hôm qua.
- **Theo nửa tháng**: ngày 1–15 và ngày 16–cuối tháng.
- **Khách đặt nhiều nhất / ít nhất** (3 khách mỗi bên) và số khách chưa đặt trong tháng.
Tính theo ngày bốc; không gồm đơn bị từ chối, đã hủy. Sales chỉ thấy số liệu nháp, không mở hay sửa được nháp của CS.

## Danh sách booking – bộ lọc
- **Khách hàng**: Tất cả, **Khách tôi phụ trách** (CS: khách được gán cho mình và khách của CS đang nghỉ mà mình nhận thay; Sales: khách của mình), hoặc một khách cụ thể.
- **Ngày bốc**: Hôm nay, Tuần này (Thứ 2 – Chủ nhật), Tuần sau, **Tháng này** (mặc định), Tháng trước, Tháng sau, 30 ngày qua, 3 tháng gần đây, Tùy chọn (từ ngày – đến ngày, tối đa ~13 tháng). Dữ liệu tháng cũ được tải từ máy chủ khi chọn.
- Dòng tổng ở đầu bảng: số booking, tổng tấn, khoảng ngày; **Bỏ lọc** để về mặc định. Bộ lọc thời gian được nhớ trên máy đang dùng.
- Tab **Cần xử lý** không lọc theo thời gian.

## Tìm kiếm (Global Search)
Ô **Tìm kiếm** trên thanh trên cùng, hoặc phím **Ctrl+K** hay **/**. Gõ mã booking, số SO, tên khách (không dấu cũng được), ngày (`15/10`, `mai`, `thứ 6`), số tấn (`28t`, `28t 15/10`), mã xe (`DK-03 mai`), biển số, tài xế, trạng thái (`quá hạn`, `nháp`, `đổi ngày`, `quá tải`) hoặc tên màn hình. Kết quả theo đúng phạm vi dữ liệu của vai trò.

## Xác thực 2 lớp (MFA)
- Mặc định **bắt buộc với Logistics, CS và Admin**. Sales và Khách hàng tự bật nếu muốn (Hồ sơ cá nhân → Xác thực 2 lớp). Admin đổi vai trò bắt buộc ở **Phân quyền → Bảo mật → Bắt buộc xác thực 2 lớp**. Giai đoạn POV có thể bỏ tick ô Admin cho nhanh; khi chạy thật nên bật lại.
- Lần đầu đăng nhập sau khi bật, người dùng quét mã QR bằng **Google Authenticator** hoặc **Microsoft Authenticator** rồi nhập mã 6 số. Các lần sau chỉ nhập mã 6 số sau mật khẩu.
- Máy chủ chặn thật: phiên chưa nhập mã thì mọi hàm coi như chưa đăng nhập, không chỉ ẩn màn hình.
- Mất hoặc đổi điện thoại: tự đổi trong Hồ sơ cá nhân (khi còn máy cũ), hoặc Admin bấm **Gỡ MFA** ở danh sách người dùng; lần đăng nhập sau người đó đăng ký lại.
- **Cài đặt trên Supabase:** vào **Authentication → Multi-Factor** (hoặc Sign In / Providers → Multi-Factor Authentication), kiểm tra **TOTP (App Authenticator)** đang **Enabled** (mặc định là bật). Không cần trả phí. Sau đó chạy lại `setup_all.sql`.
- **Tạm tắt MFA cho Admin:** Phân quyền → bỏ tick Admin ở dòng "Bắt buộc xác thực 2 lớp" → Lưu; rồi Hồ sơ cá nhân → Tắt xác thực 2 lớp (nếu đã đăng ký thiết bị).
- **Admin duy nhất bị mất điện thoại:** chạy trong SQL Editor:
  `delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'email-admin@...');`

## Lưu ý gói miễn phí
- Supabase Free tự **tạm dừng** project sau 7 ngày không ai dùng. Vào Supabase bấm **Restore** để chạy lại.
- Gói Free **không có backup tự động**. Mỗi tuần nên export các bảng chính (Table Editor → schema `app` → Export CSV).
- Giới hạn: database 500 MB, egress 5 GB/tháng, 50.000 người dùng hoạt động/tháng. Theo dõi ở Dashboard DB-06 và trang Usage của Supabase.
- Resend Free: 100 email/ngày, 3.000 email/tháng; hệ thống tự dừng ở 95 email/ngày (xem DB-06).

## Cấu trúc mã nguồn
```
web/                      Giao diện (HTML + JS thuần, không cần build)
  index.html              Khung trang + CSS
  app.js                  Toàn bộ màn hình, gọi Supabase RPC
  config.js               URL + anon key (công khai)
supabase/
  migrations/0001_init.sql  Bảng, phân quyền, hàm nghiệp vụ
  seed.sql                  Danh mục: kho, khu vực, sản phẩm, màu, độ dày, khổ, cấu hình
  migrations/0002_email.sql Hàng đợi email + gửi qua Resend (pg_net, pg_cron, Vault)
  demo_data.sql             Hàm load_demo() / clear_demo()
  email_setup.sql           = 0002_email.sql, dán vào SQL Editor để bật email
  setup_all.sql             Gộp tất cả, dùng cho cài đặt mới
test/                     Kiểm thử cục bộ (Postgres 16 + Playwright), không deploy
```
