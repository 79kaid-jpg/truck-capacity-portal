# CLAUDE.md — Truck Capacity Booking Portal ("Đặt Xe")

Tài liệu kiến trúc cho người (và Claude) sửa mã trong repo này. Cập nhật theo mã ở v3.38 (18/10/2026).
Hướng dẫn cài đặt / deploy cho người dùng nằm ở `README.md`; file này chỉ nói mã chạy thế nào và sửa ở đâu.

## 1. Tổng quan

Cổng đặt xe tải theo năng lực giao hàng hằng ngày của từng kho (JM2 – Phú Mỹ, JD8 – Hải Phòng, JD9 – Cửa Lò).
Khách / Sales / CS đặt tấn hàng cho một ngày bốc; Logistics khai báo xe và xếp đơn lên xe; hệ thống chặn đặt vượt năng lực.

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện | HTML + JavaScript thuần trong `web/`, **không có bước build** | Cloudflare Pages phục vụ thẳng thư mục `web/` |
| API | Supabase PostgREST gọi hàm Postgres (`supabase.rpc`) | Không có server riêng |
| Dữ liệu | Supabase Postgres 16 (Free, Singapore) | Bảng ở schema `app`, hàm RPC ở schema `public` |
| Đăng nhập | Supabase Auth (email/mật khẩu, TOTP MFA) | MFA bắt buộc với Logistics, CS, Admin |
| Email | `pg_cron` + `pg_net` gọi Resend; khóa trong Vault | `supabase/migrations/0002_email.sql` |
| Trợ lý (chatbot) | Cloudflare Pages Function `functions/api/chat.js` → Workers AI | Chỉ chuyển câu hỏi; mọi thao tác chạy ở trình duyệt bằng quyền người dùng |
| Kiểm thử | Test SQL (Postgres 16) + Playwright (Chromium) | GitHub Actions `test.yml` chạy mỗi PR |

Ngôn ngữ giao diện, chú thích mã, commit, README: **tiếng Việt**.

## 2. Bản đồ thư mục

```
web/                    Toàn bộ giao diện (deploy nguyên thư mục)
  index.html            Khung trang + TOÀN BỘ CSS gốc (token màu :root, dark mode) + thứ tự nạp script
  app.js                Lõi: trạng thái, render, các màn chính, gọi RPC, xử lý click (~1.500 dòng)
  v29.js … v54.js       Các bản bổ sung theo phiên bản, nạp SAU app.js theo thứ tự số (xem mục 4)
  pwa.js, sw.js         Báo phiên bản mới, PWA, xem lịch khi mất mạng (service worker)
  config.js             Supabase URL + anon key (công khai)
  driver.html           Trang tài xế (link có hạn, không cần tài khoản, chụp ảnh giao hàng)
  guide.html, guide-kh.html, guide/   Hướng dẫn sử dụng (nội bộ / khách) + ảnh minh họa
  version.json          Số phiên bản đang chạy (pwa.js so sánh để nhắc tải lại)
functions/api/chat.js   Cloudflare Pages Function cho trợ lý
supabase/
  migrations/0001_init.sql   Bảng, hàm năng lực, toàn bộ RPC, phân quyền (~4.300 dòng)
  migrations/0002_email.sql  Hàng đợi email, gửi qua Resend, các lịch pg_cron
  seed.sql, demo_data.sql    Danh mục + hàm load_demo() / clear_demo()
  setup_all.sql              = 0001 + 0002 + seed + demo, ghép nguyên văn (dán vào SQL Editor)
test/
  00_*, 01_*            Stub của Supabase (auth, jwt, mfa, pg_net, Vault, pg_cron) để chạy trên Postgres thường
  10_… 99j_*.sql        Test SQL theo tính năng; sql.sh chạy tất cả
  reset.sh              Dựng lại DB test `t` + tài khoản mẫu (mật khẩu Test@1234, mã MFA 123456)
  e2e/server.py         Máy chủ giả Supabase: phục vụ web/ và chạy RPC trên Postgres local
  e2e/mock-supabase.js  supabase-js giả, thay CDN khi test
  e2e/all.sh            Chạy toàn bộ bộ Playwright (mỗi bộ: reset DB + server mới)
  e2e/*.mjs             Mỗi file một bộ, thường trùng tên file web/vNN.js nó kiểm tra; ui.mjs = tương phản / điện thoại / Lịch
tools/bump-version.sh   Đổi số phiên bản ở index.html, sw.js, version.json
google-sheets/          Bản thử nhanh trên Google Sheets + Apps Script (cũ, không còn phát triển)
.github/workflows/      test.yml (kiểm thử mỗi PR), backup.yml (sao lưu DB tối Chủ nhật)
```

