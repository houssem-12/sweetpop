'use strict';
// A greedy player used to calibrate level difficulty.
const Core = require('../www/js/core.js');

function crateHp(g) {
  let s = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const t = g.grid[r][c]; if (t && t.k === 'x') s += t.hp; }
  return s;
}
function ingDepth(g) {
  let s = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const t = g.grid[r][c]; if (t && t.k === 'i') s += r; }
  return s;
}
function iceHp(g) {
  let s = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) s += g.ice[r][c];
  return s;
}

function value(g, m) {
  const c = Core.cloneGame(g);
  const res = Core.trySwap(c, m[0], m[1], m[2], m[3]);
  if (!res.valid) return -1e9;
  let v = (c.score - g.score) * 6;
  let created = 0;
  res.phases.forEach(p => { if (p.kind === 'clear') created += p.created.length; });
  v += created * 120;
  const goals = g.level.goals;
  goals.forEach(gl => {
    if (gl.type === 'ice') v += (iceHp(g) - iceHp(c)) * 220;
    else if (gl.type === 'color') v += (c.got[gl.color] - g.got[gl.color]) * 130;
    else if (gl.type === 'ingredient') v += (c.ingDropped - g.ingDropped) * 3000 + (ingDepth(c) - ingDepth(g)) * 220;
    else if (gl.type === 'crate') v += (crateHp(g) - crateHp(c)) * 260 + (c.cratesBroken - g.cratesBroken) * 300;
  });
  if (c.status === 'won') v += 1e6;
  return v;
}

function play(level, seed, cap, bonus) {
  const L = Object.assign({}, level, { moves: cap });
  const g = Core.createGame(L, seed);
  let tie = seed * 31 + 7;
  const rnd = () => { tie = (tie * 1103515245 + 12345) & 0x7fffffff; return tie / 0x7fffffff; };
  let used = 0;
  while (g.status === 'playing') {
    const moves = Core.findMoves(g, false);
    if (!moves.length) break;
    let best = null, bv = -Infinity;
    for (const m of moves) {
      const v = value(g, m) + rnd() * 25;
      if (v > bv) { bv = v; best = m; }
    }
    Core.trySwap(g, best[0], best[1], best[2], best[3]);
    used++;
  }
  if (bonus && g.status === 'won' && g.moves > 0) Core.bonusRound(g);
  return { won: g.status === 'won', used, score: g.score, stars: g.stars };
}

module.exports = { play };
