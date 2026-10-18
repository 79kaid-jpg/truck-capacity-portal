// v3.24: Trao đổi nội bộ.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v47.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v47'; fs.mkdirSync(OUT, { recursive: true });
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
const bk = q("select b.id from app.bookings b join app.customers c on c.id=b.customer_id where b.warehouse_code='JM2' and b.status in ('hold','ok') and b.day>=current_date and c.sales_user_id='00000000-0000-0000-0000-0000000000d1' order by b.day limit 1") || q("select id from app.bookings where warehouse_code='JM2' and status in ('hold','ok') and day>=current_date order by day limit 1");
const bkDay = q(`select day from app.bookings where id='${bk}'`);
await session('cs@demo.vn', async p => {
  S('nav'); ok(await p.locator('.side [data-v="talk"]').count() === 1, 'CS có mục Trao đổi ở thanh bên');
  S('open-bk'); await p.evaluate(id => openBooking(id), bk); await p.waitForTimeout(300);
  ok(await p.locator('.main .pagehead .tkbadge').count() === 1, 'chi tiết booking có nút 💬 Trao đổi');
  await p.click('.main .pagehead .tkbadge'); await p.waitForSelector('#talkPanel .tf textarea');
  ok(/Nội bộ – khách hàng không thấy/.test(await p.locator('#talkPanel').innerText()), 'nhãn nội bộ');
  ok(await p.locator('#talkPanel .tq button').count() >= 2, 'có câu hỏi mẫu');
  S('mention'); await p.fill('#talkPanel textarea', 'Xe đến kho mấy giờ @Lo'); await p.locator('#talkPanel textarea').dispatchEvent('input'); await p.waitForTimeout(150);
  ok(await p.locator('#tkAt button').count() >= 1, 'gõ @ hiện gợi ý tên');
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  ok(/@Log JM2 $/.test(await p.inputValue('#talkPanel textarea')), 'chọn @Log JM2', await p.inputValue('#talkPanel textarea'));
  await p.keyboard.type('nhé?'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  ok(await p.locator('#talkPanel .tmsg').count() === 1 && /Chờ/.test(await p.locator('#talkPanel .tkst').innerText()), 'gửi câu hỏi → trạng thái chờ trả lời');
  ok(q(`select count(*) from app.notifications where user_id='00000000-0000-0000-0000-0000000000b1' and type='Trao đổi'`) !== '0', 'Logistics nhận thông báo');
  S('pin'); await p.click('[data-a="tkPinEdit"]'); await p.fill('#tk-pin', 'Giao trước 10h'); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
  ok(/Giao trước 10h/.test(await p.locator('#talkPanel .tkpin').innerText()), 'ghim ghi chú');
  S('quick'); await p.locator('#talkPanel .tq button').first().click(); await p.waitForTimeout(1200);
  ok(await p.locator('#talkPanel .tmsg').count() === 2, 'câu hỏi mẫu bấm là gửi');
  S('edit'); await p.locator('#talkPanel .tmsg.me').last().hover(); await p.locator('#talkPanel .tmsg.me').last().locator('[data-a="tkEdit"]').click();
  await p.fill('#tk-edit', 'Sửa lại: xe đến mấy giờ?'); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
  ok(await p.inputValue('#talkPanel textarea') === '', 'ô soạn trống sau khi gửi'); ok(/đã sửa/.test(await p.locator('#talkPanel .tmsg.me').last().innerText()), 'sửa tin trong 5 phút');
  await shot(p, 'cs-thread');
  S('bot-tools'); const tr = await p.evaluate(async id => { if (typeof TOOLS === 'undefined') return 'skip'; const r = await TOOLS.talk_read.run({ booking_id: id }); return r.tin && r.tin.length >= 2 && sysPrompt().includes('TRAO ĐỔI NỘI BỘ') ? 'ok' : JSON.stringify(r).slice(0, 200); }, bk);
  ok(tr === 'ok' || tr === 'skip', 'trợ lý đọc được trao đổi để tóm tắt', tr);
  S('chat-hide'); if (await p.locator('#chatFab').count()) { await p.click('[data-a="tkClose"]'); await p.click('#chatFab'); await p.waitForTimeout(200); ok(await p.locator('#chatPanel').count() === 1, 'mở trợ lý');
    await p.mouse.click(300, 400); await p.waitForTimeout(200); ok(await p.locator('#chatPanel').count() === 0 && await p.locator('#chatFab').count() === 1, 'bấm ra ngoài → trợ lý tự thu gọn'); }
});
await session('log@demo.vn', async p => {
  S('inbox'); ok(await p.locator('.side [data-v="talk"] .dot').count() === 1, 'Logistics thấy chấm đỏ ở Trao đổi');
  await p.click('.side [data-v="talk"]'); await p.waitForTimeout(300);
  ok(await p.locator('.tkrow').count() >= 1 && /Chờ bạn trả lời/.test(await p.locator('.main').innerText()), 'tab Cần tôi trả lời có câu hỏi');
  await shot(p, 'log-inbox');
  await p.locator('.tkrow').first().click(); await p.waitForSelector('#talkPanel .tmsg');
  ok(await p.locator('#talkPanel .tq button.r').count() >= 1, 'Logistics có câu trả lời nhanh');
  S('react'); await p.locator('#talkPanel .tmsg').first().hover(); await p.locator('#talkPanel .tmsg').first().locator('.tmact [data-e="✅"]').click(); await p.waitForTimeout(1000);
  ok(/Đã trả lời/.test(await p.locator('#talkPanel .tkst').innerText()), 'người được hỏi thả ✅ → Đã trả lời');
  await p.fill('#talkPanel textarea', 'Xe DK-01 đến 14h, đơn ' + bk); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  ok(await p.locator('#talkPanel .tmsg.me .tmb a').count() >= 1, 'mã đơn / xe tự thành link');
  S('seen'); ok(/Đã xem|Đã gửi/.test(await p.locator('#talkPanel .tseen').innerText()), 'dấu đã gửi / đã xem');
  S('done'); await p.click('[data-a="tkDone"][data-v="done"]'); await p.waitForTimeout(1000); ok(/Đã xong/.test(await p.locator('#talkPanel .tkst').innerText()), 'đánh dấu Đã xong');
  S('notif'); await p.evaluate(() => { V.view = 'notifs'; A.tkClose(); });
  S('truck'); await p.evaluate(([d]) => { V.wh = 'JM2'; V.whAll = false; V.day = d; V.view = 'day'; render(); }, [bkDay]); await p.waitForTimeout(400);
  ok(await p.locator('.main .dayhead .tkbadge').count() === 1, 'màn đội xe có Trao đổi ngày');
  const hasTruck = await p.locator('.main .tcard').count(); if (hasTruck) { await p.locator('.main .tcard .tc-acts [data-a="truck"]').first().click(); await p.waitForTimeout(300); await p.locator('.modal .tkbadge').first().click(); await p.waitForSelector('#talkPanel textarea'); ok(/^Xe /.test(await p.locator('#talkPanel .th b.t').innerText()), 'trao đổi theo xe'); }
  await shot(p, 'log-day');
});
await session('kh@demo.vn', async p => {
  S('kh'); ok(await p.locator('.side [data-v="talk"]').count() === 0 && await p.evaluate(() => (S.talk || []).length) === 0, 'khách không thấy Trao đổi');
  ok(await p.evaluate(async () => { try { await rpc('talk_get', { p_kind: 'bk', p_ref: 'x' }); return false; } catch (e) { return /nội bộ/.test(e.message); } }), 'khách gọi API bị chặn');
});
await session('admin@demo.vn', async p => {
  S('login-as-reset'); await p.evaluate(() => { dzInit(); V.dz.tab = 'sales'; go('dash'); }); await p.waitForTimeout(1500);
  const s2 = q("select user_id from app.profiles where email='s2@demo.vn'");
  await p.evaluate(sid => { V.dz.sp = sid; CHAT.msgs.push({ role: 'user', content: 'bí mật admin' }); render(); }, s2); await p.waitForTimeout(800);
  const s1 = q("select user_id from app.profiles where email='s1@demo.vn'");
  await p.evaluate(id => A.loginAs({ id }), s1); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => V.dz === null && CHAT.msgs.length === 0 && TK.d === null), 'Login as → xóa Bảng thống kê / trợ lý / Trao đổi của Admin');
  await p.evaluate(() => { dzInit(); V.dz.tab = 'sales'; go('dash'); }); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => !V.dz.sp && V.dz.D && V.dz.D.rows.every(r => { const c = cust(r.cid); return !c || c.salesId === S.me.id; })), 'Login as Sales → Bảng thống kê chỉ có khách của Sales đó');
  await p.evaluate(() => A.impStop()); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => V.dz === null && S.me.role === 'admin'), 'Thoát Login as → tải lại theo Admin');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
