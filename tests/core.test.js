'use strict';
const assert = require('assert');
const Core = require('../www/js/core.js');
const { W, H } = Core;

const FULL = new Array(9).fill('#########');
const CROSS = ['...###...', '...###...', '...###...', '#########', '#########', '#########', '...###...', '...###...', '...###...'];
const SLOPE = (() => {
  const tops = [0, 1, 2, 3, 4, 3, 2, 1, 0];
  const rows = [];
  for (let r = 0; r < 9; r++) rows.push(tops.map(t => (r >= t ? '#' : '.')).join(''));
  return rows;
})();

function lvl(extra) {
  return Object.assign({ n: 1, colors: 5, moves: 30, shape: FULL, goals: [{ type: 'score', n: 999999 }], star2: 1e9, star3: 1e9 }, extra);
}

function checkInvariants(g, label) {
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const t = g.grid[r][c];
      if (g.play[r][c]) {
        assert(t, `${label}: empty playable cell ${r},${c}`);
        if (t.k === 'c') {
          assert(t.s >= 0 && t.s <= 4);
          if (t.s === 4) assert.strictEqual(t.t, -1); else assert(t.t >= 0 && t.t < g.colors, `${label}: bad colour ${t.t}`);
        }
        if (t.k === 'x') assert(t.hp > 0);
      } else assert.strictEqual(t, null, `${label}: tile outside shape`);
    }
  }
  if (g.status === 'playing') assert.strictEqual(Core.findRuns(g).length, 0, `${label}: unresolved match left`);
  if (g.status === 'playing') assert(Core.hasAnyMove(g), `${label}: no valid move`);
  assert(g.iceLeft >= 0 && g.iceLeft <= g.iceTotal);
  assert(g.cratesBroken <= g.crateTotal);
  assert(g.ingDropped <= g.ingSpawned);
}

function rngFactory(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function fuzz(level, games, label) {
  let swaps = 0, specials = 0, wins = 0, shuffles = 0;
  for (let i = 1; i <= games; i++) {
    const g = Core.createGame(level, i * 101);
    checkInvariants(g, label + ' init');
    const rr = rngFactory(i);
    while (g.status === 'playing') {
      const mv = Core.findMoves(g, false);
      assert(mv.length > 0);
      const m = mv[Math.floor(rr() * mv.length)];
      const before = g.moves;
      const res = Core.trySwap(g, m[0], m[1], m[2], m[3]);
      assert(res.valid, label + ': listed move rejected');
      assert.strictEqual(g.moves, before - 1);
      swaps++;
      res.phases.forEach(p => {
        if (p.kind === 'clear') specials += p.created.length;
        if (p.kind === 'shuffle') shuffles++;
      });
      checkInvariants(g, label + ' game ' + i);
    }
    if (g.status === 'won') wins++;
  }
  return { swaps, specials, wins, shuffles };
}

// 1. an invalid swap changes nothing
{
  const g = Core.createGame(lvl({}), 5);
  const snap = JSON.stringify(g.grid), moves = g.moves;
  let found = null;
  for (let r = 0; r < H && !found; r++) for (let c = 0; c < W - 1 && !found; c++) if (!Core.isValidSwap(g, r, c, r, c + 1)) found = [r, c];
  const res = Core.trySwap(g, found[0], found[1], found[0], found[1] + 1);
  assert(!res.valid);
  assert.strictEqual(JSON.stringify(g.grid), snap);
  assert.strictEqual(g.moves, moves);
  console.log('ok  invalid swap leaves board untouched');
}

// 2. hand-made board: a 4-run makes a striped candy, a 5-run a colour bomb, an L makes a wrapped candy
function board(rows) {
  const g = Core.createGame(lvl({ colors: 6 }), 1);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) g.grid[r][c] = { k: 'c', t: 5, s: 0 };
  // checkerboard of colours 3/4/5 so nothing matches by accident
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) g.grid[r][c].t = 3 + ((r + 2 * c) % 3);
  rows.forEach(([r, c, t]) => { g.grid[r][c] = { k: 'c', t, s: 0 }; });
  return g;
}
{
  const g = board([[4, 0, 0], [4, 1, 0], [4, 3, 0], [3, 2, 0]]); // swap (3,2)<->(4,2) makes 4 in a row
  const res = Core.trySwap(g, 3, 2, 4, 2);
  assert(res.valid);
  const clear = res.phases.find(p => p.kind === 'clear');
  assert(clear.created.length >= 1 && clear.created[0].tile.s === Core.SP.SV, 'horizontal four should create a vertical striped candy');
  console.log('ok  4-run creates striped candy');
}
{
  const g = board([[4, 0, 0], [4, 1, 0], [4, 3, 0], [4, 4, 0], [3, 2, 0]]);
  const res = Core.trySwap(g, 3, 2, 4, 2);
  assert(res.valid);
  const clear = res.phases.find(p => p.kind === 'clear');
  assert(clear.created.some(x => x.tile.s === Core.SP.BOMB), 'five in a row should create a colour bomb');
  console.log('ok  5-run creates colour bomb');
}
{
  // L shape: horizontal 3 at row 4 cols 0-2, vertical at col 0 rows 2-4 after swap
  const g = board([[4, 0, 0], [4, 1, 0], [2, 0, 0], [3, 0, 0], [4, 3, 0], [5, 2, 0]]);
  // put missing piece (4,2) via swap of (5,2)<-> (4,2): need colour 0 at (5,2)
  const res = Core.trySwap(g, 5, 2, 4, 2);
  assert(res.valid);
  const clear = res.phases.find(p => p.kind === 'clear');
  assert(clear.created.some(x => x.tile.s === Core.SP.WRAP), 'L/T should create wrapped candy');
  console.log('ok  L-shape creates wrapped candy');
}

