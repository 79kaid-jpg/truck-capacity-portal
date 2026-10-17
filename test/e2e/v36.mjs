// v3.6: lịch dễ nhìn hơn (cột CN hẹp, thanh năng lực, ô bấm được, ＋ đặt hàng, cột Tuần, lọc, tất cả kho, 2 tuần, phím tắt, khung thống kê).
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v36.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v36'; fs.mkdirSync(OUT, { recursive: true });
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

await session('log@demo.vn', async p => {
  S('cal'); await shot(p, 'cal-month');
  ok(await p.locator('.cal.v36 .wd', { hasText: 'TUẦN' }).count() === 1 && await p.locator('.cell.wk').count() >= 4, 'có cột Tuần');
  const sunW = await p.locator('.cal.v36 .wd').first().boundingBox(), monW = await p.locator('.cal.v36 .wd').nth(1).boundingBox();
  ok(sunW.width < monW.width * 0.6, 'cột Chủ nhật hẹp', `${sunW.width} vs ${monW.width}`);
  ok(await p.locator('.c36 .avail', { hasText: 'MT' }).count() > 0 && await p.locator('.c36 .capbar').count() > 0, 'ô ngày: Còn đặt được (MT) + thanh năng lực');
  ok(await p.locator('.c36 .pill.p-ok').count() === 0, 'không còn nhãn "Còn chỗ" trong ô');
  ok(await p.locator('.c36 [data-a="openDay"]').count() === 0, 'không còn nút Chi tiết lặp lại');
  const c = p.locator('.c36:not(.past)').first(); const d = await c.getAttribute('data-d');
  await c.hover(); await p.waitForTimeout(600); ok(await p.locator('#calTip').count() === 1 && /Còn đặt được/.test(await p.locator('#calTip').innerText()), 'rê chuột → xem nhanh'); await shot(p, 'cal-tip');
  await c.click({ position: { x: 20, y: 30 } }); await p.waitForTimeout(300); ok(await ev(p, () => V.view) === 'day' && await ev(p, () => V.day) === d, 'bấm cả ô → mở chi tiết ngày');
  await ev(p, () => go('calendar')); await p.waitForTimeout(200);
  S('filter'); await p.click('[data-a="calF"][data-v="hold"]'); await p.waitForTimeout(200);
  const dimN = await p.locator('.c36.dim').count(), all = await p.locator('.c36').count(); ok(dimN > 0 && dimN < all, 'lọc "Có đơn chờ xếp xe" làm mờ ngày khác', `${dimN}/${all}`);
  await p.click('[data-a="calF"][data-v="all"]');
  S('allwh'); await p.selectOption('select[data-a36="wh"]', '__all'); await p.waitForTimeout(300); await shot(p, 'cal-allwh');
  ok(await p.locator('.c36 .whl').count() > 0, 'Tất cả kho: mỗi ô có dòng từng kho');
  await p.locator('.c36 .whl').first().click(); await p.waitForTimeout(300); ok(await ev(p, () => V.view === 'day' && !V.whAll), 'bấm dòng kho → mở ngày của kho đó');
  await ev(p, () => go('calendar'));
  S('w2'); await p.selectOption('select[data-a36="wh"]', 'JM2'); await p.waitForTimeout(200); await p.click('[data-a="calV"][data-v="w2"]'); await p.waitForTimeout(300); await shot(p, 'cal-2w');
  ok(await p.locator('.c36').count() === 12 || await p.locator('.cal.v36 .cell').count() >= 14, '2 tuần: 14 ngày');
  ok(await p.locator('.c36 .bl').count() > 0, '2 tuần: hiện tên khách trong ô');
  const t0 = await p.locator('.monthnav h1').innerText(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  ok(await p.locator('.monthnav h1').innerText() !== t0, 'phím → chuyển kỳ');
  await p.keyboard.press('t'); await p.waitForTimeout(300); await p.click('[data-a="calV"][data-v="m"]');
  S('side'); ok(await p.locator('.ts36').count() === 1 && /LẤP ĐẦY XE ĐANG CHẠY/i.test(await p.locator('.ts36').innerText()), 'thống kê Xe đầy đủ'); await shot(p, 'side-truck');
  await p.click('.ts36 [data-a="sideT"]'); await p.waitForTimeout(200); ok(await p.locator('.sidebtn').count() === 1, 'thu gọn khung thống kê');
  await p.click('.sidebtn'); await p.waitForTimeout(200);
  S('cust'); await p.click('[data-a="statMode"][data-v="cust"]'); await p.waitForFunction(() => !!document.querySelector('.sst .sst-row.clk'), null, { timeout: 10000 });
  await p.locator('.sst .sst-row.clk').first().click(); await p.waitForFunction(() => V.modal && V.modal.type === 'dzList', null, { timeout: 15000 });
  ok(await p.locator('.modal tr[data-a="dzBk"]').count() > 0, 'bấm dòng thống kê khách → danh sách đơn (Bảng thống kê)');
  await ev(p, () => { V.modal = null; go('calendar'); }); await p.waitForTimeout(400);
  const nb = p.locator('[data-a="calNoBk"]'); if (await nb.count()) { await nb.click(); await p.waitForTimeout(200); ok(/KHÁCH CHƯA ĐẶT/.test(await p.locator('.modal').innerText()), 'danh sách khách chưa đặt'); }
});
await session('cs@demo.vn', async p => { await p.keyboard.press('n'); await p.waitForTimeout(300); ok(await ev(p, () => V.modal && V.modal.type) === 'grid', 'phím N → mở Đặt hàng'); });
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
