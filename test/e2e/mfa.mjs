// E2E: xác thực 2 lớp (TOTP). Mã hợp lệ trong mock: 123456. Test-only.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errs = []; const log = (...a) => console.log(...a);
async function open(email, vp = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  p.on('pageerror', e => errs.push(`[${email}] ${e.message}`));
  await p.goto('http://127.0.0.1:8787/');
  if (email) { await p.fill('#lg-e', email); await p.fill('#lg-p', 'Test@1234'); await p.click('#login button'); await p.waitForTimeout(900); }
  return p;
}
const h1 = p => p.locator('h1').first().textContent().catch(() => '');
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const check = (name, ok) => { log((ok ? 'OK  ' : 'FAIL') + ' ' + name); if (!ok) errs.push('FAIL ' + name); };

// 1. CS lần đầu: bắt buộc đăng ký
let p = await open('cs@demo.vn', { width: 390, height: 844 });
check('CS first login -> enroll screen', (await h1(p)) === 'Bật xác thực 2 lớp');
await p.waitForSelector('#mfe button:not([disabled])'); await shot(p, 'mfa-1-enroll-mobile');
check('QR image loads, no broken markup', (await p.locator('.mfaqr img').evaluate(i => i.complete && i.naturalWidth > 0)) && !/alt=|width=/.test(await p.locator('.mfaqr').innerText()));
check('QR + secret shown', (await p.locator('.mfaqr img').count()) === 1 && /JBSW/.test(await p.locator('.mfasecret').textContent()));
await p.fill('#mfe-code', '111111'); await p.click('#mfe button'); await p.waitForTimeout(500);
check('wrong code -> error', /Mã không đúng/.test(await p.locator('.err').textContent().catch(() => '')));
await p.fill('#mfe-code', '123456'); await p.click('#mfe button'); await p.waitForTimeout(900);
check('correct code -> app', (await p.locator('.cal').count()) === 1);
await p.context().close();

// 2. CS lần sau: nhập mã
p = await open('cs@demo.vn');
check('CS second login -> challenge', (await h1(p)) === 'Xác thực 2 lớp'); await shot(p, 'mfa-2-challenge');
await p.fill('#mfc-code', '123456'); await p.click('#mfc button'); await p.waitForTimeout(900);
check('challenge ok -> app', (await p.locator('.cal').count()) === 1);
await p.click('.userbtn'); await p.click('[data-a="go"][data-v="profile"]'); await p.waitForTimeout(300);
const prof = await p.locator('.main').innerText();
check('CS profile: MFA on, required, no turn-off', /XÁC THỰC 2 LỚP/.test(prof) && /Đang bật/.test(prof) && (await p.locator('[data-a="mfaOff"]').count()) === 0);
// đổi điện thoại
await p.click('[data-a="mfaNew"]'); await p.waitForSelector('[data-a="mfaConfirm"]:not([disabled])'); await shot(p, 'mfa-3-profile-new-device');
await p.fill('#mfp-code', '123456'); await p.click('[data-a="mfaConfirm"]'); await p.waitForTimeout(800);
check('change device -> toast', /Đã bật xác thực 2 lớp/.test(await p.locator('.toast').textContent().catch(() => '')));
const nf = await p.evaluate(async () => (await sb.auth.mfa.listFactors()).data.all.length);
check('change device -> only 1 factor left', nf === 1);
await p.context().close();

// 3. Sales: không bắt buộc; tự bật rồi tắt
p = await open('s1@demo.vn');
check('Sales login -> app without MFA', (await p.locator('.cal').count()) === 1);
await p.click('.userbtn'); await p.click('[data-a="go"][data-v="profile"]'); await p.waitForTimeout(300);
check('Sales profile: "Chưa bật"', /Chưa bật/.test(await p.locator('.main').innerText()));
await p.click('[data-a="mfaNew"]'); await p.waitForSelector('[data-a="mfaConfirm"]:not([disabled])');
await p.fill('#mfp-code', '123456'); await p.click('[data-a="mfaConfirm"]'); await p.waitForTimeout(800);
check('Sales enabled', /Đang bật/.test(await p.locator('.main').innerText()));
await p.click('[data-a="mfaOff"]'); await p.waitForTimeout(150); await p.click('[data-a="mfaOff"]'); await p.waitForTimeout(800);
check('Sales turned off', /Chưa bật/.test(await p.locator('.main').innerText()));
await p.context().close();

