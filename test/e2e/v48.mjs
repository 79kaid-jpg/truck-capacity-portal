// v3.26: thẻ xe không tràn + thao tác theo xe.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v48.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v48'; fs.mkdirSync(OUT, { recursive: true });
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
import { execSync } from 'child_process';
const q = s => execSync(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
q("update app.settings set value='false' where key='requirePicking'");
const row = q("select a.truck_code||'|'||min(b.day)::text from app.allocations a join app.bookings b on b.id=a.booking_id where b.status='ok' and b.day>=current_date and b.warehouse_code='JM2' group by a.truck_code order by count(distinct b.id) desc limit 1");
const [code, day] = row.split('|');
const overflow = p => p.evaluate(() => { const bad = []; document.querySelectorAll('.main .tcard').forEach(c => { const r = c.getBoundingClientRect(); c.querySelectorAll('*').forEach(el => { if (el.closest('.dndtag') || getComputedStyle(el).position === 'absolute') return; const e = el.getBoundingClientRect(); if (e.width && e.right > r.right + 1) bad.push((c.dataset.c || '') + ':' + (el.className || el.tagName) + ':' + Math.round(e.right - r.right)); }); }); return bad; });
await session('log@demo.vn', async p => {
  await p.evaluate(d => { V.wh = 'JM2'; V.whAll = false; V.day = d; V.view = 'day'; render(); }, day); await p.waitForTimeout(500);
  for (const w of [1920, 1440, 1280, 1024, 820, 390]) {
    S('w' + w); await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250);
    let b = await overflow(p); ok(b.length === 0, `màn ${w}px: không chữ nào tràn khỏi thẻ xe`, b.slice(0, 5).join(' '));
    if (w >= 1024) { await p.evaluate(() => A.tkOpen({ k: 'day', r: V.wh + ':' + V.day })); await p.waitForTimeout(400); b = await overflow(p); ok(b.length === 0, `màn ${w}px + khung Trao đổi mở: không tràn`, b.slice(0, 5).join(' ')); await p.evaluate(() => A.tkClose()); }
    if (w === 1280) await shot(p, 'cards-1280');
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  S('label'); ok(await p.evaluate(() => /Còn \d+ MT|Còn \d+,\d+ MT|Trống|Đầy|Quá tải|Chốt|chạy/i.test(document.querySelector('.main .tcard .tc-top').innerText)), 'nhãn trạng thái thẻ xe');
  S('load'); await p.evaluate(c => { V.modal = { type: 'truck', code: c }; render(); }, code); await p.waitForTimeout(300);
  ok(await p.locator('.modal .trk [data-a="trkStart"][data-k="load"]').count() === 1, 'hộp xe có nút Bốc xong cả xe');
  await p.click('.modal .trk [data-a="trkStart"][data-k="load"]'); await p.waitForTimeout(200);
  const n = await p.locator('.modal .trk input[data-trk]:checked').count(); ok(n >= 1, 'danh sách kiểm tra, mặc định đã chọn', n);
  await shot(p, 'truck-load');
  await p.click('.modal .trk [data-a="trkRun"]'); await p.waitForTimeout(2500);
  ok(/Đã bốc \d+\/\d+ đơn/.test(await p.locator('.toast').last().innerText()), 'bốc cả xe xong');
  ok(q(`select count(*) from app.allocations a join app.bookings b on b.id=a.booking_id where a.truck_code='${code}' and b.status='loaded'`) !== '0', 'đơn trên xe chuyển Đã load');
  S('reopen'); ok(await p.locator('.modal .floor [data-a="trkReopen"]').count() >= 1 && await p.locator('.modal .floor [data-a="editAl"]').count() === await p.evaluate(c => liveAllocsOnTruck(c).filter(a => ['hold','ok'].includes(bkById(a.bk).status)).length, code), 'đơn Đã load: nút Sửa đổi thành ↩ Mở lại');
  await p.click('.modal .trk [data-a="trkStart"][data-k="reopen"]'); await p.waitForTimeout(200);
  await p.click('.modal .trk [data-a="trkRun"]'); await p.waitForTimeout(300); ok(/lý do/i.test(await p.locator('.modal .trk .err').innerText()), 'mở lại bắt buộc lý do');
  await p.fill('#trk-rs', 'Xếp lại hàng cho cân xe'); await p.locator('#trk-rs').dispatchEvent('input'); await p.click('.modal .trk [data-a="trkRun"]'); await p.waitForTimeout(2500);
  ok(q(`select count(*) from app.allocations a join app.bookings b on b.id=a.booking_id where a.truck_code='${code}' and b.status='loaded'`) === '0', 'mở lại cả xe → đơn về Đã xếp xe');
  ok(await p.locator('.modal .floor [data-a="editAl"]').count() >= 1, 'sau khi mở lại: sửa phần hàng được');
  await p.click('.modal .trk [data-a="trkStart"][data-k="load"]'); await p.waitForTimeout(200); await p.click('.modal .trk [data-a="trkRun"]'); await p.waitForTimeout(2500);
  S('go'); await p.click('.modal .trk [data-a="trkStart"][data-k="go"]'); await p.waitForTimeout(200);
  ok(await p.locator('#trk-eta').count() === 1, 'Xe xuất phát có giờ dự kiến tới');
  await p.click('.modal .trk [data-a="trkRun"]'); await p.waitForTimeout(2500);
  ok(q(`select count(*) from app.allocations a join app.bookings b on b.id=a.booking_id where a.truck_code='${code}' and b.status='transit'`) !== '0', 'đơn chuyển Đang giao');
  ok(q(`select count(*) from app.notifications where type='Đang giao'`) !== '0', 'thông báo Đang giao vẫn gửi');
  S('departed'); ok(await p.locator('#ti-c').isDisabled() && await p.locator('#ti-p').isEnabled(), 'xe đã chạy: khóa tải trọng, vẫn sửa biển số');
  ok(await p.locator('.modal [data-a="v9TruckClose"]').count() === 0 && await p.locator('.modal .floor [data-a="trkReopen"],.modal .floor [data-a="editAl"]').count() === await p.evaluate(c => liveAllocsOnTruck(c).filter(a => ['hold','ok'].includes(bkById(a.bk).status)).length, code), 'xe đã chạy: ẩn Chốt xe, không Sửa / Mở lại đơn đã đi');
  ok(!/CÒN \d/i.test(await p.locator('.modal .truckbig').innerText()), 'không còn nhãn "Còn x MT" trên xe đã chạy');
  S('deliver'); await p.locator('.modal .trk [data-a="trkOne"][data-k="delivered"]').first().click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => V.modal && V.modal.type === 'ship'), 'Đã giao từng điểm mở hộp xác nhận');
  await p.evaluate(() => A.v9ShipSave()); await p.waitForTimeout(2000);
  ok(await p.evaluate(c => V.modal && V.modal.type === 'truck' && V.modal.code === c, code), 'xác nhận xong quay lại đúng hộp xe');
  ok(q(`select count(*) from app.allocations a join app.bookings b on b.id=a.booking_id where a.truck_code='${code}' and b.status='delivered'`) === '1', 'một đơn Đã giao');
  await shot(p, 'truck-after');
  S('closed-label'); ok(!/Đã đóng/.test(await p.locator('.modal').innerText()), 'không còn chữ "Đã đóng"');
});
await session('log@demo.vn', async p => {
  S('suggest-merge'); const r = await p.evaluate(() => {
    const d = S.bookings.find(b => b.wh === 'JM2' && b.date >= TODAY && trucksOf('JM2', b.date).filter(t => t.type === 'DK' && !loadOf(t.code)).length && trucksOf('JM2', b.date).filter(t => t.type === 'XT' && !loadOf(t.code)).length).date;
    const dk = trucksOf('JM2', d).find(t => t.type === 'DK' && !loadOf(t.code));
    const base = S.bookings.find(b => b.wh === 'JM2' && b.date === d);
    const O = { ...base, id: 'BK-T-OK', status: 'ok', region: 'PMY-HCM', date: d, lines: [{ ...base.lines[0], t: dk.cap - 4 }], addrText: 'Kho Bình Chánh, TP.HCM', customerId: base.customerId };
    const H = { ...base, id: 'BK-T-HOLD', status: 'hold', region: 'NONE', date: d, lines: [{ ...base.lines[0], t: 4 }], addrText: 'Lô B5-9 Đường D4, Kcn Tân Phú Trung, Củ Chi, Hồ Chí Minh', customerId: O.customerId };
    S.bookings = [...S.bookings, O, H]; S._bm = null; S.allocs = [...S.allocs, { id: 'al-t', bk: O.id, truck: dk.code, tons: dk.cap - 4 }];
    const g = regionGuess(H); const s = suggestFor(H); const res = { guess: g, first: s.rows[0] && s.rows[0].code, dk: dk.code, why: s.rows[0] && s.rows[0].why };
    S.bookings = S.bookings.filter(b => !b.id.startsWith('BK-T-')); S._bm = null; S.allocs = S.allocs.filter(a => a.id !== 'al-t'); return res; });
  ok(r.guess === 'PMY-HCM', 'đoán khu vực từ địa chỉ "Củ Chi, Hồ Chí Minh" → TP.HCM', JSON.stringify(r));
  ok(r.first === r.dk && r.why === 'same', 'đơn 4 MT ghép vào đầu kéo đang chở cùng TP.HCM thay vì mở xe thùng trống', JSON.stringify(r));
  const g2 = await p.evaluate(() => [regionGuess({ wh: 'JM2', addrText: 'KCN Biên Hòa, Đồng Nai' }), regionGuess({ wh: 'JM2', addrText: 'Phường 7, Quận 3, TP.HCM' }), regionGuess({ wh: 'JM2', addrText: 'Xã ABC' })]);
  ok(g2[0] === 'PMY-DNA' && g2[1] === 'PMY-HCM' && g2[2] === null, 'đoán khu vực: Đồng Nai, TP.HCM, không đoán bừa', JSON.stringify(g2));
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
