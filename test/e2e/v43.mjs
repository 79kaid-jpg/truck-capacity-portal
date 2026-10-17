// v3.15: RSM, công tắc picking list, chưa xác nhận giao.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v43.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v43'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.route('**/cdn.jsdelivr.net/**', r => r.request().url().includes('xlsx') ? r.fulfill({ contentType: 'text/javascript', body: '' }) : r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  page.on('pageerror', e => errors.push(`[${email} ${step}] pageerror: ${e.message}`));
  await page.goto('http://127.0.0.1:8787/');
  await page.fill('#lg-e', email); await page.fill('#lg-p', 'Test@1234'); await page.click('#login button');
  await page.waitForTimeout(800);
  if (await page.locator('#mfe-code').count()) { await page.waitForSelector('#mfe button:not([disabled])'); await page.fill('#mfe-code', '123456'); await page.click('#mfe button'); await page.waitForTimeout(800); }
  else if (await page.locator('#mfc-code').count()) { await page.fill('#mfc-code', '123456'); await page.click('#mfc button'); await page.waitForTimeout(800); }
  await page.waitForSelector('.cal');
  try { await fn(page); } catch (e) { errors.push(`[${email} ${step}] ${e.message.split('\n')[0]}`); console.log('FAIL', step, e.message.split('\n')[0]); await page.screenshot({ path: `${OUT}/FAIL-${step}.png`, fullPage: true }); }
  await ctx.close();
}
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const S = s => { step = s; };
const toastTxt = async p => (await p.locator('.toast').last().textContent({ timeout: 5000 }).catch(() => '')) || '';
const fillArea = async (p, sel, v) => { await p.fill(sel, v); await p.locator(sel).dispatchEvent('input'); await p.waitForTimeout(400); await p.locator(sel).dispatchEvent('change'); await p.waitForTimeout(300); };
const ev = (p, f, a) => p.evaluate(f, a);

import { execSync } from 'child_process';
const sql = q => execSync(`psql -h /tmp -U postgres -d t -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const S1 = '00000000-0000-0000-0000-0000000000d1', S2 = '00000000-0000-0000-0000-0000000000d2';
await session('admin@demo.vn', async p => {
  S('user-form'); await p.evaluate(x => A.userEdit({ id: x }), S2); await p.waitForTimeout(300);
  ok(await p.locator('#un-mg option').count() >= 2, 'form Sales có ô Quản lý trực tiếp');
  await p.selectOption('#un-mg', S1); await p.evaluate(() => { const b = [...document.querySelectorAll('.modal .mfoot .btn')].pop(); b.click(); }); await p.waitForTimeout(1000);
  ok(sql(`select manager_id from app.profiles where user_id='${S2}'`) === S1, 'lưu được quản lý trực tiếp');
  await p.evaluate(x => A.userEdit({ id: x }), S1); await p.waitForTimeout(300);
  await p.selectOption('#un-sc', 'team'); await p.locator('.modal [data-k="notifyTeam"]').check(); await p.evaluate(() => { const b = [...document.querySelectorAll('.modal .mfoot .btn')].pop(); b.click(); }); await p.waitForTimeout(1000);
  ok(sql(`select stat_scope||'/'||notify_team from app.profiles where user_id='${S1}'`) === 'team/true', 'đặt RSM: phạm vi Nhóm của tôi + nhận thông báo');
  S('picking'); await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(400);
  ok(await p.locator('.pkcard input[data-k="requirePicking"]').isEnabled(), 'Admin thấy công tắc picking list');
  await p.locator('.pkcard input[data-k="requirePicking"]').uncheck(); await p.waitForTimeout(1200);
  ok(sql("select value::text from app.settings where key='requirePicking'") === 'false', 'tắt bắt buộc picking list');
  ok(await p.locator('.top .pkoff').count() === 1, 'thanh trên cùng nhắc đang tắt');
  await p.screenshot({ path: `${OUT}/admin-cfg.png` });
});
const bk = sql("select id from app.bookings where status='ok' and delivery_at is null limit 1");
await session('log@demo.vn', async p => {
  S('log-load'); await p.evaluate(x => openBk ? openBk(x) : openBooking(x), bk).catch(async () => { await p.evaluate(x => openBooking(x), bk); }); await p.waitForTimeout(500);
  ok(await p.locator('[data-a="v9Ship"][data-k="load"]').count() === 1, 'Logistics load được khi chưa có danh sách cuộn');
  await p.click('[data-a="v9Ship"][data-k="load"]'); await p.waitForTimeout(400); await p.locator('.modal .mfoot .btn').last().click(); await p.waitForTimeout(1200);
  ok(sql(`select status from app.bookings where id='${bk}'`) === 'loaded', 'đơn chuyển Đã load');
  sql(`update app.bookings set day = current_date - 1 where id='${bk}'`);
  await p.evaluate(() => reload().then(render)); await p.waitForTimeout(600);
  ok(await p.evaluate(x => todo29(bkById(x), true), bk), 'đơn quá ngày chưa xác nhận giao vào Cần xử lý');
});
await session('s1@demo.vn', async p => {
  S('rsm'); ok(await p.evaluate(() => me().team.length) === 2, 'RSM có nhóm 2 người');
  ok(await p.evaluate(x => S.customers.some(c => c.salesId === x), S2), 'RSM thấy khách của Sales trong nhóm');
  ok(await p.evaluate(() => S.bookings.every(b => b.customerId !== '__other')), 'RSM thấy chi tiết đơn của nhóm');
  await p.evaluate(() => { dzInit(); V.dz.tab = 'sales'; go('dash'); }); await p.waitForTimeout(2500);
  ok(await p.locator('#dz-sp option').count() >= 3, 'Bảng thống kê lọc theo từng Sales');
  await p.screenshot({ path: `${OUT}/rsm-dash.png` });
});
await session('s2@demo.vn', async p => {
  S('s2'); ok(await p.evaluate(x => !S.customers.some(c => c.salesId === x), S1), 'Sales trong nhóm không thấy khách của RSM');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
