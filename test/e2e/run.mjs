// End-to-end walkthrough of web/ against local Postgres (via server.py + mock-supabase.js). Test-only.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT || '/tmp/e2e-shots'; fs.mkdirSync(OUT, { recursive: true });
const mock = fs.readFileSync(new URL('./mock-supabase.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
const errors = []; let step = '';
async function session(email, fn, viewport = { width: 1440, height: 1000 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787',SUPABASE_ANON_KEY:'test'}" }));
  await page.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  page.on('pageerror', e => errors.push(`[${email} ${step}] pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${email} ${step}] console: ${m.text()}`); });
  await page.goto('http://127.0.0.1:8787/');
  await page.fill('#lg-e', email); await page.fill('#lg-p', 'Test@1234'); await page.click('#login button');
  await page.waitForTimeout(800);
  try { await fn(page); } catch (e) { errors.push(`[${email} ${step}] FAIL: ${e.message.split('\n')[0]}`); await page.screenshot({ path: `${OUT}/FAIL-${email}-${step}.png` }); }
  await ctx.close();
}
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const clr = p => p.evaluate(() => { V.toast = ''; document.querySelectorAll('.toast').forEach(e => e.remove()); });
const toast = async p => (await p.locator('.toast').textContent({ timeout: 4000 }).catch(() => '')) || '(no toast)';
const S = s => { step = s; };
const log = (...a) => console.log(...a);
const type = async (p, sel, v) => { await p.fill(sel, v); await p.locator(sel).dispatchEvent('input'); };

await session('kh@demo.vn', async p => {
  S('cal'); await p.waitForSelector('.cal'); await shot(p, '1-customer-calendar');
  const txt = await p.locator('.main').innerText();
  log('customer sees fleet words?', /Đã đặt:|xe đầu kéo/.test(txt), '| "Có thể đặt" cells:', (txt.match(/Có thể đặt/g) || []).length);
  S('custDay'); const btn = p.locator('[data-a="custDay"]').first(); if (await btn.count()) { await btn.click(); await shot(p, '1b-customer-day'); await p.click('[data-a="close"]'); } else log('customer: no custDay button');
});
await session('log@demo.vn', async p => {
  S('cal'); await p.waitForSelector('.cal'); await shot(p, '2-logistics-calendar');
  S('approvals'); await p.click('[data-a="go"][data-v="approvals"]'); await p.waitForTimeout(200); await shot(p, '2b-approvals');
  log('approvals rows', await p.locator('tr.click').count());
  S('assign'); await p.locator('tr.click').first().click(); await p.click('[data-a="asgSuggest"]');
  if (await p.locator('#asg-reason').count()) await type(p, '#asg-reason', 'test override');
  await clr(p); await p.click('[data-a="asgConfirm"]'); log('confirm ->', await toast(p), await p.locator('.err').first().textContent().catch(() => '')); await shot(p, '2c-booking-confirmed');
  S('day'); await p.click('[data-a="go"][data-v="calendar"]'); await p.locator('[data-a="openDay"]').first().click(); await p.waitForTimeout(200);
  await p.click('[data-a="dayTab"][data-t="merge"]'); await shot(p, '2d-day-merge');
  const ap = p.locator('[data-a="applyGroup"]'); if (await ap.count()) { await ap.first().click(); await p.waitForTimeout(500); await shot(p, '2e-group'); await clr(p); await p.click('[data-a="groupConfirm"]'); log('group ->', await toast(p)); } else log('no group suggestion');
  S('truck'); await p.locator('.tcard').first().click(); await p.waitForTimeout(200); await shot(p, '2f-truck');
  const ed = p.locator('[data-a="editAl"]'); if (await ed.count()) { await ed.first().click(); await type(p, '#ea-r', 'kiểm tra'); await clr(p); await p.click('[data-a="eaSave"]'); log('editAl ->', await toast(p)); }
  await p.keyboard.press('Escape');
  S('fleet'); await p.click('[data-a="go"][data-v="fleet"]'); await p.waitForTimeout(200);
  const inp = p.locator('input[data-f="fl"][data-k="dk"]:not([disabled])').nth(3); await inp.fill('10'); await inp.dispatchEvent('input');
  await clr(p); await p.click('[data-a="fleetSave"]'); log('fleet ->', await toast(p), await p.locator('.err').first().textContent().catch(() => '')); await shot(p, '2g-fleet');
  S('config'); await p.click('[data-a="go"][data-v="config"]'); await clr(p); await p.fill('#cf-near', '82'); await p.locator('#cf-near').dispatchEvent('change'); log('cfg ->', await toast(p));
  await p.click('[data-a="cfgTab"][data-t="catalog"]'); await type(p, '[data-k="thicks.value"]', '0,6'); await clr(p); await p.click('[data-a="catAdd"][data-k="thicks"]'); log('cat add ->', await toast(p));
  await clr(p); await p.locator('[data-a="catToggle"][data-k="thicks"]').last().click(); log('cat toggle ->', await toast(p)); await shot(p, '2h-catalog');
  S('dash'); await p.click('[data-a="go"][data-v="dash"]'); await p.waitForTimeout(200); await shot(p, '2i-dash');
  await p.click('[data-a="dashTab"][data-t="DB-02"]'); await shot(p, '2j-dash2');
});
await session('cs@demo.vn', async p => {
  S('newBk'); await p.waitForSelector('.cal'); await p.locator('[data-a="newBk"]').nth(2).click();
  await p.selectOption('#bf-cust', { label: 'Lysaght · KH0201' }); await p.waitForTimeout(100);
  await type(p, '#bf-ref', 'SO-E2E-1');
  const sel = (k, i) => p.locator(`select[data-f="bfl"][data-k="${k}"]`).nth(i);
  await sel('p', 0).selectOption({ index: 1 }); await sel('c', 0).selectOption({ index: 1 }); await sel('th', 0).selectOption({ index: 2 }); await sel('w', 0).selectOption({ index: 3 });
  await type(p, 'input[data-f="bfl"][data-k="t"]', '12,5');
  await shot(p, '3-cs-form'); await clr(p); await p.click('[data-a="bfHold"]'); log('hold ->', await toast(p), await p.locator('.modal .err').textContent().catch(() => ''));
  S('draft'); await p.locator('[data-a="newBk"]').nth(3).click(); await p.selectOption('#bf-cust', { index: 3 }); await clr(p); await p.click('[data-a="bfDraft"]'); log('draft ->', await toast(p));
  S('list'); await p.click('[data-a="go"][data-v="bookings"]'); await shot(p, '3b-cs-list');
  S('edit'); await p.locator('tr.click').first().click(); const eb = p.locator('[data-a="editBk"]');
  if (await eb.count()) { await eb.click(); await p.waitForTimeout(100); await shot(p, '3c-cs-edit');
    if (await p.locator('[data-a="bfCancelOn"]').count()) { await p.click('[data-a="bfCancelOn"]'); await type(p, '#bf-cr', 'khách hủy'); await clr(p); await p.click('[data-a="bfCancelGo"]'); log('cancel ->', await toast(p)); } }
});
await session('s1@demo.vn', async p => {
  S('cal'); await p.waitForSelector('.cal'); await p.locator('[data-a="openDay"]').first().click(); await p.waitForTimeout(200); await shot(p, '4-sales-day');
  log('sales sees "Khách khác":', (await p.locator('.main').innerText()).includes('Khách khác'));
  await p.click('[data-a="go"][data-v="bookings"]'); log('sales booking rows', await p.locator('tr.click').count());
});
await session('new@demo.vn', async p => { S('noprofile'); await shot(p, '5-noprofile'); log('noprofile:', await p.locator('h1').innerText()); });
await session('admin@demo.vn', async p => {
  S('users'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="userNew"]');
  await type(p, '#un-n', 'Người Mới'); await type(p, '#un-e', 'new@demo.vn');
  await clr(p); await p.click('[data-a="unSave"]'); log('grant ->', await toast(p), await p.locator('.modal .err').textContent().catch(() => '')); await shot(p, '6-admin-users');
  S('dash6'); await p.click('[data-a="go"][data-v="dash"]'); await p.click('[data-a="dashTab"][data-t="DB-06"]'); await p.waitForTimeout(600); await shot(p, '6b-admin-dash');
  S('testEmail'); await clr(p); await p.click('[data-a="testEmail"]'); log('test email ->', await toast(p));
  S('cust'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="customers"]'); await shot(p, '6c-admin-customers');
});
await session('admin@demo.vn', async p => {
  S('permsTab'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="perms"]'); await p.waitForTimeout(200); await shot(p, '10-perms');
  log('perm rows:', await p.locator('.pmtbl input[type=checkbox]').count(), '| admin perms.manage locked:', await p.locator('input[data-r="admin"][data-p="perms.manage"]').isDisabled());
  await p.locator('input[data-r="cs"][data-p="booking.cancel"]').uncheck(); await p.waitForTimeout(100);
  log('dirty note:', await p.locator('.mfoot .muted').first().innerText());
  await clr(p); await p.click('[data-a="pmSave"]'); log('save perms ->', await toast(p));
  S('adminApprovals'); await p.click('[data-a="go"][data-v="approvals"]'); log('admin approvals rows:', await p.locator('tr.click').count());
  await p.locator('tr.click').first().click(); log('admin sees assign buttons:', await p.locator('[data-a="asgSuggest"]').count() > 0, '| reject:', await p.locator('[data-a="asgPanel"][data-p="rej"]').count() > 0);
});
await session('cs@demo.vn', async p => {
  S('csNoCancel'); await p.click('[data-a="go"][data-v="bookings"]'); await p.click('[data-a="blTab"][data-t="hold"]'); log('hold tab rows:', await p.locator('tr.click').count());
  await p.locator('tr.click').first().click(); await p.click('[data-a="editBk"]'); await p.waitForTimeout(100);
  log('CS sees Hủy booking after revoke:', await p.locator('[data-a="bfCancelOn"]').count() > 0);
});
await session('s1@demo.vn', async p => { S('salesNav'); log('sales nav:', (await p.locator('nav.side button').evaluateAll(b => b.map(x => x.getAttribute('data-v')))).join(',')); });
await session('admin@demo.vn', async p => {
  S('permsReset'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="perms"]');
  await p.click('[data-a="pmResetOn"]'); await clr(p); await p.click('[data-a="pmResetGo"]'); log('reset ->', await toast(p));
  log('cs cancel back on:', await p.locator('input[data-r="cs"][data-p="booking.cancel"]').isChecked());
});
await session('admin@demo.vn', async p => {
  S('custEdit'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="customers"]');
  log('customer row buttons:', await p.locator('[data-a="custEdit"]').count(), await p.locator('[data-a="custToggle"]').count());
  const row = p.locator('tr', { hasText: 'Vạn Thành' }).filter({ hasNotText: 'UQ' });
  await row.locator('[data-a="custEdit"]').click(); await p.waitForTimeout(100);
  await type(p, '#ce-n', 'Vạn Thành Group'); await p.selectOption('#ce-s', 'DA'); await p.waitForTimeout(100);
  await p.selectOption('#ce-sl', { index: 1 }); await p.waitForTimeout(100); await shot(p, '11-cust-edit');
  log('sales warning shown:', await p.locator('.modal', { hasText: 'Đổi Sales' }).count() > 0);
  await clr(p); await p.click('[data-a="ceSave"]'); log('save customer ->', await toast(p));
  await p.locator('tr', { hasText: 'Vạn Thành Group' }).locator('[data-a="custEdit"]').click();
  await p.click('[data-a="addrNew"]'); await type(p, '#ad-l', 'Kho Nhơn Trạch'); await p.selectOption('#ad-p', 'Đồng Nai'); await p.waitForTimeout(100);
  log('auto region PMY:', await p.locator('#ad-r-PMY').inputValue()); await type(p, '#ad-w', 'Xã Phước An');
  await clr(p); await p.click('[data-a="addrSave"]'); log('add address ->', await toast(p), '| rows:', await p.locator('.modal tbody tr').count());
  await p.locator('.modal [data-a="addrDel"]').first().click(); await clr(p); await p.locator('.modal [data-a="addrDelGo"]').click(); log('delete address ->', await toast(p));
  await p.locator('.modal [data-a="addrDel"]').first().click(); await p.locator('.modal [data-a="addrDelGo"]').click(); await p.waitForTimeout(500);
  log('delete last address ->', await p.locator('.modal .err').innerText().catch(() => '(none)')); await shot(p, '11b-cust-addr');
  await p.click('[data-a="close"]');
  S('custToggle'); await clr(p); await p.locator('tr', { hasText: 'Lysaght' }).locator('[data-a="custToggle"]').click(); log('stop customer ->', await toast(p));
});
await session('cs@demo.vn', async p => {
  S('csInactive'); await p.locator('[data-a="newBk"]').first().click();
  const opts = await p.locator('#bf-cust option').allInnerTexts(); log('CS form has Lysaght:', opts.some(o => o.includes('Lysaght')), '| Vạn Thành Group:', opts.some(o => o.includes('Vạn Thành Group')));
});
await session('admin@demo.vn', async p => {
  S('custRestore'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="customers"]');
  await clr(p); await p.locator('tr', { hasText: 'Lysaght' }).locator('[data-a="custToggle"]').click(); log('restore customer ->', await toast(p));
});
await session('admin@demo.vn', async p => {
  S('loginAs'); await p.click('[data-a="go"][data-v="users"]'); await p.click('[data-a="uTab"][data-t="users"]');
  log('login-as buttons:', await p.locator('[data-a="loginAs"]').count());
  await clr(p); await p.locator('tr', { hasText: 'cs@demo.vn' }).locator('[data-a="loginAs"]').click(); log('login as CS ->', await toast(p));
  log('banner:', (await p.locator('.impbar').innerText()).split('\n')[0].slice(0, 60), '| nav:', (await p.locator('nav.side button').evaluateAll(b => b.map(x => x.getAttribute('data-v')))).join(','));
  await shot(p, '12-login-as-cs');
  await p.click('[data-a="menu"]'); await p.click('.menu [data-a="go"][data-v="profile"]'); log('profile pw hidden:', await p.locator('#pw1').count() === 0);
  await clr(p); await p.click('[data-a="impStop"]'); log('stop ->', await toast(p), '| back on users tab:', await p.locator('[data-a="loginAs"]').count() > 0);
  await clr(p); await p.locator('tr', { hasText: 'kh@demo.vn' }).locator('[data-a="loginAs"]').click(); await p.waitForTimeout(300);
  log('as customer: calendar cells "Có thể đặt":', ((await p.locator('.main').innerText()).match(/Có thể đặt/g) || []).length, '| banner:', await p.locator('.impbar').count());
  await shot(p, '12b-login-as-customer'); await p.click('[data-a="impStop"]'); await p.waitForTimeout(300);
});
await session('log@demo.vn', async p => {
  S('regEdit'); await p.click('[data-a="go"][data-v="config"]'); await p.click('[data-a="cfgTab"][data-t="regions"]');
  log('region edit buttons:', await p.locator('[data-a="regEdit"]').count());
  await p.locator('tr', { hasText: 'PMY-DNA' }).first().locator('[data-a="regEdit"]').click().catch(async () => { await p.locator('tr', { hasText: 'DNA' }).first().locator('[data-a="regEdit"]').click(); });
  await type(p, '#re-n', 'Vũng Tàu'); await clr(p); await p.click('[data-a="regEditSave"]'); await p.waitForTimeout(300);
  log('duplicate name ->', await p.locator('tr.editing .err').innerText().catch(() => '(none)'));
  await type(p, '#re-n', 'Đồng Nai (Biên Hòa)'); await p.fill('#re-d', '2'); await p.locator('#re-d').dispatchEvent('input');
  await p.locator('tr.editing input[data-f="regENb"]', { has: p.locator('xpath=.') }).first();
  const lan = p.locator('tr.editing label', { hasText: 'Long An' }).locator('input'); await lan.check();
  await shot(p, '13-region-edit'); await clr(p); await p.click('[data-a="regEditSave"]'); log('save region ->', await toast(p));
  const longAn = await p.locator('tr', { hasText: 'Long An' }).first().innerText(); log('Long An neighbors now include renamed:', longAn.includes('Đồng Nai (Biên Hòa)'));
  const dna = await p.locator('tr', { hasText: 'Đồng Nai (Biên Hòa)' }).first().innerText(); log('renamed row:', dna.replace(/\s+/g, ' ').slice(0, 120));
});
await session('new@demo.vn', async p => { S('granted'); log('new user after grant sees calendar:', await p.locator('.cal').count() > 0); });
await session('kh@demo.vn', async p => { S('mobile'); await p.waitForSelector('.cal'); await shot(p, '7-customer-mobile'); }, { width: 390, height: 844 });
{ // forgot password + recovery link (no login)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  await p.route('**/cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: mock }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: "window.APP_CONFIG={SUPABASE_URL:'http://127.0.0.1:8787/rest/v1/',SUPABASE_ANON_KEY:'test'}" }));
  await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  p.on('pageerror', e => errors.push(`[forgot ${step}] pageerror: ${e.message}`));
  S('forgot'); await p.goto('http://127.0.0.1:8787/'); await p.fill('#lg-e', 'cs@demo.vn'); await p.click('#lg-forgot');
  await p.click('#fg button'); await p.waitForTimeout(300); log('forgot ->', (await p.locator('.loginbox').innerText()).split('\n').slice(1, 2).join(' '), JSON.stringify(await p.evaluate(() => window.__reset)));
  await shot(p, '8-forgot-sent');
  S('expired'); await p.goto('about:blank'); await p.goto('http://127.0.0.1:8787/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'); await p.waitForTimeout(400);
  log('expired link ->', await p.locator('.err').innerText().catch(() => '(none)'));
  S('recovery'); await p.goto('about:blank'); await p.goto('http://127.0.0.1:8787/#access_token=x&type=recovery&mock_uid=00000000-0000-0000-0000-0000000000c1&mock_email=cs@demo.vn'); await p.waitForTimeout(500);
  log('recovery screen ->', await p.locator('h1').innerText(), '| hash cleared:', await p.evaluate(() => location.hash === ''));
  await shot(p, '9-set-password');
  await p.fill('#sp1', 'abc'); await p.fill('#sp2', 'abc'); await p.click('#sp button'); log('short pw ->', await p.locator('#sp-err').innerText());
  await p.fill('#sp1', 'MatKhauMoi1'); await p.fill('#sp2', 'MatKhauMoi1'); await p.click('#sp button'); await p.waitForTimeout(800);
  log('after set password sees calendar:', await p.locator('.cal').count() > 0);
  await ctx.close();
}
await browser.close();
console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
