/**
 * ĐẶT XE – bản nhanh trên Google Sheets + Google Calendar (Apps Script)
 * Mô hình "đặt chỗ máy bay": khách xem số tấn còn đặt được theo ngày, CS giữ chỗ, Logistics xác nhận / từ chối / đề nghị đổi ngày.
 *
 * Cài đặt: Tiện ích mở rộng → Apps Script → dán file này (Code.gs), thêm 2 file HTML (Sidebar, Action) → chạy hàm setup() một lần.
 * Sau đó dùng menu "Đặt xe" trên Google Sheet.
 */

// ===================== Hằng số =====================
const SH = {
  CFG: 'Cấu hình', USERS: 'Người dùng', CUST: 'Khách hàng', CAP: 'Xe & sức chứa',
  BK: 'Booking', STAT: 'Thống kê', LOG: 'Nhật ký'
};
const ST = { DRAFT: 'Nháp', HOLD: 'Chờ xếp xe', OK: 'Đã xác nhận', RESCHED: 'Đề nghị đổi ngày', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
const ACTIVE = [ST.HOLD, ST.OK];                // trừ vào sức chứa
const ROLES = ['Admin', 'Logistics', 'CS', 'Sales'];
const TZ = 'Asia/Ho_Chi_Minh';

// Cột sheet Booking (1-based)
const B = { ID: 1, DATE: 2, WH: 3, CODE: 4, CUST: 5, SEG: 6, TONS: 7, GOODS: 8, REF: 9, REGION: 10, STATUS: 11, TRUCKS: 12,
  REASON: 13, PROPOSED: 14, CREATED_BY: 15, CREATED_AT: 16, UPDATED_AT: 17, UPDATED_BY: 18, MONTH: 19, EVENT_ID: 20, REMINDED: 21 };
const B_HEAD = ['Mã booking', 'Ngày bốc', 'Kho', 'Mã KH', 'Khách hàng', 'Segment', 'Tấn', 'Hàng hóa / ghi chú', 'Ref (SO)', 'Khu vực',
  'Trạng thái', 'Xe đã gán', 'Lý do', 'Ngày đề xuất', 'Người tạo', 'Tạo lúc', 'Cập nhật lúc', 'Người cập nhật', 'Tháng', 'Calendar event', 'Đã nhắc lúc'];
// Cột sheet Xe & sức chứa
const C = { DATE: 1, WH: 2, DK: 3, CN: 4, NOTE: 5, CAP: 6, OK: 7, HOLD: 8, AVAIL: 9, STATUS: 10 };
const C_HEAD = ['Ngày', 'Kho', 'Số đầu kéo (DK)', 'Số container (CN)', 'Lý do giảm xe', 'Sức chứa (t)', 'Đã xác nhận (t)', 'Giữ chỗ (t)', 'Có thể đặt (t)', 'Trạng thái'];
// Cột bảng kho trong Cấu hình (bắt đầu cột D)
const W = { CODE: 4, NAME: 5, LOG_EMAIL: 6, CAL_BK: 7, CAL_CAP: 8 };

// ===================== Menu =====================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Đặt xe')
    .addItem('Đặt hàng mới…', 'showBookingForm')
    .addItem('Xử lý booking đang chọn…', 'showActionDialog')
    .addSeparator()
    .addItem('Thêm ngày vào Xe & sức chứa (45 ngày tới)', 'extendCapacityDays')
    .addItem('Đồng bộ Google Calendar ngay', 'syncCalendarsNow')
    .addItem('Gửi nhắc việc ngay', 'runReminders')
    .addItem('Gửi email tổng hợp ngay', 'sendDailySummary')
    .addSeparator()
    .addItem('Cài đặt lần đầu / sửa cấu trúc (setup)', 'setup')
    .addToUi();
}

// ===================== Cài đặt lần đầu =====================
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);
  setupConfig_(ss);
  setupUsers_(ss);
  setupCustomers_(ss);
  setupBooking_(ss);
  setupCapacity_(ss);
  setupStats_(ss);
  setupLog_(ss);
  ensureCalendars_();
  extendCapacityDays(true);
  installTriggers_();
  ['Sheet1', 'Trang tính1'].forEach(n => { const s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1 && s.getLastRow() === 0) ss.deleteSheet(s); });
  ss.setActiveSheet(ss.getSheetByName(SH.CAP));
  log_('setup', 'Cài đặt / cập nhật cấu trúc');
  toast_('Đã cài đặt xong. Khai báo số xe ở tab "' + SH.CAP + '", rồi dùng menu Đặt xe.');
}

function sheet_(name) { return SpreadsheetApp.getActive().getSheetByName(name); }
function getOrCreate_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function header_(sh, heads, color) {
  sh.getRange(1, 1, 1, heads.length).setValues([heads]).setFontWeight('bold').setBackground(color || '#1F2C3D').setFontColor('#FFFFFF').setWrap(true);
  sh.setFrozenRows(1);
}

function setupConfig_(ss) {
  const sh = getOrCreate_(ss, SH.CFG);
  if (sh.getRange('A1').getValue() !== 'Tham số') {
    sh.clear();
    sh.getRange('A1:B1').setValues([['Tham số', 'Giá trị']]);
    sh.getRange('A2:B11').setValues([
      ['Tải trọng đầu kéo DK (t)', 30], ['Tải trọng container CN (t)', 15], ['Ngưỡng gần đầy', 0.8], ['Đơn > X tấn gợi ý DK', 15],
      ['Hạn phản hồi giữ chỗ (phút)', 60], ['Nhắc đề nghị đổi ngày sau (giờ)', 4], ['Chủ nhật nghỉ', true],
      ['Email nhận báo cáo 7:00 (cách nhau dấu phẩy)', Session.getEffectiveUser().getEmail()], ['Số ngày mở lịch trước', 45], ['Gửi email thông báo', true]]);
    sh.getRange('B4').setNumberFormat('0%');
    sh.getRange('D1:H1').setValues([['Mã kho', 'Tên kho', 'Email Logistics (dấu phẩy)', 'Calendar booking (tự tạo)', 'Calendar sức chứa (tự tạo)']]);
    sh.getRange('D2:F4').setValues([['PMY', 'Kho Phú Mỹ', ''], ['CLO', 'Kho Cửa Lò', ''], ['HPG', 'Kho Hải Phòng', '']]);
    sh.getRange('J1').setValue('Ngày nghỉ lễ');
    sh.getRange('L1:M1').setValues([['Loại lý do', 'Lý do']]);
    sh.getRange('L2:M10').setValues([['Từ chối', 'Không còn xe phù hợp'], ['Từ chối', 'Không có xe đi tuyến này'], ['Từ chối', 'Lý do khác'],
      ['Đổi ngày', 'Hết xe ngày yêu cầu'], ['Đổi ngày', 'Không có xe đi tuyến này'], ['Đổi ngày', 'Lý do khác'],
      ['Hủy', 'Khách hủy đơn'], ['Hủy', 'Nhập sai thông tin'], ['Hủy', 'Lý do khác']]);
    [['A1:B1'], ['D1:H1'], ['J1'], ['L1:M1']].forEach(r => sh.getRange(r[0]).setFontWeight('bold').setBackground('#1F2C3D').setFontColor('#FFFFFF'));
    sh.setColumnWidth(1, 300); sh.setColumnWidths(4, 5, 170); sh.setColumnWidth(13, 220);
    sh.getRange('J2:J60').setNumberFormat('dd/mm/yyyy');
  }
  const names = { CAP_DK: 'B2', CAP_CN: 'B3', NEAR: 'B4', SPLIT: 'B5', HOLIDAYS: 'J2:J200' };
  Object.keys(names).forEach(n => ss.setNamedRange(n, sh.getRange(names[n])));
}

