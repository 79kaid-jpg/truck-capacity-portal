// Mô phỏng các dịch vụ Google Apps Script tối thiểu để chạy Code.gs trong Node (chỉ dùng kiểm thử).
process.env.TZ = 'Asia/Ho_Chi_Minh';
const fs = require('fs'), vm = require('vm'), path = require('path');

function colNum(s) { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; }
const MAXR = 1000;

function makeEnv() {
  const env = { user: 'admin@x.vn', mails: [], toasts: [], triggers: [], calendars: {}, namedRanges: {}, alerts: [], seq: 0 };
  const chain = new Proxy({}, { get: (t, k) => k === 'build' ? () => ({}) : () => chain });

  class Sheet {
    constructor(name) { this.name = name; this.cells = {}; this.formulas = {}; this.protections = []; }
    getName() { return this.name; }
    get(r, c) { const v = this.cells[r + ',' + c]; return v === undefined ? '' : v; }
    set(r, c, v) { if (v === '' || v === null || v === undefined) delete this.cells[r + ',' + c]; else this.cells[r + ',' + c] = v; }
    getLastRow() { let m = 0; for (const k in this.cells) { const r = +k.split(',')[0]; if (r > m) m = r; } for (const k in this.formulas) { const r = +k.split(',')[0]; if (r > m) m = r; } return m; }
    getLastColumn() { let m = 0; for (const k in this.cells) { const c = +k.split(',')[1]; if (c > m) m = c; } return m; }
    getRange(a, b, c, d) {
      if (typeof a === 'string') {
        const m = a.match(/^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/);
        const c1 = colNum(m[1]), r1 = m[2] ? +m[2] : 1, c2 = m[3] ? colNum(m[3]) : c1, r2 = m[3] ? (m[4] ? +m[4] : MAXR) : r1;
        return new Range(this, r1, c1, r2 - r1 + 1, c2 - c1 + 1);
      }
      return new Range(this, a, b, c || 1, d || 1);
    }
    appendRow(row) { const r = this.getLastRow() + 1; row.forEach((v, i) => this.set(r, i + 1, v)); return this; }
    clear() { this.cells = {}; this.formulas = {}; return this; }
    getProtections() { return this.protections; }
    setConditionalFormatRules() { return this; }
    setFrozenRows() { return this; } setColumnWidth() { return this; } setColumnWidths() { return this; } hideColumns() { return this; }
  }
  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    getSheet() { return this.sh; } getRow() { return this.r; } getColumn() { return this.c; } getNumRows() { return this.nr; }
    getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.get(this.r + i, this.c + j)); o.push(row); } return o; }
    getValue() { return this.sh.get(this.r, this.c); }
    setValues(v) { if (v.length !== this.nr || v[0].length !== this.nc) throw new Error(`setValues size ${v.length}x${v[0].length} vs ${this.nr}x${this.nc}`); v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
    setValue(v) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.set(this.r + i, this.c + j, v); return this; }
    setFormula(f) { this.sh.formulas[this.r + ',' + this.c] = f; return this; }
    setFormulas(f) { if (f.length !== this.nr || f[0].length !== this.nc) throw new Error('setFormulas size'); f.forEach((row, i) => row.forEach((x, j) => { this.sh.formulas[(this.r + i) + ',' + (this.c + j)] = x; })); return this; }
    insertCheckboxes() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) if (this.sh.get(this.r + i, this.c + j) === '') this.sh.set(this.r + i, this.c + j, false); return this; }
    protect() { const p = { d: '', setDescription(x) { this.d = x; return this; }, getDescription() { return this.d; }, setWarningOnly() { return this; } }; this.sh.protections.push(p); return p; }
  }
  for (const m of ['setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setNumberFormat', 'setDataValidation', 'setFontSize']) Range.prototype[m] = function () { return this; };

  const sheets = [new Sheet('Sheet1')];
  let active = sheets[0], activeRow = 1;
  const ss = {
    setSpreadsheetTimeZone() { }, getSheetByName: n => sheets.find(s => s.name === n) || null,
    insertSheet(n) { const s = new Sheet(n); sheets.push(s); return s; }, getSheets: () => sheets.slice(),
    deleteSheet(s) { sheets.splice(sheets.indexOf(s), 1); }, setActiveSheet(s) { active = s; },
    setNamedRange(n, r) { env.namedRanges[n] = r; }, toast(m) { env.toasts.push(m); }, getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST',
  };
  const ui = { createMenu: () => chain, alert: m => env.alerts.push(m), showSidebar() { }, showModalDialog() { } };
  const SpreadsheetApp = {
    getActive: () => ss, getActiveSpreadsheet: () => ss, getUi: () => ui, flush() { },
    getActiveSheet: () => active, newDataValidation: () => chain, newConditionalFormatRule: () => chain,
    ProtectionType: { RANGE: 'RANGE' },
  };
  active.getActiveRange = () => ({ getRow: () => activeRow });
  env.select = (sheetName, row) => { active = ss.getSheetByName(sheetName); activeRow = row; active.getActiveRange = () => ({ getRow: () => activeRow }); };

  // Calendar
  class Ev {
    constructor(cal, title, day, opt) { this.cal = cal; this.id = 'ev' + (++env.seq); this.title = title; this.day = new Date(day); this.desc = (opt || {}).description; this.tags = {}; this.color = null; }
    getId() { return this.id; } getTitle() { return this.title; } setTitle(t) { this.title = t; } setDescription(d) { this.desc = d; }
    setAllDayDate(d) { this.day = new Date(d); } setColor(c) { if (c === undefined) throw new Error('bad color'); this.color = c; }
    setTag(k, v) { this.tags[k] = v; } getTag(k) { return this.tags[k] === undefined ? null : this.tags[k]; } deleteEvent() { delete this.cal.events[this.id]; }
  }
  class Cal {
    constructor(name) { this.name = name; this.id = 'cal' + (++env.seq) + '@group.calendar.google.com'; this.events = {}; }
    getId() { return this.id; } createAllDayEvent(t, d, o) { const e = new Ev(this, t, d, o); this.events[e.id] = e; return e; }
    getEventById(id) { return this.events[id] || null; }
    getEventsForDay(d) { const k = d.toDateString(); return Object.values(this.events).filter(e => e.day.toDateString() === k); }
    list() { return Object.values(this.events); }
  }
  const CalendarApp = {
    createCalendar(n) { const c = new Cal(n); env.calendars[c.id] = c; return c; }, getCalendarById: id => env.calendars[id] || null,
    EventColor: { PALE_BLUE: '1', PALE_GREEN: '2', MAUVE: '3', PALE_RED: '4', YELLOW: '5', ORANGE: '6', CYAN: '7', GRAY: '8', BLUE: '9', GREEN: '10', RED: '11' },
  };
  const fmtParts = (d, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(p => [p.type, p.value]));
  const Utilities = { formatDate(d, tz, f) { const p = fmtParts(d, tz); return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute); } };
  const user = () => ({ getEmail: () => env.user });
  const ctx = {
    SpreadsheetApp, CalendarApp, Utilities, console,
    Session: { getActiveUser: user, getEffectiveUser: () => ({ getEmail: () => 'admin@x.vn' }) },
    LockService: { getDocumentLock: () => ({ waitLock() { }, releaseLock() { } }) },
    MailApp: { sendEmail(o) { env.mails.push(o); } },
    ScriptApp: { getProjectTriggers: () => env.triggers.map(h => ({ getHandlerFunction: () => h })), newTrigger: h => { const c = new Proxy({}, { get: (t, k) => k === 'create' ? () => env.triggers.push(h) : () => c }); return c; } },
    HtmlService: { createHtmlOutputFromFile: () => chain, createTemplateFromFile: () => ({ evaluate: () => chain }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  env.ctx = ctx; env.ss = ss; env.run = code => vm.runInContext(code, ctx);
  return env;
}
module.exports = { makeEnv };
