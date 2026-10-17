// v2.9: nhập nhiều dòng, xác nhận giao hàng + cuộn, load thiếu, đang giao / đã giao, đóng xe, giao ngày nghỉ, email.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v29.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v29'; fs.mkdirSync(OUT, { recursive: true });
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

const d = (n) => { const x = new Date(Date.now() + 7 * 3600e3 + n * 864e5); return x.toISOString().slice(0, 10); };
const dmy = s => s.split('-').reverse().join('/');
let bk = '';

await session('cs@demo.vn', async p => {
  S('grid-open'); await p.click('[data-a="go"][data-v="bookings"]'); await p.click('[data-a="newBk"]');
  ok(await p.locator('.g30 h2', { hasText: 'ĐẶT HÀNG' }).count() === 1, 'Đặt hàng opens grid');
  S('grid-paste');
  const day = d(5);
  await p.evaluate(t => { const el = document.querySelector('[data-g="code"][data-i="0"]'); const dt = new DataTransfer(); dt.setData('text/plain', t); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); },
    `Kho\tNgày bốc\tMã KH\tSố tấn\tĐịa chỉ\tRef\tGhi chú\nJM2\t${dmy(day)}\tKH0102\t30\tKCN Phú Mỹ 1\tSO-7788\t\nJM2\t${dmy(day)}\tXX999\t10\t\t\t\nJM2\t${dmy(day)}\tKH0101\t250\t\t\t`);
  await p.waitForTimeout(300);
  const g = await p.locator('.g30 tbody').innerText();
  ok(/Vạn Thành/.test(g) && /Không có mã khách/.test(g) && /Vượt năng lực/.test(g), 'grid: name filled, unknown code + over capacity flagged', g.slice(0, 300));
  ok(/còn/.test(await p.locator('#g30cap').innerText()), 'capacity panel shows remaining');
  await shot(p, '1-grid');
  S('grid-send'); await p.click('[data-a="g30Go"][data-m="hold"]'); await p.waitForTimeout(200);
  ok(/Dòng 2/.test(await p.locator('.modal .err').innerText()), 'unknown customer blocks sending');
  await p.click('[data-a="g30Del"][data-i="1"]'); await p.click('[data-a="g30Go"][data-m="hold"]'); await p.waitForTimeout(200);
  ok(/LƯU ĐỊA CHỈ MỚI/.test(await p.locator('.modal').innerText()), 'asks to save new address');
  await p.selectOption('[data-a30="prov"][data-k="0"]', 'Đồng Nai'); await p.waitForTimeout(150); await shot(p, '1b-ask-addr');
  await p.click('[data-a="g30AskGo"]'); await p.waitForSelector('text=KẾT QUẢ NHẬP NHIỀU DÒNG');
  const res = await p.locator('.modal').innerText();
  ok(/Đã nhận\s*1/.test(res) && /Không nhận\s*1/.test(res), 'result KPIs 1 nhận / 1 không nhận');
  ok(await p.locator('[data-a="v9BulkMove"]').count() > 0, 'over-capacity row has suggested days');
  await shot(p, '2-bulk-result');
  bk = (await p.locator('.modal [data-a="openBk"]').first().textContent()).trim();
  ok(/^BK-JM2-/.test(bk), 'created booking id ' + bk);
  ok(await p.evaluate(() => cust(S.customers.find(c => c.code === 'KH0102').id).addresses.some(a => a.label === 'KCN Phú Mỹ 1')), 'new address saved to customer');
  S('bulk-fix'); await p.click('[data-a="v9BulkFix"]');
  ok(await p.locator('.g30 tbody tr').count() === 1, 'Sửa các dòng lỗi reopens grid with failed row');
  await p.click('.modal [data-a="close"]');

  S('deliv'); await ev(p, id => openBooking(id), bk); await p.waitForSelector('[data-a="v9Deliv"]');
  ok(/Chưa có – CS bấm/.test(await p.locator('.dlv').innerText()), 'booking shows "chưa có danh sách cuộn"');
  await p.click('[data-a="v9Deliv"]');
  await fillArea(p, '#dv-t', 'Whs\tOrder no\tLn\tItmno\tName\tLot number\tAllocated qty\tAttr value\tCustomer\nJM2\tSO-7788\t1\tAZ150\tTôn lạnh\tL-001\t10\t\tC0102\nJM2\tSO-7788\t2\tAZ150\tTôn lạnh\tL-002\t8,88\t\tC0102');
  ok(/THIẾU 11,12 t/.test(await p.locator('.modal').innerText()), 'short 11,12 t detected in preview');
  await shot(p, '3-deliv-short');
  await p.click('[data-a="v9DelivSave"]'); await p.waitForTimeout(1200);
  const t = await toastTxt(p);
  ok(/Đã lưu 2 cuộn/.test(t) && /-2/.test(t), 'delivery saved, remainder split to -2 (Lưu tạm)', t);
  const info = await p.locator('.dlv').innerText();
  ok(/2 cuộn · 18,88 t/.test(info) && new RegExp(bk + '-2').test(info), 'booking shows coils + child link', info.slice(0, 300));
  await shot(p, '4-booking-delivery');
  S('todo'); await p.click('[data-a="go"][data-v="bookings"]'); await p.click('[data-a="blTab"][data-t="todo"]'); await p.waitForTimeout(300);
  ok(await p.locator(`tr.click[data-id="${bk}-2"]`).count() === 1, 'child draft listed in Cần xử lý');
  S('email'); await p.click('.userbtn'); await p.click('[data-a="go"][data-v="profile"]').catch(async () => { await ev(p, () => { V.view = 'profile'; render(); }); });
  await p.waitForSelector('#ep-l'); await p.selectOption('#ep-l', 'urgent'); await p.fill('#ep-a', 'truc@outlook.com'); await p.locator('#ep-a').dispatchEvent('input');
  await p.click('[data-a="v9EmailSave"]'); await p.waitForTimeout(800);
  ok(/Đã lưu cài đặt email/.test(await toastTxt(p)), 'email prefs saved');
});

