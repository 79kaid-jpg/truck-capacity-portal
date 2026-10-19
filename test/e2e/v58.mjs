// v3.45: trợ lý bền hơn, hiện rõ khi Claude lỗi.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v58.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v58'; fs.mkdirSync(OUT, { recursive: true });
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

await session('admin@demo.vn', async p => {
  S('tools');
  const r = await p.evaluate(async () => {
    const base = await TOOLS.stats.run({ period: 'month' });
    const ur = await TOOLS.stats.run({ period: 'month', segment: 'UR' });
    const dd = await TOOLS.stats.run({ period: 'month', segment: 'dân dụng' });
    CHAT.msgs.push({ role: 'user', content: 'Làm sao để đổi ngày bốc của một đơn?' });
    const g = (await TOOLS.guide.run({ q: 'đượng ngày bóc đơn' })).map(x => x.id); CHAT.msgs = [];
    return { warn: ur.canh_bao, same: ur.tong_da_dat.don === base.tong_da_dat.don, dd: dd.loc, g };
  });
  ok(/segment "UR"/.test(r.warn || '') && r.same, 'segment bịa ("UR") bị bỏ, kết quả như không lọc', JSON.stringify(r.warn));
  ok(/segment DD/.test(r.dd || ''), '"dân dụng" hiểu thành DD', r.dd);
  ok(r.g.includes('cs-xuly'), 'từ khóa hỏng dấu vẫn tìm đúng mục nhờ câu gốc', JSON.stringify(r.g));
  S('fallback');
  await p.evaluate(() => { S.cfg.aiEngine = 'claude'; S.cfg.aiUntil = new Date(Date.now() + 3600e3).toISOString(); S.cfg.aiModel = 'haiku'; });
  globalThis.__eng = { engine: 'free', note: 'Claude lỗi (temperature is deprecated) – dùng mô hình miễn phí.' };
  globalThis.__plan = () => ({ answer: 'ok' });
  await p.click('#chatFab'); await p.waitForSelector('#chatPanel');
  await p.fill('#chatPanel textarea', 'xin chào'); await p.keyboard.press('Enter'); await p.waitForFunction(() => !CHAT.busy);
  const b = await p.evaluate(() => { const e = document.querySelector('#chatPanel .aib56'); return [e.textContent, e.title, e.classList.contains('warn58')]; });
  ok(/Claude lỗi/.test(b[0]) && /temperature/.test(b[1]) && b[2], 'Claude bật mà trả lời bằng mô hình miễn phí → nhãn cam kèm lý do', JSON.stringify(b));
  await p.click('[data-chat="x"]').catch(() => {});
  await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(700);
  ok(/temperature/.test(await p.locator('.ai58e').innerText().catch(() => '')), 'Admin thấy lỗi Claude gần nhất');
  S('eval'); await p.click('[data-a="ev55Open"]'); await p.waitForSelector('#ev55');
  await p.evaluate(() => { EV55_SET = () => [{ g: 'x', q: 'Thời tiết?', tools: [], truth: () => ({ none: true }) }]; });
  await p.click('[data-e="run"]'); await p.waitForFunction(() => !EV55.run);
  const ev = await p.evaluate(() => [EV55.res[0].st, EV55.res[0].why.join(';'), EV55.res[0].eng, ev55Tsv()]);
  ok(ev[0] === 'bad' && /Claude lỗi/.test(ev[1]) && ev[2] === 'Miễn phí', 'Kiểm thử: câu bị chuyển sang mô hình miễn phí → Trượt, ghi mô hình trả lời', JSON.stringify(ev.slice(0, 3)));
  ok(/^Mô hình chọn: Claude Haiku/.test(ev[3]) && /Mô hình trả lời/.test(ev[3]), 'bảng kết quả có mô hình chọn và mô hình trả lời từng câu');
  globalThis.__eng = { engine: 'claude', model: 'haiku' };
  await p.click('[data-e="run"]'); await p.waitForFunction(() => !EV55.run);
  ok(await p.evaluate(() => EV55.res[0].st === 'ok' && EV55.res[0].eng === 'Claude Haiku'), 'Claude trả lời thật → Đạt, ghi Claude Haiku');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
