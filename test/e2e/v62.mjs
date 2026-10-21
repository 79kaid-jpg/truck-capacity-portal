// v3.49: Khai báo xe – "Điền vào bảng" cho tháng sau, hỏi trước khi bỏ thay đổi chưa lưu.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v62.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v62'; fs.mkdirSync(OUT, { recursive: true });
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
await session('log@demo.vn', async p => {
  S('next-month');
  await p.evaluate(() => go('fleet')); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const [y, m] = V.ym; const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1; const f = `${ny}-${pad(nm)}-01`; const t = `${ny}-${pad(nm)}-${pad(dim(ny, nm))}`; return { cur: `${y}-${pad(m)}`, f, t, nm, ny }; });
  const setDate = async (sel, v) => { await p.fill(sel, v); await p.locator(sel).dispatchEvent('change'); };
  await setDate('#bk-from', r.f); await setDate('#bk-to', r.t);
  await p.click('[data-a="bulkApply"]'); await p.waitForTimeout(1200);
  const st = await p.evaluate(() => ({ ym: `${V.ym[0]}-${pad(V.ym[1])}`, n: Object.keys(V.fleetEdit).length, keys: Object.keys(V.fleetEdit) }));
  ok(st.ym === r.f.slice(0, 7), 'tự chuyển sang tháng của "Từ ngày"', JSON.stringify(st.ym));
  ok(st.n >= 20 && st.keys.every(k => k.startsWith(r.f.slice(0, 7))), 'điền đủ các ngày làm việc tháng sau', String(st.n));
  ok(/Đã điền \d+ ngày/.test(await toastTxt(p)), 'thông báo đúng số ngày đã điền');
  await shot(p, '1-filled');
  S('save');
  await p.click('[data-a="fleetSave"]'); await p.waitForTimeout(1500);
  const saved = await p.evaluate(ks => ks.filter(k => (S.fleet[V.wh][k] || {}).dk === 9).length, st.keys);
  ok(saved === st.n, 'lưu được toàn bộ ngày tháng sau', `${saved}/${st.n}`);
  ok(await p.evaluate(() => Object.keys(V.fleetEdit).length) === 0, 'bảng tạm trống sau khi lưu');
  S('past');
  await setDate('#bk-from', '2020-01-01'); await setDate('#bk-to', '2020-01-31');
  await p.click('[data-a="bulkApply"]'); await p.waitForTimeout(400);
  ok(/đã qua/.test(await toastTxt(p)), 'khoảng ngày đã qua: báo lỗi, không báo "Đã điền"');
  S('confirm-month');
  const day = await p.evaluate(() => { const [y, m] = V.ym; for (let d = 1; d <= dim(y, m); d++) { const ds = iso(y, m, d); if (ds >= TODAY && !isHoliday(V.wh, ds)) return ds; } });
  await p.fill(`[data-f="fl"][data-d="${day}"][data-k="dk"]`, '7'); await p.locator(`[data-f="fl"][data-d="${day}"][data-k="dk"]`).dispatchEvent('input');
  const ym0 = await p.evaluate(() => V.ym.join('-'));
  p.once('dialog', d => d.dismiss());
  await p.click('[data-a="month"][data-d="1"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => V.ym.join('-')) === ym0 && await p.evaluate(d => V.fleetEdit[d]?.dk, day) === '7', 'chuyển tháng khi chưa lưu: chọn Không thì giữ nguyên');
  p.once('dialog', d => d.accept());
  await p.click('[data-a="month"][data-d="1"]'); await p.waitForTimeout(1000);
  ok(await p.evaluate(y => V.ym.join('-') !== y && Object.keys(V.fleetEdit).length === 0, ym0), 'chọn Có thì chuyển tháng, bỏ thay đổi');
});
await browser.close();
console.log(`\n${pass} đạt, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