await session('log@demo.vn', async p => {
  S('assign'); await ev(p, id => openBooking(id), bk); await p.waitForSelector('[data-a="asgSuggest"]');
  await p.click('[data-a="asgSuggest"]'); await p.waitForTimeout(200); await p.click('[data-a="asgConfirm"]'); await p.waitForTimeout(1200);
  ok(await p.locator('.crumb .st-dconf').count() === 1, 'logistics xếp xe -> Đã xác nhận giao hàng (có cuộn)');
  S('load'); await p.click('[data-a="v9Ship"][data-k="load"]'); await p.waitForSelector('[data-f="v9off"]');
  await p.locator('[data-f="v9off"]').nth(1).uncheck(); await p.waitForTimeout(300);
  ok(/không lên xe 8,88 t/.test(await p.locator('.modal').innerText()), 'unloaded coil shows 8,88 t');
  await p.click('[data-a="v9ShipSave"]'); await p.waitForTimeout(400);
  ok(/Nhập ghi chú/.test(await p.locator('.modal .err').innerText()), 'note required for unloaded coils');
  await p.fill('#ld-n', 'Cuộn móp'); await p.locator('#ld-n').dispatchEvent('input');
  await shot(p, '5-load');
  await p.click('[data-a="v9ShipSave"]'); await p.waitForTimeout(1200);
  ok(/Bốc thiếu 8,88 t/.test(await toastTxt(p)), 'load short notified');
  ok(await p.locator('.crumb .st-loaded').count() === 1, 'status Đã load hàng');
  S('transit'); await p.click('[data-a="v9Ship"][data-k="transit"]'); await p.click('[data-a="v9ShipSave"]'); await p.waitForTimeout(1000);
  ok(await p.locator('.crumb .st-transit').count() === 1, 'status Đang giao');
  S('truck-close'); const code = await ev(p, () => trucksOf(V.wh, addDays(TODAY, 5)).find(t => loadOf(t.code) < 0.001).code);
  await ev(p, c => { V.modal = { type: 'truck', code: c, wide: true }; render(); }, code);
  await p.selectOption('#cl-r', 'FULL'); await p.locator('#cl-r').dispatchEvent('change');
  await p.click('[data-a="v9TruckClose"]'); await p.waitForTimeout(1000);
  ok(await p.locator('text=Đã đóng').count() > 0, 'truck closed badge shown');
  ok(await p.locator('[data-a="place"]').count() === 0, 'Xếp đơn hidden for closed truck');
  await shot(p, '6-truck-closed');
  await p.click('[data-a="v9TruckOpen"]'); await p.waitForTimeout(1000);
  ok(await p.locator('[data-a="v9TruckClose"]').count() === 1, 'truck reopened');
  await p.click('.modal [data-a="close"]');
  S('holiday-fleet'); await p.click('[data-a="go"][data-v="fleet"]'); await p.waitForTimeout(300);
  const sun = await ev(p, () => { for (let i = 1; i < 40; i++) { const x = addDays(TODAY, i); if (dow(x) === 0 && !S.fleet[V.wh][x]) return x; } });
  const [yy, mm] = sun.split('-').map(Number);
  await ev(p, ([y, m]) => { if (V.ym[0] !== y || V.ym[1] !== m) { V.ym = [y, m]; render(); } }, [yy, mm]);
  await p.fill(`[data-f="fl"][data-d="${sun}"][data-k="dk"]`, '2'); await p.locator(`[data-f="fl"][data-d="${sun}"][data-k="dk"]`).dispatchEvent('input');
  await p.click('[data-a="fleetSave"]'); await p.waitForTimeout(300);
  ok(/ngày nghỉ: nhập lý do/.test(await p.locator('.err').innerText()), 'holiday fleet needs reason');
  await p.fill(`[data-f="fl"][data-d="${sun}"][data-k="reason"]`, 'Khách cần gấp'); await p.locator(`[data-f="fl"][data-d="${sun}"][data-k="reason"]`).dispatchEvent('input');
  await p.click('[data-a="fleetSave"]'); await p.waitForTimeout(1200);
  await p.click('[data-a="go"][data-v="calendar"]'); await ev(p, ([y, m]) => { V.ym = [y, m]; render(); }, [yy, mm]); await p.waitForTimeout(300);
  ok(await p.locator('.holwarn').count() > 0, 'calendar shows ⚠ CN giao ngày nghỉ');
  await shot(p, '7-holiday-calendar');
});

