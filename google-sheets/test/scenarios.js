// Chạy: node test/scenarios.js
const { makeEnv } = require('./harness');
const E = makeEnv(); const G = E.ctx; let fails = 0, n = 0;
const ok = (name, cond, extra) => { n++; if (!cond) fails++; console.log((cond ? 'OK   ' : 'FAIL ') + name + (extra !== undefined ? ' | ' + JSON.stringify(extra) : '')); };
const throws = (name, fn, re) => { try { fn(); ok(name, false, 'không lỗi'); } catch (e) { ok(name, re.test(e.message), e.message); } };
const as = u => { E.user = u; };
const sh = name => E.ss.getSheetByName(name);
const SH = E.run('SH'), ST = E.run('ST'), B = E.run('B');
const today = G.todayKey_();
const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
const vmDate = ms => E.run('new Date(' + ms + ')');
const nextWork = (k, step = 1) => { let x = G.addDaysKey_(k, step); while (G.parseKey_(x).getDay() === 0) x = G.addDaysKey_(x, step); return x; };
const D = nextWork(nextWork(today)), D1 = nextWork(D), D2 = nextWork(D1);
const capRow = (wh, k) => { const s = sh(SH.CAP); for (let r = 2; r <= s.getLastRow(); r++) { const v = s.get(r, 1); if (isDate(v) && G.dkey_(v) === k && s.get(r, 2) === wh) return r; } return -1; };
const setFleet = (wh, k, dk, cn) => { const r = capRow(wh, k); sh(SH.CAP).set(r, 3, dk); sh(SH.CAP).set(r, 4, cn); return r; };
const bk = id => G.bookings_().find(b => b.id === id);
const calOf = (wh, kind) => { const w = G.cfg_().warehouses.find(x => x.code === wh); return E.ctx.CalendarApp.getCalendarById(kind === 'bk' ? w.calBk : w.calCap); };
const capEvent = (wh, k) => calOf(wh, 'cap').getEventsForDay(G.parseKey_(k)).filter(e => e.getTag('datxe') === 'cap');

// ---------- 1. Cài đặt ----------
as('admin@x.vn'); G.setup();
ok('setup: đủ 7 tab', ['Cấu hình', 'Người dùng', 'Khách hàng', 'Xe & sức chứa', 'Booking', 'Thống kê', 'Nhật ký'].every(x => sh(x)));
ok('setup: xóa Sheet1 trống', !sh('Sheet1'));
ok('setup: named ranges', ['CAP_DK', 'CAP_CN', 'NEAR', 'SPLIT', 'HOLIDAYS'].every(x => E.namedRanges[x]));
ok('setup: 6 lịch (2/kho)', Object.keys(E.calendars).length === 6);
ok('setup: 3 trigger', E.triggers.sort().join() === 'handleEdit,hourlyJob,sendDailySummary', E.triggers);
let days = 0; for (let i = 0; i <= 45; i++) if (G.parseKey_(G.addDaysKey_(today, i)).getDay() !== 0) days++;
ok('setup: dòng sức chứa = ngày làm việc × 3 kho', sh(SH.CAP).getLastRow() - 1 === days * 3, [sh(SH.CAP).getLastRow() - 1, days * 3]);
ok('setup: công thức có trên dòng sức chứa', /CAP_DK/.test(sh(SH.CAP).formulas['2,6']) && /HOLIDAYS/.test(sh(SH.CAP).formulas['2,10']));
const dates = []; for (let r = 2; r <= sh(SH.CAP).getLastRow(); r++) dates.push(G.dkey_(sh(SH.CAP).get(r, 1)));
ok('setup: ngày tăng dần', dates.every((d, i) => i === 0 || d >= dates[i - 1]));
G.setup(); ok('setup chạy lại: không nhân đôi dòng / lịch / trigger', sh(SH.CAP).getLastRow() - 1 === days * 3 && Object.keys(E.calendars).length === 6 && E.triggers.length === 3);
ok('extendCapacityDays: đủ ngày → 0', G.extendCapacityDays(true) === 0);

