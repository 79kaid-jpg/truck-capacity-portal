// E2E: booking nằm trong ngày nghỉ được liệt kê ở Chi tiết ngày và xử lý được. Test-only. Tham số: ngày nghỉ (YYYY-MM-DD)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const D = process.argv[2]; const browser = await chromium.launch(); const errs = [];
const check = (n, ok, x = '') => { console.log((ok ? 'OK  ' : 'FAIL') + ' ' + n + (x ? ' | ' + x : '')); if (!ok) errs.push(n); };
async function open(email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'t'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8787/'); await p.fill('#lg-e', email); await p.fill('#lg-p', 'Test@1234'); await p.click('#login button'); await p.waitForTimeout(800);
  if (await p.locator('#mfe-code').count()) { await p.waitForSelector('#mfe button:not([disabled])'); await p.fill('#mfe-code', '123456'); await p.click('#mfe button'); await p.waitForTimeout(800); }
  else if (await p.locator('#mfc-code').count()) { await p.fill('#mfc-code', '123456'); await p.click('#mfc button'); await p.waitForTimeout(800); }
  return p;
}
// 1. Máy chủ chặn thêm ngày nghỉ khi đang có booking (ngày nghỉ ở bước sau được ép bằng SQL để mô phỏng dữ liệu cũ)
let p = await open('log@demo.vn');
await p.evaluate(d => { V.view = 'config'; V.cfgTab = 'holiday'; V.hol = d; render(); }, process.argv[3] || D); await p.waitForTimeout(200);
await p.click('[data-a="holAdd"]'); await p.waitForTimeout(600);
check('add holiday with bookings -> refused with list', /đang có booking/.test(await p.locator('.toast').textContent().catch(() => '')));
await p.evaluate(() => reload().then(render)); await p.waitForTimeout(500);
check('holiday chip shows booking count', /booking/.test(await p.locator('.chip.warn').first().textContent().catch(() => '')));
// 2. Chi tiết ngày nghỉ liệt kê booking
await p.evaluate(d => { V.view = 'day'; V.day = d; render(); }, D); await p.waitForTimeout(200);
const n = await p.locator('tr.click[data-a="openBk"]').count();
check('off day lists bookings', n > 0, 'rows=' + n);
await p.screenshot({ path: '/tmp/e2e-shots/off-1-day.png', fullPage: true });
const hold = p.locator('tr.click[data-a="openBk"]', { hasText: 'Chờ xếp xe' }).first();
if (await hold.count()) {
  await hold.click(); await p.waitForTimeout(200);
  check('hold on off day: reject + propose available', (await p.locator('[data-a="asgPanel"][data-p="rej"]').count()) === 1 && (await p.locator('[data-a="asgPanel"][data-p="res"]').count()) === 1);
  await p.screenshot({ path: '/tmp/e2e-shots/off-2-booking.png', fullPage: true });
}
await p.context().close();
// 3. CS sửa booking đã xác nhận trong ngày nghỉ sang ngày khác
p = await open('cs@demo.vn');
await p.evaluate(d => { V.view = 'day'; V.day = d; render(); }, D); await p.waitForTimeout(200);
const okr = p.locator('tr.click[data-a="openBk"]', { hasText: 'Đã xác nhận' }).first();
check('CS sees confirmed booking in off-day list', (await okr.count()) === 1);
if (await okr.count()) { await okr.click(); await p.waitForTimeout(200); check('CS can edit it', (await p.locator('[data-a="editBk"]').count()) === 1); }
await p.context().close();
await browser.close(); console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ALL OFFDAY CHECKS PASSED');
