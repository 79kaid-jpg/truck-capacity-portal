// v3.46: khung chat trên điện thoại.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v59.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v59'; fs.mkdirSync(OUT, { recursive: true });
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
await session('cs@demo.vn', async p => {
  S('open'); await p.click('#chatFab'); await p.waitForSelector('#chatPanel');
  globalThis.__plan = () => ({ answer: 'Đơn [BK-JM2-261019-001-RẤT-DÀI-KHÔNG-CÓ-KHOẢNG-TRẮNG-AAAAAAAAAAAAAAAAAAAAAAAAAAAA](#bk:BK-JM2-261019-001) giao https://example.com/duong-dan-rat-dai-khong-co-khoang-trang-aaaaaaaaaaaaaaaaaaaaaaaa' });
  await p.fill('#chatPanel textarea', 'đơn nào'); await p.keyboard.press('Enter'); await p.waitForFunction(() => !CHAT.busy);
  const r = await p.evaluate(() => { const P = document.getElementById('chatPanel').getBoundingClientRect(); const send = document.querySelector('#chatPanel [data-chat="send"]').getBoundingClientRect();
    const ta = document.querySelector('#chatPanel textarea'); const msgs = [...document.querySelectorAll('#chatPanel .cmsg')].map(m => m.getBoundingClientRect());
    return { w: innerWidth, P: [P.left, P.right, P.width], send: [send.left, send.right, send.height], fs: parseFloat(getComputedStyle(ta).fontSize),
      over: msgs.some(m => m.right > P.right + 0.5 || m.left < P.left - 0.5), docW: document.documentElement.scrollWidth, sw: document.querySelector('#chatPanel .cm').scrollWidth, cw: document.querySelector('#chatPanel .cm').clientWidth }; });
  ok(r.P[0] === 0 && Math.abs(r.P[1] - r.w) < 1, 'khung chat chiếm trọn chiều ngang điện thoại', JSON.stringify(r.P));
  ok(r.send[1] <= r.w && r.send[0] >= 0 && r.send[2] >= 44, 'nút Gửi nằm trọn trong màn hình, cao ≥ 44px', JSON.stringify(r.send));
  ok(r.fs >= 16, 'ô nhập cỡ chữ ≥ 16px (iPhone không tự phóng to)', r.fs);
  ok(!r.over && r.sw <= r.cw + 1, 'tin nhắn có mã / link dài không tràn ngang', JSON.stringify([r.sw, r.cw]));
  await shot(p, 'phone-chat');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
