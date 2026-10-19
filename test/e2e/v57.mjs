// v3.44: trợ lý chính xác hơn + bộ chấm chặt hơn.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v57.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v57'; fs.mkdirSync(OUT, { recursive: true });
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
  S('tools');
  const r = await p.evaluate(async () => {
    const st = await TOOLS.stats.run({ period: 'month', filter: { status: 'x' } });
    CHAT.msgs.push({ role: 'user', content: 'Tạo đơn cho khách A 30 tấn bốc ngày 21/10 ở JM2' });
    const fr = await TOOLS.fill_request.run({ customer: 'A', date: '21/10', wh: 'JM2' }); CHAT.msgs = [];
    const g1 = (await TOOLS.guide.run({ q: 'đổi ngày bốc' })).map(x => x.id);
    const g2 = (await TOOLS.guide.run({ q: 'ngưỡng gần đầy' })).map(x => x.id);
    return { warn: st.canh_bao, ok: st.tong_da_dat && st.tong_da_dat.don >= 0, fr, g1, g2, t: [t2(100), t2(88.5), t2(30.25)],
      z: [ev55HasNum('Khách chưa đặt đơn nào', 0), ev55HasNum('Không có đơn nào đang giao', 0), !ev55HasNum('Có 11 đơn', 0)],
      sys: /QUY TẮC BỘ LỌC/.test(sysPrompt()), fo: /NGÀY BỐC/.test(TOOLS.fill_order.d) };
  });
  ok(/filter/.test(r.warn || '') && r.ok, 'tham số lạ bị bỏ và báo lại, kết quả vẫn đúng', JSON.stringify(r.warn));
  ok(/fill_order/.test((r.fr && r.fr.loi) || ''), '"bốc ngày" mà gọi form Yêu cầu → chỉ sang lưới Đặt hàng', JSON.stringify(r.fr));
  ok(r.g1.includes('cs-xuly'), 'Hướng dẫn "đổi ngày bốc" → mục Xử lý một đơn', JSON.stringify(r.g1));
  ok(r.g2.includes('cal') || r.g2.includes('admin-cfg'), 'Hướng dẫn "ngưỡng gần đầy" → mục Lịch / Cấu hình', JSON.stringify(r.g2));
  ok(r.t.join('|') === '100|88,5|30,25', 'số tấn tròn không hiện ,00', r.t.join('|'));
  ok(r.z.every(Boolean), 'bộ chấm hiểu "chưa đặt đơn nào" = 0');
  ok(r.sys && r.fo, 'lời nhắc có quy tắc bộ lọc, mô tả lưới Đặt hàng theo ngày bốc');
  S('eval');
  globalThis.__plan = (last) => /chưa giao/.test(last) ? { tool: 'stats', args: { period: 'month', segment: 'DD' } }
    : /Tạo đơn/.test(last) ? { tool: 'fill_request', args: { customer: 'x', date: '21/10' } }
    : /Mở lịch/.test(last) ? { tool: 'open', args: { kind: 'day', date: 'ngày mai', wh: 'JM2' } } : { answer: 'Có 300.00 MT' };
  await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(600);
  await p.click('[data-a="ev55Open"]'); await p.waitForSelector('#ev55');
  await p.evaluate(() => { const all = EV55_SET(); EV55_SET = () => all.filter(x => x.g === 'Thao tác' || /chưa giao|tổng bao nhiêu tấn/.test(typeof x.q === 'string' ? x.q : '')); });
  await p.click('[data-e="run"]'); await p.waitForFunction(() => !EV55.run, null, { timeout: 60000 });
  const res = await p.evaluate(() => EV55.res);
  const by = s => res.find(x => x.q.includes(s)) || {};
  ok((by('chưa giao').why || []).some(w => /segment/.test(w)), 'chấm Trượt khi tự thêm bộ lọc segment', JSON.stringify(by('chưa giao').why));
  ok((by('Tạo đơn').why || []).some(w => /fill_order/.test(w)), 'chấm Trượt khi "tạo đơn bốc ngày" không mở lưới Đặt hàng', JSON.stringify(by('Tạo đơn').why));
  ok(by('Mở lịch').st === 'ok', 'thao tác đúng công cụ, đúng ngày, đúng kho → Đạt', JSON.stringify(by('Mở lịch')));
  ok((by('tổng bao nhiêu tấn').why || []).some(w => /viết sai kiểu/.test(w)), 'chấm Trượt khi số viết "300.00 MT"', JSON.stringify(by('tổng bao nhiêu tấn').why));
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
