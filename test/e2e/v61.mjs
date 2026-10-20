// v3.48: UI/UX theo vai trò.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v61.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v61'; fs.mkdirSync(OUT, { recursive: true });
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
  await page.route('**/api/chat', async r => { if (r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }); const b = JSON.parse(r.request().postData()); const ms = b.messages; const last = ms[ms.length - 1].content; const sys = ms[0].content;
    let out; if (/^KẾT QUẢ CÔNG CỤ (\w+): /.test(last)) { const [, t] = last.match(/^KẾT QUẢ CÔNG CỤ (\w+): /); globalThis.__toolRes = last; out = { answer: 'Đã xong công cụ **' + t + '**. [Mở ngày](#day:' + (ms[0].content.match(/"hom_nay":"([^"]+)"/) || [])[1] + ':JM2)' }; }
    else out = globalThis.__plan ? globalThis.__plan(last, sys) : { answer: 'ok' };
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: JSON.stringify(out), left: 42, ...(globalThis.__eng || {}) }) }); });
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
const phone = p => p.setViewportSize({ width: 390, height: 844 });
await session('log@demo.vn', async p => {
  S('desk');
  const lb = await p.evaluate(() => [...document.querySelectorAll('nav.side .lb61')].map(x => x.textContent));
  ok(lb.includes('Chờ xếp xe') && lb.includes('Khai báo xe') && lb.includes('Cấu hình') && !lb.some(x => /Approval|Trucks|Configuration|Setting/.test(x)), 'menu máy tính có chữ, tiếng Việt', JSON.stringify(lb));
  await p.evaluate(() => go('approvals')); await p.waitForTimeout(500);
  ok(/Đơn chờ xếp xe/.test(await p.locator('.main .pagehead h2').innerText()), 'tiêu đề Đơn chờ xếp xe');
  ok(await p.locator('.main tbody tr .act61 [data-a="sug61"]').count() > 0, 'nút Gợi ý xe trên từng dòng');
  const id = await p.locator('.main tbody tr .act61 [data-a="sug61"]').first().getAttribute('data-id');
  await p.locator('.main tbody tr .act61 [data-a="sug61"]').first().click(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => V.view === 'day'), 'Gợi ý xe → mở ngày với gợi ý', id);
  S('phone'); await phone(p); await p.evaluate(() => go('approvals')); await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ side: getComputedStyle(document.querySelector('nav.side')).display, n: document.querySelectorAll('.bnav61 > button').length,
    labels: [...document.querySelectorAll('.bnav61 .lb61')].map(x => x.textContent), card: getComputedStyle(document.querySelector('.main thead')).display, sw: document.documentElement.scrollWidth, w: innerWidth,
    hmin: Math.min(...[...document.querySelectorAll('.bnav61 > button')].map(b => b.getBoundingClientRect().height)) }));
  ok(r.side === 'none' && r.n === 5 && r.labels[0] === 'Chờ xếp xe' && r.labels[4] === 'Thêm', 'điện thoại: thanh dưới 4 mục theo vai trò + Thêm', JSON.stringify(r.labels));
  ok(r.card === 'none' && r.sw <= r.w, 'bảng thành thẻ, không cuộn ngang', JSON.stringify([r.sw, r.w]));
  ok(r.hmin >= 44, 'nút thanh dưới ≥ 44px', r.hmin);
  await shot(p, 'log-phone-approvals');
  await p.click('.bnav61 [data-a="more61"]'); await p.waitForTimeout(300);
  const more = await p.evaluate(() => [...document.querySelectorAll('.more61 button span:not(.dot)')].map(x => x.textContent));
  ok(more.includes('Cấu hình') && await p.locator('.more61').isVisible(), 'Thêm → các mục còn lại', JSON.stringify(more));
  await p.click('.more61 [data-v="fleet"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => V.view === 'fleet'), 'chọn mục trong Thêm → chuyển màn');
});
await session('cs@demo.vn', async p => {
  S('cs-bookings'); await phone(p); await p.evaluate(() => go('bookings')); await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({ f: document.querySelector('.main .filters').hidden, b: !!document.querySelector('.flt61'), tabs: getComputedStyle(document.querySelector('.main .tabs')).flexWrap, sw: document.documentElement.scrollWidth, w: innerWidth }));
  ok(r.f && r.b && r.tabs === 'nowrap' && r.sw <= r.w, 'Danh sách booking điện thoại: bộ lọc thu gọn, tab một hàng, không cuộn ngang', JSON.stringify(r));
  await p.click('.flt61'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('.main .filters').hidden), 'bấm Bộ lọc → mở');
  await shot(p, 'cs-phone-bookings');
  S('cs-req'); await p.setViewportSize({ width: 1440, height: 1000 }); await p.evaluate(() => go('calendar')); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const l = document.querySelector('.rqbtn[data-a="rqList"] .t'); return !l || l.textContent === 'Danh sách yêu cầu'; }), 'nút danh sách yêu cầu đặt tên rõ');
});
await session('kh@demo.vn', async p => {
  S('kh'); await phone(p); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('.bnav61 .lb61')].map(x => x.textContent).join('|') === 'Lịch đặt xe|Đơn của tôi|Thông báo'), 'khách: Lịch / Đơn của tôi / Thông báo');
  await p.click('.bnav61 [data-v="myorders"]'); await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({ h: document.querySelector('.main .pagehead h2').textContent, n: document.querySelectorAll('.main tbody tr[data-id]').length, sw: document.documentElement.scrollWidth, w: innerWidth }));
  ok(r.h === 'Đơn của tôi' && r.n > 0 && r.sw <= r.w, 'Đơn của tôi: danh sách đơn của khách', JSON.stringify(r));
  await shot(p, 'kh-phone-myorders');
});
// trang chủ theo vai trò (bật cờ vì test tự động mặc định không đổi trang chủ)
await (async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await ctx.newPage();
  await page.addInitScript(() => { window.__home61 = true; });
  await page.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: r.request().url().includes('xlsx') ? '' : mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('http://127.0.0.1:8787/'); await page.fill('#lg-e', 's1@demo.vn'); await page.fill('#lg-p', 'Test@1234'); await page.click('#login button'); await page.waitForTimeout(1500);
  ok(await page.evaluate(() => V.view) === 'dash', 'Sales đăng nhập → vào Thống kê', await page.evaluate(() => V.view)); await ctx.close(); })();
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
