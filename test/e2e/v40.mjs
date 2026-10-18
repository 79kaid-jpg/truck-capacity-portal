// v3.11: lịch khách hàng nhiều kho.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v40.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v40'; fs.mkdirSync(OUT, { recursive: true });
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
await session('kh@demo.vn', async p => {
  S('chips');
  ok(await p.locator('.cwh button').count() >= 2, 'có hàng nút kho');
  ok(/Tất cả kho/.test(await p.locator('.cwh button.on').innerText()), 'mặc định Tất cả kho');
  ok(await p.locator('.whsel').count() === 0, 'không còn ô chọn kho dạng select');
  ok(await p.locator('.cell.call .cwl').count() > 0, 'ô ngày hiện từng kho');
  ok(await p.locator('.cal36bar.cbar [data-a="guide"]').count() === 1, 'link Hướng dẫn nằm trên thanh nút kho');
  ok(await p.locator('aside.cmy').count() === 1 && /14 ngày tới/i.test(await p.locator('aside.cmy').innerText()), 'khung Đơn của tôi');
  await shot(p, 'cust-all');
  const badge = p.locator('.cbadge').first();
  if (await badge.count()) { await badge.dblclick(); await p.waitForTimeout(300); ok(/Tất cả kho/i.test(await p.locator('.modal').innerText()) && /Kho/i.test(await p.locator('.modal th').first().innerText()), 'chi tiết ngày: mọi kho có cột Kho'); await shot(p, 'cust-day'); await p.keyboard.press('Escape'); await p.evaluate(() => { V.modal = null; render(); }); }
  else ok(false, 'có huy hiệu đơn trong tháng');
  await p.evaluate(() => { V.past52 = true; render(); }); await p.hover('.cell.call >> nth=20'); await p.waitForTimeout(300); ok(!(await p.locator('#calTip').isVisible().catch(() => false)), 'khách không thấy tooltip nội bộ (năng lực, xe trống)');
  S('one'); const w = await p.locator('.cwh button').nth(1).getAttribute('data-w'); await p.locator('.cwh button').nth(1).click(); await p.waitForTimeout(300);
  ok(await ev(p, () => !V.whAll && V.wh) === w, 'bấm nút kho → lọc 1 kho');
  ok(await p.locator('.cell.call').count() === 0 && await p.locator('.bigavail').count() > 0, 'lịch 1 kho hiện Có thể đặt');
  await p.reload(); await p.waitForSelector('.cal'); await p.waitForTimeout(500);
  ok(await ev(p, () => !V.whAll && V.wh) === w, 'mở lại vẫn nhớ kho đã chọn');
  await p.locator('.cwh button').first().click(); await p.waitForTimeout(200);
  S('mobile'); await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); ok(sw, 'điện thoại: không cuộn ngang trang');
  await shot(p, 'cust-mobile');
  S('guide-kh'); await p.setViewportSize({ width: 1440, height: 1000 }); await p.click('.cal36bar [data-a="guide"]'); await p.waitForSelector('#guide nav a');
  const nav = await p.locator('#guide nav').innerText();
  ok(!/LOGISTICS|CS\n|ADMIN|SALES/.test(nav) && /ĐỌC MÀN HÌNH/.test(nav), 'khách chỉ thấy hướng dẫn của khách', nav.slice(0, 120));
  ok(/Tất cả kho/.test(await p.locator('#guide article h2').innerText()), '"Hướng dẫn màn này" mở mục đọc lịch');
  ok(await p.locator('#guide article img').count() === 1 && await p.evaluate(() => document.querySelector('#guide article img').naturalWidth > 0), 'ảnh minh họa tải được');
  await p.fill('#guide [data-gd="q"]', 'xep xe'); await p.waitForTimeout(400); ok(!/Logistics|Xếp xe theo/.test(await p.locator('#guide article').innerText()), 'tìm kiếm chỉ trong hướng dẫn khách');
  await shot(p, 'guide-kh');
});
await session('admin@demo.vn', async p => {
  S('admin'); ok(await p.locator('.whsel select').count() === 1 && await p.locator('.cwh').count() === 0, 'nội bộ giữ ô chọn kho cũ');
  await p.evaluate(() => A.guide({})); await p.waitForSelector('#guide nav a'); ok(/ADMIN/.test(await p.locator('#guide nav').innerText()), 'nội bộ vẫn thấy hướng dẫn đầy đủ');
  const cid = await p.evaluate(() => S.customers.find(c => c.code === 'KH0101')?.id || S.customers[0].id); await p.evaluate(x => A.cvStart({ id: x }), cid); await p.waitForTimeout(900);
  ok(await p.locator('#guide').count() === 0, 'vào Xem như khách thì đóng khung hướng dẫn');
  await p.evaluate(() => A.guide({})); await p.waitForSelector('#guide nav a'); ok(/ĐỌC MÀN HÌNH/.test(await p.locator('#guide nav').innerText()) && !/ADMIN/.test(await p.locator('#guide nav').innerText()), 'Xem như khách: hướng dẫn của khách');
  await p.evaluate(() => A.cvStop()); await p.waitForTimeout(900); await p.evaluate(() => A.guide({})); await p.waitForSelector('#guide nav a'); ok(/ADMIN/.test(await p.locator('#guide nav').innerText()), 'thoát Xem như khách: hướng dẫn đầy đủ trở lại');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
