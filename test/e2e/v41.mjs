// v3.13: yêu cầu đặt hàng.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v41.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v41'; fs.mkdirSync(OUT, { recursive: true });
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
const D = await (async () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })();
await session('kh@demo.vn', async p => {
  S('kh-new'); ok(await p.locator('.cal36bar [data-a="rqNew"]').count() === 1, 'khách có nút + Yêu cầu đặt hàng');
  await p.click('.cal36bar [data-a="rqNew"]'); await p.waitForSelector('#rq-body');
  await p.selectOption('#rq-wh', 'JM2'); await p.fill('#rq-day', D); await p.locator('#rq-day').dispatchEvent('change');
  ok(/còn nhận được|chưa mở lịch|không bốc/.test(await p.locator('#rq-cap').innerText()), 'hiện năng lực kho ngày chọn');
  await p.click('[data-a="rqSend"]'); await p.waitForTimeout(300); ok(/nội dung/i.test(await p.locator('.modal .err').innerText()), 'bắt buộc nội dung');
  await p.fill('#rq-body', 'Anh Ánh đặt 20MT HC 0.5 Xanh dương, 30MT Titan'); await p.fill('#rq-t', '50');
  await shot(p, 'kh-form'); await p.click('[data-a="rqSend"]'); await p.waitForTimeout(1200);
  ok(/Đã gửi yêu cầu/.test(await toastTxt(p)), 'gửi thành công');
  ok(await p.locator('.rqchip').count() >= 1, 'ô ngày có biểu tượng 💬');
  await p.locator('.rqchip').first().click(); await p.waitForTimeout(300);
  ok(/Chờ CS xử lý/.test(await p.locator('.modal').innerText()) && /Khách/.test(await p.locator('.modal').innerText()), 'khách xem yêu cầu của mình');
  ok(await p.locator('.modal [data-a="rqMake"]').count() === 0 && await p.locator('.modal [data-k="cancelled"]').count() === 1, 'khách chỉ hủy được, không xử lý');
  await shot(p, 'kh-list');
});
await session('s1@demo.vn', async p => {
  S('sales-new'); await p.click('.cal36bar [data-a="rqNew"]'); await p.waitForSelector('#rq-cust');
  const opt = await p.evaluate(() => document.querySelector('#rq-cl option').value); await p.fill('#rq-cust', opt); await p.locator('#rq-cust').dispatchEvent('input');
  await p.fill('#rq-day', D); await p.locator('#rq-day').dispatchEvent('input'); await p.fill('#rq-body', 'Chị Lan 15MT Clean Colorbond 0.42 Đỏ');
  await p.click('[data-a="rqSend"]'); await p.waitForTimeout(1200); ok(/Đã gửi yêu cầu/.test(await toastTxt(p)), 'Sales gửi yêu cầu');
  ok(await p.evaluate(() => rqCusts().length > 0 && rqCusts().every(c => c.salesId === V.me)), 'Sales chỉ chọn khách mình phụ trách');
});
await session('cs@demo.vn', async p => {
  S('cs'); const n = await p.locator('.cal36bar [data-a="rqList"] b').innerText(); ok(+n >= 2, 'CS thấy số yêu cầu chờ', n);
  await p.click('.cal36bar [data-a="rqList"]'); await p.waitForTimeout(300); await shot(p, 'cs-list');
  // Không nhận: bắt buộc lý do
  await p.locator('.modal [data-a="rqAct"][data-k="declined"]').last().click(); await p.click('.modal [data-a="rqDo"]'); await p.waitForTimeout(200);
  ok(/lý do/i.test(await p.locator('.modal .err').innerText()), 'Không nhận phải có lý do');
  await p.fill('[data-rqa="reply"]', 'Ngày này kho đầy, đề nghị dời 1 ngày'); await p.click('.modal [data-a="rqDo"]'); await p.waitForTimeout(1200);
  ok(/không nhận/i.test(await toastTxt(p)), 'đã báo không nhận');
  // Tạo đơn từ yêu cầu → lưới điền sẵn
  await p.locator('.modal [data-a="rqMake"]').first().click(); await p.waitForTimeout(500);
  ok(await p.locator('.g30req').count() === 1, 'lưới đặt hàng hiện nội dung yêu cầu');
  ok(await p.evaluate(() => !!V.modal.rows[0].cid && V.modal.rows[0].tons === '50'), 'dòng 1 điền sẵn khách + MT');
  await shot(p, 'cs-grid');
  await p.evaluate(() => { V.modal = null; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => V.modal && V.modal.type === 'rqList' && V.modal.act && V.modal.act.k === 'done'), 'đóng lưới → hỏi đánh dấu đã tạo đơn');
  await p.fill('[data-rqa="bk"]', 'BK-TEST-1'); await p.click('.modal [data-a="rqDo"]'); await p.waitForTimeout(1200);
  ok(/Đã đánh dấu tạo đơn/.test(await toastTxt(p)), 'đánh dấu đã tạo đơn');
  ok(await p.evaluate(() => rqOpen().length) === 0, 'hết yêu cầu chờ');
});
await session('kh@demo.vn', async p => {
  S('kh-notif'); const t = await p.evaluate(() => S.notifs.filter(n => n.link && n.link.req).map(n => n.text).join('|')); ok(/Đã nhận yêu cầu|Không nhận/.test(t), 'khách nhận thông báo kết quả', t.slice(0, 120));
  const id = await p.evaluate(() => S.notifs.find(n => n.link && n.link.req).id); await p.evaluate(x => A.openNotif({ id: x }), id); await p.waitForTimeout(600);
  ok(await p.evaluate(() => V.modal && V.modal.type === 'rqList'), 'bấm thông báo mở danh sách yêu cầu');
  ok(/BK-TEST-1|Ngày này kho đầy/.test(await p.locator('.modal').innerText()), 'thấy mã booking / lý do');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
