// v3.60: tự cập nhật (tự tải lại khi rảnh, giữ màn, bản bắt buộc), Có gì mới, hướng dẫn cài app theo trình duyệt.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v71.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v71'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
let VER = null; // null = version.json thật; object = giả bản mới
async function session(email, fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.vp || { width: 1440, height: 1000 }, userAgent: opt.ua });
  const page = await ctx.newPage();
  await page.route('**/cdn.jsdelivr.net/**', r => r.request().url().includes('xlsx') || r.request().url().includes('qrcode') ? r.fulfill({ contentType: 'text/javascript', body: '' }) : r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/version.json*', r => { if (VER) { const v = VER; VER = null; return r.fulfill({ contentType: 'application/json', body: JSON.stringify(v) }); } return r.continue(); });
  page.on('pageerror', e => errors.push(`[${email} ${step}] pageerror: ${e.message}`));
  await page.goto('http://127.0.0.1:8787/');
  if (email) {
    await page.fill('#lg-e', email); await page.fill('#lg-p', 'Test@1234'); await page.click('#login button');
    await page.waitForTimeout(800);
    if (await page.locator('#mfe-code').count()) { await page.waitForSelector('#mfe button:not([disabled])'); await page.fill('#mfe-code', '123456'); await page.click('#mfe button'); await page.waitForTimeout(800); }
    else if (await page.locator('#mfc-code').count()) { await page.fill('#mfc-code', '123456'); await page.click('#mfc button'); await page.waitForTimeout(800); }
    await page.waitForSelector('.cal');
  } else await page.waitForSelector('#login');
  try { await fn(page); } catch (e) { errors.push(`[${email} ${step}] ${e.message.split('\n')[0]}`); console.log('FAIL', step, e.message.split('\n')[0]); await page.screenshot({ path: `${OUT}/FAIL-${step}.png`, fullPage: true }); }
  await ctx.close();
}
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
const S = s => { step = s; };
const ev = (p, f, a) => p.evaluate(f, a);
const idle = p => ev(p, () => { U71.last = Date.now() - 60000; U71.resumed = 0; });

