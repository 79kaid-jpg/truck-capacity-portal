// v3.8: Xem như khách hàng (chỉ xem) + Hướng dẫn sử dụng.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v38.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v38'; fs.mkdirSync(OUT, { recursive: true });
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
await session('admin@demo.vn', async p => {
  S('cv'); await ev(p, () => { V.view = 'users'; V.uTab = 'customers'; render(); });
  const id = await p.locator('[data-a="cvStart"]').first().getAttribute('data-id');
  await p.locator('[data-a="cvStart"]').first().click(); await p.waitForTimeout(800);
  ok(await p.locator('.cvbar').count() === 1 && await ev(p, () => S.me.role) === 'customer' && await ev(p, x => S.me.customerId === x, id), 'Xem như khách: thanh cam + giao diện khách');
  ok(await ev(p, () => S.bookings.every(b => b.customerId === S.me.customerId)), 'chỉ thấy đơn của khách đó');
  await shot(p, 'cv');
  const err = await ev(p, async () => { try { await rpc('save_targets', { p: [] }); return ''; } catch (e) { return e.message; } });
  ok(/chỉ xem/.test(err), 'máy chủ chặn thao tác khi đang xem như khách', err);
  ok(sql("select count(*) from app.audit_log where detail like '%bắt đầu Xem như khách hàng%'") === '1', 'ghi nhật ký');
  await p.click('[data-a="cvStop"]'); await p.waitForTimeout(800);
  ok(await p.locator('.cvbar').count() === 0 && await ev(p, () => S.me.role) === 'admin', 'Thoát → về Admin');
  S('cv-search'); await p.keyboard.press('Control+k'); await p.keyboard.type('van dat'); await p.waitForTimeout(500);
  ok(await p.locator('.gs-it button', { hasText: 'Xem như khách' }).count() > 0, 'Ctrl+K tìm khách có "Xem như khách"'); await p.keyboard.press('Escape');
});
await session('cs@demo.vn', async p => {
  S('guide'); await p.click('.top [data-a="guide"]'); await p.waitForSelector('#guide article h2');
  ok(/Việc hằng ngày \(CS\)/.test(await p.locator('#guide article h2').first().innerText()), 'CS mở hướng dẫn → mục Việc hằng ngày CS'); await shot(p, 'guide');
  await p.fill('#guide [data-gd="q"]', 'picking'); await p.waitForTimeout(500);
  ok(await p.locator('#guide article mark').count() > 0, 'tìm "picking" → tô sáng kết quả');
  await p.fill('#guide [data-gd="q"]', ''); await p.waitForTimeout(400);
  await p.locator('#guide nav a', { hasText: 'Vòng đời một đơn' }).click(); await p.waitForTimeout(300);
  ok(await p.locator('#guide .life > li').count() === 7 && await p.locator('#guide .life .st-delivered').count() === 1, 'Vòng đời: sơ đồ 7 bước, có nhãn Đã giao'); await shot(p, 'guide-life');
  ok(await p.locator('#guide .life').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'Vòng đời: không tràn ngang');
  { const fr = p.frameLocator('#guide iframe.qt'); await fr.locator('#t').waitFor({ timeout: 10000 });
    ok(await fr.locator('#t').textContent() === 'Yêu cầu đặt hàng' && await fr.locator('svg .node').count() === 12, 'Quy trình tự chạy: 12 ô, bước 1 = Yêu cầu đặt hàng');
    await fr.locator('#next').click(); ok((await fr.locator('#no').textContent()).startsWith('2 /'), 'Quy trình: Bước sau → bước 2');
    await fr.locator('svg .node', { hasText: 'Load hàng' }).click(); ok(await fr.locator('#t').textContent() === 'Load hàng' && (await fr.locator('#cond').textContent()).includes('danh sách cuộn'), 'Quy trình: bấm ô Load hàng → điều kiện có danh sách cuộn');
    await fr.locator('#play').click(); ok(await fr.locator('#play').getAttribute('aria-label') === 'Tạm dừng', 'Quy trình: Phát → nút thành Tạm dừng'); await fr.locator('#play').click();
    ok(await fr.locator('body').evaluate(b => b.scrollWidth <= innerWidth + 1), 'Quy trình: trang không cuộn ngang'); }
  await p.fill('#guide [data-gd="q"]', ''); await p.waitForTimeout(400);
  await p.locator('#guide nav a', { hasText: 'Xác nhận giao hàng' }).click(); await p.waitForTimeout(300);
  ok(await p.locator('#guide article img').count() > 0 && await p.locator('#guide article img').first().evaluate(i => i.complete && i.naturalWidth > 0), 'mục có ảnh minh họa tải được');
  S('resize'); const w0 = (await p.locator('#guide').boundingBox()).width; const gb = await p.locator('#guide .grip').boundingBox();
  await p.mouse.move(gb.x + 4, gb.y + 300); await p.mouse.down(); await p.mouse.move(gb.x - 400, gb.y + 300, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  const w1 = (await p.locator('#guide').boundingBox()).width; ok(w1 > w0 + 300, 'kéo cạnh trái → rộng hơn', `${w0} → ${w1}`); await shot(p, 'guide-wide');
  const f0 = await p.locator('#guide article').evaluate(e => parseFloat(getComputedStyle(e).fontSize)); await p.click('#guide [data-gd="zi"]'); await p.click('#guide [data-gd="zi"]');
  ok(await p.locator('#guide article').evaluate(e => parseFloat(getComputedStyle(e).fontSize)) === f0 + 2, 'A+ phóng chữ');
  await p.click('#guide [data-gd="max"]'); await p.waitForTimeout(200); ok((await p.locator('#guide').boundingBox()).width >= 1439, 'toàn màn hình'); await p.click('#guide [data-gd="max"]');
  const gb2 = await p.locator('#guide .grip').boundingBox(); await p.mouse.move(gb2.x + 4, gb2.y + 300); await p.mouse.down(); await p.mouse.move(1440 - 380, gb2.y + 300, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  ok(await p.locator('#guide .gsel').isVisible() && !(await p.locator('#guide nav').isVisible()), 'khung hẹp → danh mục thành ô chọn');
  await p.selectOption('#guide .gsel', 'keys'); await p.waitForTimeout(200); ok(/Phím tắt/.test(await p.locator('#guide article h2').first().innerText()), 'ô chọn mục hoạt động');
  await p.keyboard.press('Escape'); await p.click('.top [data-a="guide"]'); await p.waitForTimeout(300);
  ok(Math.abs((await p.locator('#guide').boundingBox()).width - 380) < 6, 'mở lại giữ độ rộng');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.locator('#guide').count() === 0, 'Esc đóng hướng dẫn');
  await p.locator('body').click({ position: { x: 5, y: 5 } }); await p.keyboard.press('g'); await p.keyboard.press('h'); await p.waitForTimeout(400);
  ok(await p.locator('#guide').count() === 1, 'G rồi H mở hướng dẫn');
  await p.keyboard.press('Escape'); await ev(p, () => go('fleet')).catch(() => {});
  await ev(p, () => go('dash')); await p.waitForTimeout(800); const l = p.locator('.main [data-a="guide"][data-s]');
  ok(await l.count() === 1, 'có link "Hướng dẫn màn này"'); await l.click(); await p.waitForTimeout(300);
  ok(/Thống kê/.test(await p.locator('#guide article h2').first().innerText()), 'link mở đúng mục của màn');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
