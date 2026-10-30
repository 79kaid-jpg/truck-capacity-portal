// v3.59: Lịch đội xe (Logistics): ô ngày, cột tuần, chi tiết ngày nhóm theo trạng thái, xếp đơn chờ vào xe, điện thoại theo tuần.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v70.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v70'; fs.mkdirSync(OUT, { recursive: true });
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

import { execSync } from 'child_process';
const q = s => execSync(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
// ngày có đơn chờ xếp xe và có xe
const [wh, day] = q("select b.warehouse_code||'|'||b.day from app.bookings b where b.status='hold' and b.day>=current_date and exists(select 1 from app.daily_fleet f where f.warehouse_code=b.warehouse_code and f.day=b.day) group by 1 order by count(*) desc limit 1").split('|');
const open = async p => { await p.evaluate(([w, d]) => { V.wh = w; V.whAll = false; LX.sel = d; LX.gOpen = {}; LX.cOpen = {}; LX.expAll = false; LX.pick = null; LX.msg = ''; LX.wk = lxMon(d); V.view = 'fleetcal'; const [y, m] = d.split('-').map(Number); if (goMonth(d)) return reload().then(render); render(); }, [wh, day]); await p.waitForTimeout(1200); };

await session('log@demo.vn', async p => {
  S('menu'); ok(await p.locator('nav.side [data-v="fleetcal"]').count() === 1, 'Logistics có menu Lịch đội xe');
  S('cal'); await open(p);
  ok(await p.locator('.lx-cell').count() >= 7, 'có ô ngày');
  ok(await p.locator('.lx-wk').count() >= 1, 'có cột Cả tuần');
  ok(await p.locator('.lx-cell.sel').count() === 1, 'ô ngày đang chọn được tô');
  ok(await p.locator('.lx-cell.sel .lx-tr').count() >= 1, 'ô ngày có số xe theo loại');
  const avail = await p.evaluate(() => t2(dayM(V.wh, LX.sel).avail));
  ok((await p.locator('.lx-cell.sel .lx-foot').innerText()).includes(avail), 'ô ngày: Còn đặt được = dayM.avail', avail);
  ok((await p.locator('.lx-panel .lx-kpis').innerText()).includes(avail), 'khung chi tiết: Còn đặt được khớp');
  ok(await p.locator('.lx-pend .lx-po').count() >= 1, 'có đơn chờ xếp xe trong khung');
  await shot(p, 'desktop');
  S('collapse'); const g = p.locator('.lx-panel button.lx-grp[data-a="lxG"]').first(); const before = await p.locator('.lx-card').count();
  await g.click(); await p.waitForTimeout(200);
  ok(await p.locator('.lx-card').count() < before, 'thu gọn nhóm xe');
  await p.locator('[data-a="lxAll"][data-v="1"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('.lx-det').count() >= 1, 'Mở tất cả → hiện chi tiết xe');
  await p.locator('[data-a="lxAll"][data-v="0"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('.lx-card').count() === 0, 'Thu gọn tất cả');
  S('pick'); await open(p);
  const pair = await p.evaluate(() => { const d = lxDay(V.wh, LX.sel); for (const b of d.pend) { const x = d.trucks.find(x => lxFit(x, b) === 'fit'); if (x) return [b.id, x.t.code]; } return null; });
  if (pair) {
    await p.locator(`[data-a="lxPick"][data-id="${pair[0]}"]`).click(); await p.waitForTimeout(200);
    ok(await p.locator(`.lx-card.tgt-fit[data-lxdrop="${pair[1]}"]`).count() === 1, 'chọn đơn → xe đủ chỗ viền xanh');
    await p.locator(`[data-a="lxDrop"][data-v="${pair[1]}"]`).click(); await p.waitForTimeout(1800);
    ok(+q(`select coalesce(sum(tons),0) from app.allocations where booking_id='${pair[0]}' and truck_code='${pair[1]}'`) > 0, 'Xếp vào xe này → ghi phần hàng lên xe');
  } else ok(false, 'không tìm được cặp đơn / xe đủ chỗ');
  S('drag'); await open(p);
  const pair2 = await p.evaluate(() => { const d = lxDay(V.wh, LX.sel); for (const b of d.pend) { const x = d.trucks.find(x => lxFit(x, b) === 'fit'); if (x) return [b.id, x.t.code]; } return null; });
  if (pair2) {
    await p.locator(`[data-lxdrag="${pair2[0]}"]`).dragTo(p.locator(`[data-lxdrop="${pair2[1]}"]`)); await p.waitForTimeout(1800);
    ok(+q(`select coalesce(sum(tons),0) from app.allocations where booking_id='${pair2[0]}' and truck_code='${pair2[1]}'`) > 0, 'kéo đơn thả vào xe → xếp');
  } else console.log('(bỏ qua kéo thả: hết cặp đơn / xe đủ chỗ)');
  S('past'); await p.evaluate(() => { LX.sel = TODAY; goMonth(TODAY); render(); }); await p.waitForTimeout(300);
  const pb = await p.locator('.lx-past').count();
  if (pb) { const n0 = await p.locator('.lx-row').count(); await p.locator('.lx-past').click(); await p.waitForTimeout(200); ok(await p.locator('.lx-row').count() > n0, 'mở các tuần đã qua'); }
  else console.log('(bỏ qua: tháng này chưa có tuần đã qua)');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'máy tính: không cuộn ngang trang');
});

await session('log@demo.vn', async p => {
  S('phone'); await open(p);
  ok(!(await p.locator('.lx-calw').isVisible()), 'điện thoại: ẩn lưới tháng');
  ok(await p.locator('.lx-drow').count() === 7, 'điện thoại: 7 ngày của tuần');
  ok(!(await p.locator('.lx-panel').isVisible()), 'điện thoại: chưa mở bảng chi tiết');
  await p.locator(`.lx-drow[data-d="${day}"]`).click(); await p.waitForTimeout(400);
  ok(await p.locator('.lx-panel.sheet').isVisible(), 'chạm ngày → bảng trượt chi tiết');
  await shot(p, 'phone-sheet');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'điện thoại: không cuộn ngang');
  await p.locator('.lx-panel.sheet [data-a="lxClose"]').click(); await p.waitForTimeout(300);
  ok(!(await p.locator('.lx-panel').isVisible()), 'đóng bảng trượt');
}, { width: 390, height: 844 });

await session('cs@demo.vn', async p => {
  S('cs'); ok(await p.locator('nav.side [data-v="fleetcal"]').count() === 0, 'CS không có menu Lịch đội xe');
});
console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); }
await browser.close(); process.exit(errors.length ? 1 : 0);