await session('log@demo.vn', async p => {
  S('auto'); await ev(p, () => { V.view = 'bookings'; render(); window.__mark = 1; }); await p.waitForTimeout(300);
  VER = { v: '9.99', note: 'Bản thử' }; await ev(p, () => updCheck()); await p.waitForTimeout(300);
  await idle(p);
  await p.waitForFunction(() => !window.__mark, null, { timeout: 8000 }).catch(() => {});
  await p.waitForSelector('.top', { timeout: 15000 }); await p.waitForTimeout(1500);
  ok(await ev(p, () => !window.__mark), 'có bản mới + rảnh 30 giây → tự tải lại');
  ok(await ev(p, () => V.view) === 'bookings', 'sau khi tải lại: giữ màn đang xem');
  ok(/Đã cập nhật lên bản/.test(await p.locator('.toast').last().textContent({ timeout: 4000 }).catch(() => '')), 'báo "Đã cập nhật lên bản …"');

  S('busy'); await ev(p, () => { V.view = 'calendar'; render(); window.__mark = 2; }); await p.waitForTimeout(300);
  await ev(p, () => { V.modal = { type: 'inst' }; render(); }); await p.waitForSelector('.modal');
  VER = { v: '9.99', note: 'x' }; await ev(p, () => updCheck()); await p.waitForTimeout(300); await idle(p); await p.waitForTimeout(2500);
  ok(await ev(p, () => window.__mark === 2), 'đang mở cửa sổ nhập → không tự tải lại');
  ok(await p.locator('#updbar').isVisible(), 'đang nhập dở → vẫn hiện dải nhắc');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await ev(p, () => { if (V.modal) { V.modal = null; render(); } UPD.v = null; const b = document.getElementById('updbar'); if (b) b.remove(); });

  S('force'); await ev(p, () => { V.modal = { type: 'inst' }; render(); }); await p.waitForSelector('.modal');
  VER = { v: '9.98', note: 'Sửa lỗi', force: true }; await ev(p, () => updCheck()); await p.waitForTimeout(1300);
  ok(/bắt buộc/.test(await p.locator('#updbar').innerText()) && await p.locator('#upd-x').count() === 0, 'bản bắt buộc: dải đếm ngược, không có nút Để sau');
  await ev(p, () => { U71.cd = 1; }); await p.waitForTimeout(2500);
  ok(await ev(p, () => window.__mark === 2) && /lưu hoặc đóng/i.test(await p.locator('#updbar').innerText()), 'hết giờ nhưng đang nhập → chờ lưu xong');
  await ev(p, () => { V.modal = null; render(); }); await p.waitForTimeout(400);
  await p.waitForFunction(() => !window.__mark, null, { timeout: 8000 }).catch(() => {});
  await p.waitForSelector('.top', { timeout: 15000 }); await p.waitForTimeout(800);
  ok(await ev(p, () => !window.__mark), 'đóng cửa sổ → bản bắt buộc tự tải lại');

  S('log'); await p.locator('.top [data-a="menu"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('.log71b').count() === 1, 'menu tên có Có gì mới');
  await p.locator('.log71b').click(); await p.waitForSelector('#ov71 ul.log71 li');
  ok(await p.locator('#ov71 ul.log71 li.cur').count() === 1, 'Có gì mới: liệt kê, tô bản đang dùng'); await shot(p, 'changelog');
  await p.keyboard.press('Escape'); ok(await p.locator('#ov71').count() === 0, 'Esc đóng hộp');
  S('menu-inst'); await p.locator('.top [data-a="menu"]').click(); await p.waitForTimeout(200);
  await p.locator('.instlink').click(); await p.waitForSelector('#ov71');
  ok(await p.locator('#qr71').count() === 1 && await p.locator('#inst71-url').count() === 1, 'máy tính: có chỗ mã QR + link sao chép'); await shot(p, 'inst-desktop');
});

await session('', async p => {
  S('login'); ok(await p.locator('.inst71-login [data-inst71="open"]').count() === 1, 'màn đăng nhập có link Cài app');
  await p.locator('.inst71-login button').click(); await p.waitForSelector('#ov71');
  ok(await p.locator('#ov71 .box').isVisible(), 'chưa đăng nhập vẫn mở được hướng dẫn');
});
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
await session('', async p => {
  S('ios'); await p.locator('.inst71-login button').click(); await p.waitForSelector('#ov71');
  const t = await p.locator('#ov71').innerText();
  ok(/Chia sẻ/.test(t) && /Thêm vào MH chính/.test(t) && await p.locator('#ov71 .st71 li').count() === 3, 'iPhone Safari: 3 bước Chia sẻ → Thêm vào MH chính'); await shot(p, 'inst-ios');
  ok(await ev(p, () => document.documentElement.scrollWidth <= innerWidth + 1), 'điện thoại: không cuộn ngang');
}, { vp: { width: 390, height: 844 }, ua: IOS });
await session('', async p => {
  S('zalo'); await p.locator('.inst71-login button').click(); await p.waitForSelector('#ov71');
  ok(/Mở bằng trình duyệt/.test(await p.locator('#ov71').innerText()) && await p.locator('#inst71-url').count() === 1, 'Zalo: hướng dẫn mở bằng trình duyệt + sao chép link');
}, { vp: { width: 390, height: 844 }, ua: IOS.replace('Safari/604.1', 'Zalo iOS/485') });
await session('', async p => {
  S('samsung'); await p.locator('.inst71-login button').click(); await p.waitForSelector('#ov71');
  ok(/Màn hình chờ/.test(await p.locator('#ov71').innerText()), 'Samsung Internet: Thêm trang vào → Màn hình chờ');
}, { vp: { width: 390, height: 844 }, ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36' });

console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); }
await browser.close(); process.exit(errors.length ? 1 : 0);
