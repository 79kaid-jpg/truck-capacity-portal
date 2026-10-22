// v3.55: Bảng thống kê trên điện thoại – số liệu lên màn đầu.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v67.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v67'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn, vp = { width: 1440, height: 1000 }) {
  const ctx = await browser.newContext({ viewport: vp });
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

await session('admin@demo.vn', async p => {
  S('phone');
  await p.evaluate(() => go('dash')); await p.waitForFunction(() => V.dz && V.dz.D && !document.querySelector('.main .empty'), null, { timeout: 15000 }); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const t = document.querySelector('.dz-tile'); const tabs = [...document.querySelectorAll('.dz67top .tabs button')];
    return { top: t ? t.getBoundingClientRect().top : 9999, h: innerHeight, rows: new Set(tabs.map(b => Math.round(b.getBoundingClientRect().top))).size, nTabs: tabs.length,
      sw: document.documentElement.scrollWidth, w: innerWidth, per: getComputedStyle(document.querySelector('.dz-per')).display, sel: !!document.querySelector('.dz67sel'),
      f: [...document.querySelectorAll('.dz-bar .f67')].every(x => getComputedStyle(x).display === 'none'),
      small: [...document.querySelectorAll('.dz67top button, .dz67top select')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim() || b.getAttribute('aria-label')),
      title: document.querySelector('.dz67top h2').textContent }; });
  ok(r.top < r.h - 80, 'thẻ số liệu đầu tiên trong màn hình đầu', JSON.stringify([r.top, r.h]));
  ok(r.rows === 1 && r.nTabs >= 5, 'tab một hàng', JSON.stringify(r));
  ok(r.sw <= r.w, 'không cuộn ngang trang');
  ok(r.per === 'none' && r.sel && r.f && r.title === 'Thống kê', 'kỳ một dòng + ô chọn loại kỳ, Kho/Segment/Sales ẩn vào Bộ lọc');
  ok(r.small.length === 0, 'nút ≥ 44px', JSON.stringify(r.small));
  await shot(p, 'dash-phone');
  // ⋯
  await p.click('[data-a="dzm67"]'); await p.waitForTimeout(300);
  const items = await p.evaluate(() => [...document.querySelectorAll('.dz67menu button')].map(b => b.textContent.trim()));
  ok(items.join('|') === 'Tải Excel|In / PDF|Làm mới|Hướng dẫn màn này', 'nút ⋯: Excel, In, Làm mới, Hướng dẫn', items.join('|'));
  await shot(p, 'dash-menu');
  await p.mouse.click(200, 700); await p.waitForTimeout(300);
  ok(await p.locator('.dz67menu').count() === 0, 'bấm ra ngoài đóng menu');
  // loại kỳ
  await p.selectOption('.dz67sel', 'week'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => V.dz.per === 'week'), 'đổi loại kỳ bằng ô chọn');
  await p.selectOption('.dz67sel', 'month'); await p.waitForTimeout(800);
  // Bộ lọc
  await p.click('[data-a="dzf67"]'); await p.waitForTimeout(300);
  ok(await p.locator('.dzf67 [data-a="dzf67set"][data-k="wh"]').count() === 4, 'Bộ lọc: chip Kho');
  await p.click('.dzf67 [data-k="wh"][data-v="JM2"]'); await p.waitForTimeout(500);
  await shot(p, 'dash-filter');
  await p.click('.dzf67 [data-a="close"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => V.dz.wh === 'JM2') && /1/.test(await p.locator('[data-a="dzf67"] .n').innerText()), 'lọc kho → nút Bộ lọc có số 1');
  await p.click('[data-a="dzf67"]'); await p.waitForTimeout(300); await p.click('.dzf67 [data-a="dzf67clr"]'); await p.waitForTimeout(400); await p.click('.dzf67 [data-a="close"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !V.dz.wh) && await p.locator('[data-a="dzf67"] .n').count() === 0, 'Bỏ lọc');
  // cuộn: cụm điều khiển dính đầu, nút trợ lý ẩn khi cuộn xuống
  await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(200); await p.evaluate(() => scrollTo(0, 1400)); await p.waitForTimeout(400);
  const s2 = await p.evaluate(() => ({ t: document.querySelector('.dz67top').getBoundingClientRect().top, hd: document.querySelector('.top').getBoundingClientRect().height, down: document.body.classList.contains('dz67down') }));
  ok(Math.abs(s2.t - s2.hd) < 4, 'cụm điều khiển dính dưới thanh trên', JSON.stringify(s2));
  ok(s2.down, 'cuộn xuống: nút trợ lý ẩn');
  await p.evaluate(() => scrollTo(0, 300)); await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => document.body.classList.contains('dz67down'))), 'cuộn lên: nút trợ lý hiện lại');
}, { width: 390, height: 844 });

await session('admin@demo.vn', async p => {
  S('desktop');
  await p.evaluate(() => go('dash')); await p.waitForFunction(() => V.dz && V.dz.D && !document.querySelector('.main .empty'), null, { timeout: 15000 }); await p.waitForTimeout(500);
  ok(await p.locator('.dz67top').count() === 0 && await p.locator('.dz-per').isVisible() && await p.locator('#dz-w').isVisible(), 'máy tính giữ nguyên');
});

console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); }
await browser.close(); process.exit(errors.length ? 1 : 0);
