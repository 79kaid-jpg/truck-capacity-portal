// v3.10: B B / B N lịch sử màn hình + menu Hướng dẫn.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v39.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v39'; fs.mkdirSync(OUT, { recursive: true });
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
const key = async (p, ...ks) => { for (const k of ks) { await p.keyboard.press(k); await p.waitForTimeout(120); } await p.waitForTimeout(400); };
const view = p => ev(p, () => V.view);
await session('admin@demo.vn', async p => {
  S('nav');
  await key(p, 'g', 's'); ok(await view(p) === 'dash', 'G S → Thống kê');
  await key(p, 'g', 'c'); ok(await view(p) === 'config', 'G C → Cấu hình');
  await key(p, 'b', 'b'); ok(await view(p) === 'dash', 'B B → về Thống kê');
  await key(p, 'b', 'b'); ok(await view(p) === 'calendar', 'B B lần 2 → về Lịch');
  await key(p, 'b', 'b'); ok(/Không còn màn hình trước/.test(await toastTxt(p)), 'B B ở đầu → báo hết', JSON.stringify(await p.evaluate(() => [V.view, V.modal && V.modal.type, [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|'), document.activeElement && document.activeElement.tagName + '.' + document.activeElement.className])));
  await key(p, 'b', 'n'); ok(await view(p) === 'dash', 'B N → đi tới Thống kê');
  await key(p, 'b', 'n'); ok(await view(p) === 'config', 'B N → đi tới Cấu hình');
  await key(p, 'b', 'n'); ok(/Không còn màn hình phía trước/.test(await toastTxt(p)), 'B N ở cuối → báo hết');
  await p.goBack(); await p.waitForTimeout(500); ok(await view(p) === 'dash', 'nút Back trình duyệt → Thống kê');
  await key(p, 'g', 't'); ok(await view(p) === 'notifs', 'mở màn mới sau khi lùi');
  await key(p, 'b', 'n'); ok(/phía trước/.test(await toastTxt(p)), 'màn mới xoá danh sách đi tới');
  S('month'); await key(p, 'g', 'l'); const ym0 = await ev(p, () => V.ym.join('-')); await key(p, 'ArrowRight');
  ok(await ev(p, () => V.ym.join('-')) !== ym0, 'sang tháng sau', JSON.stringify(await p.evaluate(() => [V.view, V.modal && V.modal.type, [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|'), document.activeElement && document.activeElement.tagName + '.' + document.activeElement.className]))); await key(p, 'b', 'b'); ok(await ev(p, () => V.ym.join('-')) === ym0, 'B B → về tháng trước đó');
  S('typing'); await key(p, 'g', 's'); await p.evaluate(() => { const i = document.createElement('input'); i.id = 'tt'; document.body.appendChild(i); }); await p.focus('#tt'); await key(p, 'b', 'b');
  ok(await view(p) === 'dash' && await p.inputValue('#tt') === 'bb', 'gõ "bb" trong ô không chuyển màn');
  S('help'); await p.evaluate(() => document.getElementById('tt').remove()); await p.evaluate(() => A.scHelp()); await p.waitForTimeout(300);
  ok(/Quay lại màn hình trước/.test(await p.locator('.modal').innerText()) && /màn hình vừa rời/.test(await p.locator('.modal').innerText()), 'bảng phím tắt có B B / B N'); await key(p, 'Escape');
  S('guide'); await p.evaluate(() => A.guide({})); await p.waitForSelector('#guide nav a'); await p.click('#guide [data-gd="max"]').catch(() => {}); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const g = document.getElementById('guide').getBoundingClientRect(); const n = document.querySelector('#guide nav b').getBoundingClientRect(); return { gl: g.left, nl: n.left, gw: g.width, vw: document.documentElement.clientWidth }; });
  ok(r.gl >= 0 && r.nl - r.gl >= 16 && r.gw <= r.vw + 1, 'Hướng dẫn toàn màn hình không bị cắt, menu có lề', JSON.stringify(r));
  await shot(p, 'guide-max');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