// 3. colour bomb + candy clears every candy of that colour
{
  const g = board([[4, 4, 0]]);
  g.grid[4][5] = { k: 'c', t: -1, s: Core.SP.BOMB };
  const count = () => { let n = 0; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (g.grid[r][c].k === 'c' && g.grid[r][c].t === 0) n++; return n; };
  assert.strictEqual(count(), 1);
  const res = Core.trySwap(g, 4, 5, 4, 4);
  assert(res.valid);
  assert(res.phases.some(p => p.kind === 'clear' && p.cleared.length >= 2));
  console.log('ok  bomb + candy combo');
}

// 4. goals: ice, crates, ingredients behave
{
  const L = lvl({ goals: [{ type: 'ice' }], ice: [[8, 0, 1], [8, 1, 1], [8, 2, 1]], moves: 60 });
  const g = Core.createGame(L, 3);
  assert.strictEqual(g.iceTotal, 3);
  console.log('ok  ice counted');
}
{
  const L = lvl({ goals: [{ type: 'ingredient', n: 2 }], ingStart: 2, ingTotal: 2, moves: 80 });
  const g = Core.createGame(L, 3);
  assert.strictEqual(g.ingSpawned, 2);
  console.log('ok  ingredients placed');
}

// 5. fuzz on several shapes and goal sets
const variants = [
  ['full', lvl({})],
  ['cross', lvl({ shape: CROSS })],
  ['slope', lvl({ shape: SLOPE, colors: 6 })],
  ['ice+crates', lvl({ ice: [[6, 2, 2], [7, 3, 1], [8, 4, 1], [5, 5, 1]], crates: [[4, 1, 1], [4, 7, 2], [6, 4, 2]], goals: [{ type: 'ice' }, { type: 'crate' }], moves: 40 })],
  ['ingredients', lvl({ ingStart: 2, ingTotal: 5, goals: [{ type: 'ingredient', n: 5 }], moves: 60, shape: CROSS })],
  ['4 colours', lvl({ colors: 4 })]
];
for (const [name, L] of variants) {
  const s = fuzz(L, 60, name);
  console.log(`ok  fuzz ${name}: ${s.swaps} swaps, ${s.specials} specials created, ${s.shuffles} shuffles, ${s.wins} wins`);
}
console.log('ALL CORE TESTS PASSED');