// Người dùng + khách
const U = sh(SH.USERS);
U.appendRow(['log@x.vn', 'Logistics PMY', 'Logistics', 'PMY', '']); U.appendRow(['cs@x.vn', 'CS Hằng', 'CS', '', '']); U.appendRow(['sales@x.vn', 'Sales An', 'Sales', '', '']);
const C = sh(SH.CUST); C.set(2, 4, 'sales@x.vn'); C.set(2, 5, 'cs@x.vn'); C.set(5, 9, true); // KH0202 ngừng dùng
ok('getFormData: ẩn khách ngừng dùng', (as('cs@x.vn'), G.getFormData().customers.map(c => c.code).join()) === 'KH0101,KH0102,KH0201');
ok('roleOf_: vai trò', G.roleOf_('LOG@x.vn').role === 'Logistics' && G.roleOf_('nobody@x.vn').role === '');

// ---------- 2. Sức chứa ----------
setFleet('PMY', D, 1, 1); setFleet('PMY', D1, 2, 0); // 45 t, 60 t
let cc = G.checkCapacity('PMY', D, '30');
ok('checkCapacity: 45 t, còn 15 sau đặt 30', cc.cap === 45 && cc.avail === 45 && cc.after === 15 && cc.enough && cc.truckType.startsWith('DK'), cc);
ok('checkCapacity: ngày chưa khai báo', G.checkCapacity('PMY', D2, '5').status === 'Chưa mở lịch');

// ---------- 3. Đặt hàng ----------
as('cs@x.vn');
const f = (o) => Object.assign({ wh: 'PMY', date: D, custCode: 'KH0101', tons: '30', ref: 'SO-1', goods: 'Tôn lạnh', region: '', note: '' }, o);
let r1 = G.submitBooking(f({}), 'hold');
ok('CS giữ chỗ 30 t', r1.status === ST.HOLD && /^BK-PMY-\d{6}-001$/.test(r1.id), r1);
ok('mail giữ chỗ tới Logistics + Sales', E.mails.length === 1 && /log@x.vn/.test(E.mails[0].to) && /sales@x.vn/.test(E.mails[0].to), E.mails[0] && E.mails[0].to);
ok('Tháng là chữ yyyy-MM', bk(r1.id).date.slice(0, 7) === sh(SH.BK).get(2, B.MONTH));
let evB = calOf('PMY', 'bk').getEventById(bk(r1.id).eventId);
ok('lịch nội bộ: event ⏳ vàng', evB && evB.title.startsWith('⏳') && evB.color === '5', evB && evB.title);
ok('lịch sức chứa: Còn 15,00 t / 45,00 t', capEvent('PMY', D).length === 1 && capEvent('PMY', D)[0].title === '🟢 Còn 15,00 t / 45,00 t', capEvent('PMY', D).map(e => e.title));
throws('vượt sức chứa bị chặn', () => G.submitBooking(f({ tons: '20', ref: 'SO-2' }), 'hold'), /vượt sức chứa còn lại 15,00 t/);
cc = G.checkCapacity('PMY', D, '20');
ok('gợi ý ngày còn đủ chỗ có D+1', !cc.enough && cc.sugg.some(s => s.date === D1), cc.sugg);
throws('thiếu Ref khi giữ chỗ', () => G.submitBooking(f({ ref: '' }), 'hold'), /Ref/);
throws('ngày đã qua', () => G.submitBooking(f({ date: G.addDaysKey_(today, -1) }), 'hold'), /đã qua/);
throws('ngày chưa khai báo xe: chỉ lưu tạm', () => G.submitBooking(f({ date: D2, tons: '5' }), 'hold'), /chưa khai báo xe/);
let r2 = G.submitBooking(f({ tons: '50', ref: '' , custCode: 'KH0201'}), 'draft');
ok('lưu nháp 50 t không trừ sức chứa', r2.status === ST.DRAFT && G.checkCapacity('PMY', D, '0').avail === 15);
as('sales@x.vn'); throws('Sales không được đặt', () => G.submitBooking(f({ tons: '1' }), 'hold'), /không có quyền/);
as('stranger@x.vn'); throws('Email lạ không được đặt', () => G.submitBooking(f({ tons: '1' }), 'hold'), /chưa khai báo/);

