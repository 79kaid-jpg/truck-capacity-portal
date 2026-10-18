// v3.34 – v3.36: kiểm tra giao diện (tương phản, dark mode, nút chat, điện thoại, đồng bộ).
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/ui.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/ui'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = ''; let pass = 0;
const ok = (cond, msg, extra = '') => { if (cond) { pass++; console.log('OK  ', msg); } else { errors.push(msg); console.log('FAIL', msg, extra); } };
async function session(email, fn, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...opt.ctx });
  const page = await ctx.newPage(); if (opt.init) await page.addInitScript(opt.init);
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
const S = s => { step = s; };
const phone = { ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } };
const dark = { ctx: { colorScheme: 'dark' } };
// Tỷ lệ tương phản WCAG giữa màu chữ và màu nền thực tế của một phần tử (đi ngược lên cha nếu nền trong suốt)
const CONTRAST = () => { window.__cr = el => {
  const rgb = c => c.match(/[\d.]+/g).map(Number);
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; const [r, g, b] = rgb(c); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  let e = el, bg = 'rgba(0, 0, 0, 0)'; while (e && /rgba\(0, 0, 0, 0\)|transparent/.test(bg = getComputedStyle(e).backgroundColor)) e = e.parentElement;
  const a = lum(getComputedStyle(el).color), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }; };
const probe = (p, cls, html = 'Thử') => p.evaluate(([cls, html]) => { let h = document.getElementById('__probe'); if (!h) { h = document.createElement('div'); h.id = 'talkPanel'; h.style.cssText = 'position:fixed;left:0;top:0;opacity:1'; document.body.appendChild(h); }
  const e = document.createElement('div'); e.className = cls; e.innerHTML = html; h.appendChild(e); const r = window.__cr(e); e.remove(); return r; }, [cls, html]);

/* ---------- v3.34 ---------- */
for (const [label, opt] of [['sáng', {}], ['tối', dark]]) {
  await session('cs@demo.vn', async p => {
    await p.evaluate(CONTRAST);
    S('pills-' + label);
    for (const cls of ['pill p-ok', 'pill p-near', 'pill p-full', 'st st-hold', 'st st-ok', 'st st-rejected', 'pendbox', 'chip warn'])
      { const r = await probe(p, cls); ok(r >= 4.5, `${label}: ${cls} tương phản ≥ 4,5`, r.toFixed(2)); }
    S('blocks-' + label);
    for (const cls of ['tmsg me', 'tkpin', 'g30req', 'pitem sugg', 'tklock', 'tkbadge', 'tkpinl', 'rqchip', 'pkoff'])
      { const r = await probe(p, cls); ok(r >= 4.5, `${label}: .${cls.replace(' ', '.')} tương phản ≥ 4,5`, r.toFixed(2)); }
    const tm = await p.evaluate(() => { const h = document.createElement('div'); h.id = 'talkPanel'; const m = document.createElement('div'); m.className = 'tm'; m.textContent = 'x'; h.appendChild(m); document.body.appendChild(h); const r = window.__cr(m); h.remove(); return r; });
    ok(tm >= 4.5, `${label}: nền khung trao đổi đọc được`, tm.toFixed(2));
    S('input-' + label);
    const ib = await p.evaluate(() => { const i = document.createElement('input'); i.className = 'inp'; document.querySelector('.main').appendChild(i); const s = getComputedStyle(i); const fake = document.createElement('span'); fake.style.color = s.borderTopColor; fake.style.background = getComputedStyle(document.querySelector('.panel') || document.body).backgroundColor; document.body.appendChild(fake); const r = window.__cr(fake); i.remove(); fake.remove(); return r; });
    ok(ib >= 3, `${label}: viền ô nhập tương phản ≥ 3`, ib.toFixed(2));
  }, opt);
}
await session('cs@demo.vn', async p => {
  S('fab'); ok(await p.locator('#chatFab').isVisible(), 'nút chat hiện khi không có cửa sổ');
  await p.locator('[data-a="newBk"]').first().click(); await p.waitForSelector('.modal');
  ok(!(await p.locator('#chatFab').isVisible()), 'mở Đặt hàng → nút chat ẩn, không che đáy lưới');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); ok(await p.locator('#chatFab').isVisible(), 'đóng cửa sổ → nút chat hiện lại');
});
await session('kh@demo.vn', async p => {
  await p.evaluate(CONTRAST); S('cvbar');
  const r = await p.evaluate(() => { const b = document.createElement('div'); b.className = 'cvbar'; b.textContent = 'Đang xem như khách'; document.body.appendChild(b); const v = window.__cr(b); b.remove(); return v; });
  ok(r >= 4.5, 'dải Xem như khách: chữ trắng đọc được', r.toFixed(2));
});

