'use strict';
// usage: node tools/calibrate.js <from> <to> <step> <out.json>
// Calibrates move counts / score targets so every level is winnable by a greedy bot,
// with difficulty rising across the 120 levels.
const fs = require('fs');
const Levels = require('../www/js/levels.js');
const { play } = require('./bot.js');

const from = +process.argv[2] || 1, to = +process.argv[3] || Levels.TOTAL, step = +process.argv[4] || 1;
const out = process.argv[5] || '/tmp/levels-part.json';
const SAMPLE = +process.env.SAMPLE || 8, VERIFY = +process.env.VERIFY || 12;

const median = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const round100 = x => Math.max(50, Math.round(x / 50) * 50);

function calibrate(n) {
  const def = Levels.levelDef(n);
  const scoreIdx = def.goals.findIndex(g => g.type === 'score');
  const onlyScore = def.goals.length === 1 && scoreIdx === 0;
  const t = n / Levels.TOTAL;
  const seeds = k => Array.from({ length: k }, (_, i) => n * 1000 + i);
  let moves;

  if (onlyScore) {
    moves = 14 + Math.floor(n / 12);
    const L = Object.assign({}, def, { goals: [{ type: 'score', n: 1e9 }] });
    const scores = seeds(SAMPLE).map(s => play(L, s, moves).score);
    const target = round100(median(scores) * (0.72 + 0.2 * t));
    def.goals = [{ type: 'score', n: target }];
    def.star2 = round100(target * 1.25);
    def.star3 = round100(target * 1.6);
  } else {
    const L0 = Object.assign({}, def, { goals: def.goals.filter(g => g.type !== 'score') });
    const runs = seeds(SAMPLE).map(s => play(L0, s, 70));
    const need = median(runs.map(r => (r.won ? r.used : 70)));
    const f = 1.75 - 0.55 * t;
    moves = Math.max(10, Math.min(45, Math.ceil(need * f)));
    if (scoreIdx >= 0) {
      const sc = median(runs.filter(r => r.won).map(r => r.score).concat(runs.map(r => r.score)));
      def.goals[scoreIdx].n = round100(sc * 0.55);
    }
  }

  const needRate = 0.65 - 0.3 * t;
  let rate = 0, res = [];
  for (let tries = 0; tries < 8; tries++) {
    const L = Object.assign({}, def, { moves });
    res = seeds(VERIFY).map(s => play(L, s + 500, moves));
    rate = res.filter(r => r.won).length / res.length;
    if (rate >= needRate || moves >= 50) break;
    moves += 2;
  }
  def.moves = moves;
  if (!onlyScore) {
    const ref = median(res.map(r => r.score));
    def.star2 = round100(ref * 1.12);
    def.star3 = round100(ref * 1.45);
  }
  def.botWinRate = Math.round(rate * 100) / 100;
  return def;
}

const result = [];
for (let n = from; n <= to; n += step) {
  const t0 = Date.now();
  const d = calibrate(n);
  result.push(d);
  process.stderr.write(`level ${n} [${d.kind}] moves=${d.moves} win=${d.botWinRate} (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  fs.writeFileSync(out, JSON.stringify(result));
}