// ---------- 4. Xác nhận / từ chối ----------
as('cs@x.vn'); throws('CS không xác nhận được', () => G.actOnBooking(r1.id, 'confirm', { trucks: 'DK-01' }), /không có quyền/);
as('log@x.vn'); throws('xác nhận thiếu xe', () => G.actOnBooking(r1.id, 'confirm', {}), /xe đã gán/);
E.mails.length = 0;
G.actOnBooking(r1.id, 'confirm', { trucks: 'DK-01' });
ok('Logistics xác nhận', bk(r1.id).status === ST.OK && bk(r1.id).trucks === 'DK-01');
ok('mail xác nhận tới CS + Sales', E.mails.length === 1 && /cs@x.vn/.test(E.mails[0].to) && /sales@x.vn/.test(E.mails[0].to));
evB = calOf('PMY', 'bk').getEventById(bk(r1.id).eventId);
ok('event ✔ xanh, vẫn 1 event', evB.title.startsWith('✔') && evB.color === '2' && calOf('PMY', 'bk').getEventsForDay(G.parseKey_(D)).length === 2);
const act = G.getBookingForAction(r1.id);
ok('getBookingForAction: không có Date (gửi được sang HTML)', !JSON.stringify(act).includes('"20') || Object.values(act.bk).every(v => !isDate(v)), act.bk);
ok('getBookingForAction: role Logistics', act.role === 'Logistics' && act.truckType === 'DK');

as('cs@x.vn'); let r3 = G.submitBooking(f({ tons: '10', ref: 'SO-3', custCode: 'KH0102' }), 'hold');
ok('lịch sức chứa: 40/45 → Gần đầy', capEvent('PMY', D)[0].title === '🟡 Còn 5,00 t / 45,00 t', capEvent('PMY', D).map(e => e.title));
as('log@x.vn'); throws('từ chối thiếu lý do', () => G.actOnBooking(r3.id, 'reject', {}), /lý do/);
G.actOnBooking(r3.id, 'reject', { reason: 'Không còn xe phù hợp' });
ok('từ chối: trạng thái + trả lại sức chứa', bk(r3.id).status === ST.REJECTED && G.checkCapacity('PMY', D, '0').avail === 15);
ok('từ chối: event booking bị xóa', !bk(r3.id).eventId && calOf('PMY', 'bk').getEventsForDay(G.parseKey_(D)).length === 2);
as('cs@x.vn');
throws('đặt lại sang ngày thiếu chỗ', () => G.actOnBooking(r3.id, 'rebook', { date: D, tons: '20' }), /chỉ còn 15,00 t/);
G.actOnBooking(r3.id, 'rebook', { date: D1, tons: '10' });
ok('CS đặt lại booking bị từ chối sang D+1', bk(r3.id).status === ST.HOLD && bk(r3.id).date === D1 && !bk(r3.id).reason);
ok('lịch sức chứa D+1: Còn 50', capEvent('PMY', D1)[0].title === '🟢 Còn 50,00 t / 60,00 t');

// ---------- 5. Đề nghị đổi ngày ----------
as('log@x.vn'); G.actOnBooking(r3.id, 'propose', { date: D, reason: 'Hết xe ngày yêu cầu' });
ok('đề nghị đổi ngày', bk(r3.id).status === ST.RESCHED && bk(r3.id).proposed === D);
ok('đổi ngày trả lại sức chứa D+1', capEvent('PMY', D1)[0].title === '🟢 Còn 60,00 t / 60,00 t');
ok('event ↻', calOf('PMY', 'bk').getEventById(bk(r3.id).eventId).title.startsWith('↻'));
as('cs@x.vn'); G.actOnBooking(r3.id, 'accept', {});
ok('CS chấp nhận ngày đề nghị', bk(r3.id).status === ST.HOLD && bk(r3.id).date === D && !bk(r3.id).proposed);
ok('event dời sang ngày D', G.dkey_(calOf('PMY', 'bk').getEventById(bk(r3.id).eventId).day) === D);
throws('accept khi không ở trạng thái đổi ngày', () => G.actOnBooking(r3.id, 'accept', {}), /không ở trạng thái/);

