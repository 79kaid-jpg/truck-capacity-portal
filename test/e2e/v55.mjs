// v3.42: Kiểm thử trợ lý – chạy bộ câu hỏi chuẩn với AI giả lập.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v55.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v55'; fs.mkdirSync(OUT, { recursive: true });
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
await session('admin@demo.vn', async p => {
  S('open'); await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(800);
  ok(await p.locator('[data-a="ev55Open"]').count() === 1, 'Admin có nút Kiểm thử trợ lý trong khung Trợ lý');
  await p.click('[data-a="ev55Open"]'); await p.waitForSelector('#ev55');
  // AI giả lập: câu "đang giao" → gọi stats; câu thời tiết → trả lời thẳng; còn lại → gọi open (thao tác) hoặc trả lời "ok"
  globalThis.__plan = (last) => /đang giao/.test(last) ? { tool: 'stats', args: { period: 'day' } }
    : /Mở lịch/.test(last) ? { tool: 'open', args: { kind: 'day', date: 'ngày mai', wh: 'JM2' } }
    : /Thời tiết/.test(last) ? { answer: 'Xin lỗi, câu này ngoài phạm vi.' } : { answer: '{"answer":"hỏng"}' };
  const view0 = await p.evaluate(() => V.view);
  S('run'); await p.click('[data-e="run"]');
  await p.waitForFunction(() => !EV55.run, null, { timeout: 120000 });
  const r = await p.evaluate(() => ({ res: EV55.res, n: EV55_SET().length, view: V.view, msgs: CHAT.msgs.length, hist: EV55.hist.length, rows: document.querySelectorAll('#ev55 tbody tr').length }));
  ok(r.res.length === r.n && r.rows === r.n, 'chạy hết bộ câu hỏi, mỗi câu một dòng', r.res.length + '/' + r.n);
  const by = s => r.res.find(x => x.q.includes(s)) || {};
  ok((by('đang giao').tools || []).some(t => t.startsWith('stats')), 'ghi lại công cụ đã gọi', JSON.stringify(by('đang giao').tools));
  ok(by('Thời tiết').st === 'ok', 'câu ngoài phạm vi: không gọi công cụ → Đạt', JSON.stringify(by('Thời tiết')));
  ok(by('Mở lịch').st === 'ok' && r.view === view0, 'thao tác mở màn chỉ được ghi lại, không chuyển màn', r.view);
  ok(by('tổng bao nhiêu tấn').st === 'bad' && by('tổng bao nhiêu tấn').why.some(w => /JSON|công cụ/.test(w)), 'câu trả lời hỏng / không gọi công cụ → Trượt kèm lý do', JSON.stringify(by('tổng bao nhiêu tấn').why));
  ok(r.msgs === 0 && r.hist === 1, 'không làm bẩn lịch sử chat, lưu điểm vào lịch sử');
  ok(/\d+%/.test(await p.locator('#ev55 .sum').innerText()), 'hiện điểm phần trăm');
  await shot(p, 'ev55');
  S('copy'); const tsv = await p.evaluate(() => ev55Tsv()); ok(tsv.split('\n').length === r.n + 1 && /ĐẠT|TRƯỢT/.test(tsv), 'xuất kết quả dạng bảng');
  const nums = await p.evaluate(() => [ev55HasNum('Tổng **1.234,5 MT**', 1234.5), ev55HasNum('Có 3 xe', 3), ev55HasNum('Không có xe nào', 0), !ev55HasNum('Có 4 xe', 3)]);
  ok(nums.every(Boolean), 'đọc số 1.234,5 / 3 / "không có" = 0', JSON.stringify(nums));
});
await session('cs@demo.vn', async p => {
  S('cs'); await p.evaluate(() => { go('config'); }); await p.waitForTimeout(500);
  ok(await p.locator('[data-a="ev55Open"]').count() === 0, 'không phải Admin thì không có nút');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
