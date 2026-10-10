// E2E: thống kê khách cho Sales trên lịch. Test-only.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch(); const errs = [];
const check = (n, ok, x = '') => { console.log((ok ? 'OK  ' : 'FAIL') + ' ' + n + (x ? ' | ' + x : '')); if (!ok) errs.push(n); };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } }); const p = await ctx.newPage();
await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'t'}" }));
await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8787/'); await p.fill('#lg-e', 's1@demo.vn'); await p.fill('#lg-p', 'Test@1234'); await p.click('#login button'); await p.waitForTimeout(900);
const txt = await p.locator('aside.sst').innerText(); console.log(txt.replace(/\n+/g, ' | '));
// tự tính lại từ dữ liệu để đối chiếu
const exp = await p.evaluate(() => { const mp = TODAY.slice(0, 7); const mine = S.bookings.filter(b => b.customerId !== '__other' && cust(b.customerId)?.salesId === V.me && b.date.startsWith(mp) && ['ok', 'hold', 'resched', 'draft'].includes(b.status)); const T = l => l.reduce((s, b) => s + bkTotal(b), 0);
  return { total: t2(T(mine)), draft: mine.filter(b => b.status === 'draft').length, h1: t2(T(mine.filter(b => +b.date.slice(8) <= 15))), okPast: t2(T(mine.filter(b => b.status === 'ok' && b.date < TODAY))) }; });
console.log(JSON.stringify(exp));
check('total matches', txt.includes('TỔNG ĐÃ ĐẶT THÁNG') && txt.includes(exp.total));
check('draft of my customer counted', exp.draft >= 1 && /Đang lưu tạm\s*[\d,]+ t · [1-9]/.test(txt));
check('half-month row', txt.includes('Ngày 1 – 15') && txt.includes(exp.h1 + ' t'));
check('confirmed to yesterday', /đã xác nhận đến hôm qua/i.test(txt) && txt.includes(exp.okPast + ' t'));
check('top customers listed', /khách đặt nhiều nhất/i.test(txt));
check('Sales cannot see CS draft in lists', await p.evaluate(() => S.bookings.filter(b => b.status === 'draft').every(b => !visibleBk(b))));
await p.screenshot({ path: '/tmp/e2e-shots/ss-1-sales.png', fullPage: true });
await p.click('[data-a="ssWh"][data-v="cur"]'); await p.waitForTimeout(200);
check('switch to current warehouse', (await p.locator('[data-a="ssWh"][data-v="cur"].on').count()) === 1);
await browser.close(); console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ALL SALESSTATS CHECKS PASSED');