function setupUsers_(ss) {
  const sh = getOrCreate_(ss, SH.USERS);
  if (sh.getLastRow() === 0) {
    header_(sh, ['Email', 'Họ tên', 'Vai trò', 'Kho (Logistics)', 'Ghi chú']);
    sh.appendRow([Session.getEffectiveUser().getEmail(), 'Admin', 'Admin', '', 'Người cài đặt']);
    sh.setColumnWidths(1, 5, 180);
  }
  sh.getRange('C2:C500').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ROLES, true).build());
}

function setupCustomers_(ss) {
  const sh = getOrCreate_(ss, SH.CUST);
  if (sh.getLastRow() === 0) {
    header_(sh, ['Mã KH', 'Tên khách hàng', 'Segment', 'Email Sales', 'Email CS phụ trách', 'Kho mặc định', 'Địa chỉ giao', 'Khu vực', 'Ngừng dùng']);
    sh.getRange(2, 1, 4, 9).setValues([
      ['KH0101', 'Vạn Đạt Thành', 'Dân dụng', '', '', 'PMY', 'Bà Rịa, TP. Hồ Chí Minh', 'Vũng Tàu', false],
      ['KH0102', 'Vạn Thành', 'Dân dụng', '', '', 'PMY', 'Xã Bình Chánh, TP. Hồ Chí Minh', 'TP.HCM', false],
      ['KH0201', 'Lysaght', 'Dự án', '', '', 'PMY', 'Phường Long Bình, Đồng Nai', 'Đồng Nai', false],
      ['KH0202', 'Austdoor Nhơn Trạch', 'Dự án', '', '', 'PMY', 'Nhơn Trạch, Đồng Nai', 'Đồng Nai', false]]);
    sh.setColumnWidths(1, 9, 150); sh.setColumnWidth(2, 220); sh.setColumnWidth(7, 260);
  }
  sh.getRange('C2:C1000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Dân dụng', 'Dự án'], true).build());
  sh.getRange('I2:I1000').insertCheckboxes();
}

function setupBooking_(ss) {
  const sh = getOrCreate_(ss, SH.BK);
  if (sh.getLastRow() === 0) header_(sh, B_HEAD);
  sh.getRange('B2:B').setNumberFormat('dd/mm/yyyy'); sh.getRange('N2:N').setNumberFormat('dd/mm/yyyy');
  sh.getRange('P2:Q').setNumberFormat('dd/mm/yyyy hh:mm'); sh.getRange('U2:U').setNumberFormat('dd/mm/yyyy hh:mm');
  sh.getRange('G2:G').setNumberFormat('#,##0.00');
  sh.getRange('S2:S').setNumberFormat('@'); // tháng dạng chữ yyyy-MM, tránh Sheets tự đổi thành ngày
  sh.getRange('K2:K').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.values(ST), true).build());
  sh.setColumnWidth(B.ID, 150); sh.setColumnWidth(B.CUST, 200); sh.setColumnWidth(B.GOODS, 220); sh.setColumnWidth(B.STATUS, 130);
  sh.hideColumns(B.MONTH, 3);
  // Màu theo trạng thái
  const rng = sh.getRange('A2:U');
  const color = (txt, bg) => SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$K2="' + txt + '"').setBackground(bg).setRanges([rng]).build();
  sh.setConditionalFormatRules([color(ST.OK, '#E2F2E8'), color(ST.HOLD, '#FBEFD3'), color(ST.RESCHED, '#E3ECFA'), color(ST.REJECTED, '#F8E1DF'),
    color(ST.CANCELLED, '#EEEEEE'), color(ST.DRAFT, '#F4F4F0')]);
  // Chỉ cảnh báo khi sửa tay các cột do script quản lý
  const prot = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).filter(p => p.getDescription() === 'datxe-auto');
  if (!prot.length) sh.getRange('O2:U').protect().setDescription('datxe-auto').setWarningOnly(true);
}

function setupCapacity_(ss) {
  const sh = getOrCreate_(ss, SH.CAP);
  if (sh.getLastRow() === 0) header_(sh, C_HEAD);
  sh.getRange('A2:A').setNumberFormat('dd/mm/yyyy (ddd)');
  sh.getRange('F2:I').setNumberFormat('#,##0.00');
  sh.setColumnWidths(1, 10, 120); sh.setColumnWidth(5, 200);
  const rng = sh.getRange('A2:J');
  const rule = (txt, bg) => SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$J2="' + txt + '"').setBackground(bg).setRanges([rng]).build();
  sh.setConditionalFormatRules([rule('Còn chỗ', '#E2F2E8'), rule('Gần đầy', '#FBEFD3'), rule('Đã đầy', '#F8E1DF'), rule('Không bốc hàng', '#EEEEEE')]);
  const prot = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).filter(p => p.getDescription() === 'datxe-cap');
  if (!prot.length) sh.getRange('F2:J').protect().setDescription('datxe-cap').setWarningOnly(true);
}

