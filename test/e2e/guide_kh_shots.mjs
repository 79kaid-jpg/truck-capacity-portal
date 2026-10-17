// Chụp ảnh cho Hướng dẫn khách hàng (web/guide/kh-*.jpg). Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/guide_kh_shots.mjs
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
// đánh số ①②③ lên ảnh
const mark = (p, list) => p.evaluate(list => { document.querySelectorAll('.gmark').forEach(x => x.remove());
  list.forEach(([sel, n, dx = 0, dy = 0]) => { const el = document.querySelector(sel); if (!el) return; const r = el.getBoundingClientRect();
    const m = document.createElement('div'); m.className = 'gmark'; m.textContent = n;
    m.style.cssText = `position:fixed;left:${r.left + dx - 13}px;top:${r.top + dy - 13}px;width:26px;height:26px;border-radius:50%;background:#e0233a;color:#fff;font:700 15px/26px sans-serif;text-align:center;z-index:999;box-shadow:0 0 0 3px #fff`;
    document.body.appendChild(m); }); }, list);
// màn đăng nhập
{ const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.request().url().includes('xlsx') ? r.fulfill({ contentType: 'text/javascript', body: '' }) : r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.goto('http://127.0.0.1:8787/'); await p.waitForSelector('#lg-e'); await p.fill('#lg-e', 'ketoan@congty.vn'); await snap(p, 'kh-dang-nhap'); await ctx.close(); }
await session('kh@demo.vn', async p => {
  S('all'); await p.setViewportSize({ width: 1366, height: 900 }); await ev(p, () => { V.whAll = true; render(); });
  const badgeCell = '.cell.call.mine .cbadge';
  await mark(p, [['.monthnav h1', '1', -20, 0], ['.cwh button', '2', 0, 0], ['.cell.call:not(.undecl):not(.past) .cwl', '3', -6, 0], [badgeCell, '4', -6, 0], ['aside.cmy h3', '5', -10, 0]]);
  await snap(p, 'kh-lich-tat-ca'); await p.evaluate(() => document.querySelectorAll('.gmark').forEach(x => x.remove()));
  await snap(p, 'kh-don-cua-toi', 'aside.cmy');
  await p.locator('.cell.call.mine').first().click(); await p.waitForTimeout(400); await snap(p, 'kh-chi-tiet', '.modal'); await ev(p, () => { V.modal = null; render(); });
  const w = await p.locator('.cwh button').nth(1).getAttribute('data-w'); await ev(p, w => A.cWh({ w }), w); await snap(p, 'kh-lich-mot-kho');
  await ev(p, () => A.cWh({ w: '__all' }));
  const uid = sql("select p.user_id from app.profiles p join auth.users u on u.id=p.user_id where u.email='kh@demo.vn'");
  const bks = sql(`select id from app.bookings where customer_id=(select customer_id from app.profiles where user_id='${uid}') order by day limit 3`).split('\n');
  sql(`delete from app.notifications where user_id='${uid}'; insert into app.notifications (user_id,type,text,link) values ('${uid}','Giữ chỗ','Đơn ${bks[2]} ngày 21/10 tại JM2 đã giữ chỗ, chờ xếp xe','{"bk":"${bks[2]}"}'),('${uid}','Xác nhận','Đơn ${bks[1]} ngày 19/10 đã được xếp xe','{"bk":"${bks[1]}"}'),('${uid}','Đã load','Đơn ${bks[0]} ngày 17/10 đã load lên xe','{"bk":"${bks[0]}"}')`);
  await p.reload(); await p.waitForSelector('.cal'); await p.waitForTimeout(600);
  await ev(p, () => go('notifs')); await p.setViewportSize({ width: 1366, height: 520 }); await snap(p, 'kh-thong-bao'); await p.setViewportSize({ width: 1366, height: 900 }); await ev(p, () => go('calendar'));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300); await p.evaluate(() => { const c = document.querySelector('.cell.call.mine'); if (c) window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 300); });
  await snap(p, 'kh-dien-thoai');
});
await browser.close();
console.log(errors.length ? errors.join('\n') : 'xong'); if (errors.length) process.exit(1);
