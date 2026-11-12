'use strict';
/*
 * Sweet Pop - match-3 engine (pure logic, no DOM).
 * Works in the browser (window.SweetCore) and in node (module.exports) for testing.
 * Written for old WebEngine (Chromium ~87): plain ES2017 only.
 */
(function (root) {
  var W = 9, H = 9;
  var SP = { NONE: 0, SH: 1, SV: 2, WRAP: 3, BOMB: 4 };

  // ---------- random (state lives in g.rs so a game can be cloned) ----------
  function rnd(g) {
    g.rs = (g.rs + 0x6D2B79F5) | 0;
    var t = g.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rint(g, n) { return Math.floor(rnd(g) * n); }

  function key(r, c) { return r * W + c; }
  function inb(r, c) { return r >= 0 && r < H && c >= 0 && c < W; }
  function isPlay(g, r, c) { return inb(r, c) && g.play[r][c]; }
  function copyTile(t) { return t ? { k: t.k, t: t.t, s: t.s, hp: t.hp } : null; }

  // ---------- creation ----------
  function createGame(level, seed) {
    var g = {
      level: level, rs: (seed | 0) || 1, moves: level.moves, score: 0, colors: level.colors,
      grid: [], ice: [], play: [], top: [], bot: [], got: [0, 0, 0, 0, 0, 0],
      iceTotal: 0, iceLeft: 0, crateTotal: 0, cratesBroken: 0,
      ingSpawned: 0, ingDropped: 0, status: 'playing', bonus: 0, stars: 0
    };
    var r, c;
    for (r = 0; r < H; r++) {
      g.grid.push(new Array(W).fill(null));
      g.ice.push(new Array(W).fill(0));
      var row = [];
      for (c = 0; c < W; c++) row.push(level.shape[r].charAt(c) === '#');
      g.play.push(row);
    }
    for (c = 0; c < W; c++) {
      var top = -1, bot = -1;
      for (r = 0; r < H; r++) {
        if (g.play[r][c]) {
          if (top < 0) top = r;
          else if (bot !== r - 1) throw new Error('column ' + c + ' not contiguous');
          bot = r;
        }
      }
      g.top.push(top); g.bot.push(bot);
    }
    var tries = 0;
    do {
      fillColors(g, true);
      tries++;
    } while (tries < 300 && !hasAnyMove(g));

    (level.ice || []).forEach(function (e) {
      if (g.play[e[0]][e[1]]) { g.ice[e[0]][e[1]] = e[2]; g.iceTotal++; }
    });
    g.iceLeft = g.iceTotal;
    (level.crates || []).forEach(function (e) {
      if (g.play[e[0]][e[1]]) { g.grid[e[0]][e[1]] = { k: 'x', hp: e[2] }; g.crateTotal++; }
    });
    var n = level.ingStart || 0;
    for (var i = 0; i < n; i++) {
      var cc = rint(g, W), guard = 0;
      while ((g.top[cc] < 0 || !g.grid[g.top[cc]][cc] || g.grid[g.top[cc]][cc].k !== 'c') && guard++ < 50) cc = rint(g, W);
      var tt = g.top[cc];
      if (tt >= 0 && g.grid[tt][cc] && g.grid[tt][cc].k === 'c') { g.grid[tt][cc] = { k: 'i' }; g.ingSpawned++; }
    }
    // overlays only removed candies, so matches cannot appear; make sure a move exists
    var guard2 = 0;
    while (!hasAnyMove(g) && guard2++ < 100) fillColors(g, false);
    return g;
  }

  // fill (or refill) candy colours without creating matches. keepSpecial: keep non-candy tiles
  function fillColors(g, all) {
    for (var r = 0; r < H; r++) {
      for (var c = 0; c < W; c++) {
        if (!g.play[r][c]) continue;
        var cur = g.grid[r][c];
        if (!all && !(cur && cur.k === 'c' && cur.s === 0)) continue;
        var bad = {};
        var a = c >= 2 ? g.grid[r][c - 1] : null, b = c >= 2 ? g.grid[r][c - 2] : null;
        if (a && b && a.k === 'c' && b.k === 'c' && a.t === b.t) bad[a.t] = true;
        a = r >= 2 ? g.grid[r - 1][c] : null; b = r >= 2 ? g.grid[r - 2][c] : null;
        if (a && b && a.k === 'c' && b.k === 'c' && a.t === b.t) bad[a.t] = true;
        var t = rint(g, g.colors), n = 0;
        while (bad[t] && n++ < 20) t = rint(g, g.colors);
        if (bad[t]) { for (t = 0; t < g.colors; t++) if (!bad[t]) break; }
        g.grid[r][c] = { k: 'c', t: t, s: 0 };
      }
    }
  }

  function cloneGame(g) {
    var n = {};
    for (var k in g) if (Object.prototype.hasOwnProperty.call(g, k)) n[k] = g[k];
    n.grid = g.grid.map(function (row) { return row.map(copyTile); });
    n.ice = g.ice.map(function (row) { return row.slice(); });
    n.got = g.got.slice();
    return n; // level / play / top / bot are shared (read only)
  }

  // ---------- matching ----------
  function findRuns(g) {
    var runs = [], r, c, run, tile, prev;
    function flush() { if (run && run.cells.length >= 3) runs.push(run); run = null; }
    for (r = 0; r < H; r++) {
      run = null; prev = -2;
      for (c = 0; c < W; c++) {
        tile = g.grid[r][c];
        var col = tile && tile.k === 'c' ? tile.t : -2;
        if (col >= 0 && col === prev && run) run.cells.push([r, c]);
        else { flush(); if (col >= 0) run = { dir: 'h', t: col, cells: [[r, c]] }; }
        prev = col;
      }
      flush();
    }
    for (c = 0; c < W; c++) {
      run = null; prev = -2;
      for (r = 0; r < H; r++) {
        tile = g.grid[r][c];
        var col2 = tile && tile.k === 'c' ? tile.t : -2;
        if (col2 >= 0 && col2 === prev && run) run.cells.push([r, c]);
        else { flush(); if (col2 >= 0) run = { dir: 'v', t: col2, cells: [[r, c]] }; }
        prev = col2;
      }
      flush();
    }
    return runs;
  }

  function analyzeMatches(g, pivots) {
    var runs = findRuns(g);
    if (!runs.length) return null;
    var cells = {}, hmap = {}, vmap = {}, creations = [], used = {};
    runs.forEach(function (run, i) {
      run.cells.forEach(function (p) {
        var k = key(p[0], p[1]);
        cells[k] = true;
        if (run.dir === 'h') hmap[k] = i; else vmap[k] = i;
      });
    });
    function normalAt(p) {
      var t = g.grid[p[0]][p[1]];
      return t && t.k === 'c' && t.s === 0 && !used[key(p[0], p[1])];
    }
    function pick(run) {
      var i, j;
      for (i = 0; i < pivots.length; i++) {
        for (j = 0; j < run.cells.length; j++) {
          if (run.cells[j][0] === pivots[i][0] && run.cells[j][1] === pivots[i][1] && normalAt(run.cells[j])) return run.cells[j];
        }
      }
      var mid = Math.floor((run.cells.length - 1) / 2);
      if (normalAt(run.cells[mid])) return run.cells[mid];
      for (j = 0; j < run.cells.length; j++) if (normalAt(run.cells[j])) return run.cells[j];
      return null;
    }
    function runHasCreation(run) {
      return run.cells.some(function (p) { return used[key(p[0], p[1])]; });
    }
    runs.forEach(function (run) {
      if (run.cells.length >= 5) {
        var p = pick(run);
        if (p) { used[key(p[0], p[1])] = true; creations.push({ r: p[0], c: p[1], tile: { k: 'c', t: -1, s: SP.BOMB } }); }
      }
    });
    Object.keys(hmap).forEach(function (ks) {
      var k = +ks;
      if (vmap[k] === undefined || used[k]) return;
      var r = Math.floor(k / W), c = k % W, t = g.grid[r][c];
      if (t && t.k === 'c' && t.s === 0) {
        used[k] = true;
        creations.push({ r: r, c: c, tile: { k: 'c', t: t.t, s: SP.WRAP } });
      }
    });
    runs.forEach(function (run) {
      if (run.cells.length === 4 && !runHasCreation(run)) {
        var p = pick(run);
        if (p) {
          used[key(p[0], p[1])] = true;
          creations.push({ r: p[0], c: p[1], tile: { k: 'c', t: run.t, s: run.dir === 'h' ? SP.SV : SP.SH } });
        }
      }
    });
    return { cells: cells, creations: creations };
  }

  // ---------- moves ----------
  function movable(t) { return t && (t.k === 'c' || t.k === 'i'); }

  function comboOf(a, b) {
    if (a.k !== 'c' || b.k !== 'c') return null;
    if (!a.s && !b.s) return null;
    if (a.s === SP.BOMB && b.s === SP.BOMB) return 'bomb2';
    if (a.s === SP.BOMB || b.s === SP.BOMB) return 'bombx';
    if (a.s && b.s) {
      var sa = a.s === SP.WRAP, sb = b.s === SP.WRAP;
      if (sa && sb) return 'wrap2';
      if (sa || sb) return 'stripewrap';
      return 'stripe2';
    }
    return null;
  }

  function isValidSwap(g, r1, c1, r2, c2) {
    if (!isPlay(g, r1, c1) || !isPlay(g, r2, c2)) return false;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
    var a = g.grid[r1][c1], b = g.grid[r2][c2];
    if (!movable(a) || !movable(b)) return false;
    if (comboOf(a, b)) return true;
    g.grid[r1][c1] = b; g.grid[r2][c2] = a;
    var ok = findRuns(g).length > 0;
    g.grid[r1][c1] = a; g.grid[r2][c2] = b;
    return ok;
  }

  function findMoves(g, firstOnly) {
    var out = [];
    for (var r = 0; r < H; r++) {
      for (var c = 0; c < W; c++) {
        if (!g.play[r][c]) continue;
        if (c + 1 < W && isValidSwap(g, r, c, r, c + 1)) { out.push([r, c, r, c + 1]); if (firstOnly) return out; }
        if (r + 1 < H && isValidSwap(g, r, c, r + 1, c)) { out.push([r, c, r + 1, c]); if (firstOnly) return out; }
      }
    }
    return out;
  }
  function hasAnyMove(g) { return findMoves(g, true).length > 0; }

  // ---------- clearing ----------
  function bombColor(g, skip) {
    var cnt = [0, 0, 0, 0, 0, 0], best = 0, bi = -1, r, c;
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      var t = g.grid[r][c];
      if (t && t.k === 'c' && t.t >= 0 && !(skip && skip[key(r, c)])) cnt[t.t]++;
    }
    for (var i = 0; i < 6; i++) if (cnt[i] > best) { best = cnt[i]; bi = i; }
    return bi;
  }

  // expand a start set through special effects. returns {clear:{key:true}, hits:{key:true}, fired:[]}
  function expand(g, startKeys) {
    var clear = {}, hits = {}, fired = [], q = startKeys.slice();
    function pushRow(r) { for (var c = 0; c < W; c++) if (g.play[r][c]) q.push(key(r, c)); }
    function pushCol(c) { for (var r = 0; r < H; r++) if (g.play[r][c]) q.push(key(r, c)); }
    while (q.length) {
      var k = q.pop();
      if (clear[k] || hits[k]) continue;
      var r = Math.floor(k / W), c = k % W;
      if (!isPlay(g, r, c)) continue;
      var t = g.grid[r][c];
      if (!t) continue;
      if (t.k === 'x') { hits[k] = true; continue; }
      if (t.k === 'i') continue;
      clear[k] = true;
      if (t.s) {
        fired.push({ r: r, c: c, s: t.s });
        if (t.s === SP.SH) pushRow(r);
        else if (t.s === SP.SV) pushCol(c);
        else if (t.s === SP.WRAP) {
          for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) q.push(key(r + dr, c + dc));
        } else if (t.s === SP.BOMB) {
          var col = bombColor(g, clear);
          for (var rr = 0; rr < H; rr++) for (var cc = 0; cc < W; cc++) {
            var o = g.grid[rr][cc];
            if (o && o.k === 'c' && o.t === col) q.push(key(rr, cc));
          }
        }
      }
    }
    return { clear: clear, hits: hits, fired: fired };
  }

  function addCrossArea(q, g, r, c, rad) {
    for (var dr = -rad; dr <= rad; dr++) {
      for (var i = 0; i < W; i++) if (isPlay(g, r + dr, i)) q.push(key(r + dr, i));
      for (var j = 0; j < H; j++) if (isPlay(g, j, c + dr)) q.push(key(j, c + dr));
    }
  }

  // apply one clearing step. keys: array of cell keys, creations: from analyzeMatches
  function clearStep(g, keys, creations, chain, bonus) {
    var ex = expand(g, keys);
    var creationAt = {};
    creations.forEach(function (cr) { creationAt[key(cr.r, cr.c)] = cr; delete ex.clear[key(cr.r, cr.c)]; });
    var cleared = [], created = [], iceHits = [], crateHits = [], removedPos = [];
    var k;
    for (k in ex.clear) {
      var r = Math.floor(k / W), c = k % W;
      var t = g.grid[r][c];
      cleared.push({ r: r, c: c, tile: copyTile(t) });
      removedPos.push([r, c]);
      if (t.k === 'c' && t.t >= 0) g.got[t.t]++;
      g.grid[r][c] = null;
    }
    creations.forEach(function (cr) {
      var old = g.grid[cr.r][cr.c];
      if (old && old.k === 'c' && old.t >= 0) g.got[old.t]++;
      removedPos.push([cr.r, cr.c]);
      g.grid[cr.r][cr.c] = copyTile(cr.tile);
      created.push({ r: cr.r, c: cr.c, tile: copyTile(cr.tile) });
    });
    // ice
    removedPos.forEach(function (p) {
      if (g.ice[p[0]][p[1]] > 0) {
        g.ice[p[0]][p[1]]--;
        if (g.ice[p[0]][p[1]] === 0) g.iceLeft--;
        iceHits.push({ r: p[0], c: p[1], hp: g.ice[p[0]][p[1]] });
      }
    });
    // crates: direct hits and neighbours of removed candies (each crate once per step)
    var crateSet = {};
    for (k in ex.hits) crateSet[k] = true;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    removedPos.forEach(function (p) {
      dirs.forEach(function (d) {
        var rr = p[0] + d[0], cc = p[1] + d[1];
        if (isPlay(g, rr, cc) && g.grid[rr][cc] && g.grid[rr][cc].k === 'x') crateSet[key(rr, cc)] = true;
      });
    });
    for (k in crateSet) {
      var cr2 = Math.floor(k / W), cc2 = k % W, ct = g.grid[cr2][cc2];
      if (!ct || ct.k !== 'x') continue;
      ct.hp--;
      if (ct.hp <= 0) {
        cleared.push({ r: cr2, c: cc2, tile: copyTile(ct) });
        g.grid[cr2][cc2] = null;
        g.cratesBroken++;
        if (g.ice[cr2][cc2] > 0) { g.ice[cr2][cc2]--; if (g.ice[cr2][cc2] === 0) g.iceLeft--; iceHits.push({ r: cr2, c: cc2, hp: g.ice[cr2][cc2] }); }
      } else crateHits.push({ r: cr2, c: cc2, hp: ct.hp });
    }
    var mult = Math.min(1 + 0.5 * (chain - 1), 3);
    var candies = cleared.filter(function (x) { return x.tile.k === 'c'; }).length + creations.length;
    var gain = Math.round(candies * 10 * mult + ex.fired.length * 25 + Math.round((bonus || 0) / 6));
    g.score += gain;
    return { kind: 'clear', cleared: cleared, created: created, iceHits: iceHits, crateHits: crateHits,
      fired: ex.fired, gain: gain, score: g.score, chain: chain };
  }

  // ---------- gravity / fill ----------
  function ingOnBoard(g) {
    var n = 0;
    for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (g.grid[r][c] && g.grid[r][c].k === 'i') n++;
    return n;
  }
  function newTile(g) {
    var need = (g.level.ingTotal || 0) - g.ingSpawned;
    if (need > 0 && ingOnBoard(g) < ((g.level.ingTotal || 0) > 3 ? 3 : 2) && rnd(g) < 0.18) { g.ingSpawned++; return { k: 'i' }; }
    return { k: 'c', t: rint(g, g.colors), s: 0 };
  }
  function gravityFill(g) {
    var moves = [], spawned = [];
    for (var c = 0; c < W; c++) {
      if (g.top[c] < 0) continue;
      var write = g.bot[c], r;
      for (r = g.bot[c]; r >= g.top[c]; r--) {
        var t = g.grid[r][c];
        if (t) {
          if (r !== write) { g.grid[write][c] = t; g.grid[r][c] = null; moves.push({ from: [r, c], to: [write, c] }); }
          write--;
        }
      }
      var cnt = write - g.top[c] + 1;
      for (r = write; r >= g.top[c]; r--) {
        var nt = newTile(g);
        g.grid[r][c] = nt;
        spawned.push({ r: r, c: c, tile: copyTile(nt), fromR: r - cnt });
      }
    }
    return { kind: 'fall', moves: moves, spawned: spawned };
  }
  function collectIngredients(g) {
    var items = [];
    for (var c = 0; c < W; c++) {
      if (g.bot[c] < 0) continue;
      var t = g.grid[g.bot[c]][c];
      if (t && t.k === 'i') { g.grid[g.bot[c]][c] = null; g.ingDropped++; items.push({ r: g.bot[c], c: c }); }
    }
    return items;
  }
  function settle(g, phases) {
    for (var i = 0; i < 30; i++) {
      var f = gravityFill(g);
      if (f.moves.length || f.spawned.length) phases.push(f);
      var items = collectIngredients(g);
      if (!items.length) break;
      phases.push({ kind: 'collect', items: items, dropped: g.ingDropped });
    }
  }

  // ---------- shuffle ----------
  function shuffleBoard(g) {
    var pos = [], r, c;
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      var t = g.grid[r][c];
      if (g.play[r][c] && t && t.k === 'c') pos.push([r, c]);
    }
    var ok = false;
    for (var tries = 0; tries < 80 && !ok; tries++) {
      var tiles = pos.map(function (p) { return g.grid[p[0]][p[1]]; });
      for (var i = tiles.length - 1; i > 0; i--) { var j = rint(g, i + 1), tmp = tiles[i]; tiles[i] = tiles[j]; tiles[j] = tmp; }
      pos.forEach(function (p, idx) { g.grid[p[0]][p[1]] = tiles[idx]; });
      ok = findRuns(g).length === 0 && hasAnyMove(g);
    }
    var guard = 0;
    while (!ok && guard++ < 200) {
      fillColors(g, false);
      ok = findRuns(g).length === 0 && hasAnyMove(g);
    }
    var snap = [];
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) if (g.play[r][c] && g.grid[r][c]) snap.push({ r: r, c: c, tile: copyTile(g.grid[r][c]) });
    return { kind: 'shuffle', tiles: snap };
  }

  // ---------- goals ----------
  function progress(g) {
    return g.level.goals.map(function (gl) {
      var cur = 0, tgt = gl.n;
      if (gl.type === 'score') cur = g.score;
      else if (gl.type === 'ice') { tgt = g.iceTotal; cur = g.iceTotal - g.iceLeft; }
      else if (gl.type === 'color') cur = g.got[gl.color];
      else if (gl.type === 'ingredient') cur = g.ingDropped;
      else if (gl.type === 'crate') { tgt = g.crateTotal; cur = g.cratesBroken; }
      return { type: gl.type, color: gl.color, cur: Math.min(cur, tgt), tgt: tgt, done: cur >= tgt };
    });
  }
  function allDone(g) { return progress(g).every(function (p) { return p.done; }); }

  function starsFor(g) {
    var s = 1;
    if (g.score >= (g.level.star2 || Infinity)) s = 2;
    if (g.score >= (g.level.star3 || Infinity)) s = 3;
    return s;
  }

  // ---------- main action ----------
  function trySwap(g, r1, c1, r2, c2) {
    var phases = [];
    if (g.status !== 'playing') return { valid: false, phases: phases };
    if (!isValidSwap(g, r1, c1, r2, c2)) {
      var a0 = g.grid[r1] && g.grid[r1][c1], b0 = g.grid[r2] && g.grid[r2][c2];
      if (isPlay(g, r1, c1) && isPlay(g, r2, c2) && Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1 && movable(a0) && movable(b0)) {
        phases.push({ kind: 'badswap', a: [r1, c1], b: [r2, c2] });
      }
      return { valid: false, phases: phases };
    }
    var a = g.grid[r1][c1], b = g.grid[r2][c2];
    g.grid[r1][c1] = b; g.grid[r2][c2] = a;
    g.moves--;
    phases.push({ kind: 'swap', a: [r1, c1], b: [r2, c2] });

    var combo = comboOf(a, b), chain = 1, step;
    if (combo) {
      var start = [], q = [], bonus = 300, r, c, i;
      var p2 = [r2, c2];
      if (combo === 'bomb2') {
        a.s = 0; b.s = 0;
        for (r = 0; r < H; r++) for (c = 0; c < W; c++) if (g.play[r][c] && g.grid[r][c]) start.push(key(r, c));
        bonus = 1500;
      } else if (combo === 'bombx') {
        var bomb = a.s === SP.BOMB ? a : b, other = a.s === SP.BOMB ? b : a;
        var bpos = a.s === SP.BOMB ? [r2, c2] : [r1, c1];
        bomb.s = 0;
        start.push(key(bpos[0], bpos[1]));
        for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
          var o = g.grid[r][c];
          if (o && o.k === 'c' && o.t === other.t) {
            if (other.s === SP.SH || other.s === SP.SV) o.s = rint(g, 2) ? SP.SH : SP.SV;
            else if (other.s === SP.WRAP) o.s = SP.WRAP;
            start.push(key(r, c));
          }
        }
        bonus = 600;
      } else if (combo === 'stripe2') {
        a.s = 0; b.s = 0;
        addCrossArea(q, g, p2[0], p2[1], 0); start = q; bonus = 400;
      } else if (combo === 'stripewrap') {
        a.s = 0; b.s = 0;
        addCrossArea(q, g, p2[0], p2[1], 1); start = q; bonus = 600;
      } else { // wrap2
        a.s = 0; b.s = 0;
        for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) if (isPlay(g, p2[0] + dr, p2[1] + dc)) start.push(key(p2[0] + dr, p2[1] + dc));
        bonus = 800;
      }
      start.push(key(r1, c1)); start.push(key(r2, c2));
      step = clearStep(g, start, [], chain, bonus);
      phases.push(step);
      settle(g, phases);
      chain++;
    }
    var pivots = combo ? [] : [[r1, c1], [r2, c2]];
    for (var guard = 0; guard < 60; guard++) {
      var m = analyzeMatches(g, pivots);
      if (!m) break;
      pivots = [];
      step = clearStep(g, Object.keys(m.cells).map(Number), m.creations, chain, 0);
      phases.push(step);
      settle(g, phases);
      chain++;
    }
    if (allDone(g)) {
      g.status = 'won';
      g.bonus = 0;
      g.stars = starsFor(g);
    } else if (g.moves <= 0) {
      g.status = 'lost';
    } else if (!hasAnyMove(g)) {
      phases.push(shuffleBoard(g));
    }
    return { valid: true, phases: phases, status: g.status };
  }

  // After a win, every unused move becomes a free special candy that fires (raises score and stars).
  function bonusRound(g) {
    var phases = [], before = g.score, used = 0, r, c;
    while (g.moves > 0 && used < 8) {
      var cells = [];
      for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
        var t = g.grid[r][c];
        if (g.play[r][c] && t && t.k === 'c' && t.t >= 0 && !t.s) cells.push([r, c]);
      }
      if (!cells.length) break;
      var p = cells[rint(g, cells.length)], tile = g.grid[p[0]][p[1]];
      tile.s = rint(g, 2) ? SP.SH : SP.SV;
      g.moves--; used++;
      phases.push({ kind: 'bonusmark', r: p[0], c: p[1], s: tile.s, moves: g.moves });
      var step = clearStep(g, [key(p[0], p[1])], [], 1, 0);
      phases.push(step);
      settle(g, phases);
      for (var guard = 0, chain = 2; guard < 60; guard++, chain++) {
        var m = analyzeMatches(g, []);
        if (!m) break;
        phases.push(clearStep(g, Object.keys(m.cells).map(Number), m.creations, chain, 0));
        settle(g, phases);
      }
    }
    if (g.moves > 0) { g.score += g.moves * 20; g.moves = 0; }
    if (!hasAnyMove(g)) phases.push(shuffleBoard(g));
    g.bonus = g.score - before;
    g.stars = starsFor(g);
    return phases;
  }

  function hint(g) {
    var m = findMoves(g, false);
    return m.length ? m[rint(g, m.length)] : null;
  }

  var api = {
    W: W, H: H, SP: SP, createGame: createGame, cloneGame: cloneGame, trySwap: trySwap, bonusRound: bonusRound,
    findMoves: findMoves, hasAnyMove: hasAnyMove, findRuns: findRuns, progress: progress,
    allDone: allDone, hint: hint, isValidSwap: isValidSwap, starsFor: starsFor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SweetCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
