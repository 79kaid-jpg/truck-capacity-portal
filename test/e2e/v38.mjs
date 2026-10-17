// v3.8: Xem như khách hàng (chỉ xem) + Hướng dẫn sử dụng.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v38.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v38'; fs.mkdirSync(OUT, { recursive: true });
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
await session('admin@demo.vn', async p => {
  S('cv'); await ev(p, () => { V.view = 'users'; V.uTab = 'customers'; render(); });
  const id = await p.locator('[data-a="cvStart"]').first().getAttribute('data-id');
  await p.locator('[data-a="cvStart"]').first().click(); await p.waitForTimeout(800);
  ok(await p.locator('.cvbar').count() === 1 && await ev(p, () => S.me.role) === 'customer' && await ev(p, x => S.me.customerId === x, id), 'Xem như khách: thanh cam + giao diện khách');
  ok(await ev(p, () => S.bookings.every(b => b.customerId === S.me.customerId)), 'chỉ thấy đơn của khách đó');
  await shot(p, 'cv');
  const err = await ev(p, async () => { try { await rpc('save_targets', { p: [] }); return ''; } catch (e) { return e.message; } });
  ok(/chỉ xem/.test(err), 'máy chủ chặn thao tác khi đang xem như khách', err);
  ok(sql("select count(*) from app.audit_log where detail like '%bắt đầu Xem như khách hàng%'") === '1', 'ghi nhật ký');
  await p.click('[data-a="cvStop"]'); await p.waitForTimeout(800);
  ok(await p.locator('.cvbar').count() === 0 && await ev(p, () => S.me.role) === 'admin', 'Thoát → về Admin');
  S('cv-search'); await p.keyboard.press('Control+k'); await p.keyboard.type('van dat'); await p.waitForTimeout(500);
  ok(await p.locator('.gs-it button', { hasText: 'Xem như khách' }).count() > 0, 'Ctrl+K tìm khách có "Xem như khách"'); await p.keyboard.press('Escape');
});
await session('cs@demo.vn', async p => {
  S('guide'); await p.click('.top [data-a="guide"]'); await p.waitForSelector('#guide article h2');
  ok(/Việc hằng ngày \(CS\)/.test(await p.locator('#guide article h2').first().innerText()), 'CS mở hướng dẫn → mục Việc hằng ngày CS'); await shot(p, 'guide');
  await p.fill('#guide [data-gd="q"]', 'picking'); await p.waitForTimeout(500);
  ok(await p.locator('#guide article mark').count() > 0, 'tìm "picking" → tô sáng kết quả');
  await p.fill('#guide [data-gd="q"]', ''); await p.waitForTimeout(400);
  await p.locator('#guide nav a', { hasText: 'Xác nhận giao hàng' }).click(); await p.waitForTimeout(300);
  ok(await p.locator('#guide article img').count() > 0 && await p.locator('#guide article img').first().evaluate(i => i.complete && i.naturalWidth > 0), 'mục có ảnh minh họa tải được');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.locator('#guide').count() === 0, 'Esc đóng hướng dẫn');
  await p.locator('body').click({ position: { x: 5, y: 5 } }); await p.keyboard.press('g'); await p.keyboard.press('h'); await p.waitForTimeout(400);
  ok(await p.locator('#guide').count() === 1, 'G rồi H mở hướng dẫn');
  await p.keyboard.press('Escape'); await ev(p, () => go('fleet')).catch(() => {});
  await ev(p, () => go('dash')); await p.waitForTimeout(800); const l = p.locator('.main [data-a="guide"][data-s]');
  ok(await l.count() === 1, 'có link "Hướng dẫn màn này"'); await l.click(); await p.waitForTimeout(300);
  ok(/Bảng thống kê/.test(await p.locator('#guide article h2').first().innerText()), 'link mở đúng mục của màn');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
