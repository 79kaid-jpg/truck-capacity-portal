// v3.5: Bảng thống kê mới – tab, bấm biểu đồ xem đơn, mở đơn rồi quay lại, mục tiêu.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v35.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v35'; fs.mkdirSync(OUT, { recursive: true });
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

const waitDash = async p => { await p.waitForFunction(() => V.dz && V.dz.D && !V.dz.busy, null, { timeout: 15000 }); await p.waitForTimeout(200); };
await session('admin@demo.vn', async p => {
  S('tabs'); await ev(p, () => go('dash')); await waitDash(p);
  const tabs = await p.locator('[data-a="dzTab"]').allInnerTexts();
  ok(['Tổng quan', 'CS', 'Logistics', 'Sales', 'Ngoại lệ', 'Lịch đơn', 'Mục tiêu', 'Hệ thống'].every(t => tabs.map(x => x.trim().toLowerCase()).includes(t.toLowerCase())), 'đủ 8 tab', tabs.join(','));
  for (const t of ['ov', 'cs', 'log', 'sales', 'exc', 'cal', 'tgt', 'sys']) {
    await ev(p, x => { V.dz.tab = x; render(); }, t); await waitDash(p); await shot(p, 'tab-' + t);
    ok(await p.locator('.panel').count() > 0 && !(await p.locator('.empty', { hasText: 'Đang tải' }).count()), 'tab ' + t + ' hiển thị');
  }
  S('drill'); await ev(p, () => { V.dz.tab = 'ov'; render(); }); await waitDash(p);
  await p.locator('.dz-tile').first().click(); await p.waitForTimeout(200);
  const n = await p.locator('.modal tr[data-a="dzBk"]').count();
  ok(n > 0 && /TỔNG ĐÃ ĐẶT/i.test(await p.locator('.modal h2').innerText()), 'bấm ô Tổng đã đặt → danh sách đơn', 'n=' + n);
  await shot(p, 'drill-list');
  const id = await p.locator('.modal tr[data-a="dzBk"]').first().getAttribute('data-id');
  await p.locator('.modal tr[data-a="dzBk"]').first().click(); await p.waitForTimeout(300);
  ok(await ev(p, () => V.view) === 'booking' && await ev(p, () => V.bk) === id, 'bấm đơn → mở chi tiết đơn');
  await ev(p, () => A.back()); await p.waitForTimeout(300);
  ok(await ev(p, () => V.view) === 'dash' && await p.locator('.modal tr[data-a="dzBk"]').count() === n, 'quay lại → đúng tab và danh sách cũ');
  await ev(p, () => { V.modal = null; render(); });
  S('bar'); const bars = p.locator('.dz-svg rect[data-a="dzPick"][data-j]');
  if (await bars.count()) { await bars.first().click({ force: true }); await p.waitForTimeout(200); ok(await p.locator('.modal tr[data-a="dzBk"]').count() > 0, 'bấm cột biểu đồ → danh sách đơn của cột'); await ev(p, () => { V.modal = null; render(); }); }
  else ok(false, 'có cột biểu đồ để bấm');
  const seg = p.locator('.dz-hb .tr span').first(); await seg.click(); await p.waitForTimeout(200);
  ok(await p.locator('.modal tr[data-a="dzBk"]').count() > 0, 'bấm thanh ngang → danh sách đơn'); await ev(p, () => { V.modal = null; render(); });
  S('filter'); const all = await ev(p, () => dzScope(V.dz, ...dzRange(V.dz)).list.length);
  await p.selectOption('#dz-s', 'DA'); await p.waitForTimeout(200);
  const da = await ev(p, () => dzScope(V.dz, ...dzRange(V.dz)).list.every(r => r.g === 'DA'));
  ok(da && await ev(p, () => dzScope(V.dz, ...dzRange(V.dz)).list.length) < all, 'lọc segment Dự án');
  await p.selectOption('#dz-s', '');
  S('targets'); await ev(p, () => { V.cfgTab = 'tgt'; go('config'); }); await p.waitForSelector('[data-tg]');
  const m = await ev(p, () => TODAY.slice(0, 7));
  await p.fill(`[data-tg="${m}|DD"]`, '400'); await p.fill(`[data-tg="${m}|DA"]`, '100'); await p.click('[data-a="tgtSave"]'); await p.waitForTimeout(800);
  await ev(p, () => { go('dash'); V.dz.tab = 'tgt'; V.dz.anchor = TODAY; render(); }); await waitDash(p); await shot(p, 'tab-tgt-2');
  ok(/500(,00)? MT/.test(await p.locator('.dz-tile').first().innerText()), 'mục tiêu tháng = 400 + 100 t', JSON.stringify(await p.locator('.dz-tile').first().innerText()) + JSON.stringify(await ev(p, () => [V.dz.D.tgt, V.tgtC && V.tgtC.v])));
});
await session('cs@demo.vn', async p => { await ev(p, () => go('dash')); await waitDash(p); ok(await ev(p, () => V.dz.tab) === 'cs', 'CS mở sẵn tab CS'); });
await session('s1@demo.vn', async p => { await ev(p, () => go('dash')); await waitDash(p);
  ok(await ev(p, () => V.dz.tab) === 'sales' && await ev(p, () => V.dz.D.rows.every(r => r.sales === S.me.id)), 'Sales: tab Sales, chỉ khách mình'); });
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
