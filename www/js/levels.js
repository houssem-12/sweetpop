'use strict';
/*
 * Level definitions (without move counts / score targets - those are calibrated by tools/calibrate.js
 * and stored in levels-data.js). Deterministic: same n -> same level.
 */
(function (root) {
  var TOTAL = 120;

  function mulberry(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // shapes by column interval: tops/bots, -1 = column unused
  function shape(tops, bots) {
    var rows = [];
    for (var r = 0; r < 9; r++) {
      var s = '';
      for (var c = 0; c < 9; c++) s += (tops[c] >= 0 && r >= tops[c] && r <= bots[c]) ? '#' : '.';
      rows.push(s);
    }
    return rows;
  }
  function same(v) { return [v, v, v, v, v, v, v, v, v]; }
  var SHAPES = {
    small:   shape([-1, 1, 1, 1, 1, 1, 1, 1, -1], [-1, 7, 7, 7, 7, 7, 7, 7, -1]),
    full:    shape(same(0), same(8)),
    octagon: shape([2, 1, 0, 0, 0, 0, 0, 1, 2], [6, 7, 8, 8, 8, 8, 8, 7, 6]),
    castle:  shape([0, 1, 0, 1, 0, 1, 0, 1, 0], same(8)),
    bowl:    shape([3, 2, 1, 0, 0, 0, 1, 2, 3], same(8)),
    diamond: shape([4, 3, 2, 1, 0, 1, 2, 3, 4], [4, 5, 6, 7, 8, 7, 6, 5, 4]),
    cross:   shape([3, 3, 3, 0, 0, 0, 3, 3, 3], [5, 5, 5, 8, 8, 8, 5, 5, 5]),
    wave:    shape([0, 1, 2, 1, 0, 1, 2, 1, 0], [8, 7, 6, 7, 8, 7, 6, 7, 8]),
    slope:   shape([0, 1, 2, 3, 4, 3, 2, 1, 0], same(8)),
    tall:    shape([-1, -1, 0, 0, 0, 0, 0, -1, -1], [-1, -1, 8, 8, 8, 8, 8, -1, -1]),
    heart:   shape([2, 1, 0, 1, 3, 1, 0, 1, 2], [6, 7, 8, 8, 8, 8, 8, 7, 6]),
    twin:    shape([0, 0, 0, 3, 3, 3, 0, 0, 0], same(8))
  };
  var SHAPE_ORDER = ['full', 'octagon', 'castle', 'bowl', 'diamond', 'cross', 'wave', 'slope', 'tall', 'heart', 'twin'];

  function kindFor(n) {
    var intro = { 1: 'score', 2: 'score', 3: 'score', 4: 'color', 5: 'ice', 6: 'score', 7: 'ice', 8: 'color', 9: 'ingredient', 10: 'ice+score' };
    if (n <= 10) return intro[n];
    var cycle = ['ice', 'color', 'ingredient', 'crate', 'ice+color', 'score', 'ingredient+ice', 'crate+color', 'ice+crate', 'ingredient+crate'];
    return cycle[(n - 11) % cycle.length];
  }

  function playCells(rows) {
    var out = [];
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) if (rows[r].charAt(c) === '#') out.push([r, c]);
    return out;
  }

  function icePattern(n, rows, rng) {
    var cells = playCells(rows), want = Math.min(6 + Math.floor(n / 5), Math.floor(cells.length * 0.7));
    var mode = n % 5, picked = [], i;
    if (mode === 0) { // from the bottom up
      cells.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    } else if (mode === 1) { // checker near the middle
      cells = cells.filter(function (p) { return (p[0] + p[1]) % 2 === 0; });
      cells.sort(function (a, b) { return (Math.abs(a[0] - 4) + Math.abs(a[1] - 4)) - (Math.abs(b[0] - 4) + Math.abs(b[1] - 4)); });
    } else if (mode === 2) { // centre blob
      cells.sort(function (a, b) { return (Math.abs(a[0] - 4) + Math.abs(a[1] - 4)) - (Math.abs(b[0] - 4) + Math.abs(b[1] - 4)); });
    } else if (mode === 3) { // alternate columns
      cells = cells.filter(function (p) { return p[1] % 2 === 0; });
      cells.sort(function (a, b) { return b[0] - a[0]; });
    } else { // random
      for (i = cells.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    }
    want = Math.min(want, cells.length);
    var double = n >= 45 ? (n % 3 === 0 ? 1 : 0.4) : 0;
    for (i = 0; i < want; i++) picked.push([cells[i][0], cells[i][1], (double && (rng() < double)) ? 2 : 1]);
    return picked;
  }

  function cratePattern(n, rows, rng, avoid) {
    var cells = playCells(rows).filter(function (p) { return p[0] >= 2 && !avoid[p[0] * 9 + p[1]]; });
    for (var i = cells.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    var count = Math.min(3 + Math.floor(n / 12), 11, cells.length), out = [];
    for (var k = 0; k < count; k++) {
      var hp = 1;
      if (n >= 40 && rng() < 0.45) hp = 2;
      if (n >= 80 && rng() < 0.25) hp = 3;
      out.push([cells[k][0], cells[k][1], hp]);
    }
    return out;
  }

  function levelDef(n) {
    var rng = mulberry(n * 7919 + 13);
    var kind = kindFor(n);
    var colors = n <= 8 ? 4 : (n <= 40 ? 5 : 6);
    if (n > 8 && n % 5 === 0) colors = Math.max(4, colors - 1); // breather levels
    var shapeName;
    if (n <= 2) shapeName = 'small';
    else if (n <= 5) shapeName = n === 3 ? 'octagon' : 'full';
    else if (kind.indexOf('ingredient') >= 0) shapeName = ['castle', 'bowl', 'tall', 'cross', 'slope', 'twin'][n % 6];
    else shapeName = SHAPE_ORDER[(n * 5 + 3) % SHAPE_ORDER.length];
    var rows = SHAPES[shapeName];
    var def = { n: n, kind: kind, colors: colors, shapeName: shapeName, shape: rows, goals: [], ice: [], crates: [], ingStart: 0, ingTotal: 0 };
    var parts = kind.split('+');
    var avoid = {};
    parts.forEach(function (p) {
      if (p === 'score') def.goals.push({ type: 'score', n: 0 });
      else if (p === 'ice') { def.ice = icePattern(n, rows, rng); def.goals.push({ type: 'ice' }); }
      else if (p === 'color') {
        def.goals.push({ type: 'color', color: Math.floor(rng() * colors), n: Math.min(16 + Math.round(n * 0.3), 50) });
      } else if (p === 'ingredient') {
        def.ingTotal = Math.min(2 + Math.floor(n / 28), 5);
        def.ingStart = Math.min(2, def.ingTotal);
        def.goals.push({ type: 'ingredient', n: def.ingTotal });
      } else if (p === 'crate') {
        def.crates = cratePattern(n, rows, rng, avoid);
        def.goals.push({ type: 'crate' });
      }
    });
    return def;
  }

  var api = { TOTAL: TOTAL, SHAPES: SHAPES, levelDef: levelDef, kindFor: kindFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SweetLevels = api;
})(typeof window !== 'undefined' ? window : globalThis);