function setupStats_(ss) {
  const sh = getOrCreate_(ss, SH.STAT);
  sh.clear();
  sh.getRange('A1').setValue('THỐNG KÊ ĐẶT HÀNG').setFontWeight('bold').setFontSize(14);
  sh.getRange('B2').setNumberFormat('@').setBackground('#FFF8DC');
  sh.getRange('A2:B2').setValues([['Tháng (yyyy-MM)', Utilities.formatDate(new Date(), TZ, 'yyyy-MM')]]);
  sh.getRange('A4:H4').setValues([['Segment', ST.OK, ST.HOLD, ST.RESCHED, ST.DRAFT, 'Tổng đã đặt', 'Đã xác nhận đến hôm qua', ST.REJECTED + ' (nhu cầu bị mất)']]);
  ['Dân dụng', 'Dự án', 'Tổng'].forEach((seg, i) => {
    const r = 5 + i;
    sh.getRange(r, 1).setValue(seg);
    const segCond = seg === 'Tổng' ? '' : ',Booking!$F:$F,$A' + r;
    [ST.OK, ST.HOLD, ST.RESCHED, ST.DRAFT].forEach((st, j) => {
      sh.getRange(r, 2 + j).setFormula('=SUMIFS(Booking!$G:$G,Booking!$S:$S,$B$2,Booking!$K:$K,"' + st + '"' + segCond + ')');
    });
    sh.getRange(r, 6).setFormula('=SUM(B' + r + ':E' + r + ')');
    sh.getRange(r, 7).setFormula('=SUMIFS(Booking!$G:$G,Booking!$S:$S,$B$2,Booking!$K:$K,"' + ST.OK + '",Booking!$B:$B,"<"&TODAY()' + segCond + ')');
    sh.getRange(r, 8).setFormula('=SUMIFS(Booking!$G:$G,Booking!$S:$S,$B$2,Booking!$K:$K,"' + ST.REJECTED + '"' + segCond + ')');
  });
  sh.getRange('A10').setValue('Theo nửa tháng (tổng đã đặt)').setFontWeight('bold');
  sh.getRange('A11:B12').setFormulas([
    ['="Ngày 1 – 15"', '=SUMPRODUCT((Booking!$S$2:$S=$B$2)*ISNUMBER(MATCH(Booking!$K$2:$K,{"' + [ST.OK, ST.HOLD, ST.RESCHED, ST.DRAFT].join('","') + '"},0))*(DAY(Booking!$B$2:$B)<=15)*Booking!$G$2:$G)'],
    ['="Ngày 16 – cuối tháng"', '=SUMPRODUCT((Booking!$S$2:$S=$B$2)*ISNUMBER(MATCH(Booking!$K$2:$K,{"' + [ST.OK, ST.HOLD, ST.RESCHED, ST.DRAFT].join('","') + '"},0))*(DAY(Booking!$B$2:$B)>15)*Booking!$G$2:$G)']]);
  sh.getRange('A14').setValue('Khách đặt nhiều nhất trong tháng').setFontWeight('bold');
  sh.getRange('A15').setFormula('=IFERROR(QUERY(Booking!$A$2:$U,"select E, F, sum(G) where S = \'"&$B$2&"\' and K <> \'' + ST.REJECTED + '\' and K <> \'' + ST.CANCELLED + '\' group by E, F order by sum(G) desc label E \'Khách hàng\', F \'Segment\', sum(G) \'Tấn\'",0),"Chưa có đơn")');
  sh.getRange('E14').setValue('Theo Sales (tổng đã đặt)').setFontWeight('bold');
  sh.getRange('E15').setFormula('=IFERROR(QUERY({Booking!$E$2:$E,Booking!$G$2:$G,Booking!$K$2:$K,Booking!$S$2:$S,ARRAYFORMULA(IFERROR(VLOOKUP(Booking!$D$2:$D,\'' + SH.CUST + '\'!$A:$D,4,FALSE),""))},"select Col5, sum(Col2) where Col4 = \'"&$B$2&"\' and Col3 <> \'' + ST.REJECTED + '\' and Col3 <> \'' + ST.CANCELLED + '\' and Col1 is not null group by Col5 order by sum(Col2) desc label Col5 \'Email Sales\', sum(Col2) \'Tấn\'",0),"Chưa có đơn")');
  sh.getRange('A4:H4').setFontWeight('bold').setBackground('#F0EBE0').setWrap(true);
  sh.getRange('B5:H7').setNumberFormat('#,##0.00'); sh.getRange('B11:B12').setNumberFormat('#,##0.00');
  sh.getRange('A7:H7').setFontWeight('bold');
  sh.setColumnWidths(1, 8, 140);
}

function setupLog_(ss) {
  const sh = getOrCreate_(ss, SH.LOG);
  if (sh.getLastRow() === 0) { header_(sh, ['Thời điểm', 'Người thực hiện', 'Đối tượng', 'Nội dung']); sh.setColumnWidth(4, 520); }
  sh.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
}

