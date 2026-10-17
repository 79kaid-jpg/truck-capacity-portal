// v3.19: trợ lý (chatbot) – AI giả lập, công cụ chạy thật.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v46.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v46'; fs.mkdirSync(OUT, { recursive: true });
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
  await page.route('**/api/chat', async r => { const b = JSON.parse(r.request().postData()); const ms = b.messages; const last = ms[ms.length - 1].content; const sys = ms[0].content;
    let out; if (/^KẾT QUẢ CÔNG CỤ (\w+): /.test(last)) { const [, t] = last.match(/^KẾT QUẢ CÔNG CỤ (\w+): /); globalThis.__toolRes = last; out = { answer: 'Đã xong công cụ **' + t + '**. [Mở ngày](#day:' + (ms[0].content.match(/"hom_nay":"([^"]+)"/) || [])[1] + ':JM2)' }; }
    else out = globalThis.__plan ? globalThis.__plan(last, sys) : { answer: 'ok' };
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: JSON.stringify(out), left: 42 }) }); });
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
import { execSync as ex2 } from 'child_process';
const q = s => ex2(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
const ask = async (p, text) => { await p.fill('#chatPanel textarea', text); await p.keyboard.press('Enter'); await p.waitForFunction(() => !CHAT.busy, null, { timeout: 15000 }); await p.waitForTimeout(300); };
const hold = q("select b.id from app.bookings b where b.status='hold' and b.day>=current_date and b.warehouse_code='JM2' and exists(select 1 from app.daily_fleet f where f.warehouse_code=b.warehouse_code and f.day=b.day) order by b.day limit 1");
await session('log@demo.vn', async p => {
  S('fab'); ok(await p.locator('#chatFab').count() === 1, 'Logistics thấy nút trợ lý');
  await p.click('#chatFab'); ok(await p.locator('#chatPanel .cs button').count() >= 3, 'mở khung chat + câu gợi ý');
  ok(await p.evaluate(() => sysPrompt().includes('suggest_trucks') && sysPrompt().includes('find_trucks')), 'Logistics có công cụ tìm xe, gợi ý xe');
  S('suggest'); globalThis.__plan = () => ({ tool: 'suggest_trucks', args: { booking_id: hold } });
  await ask(p, 'Gợi ý xe cho ' + hold);
  ok(await p.evaluate(() => V.view) === 'day' && await p.locator('.tcard.sugg').count() >= 1, 'gợi ý xe → mở màn đội xe, viền chạy quanh xe');
  ok(/"goi_y":\[/.test(globalThis.__toolRes || '') && /ly_do/.test(globalThis.__toolRes), 'kết quả có giải thích lý do chọn xe');
  ok(await p.locator('#chatPanel .cstep').count() >= 1 && /Đã xong công cụ/.test(await p.locator('#chatPanel .cmsg.a').last().innerText()), 'hiện bước + câu trả lời');
  ok(/Còn 42 lượt/.test(await p.locator('#chatPanel .cl').innerText()), 'hiện số lượt còn lại');
  await p.screenshot({ path: `${OUT}/log-suggest.png` });
  S('trucks'); globalThis.__plan = () => ({ tool: 'find_trucks', args: { date: 'ngày mai', wh: 'JM2', min_free: 5 } }); await ask(p, 'xe nào mai còn trống trên 5 MT');
  ok(/"con_trong"/.test(globalThis.__toolRes) || /\[\]/.test(globalThis.__toolRes), 'tìm xe theo chỗ trống');
  S('link'); await p.locator('#chatPanel .cmsg.a a').last().click(); await p.waitForTimeout(400); ok(await p.evaluate(() => V.view) === 'day', 'link trong câu trả lời mở đúng màn');
  S('find'); globalThis.__plan = () => ({ tool: 'find_bookings', args: { status: 'chờ xếp xe', sort: 'wait' } }); await ask(p, 'đơn chờ lâu nhất');
  ok(/"tong":\d+/.test(globalThis.__toolRes) && /cho_phut/.test(globalThis.__toolRes), 'tìm đơn chờ xếp xe, sắp theo thời gian chờ');
});
await session('cs@demo.vn', async p => {
  S('cs-fill'); const c = q("select name from app.customers where code='KH0102'");
  globalThis.__plan = () => ({ tool: 'fill_request', args: { customer: 'KH0102', wh: 'JM2', date: 'ngày mai', tons: 50, body: 'Anh Ánh 20MT HC 0.5 xanh dương, 30MT Titan' } });
  await p.click('#chatFab'); await ask(p, 'ghi yêu cầu cho KH0102 50 MT mai JM2');
  ok(await p.evaluate(() => V.modal && V.modal.type === 'rqNew' && V.modal.f.cid && /Titan/.test(V.modal.f.body) && V.modal.f.tons === '50'), 'điền sẵn form yêu cầu đặt hàng (chưa gửi)');
  ok(q("select count(*) from app.order_requests") === '0', 'bot không tự gửi');
  await p.evaluate(() => { V.modal = null; render(); });
  S('cs-order'); globalThis.__plan = () => ({ tool: 'fill_order', args: { customer: 'KH0102', wh: 'JM2', date: 'ngày mai', tons: 12 } }); await ask(p, 'đặt hàng 12 MT KH0102 mai');
  ok(await p.evaluate(() => V.modal && V.modal.type === 'grid' && V.modal.rows[0].cid && V.modal.rows[0].tons === '12'), 'CS: mở lưới đặt hàng điền sẵn');
  await p.evaluate(() => { V.modal = null; render(); });
  ok(await p.evaluate(() => !sysPrompt().includes('suggest_trucks')), 'CS (không có quyền xếp xe) không có công cụ gợi ý xe');
});
await session('kh@demo.vn', async p => { S('kh-off'); ok(await p.locator('#chatFab').count() === 0, 'khách chưa được bật: không có trợ lý'); });
q("update app.customers set chat_enabled=true where id=(select customer_id from app.profiles where email='kh@demo.vn')");
await session('kh@demo.vn', async p => {
  S('kh-on'); ok(await p.locator('#chatFab').count() === 1, 'Admin bật cho khách → khách có trợ lý');
  ok(await p.evaluate(() => !sysPrompt().includes('find_trucks') && sysPrompt().includes('KHÁCH HÀNG')), 'khách không có công cụ xe, prompt giới hạn');
  globalThis.__plan = () => ({ tool: 'capacity', args: { date: 'ngày mai' } }); await p.click('#chatFab'); await ask(p, 'mai còn chỗ không');
  ok(/con_dat_duoc_MT/.test(globalThis.__toolRes) && !/nang_luc/.test(globalThis.__toolRes), 'khách xem MT còn đặt được, không lộ năng lực nội bộ');
  globalThis.__plan = () => ({ tool: 'find_trucks', args: { date: 'ngày mai' } }); await ask(p, 'xe nào');
  ok(!/"con_trong"/.test(globalThis.__toolRes || ''), 'khách gọi công cụ xe → bị chặn');
  await p.screenshot({ path: `${OUT}/kh.png` });
});
await session('admin@demo.vn', async p => {
  S('cfg'); await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(800);
  ok(await p.locator('.chatcfg').count() === 1 && /Hôm nay/.test(await p.locator('#chatStat').innerText()), 'Admin cấu hình trợ lý + xem mức dùng');
  ok(await p.locator('[data-chatlim]').count() === 5 && await p.inputValue('#cl-customer') === '30', 'hạn mức riêng từng vai trò (khách mặc định 30)');
  await p.fill('#cl-sales', '80'); await p.locator('#cl-sales').dispatchEvent('change'); await p.waitForTimeout(1000);
  ok(q("select value->>'sales' from app.settings where key='chatDailyRole'") === '80', 'lưu hạn mức Sales');
  ok(await p.locator('#cf-chatDailyTotal').count() === 1 && /chặn tổng/.test(await p.locator('#chatStat').innerText()), 'chặn tổng toàn hệ thống + mức dùng theo vai trò');
  await p.screenshot({ path: `${OUT}/cfg.png` });
  await p.evaluate(() => { V.view = 'users'; V.uTab = 'customers'; render(); }); await p.waitForTimeout(300);
  ok(await p.locator('[data-a="custChat"]').count() >= 5, 'nút bật trợ lý cho từng khách');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
