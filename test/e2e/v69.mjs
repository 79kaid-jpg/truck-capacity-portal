// v3.57: menu điện thoại dạng bảng trượt từ dưới lên.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v69.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v69'; fs.mkdirSync(OUT, { recursive: true });
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
const drag = async (p, sel, dy) => { const b = await p.locator(sel).boundingBox(); const x = b.x + b.width / 2, y = b.y + 20;
  await p.evaluate(([sel, x, y, dy]) => { const el = document.querySelector(sel); const T = (t, yy) => el.dispatchEvent(new TouchEvent(t, { bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: yy })], changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: yy })] }));
    T('touchstart', y); for (let i = 1; i <= 6; i++) T('touchmove', y + dy * i / 6); T('touchend', y + dy); }, [sel, x, y, dy]); await p.waitForTimeout(400); };
await session('log@demo.vn', async p => {
  const more = () => p.locator('.more61:not([hidden])').count();
  S('open'); await p.click('.bnav61 [data-a="more61"]'); await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const m = document.querySelector('.more61').getBoundingClientRect(); return { b: Math.round(innerHeight - m.bottom), l: m.left, r: innerWidth - m.right, dim: !!document.querySelector('.dim69') }; });
  ok(await more() === 1 && g.b === 0 && g.l === 0 && g.r === 0 && g.dim, 'bấm ⋯ → bảng trượt từ đáy, nền tối', JSON.stringify(g));
  await shot(p, 'sheet-open');
  S('pick'); await p.click('.more61 [data-v="yard"]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => V.view === 'yard') && await more() === 0 && await p.locator('.dim69').count() === 0, 'chọn Chế độ kho → chuyển màn và menu đóng');
  const btn = p.locator('.main button:visible').first();
  ok(await btn.count() === 0 || await p.evaluate(() => { const b = [...document.querySelectorAll('.main button')].find(x => x.offsetParent); if (!b) return true; const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !e || b.contains(e) || e.closest('.main'); }), 'nút trong màn không bị menu che');
  S('dim'); await p.click('.bnav61 [data-a="more61"]'); await p.waitForTimeout(300); await p.mouse.click(195, 120); await p.waitForTimeout(400);
  ok(await more() === 0, 'chạm nền tối → đóng');
  S('toggle'); await p.click('.bnav61 [data-a="more61"]'); await p.waitForTimeout(300);
  ok(await more() === 1, 'mở lại');
  S('drag-small'); await drag(p, '.more61', 20);
  ok(await more() === 1, 'kéo xuống ít → bật lại');
  S('drag'); await drag(p, '.more61', 260);
  ok(await more() === 0, 'kéo xuống quá 1/3 → đóng');
  S('nav'); await p.click('.bnav61 [data-a="more61"]'); await p.waitForTimeout(300); await p.evaluate(() => { M61.more = true; go('calendar'); }); await p.waitForTimeout(400);
  ok(await more() === 0, 'đổi màn → menu đóng');
}, PH);
await session('cs@demo.vn', async p => {
  S('bk'); await p.evaluate(() => { V.bk = S.bookings.find(x => x.status === 'hold').id; go('booking'); }); await p.waitForTimeout(600);
  await p.click('.m68btn'); await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const m = document.querySelector('.menu68').getBoundingClientRect(); return { b: Math.round(innerHeight - m.bottom), l: m.left }; });
  ok(g.b === 0 && g.l === 0, 'menu ⋯ chi tiết booking cũng là bảng trượt từ đáy', JSON.stringify(g));
  await drag(p, '.menu68', 260);
  ok(await p.locator('.menu68').count() === 0, 'kéo xuống → đóng menu ⋯');
}, PH);
console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); }
await browser.close(); process.exit(errors.length ? 1 : 0);