// ===================== Tiện ích chung =====================
function cfg_() {
  const sh = sheet_(SH.CFG);
  const v = sh.getRange('B2:B11').getValues().map(r => r[0]);
  const whRows = sh.getRange(2, W.CODE, 20, 5).getValues().filter(r => r[0]);
  const hol = sh.getRange('J2:J200').getValues().map(r => r[0]).filter(d => d instanceof Date).map(dkey_);
  const reasons = sh.getRange('L2:M60').getValues().filter(r => r[0] && r[1]);
  return {
    capDK: +v[0] || 30, capCN: +v[1] || 15, near: +v[2] || 0.8, split: +v[3] || 15, slaMin: +v[4] || 60, reschedH: +v[5] || 4,
    sundayOff: v[6] === true || String(v[6]).toUpperCase() === 'TRUE', summaryTo: String(v[7] || ''), daysAhead: +v[8] || 45,
    mailOn: !(v[9] === false || String(v[9]).toUpperCase() === 'FALSE'),
    warehouses: whRows.map((r, i) => ({ code: String(r[0]).trim(), name: r[1], logEmail: String(r[2] || ''), calBk: r[3], calCap: r[4], row: 2 + i })),
    holidays: hol, reasons: reasons.map(r => ({ kind: r[0], name: r[1] }))
  };
}
function dkey_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function parseKey_(k) { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function todayKey_() { return dkey_(new Date()); }
function addDaysKey_(k, n) { const d = parseKey_(k); d.setDate(d.getDate() + n); return dkey_(d); }
function dm_(k) { return k ? k.slice(8, 10) + '/' + k.slice(5, 7) : ''; }
function t2_(n) { return (Math.round((+n || 0) * 100) / 100).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function me_() { return (Session.getActiveUser().getEmail() || '').toLowerCase(); }
function toast_(msg) { try { SpreadsheetApp.getActive().toast(msg, 'Đặt xe', 8); } catch (e) { } }
function log_(obj, text) {
  const sh = sheet_(SH.LOG); if (!sh) return;
  sh.appendRow([new Date(), me_() || '(không xác định)', obj, text]);
}
function isOff_(cfg, key) { return (cfg.sundayOff && parseKey_(key).getDay() === 0) || cfg.holidays.indexOf(key) >= 0; }

/** Vai trò của người đang thao tác. Sheet Người dùng trống → mọi người là Admin (giai đoạn thử). */
function roleOf_(email) {
  const sh = sheet_(SH.USERS);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
  if (!rows.length) return { role: 'Admin', name: email, whs: [] };
  const r = rows.find(x => String(x[0]).toLowerCase().trim() === String(email || '').toLowerCase().trim());
  if (!r) return { role: '', name: email, whs: [] };
  return { role: r[2], name: r[1] || email, whs: String(r[3] || '').split(',').map(s => s.trim()).filter(Boolean) };
}
function requireRole_(roles) {
  const email = me_();
  const r = roleOf_(email);
  if (!email && sheet_(SH.USERS).getLastRow() > 1) {
    // Tài khoản Gmail cá nhân không trả email người dùng cho script: chỉ chặn khi có thể xác định
    return { role: 'Admin', name: '(không xác định)', whs: [] };
  }
  if (r.role !== 'Admin' && roles.indexOf(r.role) < 0) throw new Error('Tài khoản ' + (email || '?') + ' (vai trò "' + (r.role || 'chưa khai báo') + '") không có quyền thao tác này. Liên hệ Admin thêm vào tab Người dùng.');
  return r;
}

// ===================== Đọc dữ liệu =====================
function customers_() {
  const sh = sheet_(SH.CUST);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues().filter(r => r[0] && r[1]).map(r => ({
    code: String(r[0]).trim(), name: String(r[1]).trim(), segment: r[2], sales: String(r[3] || '').trim(), cs: String(r[4] || '').trim(),
    wh: String(r[5] || '').trim(), addr: r[6], region: r[7], active: r[8] !== true
  }));
}
function bookings_() {
  const sh = sheet_(SH.BK);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, B_HEAD.length).getValues().map((r, i) => ({
    row: 2 + i, id: r[B.ID - 1], date: r[B.DATE - 1] instanceof Date ? dkey_(r[B.DATE - 1]) : String(r[B.DATE - 1] || ''),
    wh: String(r[B.WH - 1] || ''), code: r[B.CODE - 1], cust: r[B.CUST - 1], seg: r[B.SEG - 1], tons: +r[B.TONS - 1] || 0, goods: r[B.GOODS - 1],
    ref: r[B.REF - 1], region: r[B.REGION - 1], status: r[B.STATUS - 1], trucks: r[B.TRUCKS - 1], reason: r[B.REASON - 1],
    proposed: r[B.PROPOSED - 1] instanceof Date ? dkey_(r[B.PROPOSED - 1]) : '', createdBy: r[B.CREATED_BY - 1],
    createdAt: r[B.CREATED_AT - 1], updatedAt: r[B.UPDATED_AT - 1], eventId: r[B.EVENT_ID - 1], reminded: r[B.REMINDED - 1]
  })).filter(b => b.id);
}
function fleet_() {
  const sh = sheet_(SH.CAP);
  if (sh.getLastRow() < 2) return {};
  const out = {};
  sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach((r, i) => {
    if (!(r[0] instanceof Date) || !r[1]) return;
    out[r[1] + '|' + dkey_(r[0])] = { dk: r[2] === '' ? null : +r[2], cn: r[3] === '' ? null : +r[3], note: r[4], row: 2 + i };
  });
  return out;
}

// ===================== Sức chứa (logic thuần, dễ kiểm thử) =====================
/** Sức chứa / đã dùng / còn đặt được của một kho một ngày. exceptId: bỏ qua booking đang sửa. */
function dayMetrics_(cfg, fleet, bks, wh, key, exceptId) {
  const f = fleet[wh + '|' + key];
  const off = isOff_(cfg, key);
  const declared = !!f && f.dk !== null && f.cn !== null;
  const cap = declared ? f.dk * cfg.capDK + f.cn * cfg.capCN : 0;
  let ok = 0, hold = 0;
  bks.forEach(b => {
    if (b.wh !== wh || b.date !== key || b.id === exceptId) return;
    if (b.status === ST.OK) ok += b.tons; else if (b.status === ST.HOLD) hold += b.tons;
  });
  const avail = Math.max(0, Math.round((cap - ok - hold) * 100) / 100);
  const status = off ? 'Không bốc hàng' : !declared ? 'Chưa mở lịch' : avail <= 0.005 ? 'Đã đầy' : (ok + hold) / cap >= cfg.near ? 'Gần đầy' : 'Còn chỗ';
  return { cap, ok, hold, avail, status, off, declared };
}
/** 3 ngày gần nhất (±7 ngày, không trước hôm nay) cùng kho còn đủ chỗ. */
function suggestDays_(cfg, fleet, bks, wh, key, tons, exceptId) {
  const today = todayKey_(); const out = [];
  for (let d = 1; d <= 7 && out.length < 3; d++) {
    [addDaysKey_(key, d), addDaysKey_(key, -d)].forEach(k => {
      if (out.length >= 3 || k < today) return;
      const m = dayMetrics_(cfg, fleet, bks, wh, k, exceptId);
      if (!m.off && m.declared && m.avail >= tons) out.push({ date: k, avail: m.avail });
    });
  }
  return out;
}

// ===================== Đặt hàng (sidebar) =====================
function showBookingForm() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Đặt hàng'));
}
function getFormData() {
  const cfg = cfg_();
  return { today: todayKey_(), warehouses: cfg.warehouses.map(w => ({ code: w.code, name: w.name })), split: cfg.split,
    customers: customers_().filter(c => c.active).map(c => ({ code: c.code, name: c.name, segment: c.segment, wh: c.wh, addr: c.addr, region: c.region })),
    me: me_(), role: roleOf_(me_()).role };
}
function checkCapacity(wh, key, tons, exceptId) {
  const cfg = cfg_(); const fleet = fleet_(); const bks = bookings_();
  const m = dayMetrics_(cfg, fleet, bks, wh, key, exceptId || '');
  const t = +tons || 0;
  return { cap: m.cap, avail: m.avail, status: m.status, after: Math.round((m.avail - t) * 100) / 100, enough: m.declared && !m.off && t <= m.avail + 0.001,
    sugg: (m.declared && !m.off && t <= m.avail + 0.001) || !t ? [] : suggestDays_(cfg, fleet, bks, wh, key, t, exceptId || ''),
    truckType: t > cfg.split ? 'DK · đầu kéo' : 'CN · container' };
}
/** form: {wh, date, custCode, tons, goods, ref, region, note}; mode: 'hold' | 'draft' */
function submitBooking(form, mode) {
  const who = requireRole_(['CS']);
  const lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    const cfg = cfg_(); const today = todayKey_();
    const cust = customers_().find(c => c.code === form.custCode);
    if (!cust) throw new Error('Chọn khách hàng.');
    if (!form.wh || !form.date) throw new Error('Chọn kho và ngày bốc.');
    if (form.date < today) throw new Error('Không đặt cho ngày đã qua.');
    const tons = Math.round((+String(form.tons).replace(',', '.') || 0) * 100) / 100;
    if (tons <= 0) throw new Error('Nhập số tấn lớn hơn 0.');
    let status = ST.DRAFT;
    if (mode === 'hold') {
      if (!String(form.ref || '').trim()) throw new Error('Nhập Ref đơn hàng (SO).');
      const m = dayMetrics_(cfg, fleet_(), bookings_(), form.wh, form.date, '');
      if (m.off || !m.declared) throw new Error('Ngày ' + dm_(form.date) + ' ' + (m.off ? 'là ngày nghỉ' : 'chưa khai báo xe') + '; chỉ được Lưu tạm.');
      if (tons > m.avail + 0.001) throw new Error('Tổng ' + t2_(tons) + ' t vượt sức chứa còn lại ' + t2_(m.avail) + ' t của ngày ' + dm_(form.date) + '. Chọn ngày khác hoặc Lưu tạm.');
      status = ST.HOLD;
    }
    const id = nextId_(form.wh, form.date);
    const now = new Date();
    const row = new Array(B_HEAD.length).fill('');
    row[B.ID - 1] = id; row[B.DATE - 1] = parseKey_(form.date); row[B.WH - 1] = form.wh; row[B.CODE - 1] = cust.code; row[B.CUST - 1] = cust.name;
    row[B.SEG - 1] = cust.segment; row[B.TONS - 1] = tons; row[B.GOODS - 1] = form.goods || ''; row[B.REF - 1] = String(form.ref || '').trim();
    row[B.REGION - 1] = form.region || cust.region || ''; row[B.STATUS - 1] = status; row[B.CREATED_BY - 1] = me_() || who.name;
    row[B.CREATED_AT - 1] = now; row[B.UPDATED_AT - 1] = now; row[B.UPDATED_BY - 1] = me_(); row[B.MONTH - 1] = form.date.slice(0, 7);
    if (form.note) row[B.GOODS - 1] = (row[B.GOODS - 1] ? row[B.GOODS - 1] + ' · ' : '') + 'Ghi chú: ' + form.note;
    sheet_(SH.BK).appendRow(row);
    SpreadsheetApp.flush();
    log_(id, (status === ST.HOLD ? 'Giữ chỗ ' : 'Lưu nháp ') + t2_(tons) + ' t, ' + cust.name + ', ngày ' + dm_(form.date));
    const bk = bookings_().find(b => b.id === id);
    syncBookingEvent_(bk, cfg);
    syncCapacityDay_(cfg, form.wh, form.date);
    if (status === ST.HOLD) notify_(cfg, 'Giữ chỗ', bk, logEmails_(cfg, form.wh).concat(cust.sales ? [cust.sales] : []),
      id + ' · ' + cust.name + ' giữ chỗ ' + t2_(tons) + ' t ngày ' + dm_(form.date) + ' (kho ' + form.wh + '). Logistics vui lòng xếp xe và xác nhận.');
    return { id, status, msg: status === ST.HOLD ? 'Đã giữ chỗ ' + id + ', trừ tạm ' + t2_(tons) + ' t' : 'Đã lưu nháp ' + id + ' (chưa trừ sức chứa)' };
  } finally { lock.releaseLock(); }
}
function nextId_(wh, key) {
  const prefix = 'BK-' + wh + '-' + key.slice(2).replace(/-/g, '') + '-';
  const n = bookings_().filter(b => String(b.id).indexOf(prefix) === 0).length;
  return prefix + ('00' + (n + 1)).slice(-3);
}

