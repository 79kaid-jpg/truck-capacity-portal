// v3.47: chi tiết ngày trên điện thoại.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v60.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v60'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, acceptDownloads: true });
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
await session('log@demo.vn', async p => {
  S('open');
  const d = await p.evaluate(() => { const ds = [...new Set(S.bookings.filter(b => b.wh === 'JM2' && b.date >= TODAY && b.status === 'hold').map(b => b.date))].sort(); return ds[0] || addDays(TODAY, 1); });
  await p.evaluate(dd => { V.wh = 'JM2'; V.day = dd; V.view = 'day'; render(); }, d); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const y = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : -1; };
    return { sum: y('.dsum60'), tab: y('.dtab60'), aside: y('.daygrid>aside'), grp: y('.daygrid .grp'), foot: getComputedStyle(document.querySelector('.panel>.foot')).display,
      emptyRow: !!document.querySelector('.empty60'), hidden: [...document.querySelectorAll('.tcard.e60')].every(c => getComputedStyle(c).display === 'none'), ne: document.querySelectorAll('.tcard.e60').length,
      visible: [...document.querySelectorAll('.daygrid .tcard')].filter(c => getComputedStyle(c).display !== 'none').length, sw: document.documentElement.scrollWidth, w: innerWidth }; });
  ok(r.sum > 0 && r.sum < r.tab && r.tab < r.aside && r.aside < r.grp, 'thứ tự: tóm tắt → thanh chọn → đơn chờ → xe', JSON.stringify(r));
  ok(r.foot === 'none', 'bỏ dòng tổng cuối trang (đã lên tóm tắt)');
  ok(r.ne > 0 && r.emptyRow && r.hidden, 'xe trống gom thành một dòng', r.ne);
  ok(r.sw <= r.w, 'không cuộn ngang');
  await shot(p, 'day-phone');
  S('expand'); await p.click('.empty60'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('.tcard.e60')].every(c => getComputedStyle(c).display !== 'none') && /Ẩn/.test(document.querySelector('.empty60').textContent)), 'bấm dòng xe trống → hiện đủ, bấm lại để ẩn');
  S('tabs'); await p.click('.dtab60 [data-t="merge"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => V.dayTab === 'merge' && document.querySelector('.dtab60 [data-t="merge"]').classList.contains('on')), 'thanh chọn Gợi ý gộp → mở tab gộp xe');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.dtab60')).position === 'sticky'), 'thanh chọn dính khi cuộn');
  ok(await p.evaluate(() => [...document.querySelectorAll('.dtab60 button, .dsum60 .btn')].every(b => b.getBoundingClientRect().height >= 44)), 'nút ≥ 44px');
});
await session('log@demo.vn', async p => {
  S('desktop'); await p.setViewportSize({ width: 1440, height: 1000 });
  await p.evaluate(() => { V.wh = 'JM2'; V.day = addDays(TODAY, 1); V.view = 'day'; render(); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.dsum60')).display === 'none' && getComputedStyle(document.querySelector('.panel>.foot')).display !== 'none' && [...document.querySelectorAll('.tcard.e60')].every(c => getComputedStyle(c).display !== 'none')), 'máy tính giữ nguyên bố cục');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
