# Truck Capacity Booking Portal – POV

Cổng đặt tải xe cho kho Phú Mỹ, Cửa Lò, Hải Phòng. Bản POV chạy hoàn toàn trên hạ tầng miễn phí (kiến trúc mã: [CLAUDE.md](CLAUDE.md)):

| Thành phần | Dịch vụ | Vai trò |
|---|---|---|
| Giao diện | Cloudflare Pages (thư mục `web/`, không cần build) | Trang web tĩnh |
| Dữ liệu, đăng nhập | Supabase Free, region Singapore | Postgres + Auth + hàm nghiệp vụ |
| Email | Resend Free | Email thông báo và đặt lại mật khẩu |
| Mã nguồn | GitHub (repo private) | Mỗi lần push, Cloudflare tự deploy lại |

**Bảo mật:** mọi bảng nằm trong schema `app`, không mở ra API, đã bật RLS. Trình duyệt chỉ gọi các hàm trong schema `public`. Mỗi hàm tự kiểm tra vai trò và chỉ trả dữ liệu được phép, ví dụ khách hàng chỉ thấy số tấn còn đặt được và đơn của mình. `web/config.js` chỉ chứa URL và khóa **anon public**, đây là khóa công khai. Không bao giờ dán `service_role` / secret key hay mật khẩu database vào repo.

**Tài liệu liên quan:** Đặc tả yêu cầu (SRS v2.9: mục 13 ghi các bổ sung sau triển khai, mục 14 ghi tính năng mang từ bản Google Sheets), Thiết kế kỹ thuật POV (mục 12 ghi bản đã triển khai), UAT checklist 89 kịch bản.

**Tính năng chính:** lịch số tấn còn đặt được theo kho; CS giữ chỗ / lưu tạm; Logistics khai báo xe theo ngày, tải trọng từng xe, xếp xe, gợi ý gộp xe, từ chối / đề nghị đổi ngày; CS đặt lại booking bị từ chối; khách hàng xem lịch, đơn và thống kê của mình; phân quyền theo vai trò; Login as; CS phụ trách, nghỉ phép và người nhận thay, nhắc việc; Global Search; bộ lọc Danh sách booking; thống kê khách (nút Xe | Khách, DB-05, phạm vi thống kê); xác thực 2 lớp; email thông báo và quên mật khẩu; dashboard DB-01, DB-02, DB-05, DB-06.

**v2.9 (đợt 1, mang từ bản Google Sheets):** nhập nhiều dòng / dán Excel / tải file; giữ chỗ chỉ cần số tấn; ngày bốc gốc và lý do đổi ngày; đơn khẩn theo mốc chốt 16:00, hủy quá cận ngày; giao ngày nghỉ khi có khai báo xe; xác nhận giao hàng + danh sách cuộn; Đã load / Đang giao / Đã giao / Giao không thành công; load thiếu, tách đơn, không giao phần còn lại; đóng / mở xe; email gấp gửi ngay, còn lại gộp tóm tắt 7:00 và 16:00.

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
**Không chạy `clear_demo()` trên dữ liệu thật** (hàm xóa TOÀN BỘ booking).

