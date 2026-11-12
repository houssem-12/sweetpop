'use strict';
/* Sweet Pop - canvas drawing of candies, blockers and icons (original artwork, drawn with code). */
(function (root) {
  var TAU = Math.PI * 2;
  var PAL = [
    { base: '#ff4d6d', light: '#ff9fb0', dark: '#b3173a' }, // 0 red    - round
    { base: '#ff9a3c', light: '#ffd09a', dark: '#c4600a' }, // 1 orange - square
    { base: '#ffd93d', light: '#fff0a0', dark: '#c79a00' }, // 2 yellow - star
    { base: '#3fd97f', light: '#a5f5c4', dark: '#16914a' }, // 3 green  - diamond
    { base: '#4da6ff', light: '#a8d4ff', dark: '#1a63b8' }, // 4 blue   - hexagon
    { base: '#b57bff', light: '#dcc2ff', dark: '#6a30c2' }  // 5 purple - heart
  ];

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Jelly silhouettes (all original). Sub-paths may overlap: they are filled with the nonzero rule.
  function shapePath(ctx, shape, cx, cy, r) {
    var i;
    ctx.beginPath();
    if (shape === 0) {            // round blob
      ctx.ellipse(cx, cy + r * 0.04, r * 1.02, r * 0.96, 0, 0, TAU);
    } else if (shape === 1) {     // soft square pudding
      rrect(ctx, cx - r * 0.92, cy - r * 0.86, r * 1.84, r * 1.8, r * 0.56);
    } else if (shape === 2) {     // scalloped flower gummy
      for (i = 0; i <= 72; i++) {
        var a = i / 72 * TAU, rad = r * (0.93 + 0.085 * Math.cos(a * 9));
        var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === 3) {     // drop
      ctx.moveTo(cx, cy - r * 1.18);
      ctx.bezierCurveTo(cx + r * 0.25, cy - r * 0.75, cx + r * 1.0, cy - r * 0.25, cx + r * 1.0, cy + r * 0.28);
      ctx.bezierCurveTo(cx + r * 1.0, cy + r * 0.85, cx + r * 0.52, cy + r * 1.04, cx, cy + r * 1.04);
      ctx.bezierCurveTo(cx - r * 0.52, cy + r * 1.04, cx - r * 1.0, cy + r * 0.85, cx - r * 1.0, cy + r * 0.28);
      ctx.bezierCurveTo(cx - r * 1.0, cy - r * 0.25, cx - r * 0.25, cy - r * 0.75, cx, cy - r * 1.18);
      ctx.closePath();
    } else if (shape === 4) {     // eared blob
      ctx.ellipse(cx, cy + r * 0.12, r * 1.02, r * 0.88, 0, 0, TAU);
      ctx.moveTo(cx - r * 0.38, cy - r * 0.72); ctx.arc(cx - r * 0.66, cy - r * 0.72, r * 0.34, 0, TAU);
      ctx.moveTo(cx + r * 0.94, cy - r * 0.72); ctx.arc(cx + r * 0.66, cy - r * 0.72, r * 0.34, 0, TAU);
    } else {                      // tulip cap
      ctx.ellipse(cx, cy + r * 0.2, r * 1.02, r * 0.82, 0, 0, TAU);
      ctx.moveTo(cx - r * 0.1, cy - r * 0.55); ctx.arc(cx - r * 0.55, cy - r * 0.55, r * 0.45, 0, TAU);
      ctx.moveTo(cx + r * 1.0, cy - r * 0.55); ctx.arc(cx + r * 0.55, cy - r * 0.55, r * 0.45, 0, TAU);
      ctx.moveTo(cx + r * 0.36, cy - r * 0.78); ctx.arc(cx, cy - r * 0.78, r * 0.36, 0, TAU);
    }
  }

  var FACE = [  // eyes: y offset, spacing, open? (open eyes look around, closed are sleepy arcs)
    { y: -0.02, d: 0.36, open: true },
    { y: 0.02, d: 0.36, open: false },
    { y: 0.0, d: 0.34, open: false },
    { y: 0.22, d: 0.33, open: true },
    { y: 0.1, d: 0.36, open: false },
    { y: 0.18, d: 0.36, open: false }
  ];
  function drawFace(ctx, t, cx, cy, r, s) {
    var f = FACE[t], ex = r * f.d, ey = cy + r * f.y, lw = Math.max(1.5, s * 0.035), i;
    if (f.open) {
      for (i = -1; i <= 1; i += 2) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(cx + i * ex, ey, r * 0.23, r * 0.27, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1b1030'; ctx.beginPath(); ctx.ellipse(cx + i * ex + r * 0.02, ey + r * 0.04, r * 0.13, r * 0.16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + i * ex - r * 0.02, ey - r * 0.04, r * 0.05, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(30,10,50,.55)'; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, ey + r * 0.38, r * 0.17, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(30,10,50,.7)'; ctx.lineWidth = lw * 1.2; ctx.lineCap = 'round';
      for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.arc(cx + i * ex, ey, r * 0.17, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(30,10,50,.45)'; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(cx, ey + r * 0.3, r * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.28)';   // cheeks
    for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.ellipse(cx + i * r * 0.62, ey + r * 0.3, r * 0.14, r * 0.08, 0, 0, TAU); ctx.fill(); }
  }

  // decorations that give each jelly its own identity (not just a colour)
  function drawTopper(ctx, t, cx, cy, r, pal) {
    if (t === 0) {          // leaf
      ctx.fillStyle = '#3fb950'; ctx.strokeStyle = '#1f7a31'; ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.92);
      ctx.quadraticCurveTo(cx + r * 0.1, cy - r * 1.4, cx + r * 0.55, cy - r * 1.3);
      ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.9, cx, cy - r * 0.92); ctx.fill(); ctx.stroke();
    } else if (t === 5) {   // swirl
      ctx.strokeStyle = pal.dark; ctx.globalAlpha = 0.55; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i < 40; i++) { var a = i * 0.28, rr = r * (0.04 + i * 0.0055 * 1.7); var x = cx + Math.cos(a) * rr * 0.9, y = cy - r * 0.62 + Math.sin(a) * rr * 0.6; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    } else if (t === 2) {   // little sugar dots
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      [[-0.55, -0.45], [0.58, -0.3], [-0.2, 0.62], [0.35, 0.6]].forEach(function (p) { ctx.beginPath(); ctx.arc(cx + p[0] * r, cy + p[1] * r, r * 0.06, 0, TAU); ctx.fill(); });
    }
  }

  var sprCache = {};
  function bakeBody(t, px) {
    var key = t + ':' + px;
    if (sprCache[key]) return sprCache[key];
    var cv = document.createElement('canvas'), N = Math.ceil(px * 1.5);
    cv.width = cv.height = N;
    var c = cv.getContext('2d'), m = N / 2, s = px, r = s * 0.37, pal = PAL[t];
    var lw = Math.max(2, s * 0.05);
    // soft contact shadow
    c.fillStyle = 'rgba(40,10,70,.22)'; c.beginPath(); c.ellipse(m, m + r * 1.0, r * 0.85, r * 0.2, 0, 0, TAU); c.fill();
    // dark outline (stroke then fill => clean outer outline even for unions)
    shapePath(c, t, m, m, r); c.lineJoin = 'round'; c.lineWidth = lw * 2; c.strokeStyle = pal.dark; c.stroke();
    var g = c.createRadialGradient(m - r * 0.3, m - r * 0.45, r * 0.05, m, m, r * 1.35);
    g.addColorStop(0, pal.light); g.addColorStop(0.5, pal.base); g.addColorStop(1, pal.dark);
    shapePath(c, t, m, m, r); c.fillStyle = g; c.fill();
    // jelly translucency: lighter belly glow
    c.save(); shapePath(c, t, m, m, r); c.clip();
    var g2 = c.createRadialGradient(m, m + r * 1.0, r * 0.1, m, m + r * 0.9, r * 0.9);
    g2.addColorStop(0, 'rgba(255,255,255,.38)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2; c.fillRect(m - r * 1.5, m - r * 1.5, r * 3, r * 3);
    c.restore();
    drawTopper(c, t, m, m, r, pal);
    drawFace(c, t, m, m, r, s);
    // gloss
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(m - r * 0.5, m - r * 0.58, r * 0.26, r * 0.14, -0.7, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(m - r * 0.16, m - r * 0.8, r * 0.05, 0, TAU); c.fill();
    sprCache[key] = cv;
    return cv;
  }

  function drawBomb(ctx, cx, cy, s, time) {
    var r = s * 0.4;
    var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#9a6a4f'); g.addColorStop(0.5, '#4a2a1c'); g.addColorStop(1, '#22100a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.05); ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 0.65 + 0.3 * Math.sin(time * 5); ctx.stroke(); ctx.globalAlpha = 1;
    var cols = ['#ff4d6d', '#ff9a3c', '#ffd93d', '#3fd97f', '#4da6ff', '#b57bff'];
    for (var i = 0; i < 12; i++) {
      var a = i * TAU / 12 + time * 0.8, d = r * (0.38 + 0.38 * ((i * 5) % 3) / 2);
      var x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      ctx.strokeStyle = cols[i % 6]; ctx.lineWidth = Math.max(2, s * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - r * 0.1, y - r * 0.06); ctx.lineTo(x + r * 0.1, y + r * 0.06); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.3, r * 0.17, -0.6, 0, TAU); ctx.fill();
  }

  function drawCherry(ctx, cx, cy, s) {
    var r = s * 0.2;
    ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = Math.max(2, s * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 1.0, cy + r * 0.3); ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 2.0, cx + r * 0.3, cy - r * 2.3);
    ctx.moveTo(cx + r * 1.0, cy + r * 0.5); ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 1.6, cx + r * 0.3, cy - r * 2.3); ctx.stroke();
    ctx.fillStyle = '#3fb950';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.9, cy - r * 2.1, r * 0.8, r * 0.38, -0.4, 0, TAU); ctx.fill();
    [[-r * 1.0, r * 0.5], [r * 1.0, r * 0.7]].forEach(function (p) {
      var g = ctx.createRadialGradient(cx + p[0] - r * 0.3, cy + p[1] - r * 0.3, r * 0.1, cx + p[0], cy + p[1], r * 1.15);
      g.addColorStop(0, '#ff8a8a'); g.addColorStop(0.55, '#e0183a'); g.addColorStop(1, '#8e0b22');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], r * 1.12, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(cx + p[0] - r * 0.4, cy + p[1] - r * 0.45, r * 0.3, r * 0.17, -0.6, 0, TAU); ctx.fill();
    });
  }

  function drawCrate(ctx, cx, cy, s, hp) {
    var h = s * 0.44;
    ctx.save();
    rrect(ctx, cx - h, cy - h, h * 2, h * 2, s * 0.14); ctx.clip();
    ctx.fillStyle = '#fff7ef'; ctx.fillRect(cx - h, cy - h, h * 2, h * 2);
    ctx.fillStyle = '#ff6b81';
    for (var i = -6; i <= 6; i++) {
      ctx.beginPath();
      var o = i * s * 0.22;
      ctx.moveTo(cx - h + o, cy - h); ctx.lineTo(cx - h + o + s * 0.11, cy - h);
      ctx.lineTo(cx + h + o + s * 0.11 - s * 0.0, cy + h); ctx.lineTo(cx + h + o - s * 0.0, cy + h);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    var lw = Math.max(2, s * 0.045);
    ctx.strokeStyle = '#8a3b2a'; ctx.lineWidth = lw;
    rrect(ctx, cx - h, cy - h, h * 2, h * 2, s * 0.14); ctx.stroke();
    for (var k = 1; k < (hp || 1); k++) {
      var inset = k * s * 0.07;
      rrect(ctx, cx - h + inset, cy - h + inset, (h - inset) * 2, (h - inset) * 2, s * 0.1); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(cx - h * 0.4, cy - h * 0.55, h * 0.3, h * 0.12, -0.5, 0, TAU); ctx.fill();
  }

  function drawCandy(ctx, cx, cy, s, tile, time) {
    if (tile.k === 'i') return drawCherry(ctx, cx, cy, s);
    if (tile.k === 'x') return drawCrate(ctx, cx, cy, s, tile.hp);
    if (tile.s === 4) return drawBomb(ctx, cx, cy, s, time || 0);
    var pal = PAL[tile.t], r = s * 0.37;
    var px = Math.max(24, Math.round(s * (D.dpr || 1) / 4) * 4);   // quantised so the cache stays small
    var spr = bakeBody(tile.t, px), side = spr.width * (s / px);
    ctx.drawImage(spr, cx - side / 2, cy - side / 2, side, side);
    if (tile.s === 1 || tile.s === 2) {
      ctx.save(); shapePath(ctx, tile.t, cx, cy, r); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      for (var i = -1; i <= 1; i++) {
        if (tile.s === 1) ctx.fillRect(cx - r * 1.4, cy + i * r * 0.55 - r * 0.1, r * 2.8, r * 0.2);
        else ctx.fillRect(cx + i * r * 0.55 - r * 0.1, cy - r * 1.4, r * 0.2, r * 2.8);
      }
      ctx.restore();
    }
    if (tile.s === 3) {
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.35 * Math.sin((time || 0) * 5);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, s * 0.055); ctx.lineJoin = 'round';
      shapePath(ctx, tile.t, cx, cy, r * 1.16); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#fff';
      [-1, 1].forEach(function (d) {
        ctx.beginPath();
        ctx.moveTo(cx + d * r * 1.55, cy - r * 0.5); ctx.lineTo(cx + d * r * 1.05, cy); ctx.lineTo(cx + d * r * 1.55, cy + r * 0.5);
        ctx.closePath(); ctx.fill();
      });
    }
  }

  function drawIce(ctx, x, y, s, hp) {
    var p = s * 0.04;
    ctx.save();
    ctx.globalAlpha = hp > 1 ? 0.62 : 0.4;
    ctx.fillStyle = '#cdeeff';
    rrect(ctx, x + p, y + p, s - p * 2, s - p * 2, s * 0.12); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, s * 0.05);
    rrect(ctx, x + p, y + p, s - p * 2, s - p * 2, s * 0.12); ctx.stroke();
    if (hp > 1) {
      ctx.lineWidth = Math.max(1, s * 0.03);
      rrect(ctx, x + p * 3, y + p * 3, s - p * 6, s - p * 6, s * 0.08); ctx.stroke();
    }
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(x + s * 0.2, y + s * 0.3); ctx.lineTo(x + s * 0.4, y + s * 0.12);
    ctx.moveTo(x + s * 0.28, y + s * 0.4); ctx.lineTo(x + s * 0.5, y + s * 0.2); ctx.stroke();
    ctx.restore();
  }

  function star(ctx, cx, cy, r, fill, stroke) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 === 0 ? r : r * 0.48;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      else ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.14; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  var D = { dpr: 1 };
  var iconCache = {};
  // returns a data URL icon: 'c0'..'c5' candy, 'cherry', 'ice', 'crate', 'star', 'starOff', 'bomb', 'stripe', 'wrap'
  function icon(name, px) {
    var k = name + ':' + px;
    if (iconCache[k]) return iconCache[k];
    var cv = document.createElement('canvas'); cv.width = cv.height = px;
    var ctx = cv.getContext('2d'), c = px / 2;
    if (name.charAt(0) === 'c' && name.length === 2) drawCandy(ctx, c, c, px * 1.05, { k: 'c', t: +name.charAt(1), s: 0 }, 0);
    else if (name === 'cherry') drawCherry(ctx, c, c * 1.1, px * 1.1);
    else if (name === 'crate') drawCrate(ctx, c, c, px, 1);
    else if (name === 'ice') { ctx.fillStyle = '#7fb6d8'; rrect(ctx, px * 0.1, px * 0.1, px * 0.8, px * 0.8, px * 0.15); ctx.fill(); drawIce(ctx, 0, 0, px, 2); }
    else if (name === 'star') star(ctx, c, c * 1.05, c * 0.9, '#ffd93d', '#c79a00');
    else if (name === 'starOff') star(ctx, c, c * 1.05, c * 0.9, 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.12)');
    else if (name === 'bomb') drawBomb(ctx, c, c, px * 1.1, 0);
    else if (name === 'stripe') drawCandy(ctx, c, c, px * 1.05, { k: 'c', t: 0, s: 1 }, 0);
    else if (name === 'wrap') drawCandy(ctx, c, c, px * 1.05, { k: 'c', t: 4, s: 3 }, 0);
    iconCache[k] = cv.toDataURL();
    return iconCache[k];
  }

  D.PAL = PAL; D.rrect = rrect; D.drawCandy = drawCandy; D.drawIce = drawIce; D.star = star; D.icon = icon;
  root.SweetDraw = D;
})(window);