## 3. Luồng chạy

```
Trình duyệt (web/)                         Supabase
──────────────────                         ────────
boot() → đăng nhập (+ MFA)  ───────────►  Auth
reload(): rpc('get_state', tháng đang xem)  ►  public.get_state()  ─► đọc app.*, lọc theo vai trò
adopt(st) → S (dữ liệu)                    
render() → #app.innerHTML                  
poll() mỗi 30 giây: rpc('get_ver')  ─────►  số phiên bản dữ liệu (d, c, n, m, s)
   có đổi → rpc('get_delta')  ───────────►  chỉ các đơn vừa đổi (v49.js); 10 phút tải toàn bộ một lần
Bấm nút [data-a] → A[tên](dataset)
   → mutate('rpc_x', args)  ─────────────►  public.rpc_x(): app.require_perm() → khóa daily_fleet FOR UPDATE → ghi app.*
   → reload() → render()
                                           pg_cron: send-emails (mỗi phút), escalate (nhắc việc), email-digest, weekly-summary
```

### Chống đặt vượt năng lực
Năng lực ngày = tổng tải trọng xe khai báo (`daily_fleet`, `truck_days`). Mỗi hàm ghi đơn khóa dòng `daily_fleet` của kho-ngày bằng `FOR UPDATE` rồi mới tính lại, nên hai người đặt cùng lúc không vượt được. Giao diện tính lại cùng công thức trong `dayM()` (app.js) chỉ để hiển thị; **máy chủ là nơi quyết định**.

## 4. Giao diện: cách mã được tổ chức

### Trạng thái toàn cục (app.js)
- `S` — dữ liệu từ máy chủ sau `adopt()`: `S.me`, `S.cfg`, `S.bookings`, `S.allocs`, `S.fleet`, `S.customers`, `S.notifs`… Không sửa `S` để "lưu"; mọi thay đổi đi qua RPC rồi `reload()`.
- `V` — trạng thái giao diện: `V.view` (màn), `V.wh` (kho), `V.ym` (tháng), `V.day`, `V.bk`, `V.modal`, `V.toast`, bộ lọc…
- `A` — bảng thao tác. Mọi nút dùng `data-a="tênThaoTác"` + `data-*` tham số; một bộ bắt click duy nhất ở cuối app.js gọi `A[tên](el.dataset, el, e)`. `NAV_SAFE` liệt kê thao tác chỉ điều hướng (vẫn bấm được khi đang lưu).
- `rpc(fn, args)` gọi `public.fn`; `mutate(fn, args, {ok, err})` = khóa nút (`V.busy`) + rpc + `reload()` + render; lỗi thì gọi `opts.err` hoặc `toastErr`. Lỗi: `toastErr()` (đỏ, `role=alert`, giữ đến khi đóng); thông báo thường: `toast()`.
- Phân quyền phía giao diện: `can('perm.key')`, `canAny('prefix.')`, `role()`. Chỉ để ẩn/hiện; máy chủ kiểm tra lại bằng `app.require_perm`.

### Vẽ màn hình
- `render()` dựng lại TOÀN BỘ `#app` bằng `innerHTML` mỗi lần trạng thái đổi: `topbar()` + `sidebar()` + `mainView()` (chọn theo `V.view`, danh sách ở `NAV`) + `modalView()` nếu có `V.modal`.
- Màn chính: `vCalendar`, `vDay`, `vBookings`, `vApprovals`, `vBooking`, `vFleet`, `vConfig`, `vUsers`, `vPerms`, `vNotifs`, `vDash`, `vProfile`. Cửa sổ: `m*()` trong app.js và bảng `M29` (v29.js) cho các loại mới.
- Vì vẽ lại toàn bộ: `poll()` không vẽ lại khi đang gõ hoặc đang mở cửa sổ; v53.js trả con trỏ bàn phím về nút cũ sau mỗi lần vẽ.

