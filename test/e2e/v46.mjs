// v3.19: trợ lý (chatbot) – AI giả lập, công cụ chạy thật.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v46.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v46'; fs.mkdirSync(OUT, { recursive: true });
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
  await page.route('**/api/chat', async r => { if (r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }); const b = JSON.parse(r.request().postData()); const ms = b.messages; const last = ms[ms.length - 1].content; const sys = ms[0].content;
    let out; if (/^KẾT QUẢ CÔNG CỤ (\w+): /.test(last)) { const [, t] = last.match(/^KẾT QUẢ CÔNG CỤ (\w+): /); globalThis.__toolRes = last; out = { answer: 'Đã xong công cụ **' + t + '**. [Mở ngày](#day:' + (ms[0].content.match(/"hom_nay":"([^"]+)"/) || [])[1] + ':JM2)' }; }
    else out = globalThis.__plan ? globalThis.__plan(last, sys) : { answer: 'ok' };
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ text: JSON.stringify(out), left: 42 }) }); });
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
const ask = async (p, text) => { if (!await p.locator('#chatPanel').count()) await p.click('#chatFab'); await p.fill('#chatPanel textarea', text); await p.keyboard.press('Enter'); await p.waitForFunction(() => !CHAT.busy, null, { timeout: 15000 }); await p.waitForTimeout(300); };
const hold = q("select b.id from app.bookings b where b.status='hold' and b.day>=current_date and b.warehouse_code='JM2' and exists(select 1 from app.daily_fleet f where f.warehouse_code=b.warehouse_code and f.day=b.day) order by b.day limit 1");
await session('log@demo.vn', async p => {
  S('fab'); ok(await p.locator('#chatFab').count() === 1, 'Logistics thấy nút trợ lý');
  await p.click('#chatFab'); ok(await p.locator('#chatPanel .cs button').count() >= 3, 'mở khung chat + câu gợi ý');
  ok(await p.evaluate(() => sysPrompt().includes('suggest_trucks') && sysPrompt().includes('find_trucks')), 'Logistics có công cụ tìm xe, gợi ý xe');
  S('parse'); ok(await p.evaluate(() => { const a = parseReply('{"tool":"capacity","args":"{\\"date\\":\\"2026-10-19\\"}"}'), b = parseReply({ answer: ['x', 'y'] }), c = parseReply('{"name":"find_trucks","arguments":"{}"}'), d = parseReply('Xin chào');
    return a.tool === 'capacity' && a.args.date === '2026-10-19' && b.answer === 'x\ny' && c.tool === 'find_trucks' && d.answer === 'Xin chào'; }), 'đọc được mọi kiểu trả lời của AI');
  S('suggest'); globalThis.__plan = () => ({ tool: 'suggest_trucks', args: { booking_id: hold } });
  await ask(p, 'Gợi ý xe cho ' + hold);
  ok(await p.evaluate(() => V.view) === 'day' && await p.locator('.tcard.sugg').count() >= 1, 'gợi ý xe → mở màn đội xe, viền chạy quanh xe');
  ok(await p.locator('#chatPanel').count() === 0 && await p.locator('#chatFab.dot').count() === 1, 'gợi ý xe → khung chat tự thu gọn, nút 💬 có chấm báo');
  await p.click('#chatFab'); await p.waitForTimeout(200);
  ok(/"goi_y":\[/.test(globalThis.__toolRes || '') && /ly_do/.test(globalThis.__toolRes), 'kết quả có giải thích lý do chọn xe');
  ok(await p.locator('#chatPanel .cstep').count() >= 1 && /Đã xong công cụ/.test(await p.locator('#chatPanel .cmsg.a').last().innerText()), 'hiện bước + câu trả lời');
  ok(/Còn 42 lượt/.test(await p.locator('#chatPanel .cl').innerText()), 'hiện số lượt còn lại');
  await p.screenshot({ path: `${OUT}/log-suggest.png` });
  S('trucks'); globalThis.__plan = () => ({ tool: 'find_trucks', args: { date: 'ngày mai', wh: 'JM2', min_free: 5 } }); await ask(p, 'xe nào mai còn trống trên 5 MT');
  ok(/"con_trong"/.test(globalThis.__toolRes) || /\[\]/.test(globalThis.__toolRes), 'tìm xe theo chỗ trống');
  S('link'); await p.locator('#chatPanel .cmsg.a a').last().click(); await p.waitForTimeout(400); ok(await p.evaluate(() => V.view) === 'day', 'link trong câu trả lời mở đúng màn');
  S('find'); globalThis.__plan = () => ({ tool: 'find_bookings', args: { status: 'chờ xếp xe', sort: 'wait' } }); await ask(p, 'đơn chờ lâu nhất');
  ok(/"tong_so_don":\d+/.test(globalThis.__toolRes) && /cho_phut/.test(globalThis.__toolRes), 'tìm đơn chờ xếp xe, sắp theo thời gian chờ');
});
await session('admin@demo.vn', async p => {
  S('stats-match'); await p.evaluate(() => { dzInit(); V.dz.tab = 'sales'; go('dash'); }); await p.waitForTimeout(1500);
  const cases = [{ period: 'month' }, { period: 'week' }, { period: 'day' }, { period: 'month', wh: 'JM2' }, { period: 'month', segment: 'DD' }, { period: 'quarter' }];
  for (const a of cases) {
    const r = await p.evaluate(async a => { const T = await TOOLS.stats.run(a); const Z = V.dz; Z.per = a.period; Z.anchor = TODAY; Z.wh = a.wh ? whArg(a.wh) : ''; Z.seg = a.segment || ''; Z.sp = '';
      const [f, t] = dzRange(Z); const D = await rpc('dash_data', { p_from: f, p_to: t }); const rows = (D.b || []).map(x => { const c = D.c[x[3]] || ['', '', 'DD']; return { d: x[1], w: x[2], cid: x[3], s: x[4], t: +x[5] || 0, late: !!x[7], g: c[2], grp: null }; }); rows.forEach(r => r.grp = dzGrp(r));
      Z.D = { rows, pfrom: f }; const { list } = dzScope(Z, f, t); const tot = dzTT(dzSum(list.filter(isBook))), ok = dzTT(dzSum(list.filter(r => r.grp === 'ok')));
      return { tool: [T.tong_da_dat.MT, T.tong_da_dat.don, T.da_co_xe.MT, T.khach_co_dat, T.bi_tu_choi.MT], dash: [tot, list.filter(isBook).length, ok, new Set(list.filter(isBook).map(r => r.cid)).size, dzTT(dzSum(list.filter(r => r.grp === 'rej')))] }; }, a);
    ok(JSON.stringify(r.tool) === JSON.stringify(r.dash), 'thống kê trợ lý khớp Bảng thống kê: ' + JSON.stringify(a), JSON.stringify(r));
  }
  S('panel-match'); const pm = await p.evaluate(async () => { const Z = V.dz; Z.per = 'month'; Z.anchor = TODAY; Z.wh = ''; Z.seg = ''; const [f, t] = dzRange(Z);
    const D = await rpc('dash_data', { p_from: f, p_to: t }); const rows = (D.b || []).map(x => ({ d: x[1], w: x[2], cid: x[3], s: x[4], t: +x[5] || 0, late: !!x[7], g: (D.c[x[3]] || [])[2] })); rows.forEach(r => r.grp = dzGrp(r));
    Z.D = { rows, pfrom: f }; const { list } = dzScope(Z, f, t); const bs = await rpc('booking_stats', { p_from: f, p_to: t }); const R = csCompute(bs, { seg: 'all', wh: 'all', from: f, to: t });
    return { panel: [t2(R.total.t), R.total.n, t2(R.ok.t), t2(R.draft.t)], dash: [t2(dzSum(list.filter(isBook))), list.filter(isBook).length, t2(dzSum(list.filter(r => r.grp === 'ok'))), t2(dzSum(list.filter(r => r.grp === 'draft')))] }; });
  ok(JSON.stringify(pm.panel) === JSON.stringify(pm.dash), 'khung thống kê bên lịch khớp Bảng thống kê (không tính lưu tạm, có đơn đã giao)', JSON.stringify(pm));
  S('stats-link'); const lk = await p.evaluate(async () => (await TOOLS.stats.run({ period: 'month', wh: 'JM2' })).link_bang_thong_ke);
  await p.evaluate(k => { go('calendar'); chatGo(k.slice(1)); }, lk); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => V.view === 'dash' && V.dz.per === 'custom' && V.dz.wh === 'JM2'), 'link mở Bảng thống kê đúng kỳ + kho');
  S('contact'); const r2 = await p.evaluate(async () => TOOLS.find_bookings.run({ customer: 'Anh Ánh' })); ok(/người liên hệ/.test(r2.ghi_chu || '') && r2.tong_so_don != null && r2.tong_MT != null, 'tên người liên hệ → tìm trong ghi chú, trả sẵn tổng');
  ok(await p.evaluate(() => sysPrompt().includes('TUYỆT ĐỐI KHÔNG tự cộng')), 'lời dặn cấm AI tự cộng');
});
await session('cs@demo.vn', async p => {
  S('cs-fill'); const c = q("select name from app.customers where code='KH0102'");
  globalThis.__plan = () => ({ tool: 'fill_request', args: { customer: 'KH0102', wh: 'JM2', date: 'ngày mai', tons: 50, body: 'Anh Ánh 20MT HC 0.5 xanh dương, 30MT Titan' } });
  await p.click('#chatFab'); await ask(p, 'ghi yêu cầu cho KH0102 50 MT mai JM2');
  ok(await p.evaluate(() => V.modal && V.modal.type === 'rqNew' && V.modal.f.cid && /Titan/.test(V.modal.f.body) && V.modal.f.tons === '50'), 'điền sẵn form yêu cầu đặt hàng (chưa gửi)');
  ok(q("select count(*) from app.order_requests") === '0', 'bot không tự gửi');
  ok(await p.locator('#chatPanel').count() === 0 && await p.locator('#chatFab.dot').count() === 1, 'mở form → khung chat tự ẩn, không che form');
  ok(await p.evaluate(() => V.modal.f.day === addDays(TODAY, 1) && /ngày giao/i.test(document.querySelector('label[for="rq-day"]').textContent) && /bốc dự kiến/.test(document.getElementById('rq-cap').textContent)), '"mai" là ngày giao, form hiện ngày bốc dự kiến');
  await p.evaluate(() => { V.modal = null; render(); }); await p.waitForTimeout(200);
  ok(await p.locator('#chatPanel').count() === 1 && /chưa gửi/.test(await p.locator('#chatPanel .cmsg.a').last().innerText()), 'đóng form → khung chat mở lại, báo chưa gửi');
  S('cs-fill-send'); globalThis.__plan = () => ({ tool: 'fill_request', args: { customer: 'KH0102', wh: 'JM2', date: '25/10', body: 'HC 0.45' } });
  await ask(p, 'Hai Yến yêu cầu 50 MT HC 0.45 giao 25/10 kho JM2');
  ok(await p.evaluate(() => V.modal.f.body === 'Hai Yến yêu cầu 50 MT HC 0.45 giao 25/10 kho JM2' && V.modal.f.day.endsWith('-10-25')), 'giữ nguyên câu người dùng, ngày 25/10 là ngày giao');
  await p.click('[data-a="rqSend"]'); await p.waitForTimeout(1500);
  ok(await p.locator('#chatPanel').count() === 1 && /Đã gửi yêu cầu/.test(await p.locator('#chatPanel .cmsg.a').last().innerText()), 'gửi xong → khung chat mở lại, báo đã gửi');
  ok(q("select deliver_on::text like '%-10-25' and day = deliver_on - 1 from app.order_requests order by id desc limit 1") === 't', 'lưu ngày giao, ngày bốc = giao − 1');
  S('cs-order'); globalThis.__plan = () => ({ tool: 'fill_order', args: { customer: 'KH0102', wh: 'JM2', date: 'ngày mai', tons: 12 } }); await ask(p, 'đặt hàng 12 MT KH0102 mai');
  ok(await p.evaluate(() => V.modal && V.modal.type === 'grid' && V.modal.rows[0].cid && V.modal.rows[0].tons === '12'), 'CS: mở lưới đặt hàng điền sẵn');
  await p.evaluate(() => { V.modal = null; render(); });
  ok(await p.evaluate(() => !sysPrompt().includes('suggest_trucks')), 'CS (không có quyền xếp xe) không có công cụ gợi ý xe');
});
await session('kh@demo.vn', async p => { S('kh-off'); ok(await p.locator('#chatFab').count() === 0, 'khách chưa được bật: không có trợ lý'); });
q("update app.customers set chat_enabled=true where id=(select customer_id from app.profiles where email='kh@demo.vn')");
await session('kh@demo.vn', async p => {
  S('kh-on'); ok(await p.locator('#chatFab').count() === 1, 'Admin bật cho khách → khách có trợ lý');
  ok(await p.evaluate(() => !sysPrompt().includes('find_trucks') && sysPrompt().includes('KHÁCH HÀNG')), 'khách không có công cụ xe, prompt giới hạn');
  globalThis.__plan = () => ({ tool: 'capacity', args: { date: 'ngày mai' } }); await p.click('#chatFab'); await ask(p, 'mai còn chỗ không');
  ok(/con_dat_duoc_MT/.test(globalThis.__toolRes) && !/nang_luc/.test(globalThis.__toolRes), 'khách xem MT còn đặt được, không lộ năng lực nội bộ');
  globalThis.__plan = () => ({ tool: 'find_trucks', args: { date: 'ngày mai' } }); await ask(p, 'xe nào');
  ok(!/"con_trong"/.test(globalThis.__toolRes || ''), 'khách gọi công cụ xe → bị chặn');
  await p.screenshot({ path: `${OUT}/kh.png` });
});
await session('admin@demo.vn', async p => {
  S('cfg'); await p.evaluate(() => { V.cfgTab = 'general'; go('config'); }); await p.waitForTimeout(800);
  ok(await p.locator('.chatcfg').count() === 1 && /Hôm nay/.test(await p.locator('#chatStat').innerText()), 'Admin cấu hình trợ lý + xem mức dùng');
  ok(await p.locator('[data-chatlim]').count() === 5 && await p.inputValue('#cl-customer') === '30', 'hạn mức riêng từng vai trò (khách mặc định 30)');
  await p.fill('#cl-sales', '80'); await p.locator('#cl-sales').dispatchEvent('change'); await p.waitForTimeout(1000);
  ok(q("select value->>'sales' from app.settings where key='chatDailyRole'") === '80', 'lưu hạn mức Sales');
  ok(await p.locator('#cf-chatDailyTotal').count() === 1 && /chặn tổng/.test(await p.locator('#chatStat').innerText()), 'chặn tổng toàn hệ thống + mức dùng theo vai trò');
  await p.screenshot({ path: `${OUT}/cfg.png` });
  await p.evaluate(() => { V.view = 'users'; V.uTab = 'customers'; render(); }); await p.waitForTimeout(300);
  ok(await p.locator('[data-a="custChat"]').count() >= 5, 'nút bật trợ lý cho từng khách');
});
// v3.39: "Tháng này có bao nhiêu đơn đang giao?" – công cụ phải thấy đơn Đang giao / Đã bốc
q("with x as (select id, row_number() over (order by id) n from app.bookings where status='ok' and day=app.today()) update app.bookings b set status = case when x.n<=2 then 'transit' else 'loaded' end, loaded_at=now() from x where b.id=x.id and x.n<=3");
await session('log@demo.vn', async p => {
  S('transit');
  const r = await p.evaluate(async () => {
    const s = await TOOLS.stats.run({ period: 'month' });
    const f1 = await TOOLS.find_bookings.run({ status: 'Đang giao hàng', date: 'tháng này' });
    const f2 = await TOOLS.find_bookings.run({ status: 'giao lỗi', period: 'month' });
    const t0 = (await TOOLS.find_trucks.run({ state: 'transit' })).length;
    TODAY = addDays(TODAY, 1); // hôm sau: xe đã xuất phát từ ngày bốc hôm trước
    const t1 = (await TOOLS.find_trucks.run({ state: 'transit' })).length;
    const t2b = (await TOOLS.find_trucks.run({ state: 'transit', date: TODAY })).length;
    return { dg: s.dang_giao.don, db: s.da_boc_chua_xuat_phat.don, f1: f1.tong_so_don, kd: f1.khoang_ngay, f2: f2.tong_so_don, khac: f2.cac_trang_thai_khac, note: f2.ghi_chu, t0, t1, t2b, sys: sysPrompt() };
  });
  ok(r.dg === 2 && r.db === 1, 'stats tách Đang giao (2) và Đã bốc chưa xuất phát (1)', JSON.stringify([r.dg, r.db]));
  ok(r.f1 === 2 && /-01 → .*-3[01]$/.test(r.kd), '"Đang giao hàng" + "tháng này" → đúng trạng thái, cả tháng', JSON.stringify([r.f1, r.kd]));
  ok(r.f2 === 0 && r.khac && Object.keys(r.khac).length > 0 && /Không có đơn/.test(r.note || ''), 'không có đơn ở trạng thái hỏi → kèm các trạng thái khác', JSON.stringify(r.khac));
  ok(r.t0 === 2 && r.t1 === 2 && r.t2b === 0, 'xe đang giao: không ghi ngày thì quét cả các ngày bốc trước', JSON.stringify([r.t0, r.t1, r.t2b]));
  ok(/dang_giao/.test(r.sys) && /không chỉ trả lời "không có"/i.test(r.sys), 'hướng dẫn trợ lý cách trả lời câu "đang giao"');
});
// v3.40: hỏi lúc sáng sớm hôm sau – "Có mấy xe đang giao?" / "Có xe nào đã bốc?" không được ra 0 vì chỉ xem ngày hôm nay
await session('log@demo.vn', async p => {
  S('transit-now');
  const r = await p.evaluate(async () => {
    const d0 = TODAY; TODAY = addDays(TODAY, 1);
    const s = await TOOLS.stats.run({ period: 'day' });
    const h = s.hien_tai;
    const bad = [parseReply('{"answer":"Không có xe đã bốc. Xem trên [Bảng thống kê](#dash:sales:x)"}').answer,
      parseReply('{"answer":"dòng 1\ndòng 2"}').answer, parseReply('{"answer":"Xe "DK-01" đang chạy"}').answer];
    return { d0, dg: h.dang_giao.don, ds: h.dang_giao.ds.length, db: h.da_boc_chua_xuat_phat.don, hn: h.da_boc_hom_nay.don, gn: (h.ngay_boc_gan_nhat_truoc_hom_nay || {}).ngay, pv: h.pham_vi, ky: s.dang_giao.don, bad, sys: sysPrompt() };
  });
  ok(r.dg === 2 && r.ds === 2 && r.db === 1, 'hien_tai: đơn bốc hôm trước vẫn được đếm là Đang giao / Đã bốc', JSON.stringify([r.dg, r.ds, r.db]));
  ok(r.ky === 0 && r.hn === 0 && r.gn === r.d0, 'hôm nay chưa bốc → báo ngày bốc gần nhất', JSON.stringify([r.ky, r.hn, r.gn]));
  ok(/tất cả kho/.test(r.pv) && /tính đến/.test(r.pv), 'không tự lọc kho, nêu giờ tính', r.pv);
  ok(r.bad.every(a => !/^\s*\{/.test(a) && !/"answer"/.test(a)), 'không bao giờ hiện nguyên chữ {"answer":…}', JSON.stringify(r.bad));
  ok(/hien_tai/.test(r.sys) && /KHÔNG truyền wh/.test(r.sys), 'hướng dẫn trợ lý dùng tình trạng hiện tại, không tự lọc kho');
});
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