// ===================== Xử lý booking (dialog) =====================
function showActionDialog() {
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SH.BK || sh.getActiveRange().getRow() < 2) { SpreadsheetApp.getUi().alert('Chọn một dòng booking trong tab "' + SH.BK + '" rồi mở lại.'); return; }
  const id = sh.getRange(sh.getActiveRange().getRow(), B.ID).getValue();
  const t = HtmlService.createTemplateFromFile('Action'); t.bookingId = id;
  SpreadsheetApp.getUi().showModalDialog(t.evaluate().setWidth(560).setHeight(560), 'Booking ' + id);
}
function getBookingForAction(id) {
  const cfg = cfg_(); const bk = bookings_().find(b => b.id === id);
  if (!bk) throw new Error('Không tìm thấy booking ' + id);
  const r = roleOf_(me_());
  const m = dayMetrics_(cfg, fleet_(), bookings_(), bk.wh, bk.date, bk.id);
  return { bk: Object.assign({}, bk, { createdAt: String(bk.createdAt), updatedAt: String(bk.updatedAt), reminded: '' }), role: r.role || (me_() ? '' : 'Admin'),
    today: todayKey_(), past: bk.date < todayKey_(), availOther: m.avail, dayStatus: m.status, truckType: bk.tons > cfg.split ? 'DK' : 'CN',
    reasons: cfg.reasons };
}
/** action: confirm | reject | propose | cancel | rebook | accept */
function actOnBooking(id, action, p) {
  p = p || {};
  const lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    const cfg = cfg_(); const bks = bookings_(); const bk = bks.find(b => b.id === id);
    if (!bk) throw new Error('Không tìm thấy booking ' + id);
    const sh = sheet_(SH.BK); const today = todayKey_(); const cust = customers_().find(c => c.code === bk.code) || {};
    const set = (col, v) => sh.getRange(bk.row, col).setValue(v);
    const touch = () => { set(B.UPDATED_AT, new Date()); set(B.UPDATED_BY, me_()); };
    const csTo = [bk.createdBy, cust.cs, cust.sales].filter(Boolean);
    let msg = '', oldDate = bk.date;
    if (action === 'confirm') {
      requireRole_(['Logistics']);
      if (bk.status !== ST.HOLD) throw new Error('Chỉ xác nhận được booking đang Chờ xếp xe.');
      if (bk.date < today) throw new Error('Ngày bốc đã qua: đề nghị đổi ngày hoặc từ chối.');
      if (!String(p.trucks || '').trim()) throw new Error('Nhập xe đã gán (ví dụ: DK-01, CN-02).');
      set(B.STATUS, ST.OK); set(B.TRUCKS, String(p.trucks).trim()); set(B.REASON, ''); touch();
      msg = id + ' · ' + bk.cust + ' ngày ' + dm_(bk.date) + ' đã được xác nhận, xe: ' + p.trucks;
      notify_(cfg, 'Xác nhận', bk, csTo, msg);
    } else if (action === 'reject') {
      requireRole_(['Logistics']);
      if (bk.status !== ST.HOLD) throw new Error('Chỉ từ chối được booking đang Chờ xếp xe.');
      if (!String(p.reason || '').trim()) throw new Error('Chọn hoặc nhập lý do từ chối.');
      set(B.STATUS, ST.REJECTED); set(B.REASON, p.reason); set(B.TRUCKS, ''); touch();
      msg = id + ' · ' + bk.cust + ' ngày ' + dm_(bk.date) + ' bị từ chối. Lý do: ' + p.reason + '. CS có thể đặt lại sang ngày khác.';
      notify_(cfg, 'Từ chối', bk, csTo, msg);
    } else if (action === 'propose') {
      requireRole_(['Logistics']);
      if (bk.status !== ST.HOLD) throw new Error('Chỉ đề nghị đổi ngày cho booking đang Chờ xếp xe.');
      if (!p.date || p.date < today) throw new Error('Chọn ngày đề xuất từ hôm nay trở đi.');
      if (!String(p.reason || '').trim()) throw new Error('Nhập lý do.');
      set(B.STATUS, ST.RESCHED); set(B.PROPOSED, parseKey_(p.date)); set(B.REASON, p.reason); set(B.REMINDED, ''); touch();
      msg = id + ' · ' + bk.cust + ': Logistics đề nghị đổi từ ' + dm_(bk.date) + ' sang ' + dm_(p.date) + '. Lý do: ' + p.reason + '. CS trao đổi với khách rồi bấm Chấp nhận ngày đề nghị hoặc Đặt lại.';
      notify_(cfg, 'Đề nghị đổi ngày', bk, csTo, msg);
    } else if (action === 'accept' || action === 'rebook') {
      requireRole_(['CS']);
      if (action === 'accept' && bk.status !== ST.RESCHED) throw new Error('Booking không ở trạng thái Đề nghị đổi ngày.');
      if (action === 'rebook' && [ST.REJECTED, ST.RESCHED, ST.DRAFT, ST.HOLD, ST.OK].indexOf(bk.status) < 0) throw new Error('Booking đã hủy, không đặt lại được.');
      const nd = action === 'accept' ? bk.proposed : p.date;
      if (!nd || nd < today) throw new Error('Chọn ngày bốc mới từ hôm nay trở đi.');
      const tons = p.tons ? Math.round(+String(p.tons).replace(',', '.') * 100) / 100 : bk.tons;
      if (!(tons > 0)) throw new Error('Số tấn không hợp lệ.');
      const m = dayMetrics_(cfg, fleet_(), bks, bk.wh, nd, bk.id);
      if (m.off || !m.declared) throw new Error('Ngày ' + dm_(nd) + ' ' + (m.off ? 'là ngày nghỉ.' : 'chưa khai báo xe.'));
      if (tons > m.avail + 0.001) throw new Error('Ngày ' + dm_(nd) + ' chỉ còn ' + t2_(m.avail) + ' t, không đủ ' + t2_(tons) + ' t.');
      set(B.DATE, parseKey_(nd)); set(B.MONTH, nd.slice(0, 7)); set(B.TONS, tons); set(B.STATUS, ST.HOLD); set(B.TRUCKS, ''); set(B.PROPOSED, ''); set(B.REASON, '');
      set(B.REMINDED, ''); set(B.CREATED_AT, new Date()); touch();
      msg = id + ' · ' + bk.cust + (action === 'accept' ? ' đồng ý ngày đề nghị ' : (bk.status === ST.REJECTED ? ' (trước đó bị từ chối) đặt lại ngày ' : ' đổi sang ngày ')) + dm_(nd) + ', ' + t2_(tons) + ' t, chờ xếp xe.';
      notify_(cfg, 'Giữ chỗ', bk, logEmails_(cfg, bk.wh).concat(cust.sales ? [cust.sales] : []), msg);
    } else if (action === 'cancel') {
      requireRole_(['CS']);
      if ([ST.CANCELLED, ST.REJECTED].indexOf(bk.status) >= 0) throw new Error('Booking đã đóng.');
      if (!String(p.reason || '').trim()) throw new Error('Chọn lý do hủy.');
      set(B.STATUS, ST.CANCELLED); set(B.REASON, p.reason); set(B.TRUCKS, ''); touch();
      msg = id + ' · ' + bk.cust + ' ngày ' + dm_(bk.date) + ' đã hủy. Lý do: ' + p.reason;
      if (bk.status === ST.OK || bk.status === ST.HOLD) notify_(cfg, 'Hủy booking', bk, logEmails_(cfg, bk.wh).concat(cust.sales ? [cust.sales] : []), msg);
    } else throw new Error('Thao tác không hợp lệ.');
    SpreadsheetApp.flush();
    log_(id, msg);
    const fresh = bookings_().find(b => b.id === id);
    syncBookingEvent_(fresh, cfg);
    syncCapacityDay_(cfg, bk.wh, oldDate);
    if (fresh.date !== oldDate) syncCapacityDay_(cfg, bk.wh, fresh.date);
    return { msg };
  } finally { lock.releaseLock(); }
}