// 4. Khách hàng: không bị hỏi MFA
p = await open('kh@demo.vn');
check('Customer -> app without MFA', (await p.locator('.cal').count()) === 1);
await p.context().close();

// 5. Admin: đăng ký, xem danh sách, gỡ MFA của CS, ma trận có dòng MFA
p = await open('admin@demo.vn');
await p.waitForSelector('#mfe button:not([disabled])'); await p.fill('#mfe-code', '123456'); await p.click('#mfe button'); await p.waitForTimeout(900);
await p.evaluate(() => { V.view = 'users'; V.uTab = 'users'; render(); }); await p.waitForTimeout(300);
const ul = await p.locator('.main').innerText();
check('users list: CS has MFA chip, Logistics "Chưa đăng ký MFA"', /Nguyễn Thanh Trúc[\s\S]*?MFA/.test(ul) && /Chưa đăng ký MFA/.test(ul));
await shot(p, 'mfa-4-users');
const rb = p.locator('tr', { hasText: 'Nguyễn Thanh Trúc' }).locator('[data-a="mfaReset"]');
await rb.click(); await p.waitForTimeout(100); check('reset asks confirm', /Bấm lần nữa/.test(await rb.textContent()));
await rb.click(); await p.waitForTimeout(800);
check('reset toast', /Đã gỡ thiết bị/.test(await p.locator('.toast').textContent().catch(() => '')));
await p.evaluate(() => { V.view = 'users'; V.uTab = 'perms'; render(); }); await p.waitForTimeout(300);
check('perms matrix has MFA row, admin locked', (await p.locator('input[data-p="auth.mfa"][data-r="admin"][disabled]').count()) === 1 && (await p.locator('input[data-p="auth.mfa"][data-r="cs"]:checked').count()) === 1 && (await p.locator('input[data-p="auth.mfa"][data-r="sales"]:not(:checked)').count()) === 1);
await shot(p, 'mfa-5-perms');
await p.context().close();

// 6. CS sau khi bị gỡ: đăng ký lại
p = await open('cs@demo.vn');
check('CS after reset -> enroll again', (await h1(p)) === 'Bật xác thực 2 lớp');
await p.waitForSelector('#mfe button:not([disabled])'); await p.fill('#mfe-code', '123456'); await p.click('#mfe button'); await p.waitForTimeout(900);
await p.context().close();

// 7. Quên mật khẩu với MFA: nhập mã trước rồi mới đặt mật khẩu (Supabase yêu cầu aal2)
p = await open(null);
await p.goto('http://127.0.0.1:8787/#type=recovery&mock_uid=00000000-0000-0000-0000-0000000000c1&mock_email=cs@demo.vn'); await p.reload(); await p.waitForTimeout(900);
check('recovery with MFA -> challenge first', (await h1(p)) === 'Xác thực 2 lớp');
await p.fill('#mfc-code', '123456'); await p.click('#mfc button'); await p.waitForTimeout(600);
check('then set-password screen', (await h1(p)) === 'Đặt mật khẩu mới');
await p.fill('#sp1', 'Moi@12345'); await p.fill('#sp2', 'Moi@12345'); await p.click('#sp button'); await p.waitForTimeout(900);
check('password updated at aal2 and app opens', (await p.evaluate(() => window.__pwUpdatedAal)) === 'aal2' && (await p.locator('.cal').count()) === 1);
await p.context().close();

await browser.close();
log(errs.length ? '\nERRORS:\n' + errs.join('\n') : '\nALL MFA CHECKS PASSED');