// ---------- 6. Hủy ----------
G.actOnBooking(r3.id, 'cancel', { reason: 'Khách hủy đơn' });
ok('hủy: trạng thái + event xóa', bk(r3.id).status === ST.CANCELLED && !bk(r3.id).eventId);
throws('hủy lần 2', () => G.actOnBooking(r3.id, 'cancel', { reason: 'x' }), /đã đóng/);
throws('đặt lại booking đã hủy', () => G.actOnBooking(r3.id, 'rebook', { date: D1 }), /đã hủy/);

// ---------- 7. Nháp → giữ chỗ ----------
throws('giữ chỗ nháp 50 t ngày D (còn 15)', () => G.actOnBooking(r2.id, 'rebook', { date: D, tons: '50' }), /chỉ còn/);
G.actOnBooking(r2.id, 'rebook', { date: D1, tons: '50' });
ok('nháp → giữ chỗ D+1', bk(r2.id).status === ST.HOLD && bk(r2.id).date === D1);

// ---------- 8. Sửa tay trên sheet ----------
const capR = capRow('PMY', D); const before = E.toasts.length;
sh(SH.CAP).set(capR, 3, 0); G.handleEdit({ range: sh(SH.CAP).getRange(capR, 3), oldValue: 1, value: 0 });
ok('giảm xe dưới mức đã đặt → hoàn tác', sh(SH.CAP).get(capR, 3) === 1 && /Không giảm được/.test(E.toasts.slice(before).join()));
sh(SH.CAP).set(capR, 3, 2); G.handleEdit({ range: sh(SH.CAP).getRange(capR, 3), oldValue: 1, value: 2 });
ok('tăng xe → lịch sức chứa cập nhật', capEvent('PMY', D)[0].title === '🟢 Còn 45,00 t / 75,00 t', capEvent('PMY', D).map(e => e.title));
const row1 = bk(r1.id).row;
sh(SH.BK).set(row1, B.STATUS, ST.CANCELLED); G.handleEdit({ range: sh(SH.BK).getRange(row1, B.STATUS), oldValue: ST.OK, value: ST.CANCELLED });
ok('sửa tay trạng thái → hoàn tác', bk(r1.id).status === ST.OK);
sh(SH.BK).set(row1, B.TONS, 35); G.handleEdit({ range: sh(SH.BK).getRange(row1, B.TONS), oldValue: 30, value: 35 });
ok('sửa tấn booking đã xác nhận → Chờ xếp xe, gỡ xe', bk(r1.id).status === ST.HOLD && !bk(r1.id).trucks && bk(r1.id).tons === 35);
sh(SH.BK).set(row1, B.TONS, 500); G.handleEdit({ range: sh(SH.BK).getRange(row1, B.TONS), oldValue: 35, value: 500 });
ok('sửa tấn vượt sức chứa → hoàn tác', bk(r1.id).tons === 35);
sh(SH.BK).set(row1, B.DATE, G.parseKey_(D1)); G.handleEdit({ range: sh(SH.BK).getRange(row1, B.DATE), oldValue: String(Date.UTC(+D.slice(0,4), +D.slice(5,7) - 1, +D.slice(8,10)) / 86400000 + 25569), value: '' });
ok('sửa ngày sang D+1 (còn 10 t) → hoàn tác về ngày cũ', bk(r1.id).date === D, bk(r1.id).date);

// ---------- 9. Ngày nghỉ ----------
sh(SH.CFG).set(2, 10, G.parseKey_(D2)); setFleet('PMY', D2, 1, 0);
as('cs@x.vn'); throws('ngày lễ: không giữ chỗ được', () => G.submitBooking(f({ date: D2, tons: '5' }), 'hold'), /ngày nghỉ/);
let sun = today; while (G.parseKey_(sun).getDay() !== 0) sun = G.addDaysKey_(sun, 1);
ok('Chủ nhật: không bốc hàng', G.checkCapacity('PMY', sun, '1').status === 'Không bốc hàng');