// ===================== Sửa tay trên sheet (trigger onEdit cài đặt) =====================
function handleEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet();
    if (sh.getName() === SH.CAP && e.range.getRow() >= 2 && [C.DK, C.CN].indexOf(e.range.getColumn()) >= 0) {
      const r = e.range.getRow(); const d = sh.getRange(r, C.DATE).getValue(); const wh = sh.getRange(r, C.WH).getValue();
      if (d instanceof Date && wh) {
        const cfg = cfg_(); const key = dkey_(d); const m = dayMetrics_(cfg, fleet_(), bookings_(), wh, key, '');
        if (m.declared && m.cap < m.ok + m.hold - 0.001) {
          sh.getRange(r, e.range.getColumn()).setValue(e.oldValue === undefined ? '' : e.oldValue);
          toast_('Không giảm được: ngày ' + dm_(key) + ' kho ' + wh + ' đã đặt ' + t2_(m.ok + m.hold) + ' t, lớn hơn sức chứa mới. Đổi ngày / từ chối bớt booking trước.');
          return;
        }
        log_('xe:' + wh + ':' + key, 'Khai báo ' + sh.getRange(r, C.DK).getValue() + ' DK, ' + sh.getRange(r, C.CN).getValue() + ' CN');
        syncCapacityDay_(cfg, wh, key);
      }
      return;
    }
    if (sh.getName() !== SH.BK || e.range.getRow() < 2 || e.range.getNumRows() > 1) return;
    const col = e.range.getColumn(); const row = e.range.getRow();
    const bk = bookings_().find(b => b.row === row); if (!bk) return;
    const cfg = cfg_();
    if (col === B.STATUS) {
      // Đổi trạng thái phải qua menu "Xử lý booking" để kiểm tra sức chứa, xe, lý do và gửi thông báo
      if (e.oldValue !== undefined && e.value !== e.oldValue) {
        sh.getRange(row, B.STATUS).setValue(e.oldValue);
        toast_('Đổi trạng thái bằng menu Đặt xe → Xử lý booking đang chọn (để kiểm tra sức chứa và gửi thông báo).');
      }
      return;
    }
    if ([B.DATE, B.TONS, B.WH].indexOf(col) >= 0 && [ST.HOLD, ST.OK].indexOf(bk.status) >= 0) {
      const m = dayMetrics_(cfg, fleet_(), bookings_(), bk.wh, bk.date, bk.id);
      if (bk.date < todayKey_() || m.off || !m.declared || bk.tons > m.avail + 0.001) {
        sh.getRange(row, col).setValue(e.oldValue === undefined ? '' : (col === B.DATE ? parseKey_(dkeyFromSheet_(e.oldValue)) : e.oldValue));
        toast_('Không đổi được: ngày ' + dm_(bk.date) + ' ' + (m.off ? 'là ngày nghỉ' : !m.declared ? 'chưa khai báo xe' : 'chỉ còn ' + t2_(m.avail) + ' t') + '.');
        return;
      }
      if (bk.status === ST.OK) { sh.getRange(row, B.STATUS).setValue(ST.HOLD); sh.getRange(row, B.TRUCKS).setValue(''); }
      sh.getRange(row, B.MONTH).setValue(bk.date.slice(0, 7));
      sh.getRange(row, B.UPDATED_AT).setValue(new Date()); sh.getRange(row, B.UPDATED_BY).setValue(me_());
      SpreadsheetApp.flush();
      log_(bk.id, 'Sửa ' + B_HEAD[col - 1] + (bk.status === ST.OK ? ' → quay về Chờ xếp xe, gỡ xe' : ''));
      const fresh = bookings_().find(b => b.id === bk.id);
      syncBookingEvent_(fresh, cfg); syncCapacityDay_(cfg, fresh.wh, fresh.date);
      if (bk.status === ST.OK) notify_(cfg, 'Giữ chỗ', fresh, logEmails_(cfg, fresh.wh), fresh.id + ' · ' + fresh.cust + ' đã sửa ngày/số tấn, cần xếp xe lại.');
    }
  } catch (err) { toast_('Lỗi: ' + err.message); }
}
function dkeyFromSheet_(v) {
  if (v instanceof Date) return dkey_(v);
  const n = Number(v); if (!isNaN(n) && n > 20000) { const d = new Date(Math.round((n - 25569) * 86400000)); return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd'); }
  const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : String(v);
}

// ===================== Xe & sức chứa: thêm ngày =====================
function extendCapacityDays(silent) {
  const cfg = cfg_(); const sh = sheet_(SH.CAP); const fleet = fleet_();
  const today = todayKey_(); const add = [];
  for (let i = 0; i <= cfg.daysAhead; i++) {
    const k = addDaysKey_(today, i);
    if (cfg.sundayOff && parseKey_(k).getDay() === 0) continue;
    cfg.warehouses.forEach(w => { if (!fleet[w.code + '|' + k]) add.push([parseKey_(k), w.code]); });
  }
  if (add.length) {
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, add.length, 2).setValues(add);
    const f = add.map((_, i) => {
      const r = start + i;
      return ['=IF(OR(C' + r + '="",D' + r + '=""),"",C' + r + '*CAP_DK+D' + r + '*CAP_CN)',
        '=SUMIFS(Booking!$G:$G,Booking!$B:$B,$A' + r + ',Booking!$C:$C,$B' + r + ',Booking!$K:$K,"' + ST.OK + '")',
        '=SUMIFS(Booking!$G:$G,Booking!$B:$B,$A' + r + ',Booking!$C:$C,$B' + r + ',Booking!$K:$K,"' + ST.HOLD + '")',
        '=IF(F' + r + '="","",MAX(0,F' + r + '-G' + r + '-H' + r + '))',
        '=IF(COUNTIF(HOLIDAYS,$A' + r + ')>0,"Không bốc hàng",IF(F' + r + '="","Chưa mở lịch",IF(I' + r + '<=0,"Đã đầy",IF((G' + r + '+H' + r + ')/F' + r + '>=NEAR,"Gần đầy","Còn chỗ"))))'];
    });
    sh.getRange(start, C.CAP, add.length, 5).setFormulas(f);
  }
  if (silent !== true) toast_(add.length ? 'Đã thêm ' + add.length + ' dòng ngày / kho. Điền số DK, CN để mở lịch.' : 'Đã đủ ngày.');
  return add.length;
}

