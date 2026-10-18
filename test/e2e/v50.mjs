// v3.31: Việc của tôi, Chế độ kho, link tài xế, copy tin, tổng quan khách.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v50.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v50'; fs.mkdirSync(OUT, { recursive: true });
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
import { execSync } from 'child_process';
const q = s => execSync(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
q("update app.settings set value='false' where key='requirePicking'");
const row = q("select a.truck_code||'|'||b.day||'|'||b.id from app.allocations a join app.bookings b on b.id=a.booking_id where b.status='ok' and b.day>=current_date and b.warehouse_code='JM2' order by b.day limit 1");
const [code, day, bk] = row.split('|');
// một yêu cầu đặt hàng và một câu hỏi chờ CS
q("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',false); select public.req_create(jsonb_build_object('wh','JM2','deliver',current_date+3,'body','Khách cần 10 MT')) is not null");
await session('cs@demo.vn', async p => {
  S('mywork'); ok(await p.locator('.side [data-v="mywork"]').count() === 1, 'CS có mục Việc của tôi');
  await p.click('.side [data-v="mywork"]'); await p.waitForTimeout(300);
  const t = await p.locator('.main').innerText(); ok(/VIỆC CỦA TÔI/.test(t) && /Yêu cầu ·/.test(t), 'Việc của tôi có yêu cầu đặt hàng', t.slice(0, 300));
  await shot(p, 'mywork');
  await p.locator('.mwrow', { hasText: 'Yêu cầu ·' }).first().click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => V.modal && V.modal.type === 'rqList'), 'bấm vào việc → mở đúng chỗ xử lý');
});
await session('log@demo.vn', async p => {
  S('yard'); await p.click('.side [data-v="yard"]'); await p.waitForTimeout(300);
  await p.evaluate(d => { A.ydDay({ v: d }); }, day); await p.waitForTimeout(1200);
  ok(await p.locator('.ycard').count() >= 1, 'Chế độ kho: thẻ xe có hàng', await p.locator('.main').innerText().then(x => x.slice(0, 200)));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200); await shot(p, 'yard-mobile');
  const wide = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); ok(wide, 'Chế độ kho trên điện thoại không kéo ngang');
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.locator(`.ycard [data-a="ydGo"][data-c="${code}"][data-k="load"]`).click(); await p.waitForTimeout(300);
  ok(await p.locator('.modal .trk input[data-trk]').count() >= 1, 'Bốc xong → hộp xe với danh sách kiểm tra');
  await p.click('.modal .trk [data-a="trkRun"]'); await p.waitForTimeout(2500);
  S('link'); await p.click(`.modal [data-a="drvLink"][data-c="${code}"]`); await p.waitForTimeout(800);
  const url = await p.inputValue('#drv-url'); ok(/driver\.html#[0-9a-f]{40,}/.test(url), 'tạo link tài xế', url);
  await shot(p, 'drv-link');
  globalThis.__drv = url;
});
{ // tài xế: không đăng nhập
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  p.on('pageerror', e => errors.push('[driver] ' + e.message));
  S('driver'); await p.goto(globalThis.__drv.replace(/^https?:\/\/[^/]+/, 'http://127.0.0.1:8787')); await p.waitForTimeout(1200);
  ok(/Xe /.test(await p.locator('#h').innerText()) && await p.locator('.card').count() >= 1, 'tài xế mở link thấy các điểm giao', await p.locator('main').innerText().then(x => x.slice(0, 200)));
  await p.click('button[data-go="transit"]'); await p.waitForTimeout(1200);
  ok(/bắt đầu chạy/i.test(await p.locator('main').innerText()), 'Bắt đầu chạy → đơn Đang giao');
  await p.locator(`button[data-open="${bk}"][data-k="delivered"]`).click(); await p.waitForTimeout(200);
  const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  await p.setInputFiles('#ph', { name: 'bien-nhan.jpg', mimeType: 'image/jpeg', buffer: jpg }); await p.waitForTimeout(800);
  await p.click('button[data-do="1"]'); await p.waitForTimeout(1500);
  ok(q(`select status from app.bookings where id='${bk}'`) === 'delivered', 'tài xế xác nhận Đã giao');
  await p.screenshot({ path: `${OUT}/driver.png`, fullPage: true });
  await ctx.close();
}
await session('cs@demo.vn', async p => {
  S('share'); await p.context().grantPermissions(['clipboard-read', 'clipboard-write']); await p.evaluate(id => openBooking(id), bk); await p.waitForTimeout(300);
  await p.click('.main .pagehead [data-a="bkShare"]'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok(/đã giao xong/.test(clip) && /Ngày bốc/.test(clip), 'Copy tin cho khách: đúng trạng thái', clip.slice(0, 200));
  S('pod'); await p.click('.main .pagehead [data-a="bkPod"]'); await p.waitForTimeout(800); ok(await p.locator('.modal img.podimg').count() >= 1 || await p.locator('.modal').innerText().then(t => /ẢNH GIAO HÀNG/.test(t)), 'xem ảnh giao hàng');
  await p.evaluate(() => { V.modal = null; render(); });
  S('overview'); await p.click('.main .pagehead [data-a="custOv"]'); await p.waitForTimeout(1000);
  ok(/6 THÁNG GẦN NHẤT/.test(await p.locator('.modal').innerText()), 'Tổng quan khách');
  await shot(p, 'overview');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
