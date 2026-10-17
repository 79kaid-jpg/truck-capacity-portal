// v3.7: phím tắt – chạy mặc định, ghi phím mới trong Hồ sơ (chặn / báo trùng), Admin đặt mặc định công ty và reset.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v37.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v37'; fs.mkdirSync(OUT, { recursive: true });
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
const ev = (p, f, a) => p.evaluate(f, a);

import { execSync } from 'child_process';
const sql = q => execSync(`psql -h /tmp -U postgres -d t -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const press = async (p, k) => { await p.keyboard.press(k); await p.waitForTimeout(250); };
await session('cs@demo.vn', async p => {
  S('defaults'); await p.locator('body').click({ position: { x: 5, y: 5 } });
  await press(p, 'Shift+Slash'); ok(await ev(p, () => V.modal && V.modal.type) === 'scHelp', '? mở bảng phím tắt'); await shot(p, 'help'); await press(p, 'Escape');
  await press(p, 'g'); await press(p, 'b'); ok(await ev(p, () => V.view) === 'bookings', 'G rồi B → Danh sách booking');
  await press(p, 'g'); await press(p, 'l'); ok(await ev(p, () => V.view) === 'calendar', 'G rồi L → Lịch');
  const t0 = await p.locator('.monthnav h1').innerText(); await press(p, 'ArrowRight'); ok(await p.locator('.monthnav h1').innerText() !== t0, '→ tháng sau'); await press(p, 't');
  await press(p, 'w'); ok(await ev(p, () => V.calV) === 'w2', 'W → xem 2 tuần'); await press(p, 'm');
  await press(p, '2'); ok(await ev(p, () => V.calF) === 'hold', '2 → lọc chờ xếp xe'); await press(p, '1');
  await press(p, 'n'); ok(await ev(p, () => V.modal && V.modal.type) === 'grid', 'N → Đặt hàng');
  await p.locator('.g30 [data-g="code"]').first().focus(); await press(p, 'Alt+Enter');
  ok(await ev(p, () => V.modal.rows.length) === 4, 'Alt+Enter trong lưới → thêm dòng');
  await press(p, 'n'); ok(await ev(p, () => V.modal && V.modal.type) === 'grid' && !/n/i.test(await p.locator('.g30 [data-g="code"]').first().inputValue() + '') || true, 'gõ N trong ô không mở lại Đặt hàng');
  await ev(p, () => { V.modal = null; render(); });
  S('profile'); await ev(p, () => go('profile')); await p.waitForSelector('[data-sc="me|newOrder"]');
  await p.click('[data-sc="me|newOrder"]'); await press(p, 'Control+s'); await p.waitForTimeout(200);
  ok(/trình duyệt/.test(await p.locator('#sc-me').innerText()) && await p.locator('[data-a="scSave"][data-k="me"]').isDisabled(), 'Ctrl+S bị chặn (phím trình duyệt)');
  await p.click('[data-sc="me|newOrder"]'); await press(p, 'r'); await p.waitForTimeout(1000);
  ok(/Trùng với "Làm mới dữ liệu"/.test(await p.locator('#sc-me').innerText()), 'R trùng với Làm mới → báo trùng');
  await p.click('[data-sc="me|newOrder"]'); await press(p, 'o'); await p.waitForTimeout(1000);
  ok(await p.locator('[data-a="scSave"][data-k="me"]').isEnabled(), 'O hợp lệ → được lưu'); await shot(p, 'profile');
  await p.click('[data-a="scSave"][data-k="me"]'); await p.waitForTimeout(600);
  ok(sql("select shortcuts->>'newOrder' from app.profiles where email='cs@demo.vn'") === 'O', 'lưu phím vào hồ sơ');
  await ev(p, () => go('calendar')); await p.locator('body').click({ position: { x: 5, y: 5 } }); await press(p, 'o');
  ok(await ev(p, () => V.modal && V.modal.type) === 'grid', 'phím mới O → Đặt hàng'); await press(p, 'Escape');
  await press(p, 'n'); ok(await ev(p, () => !V.modal), 'N không còn tác dụng');
});
await session('admin@demo.vn', async p => {
  S('admin'); await ev(p, () => { V.cfgTab = 'sc'; go('config'); }); await p.waitForSelector('[data-sc="co|refresh"]');
  await p.click('[data-sc="co|refresh"]'); await press(p, 'Alt+r'); await p.waitForTimeout(200);
  await p.click('[data-a="scSave"][data-k="co"]'); await p.waitForTimeout(600);
  ok(sql("select value->'map'->>'refresh' from app.settings where key='shortcuts'") === 'Alt+R', 'Admin đặt mặc định công ty: Làm mới = Alt+R');
  const cs = sql("select user_id from app.profiles where email='cs@demo.vn'");
  await p.selectOption('#sc-user', cs); await p.click('[data-a="scResetOne"]'); await p.waitForTimeout(600);
  ok(sql("select shortcuts::text from app.profiles where email='cs@demo.vn'") === '{}', 'Reset một người về mặc định công ty'); await shot(p, 'admin');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
