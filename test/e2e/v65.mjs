// v3.53: khung thống kê Xe – tô màu ô ngày đầy / gần đầy / non tải theo %, sắp theo ngày.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v65.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v65'; fs.mkdirSync(OUT, { recursive: true });
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


const check = async (p, tag) => {
  const r = await ev(p, () => {
    const box = document.querySelector('.ts36'); if (!box) return null;
    const sec = [...box.querySelectorAll('.chips')].map(c => ({ lb: c.previousElementSibling?.textContent || '', bs: [...c.querySelectorAll('button[data-d]')].map(b => ({ d: b.dataset.d, w: b.dataset.w, cls: b.className, t: b.textContent })) }));
    const full = sec.find(s => /gần đầy/i.test(s.lb)), under = sec.find(s => /non tải/i.test(s.lb));
    const near = (full?.bs || []).map(b => { const mm = dayM(b.w, b.d); return { ...b, p: mm.cap ? (mm.loaded + mm.held) / mm.cap : 0, st: mm.status }; });
    return { full: near, under: under?.bs || [], lb: full?.lb || '' };
  });
  ok(r, `${tag}: có khung thống kê Xe`);
  if (!r) return;
  const sorted = a => a.every((x, i) => !i || a[i - 1].d <= x.d);
  ok(r.full.every(b => /c65-(full|near)/.test(b.cls) && /\d+%/.test(b.t)), `${tag}: ô đầy / gần đầy có màu + %`);
  ok(r.full.every(b => b.st === 'full' || b.p >= 0.9 - 1e-9), `${tag}: chỉ ngày ≥ 90% hoặc đầy`);
  ok(r.full.filter(b => /c65-full/.test(b.cls)).every(b => b.st === 'full' || b.p >= 0.999), `${tag}: đỏ đậm chỉ cho ngày đầy`);
  ok(sorted(r.full) && sorted(r.under), `${tag}: sắp theo ngày tăng dần`);
  ok(r.under.every(b => /c65-(ulo|umid)/.test(b.cls) && /\d+%/.test(b.t)), `${tag}: ô non tải có màu + %`, JSON.stringify(r.under.slice(0, 3)));
  console.log('  ', tag, 'đầy/gần đầy', r.full.length, 'non tải', r.under.length, r.lb);
};
await session('log@demo.vn', async p => {
  S('desk'); await check(p, 'máy tính'); await p.locator('.ts36').screenshot({ path: `${OUT}/panel-light.png` });
  S('stub'); // dữ liệu mẫu ít: giả lập tải xe để có đủ các mức màu
  await ev(p, () => { const cp = {}; const [y, m] = V.ym; for (let i = 1; i <= dim(y, m); i++) WH.forEach(w => trucksOf(w.id, iso(y, m, i)).forEach(t => cp[t.code] = t.cap));
    const bk = S.bookings.find(b => b.status === 'ok').id; const f = [1, 0.95, 0.4, 0.6, 0.92, 1, 0.3, 0.85, 0.65]; let k = 0;
    S.allocs = S.allocs.filter(a => !cp[a.truck]).concat(Object.entries(cp).map(([c, cap]) => ({ bk, truck: c, tons: cap * f[(k++) % f.length] }))); render(); });
  await check(p, 'giả lập'); await p.locator('.ts36').screenshot({ path: `${OUT}/panel-light.png` });
  S('dark'); await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await p.waitForTimeout(200); await p.locator('.ts36').screenshot({ path: `${OUT}/panel-dark.png` });
});
await browser.close();
console.log(`\n${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
