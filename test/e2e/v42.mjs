// v3.14: menu ô ngày, bấm đúp, phím Y.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v42.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v42'; fs.mkdirSync(OUT, { recursive: true });
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
const future = p => p.evaluate(() => { const c = [...document.querySelectorAll('.cal .cell[data-cd]')].find(x => x.dataset.cd > TODAY && dayM(V.wh, x.dataset.cd).declared); return c && c.dataset.cd; });
const cellSel = d => `.cal .cell[data-cd="${d}"]`;
const clickCell = async (p, d) => { const b = await p.locator(cellSel(d)).boundingBox(); await p.mouse.click(b.x + b.width - 12, b.y + b.height - 8); await p.waitForTimeout(250); };
await session('s1@demo.vn', async p => {
  S('sales'); const d = await future(p); await clickCell(p, d);
  const t = await p.locator('#cellMenu').innerText().catch(() => '');
  ok(/Yêu cầu đặt hàng ngày này/.test(t) && /Mở chi tiết ngày/.test(t) && !/Đặt hàng ·/.test(t), 'Sales: menu có Yêu cầu + Chi tiết ngày, không có Đặt hàng', t.replace(/\n/g, ' | '));
  await p.screenshot({ path: `${OUT}/sales-menu.png` });
  await p.click('#cellMenu button:has-text("Yêu cầu đặt hàng")'); await p.waitForTimeout(300);
  ok(await p.evaluate(d => V.modal && V.modal.type === 'rqNew' && V.modal.f.day === d, d), 'mở form yêu cầu đúng ngày');
  await p.keyboard.press('Escape'); await p.evaluate(() => { V.modal = null; render(); });
  S('dbl'); await p.locator(cellSel(d)).dblclick({ position: { x: 30, y: 60 } }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => V.view) === 'day', 'bấm đúp → chi tiết ngày');
  await p.evaluate(() => go('calendar')); await p.waitForTimeout(300);
  S('esc'); await clickCell(p, d); await p.keyboard.press('Escape'); ok(await p.locator('#cellMenu').count() === 0, 'Esc đóng menu');
  S('keyY'); await p.locator(cellSel(d)).focus(); await p.keyboard.press('y'); await p.waitForTimeout(300);
  ok(await p.evaluate(d => V.modal && V.modal.type === 'rqNew' && V.modal.f.day === d, d), 'phím Y → yêu cầu cho ô đang chọn');
  await p.evaluate(() => { V.modal = null; render(); });
  S('enter'); await p.locator(cellSel(d)).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400); ok(await p.evaluate(() => V.view) === 'day', 'Enter vẫn mở chi tiết ngày');
});
await session('cs@demo.vn', async p => {
  S('cs'); const d = await future(p); await clickCell(p, d); const t = await p.locator('#cellMenu').innerText().catch(() => '');
  ok(/Đặt hàng/.test(t) && /Yêu cầu đặt hàng ngày này/.test(t), 'CS: có Đặt hàng + Yêu cầu', t.replace(/\n/g, ' | '));
  await p.click('#cellMenu button:has-text("Đặt hàng ·")'); await p.waitForTimeout(400); ok(await p.evaluate(d => V.modal && V.modal.type === 'grid' && V.modal.day === d, d), 'Đặt hàng mở lưới đúng ngày');
  await p.evaluate(() => { V.modal = null; render(); });
  S('all'); await p.evaluate(() => { V.whAll = true; render(); }); await p.waitForTimeout(200);
  const row = p.locator(`${cellSel(d)} .whl`).first(); const w = await row.getAttribute('data-w'); await row.click(); await p.waitForTimeout(250);
  const t2 = await p.locator('#cellMenu').innerText().catch(() => ''); ok(new RegExp('· ' + w).test(t2), 'Tất cả kho: bấm dòng kho → menu theo kho đó', t2.replace(/\n/g, ' | '));
  await p.screenshot({ path: `${OUT}/cs-all-menu.png` });
});
await session('log@demo.vn', async p => {
  S('log'); const d = await future(p); await clickCell(p, d); await p.waitForTimeout(300);
  ok(await p.evaluate(() => V.view) === 'day' && await p.locator('#cellMenu').count() === 0, 'Logistics (chỉ 1 lựa chọn) → vào thẳng chi tiết ngày');
});
await session('kh@demo.vn', async p => {
  S('kh'); const d = await p.evaluate(() => { const c = [...document.querySelectorAll('.cal .cell.mine[data-cd]')].find(x => x.dataset.cd >= TODAY); return c && c.dataset.cd; });
  await clickCell(p, d); const t = await p.locator('#cellMenu').innerText().catch(() => '');
  ok(/Yêu cầu đặt hàng ngày này/.test(t) && /Xem đơn của tôi/.test(t) && !/đội xe/.test(t), 'Khách: Yêu cầu + Xem đơn của tôi', t.replace(/\n/g, ' | '));
  await p.screenshot({ path: `${OUT}/kh-menu.png` }); await p.keyboard.press('Escape');
  await p.locator(cellSel(d)).dblclick({ position: { x: 30, y: 40 } }); await p.waitForTimeout(400); ok(await p.evaluate(() => V.modal && V.modal.type === 'custDay'), 'Khách bấm đúp → xem đơn ngày');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
