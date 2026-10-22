// v3.56: giao diện điện thoại thống nhất (thanh trên, nút, danh sách dòng).
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v68.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v68'; fs.mkdirSync(OUT, { recursive: true });
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


const PH = { width: 390, height: 844 };
const audit = p => p.evaluate(() => {
  const vis = e => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const h1 = document.querySelector('.top .ttl68 h1');
  const emo = [...document.querySelectorAll('.main button, .main a, .top button, .act68 button')].filter(vis).map(b => b.textContent).filter(t => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t));
  const small = [...document.querySelectorAll('.top button, .act68 button, .bnav61 button, .row68 .btn')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).map(b => b.getAttribute('aria-label') || b.textContent.trim());
  return { title: h1 ? h1.textContent : '', oneLine: h1 ? h1.getBoundingClientRect().height < 26 : false, sw: document.documentElement.scrollWidth, w: innerWidth,
    fab: !!document.getElementById('chatFab') && getComputedStyle(document.getElementById('chatFab')).display !== 'none', emo, small, h2: [...document.querySelectorAll('.main .pagehead h2')].some(vis) };
});
await session('cs@demo.vn', async p => {
  for (const [v, t] of [['calendar', 'Lịch'], ['bookings', 'Booking'], ['mywork', 'Việc của tôi'], ['notifs', 'Thông báo']]) {
    S(v); await p.evaluate(v => go(v), v); await p.waitForTimeout(1200);
    const a = await audit(p);
    ok(a.title === t && a.oneLine, `${v}: tiêu đề "${t}" 1 dòng trên thanh trên`, JSON.stringify(a.title));
    ok(a.sw <= a.w && !a.fab && !a.h2, `${v}: không cuộn ngang, không nút chat nổi, không tiêu đề lặp`, JSON.stringify(a));
    ok(a.emo.length === 0 && a.small.length === 0, `${v}: không emoji, nút ≥ 44px`, JSON.stringify([a.emo, a.small]));
  }
  S('cal'); await p.evaluate(() => go('calendar')); await p.waitForTimeout(800);
  ok(await p.locator('.act68 [data-a="newBk"]').isVisible() && !(await p.locator('.calhead [data-a="newBk"]').isVisible()), 'lịch: "+ Đặt hàng" cố định ở đáy');
  const cov = await p.evaluate(() => { const b = document.querySelector('.act68').getBoundingClientRect(); scrollTo(0, document.body.scrollHeight); const last = [...document.querySelectorAll('.cal .c36')].pop(); const r = last.getBoundingClientRect(); return r.bottom <= b.top + 1; });
  ok(cov, 'cuộn hết: ô cuối không bị thanh đáy che');
  await shot(p, 'cs-cal');
  S('assist'); await p.click('.ast68'); await p.waitForSelector('#chatPanel'); ok(true, 'biểu tượng Trợ lý mở khung chat');
  await p.evaluate(() => { const x = document.querySelector('#chatPanel [data-a="chatClose"], #chatPanel .x, #chatPanel button[aria-label*="Đóng"]'); if (x) x.click(); else document.body.classList.remove('chat-open'); });
  S('list'); await p.evaluate(() => go('bookings')); await p.waitForTimeout(1500);
  const n = await p.locator('.list68 .row68').count();
  ok(n > 0 && !(await p.locator('.card61.has68').isVisible()), 'danh sách booking dạng dòng', n);
  const r1 = await p.locator('.list68 .row68').first().innerText();
  ok(/MT/.test(r1) && /BK-/.test(r1), 'dòng: tên khách, số tấn, mã', r1);
  await shot(p, 'cs-list');
  await p.locator('.list68 .row68').first().click(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => V.view === 'booking'), 'bấm dòng → mở booking');
  S('bk');
  const a = await audit(p);
  ok(/^BK-/.test(a.title) && await p.locator('.ttl68 [data-a="back"]').isVisible() && !(await p.locator('.top .gsbtn').isVisible()), 'chi tiết: mã đơn + nút quay lại, màn con ẩn tìm kiếm', a.title);
  const acts = await p.evaluate(() => [...document.querySelectorAll('.act68 button')].map(b => b.textContent.trim()));
  ok(acts.length === 2 && acts[0] === 'Sửa' && /Xác nhận giao hàng/.test(acts[1]), 'thanh đáy: Sửa + Xác nhận giao hàng', JSON.stringify(acts));
  await p.click('.m68btn'); await p.waitForTimeout(300);
  const items = await p.evaluate(() => [...document.querySelectorAll('.menu68 > *')].map(b => b.textContent.trim()));
  ok(items.some(x => /Copy tin cho khách/.test(x)) && items.some(x => /^Tổng quan khách/.test(x)) && items.some(x => /Trao đổi/.test(x)), 'menu ⋯: các thao tác còn lại, không emoji', JSON.stringify(items));
  await shot(p, 'cs-bk-menu');
  await p.mouse.click(200, 500); await p.waitForTimeout(300);
  ok(await p.locator('.menu68').count() === 0, 'bấm ra ngoài đóng menu');
  await p.click('.ttl68 [data-a="back"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => V.view === 'bookings'), 'quay lại danh sách');
  S('modal'); await p.evaluate(() => { V.bk = S.bookings.find(x => x.status === 'hold').id; go('booking'); }); await p.waitForTimeout(500);
  await p.click('.act68 [data-a="editBk"]'); await p.waitForTimeout(500);
  ok(await p.locator('.act68').count() === 0, 'mở form sửa → ẩn thanh đáy');
}, PH);
await session('log@demo.vn', async p => {
  S('day'); await p.evaluate(() => A.openDay({ d: TODAY })); await p.waitForTimeout(800);
  const a = await audit(p);
  ok(a.title.includes(' · JM2') && a.oneLine && a.sw <= a.w, 'chi tiết ngày: "T? dd/mm · JM2" 1 dòng', a.title);
  const d0 = await p.evaluate(() => V.day); await p.click('.ttl68 [data-a="dayNav"][data-d="1"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(d0 => V.day > d0, d0), 'nút › trên thanh trên sang ngày sau');
  await shot(p, 'log-day');
  S('appr'); await p.evaluate(() => go('approvals')); await p.waitForTimeout(800);
  ok(await p.locator('.list68 .row68 [data-a="sug61"]').count() > 0, 'chờ xếp xe: dòng có nút Gợi ý xe');
  await shot(p, 'log-appr');
}, PH);
await session('cs@demo.vn', async p => {
  S('desk'); ok(await p.locator('.ttl68').count() === 0 || !(await p.locator('.ttl68').isVisible()), 'máy tính: giữ nguyên thanh trên');
  ok(await p.locator('#chatFab').isVisible() && await p.locator('.list68').count() === 0, 'máy tính: còn nút chat nổi, bảng giữ nguyên');
});
console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); }
await browser.close(); process.exit(errors.length ? 1 : 0);
