// E2E: thống kê khách theo trạng thái + CS đặt lại booking bị từ chối. Test-only.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errs = []; const log = (...a) => console.log(...a);
const check = (name, ok, extra = '') => { log((ok ? 'OK  ' : 'FAIL') + ' ' + name + (extra ? ' | ' + extra : '')); if (!ok) errs.push('FAIL ' + name); };
async function open(email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'t'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  p.on('pageerror', e => errs.push(`[${email}] ${e.message}`));
  await p.goto('http://127.0.0.1:8787/'); await p.fill('#lg-e', email); await p.fill('#lg-p', 'Test@1234'); await p.click('#login button'); await p.waitForTimeout(800);
  if (await p.locator('#mfe-code').count()) { await p.waitForSelector('#mfe button:not([disabled])'); await p.fill('#mfe-code', '123456'); await p.click('#mfe button'); await p.waitForTimeout(800); }
  else if (await p.locator('#mfc-code').count()) { await p.fill('#mfc-code', '123456'); await p.click('#mfc button'); await p.waitForTimeout(800); }
  return p;
}
const BK = process.argv[2]; // booking giữ chỗ của Vạn Thành
const NEWDAY = process.argv[3];

// 1. Logistics từ chối
let p = await open('log@demo.vn');
await p.evaluate(id => openBooking(id), BK); await p.waitForTimeout(200);
await p.click('[data-a="asgPanel"][data-p="rej"]'); await p.fill('#rej', 'Hết xe ngày này'); await p.locator('#rej').dispatchEvent('input');
await p.click('[data-a="asgReject"]'); await p.waitForTimeout(500);
check('logistics reject', /từ chối/i.test(await p.locator('.toast').textContent().catch(() => '')));
await p.context().close();

// 2. Khách: thống kê tách trạng thái, ô lịch hiện "Bị từ chối"
p = await open('kh@demo.vn');
const st = await p.locator('aside.stats').innerText();
log(st.replace(/\n+/g, ' | '));
check('stats: tổng đã đặt 74', /TỔNG SỐ TẤN ĐÃ ĐẶT\s*74,00/.test(st));
check('stats: đã xác nhận 54 · 2 đơn', /Đã xác nhận\s*54,00 t · 2 đơn/.test(st));
check('stats: bị từ chối 20 · 1 đơn', /Bị từ chối\s*20,00 t · 1 đơn/.test(st));
check('stats: list 3 đơn', (await p.locator('.cbk').count()) === 3);
check('cell shows "Bị từ chối: 20,00 t"', (await p.locator('.cell', { hasText: 'Bị từ chối: 20,00 t' }).count()) === 1);
await p.screenshot({ path: `${OUT}/rb-1-customer-stats.png`, fullPage: true });
await p.locator('.cbk', { hasText: 'Từ chối' }).click(); await p.waitForTimeout(200);
check('list item opens day modal with reason', /Hết xe ngày này/.test(await p.locator('.modal').innerText()));
await p.context().close();

// 3. CS: Cần xử lý → Đặt lại ngày khác
p = await open('cs@demo.vn');
await p.click('[data-a="go"][data-v="bookings"]'); await p.waitForTimeout(200);
check('CS todo tab has rejected booking', (await p.locator('tr.click', { hasText: BK }).count()) === 1);
await p.locator('tr.click', { hasText: BK }).click(); await p.waitForTimeout(200);
check('rejected booking shows banner + Đặt lại button', (await p.locator('[data-a="rebookBk"]').count()) === 1 && /Booking bị từ chối/.test(await p.locator('.warnlist').first().innerText()));
await p.screenshot({ path: `${OUT}/rb-2-cs-rejected.png`, fullPage: true });
await p.click('[data-a="rebookBk"]'); await p.waitForTimeout(200);
const mt = await p.locator('.modal').innerText();
check('rebook modal: title, empty date, single button', /ĐẶT LẠI BOOKING/.test(mt) && (await p.locator('#bf-date').inputValue()) === '' && (await p.locator('.modal [data-a="bfDraft"]').count()) === 0 && (await p.locator('.modal [data-a="bfCancelOn"]').count()) === 0);
await p.click('.modal [data-a="bfHold"]'); await p.waitForTimeout(200);
check('no date -> error', /Chọn khách hàng và ngày bốc/.test(await p.locator('.modal .err').innerText().catch(() => '')));
await p.fill('#bf-date', NEWDAY); await p.locator('#bf-date').dispatchEvent('change'); await p.waitForTimeout(200);
await p.screenshot({ path: `${OUT}/rb-3-rebook-form.png`, fullPage: true });
await p.click('.modal [data-a="bfHold"]'); await p.waitForTimeout(600);
const t = await p.locator('.toast').textContent().catch(() => '') + ' / err: ' + await p.locator('.modal .err').innerText().catch(() => '');
check('rebook toast', /Đã đặt lại/.test(t), t);
const b = await p.evaluate(id => { const x = bkById(id); return x && [x.status, x.date, x.rejectReason]; }, BK);
check('booking now hold on new day, reason cleared', b && b[0] === 'hold' && b[1] === NEWDAY && b[2] === '', JSON.stringify(b));
await p.context().close();

// 4. Khách thấy lại "Chờ xếp xe" và có thông báo
p = await open('kh@demo.vn');
const st2 = await p.locator('aside.stats').innerText();
check('customer stats: chờ xếp xe 20 · 1 đơn, không còn từ chối', /Chờ xếp xe\s*20,00 t · 1 đơn/.test(st2) && !/Bị từ chối/.test(st2));
const notif = await p.evaluate(() => S.notifs.map(n => n.text).join(' || '));
check('customer notified of rebook', /đã được đặt lại/.test(notif));
await p.context().close();

// 5. Logistics thấy trong Approval request
p = await open('log@demo.vn');
await p.click('[data-a="go"][data-v="approvals"]'); await p.waitForTimeout(200);
check('logistics approvals list has it', (await p.locator('tr.click', { hasText: BK }).count()) === 1);
await p.context().close();

await browser.close();
log(errs.length ? '\nERRORS:\n' + errs.join('\n') : '\nALL REBOOK CHECKS PASSED');
