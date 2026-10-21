// v3.50: đặt hàng theo ngày giao, Zone vận chuyển, lịch Ngày giao / Ngày bốc, Logistics đổi ngày bốc sớm hơn.
// v3.50: logo mới ở đầu trang / màn đăng nhập, biểu tượng menu Khai báo xe.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v63.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v63'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn, vp = { width: 1440, height: 1000 }) {
  const ctx = await browser.newContext({ viewport: vp });
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
let D = null;   // ngày giao dùng chung: ngày bốc (giao − 1) có xe, không nghỉ; ngày giao − 2 cũng có xe

// ---------- Admin: Cấu hình › Vận chuyển, bật chế độ ngày giao ----------
await session('admin@demo.vn', async p => {
  S('cfg');
  await p.evaluate(() => { V.cfgTab = 'tr63'; V.wh = 'JM2'; go('config'); }); await p.waitForTimeout(600);
  ok(await p.locator('.main .tabs [data-t="tr63"].on').count() === 1, 'tab Vận chuyển trong Cấu hình');
  const zs = await p.evaluate(() => [...document.querySelectorAll('[data-z63n]')].map(x => x.value).filter(Boolean));
  ok(zs.slice().sort().join('|') === 'Central|Highland|Mekong|South East', 'JM2 có 4 Zone theo file Logistics', zs.join('|'));
  ok(await p.locator('[data-r63z="PMY-BDI"]').inputValue() === 'CT' && await p.locator('[data-r63d="PMY-BDI"]').inputValue() === '2', 'Bình Định: Central, riêng 2 ngày');
  // bật chế độ đặt theo ngày giao
  await p.locator('input[data-k="deliveryMode"]').check(); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => DELIV63()), 'Admin bật đặt theo ngày giao');
  // sửa số ngày riêng + tên gọi khác
  await p.fill('[data-r63d="PMY-DNG"]', '3'); await p.fill('[data-r63a="PMY-DNG"]', 'hai chau; son tra');
  await p.click('[data-a="r63Save"][data-id="PMY-DNG"]'); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => reg('PMY-DNG').days === 3 && /son tra/.test(reg('PMY-DNG').aliases) && guess63('JM2', 'P. Sơn Trà', '') === 'PMY-DNG'), 'lưu số ngày riêng + tên gọi khác');
  await p.fill('[data-r63d="PMY-DNG"]', ''); await p.fill('[data-r63a="PMY-DNG"]', ''); await p.click('[data-a="r63Save"][data-id="PMY-DNG"]'); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => reg('PMY-DNG').days === 4), 'xóa số ngày riêng → theo Zone (4)');
  // thêm Zone + đổi số ngày
  await p.fill('[data-z63n="__new"]', 'Đảo'); await p.fill('[data-z63d="__new"]', '5'); await p.click('[data-a="z63Save"][data-c="__new"]'); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => zonesOf63('JM2').some(z => z.name === 'Đảo' && z.days === 5)), 'thêm Zone mới');
  await shot(p, 'cfg-van-chuyen');
  // đọc file Excel theo mẫu của Logistics (cột "Tỉnh / từ khóa…")
  const t = await p.evaluate(() => trRows63([['Kho', 'Tỉnh / từ khóa trong địa chỉ giao (cách nhau dấu ;)', 'Zone', 'Số ngày riêng (ngoại lệ, trống = theo Zone)', 'Ghi chú'], ['JD8', 'Hà Giang', 'North', '2', ''], ['JM2', 'Bình Định; quy nhon', 'Central', '2', '']]));
  ok(t.kind === 'regions' && t.rows[1].name === 'Bình Định' && t.rows[1].aliases === 'quy nhon' && t.rows[0].days === '2', 'đọc sheet Vùng giao của Logistics', JSON.stringify(t));
  const z = await p.evaluate(() => trRows63([['Kho', 'Zone', 'Số ngày vận chuyển', 'Ghi chú'], ['JM2', 'Highland', '3', '']]));
  ok(z.kind === 'zones' && z.rows[0].days === '3', 'đọc sheet Ngày vận chuyển');
  const pv = await p.evaluate(async () => { const r = await rpc('import_transport', { p_kind: 'zones', p_rows: [{ wh: 'JM2', zone: 'Highland', days: '3' }], p_apply: false }); V.modal = { type: 'tr63imp', parts: { zones: { sheet: 'Ngày vận chuyển', rows: [{ wh: 'JM2', zone: 'Highland', days: '3' }] } }, prev: { zones: r }, err: '', wide: true }; render(); return r; });
  ok(pv.rows[0].act === 'upd' && await p.locator('.modal [data-a="tr63Apply"]').isEnabled(), 'xem trước nạp Excel');
  await p.click('.modal [data-a="tr63Apply"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => zone63('JM2', 'HL').days === 3 && reg('PMY-GLA').days === 3), 'ghi thay đổi từ Excel');
  await p.evaluate(() => rpc('save_zone', { p_wh: 'JM2', p_code: 'HL', p_name: 'Highland', p_days: 2, p_active: null }));
});