### Các file vNN.js (mở rộng theo phiên bản)
Mỗi bản thêm một file mới thay vì sửa app.js. Kiểu mở rộng có sẵn, dùng lại khi thêm tính năng:
1. **Tiêm CSS:** `(()=>{const st=document.createElement('style');st.textContent=\`…\`;document.head.appendChild(st);})();`
2. **Bọc render** để chỉnh DOM sau khi vẽ: `{const r0=render;render=function(){r0();if(!S)return; …};}`. File nạp sau bọc ngoài cùng.
3. **Ghi đè / bọc hàm màn:** `vCalendar=function(){…}`, `dayCell=function(…){…}`, hoặc `const vc0=vCalendar;vCalendar=function(){if(…)return vc0(); …}`.
4. **Thêm thao tác:** `A.tenMoi=d=>{…}`; cửa sổ mới: `M29.loai=function(){return html}` rồi `V.modal={type:'loai'}`.

| File | Bản | Nội dung chính |
|---|---|---|
| v29.js | 2.9 | Nhập nhiều dòng, đơn khẩn, giao hàng + danh sách cuộn, load/đang giao/đã giao, tách đơn, đóng xe; `M29` |
| v30.js | 3.0 | Lưới Đặt hàng (`.g30`), Lưu tạm → Gửi Logistics, cấu hình Kho |
| v31.js | 3.1 | Danh sách khách, nhập khách / địa chỉ từ Excel / CSV |
| v35.js | 3.5 | Bảng thống kê (Tổng quan, CS, Logistics, Sales, Ngoại lệ, Lịch đơn, Mục tiêu, Hệ thống) |
| v36.js | 3.6 | Lịch mới: `dayCell`, `vCalendar`, cột Tuần, xem 2 tuần, khung thống kê, tooltip ngày, thanh lọc |
| v37.js | 3.7 | Phím tắt cấu hình được; mũi tên / Enter giữa các ô ngày |
| v38.js | 3.8 | Admin "Xem như khách", khung Hướng dẫn |
| v39.js | 3.10 | Lịch sử màn hình (Back/Forward) |
| v40.js | 3.11 | Lịch của khách nhiều kho |
| v41.js | 3.13 | Yêu cầu đặt hàng |
| v42.js | 3.14 | Menu nhanh khi bấm ô ngày |
| v43.js | 3.15 | Công tắc bắt buộc picking list, nhắc xác nhận giao |
| v44.js | 3.17 | Kéo thả đơn vào xe, gợi ý xe |
| v45.js | 3.18 | Quản lý tài khoản (tạo / lọc / xóa) |
| v46.js | 3.19 | Trợ lý (gọi `/api/chat`), nút chat nổi `#chatFab` |
| v47.js | 3.24 | Trao đổi nội bộ theo đơn / xe / ngày |
| v48.js | 3.26 | Thẻ xe, thao tác theo cả xe |
| v49.js | 3.30 | Tải phần thay đổi (`get_delta`), ghi lỗi trình duyệt, Sức khỏe hệ thống |
| v50.js | 3.31 | Việc của tôi, Chế độ kho, Link tài xế, Tổng quan khách |
| v51.js | 3.32 | Nút Cài lên điện thoại |
| v52.js | 3.36 | Điện thoại: lưới Đặt hàng dạng thẻ, header một dòng, nút ≥ 40px, "Xem N ngày đã qua" |
| v53.js | 3.37 | SVG thay emoji (`IC53`), `aria-pressed`, cửa sổ có tên, giữ con trỏ khi vẽ lại |
| v54.js | 3.38 | Lịch: gom tuần đã qua (`pastRows54`), nhãn Hôm nay, số gọn `n54`/`mt54` |

**Thứ tự nạp quan trọng.** Thứ tự nằm trong `index.html` (cuối file) và phải trùng danh sách `SHELL` trong `sw.js`.

