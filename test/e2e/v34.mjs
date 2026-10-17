// v3.4: khung Đặt hàng to, co giãn, zoom cả bảng, toàn màn hình, nhớ kích thước.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v34.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v34'; fs.mkdirSync(OUT, { recursive: true });
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

await session('cs@demo.vn', async p => {
  S('grid-size'); await ev(p, () => openGrid30(addDays(TODAY, 1))); await p.waitForTimeout(300);
  const box = await p.locator('.modal.xl').boundingBox();
  ok(box.width > 1300 && box.height > 850, 'khung to sẵn (~96% x 92% màn hình)', JSON.stringify(box));
  const tw = await p.locator('.g30 > .tbl-wrap').boundingBox();
  ok(tw.height > 400, 'bảng giãn hết chiều cao còn lại', JSON.stringify(tw));
  const fs0 = await p.locator('.g30 tbody .inp').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  await p.click('[data-a="g30Zoom"][data-d="10"]'); await p.click('[data-a="g30Zoom"][data-d="10"]'); await p.waitForTimeout(200);
  const fs1 = await p.locator('.g30 tbody .inp').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  const td1 = await p.locator('.g30 tbody td').nth(1).evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  ok(fs1 > fs0 * 1.15 && td1 > 13, 'A+ phóng to cả ô nhập trong bảng', `${fs0} → ${fs1}, td ${td1}`);
  await shot(p, 'grid-zoom120');
  await p.click('[data-a="g30Max"]'); await p.waitForTimeout(200);
  const bm = await p.locator('.modal.xl').boundingBox();
  ok(bm.width >= 1439 && bm.height >= 999, 'toàn màn hình', JSON.stringify(bm));
  await p.click('[data-a="g30Max"]'); await p.waitForTimeout(200);
  // kéo góc dưới phải để thu nhỏ
  const b2 = await p.locator('.modal.xl').boundingBox();
  await p.mouse.move(b2.x + b2.width - 4, b2.y + b2.height - 4); await p.mouse.down();
  await p.mouse.move(b2.x + b2.width - 300, b2.y + b2.height - 200, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(700);
  const b3 = await p.locator('.modal.xl').boundingBox();
  ok(b3.width < b2.width - 100, 'kéo góc để co giãn khung', `${b2.width} → ${b3.width}`);
  await ev(p, () => { V.modal = null; render(); openGrid30(addDays(TODAY, 1)); }); await p.waitForTimeout(300);
  const b4 = await p.locator('.modal.xl').boundingBox();
  ok(Math.abs(b4.width - b3.width) < 30 && await ev(p, () => V.modal.zoom) === 120, 'mở lại giữ kích thước và mức zoom', `${b3.width} vs ${b4.width}`);
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
