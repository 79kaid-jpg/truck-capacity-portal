// E2E: Danh sách booking lọc theo khách phụ trách và thời gian (tuần này, tháng trước…). Test-only.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const OLD = process.argv[2]; // mã booking đã chuyển sang tháng trước
const browser = await chromium.launch(); const errs = [];
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
  await p.click('[data-a="go"][data-v="bookings"]'); await p.waitForTimeout(400);
  await p.click('[data-a="blTab"][data-t="all"]'); await p.waitForTimeout(500);
  return p;
}
const rows = p => p.locator('tbody tr.click').count();
const sum = p => p.locator('.blsum').innerText();
const sel = async (p, id, v) => { await p.selectOption(id, v); await p.waitForTimeout(500); };

let p = await open('cs@demo.vn');
const nMonth = await rows(p); check('default Tháng này has rows + summary', nMonth > 0 && /booking ·/.test(await sum(p)), await sum(p));
check('old booking not in this month', (await p.locator('tr', { hasText: OLD }).count()) === 0);
await sel(p, '#bl-per', 'pmonth');
check('Tháng trước shows old booking (fetched from server)', (await p.locator('tr', { hasText: OLD }).count()) === 1, await sum(p));
await p.screenshot({ path: '/tmp/e2e-shots/bl-1-prev-month.png', fullPage: true });
await p.locator('tr', { hasText: OLD }).click(); await p.waitForTimeout(800);
check('click old booking opens its detail', (await p.locator('.crumb').innerText().catch(() => '')).includes(OLD));
await p.click('[data-a="go"][data-v="bookings"]'); await p.waitForTimeout(400);
await sel(p, '#bl-per', 'week'); const nWeek = await rows(p);
check('Tuần này ≤ tháng này', nWeek <= nMonth, `week=${nWeek} month=${nMonth}`);
await sel(p, '#bl-per', 'custom');
check('Tùy chọn shows date inputs', (await p.locator('#bl-from').count()) === 1 && (await p.locator('#bl-to').count()) === 1);
await sel(p, '#bl-per', 'month');
await sel(p, '#bl-cu', 'mine'); const nMine = await rows(p);
const mineOk = await p.evaluate(() => [...document.querySelectorAll('tbody tr.click')].every(tr => { const b = (V.blData.rows.find(x => x.id === tr.dataset.id)); const c = cust(b.customerId); return c.csId === V.me; }));
check('Khách tôi phụ trách: only my customers', nMine > 0 && nMine < nMonth && mineOk, `mine=${nMine}`);
await p.click('[data-a="blReset"]'); await p.waitForTimeout(500);
check('Bỏ lọc resets', (await rows(p)) === nMonth);
await p.context().close();

p = await open('s1@demo.vn');
const allOwn = await p.evaluate(() => [...document.querySelectorAll('tbody tr.click')].every(tr => cust(V.blData.rows.find(x => x.id === tr.dataset.id).customerId).salesId === V.me));
check('Sales list only own customers', (await rows(p)) > 0 && allOwn);
check('Sales customer dropdown only own', await p.evaluate(() => [...document.querySelectorAll('#bl-cu option')].filter(o => !['all', 'mine'].includes(o.value)).every(o => cust(o.value).salesId === V.me)));
await p.context().close();
await browser.close(); console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ALL BLFILTER CHECKS PASSED');