### Giao diện, màu, chữ
- Màu chỉ dùng token trong `:root` của `index.html` (bản sáng + 2 khối dark: `prefers-color-scheme` và `[data-theme="dark"]`). Không viết mã màu cứng cho nền/chữ trong CSS mới: dark mode sẽ hỏng (đã gặp ở v3.34). Khối vàng/tím/xanh: `--note-*`, `--req-*`, `--mine-*`, `--chat-bg`; viền ô nhập: `--inp-line`.
- Chữ ≥ 12px (trừ huy hiệu số ở menu); chữ trên nền màu đạt tương phản 4,5:1 — `test/e2e/ui.mjs` đo thật ở cả sáng và tối.
- Biểu tượng: SVG nét (`IC` trong app.js, `IC53` trong v53.js). Không dùng emoji làm biểu tượng; v53.js tự đổi các emoji quen thuộc trong giao diện sang SVG.
- Điện thoại: mốc `max-width:700px` / `760px`; nút ≥ 40–44px; không cuộn ngang.
- Font: Archivo (tiêu đề), Be Vietnam Pro (nội dung). Ngày hiển thị dd/mm/yyyy.

## 5. Máy chủ (Supabase)

- **Bảo mật:** mọi bảng ở schema `app`, bật RLS, **không có policy** → trình duyệt không đọc/ghi bảng trực tiếp. Trình duyệt chỉ gọi hàm `public.*` dạng `security definer`. Mỗi hàm tự kiểm tra quyền.
- **Danh tính:** `app.uid()` (tính cả Login as), `app.real_uid()`, `app.mfa_ok()` (đọc claim `aal`), `app.require_perm('khoá')` trả hồ sơ hoặc báo lỗi.
- **Vai trò:** `customer`, `sales`, `cs`, `logistics`, `admin`. Quyền chi tiết ở `app.permissions` × `app.role_permissions`; phạm vi thống kê theo `profiles.stat_scope`.
- **Bảng chính:**
  - danh mục: `warehouses`, `regions`, `customers`, `customer_addresses`, `products`…
  - đội xe theo ngày: `daily_fleet`, `truck_days`
  - đơn: `bookings`, `booking_lines`, `allocations` (đơn ↔ xe), `delivery_items`, `booking_status_history`
  - trao đổi: `talk_*`
  - khác: `notifications`, `email_outbox`, `order_requests`, `audit_log`, `usage_daily`, `client_errors`, `driver_links`, `pod_files`, `targets`
- **Trạng thái đơn** (`bookings.status`):
  - Các giá trị: `draft` (Lưu tạm, không trừ năng lực) → `hold` (Chờ xếp xe) → `ok` (Đã xếp xe) → `loaded` → `transit` → `delivered` | `failed`.
  - Nhánh khác: `rejected`, `resched` (đề nghị đổi ngày), `cancelled`.
  - Giao diện có thêm trạng thái hiển thị suy ra (`dconf`, `latecancel`…) trong `ST_LABEL` / `stKey()`.
- **Hàm đọc chính:**
  - `get_state(p_from, p_to, p_cat)`: toàn bộ dữ liệu một khoảng ngày, đã lọc theo vai trò; danh mục khách được giữ trong trình duyệt theo `catKey`.
  - `get_ver`, `get_delta`: dùng cho làm mới nhanh.
- **Sửa CSDL:**
  - Sửa trong `migrations/0001_init.sql` (hoặc 0002).
  - Ghép lại: `setup_all.sql` = 2 dòng đầu chú thích + `cat migrations/0001_init.sql migrations/0002_email.sql seed.sql demo_data.sql`.
  - Mọi câu lệnh phải **chạy lại nhiều lần không mất dữ liệu**: `create or replace`, `if not exists`, khối `do $$`.
  - Người dùng phải dán lại `setup_all.sql` vào Supabase sau khi gộp. Ghi **"Chạy `supabase/setup_all.sql` trước khi gộp"** trong README và mô tả PR.

## 6. Kiểm thử

```bash
# Postgres 16 chạy ở socket /tmp, user postgres, không mật khẩu
bash test/sql.sh                      # toàn bộ test SQL (mỗi file dựng lại DB)
bash test/e2e/all.sh                  # toàn bộ Playwright (~30–60 phút), in "ALL E2E PASSED" hoặc "FAILED: …"
# một bộ: dựng DB, bật server giả, chạy
bash test/reset.sh && (python3 test/e2e/server.py 8787 &) && node test/e2e/ui.mjs
```

