// E2E: thống kê khách (cột Khách trên lịch, DB-05) và phạm vi thống kê theo tài khoản. Test-only.
// Tham số: tổng tấn tháng này của khách s1 (ok+hold+resched+draft), tổng tấn khách Dân dụng, tổng tấn khách Dự án — tính bằng SQL trong all.sh
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const [OWN, DD, DA] = process.argv.slice(2);
const browser = await chromium.launch(); const errs = [];
const check = (n, ok, x = '') => { console.log((ok ? 'OK  ' : 'FAIL') + ' ' + n + (x ? ' | ' + x : '')); if (!ok) errs.push(n); };
async function open(email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1300 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'t'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  p.on('pageerror', e => errs.push(`[${email}] ${e.message}`));
  await p.goto('http://127.0.0.1:8787/'); await p.fill('#lg-e', email); await p.fill('#lg-p', 'Test@1234'); await p.click('#login button'); await p.waitForTimeout(800);
  if (await p.locator('#mfe-code').count()) { await p.waitForSelector('#mfe button:not([disabled])'); await p.fill('#mfe-code', '123456'); await p.click('#mfe button'); await p.waitForTimeout(800); }
  else if (await p.locator('#mfc-code').count()) { await p.fill('#mfc-code', '123456'); await p.click('#mfc button'); await p.waitForTimeout(800); }
  await p.waitForTimeout(600); return p;
}
const big = async p => (await p.locator('aside.sst .bignum').innerText()).split('\n').pop().trim();

// 1. Sales mặc định: khách mình phụ trách, có cả nháp CS lưu cho khách
let p = await open('s1@demo.vn');
let txt = await p.locator('aside.sst').innerText();
check('Sales own: title + scope label', /THỐNG KÊ KHÁCH CỦA BẠN/i.test(txt) && /Khách bạn phụ trách/.test(txt));
check('Sales own: total = SQL', (await big(p)) === OWN, `${await big(p)} vs ${OWN}`);
check('Sales own: draft counted', /Đang lưu tạm\s*12,00 t · 1 đơn/.test(txt));
check('Sales own: no segment chips', (await p.locator('[data-a="csSeg"]').count()) === 0);
await p.screenshot({ path: '/tmp/e2e-shots/ss-1-sales.png', fullPage: true });
await p.context().close();

// 2. Admin đặt phạm vi "Toàn bộ khách Dân dụng" cho s1 (VP Sales Retail)
p = await open('admin@demo.vn');
await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="users"]'); await p.waitForTimeout(200);
await p.locator('tr', { hasText: 's1@demo.vn' }).locator('[data-a="userEdit"]').click(); await p.waitForTimeout(200);
await p.selectOption('#un-sc', 'DD'); await p.click('[data-a="unSave"]'); await p.waitForTimeout(700);
// 3. Admin: lịch có nút Xe | Khách; Khách -> chọn segment
await p.click('[data-a="go"][data-v="calendar"]'); await p.waitForTimeout(300);
check('Admin: Xe | Khách toggle on calendar', (await p.locator('[data-a="statMode"]').count()) === 2 && /THỐNG KÊ/.test(await p.locator('aside.stats').innerText()));
await p.click('[data-a="statMode"][data-v="cust"]'); await p.waitForTimeout(700);
check('Admin Khách: all customers scope', /Tất cả khách hàng/.test(await p.locator('aside.sst').innerText()));
await p.click('[data-a="csSeg"][data-v="DD"]'); await p.waitForTimeout(200); const ddA = await big(p);
await p.click('[data-a="csSeg"][data-v="DA"]'); await p.waitForTimeout(200); const daA = await big(p);
check('Admin Khách: Dân dụng / Dự án = SQL', ddA === DD && daA === DA, `${ddA}/${daA} vs ${DD}/${DA}`);
await p.click('[data-a="csSeg"][data-v="all"]'); await p.waitForTimeout(200);
await p.screenshot({ path: '/tmp/e2e-shots/ss-2-admin-cust.png', fullPage: true });
// 4. DB-05
await p.click('[data-a="goDb5"]'); await p.waitForTimeout(700);
const db = await p.locator('.panel').first().innerText();
check('DB-05 built: KPI + sections', /Tổng đã đặt/.test(db) && /THEO SEGMENT/i.test(db) && /THEO SALES/i.test(db) && /THEO KHÁCH HÀNG/i.test(db) && /LÝ DO TỪ CHỐI/i.test(db));
check('DB-05 segment totals', db.includes(DD) && db.includes(DA));
await p.screenshot({ path: '/tmp/e2e-shots/ss-3-db05.png', fullPage: true });
await p.click('[data-a="db5Sort"][data-k="ok"]'); await p.waitForTimeout(200);
check('DB-05 sort by confirmed', /Đã xác nhận ▼/.test(await p.locator('.panel').first().innerText()));
await p.click('[data-a="dbMonth"][data-d="-1"]'); await p.waitForTimeout(900);
check('DB-05 previous month loads', /THÁNG \d\d\/\d{4}/.test(await p.locator('.db5bar').innerText()));
await p.context().close();

// 5. s1 với phạm vi Dân dụng: thống kê toàn DD nhưng danh sách booking vẫn chỉ khách mình
p = await open('s1@demo.vn');
txt = await p.locator('aside.sst').innerText();
check('Sales DD scope: label + total = all DD', /Toàn bộ khách Dân dụng/.test(txt) && (await big(p)) === DD, await big(p));
check('Sales DD scope: details still restricted', await p.evaluate(() => S.bookings.filter(b => b.customerId !== '__other').every(b => cust(b.customerId).salesId === V.me)));
await p.context().close();

// 6. CS: nút Khách, mặc định tất cả khách
p = await open('cs@demo.vn');
await p.click('[data-a="statMode"][data-v="cust"]'); await p.waitForTimeout(700);
check('CS Khách panel works', (await big(p)) === (await p.evaluate(() => t2(0) )) ? false : true);
await p.context().close();
await browser.close(); console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ALL SALESSTATS CHECKS PASSED');
