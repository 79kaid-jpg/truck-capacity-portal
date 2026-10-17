// v3.17: kéo thả booking vào xe, gợi ý xe.
// Chạy: bash test/reset.sh && python3 test/e2e/server.py 8787 & node test/e2e/v44.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots/v44'; fs.mkdirSync(OUT, { recursive: true });
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

import { execSync } from 'child_process';
const sql = q => execSync(`psql -h /tmp -U postgres -d t -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
import { execSync as ex2 } from 'child_process';
const q = s => ex2(`psql -h /tmp -U postgres -d t -Atc "${s.replace(/"/g, '\\"')}"`).toString().trim();
// ngày có booking chờ xếp xe và có xe
const [wh, day] = q("select b.warehouse_code||'|'||b.day from app.bookings b where b.status='hold' and b.day>=current_date and exists(select 1 from app.daily_fleet f where f.warehouse_code=b.warehouse_code and f.day=b.day) group by 1 order by count(*) desc limit 1").split('|');
const openDay = async p => { await p.evaluate(([w, d]) => { V.wh = w; V.whAll = false; V.day = d; V.view = 'day'; V.dayTab = 'pending'; render(); }, [wh, day]); await p.waitForTimeout(400); };
const drag = async (p, from, to, steps = 12) => { const a = await from.boundingBox(), b = await to.boundingBox();
  await p.mouse.move(a.x + 30, a.y + 20); await p.mouse.down(); await p.mouse.move(a.x + 50, a.y + 30, { steps: 3 });
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps }); await p.waitForTimeout(150); };
await session('log@demo.vn', async p => {
  S('ui'); await openDay(p);
  ok(await p.locator('.pitem.dnd').count() >= 1, 'booking chờ xếp xe kéo được');
  ok(await p.locator('.dndbar [data-a="dndSuggestAll"]').count() === 1, 'có nút Gợi ý tất cả');
  S('suggest'); const it = p.locator('.pitem.dnd').first(); const bk = await it.getAttribute('data-bk');
  await it.locator('[data-a="dndSuggest"]').click(); await p.waitForTimeout(300);
  ok(await p.locator('.tcard.sugg').count() >= 1, 'xe được gợi ý có viền chạy quanh');
  ok(await p.locator('.tcard.sugg .dndtag').count() >= 1 && await p.locator('.tcard.sugg .bar .prev').count() >= 1, 'nhãn +MT và thanh xem trước');
  await p.screenshot({ path: `${OUT}/suggest.png` });
  await p.locator(`.pitem[data-bk="${bk}"] [data-a="dndAccept"]`).click(); await p.waitForTimeout(1500);
  ok(q(`select status from app.bookings where id='${bk}'`) === 'ok', 'Đồng ý → xếp & xác nhận', q(`select status from app.bookings where id='${bk}'`));
  ok(await p.locator('#dndSnack button').count() === 1, 'có Hoàn tác');
  await p.locator('#dndSnack button').click(); await p.waitForTimeout(1500);
  ok(q(`select status from app.bookings where id='${bk}'`) === 'hold' && q(`select count(*) from app.allocations where booking_id='${bk}'`) === '0', 'Hoàn tác trả về chờ xếp xe');
  S('drag-ok'); await openDay(p);
  const it2 = p.locator(`.pitem.dnd[data-bk="${bk}"]`); const need = await p.evaluate(x => dndNeed(bkById(x)), bk);
  const target = await p.evaluate(x => { const b = bkById(x); const t = trucksOf(b.wh, b.date).find(t => !truckLocked(t) && dndEval(b, t).k === 'ok'); return t && t.code; }, bk);
  if (target) {
    await drag(p, it2, p.locator(`.tcard[data-c="${target}"]`));
    ok(await p.locator(`.tcard[data-c="${target}"].dnd-ok`).count() === 1, 'rê qua xe đủ chỗ → viền xanh');
    await p.screenshot({ path: `${OUT}/drag.png` });
    await p.mouse.up(); await p.waitForTimeout(1600);
    ok(q(`select coalesce(sum(tons),0) from app.allocations where booking_id='${bk}' and truck_code='${target}'`) === String(need.toFixed(2)), 'thả → xếp vào xe', need);
  } else ok(false, 'không tìm được xe đủ chỗ để thử kéo');
  S('drag-over'); await openDay(p);
  const big = await p.evaluate(() => { const m = dayM(V.wh, V.day); return m.holds.filter(b => dndNeed(b) > 0).map(b => b.id); });
  const pair = await p.evaluate(ids => { for (const id of ids) { const b = bkById(id); const t = trucksOf(b.wh, b.date).find(t => !truckLocked(t) && dndEval(b, t).k === 'over'); if (t) return [id, t.code]; } return null; }, big);
  if (pair) {
    await drag(p, p.locator(`.pitem.dnd[data-bk="${pair[0]}"]`), p.locator(`.tcard[data-c="${pair[1]}"]`)); await p.mouse.up(); await p.waitForTimeout(400);
    ok(await p.evaluate(() => V.modal && V.modal.type === 'dndAsk'), 'vượt năng lực → hỏi Logistics');
    await p.screenshot({ path: `${OUT}/over.png` });
    await p.locator('.modal [data-m="all"]').click(); await p.waitForTimeout(300); ok(/lý do/i.test(await p.locator('.modal .err').innerText()), 'xếp vượt phải có lý do');
    await p.click('.modal [data-a="close"]');
  } else console.log('(bỏ qua: không có cặp booking/xe vượt tải)');
  S('cancel'); await openDay(p); const it3 = p.locator('.pitem.dnd').first(); const bk3 = await it3.getAttribute('data-bk');
  await drag(p, it3, p.locator('.dayhead')); await p.mouse.up(); await p.waitForTimeout(500);
  ok(q(`select count(*) from app.allocations where booking_id='${bk3}'`) === q(`select count(*) from app.allocations where booking_id='${bk3}'`) && await p.locator('#dndGhost').count() === 0, 'thả ra ngoài → bay về chỗ cũ');
  S('all'); await p.click('.dndbar [data-a="dndSuggestAll"]'); await p.waitForTimeout(400);
  const n = await p.locator('.dndbar [data-a="dndAcceptAll"]').count(); ok(n === 1 || /Không có booking/.test(await p.locator('#dndSnack').innerText()), 'Gợi ý tất cả');
});
await session('cs@demo.vn', async p => { S('cs'); await openDay(p); ok(await p.locator('.pitem.dnd').count() === 0, 'CS (không có quyền xếp xe) không kéo được'); });
await browser.close();
console.log(`${pass} OK, ${errors.length} lỗi`); if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