- `reset.sh` xóa DB `t` → server giả đang chạy mất kết nối. **Phải khởi động lại `server.py` sau mỗi lần reset.**
- Playwright lấy từ `/opt/npm-tools/node_modules/playwright`. Font Google bị chặn trong test nên dùng font dự phòng. Độ rộng chữ trên CI có thể khác máy, nên các kiểm tra "không tràn" cần có chỗ dư.
- Nhiều test phụ thuộc ngày hôm nay (`app.today()`); từ v3.38 lịch tháng gom các tuần đã qua. Test cần đếm ô / bấm ngày đầu tháng thì gọi `V.past52=true; render()` trước.
- Thêm bộ test mới: tạo `test/e2e/<tên>.mjs` (chép phần `session()` của bộ gần nhất) và thêm `<tên>` vào vòng `for` trong `all.sh`.
- Test SQL mới: `test/<số>_<tên>.sql`. Số lỗi thật phải bằng số dòng `\echo expect ERROR` trong file (hoặc khai báo `-- expect-errors: N` ở dòng đầu).

## 7. Quy trình ra một bản

1. Nhánh mới từ `main`, ví dụ `v339-…`. PR luôn nhắm **`main`**. Không xếp chồng PR lên nhánh của nhau: GitHub sẽ gộp vào nhánh trung gian thay vì `main` (đã xảy ra với #39, #40).
2. Mã giao diện mới → `web/vNN.js` mới (NN = số file kế tiếp). Thêm `<script src="vNN.js?v=…">` cuối `index.html` và `'vNN.js'` vào `SHELL` trong `sw.js`.
3. `bash tools/bump-version.sh 3.39 "ghi chú ngắn"`. Lệnh này đổi `?v=` mọi script, `APP_V`, `version.json` và tên cache `sw.js`; thiếu bước này trình duyệt người dùng giữ bản cũ.
4. Thêm mục `## v3.39 — …` trong README (ghi rõ có cần chạy `setup_all.sql` không) và dòng mô tả file trong cây thư mục cuối README.
5. Chạy test liên quan + `all.sh`; mở PR. Commit / PR viết tiếng Việt.

## 8. Thành phần khác

- **Trợ lý** (`functions/api/chat.js` + v46.js): Function chỉ gọi Workers AI (binding `AI`). Câu trả lời chứa lệnh tra cứu / thao tác được trình duyệt chạy bằng quyền của người dùng. Hạn mức lượt hỏi theo vai trò nằm trong CSDL (`chat_log`).
- **Trang tài xế** (`web/driver.html`): mở bằng link có hạn tạo từ `driver_link_create`, không cần tài khoản, tải ảnh giao hàng (`pod_files`).
- **PWA** (`pwa.js`, `sw.js`): mạng trước, mất mạng dùng bản lưu; khi `version.json` đổi thì nhắc tải lại.
- **Sao lưu** (`backup.yml`): `pg_dump` schema `app` + bảng auth, mã hóa, lưu 90 ngày ở Actions → Artifacts; cần secret `SUPABASE_DB_URL`, `BACKUP_PASSWORD`.
- **google-sheets/**: bản thử trên Google Sheets (11/10/2026), đã thay bằng Portal; chỉ giữ để tham khảo.

## 9. Điểm cần biết

- Chuỗi phiên bản xuất hiện ở 3 chỗ (index.html, sw.js, version.json); luôn dùng `tools/bump-version.sh`.
- `render()` thay toàn bộ DOM: phần tử tự thêm sau render (v52–v54) bị xóa ở lần vẽ sau, nên đặt việc chèn DOM trong wrapper `render`, không làm một lần.
- Một vài nhãn menu bên còn tiếng Anh trong `NAV` (app.js): "Setting user account", "Approval request", "Trucks capacity setting", "Configuration".
- Tài liệu nghiệp vụ (SRS v2.9, thiết kế kỹ thuật, rà soát UI/UX) nằm trong Claude Project "Truck Capacity Booking Portal", không nằm trong repo.
