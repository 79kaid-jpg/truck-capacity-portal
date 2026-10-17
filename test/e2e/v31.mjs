// v3.1: danh mục khách giữ trong trình duyệt, hỏi phiên bản (poll), phát hiện sửa trùng, segment Export, nhập khách từ file.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v31.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v31'; fs.mkdirSync(OUT, { recursive: true });
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
  S('cat');
  const k = await ev(p, () => { const c = JSON.parse(localStorage.getItem('tcp-cat-v1') || '{}'); return [c.key || '', (c.list || []).length]; });
  ok(k[0] && k[1] > 0, 'danh mục khách lưu trong trình duyệt', JSON.stringify(k));
  const lite = await ev(p, async key => (await rpc('get_state', { p_from: TODAY, p_to: TODAY, p_cat: key })).customers, k[0]);
  ok(lite === null, 'get_state không gửi lại danh sách khách khi khóa trùng');
  const n0 = await ev(p, () => S.customers.length);
  await ev(p, () => reload().then(render)); ok(await ev(p, () => S.customers.length) === n0, 'tải lại vẫn đủ khách từ bộ nhớ');

  S('import');
  await ev(p, () => { V.view = 'users'; V.uTab = 'customers'; render(); });
  await p.fill('#cust-q', 'KH0101'); await p.locator('#cust-q').dispatchEvent('input'); await p.waitForTimeout(500);
  ok(await p.locator('tbody tr', { hasText: 'KH0101' }).count() === 1 && await p.locator('tbody tr').count() === 1, 'tìm khách theo mã');
  await p.click('[data-a="impOpen"]');
  const csv = '﻿Mã KH,Tên khách hàng,Segment,Email Sales,Email CS phụ trách,Kho mặc định,Địa chỉ giao,Ngừng dùng,Mã KH ERP\n' +
    '777001,Khách Export A,Export,,cs@demo.vn,JD8,"12 Lê Lợi, Phường 1, Tỉnh Đồng Nai",FALSE,C777001\n' +
    '777002,Khách B,Dân dụng,,,JM2,,FALSE,\n,Thiếu mã,Dân dụng,,,,,,\n';
  fs.writeFileSync('/tmp/kh31.csv', csv);
  await p.setInputFiles('input[data-imp31]', '/tmp/kh31.csv'); await p.waitForTimeout(1200); await shot(p, 'import-preview');
  const pv = await p.locator('.modal').innerText();
  ok(/khách mới\s*2/i.test(pv) && /lỗi \(bỏ qua\)\s*1/i.test(pv), 'xem trước: 2 khách mới, 1 lỗi', pv.slice(400, 900));
  ok(sql("select count(*) from app.customers where code like '7770%'") === '0', 'xem trước chưa ghi');
  await p.click('[data-a="impGo"]'); await p.waitForTimeout(1500);
  ok(sql("select segment||'/'||default_wh||'/'||(select province from app.customer_addresses a where a.customer_id=c.id) from app.customers c where code='777001'") === 'EX/JD8/Đồng Nai', 'đã ghi khách Export + địa chỉ Đồng Nai');
  ok(await ev(p, () => S.customers.some(c => c.code === '777001' && c.segment === 'EX')), 'danh mục mới tải về sau khi nhập');
});

await session('admin@demo.vn', async p => {
  S('conflict');
  const id = sql("select id from app.bookings where status='hold' and cs_user_id='00000000-0000-0000-0000-0000000000c1' order by id limit 1") ||
             sql("select id from app.bookings where status='hold' order by id limit 1");
  await ev(p, x => openBooking(x), id); await p.waitForTimeout(300);
  const r0 = await ev(p, x => bkById(x).rev, id);
  sql(`update app.bookings set note = 'Logistics sửa' where id = '${id}'`);
  const err = await ev(p, async x => { try { await rpc('set_urgent', { p_id: x, p_mode: 'on', p_note: 'gấp' }); return ''; } catch (e) { return e.message; } }, id);
  ok(/vừa được .* cập nhật lúc/.test(err), 'thao tác trên bản cũ bị chặn', err);
  await p.waitForTimeout(800);
  ok(await ev(p, x => bkById(x).rev, id) > r0, 'tự tải lại bản mới sau khi bị chặn');
  const err2 = await ev(p, async x => { try { await rpc('set_urgent', { p_id: x, p_mode: 'on', p_note: 'gấp' }); return ''; } catch (e) { return e.message; } }, id);
  ok(!/vừa được/.test(err2), 'thao tác trên bản mới không bị chặn', err2);

  S('poll');
  await ev(p, () => { V.view = 'calendar'; V.modal = null; render(); document.activeElement && document.activeElement.blur(); });
  const other = sql("select id from app.bookings where status='hold' order by id desc limit 1");
  sql(`update app.bookings set note = 'poll-31' where id = '${other}'`);
  await ev(p, () => poll(false)); await p.waitForTimeout(800);
  ok(await ev(p, x => (bkById(x) || {}).note, other) === 'poll-31', 'hỏi phiên bản thấy thay đổi → tải lại');
  const calls = []; p.on('request', r => { if (r.url().includes('/rpc/')) calls.push(r.url().split('/rpc/')[1]); });
  await ev(p, () => poll(false)); await p.waitForTimeout(500);
  ok(calls.join(',') === 'get_ver', 'không có thay đổi → chỉ gọi get_ver', calls.join(','));
});

await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
