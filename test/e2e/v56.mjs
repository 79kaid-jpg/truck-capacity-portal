// v3.43: chọn mô hình AI (Miễn phí / Claude) – AI giả lập.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v56.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v56'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
import { execSync } from 'child_process';
const q = s => execSync(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.route('**/cdn.jsdelivr.net/**', r => r.request().url().includes('xlsx') ? r.fulfill({ contentType: 'text/javascript', body: '' }) : r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/api/chat', async r => { if (r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, claudeKey: false }) });
    const b = JSON.parse(r.request().postData()); globalThis.__body = b;
    const eng = q("select case when value #>> '{}' = 'claude' then 'claude' else 'free' end from app.settings where key='aiEngine'");
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: JSON.stringify({ answer: 'Chào bạn' }), left: 42, engine: eng }) }); });
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
  S('cfg'); await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(900);
  ok(await p.locator('.ai56').count() === 1, 'Admin thấy phần Mô hình AI trong khung Trợ lý');
  ok(/Miễn phí \(Llama\)/.test(await p.locator('#ai56st').innerText()), 'mặc định dùng mô hình miễn phí');
  ok(await p.locator('#ai56k').isVisible(), 'chưa cài khóa Anthropic → cảnh báo');
  S('on'); await p.selectOption('#ai56m', 'sonnet'); await p.click('[data-ai56="2"]'); await p.waitForTimeout(1200);
  const st = q("select (select value #>> '{}' from app.settings where key='aiEngine')||'|'||(select value #>> '{}' from app.settings where key='aiModel')||'|'||round(extract(epoch from ((select value #>> '{}' from app.settings where key='aiUntil')::timestamptz - now()))/60)");
  const [e, m, mins] = st.split('|'); ok(e === 'claude' && m === 'sonnet' && +mins >= 118 && +mins <= 120, 'bấm 2 giờ → bật Claude Sonnet, tự tắt sau 2 giờ', st);
  ok(/Claude Sonnet/.test(await p.locator('#ai56st').innerText()) && await p.locator('[data-ai56="off"]').count() === 1, 'trạng thái: đang dùng Claude + nút Tắt ngay');
  S('badge'); await p.click('#chatFab'); await p.waitForSelector('#chatPanel');
  ok(/Claude/.test(await p.locator('#chatPanel .aib56').innerText()), 'đầu khung chat có nhãn Claude');
  await p.fill('#chatPanel textarea', 'xin chào'); await p.keyboard.press('Enter'); await p.waitForFunction(() => !CHAT.busy);
  ok(Array.isArray(globalThis.__body.defs) && globalThis.__body.defs.some(d => d.name === 'stats' && d.d), 'gửi mô tả công cụ cho máy chủ');
  await shot(p, 'claude-on');
  S('daily'); await p.click('[data-chat="x"]').catch(() => {}); await p.fill('#ai56d', '300'); await p.locator('#ai56d').dispatchEvent('change'); await p.waitForTimeout(900);
  ok(q("select value from app.settings where key='aiClaudeDaily'") === '300' && q("select value #>> '{}' from app.settings where key='aiEngine'") === 'claude', 'đổi hạn mức lượt Claude, vẫn giữ Claude');
  S('off'); await p.click('[data-ai56="off"]'); await p.waitForTimeout(1000);
  ok(q("select value #>> '{}' from app.settings where key='aiEngine'") === 'free' && /Miễn phí/.test(await p.locator('#ai56st').innerText()), 'Tắt ngay → về mô hình miễn phí');
  S('eval'); await p.click('[data-a="ev55Open"]'); await p.waitForSelector('#ev55');
  await p.evaluate(() => { EV55_SET = () => [{ g: 'x', q: 'Thời tiết?', tools: [], truth: () => ({ none: true }) }]; });
  await p.click('[data-e="run"]'); await p.waitForFunction(() => !EV55.run);
  ok(/Miễn phí/.test(await p.evaluate(() => EV55.hist[0].model)), 'Kiểm thử trợ lý ghi mô hình của lần chạy');
});
await session('cs@demo.vn', async p => {
  S('cs'); await p.click('#chatFab'); await p.waitForSelector('#chatPanel');
  ok(/Miễn phí/.test(await p.locator('#chatPanel .aib56').innerText()), 'người dùng thấy nhãn Miễn phí');
  await p.evaluate(() => { go('config'); }); await p.waitForTimeout(500);
  ok(await p.locator('.ai56').count() === 0, 'không phải Admin thì không thấy phần chọn mô hình');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
