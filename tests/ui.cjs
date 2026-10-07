// 画面の通しプレイ：1366×768・タッチで dist/index.html を最後まで遊び、各画面を撮る
// node tests/ui.cjs [出力先]
'use strict';
const { chromium } = require(process.env.PW_PATH || 'playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const out = process.argv[2] || path.join(__dirname, '..', 'shots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const phone = process.env.PHONE === '1';
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: phone ? { width: 390, height: 844 } : { width: 1366, height: 768 }, hasTouch: true, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?mode=' + (process.env.MODE || 1));
  const shot = {};
  async function snap(name) { if (!shot[name]) { shot[name] = 1; await page.screenshot({ path: path.join(out, name + '.png') }); } }
  await snap('00-title');
  await page.tap('button.primary');
  await snap('00b-hero'); await page.tap('.herocard >> nth=' + Math.floor(Math.random() * 5));
  // せつめい 3まい → れんしゅう バトル（ガイドに したがって 勝つ）→ 本番
  for (let k = 0; k < 3; k++) { await snap('00c-rules' + k); await page.tap('main.rules button.primary'); }
  for (let k = 0; k < 40; k++) {
    if (await page.$('.coach') === null) break;
    await snap('00d-tutorial');
    const c = await page.$$('.hand .card:not(.off)');
    if (c.length) { await c[0].tap(); await snap('00e-tutorial-sel'); await page.tap('.hand .card.selected'); } else await page.tap('.endturn');
  }
  await snap('00f-tutorialdone'); await page.tap('main button.primary');
  let overflow = [];
  for (let step = 0; step < 1500; step++) {
    if (await page.$('.popwrap.modal')) { await snap('09-heartpop'); await page.waitForTimeout(2200); await snap('09b-heartpop-after'); await page.tap('.popwrap.modal button.primary'); continue; }
    const phase = await page.getAttribute('#app', 'data-phase');
    const ov = await page.evaluate(() => {
      if (document.documentElement.scrollWidth <= window.innerWidth) return null;
      const W = window.innerWidth, out = [];
      document.querySelectorAll('#app *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > W + 1) out.push(String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) + '@' + Math.round(r.right)); });
      return out.slice(0, 3).join(',');
    });
    if (ov) overflow.push(phase + ':' + ov);
    if (phase === 'map') { await snap('01-map'); const nodes = await page.$$('.mnode.here'); await nodes[step % nodes.length].tap(); }
    else if (phase === 'battle') {
      await snap('02-battle');
      if (await page.$('.playpop')) await page.tap('.playpop');
      const playable = await page.$$('.hand .card:not(.off)');
      if (playable.length) { await playable[0].tap(); await snap('03-selected'); await page.tap('.hand .card.selected'); await page.waitForTimeout(250); await snap('03b-playpop'); }
      else await page.tap('.endturn');
    }
    else if (phase === 'reward') { await snap('04-reward'); const c = await page.$('.choices .card'); if (c) await c.tap(); else await page.tap('.reward > button.secondary'); }
    else if (phase === 'intro') { await snap('01b-intro'); await page.tap('main button.primary'); }
    else if (phase === 'actclear') { await snap('06b-actclear'); await page.tap('main button.primary'); }
    else if (phase === 'rest') { await snap('05-rest'); await page.tap('.two button >> nth=0'); }
    else if (phase === 'event') {
      await snap('06-event');
      const opt = await page.$('.opt:not([disabled])');
      if (opt) await opt.tap(); else await page.tap('.event button.primary');
    }
    else if (phase === 'end') {
      await snap('07-debrief1'); await page.tap('.nav button.primary');
      await snap('08-debrief2'); await page.tap('.nav button.primary');
      await snap('09-debrief3');
      break;
    }
  }
  const phase = await page.getAttribute('#app', 'data-phase');
  await browser.close();
  const result = { reachedEnd: phase === 'end', errors, overflow: [...new Set(overflow)] };
  console.log(JSON.stringify(result));
  process.exit(result.reachedEnd && !errors.length && !result.overflow.length ? 0 : 1);
})();
