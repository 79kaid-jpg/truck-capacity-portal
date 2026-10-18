// v3.30: tải phần thay đổi, sức khỏe hệ thống.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v49.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v49'; fs.mkdirSync(OUT, { recursive: true });
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
import { execSync } from 'child_process';
const q = s => execSync(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
const snap = p => p.evaluate(() => JSON.stringify({ b: RAW.bookings.map(b => JSON.stringify(b)).sort(), a: RAW.allocs.map(a => a.id + a.bk + a.truck + a.tons).sort(), au: RAW.audit.length, r: (RAW.reqs || []).length }));
await session('log@demo.vn', async p => {
  S('first'); ok(await p.evaluate(() => reload.lastKind) === 'full', 'lần đầu tải toàn bộ');
  S('delta-note'); const id = q("select id from app.bookings where status='ok' and day>=current_date order by day limit 1");
  q(`update app.bookings set note='ghi chú delta' where id='${id}'`);
  await p.evaluate(() => reload()); ok(await p.evaluate(() => reload.lastKind) === 'delta', 'thay đổi đơn → chỉ tải phần thay đổi');
  ok(await p.evaluate(id => bkById(id).note === 'ghi chú delta', id), 'đơn được cập nhật đúng');
  S('delta-alloc'); const al = q(`select id from app.allocations where booking_id='${id}' limit 1`);
  if (al) { q(`update app.allocations set tons = tons - 1 where id='${al}'`); await p.evaluate(() => reload()); ok(await p.evaluate(a => S.allocs.find(x => x.id === a) && reload.lastKind === 'delta', al), 'đổi phần xe → delta cập nhật phần xe'); }
  S('delta-del'); const del = q("select id from app.bookings where status='hold' order by id desc limit 1"); q(`delete from app.bookings where id='${del}'`);
  await p.evaluate(() => reload()); ok(await p.evaluate(d => !bkById(d), del), 'đơn bị xóa biến mất');
  S('same-as-full'); const a = await snap(p); await p.evaluate(() => reload(true)); const b = await snap(p); ok(a === b, 'dữ liệu sau các lần delta giống hệt tải toàn bộ');
  S('struct'); q("update app.daily_fleet set reason = coalesce(reason,'') where true"); await p.evaluate(() => reload()); ok(await p.evaluate(() => reload.lastKind) === 'full', 'đổi khai báo xe → tải toàn bộ');
  S('size'); const sz = await p.evaluate(async () => { const t = RAW; q0 = JSON.stringify(t).length; return q0; }).catch(() => 0);
  q(`update app.bookings set note='x2' where id='${id}'`); const dsz = await p.evaluate(async () => { const [f, t] = rangeNow(); const d = await rpc('get_delta', { p_since: +VER.d, p_from: f, p_to: t, p_s: +VER.s, p_c: +VER.c, p_m: +VER.m, p_n: +VER.n }); return JSON.stringify(d).length; });
  ok(dsz < 5000 && dsz * 5 < sz, `phần thay đổi nhỏ hơn nhiều (${dsz} B so với ${sz} B)`);
  S('talk-no-bump'); const d0 = q('select last_value from app.data_seq'); await p.evaluate(id => rpc('talk_get', { p_kind: 'bk', p_ref: id }).catch(() => null), id);
  ok(q('select last_value from app.data_seq') === d0, 'mở Trao đổi không làm mọi người tải lại');
});
await session('admin@demo.vn', async p => {
  S('health'); await p.evaluate(() => { usgAdd('full', RAW); errPush('lỗi thử nghiệm', 'test'); usgFlush(true); }); await p.waitForTimeout(800);
  await p.evaluate(() => { dzInit(); V.dz.tab = 'sys'; go('dash'); }); await p.waitForTimeout(1500); await p.evaluate(() => render()); await p.waitForTimeout(500);
  const t = await p.locator('.main').innerText(); ok(/SỨC KHỎE HỆ THỐNG/.test(t) && /Băng thông tháng này/.test(t) && /lỗi thử nghiệm/.test(t), 'Sức khỏe hệ thống: băng thông, database, lỗi người dùng');
  await shot(p, 'health');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