/* ---------- v3.35: điện thoại ---------- */
await session('cs@demo.vn', async p => {
  S('m-header'); const hh = await p.locator('.top').evaluate(e => e.getBoundingClientRect().height); ok(hh <= 64, 'điện thoại: header một dòng', hh);
  ok(await p.locator('.top .logo').evaluate(e => getComputedStyle(e).fontSize === '0px' && !!e.getAttribute('aria-label')), 'logo chỉ còn biểu tượng, có nhãn đọc màn hình');
  ok(await p.locator('.top .h52 svg').count() === 1 && (await p.locator('.top .h52').getAttribute('aria-label')) === 'Hướng dẫn sử dụng', 'nút Hướng dẫn là biểu tượng có nhãn');
  S('m-targets'); const small = await p.evaluate(() => [...document.querySelectorAll('.main button, .top button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40 && !b.closest('.cell'); }).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 20)));
  ok(small.length === 0, 'nút ngoài ô lịch cao ≥ 40px', small.join(' | '));
  S('m-filter'); ok(!(await p.locator('.cal36bar [data-a="calF"]').first().isVisible()) && await p.locator('.f52').isVisible(), 'bộ lọc gom vào nút Lọc');
  await p.click('.f52'); await p.waitForTimeout(200); ok(await p.locator('.cal36bar [data-a="calF"][data-v="hold"]').isVisible(), 'bấm Lọc → hiện các lựa chọn');
  await p.click('.cal36bar [data-a="calF"][data-v="hold"]'); await p.waitForTimeout(300); ok(/lọc: có đơn chờ xếp xe/i.test(await p.locator('.f52').innerText()), 'nút Lọc ghi rõ bộ lọc đang chọn');
  S('m-past'); const firstVisible = () => p.evaluate(() => { const c = [...document.querySelectorAll('.cal .cell:not(.pad):not(.wk)')].find(e => e.getBoundingClientRect().height > 0); return c && (c.classList.contains('today') || !c.classList.contains('past')); });
  ok(await firstVisible(), 'lịch CS mở từ hôm nay'); ok(/Xem \d+ ngày đã qua/.test(await p.locator('.past52').innerText()), 'có nút Xem ngày đã qua');
  await p.click('.past52'); await p.waitForTimeout(300); ok(!(await firstVisible()), 'bấm → hiện lại ngày đã qua');
  S('m-grid'); await p.click('.past52'); await p.locator('[data-a="newBk"]').first().click(); await p.waitForSelector('.modal');
  const g = await p.evaluate(() => { const m = document.querySelector('.modal').getBoundingClientRect(); const tr = document.querySelector('.g30 tbody tr'); const f = document.querySelector('.g30 .mfoot [data-m="hold"]').getBoundingClientRect();
    return { l: m.left, r: m.right, tr: getComputedStyle(tr).display, foot: f.bottom <= innerHeight && f.right <= innerWidth, th: getComputedStyle(document.querySelector('.g30 thead')).display, sw: document.querySelector('.modal').scrollWidth <= innerWidth }; });
  ok(g.l >= 0 && g.r <= 390, 'lưới Đặt hàng nằm gọn trong màn hình', JSON.stringify(g)); ok(g.tr === 'grid' && g.th === 'none', 'mỗi dòng đơn là một thẻ'); ok(g.foot, 'nút Đặt & gửi Logistics luôn thấy ở đáy'); ok(g.sw, 'không cuộn ngang trong lưới');
  await p.fill('[data-g="code"][data-i="0"]', 'KH0101'); await p.keyboard.press('Enter'); await p.fill('[data-g="tons"][data-i="0"]', '20'); await p.waitForTimeout(300);
  ok(/20,00 MT/.test(await p.locator('#g30foot').innerText()), 'nhập trên thẻ vẫn cộng vào tổng'); await p.screenshot({ path: `${OUT}/m-grid.png` });
}, phone);
await session('kh@demo.vn', async p => {
  S('m-kh'); const v = await p.evaluate(() => { const c = [...document.querySelectorAll('.cal .cell:not(.pad)')].find(e => e.getBoundingClientRect().height > 0); return c && c.classList.contains('today'); });
  ok(v, 'lịch khách trên điện thoại mở từ hôm nay'); ok(await p.locator('.past52').isVisible(), 'khách cũng có nút Xem ngày đã qua');
}, phone);
await session('cs@demo.vn', async p => {
  S('desk'); ok(!(await p.locator('.past52').isVisible()) && !(await p.locator('.f52').isVisible()), 'máy tính: không đổi (không nút Lọc / ngày đã qua)');
  ok(await p.locator('.cal36bar [data-a="calF"]').first().isVisible(), 'máy tính: các nút lọc hiện như cũ');
  await p.locator('[data-a="newBk"]').first().click(); await p.waitForSelector('.modal'); ok(await p.locator('.g30 thead').isVisible(), 'máy tính: lưới vẫn là bảng');
});

console.log(`\n${pass} đạt, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
await browser.close();