// ---------- CS: lưới Đặt hàng theo ngày giao ----------
await session('cs@demo.vn', async p => {
  S('grid');
  D = await p.evaluate(() => { for (let i = 4; i < 20; i++) { const d = addDays(TODAY, i); const l = addDays(d, -1), l2 = addDays(d, -2); if (S.fleet.JM2[l] && !isHoliday('JM2', l) && S.fleet.JM2[l2] && !isHoliday('JM2', l2)) return d; } return null; });
  ok(!!D, 'tìm được ngày giao thử', D);
  ok(await p.evaluate(() => (V.cal63 || 'giao') === 'giao' && !!document.querySelector('.calmode63 [data-m="giao"].on') && !!document.querySelector('.calmode63 select[data-a63="zone"]')), 'CS: lịch mặc định theo Ngày giao + chọn Zone');
  await p.evaluate(d => A.newBk({ d }), D); await p.waitForTimeout(500);
  ok(/ngày giao/i.test(await p.locator('.g30 thead').innerText()) && !/ngày bốc/i.test(await p.locator('.g30 thead').innerText()), 'lưới: cột Ngày giao');
  await p.evaluate(() => { const M = V.modal; const c = S.customers.find(x => x.code === 'KH0106'); Object.assign(M.rows[0], { cid: c.id, q: c.code, tons: '6' }); render(); });
  await p.waitForTimeout(300);
  const st = await p.locator('#g30s-0').innerText();
  const ld = await p.evaluate(d => addDays(d, -1), D);
  ok(st.includes('bốc') && st.includes(await p.evaluate(x => dm(x), ld)), 'dòng hiện ngày bốc = giao − 1', st);
  // dòng giao gấp Đà Nẵng (Central 4 ngày): không kịp → nút Khẩn
  await p.evaluate(() => { const M = V.modal; const c = S.customers.find(x => x.code === 'KH0203'); Object.assign(M.rows[1], { wh: 'JM2', day: addDays(TODAY, 1), cid: c.id, q: c.code, tons: '2' }); render(); });
  await p.waitForTimeout(300);
  ok(/Không kịp giao/.test(await p.locator('#g30s-1').innerText()) && await p.locator('#g30s-1 [data-a="g63urg"]').count() === 1, 'giao gấp: báo không kịp + nút Khẩn');
  await shot(p, 'cs-grid');
  await p.click('#g30s-1 [data-a="g63urg"]'); await p.waitForTimeout(300);
  ok(!/Không kịp giao/.test(await p.locator('#g30s-1 .msg').innerText().catch(() => '')) && /khẩn/.test(await p.locator('#g30s-1').innerText()), 'chọn Khẩn → bốc hôm nay');
  await p.click('[data-a="g30Go"][data-m="hold"]'); await p.waitForTimeout(800);
  if (await p.locator('[data-a="g30AskGo"]').count()) { await p.click('[data-a="g30AskGo"]'); await p.waitForTimeout(800); }
  await p.waitForTimeout(800);
  const bk = await p.evaluate(d => S.bookings.filter(b => b.delivery === d && cust(b.customerId).code === 'KH0106').map(b => ({ id: b.id, date: b.date, st: b.status })), D);
  ok(bk.length === 1 && bk[0].date === ld && bk[0].st === 'hold', 'đặt xong: ngày bốc tự tính, chờ xếp xe', JSON.stringify(bk));
  const ur = await p.evaluate(() => S.bookings.filter(b => cust(b.customerId).code === 'KH0203' && b.delivery === addDays(TODAY, 1)).map(b => ({ date: b.date, urgent: b.urgent })));
  ok(ur.length === 1 && ur[0].urgent && ur[0].date === await p.evaluate(() => TODAY), 'đơn khẩn: bốc hôm nay, cờ khẩn', JSON.stringify(ur));
  await p.evaluate(() => { V.modal = null; render(); });
  // lịch theo ngày giao: đơn nằm ở ô ngày giao
  S('cal');
  await p.evaluate(d => { V.ym = [+d.slice(0, 4), +d.slice(5, 7)]; V.past52 = true; render(); }, D); await p.waitForTimeout(400);
  ok(await p.evaluate(d => { let n = 0; const real = S.bookings, dm0 = dayM; S.bookings = real.map(b => b.delivery ? { ...b, date: b.delivery } : b); try { n = bkOfDay(d).filter(b => cust(b.customerId).code === 'KH0106').length; } finally { S.bookings = real; } return n; }, D) === 1, 'lịch Ngày giao: đơn ở ô ngày giao');
  await p.click('.calmode63 [data-m="boc"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => V.cal63 === 'boc' && !document.querySelector('.calmode63 select')), 'chuyển sang lịch Ngày bốc');
  await p.click('.calmode63 [data-m="giao"]'); await p.waitForTimeout(300);
  await shot(p, 'cs-cal-giao');
  // danh sách: cột Ngày giao
  S('list');
  await p.evaluate(() => go('bookings')); await p.waitForTimeout(1200);
  ok(/ngày giao/i.test(await p.locator('.main thead').first().innerText()), 'Danh sách booking: cột Ngày giao');
  // sửa booking: ô Ngày giao + ngày bốc tự tính
  S('edit');
  await p.evaluate(id => A.editBk({ id }), bk[0].id); await p.waitForTimeout(500);
  ok(await p.locator('#bf-del').inputValue() === D && /Kho bốc/.test(await p.locator('.ld63').innerText()) && await p.locator('#bf-date').count() === 0, 'form: Ngày giao, ngày bốc tự tính (CS không chọn ngày bốc)');
  await shot(p, 'cs-form');
  await p.evaluate(() => { V.modal = null; render(); });
});

// ---------- Logistics: đổi ngày bốc sớm hơn ----------
await session('log@demo.vn', async p => {
  S('log');
  ok(await p.evaluate(() => !!document.querySelector('.calmode63 [data-m="boc"].on')), 'Logistics: lịch mặc định theo Ngày bốc');
  const id = await p.evaluate(d => (S.bookings.find(b => b.delivery === d && cust(b.customerId).code === 'KH0106') || {}).id, D);
  await p.evaluate(id => { V.bk = id; go('booking'); }, id); await p.waitForTimeout(600);
  ok(await p.locator('.main [data-a="ld63Open"]').count() === 1, 'chi tiết booking: nút Đổi ngày bốc');
  await p.click('.main [data-a="ld63Open"]'); await p.waitForTimeout(400);
  const e2 = await p.evaluate(d => addDays(d, -2), D);
  ok(await p.locator(`.modal [data-a="ld63Pick"][data-d="${await p.evaluate(d => addDays(d, -1), D)}"]`).count() === 0, 'không chọn lại ngày hiện tại');
  ok(await p.locator(`.modal [data-a="ld63Pick"][data-d="${D}"]`).count() === 0, 'không có ngày muộn hơn gợi ý');
  await p.click(`.modal [data-a="ld63Pick"][data-d="${e2}"]`); await p.waitForTimeout(200);
  await shot(p, 'log-ld63');
  await p.click('.modal [data-a="ld63Save"]'); await p.waitForTimeout(1200);
  ok(await p.evaluate(([id, e2, d]) => { const b = bkById(id); return b.date === e2 && b.delivery === d; }, [id, e2, D]), 'Logistics bốc sớm hơn 1 ngày, ngày giao giữ nguyên');
  await p.evaluate(() => go('approvals')); await p.waitForTimeout(500);
  ok(/\tgiao\t/i.test(await p.locator('.main thead').first().innerText()), 'Chờ xếp xe: cột Giao');
});

console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); }
await browser.close(); process.exit(errors.length ? 1 : 0);
const fillArea = async (p, sel, v) => { await p.fill(sel, v); await p.locator(sel).dispatchEvent('input'); await p.waitForTimeout(400); await p.locator(sel).dispatchEvent('change'); await p.waitForTimeout(300); };
// màn đăng nhập (trước khi vào app)
{ const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.goto('http://127.0.0.1:8787/'); await p.waitForSelector('#lg-e');
  ok(await p.locator('.loginbox .brand .mark.m63 img[src^="favicon.svg"]').count() === 1, 'màn đăng nhập: logo mới');
  await ctx.close(); }
