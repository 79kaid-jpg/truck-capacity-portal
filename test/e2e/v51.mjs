// v3.32: nút Cài lên điện thoại (Android prompt, iPhone hướng dẫn, dải nhắc).
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v51.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v51'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...opt.ctx });
  const page = await ctx.newPage(); if (opt.init) await page.addInitScript(opt.init);
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
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const phone = ua => ({ ctx: { viewport: { width: 390, height: 844 }, userAgent: ua, isMobile: true, hasTouch: true } });
const menu = async p => { await p.click('.userbtn'); await p.waitForTimeout(200); };
await session('cs@demo.vn', async p => {
  S('ios-menu'); await menu(p); ok(await p.locator('.top .menu .instlink').count() === 1, 'iPhone: menu có Cài lên điện thoại');
  await p.click('.top .menu .instlink'); await p.waitForTimeout(300);
  const t = await p.locator('.modal').innerText(); ok(/Chia sẻ/.test(t) && /Thêm vào MH chính/.test(t), 'iPhone Safari: hướng dẫn 3 bước');
  ok(await p.locator('.modal .inststeps li').count() === 3, 'đủ 3 bước'); await p.screenshot({ path: `${OUT}/ios.png` });
  await p.click('.modal [data-a="close"]'); await p.waitForTimeout(300);
  S('ios-bar'); await p.evaluate(() => { localStorage.removeItem('tcp-inst-nag'); instBar.at = 0; render(); }); await p.waitForTimeout(4600);
  ok(await p.locator('#instbar').count() === 1, 'điện thoại: hiện dải nhắc cài'); await p.screenshot({ path: `${OUT}/bar.png` });
  await p.click('#instbar [data-a="instLater"]'); await p.waitForTimeout(200);
  ok(await p.locator('#instbar').count() === 0 && !!(await p.evaluate(() => localStorage.getItem('tcp-inst-nag'))), 'Để sau → ẩn và ghi nhớ');
  await p.evaluate(() => { instBar.at = 0; render(); }); await p.waitForTimeout(4600); ok(await p.locator('#instbar').count() === 0, 'trong 14 ngày không nhắc lại');
}, phone(IOS));
await session('cs@demo.vn', async p => {
  S('zalo'); await menu(p); await p.click('.top .menu .instlink'); await p.waitForTimeout(300);
  ok(/Safari/.test(await p.locator('.modal').innerText()) && await p.locator('#inst-url').count() === 1, 'iPhone trong Zalo: bảo mở bằng Safari + link');
}, phone(IOS + ' Zalo iOS'));
await session('log@demo.vn', async p => {
  S('desktop'); await menu(p); ok(await p.locator('.top .menu .instlink').count() === 0, 'máy tính chưa hỗ trợ cài → không hiện nút');
  S('prompt'); await p.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = async () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); dispatchEvent(e); });
  await p.waitForTimeout(200); if (!(await p.locator('.top .menu').count())) await menu(p);
  ok(await p.locator('.top .menu .instlink').count() === 1, 'Chrome/Edge báo cài được → hiện nút');
  await p.click('.top .menu .instlink'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__prompted === true), 'bấm → mở hộp cài của trình duyệt');
  if (!(await p.locator('.top .menu').count())) await menu(p);
  ok(await p.locator('.top .menu .instlink').count() === 0, 'đã cài → ẩn nút');
});
await session('cs@demo.vn', async p => {
  S('standalone'); await menu(p); ok(await p.locator('.top .menu .instlink').count() === 0, 'mở từ màn hình chính → không hiện nút');
  await p.waitForTimeout(4600); ok(await p.locator('#instbar').count() === 0, 'không hiện dải nhắc');
}, { ...phone(IOS), init: () => { Object.defineProperty(navigator, 'standalone', { get: () => true }); } });
await browser.close();
console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