await session('cs@demo.vn', async p => {
  S('short'); await ev(p, id => openBooking(id), bk); await p.waitForSelector('[data-a="v9Short"]');
  await p.click('[data-a="v9Short"]'); await p.check('input[name="sm"][value="drop"]'); await p.waitForTimeout(300);
  await p.selectOption('#sh-r', 'NO_STOCK'); await p.locator('#sh-r').dispatchEvent('change');
  await p.click('[data-a="v9ShortSave"]'); await p.waitForTimeout(1200);
  ok(/không giao phần còn lại/.test(await toastTxt(p)), 'CS resolved short load (không giao)');
  ok(/Không giao/.test(await p.locator('.dlv').innerText()), 'booking shows Không giao');
});

await session('log@demo.vn', async p => {
  S('delivered'); await ev(p, id => openBooking(id), bk); await p.waitForSelector('[data-a="v9Ship"][data-k="delivered"]');
  await p.click('[data-a="v9Ship"][data-k="delivered"]'); await p.click('[data-a="v9ShipSave"]'); await p.waitForTimeout(1000);
  ok(await p.locator('.crumb .st-delivered').count() === 1, 'status Đã giao');
  await shot(p, '8-delivered');
});

await session('kh@demo.vn', async p => {
  S('customer'); const n = await ev(p, id => (S.bookings.find(b => b.id === id) || {}).status, bk);
  ok(n === 'delivered', 'customer sees own booking as delivered', n);
});

await browser.close();
console.log(`\n${pass} OK, ${errors.length} lỗi`);
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); } else console.log('ALL V29 CHECKS PASSED');
