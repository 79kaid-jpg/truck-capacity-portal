// v3.18: lọc, tạo, xóa tài khoản, đặt lại mật khẩu.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v45.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v45'; fs.mkdirSync(OUT, { recursive: true });
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
import { execSync as ex2 } from 'child_process';
const q = s => ex2(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
const users = p => p.evaluate(() => { V.view = 'users'; V.uTab = 'users'; render(); });
await session('admin@demo.vn', async p => {
  S('filter'); await users(p); await p.waitForTimeout(300);
  const total = await p.locator('.main tbody tr').count();
  await p.selectOption('#uf-r', 'sales'); await p.waitForTimeout(300);
  ok(await p.locator('.main tbody tr').count() === 2 && /2\/\d+/.test(await p.locator('.ufcnt').innerText()), 'lọc vai trò Sales');
  await p.selectOption('#uf-s', 'DA'); await p.waitForTimeout(300); const nDA = await p.locator('.main tbody tr').count();
  ok(nDA < 2, 'lọc thêm Segment', nDA);
  await p.click('[data-a="ufClear"]'); await p.waitForTimeout(300); ok(await p.locator('.main tbody tr').count() === total, 'Bỏ lọc');
  await p.fill('#uf-q', 'kh@'); await p.waitForTimeout(600); ok(await p.locator('.main tbody tr').count() === 1, 'tìm theo email');
  await p.click('[data-a="ufClear"]');
  S('create'); await p.click('[data-a="ucNew"]'); await p.waitForSelector('#uc-pw');
  ok((await p.inputValue('#uc-pw')).length === 10, 'sinh mật khẩu tạm 10 ký tự');
  await p.fill('#un-n', 'Test Tạo Mới'); await p.locator('#un-n').dispatchEvent('input');
  await p.fill('#un-e', 'test.taomoi'); await p.locator('#un-e').dispatchEvent('input');
  await p.selectOption('[data-k="role"]', 'cs'); await p.waitForTimeout(200);
  await p.fill('#uc-pw', 'Test@1234'); await p.locator('#uc-pw').dispatchEvent('input');
  await p.click('[data-a="ucSave"]'); await p.waitForTimeout(1200);
  ok(/ĐÃ TẠO TÀI KHOẢN/i.test(await p.locator('.modal').innerText()) && /test\.taomoi@bluescope\.com/.test(await p.locator('.modal').innerText()), 'tạo tài khoản, tự thêm @bluescope.com');
  ok(q("select must_change_pw from app.profiles where email='test.taomoi@bluescope.com'") === 't', 'bắt đổi mật khẩu lần đầu');
  await p.screenshot({ path: `${OUT}/created.png` }); await p.click('.modal [data-a="close"]');
  S('bulk'); await p.click('[data-a="ucBulk"]'); await p.waitForSelector('[data-ucb]');
  await p.fill('[data-ucb]', 'Họ tên\tEmail\tVai trò\tSegment\tSĐT\nBulk Một\tbulk.mot\tSales\tDD\t0901\nBulk Hai\tbulk.hai@test.vn\tLogistics\nLỗi\tkhongemail\tXYZ');
  await p.locator('[data-ucb]').dispatchEvent('input'); await p.waitForTimeout(700);
  ok(await p.locator('.modal td.bad').count() === 1 && /Tạo 2 tài khoản/i.test(await p.locator('.modal [data-a="ucBulkGo"]').innerText()), 'xem trước, dòng lỗi tô đỏ');
  await p.click('[data-a="ucBulkGo"]'); await p.waitForTimeout(2500);
  ok(/Đã tạo 2\/2/.test(await p.locator('.modal').innerText()), 'tạo hàng loạt');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a="ucBulkCsv"]')]); ok(/tai-khoan-moi/.test(dl.suggestedFilename()), 'tải CSV mật khẩu');
  await p.click('.modal [data-a="close"]');
  S('reset'); const bid = q("select user_id from app.profiles where email='bulk.hai@test.vn'");
  await p.evaluate(x => A.pwReset({ id: x }), bid); await p.waitForTimeout(200); await p.click('[data-a="prGo"]'); await p.waitForTimeout(1000);
  ok(/Đã đặt mật khẩu tạm mới/.test(await p.locator('.modal').innerText()), 'đặt lại mật khẩu'); await p.click('.modal [data-a="close"]');
  S('delete'); const s2 = '00000000-0000-0000-0000-0000000000d2';
  await p.evaluate(x => A.udel({ id: x }), s2); await p.waitForTimeout(800);
  ok(/đang gắn dữ liệu/i.test(await p.locator('.modal').innerText()) && await p.locator('#ud-to option').count() >= 2, 'xóa Sales đang có khách → yêu cầu chuyển giao');
  await p.screenshot({ path: `${OUT}/delete.png` });
  await p.fill('#ud-x', 'XOA'); await p.locator('#ud-x').dispatchEvent('input'); await p.click('[data-a="udelGo"]'); await p.waitForTimeout(300);
  ok(/người nhận/i.test(await p.locator('.modal .err').innerText()), 'chưa chọn người nhận → báo lỗi');
  await p.selectOption('#ud-to', '00000000-0000-0000-0000-0000000000d1'); await p.click('[data-a="udelGo"]'); await p.waitForTimeout(1200);
  ok(q(`select count(*) from app.profiles where user_id='${s2}'`) === '0' && q(`select count(*) from app.customers where sales_user_id='${s2}'`) === '0', 'xóa + chuyển giao khách');
  S('bulkdel'); await users(p); await p.fill('#uf-q', 'bulk'); await p.waitForTimeout(600);
  await p.check('[data-usall]'); await p.waitForTimeout(300); await p.click('[data-a="udelMany"]'); await p.fill('#udm-x', 'xoa'); await p.locator('#udm-x').dispatchEvent('input');
  await p.click('[data-a="udelManyGo"]'); await p.waitForTimeout(2000); { const t = await p.locator('.modal').innerText(); ok(/Đã xóa 2\/2/i.test(t), 'xóa nhiều tài khoản test', t.slice(0, 600)); }
  ok(await p.evaluate(() => !document.querySelector(`[data-a="udel"][data-id="${V.me}"]`)), 'không có nút xóa chính mình');
});
// người được tạo đăng nhập lần đầu → bắt đổi mật khẩu
{ const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } }); const page = await ctx.newPage();
  await page.route('**/cdn.jsdelivr.net/**', r => r.request().url().includes('xlsx') ? r.fulfill({ contentType: 'text/javascript', body: '' }) : r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('http://127.0.0.1:8787/'); await page.fill('#lg-e', 'test.taomoi'); await page.fill('#lg-p', 'Test@1234'); await page.click('#login button'); await page.waitForTimeout(2000);
  if (await page.locator('#mfe-code').count()) { await page.waitForSelector('#mfe button:not([disabled])'); await page.fill('#mfe-code', '123456'); await page.click('#mfe button'); await page.waitForTimeout(1500); }
  step = 'firstlogin'; ok(await page.locator('#sp').count() === 1 && /mật khẩu tạm/.test(await page.locator('#sp').innerText()), 'lần đầu đăng nhập: bắt đổi mật khẩu');
  await page.fill('#sp1', 'Moi@12345'); await page.fill('#sp2', 'Moi@12345'); await page.click('#sp button'); await page.waitForTimeout(2000);
  ok(q("select must_change_pw from app.profiles where email='test.taomoi@bluescope.com'") === 'f' && await page.locator('.cal').count() === 1, 'đổi xong vào ứng dụng');
  await ctx.close(); }
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
