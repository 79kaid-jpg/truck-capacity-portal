// v3.54: điện thoại – thanh menu dưới không che nút chân cửa sổ; thẻ Đặt hàng ghi Ngày giao, địa chỉ bắt buộc.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v66.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v66'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
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



const topHit = (p, sel) => ev(p, s => { const b = document.querySelector(s); if (!b) return 'không có nút'; b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); if (r.bottom > innerHeight + 1 || r.top < 0) return 'ngoài màn hình ' + r.top + '/' + r.bottom; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return b.contains(e) ? '' : 'bị che bởi ' + (e && (e.className || e.tagName)); }, sel);
await session('cs@demo.vn', async p => {
  S('nav'); ok(await p.locator('.bnav61').isVisible(), 'điện thoại: có thanh menu dưới khi không mở cửa sổ');
  S('grid'); await ev(p, () => { S.cfg.deliveryMode = true; openGrid30(TODAY); render(); }); await p.waitForTimeout(500);
  ok(!(await p.locator('.bnav61').isVisible()), 'mở Đặt hàng: ẩn thanh menu dưới');
  for (const [sel, n] of [['.g30 .mfoot [data-m="hold"]', 'Đặt & gửi Logistics'], ['.g30 .mfoot [data-m="draft"]', 'Lưu tạm'], ['.g30 .mfoot [data-a="close"]', 'Đóng']]) { const r = await topHit(p, sel); ok(!r, `nút ${n} thấy và bấm được`, r); }
  const lb = await ev(p, () => { const td = document.querySelector('.g30 tbody tr td:nth-child(3)'), ta = document.querySelector('.g30 tbody tr td:nth-child(7)'); return [getComputedStyle(td, '::before').content, getComputedStyle(ta, '::before').content, document.querySelector('.g30 input[data-g="addr"]').placeholder]; });
  ok(/Ngày giao/.test(lb[0]), 'thẻ ghi Ngày giao', lb[0]);
  ok(/\*/.test(lb[1]) && !/không bắt buộc/.test(lb[1]) && /bắt buộc/.test(lb[2]), 'địa chỉ giao bắt buộc', lb.join(' | '));
  await shot(p, 'grid-phone');
  S('close'); await p.click('.g30 .mfoot [data-a="close"]'); await p.waitForTimeout(400);
  ok(await p.locator('.bnav61').isVisible(), 'đóng cửa sổ: thanh menu dưới hiện lại');
});
await browser.close();
console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