// ---------- 10. Nhắc việc ----------
as('log@x.vn'); G.actOnBooking(r1.id, 'confirm', { trucks: 'DK-01, DK-02' });
const row2 = bk(r2.id).row; sh(SH.BK).set(row2, B.CREATED_AT, vmDate(Date.now() - 3 * 3600000));
E.mails.length = 0; as('admin@x.vn');
let nr = G.runReminders();
ok('nhắc quá hạn phản hồi giữ chỗ', nr === 1 && /quá 60 phút/.test(E.mails[0].htmlBody) && /log@x.vn/.test(E.mails[0].to), nr);
ok('chạy lại không nhắc trùng', G.runReminders() === 0);
// booking quá ngày vẫn chờ xếp xe
as('cs@x.vn'); const r4 = G.submitBooking(f({ date: D1, tons: '1', ref: 'SO-4' }), 'hold');
const row4 = bk(r4.id).row; sh(SH.BK).set(row4, B.DATE, G.parseKey_(G.addDaysKey_(today, -2)));
as('admin@x.vn'); E.mails.length = 0; G.runReminders();
ok('nhắc booking quá ngày bốc', E.mails.some(m => /đã qua/.test(m.htmlBody)));
as('log@x.vn'); throws('không xác nhận booking quá ngày', () => G.actOnBooking(r4.id, 'confirm', { trucks: 'x' }), /đã qua/);
// đề nghị đổi ngày chưa xử lý quá 4 giờ
G.actOnBooking(r4.id, 'propose', { date: D1, reason: 'Hết xe ngày yêu cầu' });
sh(SH.BK).set(row4, B.UPDATED_AT, vmDate(Date.now() - 5 * 3600000));
as('admin@x.vn'); E.mails.length = 0; G.runReminders();
ok('nhắc đề nghị đổi ngày quá 4 giờ tới CS', E.mails.some(m => /chưa được CS xử lý/.test(m.htmlBody) && /cs@x.vn/.test(m.to)));

// ---------- 11. Đồng bộ, báo cáo, hourly ----------
G.syncCalendarsNow();
ok('sync: mỗi ngày đã khai báo đúng 1 event sức chứa', [D, D1].every(k => capEvent('PMY', k).length === 1));
G.hourlyJob(); ok('hourlyJob chạy được', true);
E.mails.length = 0; G.sendDailySummary();
ok('email tổng hợp 7:00', E.mails.length === 1 && /Tình hình ngày/.test(E.mails[0].subject) && /Dân dụng/.test(E.mails[0].htmlBody));
// tắt email
sh(SH.CFG).set(11, 2, false); E.mails.length = 0; as('cs@x.vn'); G.submitBooking(f({ date: D1, tons: '1', ref: 'SO-5' }), 'hold');
ok('tắt Gửi email thông báo → không gửi', E.mails.length === 0);
// dialog
E.select(SH.BK, 1); G.showActionDialog(); ok('dialog: chọn dòng tiêu đề → nhắc chọn booking', E.alerts.length === 1);
// Nhật ký
ok('nhật ký có ghi', sh(SH.LOG).getLastRow() > 15, sh(SH.LOG).getLastRow());
// Tài khoản Gmail cá nhân không trả email
as(''); ok('email trống: không chặn (giai đoạn thử)', G.requireRole_(['CS']).role === 'Admin');
// Mã booking tăng dần
ok('mã booking tăng dần trong ngày', bk(r3.id).id.endsWith('-003') || G.bookings_().filter(b => b.id.indexOf('BK-PMY-' + D.slice(2).replace(/-/g, '')) === 0).length >= 3);

console.log(`\n${n - fails}/${n} OK` + (fails ? `, ${fails} FAIL` : ' — ALL PASSED'));
process.exit(fails ? 1 : 0);
