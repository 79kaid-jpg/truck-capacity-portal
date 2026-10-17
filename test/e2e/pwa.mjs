// v3.13: phiên bản mới, PWA, xem khi mất mạng.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/pwa.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/pwa'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.route('**/cdn.jsdelivr.net/**', r => r.request().url().includes('xlsx') ? r.fulfill({ contentType: 'text/javascript', body: '' }) : r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  if (process.env.NEWV) await page.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: '{"v":"9.9.9","note":"thử"}' }));
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
await session('cs@demo.vn', async p => {
  S('offline'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!localStorage.getItem('tcp-last')), 'lưu dữ liệu lần tải gần nhất');
  await p.context().setOffline(true);
  await p.evaluate(() => reload().then(render)); await p.waitForTimeout(500);
  ok(await p.locator('#offbar').isVisible(), 'mất mạng: hiện thanh "đang xem dữ liệu lúc…"');
  ok(await p.locator('.cal .cell').count() > 20, 'mất mạng: vẫn xem được lịch');
  await p.evaluate(() => mutate('req_create', { p: {} })); await p.waitForTimeout(300); ok(/mất kết nối/i.test(await toastTxt(p)), 'mất mạng: chặn thao tác');
  await shot(p, 'offline');
  await p.context().setOffline(false); await p.evaluate(() => dispatchEvent(new Event('online'))); await p.waitForTimeout(1500);
  ok(await p.locator('#offbar').count() === 0, 'có mạng lại: tự cập nhật, bỏ thanh báo');
  S('logout'); await p.evaluate(() => A.logout()); await p.waitForTimeout(1500); ok(await p.evaluate(() => !localStorage.getItem('tcp-last')), 'đăng xuất xóa dữ liệu lưu');
});
process.env.NEWV = '1';
await session('cs@demo.vn', async p => {
  S('update'); await p.evaluate(() => updCheck()); await p.waitForTimeout(400);
  ok(/9\.9\.9/.test(await p.locator('#updbar').innerText()), 'báo có phiên bản mới');
  await shot(p, 'update'); await p.click('#upd-x'); ok(await p.locator('#updbar').count() === 0, 'bấm ✕ để sau');
  S('manifest'); const m = await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.json())); ok(m.display === 'standalone' && m.icons.length >= 2, 'manifest cài được');
  S('sw'); await p.evaluate(() => localStorage.setItem('sw-test', '1')); await p.reload(); await p.waitForTimeout(2500);
  const c = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); const k = await caches.keys(); const n = k.length ? (await (await caches.open(k[0])).keys()).length : 0; return { reg: !!r, k, n }; });
  ok(c.reg && c.k.some(x => x.startsWith('tcp-shell-')) && c.n >= 10, 'service worker cài và lưu giao diện', JSON.stringify(c));
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
