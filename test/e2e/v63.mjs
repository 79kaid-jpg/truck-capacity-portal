// v3.50: logo mới ở đầu trang / màn đăng nhập, biểu tượng menu Khai báo xe.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v63.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v63'; fs.mkdirSync(OUT, { recursive: true });
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
  await page.route('**/api/chat', async r => { if (r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }); const b = JSON.parse(r.request().postData()); const ms = b.messages; const last = ms[ms.length - 1].content; const sys = ms[0].content;
    let out; if (/^KẾT QUẢ CÔNG CỤ (\w+): /.test(last)) { const [, t] = last.match(/^KẾT QUẢ CÔNG CỤ (\w+): /); globalThis.__toolRes = last; out = { answer: 'Đã xong công cụ **' + t + '**. [Mở ngày](#day:' + (ms[0].content.match(/"hom_nay":"([^"]+)"/) || [])[1] + ':JM2)' }; }
    else out = globalThis.__plan ? globalThis.__plan(last, sys) : { answer: 'ok' };
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: JSON.stringify(out), left: 42, ...(globalThis.__eng || {}) }) }); });
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
// màn đăng nhập (trước khi vào app)
{ const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.goto('http://127.0.0.1:8787/'); await p.waitForSelector('#lg-e');
  ok(await p.locator('.loginbox .brand .mark.m63 img[src^="favicon.svg"]').count() === 1, 'màn đăng nhập: logo mới');
  await ctx.close(); }
for (const [w, h] of [[1440, 1000], [390, 844]]) {
  await session('log@demo.vn', async p => {
    S('logo-' + w); await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => render()); await p.waitForTimeout(300);
    const img = p.locator('.top .logo .mark.m63 img');
    ok(await img.count() === 1, `${w}px: logo đầu trang là icon mới`);
    ok(await img.evaluate(i => i.complete && i.naturalWidth > 0), `${w}px: ảnh logo tải được`);
    ok(await p.locator('.top .logo .mark svg').count() === 0, `${w}px: bỏ biểu tượng xe cũ trong vòng tròn`);
    await p.evaluate(() => go('fleet')); await p.waitForTimeout(400);
    ok(await p.locator('.top .logo .mark.m63 img').count() === 1, `${w}px: logo vẫn đúng sau khi vẽ lại`);
    const menuIcon = await p.evaluate(() => [...document.querySelectorAll('[data-a="go"][data-v="fleet"] svg')].map(s => s.outerHTML));
    ok(menuIcon.length >= 1 && menuIcon.every(s => s.includes('cx="8.6"')), `${w}px: menu Khai báo xe dùng biểu tượng coil`, String(menuIcon.length));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${w}px: không cuộn ngang`);
    await shot(p, 'logo-' + w);
  });
}
await browser.close();
console.log(`\n${pass} đạt, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
