'use strict';
// Real-browser smoke test: phone-sized viewport, plays levels through the UI, records JS errors, takes screenshots.
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

const OUT = process.argv[2] || '/tmp/claude-shots';
fs.mkdirSync(OUT, { recursive: true });
const url = 'file://' + path.resolve(__dirname, '../www/index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  const ctx = await browser.newContext({ viewport: { width: 393, height: 786 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => errors.push('request failed: ' + r.url()));
  page.on('request', r => { if (/^https?:/.test(r.url())) errors.push('NETWORK REQUEST (should be offline): ' + r.url()); });

  await page.goto(url);
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/1-home.png' });

  await page.click('#btnLevels');
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/2-map.png' });

  // unlock everything for testing, then play different level kinds
  await page.evaluate(() => { window.__sweet.store.all = true; });

  const kinds = [1, 5, 9, 14, 17, 21, 25, 46, 60, 100];
  let step = 0;
  for (const n of kinds) {
    await page.evaluate(n => window.__sweet.startLevel(n), n);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/lv${n}-start.png` });
    // play 6 valid moves by calling the same path as the UI (swap via pointer events on the canvas)
    for (let i = 0; i < 6; i++) {
      const mv = await page.evaluate(() => {
        const g = window.__sweet.state();
        const m = window.SweetCore.findMoves(g, false);
        return g.status === 'playing' && m.length ? m[Math.floor(m.length / 2)] : null;
      });
      if (!mv) break;
      const box = await page.evaluate(() => { const r = document.getElementById('board').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
      const bd = await page.evaluate(() => window.__sweet.bounds()); const cs = box.w / (bd.bb.c1 - bd.bb.c0 + 1);
      const x1 = box.x + (mv[1] - bd.bb.c0 + 0.5) * cs, y1 = box.y + (mv[0] - bd.bb.r0 + 0.5) * cs;
      const x2 = box.x + (mv[3] - bd.bb.c0 + 0.5) * cs, y2 = box.y + (mv[2] - bd.bb.r0 + 0.5) * cs;
      await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 3 }); await page.mouse.move(x2, y2, { steps: 3 }); await page.mouse.up();
      if (i === 0) await page.waitForTimeout(110);
      if (i === 0) await page.screenshot({ path: `${OUT}/lv${n}-mid.png` });
      await page.waitForFunction(() => !window.__sweet.busy(), null, { timeout: 40000 }).catch(async e => { console.log('BUSY STUCK level', n, JSON.stringify(await page.evaluate(() => { const g = window.__sweet.state(); return [g.status, g.moves, g.score]; }))); throw e; });
      // after animation the displayed sprites must match the engine grid
      const mismatch = await page.evaluate(() => {
        const g = window.__sweet.state();
        return g.status === 'playing' ? window.SweetCore.findRuns(g).length : 0;
      });
      if (mismatch) errors.push(`level ${n}: unresolved runs after move ${i}`);
      step++;
    }
    await page.screenshot({ path: `${OUT}/lv${n}-after.png` });
  }

  // win a level quickly by letting the engine autoplay (checks result modal + progress saving)
  await page.evaluate(() => window.__sweet.startLevel(1));
  await page.waitForTimeout(900);
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => { const g = window.__sweet.state(); return g.status; });
    if (st !== 'playing') break;
    await page.evaluate(async () => {
      const g = window.__sweet.state(); const m = window.SweetCore.findMoves(g, false);
      if (m.length) await window.__sweet.swap(m[0][0], m[0][1], m[0][2], m[0][3]);
    });
  }
  await page.waitForTimeout(1800);
  await page.screenshot({ path: OUT + '/result.png' });
  const modal = await page.evaluate(() => document.getElementById('modal').innerText);
  console.log('result modal text:', JSON.stringify(modal.slice(0, 80)));

  console.log('moves played through the UI:', step);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no JS errors, no network requests');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
