// v3.3: xác nhận giao hàng sau ngày bốc (ngày bốc thực tế), icon xe theo tải, xe thùng XT.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v33.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v33'; fs.mkdirSync(OUT, { recursive: true });
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
const bk = sql("select b.id from app.bookings b where b.status='ok' and exists (select 1 from app.allocations a where a.booking_id=b.id) order by b.id limit 1");
const tons = +sql(`select app.bk_total('${bk}')`);
sql(`update app.bookings set day = current_date - 3 where id = '${bk}'`);
sql("insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason) values ('JM2', current_date, 9, 4, 'test') on conflict do nothing");

await session('cs@demo.vn', async p => {
  S('late-deliv'); await ev(p, id => openBooking(id), bk); await p.waitForSelector('[data-a="v9Deliv"]');
  await p.click('[data-a="v9Deliv"]'); await p.waitForTimeout(300);
  ok(await p.locator('#dv-ad').count() === 1 && await p.locator('#dv-ad').inputValue() === await ev(p, () => TODAY), 'ngày bốc đã qua → có ô Ngày giao thực tế, mặc định hôm nay');
  const q = (tons / 2).toFixed(2).replace('.', ',');
  await fillArea(p, '#dv-t', `Whs\tOrder no\tLn\tItmno\tName\tLot number\tAllocated qty\tAttr value\tCustomer\nJM2\tSO-1\t1\tA\tTôn\tV33-A\t${q}\t\t\nJM2\tSO-1\t2\tA\tTôn\tV33-B\t${q}\t\t`);
  await shot(p, 'late-modal');
  await p.click('[data-a="v9DelivSave"]'); await p.waitForTimeout(1200);
  if (await p.locator('[data-a="v9DelivSave"][data-force]').count()) { await p.click('[data-a="v9DelivSave"][data-force]'); await p.waitForTimeout(1200); }
  const st = await ev(p, id => { const b = bkById(id); return [b.status, b.date === TODAY, ST_LABEL[stKey(b)], allocSum(b.id)]; }, bk);
  ok(st[0] === 'hold' && st[1] && st[3] === 0, 'đơn chuyển sang hôm nay, gỡ xe, Chờ xếp xe', JSON.stringify(st));
  ok(st[2] === 'Đã XN giao hàng · Chờ xếp xe', 'nhãn Đã XN giao hàng · Chờ xếp xe', st[2]);
});

await session('log@demo.vn', async p => {
  S('icons');
  const d = sql("select min(b.day) from app.bookings b join app.allocations a on a.booking_id=b.id where b.status='ok' and b.day >= current_date");
  await ev(p, x => { V.view = 'day'; V.day = x; render(); }, d); await p.waitForTimeout(400); await shot(p, 'day-trucks');
  const n = await p.locator('.tcard svg.tv').count();
  ok(n > 0, 'thẻ xe dùng icon mới', 'n=' + n);
  ok(await p.locator('.grp h3', { hasText: 'xe thùng (XT)' }).count() === 1, 'nhóm Xe thùng (XT)');
  const colored = await p.evaluate(() => [...document.querySelectorAll('.tcard svg.tv rect[clip-path], .tcard svg.tv rect[opacity]')].length);
  ok(colored > 0, 'xe có hàng được tô màu theo tải', 'n=' + colored);
  ok(await ev(p, () => TRUCK_SVG('DK', 0, 30).includes('clip-path') === false && TRUCK_SVG('DK', 30, 30).includes('#d33a2c') && TRUCK_SVG('XT', 12.5, 15).includes('#e0861a')), 'màu: trống trắng, đầy đỏ, 83% cam');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