for (const [w, h] of [[1440, 1000], [390, 844]]) {
  await session('log@demo.vn', async p => {
    S('logo-' + w); await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => render()); await p.waitForTimeout(300);
    const img = p.locator('.top .logo .mark.m63 img');
    ok(await img.count() === 1, `${w}px: logo đầu trang là icon mới`);
    ok(await img.evaluate(i => i.complete && i.naturalWidth > 0), `${w}px: ảnh logo tải được`);
    ok(await p.locator('.top .logo .mark svg').count() === 0, `${w}px: bỏ biểu tượng xe cũ trong vòng tròn`);
    await p.evaluate(() => go('fleet')); await p.waitForTimeout(400);
    ok(await p.locator('.top .logo .mark.m63 img').count() === 1, `${w}px: logo vẫn đúng sau khi vẽ lại`);
    const menuIcon = await p.evaluate(() => [...document.querySelectorAll('[data-a="go"][data-v="fleet"] svg')].map(s => s.outerHTML));
    ok(menuIcon.length >= 1 && menuIcon.every(s => s.includes('cx="8.6"')), `${w}px: menu Khai báo xe dùng biểu tượng coil`, String(menuIcon.length));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${w}px: không cuộn ngang`);
    await shot(p, 'logo-' + w);
  });
}
await browser.close();
console.log(`\n${pass} đạt, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