// ===================== Google Calendar =====================
function ensureCalendars_() {
  const cfg = cfg_(); const sh = sheet_(SH.CFG);
  cfg.warehouses.forEach(w => {
    if (!w.calBk || !CalendarApp.getCalendarById(w.calBk)) {
      const c = CalendarApp.createCalendar('Đặt xe – ' + w.name + ' (nội bộ)', { summary: 'Booking theo ngày bốc. Do bảng tính Đặt xe tự cập nhật, không sửa tay.', timeZone: TZ });
      sh.getRange(w.row, W.CAL_BK).setValue(c.getId());
    }
    if (!w.calCap || !CalendarApp.getCalendarById(w.calCap)) {
      const c = CalendarApp.createCalendar('Sức chứa – ' + w.name, { summary: 'Số tấn còn đặt được theo ngày. Chia sẻ chế độ xem cho khách hàng và Sales.', timeZone: TZ });
      sh.getRange(w.row, W.CAL_CAP).setValue(c.getId());
    }
  });
}
const COLOR = { 'Đã xác nhận': 'PALE_GREEN', 'Chờ xếp xe': 'YELLOW', 'Đề nghị đổi ngày': 'PALE_BLUE', 'Nháp': 'GRAY' };
const PREFIX = { 'Đã xác nhận': '✔', 'Chờ xếp xe': '⏳', 'Đề nghị đổi ngày': '↻', 'Nháp': '✎' };
function syncBookingEvent_(bk, cfg) {
  if (!bk) return;
  const w = cfg.warehouses.find(x => x.code === bk.wh); if (!w || !w.calBk) return;
  const cal = CalendarApp.getCalendarById(w.calBk); if (!cal) return;
  let ev = null;
  if (bk.eventId) { try { ev = cal.getEventById(bk.eventId); } catch (e) { ev = null; } }
  const show = [ST.OK, ST.HOLD, ST.RESCHED, ST.DRAFT].indexOf(bk.status) >= 0 && bk.date;
  if (!show) { if (ev) ev.deleteEvent(); if (bk.eventId) sheet_(SH.BK).getRange(bk.row, B.EVENT_ID).setValue(''); return; }
  const title = PREFIX[bk.status] + ' ' + bk.cust + ' · ' + t2_(bk.tons) + ' t' + (bk.ref ? ' · ' + bk.ref : '');
  const desc = [bk.id, 'Trạng thái: ' + bk.status, 'Khu vực: ' + (bk.region || '–'), 'Xe: ' + (bk.trucks || '–'),
    bk.status === ST.RESCHED ? 'Đề xuất ngày: ' + dm_(bk.proposed) + ' · ' + bk.reason : '', 'Hàng: ' + (bk.goods || '–'), 'Người tạo: ' + bk.createdBy].filter(Boolean).join('\n');
  const day = parseKey_(bk.date);
  if (!ev) { ev = cal.createAllDayEvent(title, day, { description: desc }); sheet_(SH.BK).getRange(bk.row, B.EVENT_ID).setValue(ev.getId()); }
  else { ev.setTitle(title); ev.setDescription(desc); ev.setAllDayDate(day); }
  try { ev.setColor(CalendarApp.EventColor[COLOR[bk.status]]); } catch (e) { }
}
/** Lịch sức chứa: mỗi ngày một sự kiện cả ngày "Còn X t / Y t" (không có tên khách) – chia sẻ cho khách hàng. */
function syncCapacityDay_(cfg, wh, key, fleet, bks) {
  const w = cfg.warehouses.find(x => x.code === wh); if (!w || !w.calCap) return;
  const cal = CalendarApp.getCalendarById(w.calCap); if (!cal) return;
  const m = dayMetrics_(cfg, fleet || fleet_(), bks || bookings_(), wh, key, '');
  const day = parseKey_(key);
  const evs = cal.getEventsForDay(day).filter(e => e.getTag('datxe') === 'cap');
  if (m.off || !m.declared) { evs.forEach(e => e.deleteEvent()); return; }
  const title = (m.status === 'Đã đầy' ? '⛔ Đã đầy' : m.status === 'Gần đầy' ? '🟡 Còn ' + t2_(m.avail) + ' t' : '🟢 Còn ' + t2_(m.avail) + ' t') + ' / ' + t2_(m.cap) + ' t';
  const desc = 'Kho: ' + w.name + '\nCó thể đặt: ' + t2_(m.avail) + ' t\nSức chứa: ' + t2_(m.cap) + ' t\nTrạng thái: ' + m.status + '\nLiên hệ CS / Sales để đặt.';
  if (evs.length && evs[0].getTitle() === title) return;
  evs.forEach(e => e.deleteEvent());
  const ev = cal.createAllDayEvent(title, day, { description: desc });
  ev.setTag('datxe', 'cap');
  try { ev.setColor(CalendarApp.EventColor[m.status === 'Đã đầy' ? 'RED' : m.status === 'Gần đầy' ? 'YELLOW' : 'GREEN']); } catch (e) { }
}
function syncCalendarsNow() {
  const cfg = cfg_(); ensureCalendars_(); const c2 = cfg_();
  const fleet = fleet_(); const bks = bookings_(); const today = todayKey_(); let n = 0;
  bks.filter(b => b.date >= addDaysKey_(today, -7)).forEach(b => { syncBookingEvent_(b, c2); n++; });
  for (let i = 0; i <= Math.min(c2.daysAhead, 31); i++) {
    const k = addDaysKey_(today, i);
    c2.warehouses.forEach(w => syncCapacityDay_(c2, w.code, k, fleet, bks));
  }
  toast_('Đã đồng bộ lịch: ' + n + ' booking, sức chứa ' + Math.min(c2.daysAhead, 31) + ' ngày tới.');
}

// ===================== Thông báo =====================
function logEmails_(cfg, wh) {
  const w = cfg.warehouses.find(x => x.code === wh) || {};
  const fromCfg = String(w.logEmail || '').split(',').map(s => s.trim()).filter(Boolean);
  const sh = sheet_(SH.USERS);
  const fromUsers = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
    .filter(r => r[2] === 'Logistics' && (!r[3] || String(r[3]).split(',').map(s => s.trim()).indexOf(wh) >= 0)).map(r => String(r[0]).trim()) : [];
  return fromCfg.concat(fromUsers);
}
function notify_(cfg, type, bk, to, text) {
  const list = Array.from(new Set((to || []).map(s => String(s || '').trim().toLowerCase()).filter(s => s && s.indexOf('@') > 0 && s !== me_())));
  if (!cfg.mailOn || !list.length) return;
  const url = SpreadsheetApp.getActive().getUrl();
  const html = '<div style="font-family:Arial,sans-serif;max-width:560px"><div style="background:#1F2C3D;color:#fff;padding:10px 14px;font-weight:bold">ĐẶT XE · ' + type + '</div>' +
    '<div style="border:1px solid #D3D9DF;border-top:0;padding:14px"><p>' + String(text).replace(/</g, '&lt;') + '</p>' +
    '<p><a href="' + url + '" style="background:#1F2C3D;color:#fff;padding:8px 14px;text-decoration:none;border-radius:6px">Mở bảng Đặt xe</a></p>' +
    '<p style="font-size:12px;color:#5A6573">Email tự động từ bảng tính Đặt xe.</p></div></div>';
  try { MailApp.sendEmail({ to: list.join(','), subject: '[Đặt xe] ' + type + ': ' + (bk ? bk.id + ' · ' + bk.cust : ''), htmlBody: html }); }
  catch (e) { log_('email', 'Không gửi được email (' + e.message + ')'); }
}