### Bước 6b (tùy chọn) – Sinh dữ liệu trình diễn trên dữ liệu đang chạy (v3.35)
Dán `supabase/demo_gen.sql` vào SQL Editor → Run. Dùng khách hàng, Sales, CS, Logistics hiện có; sinh ~8.000 MT tháng trước (Dân dụng 4.500 / Dự án 3.000 / Export 500, ~90% đã giao), tháng này theo nhịp đến hôm nay, và ~40 đơn sắp tới (chỉ ở ngày đã có xe và còn chỗ), kèm lịch sử, nhật ký, yêu cầu đặt hàng, Trao đổi, thông báo. Mọi đơn có mã `DEMO-…`. Thống kê sẽ lẫn đơn mẫu cho tới khi xóa; đơn sắp tới chiếm chỗ xe thật.
```sql
select app.gen_demo_clear();   -- xóa sạch toàn bộ dữ liệu mẫu đã sinh (đơn thật không bị đụng)
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

## Thống kê khách hàng (cột Khách trên Lịch, Dashboard DB-05)
- **Sales**: cột phải màn hình Lịch luôn là thống kê khách. **Admin, Logistics, CS**: bấm nút **Xe | Khách** ở đầu cột thống kê (lựa chọn được nhớ trên máy).
- Số liệu theo tháng đang xem, theo ngày bốc, chọn **Tất cả kho** hoặc kho đang xem; khi phạm vi là tất cả khách thì chọn thêm **Tất cả / Dân dụng / Dự án**:
  - **Tổng đã đặt** = Đã xác nhận + Chờ xếp xe (+ Đề nghị đổi ngày) + Đang lưu tạm, kèm số đơn.
  - **Đã xác nhận đến hôm qua**; **Theo nửa tháng** (1–15, 16–cuối tháng); **Bị từ chối** (nhu cầu bị mất).
  - **Khách đặt nhiều nhất / ít nhất** (3 khách) và số khách chưa đặt.
- **Dashboard DB-05 Khách hàng và Sales** (quyền "Dashboard khách hàng và Sales"): chuyển tháng, segment, kho; 4 chỉ số chính (tổng đặt, xác nhận đến hôm qua, sắp tới, bị từ chối); bảng theo segment, theo tuần, theo Sales, theo khách (sắp xếp, % tỷ trọng), lý do từ chối.
- **Phạm vi thống kê** (Admin đặt trong form tài khoản): *Khách bạn phụ trách* (mặc định Sales), *Toàn bộ khách Dân dụng*, *Toàn bộ khách Dự án*, *Tất cả khách* (mặc định Admin/Logistics/CS). Ví dụ VP Sales Retail: vai trò Sales + phạm vi Dân dụng. Phạm vi chỉ đổi **số liệu tổng hợp**; xem chi tiết và sửa booking vẫn theo quyền vai trò. Muốn CS Manager xem DB-05 thì cấp quyền "Dashboard khách hàng và Sales" cho vai trò CS trong Phân quyền.
- Không gồm đơn đã hủy; đơn bị từ chối rồi đặt lại chỉ tính một lần theo trạng thái mới.

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

## v2.9 – giao hàng, nhập nhiều dòng, đơn khẩn (SRS mục 14)

- **Nhập nhiều dòng:** Danh sách booking (hoặc Lịch) → **Nhập nhiều dòng**. Dán từ Excel hoặc tải file .xlsx / .csv theo mẫu (Kho · Ngày bốc · Mã KH · Số tấn · Địa chỉ · Ref · Ghi chú; bỏ được 2 cột đầu). Xem trước cộng dồn sức chứa từng kho · ngày; kết quả có dòng không nhận, ngày gợi ý, tải file dòng lỗi, sửa lại trong form.
- **Giữ chỗ** chỉ bắt buộc số tấn. Địa chỉ giao bắt buộc từ bước Xác nhận giao hàng. Khu vực tự điền theo địa chỉ, để "Chưa phân khu vực" được.
- **Đổi ngày bốc** booking đã giữ chỗ: chọn lý do + bên yêu cầu (Khách / CS / Logistics). Ngày bốc gốc giữ nguyên để thống kê.
- **Đơn khẩn:** giữ chỗ / đổi sang một ngày bốc sau giờ chốt (mặc định 16:00) của ngày hôm trước. Admin đặt / bỏ cờ kèm lý do. Hủy booking đã xác nhận sau mốc chốt = **Hủy quá cận ngày giao**.
- **Ngày nghỉ:** Logistics vẫn khai báo xe được (bắt buộc lý do) → đặt được như ngày thường, ô lịch có nhãn ⚠ CN / ⚠ Lễ, email có "GIAO NGÀY NGHỈ".
- **Xác nhận giao hàng (CS):** dán bảng cuộn 9 cột (Whs, Order no, Ln, Itmno, Name, Lot number, Allocated qty, Attr value, Customer). Chặn Lot trùng, nhiều khách, Lot đang ở booking khác; cảnh báo khác Mã KH ERP / khác kho → "Đã kiểm tra – vẫn lưu". Thiếu quá ±3% / 0,5 t: Tách đơn (`<mã>-2`, chờ hẹn hoặc có ngày) hoặc Không giao phần còn lại. Dư: tick cập nhật số tấn.
- **Logistics:** Đã load hàng (bỏ tick cuộn không lên xe + ghi chú) → Đang giao (dự kiến tới) → Đã giao, hoặc Giao không thành công (CS Giao lại / Hủy). Từ Đã load, CS không đổi ngày / số tấn / hủy.
- **Đóng xe:** popup xe → Đóng xe (tải trọng = số đã xếp, không gợi ý, không xếp thêm) / Mở lại.
- **Email:** việc gấp (đơn khẩn, hủy cận ngày, giao hàng gấp, load thiếu, giao lỗi, giao ngày nghỉ) gửi ngay; còn lại gộp một email tóm tắt mỗi người lúc 7:00 và 16:00 (trừ Chủ nhật). Hồ sơ cá nhân → mức nhận email (Tất cả / Chỉ việc gấp / Không) và email nhận riêng (Outlook).
- **Cấu hình mới** (bảng `app.settings`): `cutoff` "16:00", `coilPct` 3, `coilTons` 0.5, `digestTimes` ["07:00","16:00"], `emailUrgent`. Mã kho ERP ở `app.warehouses.erp_code` (từ v3.0 mã kho = mã ERP: JM2, JD8, JD9); Mã KH ERP ở `app.customers.erp_code`.










## v3.50 — Đặt hàng theo ngày giao, Zone vận chuyển

> **Chạy `supabase/setup_all.sql` trước khi gộp.** Lần chạy đầu bật sẵn chế độ đặt theo ngày giao, tạo Zone, gắn Zone cho khu vực, thêm khu vực còn thiếu, điền ngày giao cho đơn cũ.

- **Ngày giao → ngày bốc:** CS, Sales, khách chỉ chọn **ngày giao** (ngày hàng tới tay khách). Hệ thống tính **ngày bốc** = ngày giao − số ngày xe chạy (tính cả Chủ nhật); rơi vào ngày kho nghỉ chưa khai báo xe thì lùi thêm. Năng lực xe, cutoff, xếp xe, đơn khẩn vẫn theo ngày bốc.
- **Zone:** số ngày theo Kho × Zone (Phú Mỹ: South East 1, Mekong 1, Highland 2, Central 4; Hải Phòng: North 1, Red River 1; Cửa Lò: Red River 1, Central 2). Khu vực thuộc một Zone; **số ngày riêng** cho ngoại lệ (Hà Giang, Bình Định 2 ngày). Khu vực lấy theo địa chỉ giao của từng đơn (đã lưu, hoặc đoán theo tên tỉnh cũ / **tên gọi khác** trong địa chỉ), nên giữ chỗ bắt buộc có địa chỉ xác định được khu vực.
- **Giao gấp:** ngày bốc tính ra đã qua → báo "Không kịp", cho chọn **Đơn khẩn** (bốc hôm nay, cờ khẩn).
- **Logistics:** lịch mặc định theo ngày bốc; đơn có thêm ngày giao. **Đổi ngày bốc** sớm hơn ngày gợi ý (chi tiết booking, chi tiết ngày), không cần CS duyệt; muộn hơn thì vẫn Đề nghị đổi ngày.
- **Lịch:** nút Ngày giao / Ngày bốc. Ở Ngày giao, đơn nằm ở ô ngày giao; năng lực của ô = năng lực ngày bốc tương ứng với Zone đang chọn.
- **Cấu hình › Vận chuyển** (quyền mới `config.transport`, Logistics + Admin): sửa Zone, số ngày riêng, tên gọi khác; **Tải Excel / Nạp Excel** (xem trước thêm / sửa / lỗi, có lỗi thì không ghi); liệt kê đơn đang bốc muộn hơn ngày gợi ý sau khi đổi số liệu (không tự đổi). Admin bật / tắt chế độ đặt theo ngày giao.
- Yêu cầu đặt hàng: ngày bốc dự kiến theo Zone địa chỉ của khách.
- Mã: `web/v63.js`; CSDL: `app.zones`, `regions.zone_code / days_own / aliases`, `app.calc_load_day`, `app.guess_region`, trigger `bk_deliv`, `save_zone`, `save_region_transport`, `import_transport`, `transport_drift`, `set_load_day`. Test: `test/99m_ngay_giao.sql`, `test/e2e/v63.mjs`.

## v3.49 — Icon mới, Khai báo xe tháng sau, sửa dữ liệu mẫu

Không bắt buộc chạy lại `setup_all.sql` (chỉ đổi `load_demo()`, hàm này chỉ tạo booking mẫu khi chưa có booking nào).

- **Icon:** xe đầu kéo chở 3 cuộn coil. PNG nền đặc cho iPhone (`apple-touch-icon.png` 180) và Android (192, 512, maskable 512); đường dẫn có `?v=349`. iPhone đang hiện chữ "Đ": xóa icon cũ, xóa dữ liệu Safari rồi Thêm vào Màn hình chính lại.
- **Khai báo xe (`v62.js`):** "Điền vào bảng" tự chuyển sang tháng của "Từ ngày" (trước đây chỉ điền tháng đang xem nên khai báo tháng sau không lưu được gì), báo đúng số ngày đã điền, báo lỗi khi không điền được ngày nào. Chuyển tháng / đổi kho khi còn thay đổi chưa lưu thì hỏi lại.
- **Dữ liệu mẫu:** `load_demo()` đặt booking mẫu theo ngày làm việc thứ n, hết chồng xe khi +n ngày rơi vào Chủ nhật (test `99l_demo_gen.sql` lỗi theo thứ trong tuần).

## v3.48 — UI/UX theo vai trò

Không đổi database. Theo rà soát `claude/ra-soat-ui-ux-theo-vai-tro.md` (Project).
- **Tên menu tiếng Việt**: Thống kê, Người dùng, Chờ xếp xe, Khai báo xe, Cấu hình, Trao đổi (chỉ biểu tượng; tên hiện khi rê chuột và cho trình đọc màn hình).
- **Điện thoại: thanh điều hướng dưới** (chỉ biểu tượng) 4 mục theo vai trò + **Thêm** (Khách: Lịch / Đơn của tôi / Thông báo; Sales: Thống kê / Lịch / Danh sách booking / Việc của tôi; CS: Việc của tôi / Lịch / Danh sách booking / Thông báo; Logistics: Chờ xếp xe / Lịch / Việc của tôi / Thông báo; Admin: Lịch / Chờ xếp xe / Người dùng / Việc của tôi).
- **Chờ xếp xe**: nút **Gợi ý xe** / **Chi tiết** trên từng dòng; trên điện thoại Chờ xếp xe, Danh sách booking, Đơn của tôi hiện dạng thẻ.
- **Trang chủ theo vai trò** khi đăng nhập: Sales → Thống kê, CS → Việc của tôi, Logistics → Chờ xếp xe (Khách, Admin: Lịch).
- **Đơn của tôi** cho khách (Sắp tới / 30 ngày qua).
- Hai nút trên Lịch: **Tạo yêu cầu** và **Danh sách yêu cầu**.
- Danh sách booking trên điện thoại: bộ lọc thu vào nút **Bộ lọc (n)**, tab một hàng cuộn ngang.
- Header điện thoại gọn, dải chọn kho xuống dòng, bảng Thống kê cuộn trong khung, tiêu đề bớt chữ in hoa.
## v3.47 — Chi tiết ngày trên điện thoại

- Điện thoại: tóm tắt ngày (còn đặt được, đã xếp / giữ chỗ, số xe theo tình trạng, nút Đặt hàng mới) lên đầu trang; thanh chọn **Đơn chờ / Xe / Gợi ý gộp** dính trên cùng khi cuộn.
- Đơn chờ xếp xe nằm trên danh sách xe; xe trống gom thành một dòng "N xe trống", bấm để mở.
- Máy tính giữ nguyên bố cục.
## v3.46 — Khung chat trên điện thoại

- Ô nhập cỡ chữ 16px: iPhone không còn tự phóng to làm khung chat tràn sang phải.
- Trên điện thoại khung chat chiếm trọn màn hình, co theo bàn phím, chừa tai thỏ / thanh home; nút Gửi, Mới, Đóng ≥ 44px.
- Mã booking, link dài tự ngắt dòng, bảng trong tin nhắn cuộn ngang trong bong bóng.
## v3.45 — Trợ lý bền hơn, hiện rõ khi Claude lỗi

- Segment chỉ nhận DD / DA / EX (hiểu "dân dụng", "dự án", "xuất khẩu"); giá trị bịa như "UR", "all" bị bỏ và báo lại cho mô hình.
- Tra Hướng dẫn bằng cả câu gốc người dùng gõ, nên từ khóa bị hỏng dấu vẫn tìm đúng mục.
- Claude đang bật mà câu trả lời do mô hình miễn phí (Claude lỗi) → nhãn khung chat **Miễn phí (Claude lỗi)** màu cam, rê chuột xem lý do; khung Trợ lý của Admin hiện lỗi Claude gần nhất (trên máy đó).
- Kiểm thử trợ lý: ghi mô hình thực sự trả lời từng câu, câu bị chuyển sang mô hình miễn phí tính Trượt; bảng Copy có dòng "Mô hình chọn" và cột "Mô hình trả lời".
## v3.44.1 — Sửa gọi Claude

- Bỏ tham số `temperature` khi gọi Anthropic: các mô hình Claude mới từ chối tham số này, khiến trợ lý luôn tự chuyển sang mô hình miễn phí.
## v3.44 — Trợ lý chính xác hơn, số tấn gọn

- Số tấn tròn không còn hiện ",00" trên toàn Portal (100 MT, 88,5 MT, 30,25 MT).
- Trợ lý (cả mô hình miễn phí và Claude): mỗi công cụ chỉ nhận tham số có thật, tham số lạ bị bỏ và báo lại; quy tắc không tự thêm bộ lọc kho / segment / khách; "tạo đơn … bốc ngày X" mở lưới Đặt hàng theo ngày bốc, form Yêu cầu chỉ dùng cho ngày giao; tra Hướng dẫn ưu tiên từ hiếm, tiêu đề, từ khóa mục (`data-k` trong `guide.html`).
- Kiểm thử trợ lý chấm chặt hơn: hiểu "chưa đặt đơn nào" = 0; Trượt khi dùng tham số không có thật, tự thêm bộ lọc người hỏi không nêu, thao tác sai công cụ / ngày / kho, câu Hướng dẫn thiếu ý chính, hoặc viết "300.00 MT".
## v3.43 — Trợ lý: bật Claude khi cần

**Chạy `supabase/setup_all.sql` trước khi dùng** (cột `chat_log.engine`, `app.ai_engine`, RPC `set_ai`, cấu hình `aiEngine`, `aiModel`, `aiUntil`, `aiClaudeDaily`).
- Configuration → khung Trợ lý → **Mô hình AI** (chỉ Admin): Miễn phí (Llama) hoặc Claude Haiku / Sonnet, bật trong 2 giờ / 4 giờ / đến hết ngày, hết hạn tự quay về Miễn phí. **Tắt ngay** bất kỳ lúc nào.
- Hạn mức lượt Claude / ngày toàn hệ thống (mặc định 200); hết thì tự về Miễn phí và báo Admin.
- `functions/api/chat.js`: khi Claude đang bật và có biến bí mật **`ANTHROPIC_API_KEY`** trên Cloudflare Pages → gọi Anthropic với cơ chế gọi công cụ chuẩn; thiếu khóa hoặc Anthropic lỗi → tự dùng Llama. Khóa không nằm trong code hay database.
- Đầu khung chat có nhãn **✦ Claude** / **Miễn phí**; Kiểm thử trợ lý ghi mô hình của mỗi lần chạy.
- Cài khóa: Cloudflare → Pages → `truck-capacity-portal` → Settings → Variables and Secrets → thêm `ANTHROPIC_API_KEY` (Secret) → deploy lại.
## v3.42 — Kiểm thử trợ lý

- Configuration → Ngưỡng & tải trọng → khung Trợ lý → **Kiểm thử trợ lý** (chỉ Admin): chạy 30 câu hỏi chuẩn (tình trạng xe/đơn, thống kê, khách hàng, đơn hàng, năng lực, hướng dẫn, thao tác, ngoài phạm vi; có câu hỏi nối tiếp) qua đúng chatbot đang dùng.
- Đáp án đúng tính trực tiếp từ dữ liệu bằng chính các công cụ của trợ lý; chấm: gọi đúng công cụ, đúng số liệu / ý chính, không lỗi, không hiện JSON. Thao tác mở màn / điền form chỉ ghi lại.
- Điểm lưu 10 lần gần nhất trên trình duyệt để so trước / sau khi đổi mô hình; **Copy kết quả** ra bảng để dán Excel.
- Mỗi câu tốn 1 lượt trợ lý của Admin (câu nối tiếp tốn 2).
## v3.41 — Khu vực giao hàng theo địa chỉ ERP

- Khu vực mẫu dựng lại theo địa chỉ giao hàng thật trong ERP: 39 khu vực (JM2 25, JD9 4, JD8 10), đặt theo tỉnh cũ kèm tỉnh mới; lân cận chỉ nối các tỉnh kề nhau trên cùng tuyến đường, luôn hai chiều.
- Cột "Đi-về (ngày)" đổi thành "Đi (ngày)": số ngày xe đi một chiều, vì xe thuê theo chuyến.
- Database đang chạy không tự đổi khi cập nhật phiên bản. Muốn làm lại khu vực trên database thật thì chạy script riêng (không lưu trong repo vì chứa địa chỉ khách).
## v3.0 – lưới đặt hàng, mã kho mới, trạng thái theo sơ đồ
- **Lưới đặt hàng** (`web/v30.js`): nút Đặt hàng trên Lịch và Danh sách mở lưới nhiều dòng. Gõ mã hoặc tên khách để tìm; địa chỉ lấy theo khách; dán từ Excel (Ctrl+V) hoặc tải file CSV/XLSX; không nhập sản phẩm, chỉ nhập số tấn. Có 2 nút: Lưu tạm và Gửi Logistics. Nếu nhập địa chỉ mới, hệ thống hỏi có lưu vào hồ sơ khách không; chỉ lưu khi bạn đồng ý.
- **Mã kho**: JM2 – Phú Mỹ, JD8 – Hải Phòng, JD9 – Cửa Lò. Chạy `setup_all.sql` sẽ tự đổi PMY/HPG/CLO sang mã mới cho dữ liệu cũ. Khách có thêm **Kho mặc định** nhưng vẫn đặt được ở nhiều kho. Màn **Cấu hình › Kho** cho thêm kho, sửa tên, mã ERP và ngừng dùng kho. Đơn thuộc kho đã ngừng có nút **Đổi kho**; sau khi đổi, đơn về Lưu tạm.
- **Trạng thái**:
  - **Lưu tạm** không trừ năng lực. CS bấm **Gửi Logistics** để chuyển đơn sang Chờ xếp xe.
  - Quá giờ chốt, hệ thống nhắc CS một lần. Nháp quá ngày bốc 2 ngày thì hệ thống tự hủy.
  - Đổi tên trạng thái: Đã xác nhận → **Đã xếp xe**; Đã load hàng → **Đã bốc hàng**.
  - Hiển thị thêm: **Đã xác nhận giao hàng** (đã xếp xe và có cuộn) và **Hủy quá cận ngày**.
  - CS vẫn dán cuộn sớm được. Khi đó Logistics nhận thông báo "Giao hàng gấp" để xếp xe ngay.
- RPC mới: `send_to_logistics`, `save_warehouse`, `change_booking_wh`. Test: `test/97_v30.sql`.

## v3.1 – tốc độ, sửa trùng, nhập khách hàng từ file
- **Danh mục khách giữ trong trình duyệt** (F1): `get_state(p_from, p_to, p_cat)`. Nếu khóa danh mục `p_cat` trùng với trên máy chủ thì không gửi lại danh sách khách và địa chỉ, nên sau mỗi thao tác chỉ tải lại đơn và xe. Khóa này đổi khi bảng khách, địa chỉ hoặc khu vực của địa chỉ thay đổi (`app.cat_seq`). Dữ liệu được xóa khỏi trình duyệt khi đăng xuất.
- **Phát hiện người khác vừa sửa** (F2): mỗi lần nội dung đơn đổi thì `bookings.rev` tăng 1. Trình duyệt gửi header `x-bk-rev` (mã:rev) của đơn đang mở. Nếu người khác đã sửa sau lúc mình mở, máy chủ báo "Đơn … vừa được X cập nhật lúc …" và trình duyệt tự tải lại bản mới.
- **Tự làm mới** (F3): cứ 30 giây, và mỗi khi quay lại tab, trình duyệt gọi `get_ver()` (vài byte). Chỉ khi có thay đổi và người dùng không đang mở hộp thoại hay nhập liệu thì mới tải lại. Cách này thay cho việc tải lại toàn bộ mỗi 60 giây như trước.
- **Nhập khách hàng từ file** (F6): vào Setting user account › Khách hàng › **Nhập từ file**. Nhận file Excel hoặc CSV theo cột của bản Google Sheets: bảng "Khách hàng" và bảng "Địa chỉ giao".
  - Bước đầu chỉ kiểm tra: báo số khách mới, số khách cập nhật, các lỗi và cảnh báo. Bấm Ghi thì mới lưu vào hệ thống.
  - Tỉnh được tự nhận từ dòng địa chỉ cuối, kể cả tên tỉnh cũ trước khi sáp nhập. Khu vực giao được gán khi kho có đúng một khu vực của tỉnh đó.
  - Danh sách khách có ô tìm và chỉ hiện 100 dòng mỗi lần.
- **Segment Export** (F7).
- RPC mới: `get_ver`, `import_customers`. Test: `test/98_v31.sql`, `test/e2e/v31.mjs`.

## v3.2 – đăng nhập bằng tên ngắn
- Ô đăng nhập và Quên mật khẩu nhận cả tên ngắn: gõ `hung.phan`, app tự thêm `@bluescope.com`. Email khác (như Gmail) vẫn gõ đủ.
- Muốn đổi tên miền thì thêm `LOGIN_DOMAIN:'tenmien.com'` vào `web/config.js`. Test: `test/e2e/login32.mjs`.

## v3.3 – giao trễ ngày bốc, xe thùng XT, icon xe theo tải
- **Xác nhận giao hàng sau ngày bốc:** đơn có ngày bốc đã qua thì bắt buộc nhập **Ngày giao thực tế** (từ hôm nay trở đi). Khi lưu:
  - đơn chuyển sang ngày đó, gỡ xe ngày cũ;
  - trạng thái thành **Đã XN giao hàng · Chờ xếp xe**, Logistics nhận thông báo "Giao hàng gấp";
  - lịch sử ghi lại lần đổi ngày, không tính vào số lần đổi ngày của đơn.
- **Xe container (CN) đổi thành xe thùng (XT):** chạy `setup_all.sql` sẽ đổi mã xe cũ `…-CN-01` thành `…-XT-01`. Cột `cn_count` và cấu hình `capCN` giữ nguyên tên trong database.
- **Icon xe theo tải:**
  - Đầu kéo có 3 cuộn tôn, trống thì trắng, xếp đến đâu tô màu đến đó. Xe thùng tô thùng theo % tải.
  - Màu: xanh dưới ngưỡng gần đầy, cam từ ngưỡng gần đầy, đỏ khi đủ tải, đỏ đậm khi vượt tải, xám kèm 🔒 khi xe đã đóng.
- Test: `test/99_v33.sql`, `test/e2e/v33.mjs`.

## v3.5 – Bảng thống kê mới (như bản Google Sheets)
- Trang Dashboard thay bằng **Bảng thống kê đặt xe** (`web/v35.js`), gồm 8 tab:
  - Tổng quan, CS, Logistics, Sales, Ngoại lệ, Lịch đơn, Mục tiêu, Hệ thống.
  - Mỗi vai trò mở sẵn tab của mình: CS vào tab CS, Logistics vào tab Logistics, Sales vào tab Sales.
- Bộ lọc kỳ: Ngày / Tuần / Tháng / Quý / Năm / Tùy chọn, kèm Kho và Segment. Có nút ⬇ Excel và In / PDF.
- **Bấm vào ô số, cột, thanh hoặc ô bảng** sẽ mở danh sách đơn đúng phần đó (có ⬇ Excel). Bấm một đơn để mở chi tiết; "← Quay lại" về đúng tab, bộ lọc và danh sách.
- Dữ liệu: `dash_data(p_from, p_to)` lấy dữ liệu một lần theo kỳ (tối đa 400 ngày), theo phạm vi thống kê của người xem. Lọc kho / segment tính ngay trên trình duyệt.
- **Mục tiêu:** bảng `app.targets` lưu tấn theo tháng × segment. Nhập ở Cấu hình › Mục tiêu (quyền `config.targets`, mặc định Admin).
- **Area:** khách có thêm `area` và `area_detail`, lấy từ cột Area và Area chi tiết khi nhập khách từ file.
- Test: `test/e2e/v35.mjs`.

## v3.6 – Lịch đặt xe dễ nhìn hơn, đơn vị MT
- **Đơn vị:** mọi số tấn hiển thị là **MT** (metric tấn), cả trong thông báo và lỗi từ máy chủ.
- **Ô lịch:**
  - cột Chủ nhật hẹp lại, ngày đã qua và ngày chưa mở lịch xe được thu gọn;
  - mỗi ô hiện **Còn đặt được** cỡ lớn, có thanh năng lực tô màu theo mức đặt;
  - chỉ gắn nhãn khi Gần đầy hoặc Đầy;
  - bấm cả ô để mở Chi tiết ngày; nút ＋ đặt hàng hiện khi rê chuột;
  - nhãn đơn chờ ghi "⏳ n đơn chờ xếp xe · x MT";
  - rê chuột vào ô để xem nhanh khách, số MT, trạng thái và xe trống.
- Thêm **cột Tuần** ở cuối mỗi hàng.
- **Lọc nhanh:** Có đơn chờ xếp xe · Có đơn khẩn · Đơn của tôi. Ô Kho có thêm lựa chọn **Tất cả kho**: mỗi ô hiện từng kho, bấm vào kho nào thì mở ngày của kho đó.
- Thêm chế độ **Xem 2 tuần**: mỗi ngày hiện tên khách, số MT và trạng thái.
- **Phím tắt:** ← → chuyển kỳ, T về hôm nay, N mở Đặt hàng.
- **Khung thống kê:**
  - **Xe:**
    - đã xếp xe trong tháng;
    - % sử dụng năng lực;
    - mức lấp đầy của các xe đang chạy;
    - số lượt DK/XT đã dùng;
    - biểu đồ theo tuần;
    - tình hình hôm nay và ngày mai;
    - đơn chờ xếp xe (bấm để lọc lịch);
    - ngày cao điểm;
    - các ngày đầy hoặc gần đầy;
    - xe chạy non tải;
    - ngày có ghi chú giảm xe.
  - **Khách:** bấm từng dòng để mở danh sách đơn trong Bảng thống kê. "Chưa đặt tháng này" mở danh sách khách chưa đặt kèm Sales phụ trách.
  - Có nút **Thu gọn** để lịch rộng hơn; trình duyệt nhớ lựa chọn này.
- File: `web/v36.js`. Test: `test/e2e/v36.mjs`.

## v3.7 – Phím tắt cấu hình được
- Mỗi người tự đổi phím ở **Hồ sơ › Phím tắt của tôi**: bấm vào ô rồi nhấn tổ hợp mới (ghi được chuỗi 2 phím như G rồi L).
- Admin vào **Cấu hình › Phím tắt** để:
  - đặt phím mặc định cho cả công ty;
  - bật / tắt phím tắt và phím một chữ cái;
  - **reset** phím của một người hoặc của tất cả về mặc định công ty.
- Phím áp dụng theo thứ tự: mặc định hệ thống → mặc định công ty (`settings.shortcuts`) → phím riêng của từng người (`profiles.shortcuts`).
- **Kiểm tra khi đặt phím:**
  - ⛔ chặn phím của trình duyệt, Windows/macOS, Unikey/EVKey và phím dán Excel; chặn mọi tổ hợp Ctrl+Alt;
  - ⛔ chặn phím trùng với thao tác khác trong cùng màn hình;
  - ⚠ chỉ cảnh báo với phím thường dùng ở Teams, Zalo, Outlook, Excel.
- Phím một chữ cái chỉ có tác dụng khi không đang gõ trong ô nhập liệu. Trong lưới và hộp thoại bắt buộc dùng Ctrl/Alt.
- Bấm `?` để mở bảng phím tắt. Rê chuột vào nút sẽ thấy phím tương ứng. Ctrl+K (tìm kiếm) và Esc (đóng hộp thoại) là phím cố định.
- RPC: `save_my_shortcuts`, `admin_save_shortcuts`, `admin_reset_shortcuts`. File: `web/v37.js`. Test: `test/e2e/v37.mjs`.

## v3.8 – Hướng dẫn sử dụng, Xem như khách hàng
- **Hướng dẫn sử dụng** (`web/guide.html`, ảnh minh họa trong `web/guide/*.jpg`):
  - Mở bằng nút ❓ Hướng dẫn trên thanh trên cùng, phím `G` → `H`, hoặc link "Hướng dẫn màn này" ở từng màn hình.
  - Hiện ở khung bên phải, có ô tìm (gõ không dấu được), tự mở mục đúng vai trò người đọc, có nút In / PDF.
  - Kéo cạnh trái để đổi độ rộng; có nút ⛶ toàn màn hình và A− / A+ cỡ chữ. Trình duyệt nhớ độ rộng và cỡ chữ. Khung hẹp thì danh mục thành ô chọn mục.
  - Sửa nội dung trực tiếp trong `guide.html`. Khi giao diện đổi, chụp lại ảnh bằng `node test/e2e/guide_shots.mjs`.
- **Xem như khách hàng** (Admin, quyền `users.impersonate`):
  - Mở bằng nút 👁 ở tab Khách hàng, hoặc tìm khách bằng Ctrl+K.
  - Hiện đúng giao diện khách thấy, **chỉ xem**, không cần khách có tài khoản. Có thanh màu cam báo đang ở chế độ này, tự hết sau 60 phút và ghi nhật ký.
  - Máy chủ chặn mọi thao tác (kiểm tra trong `app.require_perm`) khi đang ở chế độ này.
  - RPC: `cust_view_start`, `cust_view_stop`. Bảng: `app.cust_views`.
- Test: `test/e2e/v38.mjs`.

## v3.10 — Quay lại / đi tới màn hình
- Phím **B B** quay lại màn hình trước, **B N** đi tới màn hình vừa rời; đồng bộ với nút Back / Forward của trình duyệt (nhớ 20 màn). Đổi được trong Cấu hình phím tắt.
- Menu khung Hướng dẫn có lề, nhóm tách rõ; toàn màn hình không còn bị cắt mép trái. Không cần chạy SQL.
- Test: `test/e2e/v39.mjs`.

## v3.11 — Lịch khách hàng nhiều kho
- Khách chọn kho bằng hàng nút (Tất cả kho mặc định, kho hay đặt đứng đầu, nhớ lựa chọn).
- Tất cả kho: mỗi ô ghi MT còn đặt được từng kho + huy hiệu đơn của khách theo kho; chi tiết ngày gộp mọi kho.
- Khung "Đơn của tôi": KPI tháng + đơn 14 ngày tới mọi kho. Khách không còn thấy tooltip nội bộ. Không cần SQL.
- Test: `test/e2e/v40.mjs`.

## v3.12 — Hướng dẫn riêng cho khách
- Khách (và Admin khi Xem như khách) chỉ tải `web/guide-kh.html`. Ảnh: `node test/e2e/guide_kh_shots.mjs` (lưu `web/guide/kh-*.jpg`). Không cần SQL.

## v3.13 — Yêu cầu đặt hàng, phiên bản mới, PWA, sao lưu tự động
**Chạy `supabase/setup_all.sql` trước khi gộp nhánh** (bảng `app.order_requests`, RPC `req_create`, `req_update`, quyền `req.create`, `req.handle`).
- **Yêu cầu đặt hàng 💬** (`web/v41.js`): khách / Sales ghi nhanh nhu cầu tự do ("20 MT HC 0.5 xanh dương…"), hiện chip tím trên ô ngày, CS "Tạo đơn từ yêu cầu" (lưới điền sẵn) / "Đã tạo đơn" / "Không nhận" (bắt buộc lý do); thông báo 2 chiều. Test: `test/99b_req.sql`, `test/e2e/v41.mjs`.
- **Phiên bản mới** (`web/pwa.js`, `web/version.json`): tự kiểm tra 5 phút/lần, hiện "Đã có phiên bản mới → Tải lại". Mỗi lần phát hành: `bash tools/bump-version.sh 3.14.0 "ghi chú"`. Thêm file JS mới thì thêm vào `index.html` **và** danh sách `SHELL` trong `web/sw.js`. `web/_headers`: Cloudflare không cho trình duyệt giữ bản cũ.
- **PWA** (`web/sw.js`): cài lên màn hình chính; mất mạng vẫn xem lịch lần tải gần nhất (lưu trên máy, xóa khi đăng xuất), thao tác bị khóa. Test: `test/e2e/pwa.mjs`.
- **Sao lưu tự động** (`.github/workflows/backup.yml`): tối Chủ nhật 22:00 xuất schema `app` + tài khoản, mã hóa AES-256, lưu 90 ngày ở GitHub → Actions → "Sao lưu dữ liệu" → Artifacts.
  1. Supabase → **Connect** → **Session pooler** → copy URI, thay `[YOUR-PASSWORD]` bằng mật khẩu database.
  2. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**: `SUPABASE_DB_URL` và `BACKUP_PASSWORD` (≥ 12 ký tự, cất kỹ).
  3. Actions → "Sao lưu dữ liệu" → **Run workflow** để thử ngay.
  - Khôi phục: tải artifact, `gpg -d dat-xe-YYYY-MM-DD.tar.gz.gpg | tar -xz`, rồi `pg_restore --clean --if-exists --no-owner -d "$DB" app.dump`.
  - GitHub tắt lịch chạy nếu repo không có commit 60 ngày: vào Actions bấm Enable lại.

## v3.14 — Menu ô ngày
- Bấm 1 lần vào ô lịch: menu nhanh theo quyền (Yêu cầu đặt hàng ngày này, Đặt hàng, Xem yêu cầu, Chi tiết ngày / đội xe; khách: Yêu cầu, Xem đơn của tôi). Chỉ một lựa chọn thì chạy luôn. Bấm đúp: vào thẳng chi tiết ngày. Phím Y: yêu cầu cho ô đang chọn. Không cần SQL. Test: `test/e2e/v42.mjs`.

## v3.15 — Phạm vi Sales / RSM, picking list tùy chọn, nhắc xác nhận giao
**Chạy `supabase/setup_all.sql` trước khi gộp.**
- Bảo mật: yêu cầu đặt hàng chỉ trả về trong phạm vi (Sales: khách mình + yêu cầu mình gửi). Hàm chung `app.sees_sales`, `app.in_team`, `app.team_ids`.
- RSM: `profiles.manager_id`, phạm vi `team`, `notify_team` (nhận Từ chối / Đổi ngày của nhóm). Bảng thống kê lọc theo Sales.
- `requirePicking` (chỉ Admin, ghi nhật ký): tắt thì `mark_loaded` không cần danh sách cuộn.
- Đang giao báo thêm Sales. `app.escalate` nhắc Logistics đơn Đã load / Đang giao quá hạn (mỗi ngày 1 lần, 7h–20h; `shipRemindHours`, `shipAdminDays`). Ngoại lệ "Chưa xác nhận giao".
- Test: `test/99c_scope.sql`, `test/e2e/v43.mjs`.

## v3.16 — Trạng thái chuyến xe
**Chạy `supabase/setup_all.sql` trước khi gộp** (`app.truck_departed`, `app.truck_locked`; `day_metrics` không tính chỗ trống của xe đã chạy / đã đóng).
- Thẻ xe: mức lấp đầy (Trống / Còn chỗ x MT / Đầy / Quá tải) + trạng thái chuyến (Chờ bốc, Đang bốc n/m, Đã bốc xong, Đang giao, Đã giao xong ✓, Giao lỗi). Xe có đơn Đang giao / Đã giao / Giao lỗi = Đã chạy → khóa xếp thêm (máy chủ chặn).
- Test: `test/99d_trip.sql`, `test/e2e/trip.mjs`.

## v3.17 — Kéo thả booking vào xe
- `web/v44.js`: màn chi tiết ngày – kéo thả booking chờ xếp xe vào thẻ xe (chuột / cảm ứng), gợi ý xe (viền chạy quanh, xem trước tải trọng), Gợi ý tất cả, cảnh báo vượt tải / khác khuyến nghị (bắt buộc lý do), hiệu ứng bay vào xe, Hoàn tác. Ghi bằng RPC sẵn có `save_allocations` (xếp đủ tấn thì xác nhận). Không cần SQL. Test: `test/e2e/v44.mjs`.

## v3.18 — Tạo / xóa tài khoản trong ứng dụng
**Chạy `supabase/setup_all.sql` trước khi gộp.**
- `admin_create_user` (tạo luôn tài khoản đăng nhập trong `auth.users` + `auth.identities`, mật khẩu băm bcrypt, `must_change_pw`), `admin_reset_password`, `my_pw_changed`, `admin_user_refs`, `admin_delete_user` (chuyển giao khách / booking / người nhận thay, lưu tên vào `app.deleted_users`, hàm `app.uname`). Chỉ vai trò Admin.
- `web/v45.js`: bộ lọc (vai trò, segment, trạng thái, đăng nhập, tìm), tạo đơn lẻ / hàng loạt (CSV mật khẩu), đặt lại mật khẩu, xóa / xóa nhiều, bắt đổi mật khẩu lần đầu. Test: `test/99e_users.sql`, `test/e2e/v45.mjs`.

## v3.19 — Trợ lý (chatbot) miễn phí
**Chạy `supabase/setup_all.sql` trước khi gộp** (`customers.chat_enabled`, `app.chat_log`, RPC `chat_use`, `set_customer_chat`, `chat_stats`; cấu hình `chatOn`, `chatRoles`, `chatDaily`).
- `functions/api/chat.js` (Cloudflare Pages Function): kiểm tra token + quyền + hạn mức bằng `chat_use`, rồi gọi **Workers AI** (mặc định `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, đổi bằng biến `CHAT_MODEL`). Không giữ bí mật nào; đọc URL / anon key từ `web/config.js`.
- `web/v46.js`: khung chat, vòng hỏi → công cụ → trả lời. Công cụ chạy ở trình duyệt bằng tài khoản người dùng (capacity, find_bookings, booking_detail, requests, guide, fill_request, open; nội bộ: find_customer, find_trucks, truck_detail; Logistics: suggest_trucks, suggest_all; CS: fill_order). Bot chỉ điền sẵn form, không tự gửi.
- **Cài một lần trên Cloudflare:** Workers & Pages → project `truck-capacity-portal` → **Settings → Bindings → Add → Workers AI** → Variable name **`AI`** → Save → **Deployments → Retry deployment** (hoặc push một commit). Gói miễn phí Workers AI có hạn mức neuron mỗi ngày; hết thì trợ lý báo lỗi đến hôm sau.
- Test: `test/99f_chat.sql`, `node test/chat_fn.mjs`, `test/e2e/v46.mjs` (AI giả lập).

## v3.20 — Hạn mức trợ lý theo vai trò
**Chạy `supabase/setup_all.sql` trước khi gộp.** Cấu hình `chatDailyRole` (lượt/người/ngày theo vai trò, 0 = không cho dùng; mặc định nội bộ 150, khách 30) và `chatDailyTotal` (chặn tổng toàn hệ thống/ngày, mặc định 2000; Admin được báo khi dùng 80%). Cấu hình → Ngưỡng & tải trọng → khung Trợ lý; mức dùng theo vai trò.

## v3.21 — Trợ lý: số liệu khớp Bảng thống kê
- Công cụ `stats` dùng `dash_data` và đúng định nghĩa của Bảng thống kê (kỳ ngày / tuần / tháng / quý / năm / tùy chọn; lọc kho, segment, Sales, khách); trả sẵn mọi con số + link mở Bảng thống kê đúng kỳ và bộ lọc. `find_bookings` trả tổng theo trạng thái, tìm cả ghi chú / người liên hệ / yêu cầu. Lời dặn cấm AI tự cộng. Test đối chiếu trong `test/e2e/v46.mjs`. Không cần SQL.

## v3.22 — Tổng đã đặt không tính Lưu tạm
**Chạy `supabase/setup_all.sql` trước khi gộp** (`booking_stats` trả cả Đã load / Đang giao / Đã giao / Giao lỗi; mục tiêu năm không tính nháp).
- "Tổng đã đặt" = Đã có xe + Chờ xếp xe + Đổi ngày ở khung thống kê bên lịch, Bảng thống kê và trợ lý; Lưu tạm hiện riêng ("chưa tính"). Khung bên lịch: "Đã có xe" gồm cả đơn đã bốc / đang giao / đã giao, thêm dòng "trong đó đã giao". Test đối chiếu khung lịch ↔ Bảng thống kê ↔ trợ lý.


## v3.23 — Yêu cầu theo ngày giao · trợ lý không che màn hình
**Chạy `supabase/setup_all.sql` trước khi gộp** (thêm cột ngày giao cho yêu cầu, cấu hình số ngày vận chuyển, hàm `req_set_day`).
- Form yêu cầu đặt hàng ghi **Ngày giao** (ngày hàng đến khách). Ngày bốc dự kiến = ngày giao − số ngày vận chuyển của kho (Cấu hình → Chung, mặc định 1). CS đổi ngày bốc ngay trong danh sách yêu cầu. Yêu cầu cũ: ngày giao = ngày bốc cũ.
- Trợ lý mở form / chuyển màn → tự thu gọn thành nút 💬 có chấm đỏ; gửi hoặc đóng form → mở lại kèm kết quả. Khi chat đang mở, cửa sổ căn giữa phần màn hình còn trống.
- Trợ lý hiểu "giao 20/10" là ngày giao và giữ nguyên câu người dùng gõ trong nội dung yêu cầu.

## v3.24 — Trao đổi nội bộ
**Chạy `supabase/setup_all.sql` trước khi gộp** (bảng talk_threads / talk_msgs / talk_reads / talk_files, hàm talk_*, nhắc trong escalate, mục câu hỏi trong email tóm tắt, cấu hình talkRemindHours).
- Trao đổi theo đơn / xe / ngày-kho, chỉ nội bộ (database chặn khách và chế độ Xem như khách hàng). @nhóm / @người, câu mẫu, 3 trạng thái, nhắc khi chưa trả lời, hộp Trao đổi (G M), ghim ghi chú, ảnh (nén, lưu trong database), sửa / xóa 5 phút, cảm xúc, đã xem, theo dõi / tắt, thông báo trên máy, công cụ trợ lý.
- Trợ lý tự thu gọn khi bấm ra ngoài.
- Tin Trao đổi vào email tóm tắt (người chọn nhận email "tất cả").

## v3.25 — Đổi người dùng thì tải lại sạch
Không cần chạy SQL. Login as / Thoát Login as / Xem như khách hàng: xóa Bảng thống kê (kể cả bộ lọc Sales), bộ lọc danh sách booking, trợ lý, Trao đổi, tìm kiếm của người trước rồi tải lại theo quyền người mới. Phân quyền trên máy chủ không đổi (vốn đã đúng).

## v3.26 — Thẻ xe không tràn chữ · thao tác theo xe
Không cần chạy SQL.
- Thẻ xe: nhãn trạng thái tự xuống dòng, số chẵn gọn ("Còn 17 MT"), thẻ hẹp tự thu nhỏ; test 6 cỡ màn hình, có / không mở khung bên phải.
- "Đóng xe" đổi thành **Chốt xe – ngừng nhận đơn** (không phải xe đã chạy); xe đã chốt bỏ nhãn "Đầy" trùng ý.
- Hộp xe → **Bốc / giao theo xe**: Bốc xong cả xe (danh sách kiểm tra: đơn trên nhiều xe, thiếu danh sách cuộn, bốc thiếu), Xe xuất phát (giờ dự kiến tới), Đã giao / Không thành công từng điểm. Bên trong vẫn gọi từng đơn nên đủ quy tắc, thông báo, nhật ký.

## v3.27 — Mở lại đơn Đã load · khóa xe đã chạy
**Chạy `supabase/setup_all.sql` trước khi gộp** (hàm `unload_booking`, khóa tải trọng xe đã chạy trong `set_truck_info`).
- Đơn Đã load, xe chưa xuất phát: ↩ Mở lại (từng đơn / cả xe / chi tiết booking), bắt buộc lý do, nhật ký, báo CS + Sales, không báo khách.
- Xe đã chạy: ẩn Sửa phần hàng đơn đã đi, khóa tải trọng (máy chủ chặn), ẩn Chốt xe, nhãn "Trống x MT · không nhận thêm".

## v3.28 — Gợi ý xe thông minh hơn
**Chạy `supabase/setup_all.sql` trước khi gộp** (`set_region` lưu khu vực cho địa chỉ).
- Thứ tự gợi ý: xe đang chở cùng khu vực (đúng loại → khác loại) → khu vực lân cận → xe trống đúng loại → khác loại. Đơn nhỏ ghép được vào đầu kéo đang chạy cùng tuyến thay vì mở xe thùng mới. Snack gợi ý ghi lý do ("ghép … cùng TP.HCM → đầy 100%, không phải mở thêm xe").
- Đơn chưa có khu vực: đoán từ địa chỉ (tên khu vực / tỉnh mới, hiểu TP.HCM = Hồ Chí Minh = Sài Gòn); thẻ đơn có nút **Gán khu vực** (lưu cho địa chỉ, gán luôn các đơn cùng địa chỉ chưa có khu vực).

## v3.29 — Kiểm thử UAT
**Chạy `supabase/setup_all.sql` trước khi gộp** (cấu hình `uatOn`).
- Menu tên người dùng có **🧪 Kiểm thử UAT**: mở checklist UAT vòng 2 (https://claude.ai/artifact/2ZXnJ44xxMcaRcGaZpBQYv) đúng vai trò (#kh, #sales, #rsm, #cs, #log, #admin). Admin tắt ở Cấu hình → Chung khi go-live.

## v3.35 — Thanh lọc lịch gọn (icon + số)

- Xem tháng / 2 tuần gộp thành một nút chuyển; bộ lọc Chờ xếp xe, Khẩn, Của tôi dùng icon kèm số ngày khớp. Điện thoại chỉ hiện icon + số (có tên cho trình đọc màn hình, rê/chạm giữ xem tên).
- Nút Yêu cầu đặt hàng và Yêu cầu thành icon trên điện thoại. Ẩn Phím tắt trên máy cảm ứng và "Hướng dẫn màn này" trên điện thoại (đã có nút Hướng dẫn ở thanh trên). Thanh lọc còn 2 dòng.
- Sửa viên thuốc "tạm bỏ picking list" trống ở thanh trên điện thoại (nay hiện ⚠).

## v3.32 — Nút Cài lên điện thoại

- Menu tên người dùng → **📲 Cài lên điện thoại**. Android / Chrome / Edge trên máy tính: bấm là hiện hộp cài của trình duyệt. iPhone: hướng dẫn 3 bước (Safari → Chia sẻ → Thêm vào MH chính); mở trong Zalo/Chrome iOS thì nhắc mở lại bằng Safari, có nút sao chép link.
- Nút tự ẩn khi đã cài hoặc đang mở từ màn hình chính.
- Lần đầu mở trên điện thoại: dải nhắc phía dưới (Cài / Để sau – 14 ngày không nhắc).
- File: `web/v51.js`; test `test/e2e/v51.mjs`.

## v3.40 — Trợ lý: "đang giao" / "đã bốc" theo tình trạng hiện tại

- Hỏi "Có mấy xe đang giao?", "Có xe nào đã bốc?": đếm mọi đơn bốc trong 14 ngày gần nhất theo tình trạng hiện tại, không chỉ ngày hôm nay; kèm danh sách đơn và ngày bốc gần nhất khi hôm nay chưa bốc.
- Trợ lý không tự lọc theo kho khi người hỏi không nêu kho.
- Không còn hiện nguyên chữ `{"answer":…}` khi câu trả lời có ký tự lạ.

## v3.39 — Trợ lý: hỏi "đơn đang giao"
Không đổi CSDL. Sửa `web/v46.js`.
- Hỏi "Tháng này có bao nhiêu đơn đang giao?" trước đây có thể trả lời "không có" vì: tìm xe đang giao chỉ xem xe bốc **hôm nay** (xe đang chạy thường bốc từ hôm trước); "tháng này", "Đang giao hàng", "đang vận chuyển"… không được hiểu; số liệu gộp Đang giao với Đã bốc.
- Công cụ `stats` có thêm `dang_giao` và `da_boc_chua_xuat_phat`; `find_bookings` hiểu "tháng này / tuần này / tháng trước" và nhiều cách gọi trạng thái, khi không có đơn ở trạng thái hỏi thì kèm số đơn các trạng thái khác cùng khoảng; `find_trucks` với xe đang giao / trễ mà không ghi ngày thì quét 14 ngày gần nhất.
- Hướng dẫn trợ lý: câu "đang giao" luôn nêu cả số Đã bốc chưa xuất phát và kỳ đã xem, không chỉ trả lời "không có".
- Test: `test/e2e/v46.mjs` (bản cũ: lỗi).

## v3.38 — Màn Lịch dễ dùng hơn
Không đổi CSDL. File mới `web/v54.js`; sửa `web/v36.js`, `web/v40.js`, `web/v52.js` (rà màn Lịch bằng skill ui-ux-pro-max, 18/10/2026).
- **Tuần đã qua gom thành một dải** "Xem N tuần đã qua (01/10 – 17/10)" ở đầu lịch tháng (CS, Logistics, khách). Hàng đầu tiên là tuần hiện tại. Bấm dải để hiện lại; điện thoại dùng nút "Xem N ngày đã qua" như v3.36.
- **Ô hôm nay có chữ "Hôm nay"**, không chỉ viền xanh.
- **Chi tiết ngày** (khách, số tấn, xe trống) hiện cả khi chọn ô bằng phím Tab / mũi tên, không chỉ khi rê chuột; Esc để ẩn.
- **Xem 2 tuần**: rê chuột / trình đọc màn hình có tên khách đầy đủ + số tấn + trạng thái; số tấn bỏ ",00".
- Ô ngày là nhóm có tên (không còn "nút chứa nút"); Enter vẫn mở Chi tiết ngày.
- Biểu đồ "Theo tuần (% đã xếp)" ghi % trên mỗi cột.
- Lịch khách: "còn 225 MT" (bỏ ",00"), không xuống dòng.
- Điện thoại: nút + cao 44px; chừa khoảng trống đáy để nút trao đổi không che nội dung khi cuộn hết.

## v3.37 — Đồng bộ giao diện
Không đổi CSDL. File mới `web/v53.js` (mục 2.3, 2.6–2.8, 3.1–3.3, 3.5 của báo cáo rà soát UI/UX).
- **Chữ ≥ 12px** trên toàn giao diện (trước có 65 chỗ 9,5–11,5px), trừ số trên huy hiệu menu.
- **Nút viết thường** (bỏ in hoa toàn bộ, chữ 13px). Nhãn trạng thái ngắn vẫn in hoa.
- **Biểu tượng SVG thay emoji** (⏳ 🚨 📦 💬 🔒 📌 🗑 ❓ ⌨ 👁 📲 🚚 🔔 📋 📷 ⛔ 🧪 💡) – hiển thị giống nhau trên Windows, Android, iPhone. Nội dung người dùng gõ (tin trao đổi, yêu cầu) giữ nguyên emoji.
- **Lỗi hiện rõ**: thông báo lỗi màu đỏ, đọc ngay cho trình đọc màn hình, giữ 12 giây hoặc đến khi bấm ✕ (trước tự tắt sau 3,2 giây). Thông báo thường không đổi.
- **Ngừng dùng** khách / khu vực: nút viền đỏ; ngừng dùng khách phải xác nhận.
- Tiêu đề "SETTING USER ACCOUNT" → **TÀI KHOẢN & KHÁCH HÀNG**.
- Bàn phím và trình đọc màn hình: nút chọn (Tháng / 2 tuần, bộ lọc, kho, tab) có `aria-pressed`; cửa sổ có tên và nhận con trỏ khi mở; vẽ lại không làm mất vị trí con trỏ.
- Ô chọn ngày (mục 2.5): giữ ô ngày của trình duyệt. Người dùng dùng Chrome tiếng Việt nên ô hiển thị dd/mm/yyyy (chốt 18/10/2026).

## v3.36 — Điện thoại
Không đổi CSDL. File mới `web/v52.js` (mục 1.3, 2.1, 2.2, 2.4 của báo cáo rà soát UI/UX). Máy tính giữ nguyên.
- **Lưới Đặt hàng** dưới 700px: toàn màn hình, mỗi dòng đơn là một thẻ (Kho, Ngày bốc, Khách hàng, Số tấn…), ô nhập cao 44px, chữ 16px (iPhone không tự phóng to). Nút Đóng / Lưu tạm / Đặt & gửi Logistics luôn ở đáy. Ẩn A−/A+/Toàn màn hình và đoạn hướng dẫn dán Excel.
- **Lịch** (CS, Logistics, khách): mở từ hôm nay; ngày đã qua gom vào nút **Xem N ngày đã qua**.
- **Header** một dòng: logo, Tìm kiếm, Hướng dẫn thành biểu tượng 44×44 (có nhãn cho trình đọc màn hình).
- Thanh lọc lịch dùng bản icon + số của v3.35.
- Nút bấm ngoài ô lịch cao ≥ 40px.

## v3.34 — Dễ đọc hơn (màu, dark mode, nút chat)
Không đổi CSDL. Theo báo cáo rà soát UI/UX 18/10/2026 (mục 1.1, 1.2, 1.4, 3.4, 3.6).
- Màu chữ trạng thái ở chế độ sáng đậm hơn (`--ok`, `--warn`, `--pend`, `--bad`): nhãn Đang xếp / Trống / Đầy, Chờ xếp xe, ô "x đơn chờ xếp xe" đều đạt tương phản ≥ 4,5 (trước 3,2–4,4). Nhãn trạng thái từ 10,5px lên 12px.
- Dark mode: khung Trao đổi, tin ghim, tin của mình, yêu cầu CS, gợi ý xếp xe, picking list… trước dùng nền sáng viết cứng nên chữ gần như không đọc được (tương phản ~1,1). Nay dùng token mới `--note-*`, `--req-*`, `--mine-*`, `--chat-bg` có giá trị riêng cho nền tối.
- Nút trợ lý / trao đổi nổi tự ẩn khi đang mở cửa sổ (không che đáy lưới Đặt hàng).
- Viền ô nhập đậm hơn (`--inp-line`, tương phản ≥ 3). Dải "Xem như khách" đổi sang cam đậm (chữ trắng đọc được).
- Test: `test/e2e/ui.mjs` đo tương phản thực tế ở cả chế độ sáng và tối.

## v3.30 – v3.31 — Hiệu năng và trải nghiệm
**Chạy `supabase/setup_all.sql` trước khi gộp** (get_delta, theo dõi thay đổi đơn, sức khỏe hệ thống, link tài xế, ảnh giao hàng, tổng quan khách, email tuần + lịch `weekly-summary`).
- **Tải phần thay đổi**: thay vì tải lại toàn bộ (~1 KB/đơn × mọi đơn) mỗi khi có người sửa, app chỉ nhận các đơn vừa đổi (vài KB). Đổi khai báo xe / cấu hình / người dùng / Login as thì tải toàn bộ. Cứ 10 phút tải toàn bộ một lần cho chắc.
- Mở Trao đổi không còn làm mọi người tải lại. Đang thao tác: hỏi "có gì mới" mỗi 10 giây (để yên: 30 giây).
- **Sức khỏe hệ thống** (Bảng thống kê → Hệ thống): băng thông ước tính / 5 GB, database / 500 MB, lượt trợ lý, lỗi người dùng gặp.
- **GitHub tự chạy test** khi có PR (`.github/workflows/test.yml`: `test/sql.sh` + `test/e2e/all.sh`). Sửa 4 test lỗi theo ngày; phát hiện và sửa 2 lỗi thật: thẻ "bắt buộc picking list" bị ẩn trong Cấu hình từ v3.23, nút trợ lý che góc co giãn lưới đặt hàng.
- **Việc của tôi** (G V), **Chế độ kho**, **Link tài xế** (`web/driver.html`, không cần tài khoản, ảnh biên nhận), **Copy tin cho khách**, **Tổng quan khách**, **email tổng kết tuần** cho Sales / RSM.


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
  v29.js                  Màn hình v2.9: nhập nhiều dòng, giao hàng, load / giao, đóng xe, cờ khẩn, email
  v30.js                  Màn hình v3.0: lưới đặt hàng, Gửi Logistics, cấu hình kho, đổi kho
  v31.js                  Màn hình v3.1: tìm khách, nhập khách hàng / địa chỉ từ file
  v35.js                  Bảng thống kê (8 tab, bấm biểu đồ xem đơn), Cấu hình › Mục tiêu
  v36.js                  Lịch đặt xe mới: ô gọn, cột Tuần, lọc, tất cả kho, 2 tuần, thống kê Xe
  v37.js                  Phím tắt: bộ xử lý, bảng ?, chỉnh trong Hồ sơ / Cấu hình
  v38.js                  Xem như khách hàng (chỉ xem), khung Hướng dẫn
  v39.js                  Lịch sử màn hình (B B / B N, Back / Forward)
  v40.js                  Lịch khách hàng nhiều kho
  v41.js                  Yêu cầu đặt hàng (💬)
  v42.js                  Menu ô ngày (bấm 1 lần / bấm đúp)
  v43.js                  Picking list tùy chọn, nhắc xác nhận giao
  v44.js                  Kéo thả booking vào xe, gợi ý xe
  v45.js                  Tạo / lọc / xóa tài khoản
  v46.js                  Trợ lý (chatbot)
  v52.js                  v3.36: giao diện điện thoại (lưới Đặt hàng dạng thẻ, nút Lọc, ngày đã qua)
  v53.js                  v3.37: biểu tượng SVG thay emoji, aria-pressed, giữ con trỏ khi vẽ lại
  v54.js                  v3.38: màn Lịch – gom tuần đã qua, nhãn Hôm nay, số tấn gọn
  v62.js                  v3.49: Khai báo xe – điền tháng sau, hỏi trước khi bỏ thay đổi chưa lưu
  v63.js                  v3.50: Đặt hàng theo ngày giao, Zone vận chuyển, Cấu hình › Vận chuyển, đổi ngày bốc sớm hơn
functions/api/chat.js     Cloudflare Function gọi Workers AI
  pwa.js, sw.js           Phiên bản mới, PWA, xem khi mất mạng
  v41.js                  Yêu cầu đặt hàng (💬)
  pwa.js, sw.js           Phiên bản mới, PWA, xem khi mất mạng
  guide.html, guide/      Nội dung Hướng dẫn sử dụng + ảnh minh họa
  config.js               URL + anon key (công khai)
  favicon.svg, icon-*.png, apple-touch-icon.png, manifest.webmanifest   Biểu tượng trang / màn hình chính điện thoại
supabase/
  migrations/0001_init.sql  Bảng, phân quyền, hàm nghiệp vụ
  seed.sql                  Danh mục: kho, khu vực, sản phẩm, màu, độ dày, khổ, cấu hình
  migrations/0002_email.sql Hàng đợi email + gửi qua Resend (pg_net, pg_cron, Vault)
  demo_data.sql             Hàm load_demo() / clear_demo()
  demo_gen.sql              Sinh dữ liệu trình diễn trên dữ liệu thật (gen_demo_orders / gen_demo_clear)
  email_setup.sql           = 0002_email.sql, dán vào SQL Editor để bật email
  setup_all.sql             Gộp tất cả, dùng cho cài đặt mới
test/                     Kiểm thử cục bộ (Postgres 16 + Playwright), không deploy
  00_*, 01_*              Stub Supabase (auth, auth.jwt, mfa_factors, pg_net, Vault, pg_cron)
  10 – 95_*.sql           Test SQL: luồng booking, get_state, phân quyền, Login as, tải trọng xe,
                          định tuyến CS / nhận thay, MFA, đặt lại booking, phạm vi thống kê
  96_v29.sql              Test SQL v2.9: nhập nhiều dòng, ngày nghỉ, đổi ngày, khẩn, hủy cận ngày, giao hàng, đóng xe, email
  reset.sh                Dựng lại DB test + tài khoản mẫu (phiên mặc định aal2)
  e2e/all.sh              Chạy 10 bộ Playwright: run, gs, past, mfa, rebook, offday, truckedit, blfilter, salesstats, v29
```
