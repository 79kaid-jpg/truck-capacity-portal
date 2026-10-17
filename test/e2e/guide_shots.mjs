// Chụp ảnh minh họa cho Hướng dẫn sử dụng (web/guide/*.jpg). Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/guide_shots.mjs
// Ảnh lưu thẳng vào web/guide/ – chạy lại khi giao diện đổi.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/guide'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, acceptDownloads: true });
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
const G = new URL('../../web/guide/', import.meta.url).pathname;
const snap = async (p, name, sel) => { await p.waitForTimeout(400); const o = { path: G + name + '.jpg', type: 'jpeg', quality: 72 };
  if (sel) await p.locator(sel).first().screenshot(o); else await p.screenshot(o); console.log('saved', name); };
await session('cs@demo.vn', async p => {
  await snap(p, 'lich-thang');
  const c = p.locator('.c36:not(.past)').nth(2); await c.hover(); await p.waitForTimeout(700); await snap(p, 'lich-xem-nhanh');
  await ev(p, () => A.calV({ v: 'w2' })); await snap(p, 'lich-2-tuan'); await ev(p, () => A.calV({ v: 'm' }));
  await ev(p, () => { let d = addDays(TODAY, 1); for (let i = 0; i < 10 && !(S.fleet[V.wh] || {})[d]; i++) d = addDays(d, 1); openGrid30(d); });
  await p.evaluate(() => { const el = document.querySelector('[data-g="code"][data-i="0"]'); const dt = new DataTransfer(); dt.setData('text/plain', 'KH0101\t20\nKH0102\t15'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  await snap(p, 'dat-hang-luoi', '.modal'); await ev(p, () => { V.modal = null; render(); });
  const bk = sql("select id from app.bookings where status='ok' order by day, id limit 1");
  await ev(p, x => openBooking(x), bk); await snap(p, 'chi-tiet-booking');
  await p.click('[data-a="v9Deliv"]').catch(() => {}); await p.waitForTimeout(300); await snap(p, 'xac-nhan-giao-hang', '.modal'); await ev(p, () => { V.modal = null; render(); });
  await ev(p, () => go('profile')); await p.locator('#sc-me').scrollIntoViewIfNeeded(); await snap(p, 'phim-tat-ho-so', '#sc-me');
  await ev(p, () => go('calendar')); await ev(p, () => A.scHelp()); await snap(p, 'bang-phim-tat', '.modal');
});
await session('log@demo.vn', async p => {
  const d = sql("select min(b.day) from app.bookings b join app.allocations a on a.booking_id=b.id where b.status='ok' and b.day >= current_date");
  await ev(p, x => A.openDay({ d: x }), d); await snap(p, 'chi-tiet-ngay');
  const h = sql("select id from app.bookings where status='hold' order by day, id limit 1"); await ev(p, x => openBooking(x), h); await snap(p, 'xep-xe');
  await ev(p, () => go('fleet')); await snap(p, 'khai-bao-xe');
  await ev(p, () => go('dash')); await p.waitForFunction(() => V.dz && V.dz.D && !V.dz.busy, null, { timeout: 15000 }); await snap(p, 'thong-ke-logistics');
});
await session('admin@demo.vn', async p => {
  await ev(p, () => go('dash')); await p.waitForFunction(() => V.dz && V.dz.D && !V.dz.busy, null, { timeout: 15000 }); await ev(p, () => { V.dz.tab = 'ov'; render(); }); await p.waitForTimeout(500); await snap(p, 'thong-ke-tong-quan');
  await p.locator('.dz-tile').first().click(); await snap(p, 'thong-ke-danh-sach-don', '.modal'); await ev(p, () => { V.modal = null; render(); });
  await ev(p, () => { V.dz.tab = 'tgt'; render(); }); await p.waitForTimeout(500); await snap(p, 'thong-ke-muc-tieu');
  await ev(p, () => { V.view = 'users'; V.uTab = 'customers'; render(); }); await snap(p, 'khach-hang');
  await ev(p, () => A.impOpen()); await snap(p, 'nhap-khach-tu-file', '.modal'); await ev(p, () => { V.modal = null; render(); });
  await ev(p, () => { V.cfgTab = 'sc'; go('config'); }); await snap(p, 'cau-hinh-phim-tat');
  await ev(p, () => { V.cfgTab = 'wh'; go('config'); }); await snap(p, 'cau-hinh-kho');
  const c = sql("select id from app.customers where code='KH0101'"); await ev(p, x => A.cvStart({ id: x }), c); await p.waitForTimeout(800); await snap(p, 'xem-nhu-khach');
  await ev(p, () => A.cvStop()); await p.waitForTimeout(400);
});
await browser.close(); console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'SHOTS DONE');