// ===================== Nhắc việc (mỗi giờ) =====================
function runReminders() {
  const cfg = cfg_(); const today = todayKey_(); const now = new Date(); const sh = sheet_(SH.BK); let n = 0;
  const custs = customers_();
  bookings_().forEach(b => {
    // Đã nhắc cho lần thay đổi này: chỉ nhắc lại sau 24 giờ nếu vẫn chưa xử lý
    if (b.reminded instanceof Date && (!(b.updatedAt instanceof Date) || b.reminded >= b.updatedAt) && (now - b.reminded) < 24 * 3600000) return;
    const cust = custs.find(c => c.code === b.code) || {};
    let to = null, text = '';
    if (b.status === ST.HOLD && b.date < today) {
      to = logEmails_(cfg, b.wh).concat([b.createdBy, cust.cs]); text = b.id + ' · ' + b.cust + ': chờ xếp xe nhưng ngày bốc ' + dm_(b.date) + ' đã qua. Logistics đề nghị đổi ngày hoặc từ chối.';
    } else if (b.status === ST.HOLD && b.createdAt instanceof Date && (now - b.createdAt) / 60000 > cfg.slaMin) {
      to = logEmails_(cfg, b.wh); text = b.id + ' · ' + b.cust + ': giữ chỗ ' + t2_(b.tons) + ' t ngày ' + dm_(b.date) + ' đã quá ' + cfg.slaMin + ' phút chưa xếp xe.';
    } else if (b.status === ST.RESCHED && b.updatedAt instanceof Date && (now - b.updatedAt) / 3600000 > cfg.reschedH) {
      to = [b.createdBy, cust.cs, cust.sales]; text = b.id + ' · ' + b.cust + ': đề nghị đổi sang ' + dm_(b.proposed) + ' chưa được CS xử lý quá ' + cfg.reschedH + ' giờ.';
    }
    if (to) { notify_(cfg, 'Nhắc việc', b, to, text); sh.getRange(b.row, B.REMINDED).setValue(new Date()); log_(b.id, 'Nhắc việc: ' + text); n++; }
  });
  return n;
}
/** Chạy định kỳ mỗi giờ: thêm ngày, đồng bộ lịch, nhắc việc. */
function hourlyJob() {
  extendCapacityDays(true);
  const cfg = cfg_(); const fleet = fleet_(); const bks = bookings_(); const today = todayKey_();
  for (let i = 0; i <= 14; i++) cfg.warehouses.forEach(w => syncCapacityDay_(cfg, w.code, addDaysKey_(today, i), fleet, bks));
  runReminders();
}

// ===================== Email tổng hợp 7:00 =====================
function sendDailySummary() {
  const cfg = cfg_(); const to = cfg.summaryTo.split(',').map(s => s.trim()).filter(Boolean); if (!to.length) return;
  const fleet = fleet_(); const bks = bookings_(); const today = todayKey_(); const month = today.slice(0, 7);
  const rows = cfg.warehouses.map(w => { const m = dayMetrics_(cfg, fleet, bks, w.code, today, ''); return '<tr><td>' + w.name + '</td><td>' + (m.declared ? t2_(m.cap) : '–') + '</td><td>' + t2_(m.ok) + '</td><td>' + t2_(m.hold) + '</td><td><b>' + (m.declared ? t2_(m.avail) : '–') + '</b></td><td>' + m.status + '</td></tr>'; }).join('');
  const segs = ['Dân dụng', 'Dự án'].map(s => {
    const l = bks.filter(b => b.seg === s && b.date.slice(0, 7) === month);
    const sum = st => l.filter(b => st.indexOf(b.status) >= 0).reduce((a, b) => a + b.tons, 0);
    return '<tr><td>' + s + '</td><td>' + t2_(sum([ST.OK])) + '</td><td>' + t2_(sum([ST.HOLD, ST.RESCHED])) + '</td><td>' + t2_(sum([ST.DRAFT])) + '</td><td><b>' + t2_(sum([ST.OK, ST.HOLD, ST.RESCHED, ST.DRAFT])) + '</b></td><td>' + t2_(sum([ST.REJECTED])) + '</td></tr>';
  }).join('');
  const pending = bks.filter(b => b.status === ST.HOLD).length, resched = bks.filter(b => b.status === ST.RESCHED).length;
  const th = 'style="text-align:left;border-bottom:1px solid #ccc;padding:4px 8px"';
  const html = '<div style="font-family:Arial,sans-serif"><h3>Đặt xe – tình hình ngày ' + dm_(today) + '</h3>' +
    '<table style="border-collapse:collapse"><tr><th ' + th + '>Kho</th><th ' + th + '>Sức chứa</th><th ' + th + '>Đã xác nhận</th><th ' + th + '>Giữ chỗ</th><th ' + th + '>Còn đặt được</th><th ' + th + '>Trạng thái</th></tr>' + rows + '</table>' +
    '<p>Đang chờ xếp xe: <b>' + pending + '</b> booking · Đề nghị đổi ngày chưa xử lý: <b>' + resched + '</b></p>' +
    '<h4>Tháng ' + month.slice(5) + '/' + month.slice(0, 4) + ' theo segment (tấn, theo ngày bốc)</h4>' +
    '<table style="border-collapse:collapse"><tr><th ' + th + '>Segment</th><th ' + th + '>Đã xác nhận</th><th ' + th + '>Chờ / đổi ngày</th><th ' + th + '>Lưu tạm</th><th ' + th + '>Tổng đặt</th><th ' + th + '>Bị từ chối</th></tr>' + segs + '</table>' +
    '<p><a href="' + SpreadsheetApp.getActive().getUrl() + '">Mở bảng Đặt xe</a></p></div>';
  MailApp.sendEmail({ to: to.join(','), subject: '[Đặt xe] Tình hình ngày ' + dm_(today), htmlBody: html });
}

// ===================== Trigger =====================
function installTriggers_() {
  const ss = SpreadsheetApp.getActive();
  const have = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  if (have.indexOf('handleEdit') < 0) ScriptApp.newTrigger('handleEdit').forSpreadsheet(ss).onEdit().create();
  if (have.indexOf('hourlyJob') < 0) ScriptApp.newTrigger('hourlyJob').timeBased().everyHours(1).create();
  if (have.indexOf('sendDailySummary') < 0) ScriptApp.newTrigger('sendDailySummary').timeBased().atHour(7).everyDays(1).inTimezone(TZ).create();
}
