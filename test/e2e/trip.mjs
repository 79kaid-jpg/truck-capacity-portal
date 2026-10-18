// v3.16: trạng thái chuyến xe, khóa xe đã chạy.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/trip.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/trip'; fs.mkdirSync(OUT, { recursive: true });
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
import { execSync as ex2 } from 'child_process';
const q = s => ex2(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
// xe có 2 đơn: đơn 1 Đã load, đơn 2 vẫn Đã xếp xe → Đang bốc 1/2; sau đó đơn 1 Đang giao → Đã chạy
const row = q("select min(a.truck_code)||'|'||b.day||'|'||b.warehouse_code||'|'||string_agg(b.id, ',' order by b.id) from app.allocations a join app.bookings b on b.id=a.booking_id where b.status='ok' and b.day>=current_date group by b.day,b.warehouse_code having count(distinct b.id)>=2 order by b.day limit 1");
q(`update app.allocations set truck_code='${row.split('|')[0]}' where booking_id in ('${row.split('|')[3].split(',').slice(0, 2).join("','")}')`);
const [tk, day, wh] = row.split('|'); const short = tk.split('-').slice(2).join('-');
const bks = q(`select string_agg(distinct a.booking_id, ',') from app.allocations a where a.truck_code='${tk}'`).split(',');
q(`update app.bookings set status='loaded', loaded_at=now() where id='${bks[0]}'`);
const open = async p => { await p.evaluate(([w, d]) => { V.wh = w; V.whAll = false; V.day = d; V.view = 'day'; render(); }, [wh, day]); await p.waitForTimeout(400); };
const card = p => p.locator(`.tcard[data-c="${tk}"]`).first();
await session('log@demo.vn', async p => {
  S('loading'); await open(p); const t = await card(p).innerText();
  ok(new RegExp("Đang bốc 1\\/"+bks.length,"i").test(t) && !/Đã chạy/i.test(t), 'bốc 1/2 đơn: Đang bốc, chưa khóa', t.replace(/\n/g, ' | '));
  ok(!/Đang xếp/.test(await p.locator('.main').innerText()), 'không còn chữ "Đang xếp"');
  await p.screenshot({ path: `${OUT}/loading.png` });
});
q(`update app.bookings set status='transit' where id='${bks[0]}'`);
await session('log@demo.vn', async p => {
  S('dep'); await open(p); const t = await card(p).innerText();
  ok(/Đã chạy/i.test(t) && new RegExp("Đang giao 1\\/"+bks.length,"i").test(t), 'có đơn Đang giao: khóa xe (Đã chạy)', t.replace(/\n/g, ' | '));
  ok(await card(p).locator('[data-a="place"]').count() === 0, 'ẩn nút Xếp đơn');
  await p.selectOption('#f-st', 'transit'); await p.waitForTimeout(300); ok(await p.locator('.tcard').count() >= 1, 'lọc theo chuyến Đang giao');
  ok(/ĐANG GIAO: \d/.test(await p.locator('.foot').innerText()), 'dòng tổng đếm theo chuyến');
  await card(p).click(); await p.waitForTimeout(300); ok(/Đã chạy/i.test(await p.locator('.modal').innerText()), 'chi tiết xe hiện Đã chạy');
  await p.screenshot({ path: `${OUT}/departed.png` });
});
q(`update app.bookings set status='delivered' where id in ('${bks.join("','")}')`);
await session('log@demo.vn', async p => {
  S('done'); await open(p); ok(await card(p).locator('.tdone').count() === 1 && /Đã giao xong/i.test(await card(p).innerText()), 'giao xong: dấu ✓ + Đã giao xong');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
