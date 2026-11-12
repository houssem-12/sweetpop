'use strict';
/* Sweet Pop - level scenes: 12 hand-coded scenery types x 2 colour moods = 24 looks, changing every 5 levels.
 * Everything is drawn with canvas code (no image files): sky gradient, back layer, drifting clouds / particles, front scenery. */
(function (root) {
  var TAU = Math.PI * 2;
  var THEMES = [
    { scene: 'sky',     c: ['#ffb3d9', '#c9a4ff', '#8ec5ff'], hill: ['#ff9ccb', '#d98af0'], board: 'rgba(90,40,140,.35)',  fx: 'bubbles', clouds: 1 },
    { scene: 'meadow',  c: ['#bff0ff', '#d9f7a6', '#7bdc6f'], hill: ['#58c75a', '#2fa04a'], board: 'rgba(30,110,60,.34)',  fx: 'petals',  clouds: 1 },
    { scene: 'sunset',  c: ['#ffd27a', '#ff8fa3', '#a45cd6'], hill: ['#c94f9a', '#7a3bb0'], board: 'rgba(110,30,100,.36)', fx: 'sparkle', clouds: 1 },
    { scene: 'frozen',  c: ['#effcff', '#a8e0ff', '#5aa7e8'], hill: ['#e9f8ff', '#a9d8f5'], board: 'rgba(30,80,150,.34)',  fx: 'snow',    clouds: 0 },
    { scene: 'night',   c: ['#2b1a5e', '#5a2d91', '#c15bb3'], hill: ['#3b1d73', '#25124d'], board: 'rgba(10,0,40,.45)',    fx: 'stars',   clouds: 0 },
    { scene: 'ocean',   c: ['#9ff0ff', '#3aa0e8', '#1b4fb0'], hill: ['#2b7fd0', '#1a56a8'], board: 'rgba(5,40,110,.38)',   fx: 'bubbles', clouds: 0 },
    { scene: 'cocoa',   c: ['#ffd6c2', '#d79a7a', '#7a4332'], hill: ['#8a4a36', '#5e2f22'], board: 'rgba(70,30,20,.40)',   fx: 'hearts',  clouds: 0 },
    { scene: 'mint',    c: ['#d4fff0', '#8ff0c8', '#34b99a'], hill: ['#2ea88a', '#1d826b'], board: 'rgba(10,90,80,.34)',   fx: 'petals',  clouds: 1 },
    { scene: 'lava',    c: ['#ffe08a', '#ff7a45', '#b3205b'], hill: ['#8f1a4a', '#5e0f33'], board: 'rgba(90,10,40,.40)',   fx: 'embers',  clouds: 0 },
    { scene: 'galaxy',  c: ['#1b1448', '#3b2a8c', '#8a3fd1'], hill: ['#4a2aa0', '#2c1670'], board: 'rgba(10,5,50,.46)',    fx: 'stars',   clouds: 0 },
    { scene: 'lemon',   c: ['#fffbb3', '#ffd84a', '#ff9f43'], hill: ['#f2a21b', '#d9770f'], board: 'rgba(130,70,0,.32)',   fx: 'bubbles', clouds: 1 },
    { scene: 'rainbow', c: ['#ffb3c1', '#c3ffd9', '#b3c6ff'], hill: ['#9ad9ff', '#c9a4ff'], board: 'rgba(70,50,140,.33)',  fx: 'hearts',  clouds: 1 }
  ];

  // ---- colour helpers (used to make the second "mood" of every scene) ----
  function hex2rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
      h *= 60;
    }
    return [h, s, l];
  }
  function shift(hex, deg) {
    var c = hex2rgb(hex), hsl = rgb2hsl(c[0], c[1], c[2]);
    return 'hsl(' + Math.round((hsl[0] + deg) % 360) + ',' + Math.round(hsl[1] * 100) + '%,' + Math.round(hsl[2] * 100) + '%)';
  }
  function mulberry(a) { return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function variantFor(n) { return Math.floor((Math.max(1, n) - 1) / 5) % 24; }
  function themeFor(n) {
    var v = variantFor(n), base = THEMES[v % 12], alt = v >= 12;
    if (!alt) return base;
    var d = 55, o = {};
    for (var k in base) o[k] = base[k];
    o.c = base.c.map(function (x) { return shift(x, d); });
    o.hill = base.hill.map(function (x) { return shift(x, d); });
    o.alt = true;
    return o;
  }

  var cv, ctx, W = 0, H = 0, dpr = 1, th = THEMES[0], parts = [], clouds = [], back = null, front = null, on = false, last = 0, seed = 1;

  // ---- drawing primitives ----
  function glow(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  function cloud(c, x, y, s, a) {
    c.globalAlpha = a; c.fillStyle = '#fff'; c.beginPath();
    c.arc(x, y, s * 0.5, 0, TAU); c.arc(x + s * 0.55, y + s * 0.08, s * 0.4, 0, TAU); c.arc(x - s * 0.55, y + s * 0.1, s * 0.36, 0, TAU);
    c.arc(x + s * 0.15, y - s * 0.28, s * 0.38, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  function hillShape(c, base, amp, f, ph, col, alpha) {
    c.fillStyle = col; c.globalAlpha = alpha == null ? 0.92 : alpha; c.beginPath(); c.moveTo(0, H);
    for (var x = 0; x <= W; x += 6) c.lineTo(x, base + Math.sin(x / W * TAU * f + ph) * amp);
    c.lineTo(W, H); c.closePath(); c.fill(); c.globalAlpha = 1;
  }
  function mountain(c, x, base, w, h, col, cap) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x - w / 2, base); c.lineTo(x, base - h); c.lineTo(x + w / 2, base); c.closePath(); c.fill();
    if (cap) {
      c.fillStyle = cap; c.beginPath(); c.moveTo(x, base - h);
      c.lineTo(x + w * 0.16, base - h * 0.68); c.lineTo(x + w * 0.05, base - h * 0.74); c.lineTo(x - w * 0.04, base - h * 0.64); c.lineTo(x - w * 0.16, base - h * 0.68); c.closePath(); c.fill();
    }
  }
  function lollipop(c, x, y, s, col1, col2) {
    c.fillStyle = '#fff'; c.fillRect(x - s * 0.04, y, s * 0.08, s * 0.9);
    c.fillStyle = col1; c.beginPath(); c.arc(x, y, s * 0.32, 0, TAU); c.fill();
    c.strokeStyle = col2; c.lineWidth = s * 0.07; c.lineCap = 'round'; c.beginPath();
    for (var i = 0; i < 30; i++) { var a = i * 0.45, r = s * 0.02 + i * s * 0.0095; var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke();
  }
  function candyCane(c, x, base, h, col) {
    c.lineCap = 'round'; c.lineWidth = h * 0.12; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h * 0.8);
    c.arc(x + h * 0.14, base - h * 0.8, h * 0.14, Math.PI, TAU * 0.78 + Math.PI * 0.0, false); c.stroke();
    c.strokeStyle = col; c.lineWidth = h * 0.12; c.setLineDash([h * 0.1, h * 0.1]); c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h * 0.8); c.stroke(); c.setLineDash([]);
  }
  function fish(c, x, y, s, col) {
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, s, s * 0.55, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x - s * 0.8, y); c.lineTo(x - s * 1.6, y - s * 0.6); c.lineTo(x - s * 1.6, y + s * 0.6); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x + s * 0.45, y - s * 0.1, s * 0.14, 0, TAU); c.fill();
    c.fillStyle = '#1b1030'; c.beginPath(); c.arc(x + s * 0.48, y - s * 0.1, s * 0.07, 0, TAU); c.fill();
  }
  function planet(c, x, y, r, col1, col2, ring) {
    var g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, col1); g.addColorStop(1, col2);
    if (ring) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = r * 0.14; c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.45, -0.35, Math.PI, TAU); c.stroke(); }
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (ring) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * 0.14; c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.45, -0.35, 0, Math.PI); c.stroke(); }
  }
  function volcano(c, x, base, w, h, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x - w / 2, base); c.lineTo(x - w * 0.12, base - h); c.lineTo(x + w * 0.12, base - h); c.lineTo(x + w / 2, base); c.closePath(); c.fill();
    glow(c, x, base - h, w * 0.4, '#ffd36b', 0.9);
    c.fillStyle = '#ff6a2b'; c.beginPath(); c.ellipse(x, base - h, w * 0.12, h * 0.05, 0, 0, TAU); c.fill();
    c.strokeStyle = '#ff7a30'; c.lineWidth = w * 0.03; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, base - h); c.quadraticCurveTo(x + w * 0.06, base - h * 0.6, x + w * 0.02, base - h * 0.25); c.stroke();
  }
  function house(c, x, base, w, col, lit) {
    c.fillStyle = col; c.fillRect(x - w / 2, base - w * 0.7, w, w * 0.7);
    c.beginPath(); c.moveTo(x - w * 0.6, base - w * 0.7); c.lineTo(x, base - w * 1.2); c.lineTo(x + w * 0.6, base - w * 0.7); c.closePath(); c.fill();
    c.fillStyle = lit; c.fillRect(x - w * 0.18, base - w * 0.5, w * 0.36, w * 0.3);
  }

  // ---- bake the two static layers for the current theme ----
  function bake() {
    var R = mulberry(seed * 977 + 5), i, x, y;
    function mk() { var cv2 = document.createElement('canvas'); cv2.width = Math.round(W * dpr); cv2.height = Math.round(H * dpr); var c = cv2.getContext('2d'); c.scale(dpr, dpr); return { cv: cv2, c: c }; }
    var B = mk(), F = mk(), b = B.c, f = F.c, sc = th.scene, h0 = th.hill[0], h1 = th.hill[1];
    if (sc === 'sky') {
      // rainbow arc + lollipop trees
      var cols = ['#ff7a8a', '#ffb347', '#ffe66b', '#7be08c', '#6fc3ff', '#b58cff'];
      b.lineWidth = 9; for (i = 0; i < cols.length; i++) { b.strokeStyle = cols[i]; b.globalAlpha = 0.5; b.beginPath(); b.arc(W * 0.5, H * 0.48, W * (0.62 - i * 0.034), Math.PI * 1.08, Math.PI * 1.92); b.stroke(); }
      b.globalAlpha = 1;
      hillShape(f, H * 0.82, H * 0.03, 1.3, 0.4, h0); hillShape(f, H * 0.9, H * 0.025, 1.9, 2.0, h1);
      lollipop(f, W * 0.12, H * 0.8, 70, '#ff5d9e', '#fff'); lollipop(f, W * 0.88, H * 0.82, 58, '#6fc3ff', '#fff'); lollipop(f, W * 0.78, H * 0.78, 40, '#ffd93d', '#fff');
    } else if (sc === 'meadow') {
      glow(b, W * 0.82, H * 0.14, 130, '#fff6a0', 0.9); b.fillStyle = '#fff3a0'; b.beginPath(); b.arc(W * 0.82, H * 0.14, 34, 0, TAU); b.fill();
      hillShape(f, H * 0.80, H * 0.035, 1.2, 0.3, h0); hillShape(f, H * 0.89, H * 0.03, 1.7, 1.8, h1);
      for (i = 0; i < 26; i++) { x = R() * W; y = H * (0.84 + R() * 0.15); f.fillStyle = ['#fff', '#ffd93d', '#ff8fb8'][i % 3]; f.beginPath(); f.arc(x, y, 3.5, 0, TAU); f.fill(); }
      // round trees
      [[0.1, 0.8], [0.9, 0.81]].forEach(function (p) { f.fillStyle = '#7a4a24'; f.fillRect(W * p[0] - 4, H * p[1], 8, 34); f.fillStyle = '#2fa04a'; f.beginPath(); f.arc(W * p[0], H * p[1], 26, 0, TAU); f.fill(); f.fillStyle = '#58c75a'; f.beginPath(); f.arc(W * p[0] - 7, H * p[1] - 8, 12, 0, TAU); f.fill(); });
    } else if (sc === 'sunset') {
      glow(b, W * 0.5, H * 0.8, 260, '#fff2a8', 0.85); b.fillStyle = '#ffe58a'; b.beginPath(); b.arc(W * 0.5, H * 0.8, 70, Math.PI, TAU); b.fill();
      b.fillStyle = 'rgba(255,255,255,.28)'; for (i = 0; i < 4; i++) b.fillRect(0, H * (0.3 + i * 0.07), W, 5 + i * 2);
      hillShape(f, H * 0.83, H * 0.03, 1.1, 1.0, h0); hillShape(f, H * 0.91, H * 0.025, 1.6, 0.2, h1);
    } else if (sc === 'frozen') {
      mountain(b, W * 0.2, H * 0.84, W * 0.7, H * 0.28, '#9ccbef', '#fff'); mountain(b, W * 0.72, H * 0.84, W * 0.8, H * 0.34, '#86b9e6', '#fff'); mountain(b, W * 0.48, H * 0.84, W * 0.5, H * 0.2, '#b5dcf6', '#fff');
      hillShape(f, H * 0.86, H * 0.02, 1.3, 0.8, '#ffffff', 0.95); hillShape(f, H * 0.93, H * 0.02, 1.8, 2.4, '#d6efff', 0.95);
      [[0.1, 0.86], [0.92, 0.87]].forEach(function (p) { f.fillStyle = '#2f7d6a'; for (var j = 0; j < 3; j++) { f.beginPath(); f.moveTo(W * p[0] - 22 + j * 4, H * p[1] - j * 20); f.lineTo(W * p[0], H * p[1] - 36 - j * 20); f.lineTo(W * p[0] + 22 - j * 4, H * p[1] - j * 20); f.closePath(); f.fill(); } });
    } else if (sc === 'night') {
      glow(b, W * 0.2, H * 0.13, 110, '#fff6c8', 0.7); b.fillStyle = '#fff3c4'; b.beginPath(); b.arc(W * 0.2, H * 0.13, 38, 0, TAU); b.fill();
      b.fillStyle = 'rgba(200,170,120,.45)'; [[-10, -8, 8], [10, 6, 10], [-4, 14, 6]].forEach(function (q) { b.beginPath(); b.arc(W * 0.2 + q[0], H * 0.13 + q[1], q[2], 0, TAU); b.fill(); });
      hillShape(f, H * 0.84, H * 0.03, 1.2, 0.5, h0); hillShape(f, H * 0.92, H * 0.02, 1.8, 1.2, h1);
      for (i = 0; i < 5; i++) house(f, W * (0.08 + i * 0.2) + R() * 20, H * 0.9 + R() * 8, 26 + R() * 14, '#1c0d3d', '#ffd86b');
    } else if (sc === 'ocean') {
      for (i = 0; i < 5; i++) { b.fillStyle = 'rgba(255,255,255,.10)'; b.beginPath(); b.moveTo(W * (0.1 + i * 0.2), 0); b.lineTo(W * (0.2 + i * 0.2), 0); b.lineTo(W * (0.1 + i * 0.2) + 90, H * 0.85); b.lineTo(W * (0.1 + i * 0.2) - 60, H * 0.85); b.closePath(); b.fill(); }
      fish(b, W * 0.2, H * 0.3, 18, '#ffb347'); fish(b, W * 0.78, H * 0.42, 14, '#ff7a9e'); fish(b, W * 0.55, H * 0.2, 11, '#ffe66b');
      hillShape(f, H * 0.84, H * 0.025, 1.6, 0.2, h0, 0.85); hillShape(f, H * 0.91, H * 0.02, 2.2, 1.4, h1, 0.95);
      f.strokeStyle = '#ff7a9e'; f.lineWidth = 5; f.lineCap = 'round'; [0.08, 0.14, 0.9].forEach(function (p, j) { f.beginPath(); f.moveTo(W * p, H * 0.93); f.quadraticCurveTo(W * p + 14, H * 0.88, W * p, H * 0.84 - j * 6); f.stroke(); });
    } else if (sc === 'cocoa') {
      b.fillStyle = '#6b3a2a'; b.beginPath(); b.moveTo(0, 0); b.lineTo(W, 0); b.lineTo(W, 28);
      for (x = W; x >= 0; x -= 30) { var dl = 28 + R() * 46; b.lineTo(x, 28); b.quadraticCurveTo(x - 7, dl + 12, x - 15, dl); b.quadraticCurveTo(x - 22, dl + 12, x - 30, 28); }
      b.closePath(); b.fill();
      b.fillStyle = 'rgba(255,255,255,.16)'; b.fillRect(0, 4, W, 5);
      hillShape(f, H * 0.83, H * 0.03, 1.2, 0.6, h0); hillShape(f, H * 0.91, H * 0.025, 1.7, 2.1, h1);
      for (i = 0; i < 14; i++) { x = R() * W; y = H * (0.86 + R() * 0.12); f.fillStyle = '#3d1c12'; f.beginPath(); f.ellipse(x, y, 7, 4, R() * 3, 0, TAU); f.fill(); }
      f.fillStyle = '#e8b98a'; f.beginPath(); f.arc(W * 0.9, H * 0.83, 22, 0, TAU); f.fill(); f.fillStyle = '#4a2418'; [[-7, -5], [6, 3], [-3, 9], [8, -8]].forEach(function (q) { f.beginPath(); f.arc(W * 0.9 + q[0], H * 0.83 + q[1], 3, 0, TAU); f.fill(); });
    } else if (sc === 'mint') {
      hillShape(f, H * 0.82, H * 0.03, 1.1, 0.9, h0); hillShape(f, H * 0.9, H * 0.025, 1.9, 0.1, h1);
      [0.07, 0.13, 0.92, 0.86].forEach(function (p, j) { candyCane(f, W * p, H * (0.86 + (j % 2) * 0.03), 70 + j * 8, ['#ff5d9e', '#ff7a45'][j % 2]); });
      glow(b, W * 0.15, H * 0.15, 100, '#ffffff', 0.5);
    } else if (sc === 'lava') {
      volcano(b, W * 0.22, H * 0.85, W * 0.6, H * 0.3, '#3a0f2a'); volcano(b, W * 0.8, H * 0.85, W * 0.5, H * 0.22, '#4a1432');
      hillShape(f, H * 0.88, H * 0.02, 1.4, 0.4, h0); hillShape(f, H * 0.94, H * 0.015, 2.0, 1.8, h1);
      f.strokeStyle = '#ff8a3a'; f.lineWidth = 3; f.globalAlpha = 0.8; for (i = 0; i < 6; i++) { x = R() * W; y = H * (0.9 + R() * 0.08); f.beginPath(); f.moveTo(x, y); f.lineTo(x + 18, y + 4); f.lineTo(x + 30, y - 2); f.stroke(); } f.globalAlpha = 1;
    } else if (sc === 'galaxy') {
      glow(b, W * 0.25, H * 0.3, 220, '#7a4bd8', 0.5); glow(b, W * 0.85, H * 0.6, 200, '#e04bd0', 0.35);
      planet(b, W * 0.82, H * 0.14, 34, '#ffd36b', '#d9822b', true); planet(b, W * 0.12, H * 0.5, 20, '#7be0ff', '#2b6fd0', false); planet(b, W * 0.9, H * 0.72, 14, '#ff9ccb', '#c24b8f', false);
      hillShape(f, H * 0.9, H * 0.015, 1.5, 0.7, h0, 0.95); hillShape(f, H * 0.95, H * 0.01, 2.2, 2.1, h1, 1);
    } else if (sc === 'lemon') {
      var lx = W * 0.8, ly = H * 0.15; glow(b, lx, ly, 120, '#fff7a0', 0.7);
      b.fillStyle = '#ffe14a'; b.beginPath(); b.arc(lx, ly, 46, 0, TAU); b.fill(); b.fillStyle = '#fff6a8'; b.beginPath(); b.arc(lx, ly, 38, 0, TAU); b.fill();
      b.strokeStyle = '#ffe14a'; b.lineWidth = 3; for (i = 0; i < 8; i++) { b.beginPath(); b.moveTo(lx, ly); b.lineTo(lx + Math.cos(i * TAU / 8) * 38, ly + Math.sin(i * TAU / 8) * 38); b.stroke(); }
      hillShape(f, H * 0.81, H * 0.03, 1.3, 0.2, h0); hillShape(f, H * 0.9, H * 0.025, 1.8, 1.6, h1);
    } else { // rainbow
      var rc = ['#ff6b81', '#ffa94d', '#ffe66b', '#69db7c', '#4dabf7', '#9775fa'];
      b.lineWidth = 12; for (i = 0; i < rc.length; i++) { b.strokeStyle = rc[i]; b.globalAlpha = 0.55; b.beginPath(); b.arc(W * 0.5, H * 0.62, W * (0.7 - i * 0.045), Math.PI * 1.05, Math.PI * 1.95); b.stroke(); }
      b.globalAlpha = 1; cloud(b, W * 0.12, H * 0.5, 50, 0.9); cloud(b, W * 0.88, H * 0.5, 50, 0.9);
      hillShape(f, H * 0.84, H * 0.03, 1.2, 0.9, h0); hillShape(f, H * 0.92, H * 0.02, 1.8, 0.3, h1);
    }
    back = B.cv; front = F.cv;
  }

  function spawn(p, init) {
    p.x = Math.random() * W; p.y = init ? Math.random() * H : H + 20;
    p.s = 6 + Math.random() * 14; p.v = 10 + Math.random() * 26; p.ph = Math.random() * 6.28; p.rot = Math.random() * 6.28;
    p.col = ['#fff', '#ffe27a', '#ffb3d9', '#b3e6ff'][Math.floor(Math.random() * 4)];
    if (th.fx === 'snow' || th.fx === 'petals') p.y = init ? Math.random() * H : -20;
    if (th.fx === 'embers') { p.col = ['#ffd36b', '#ff8a3a', '#ff5a3a'][Math.floor(Math.random() * 3)]; p.y = init ? Math.random() * H : H * 0.9; p.s = 3 + Math.random() * 6; }
  }
  function build() {
    parts = []; var i, p;
    for (i = 0; i < 26; i++) { p = {}; spawn(p, true); parts.push(p); }
    clouds = [];
    if (th.clouds) for (i = 0; i < 4; i++) clouds.push({ x: Math.random() * W, y: H * (0.08 + Math.random() * 0.5), s: 36 + Math.random() * 40, v: 4 + Math.random() * 8, a: 0.5 + Math.random() * 0.35 });
  }

  function resize() {
    if (!cv) return;
    W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    bake(); build();
  }

  function drawPart(p, t) {
    var x = p.x + Math.sin(t * 0.8 + p.ph) * 14, y = p.y, s = p.s;
    ctx.save(); ctx.translate(x, y);
    if (th.fx === 'bubbles') {
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.35, s * 0.18, 0, TAU); ctx.fill();
    } else if (th.fx === 'snow') {
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill();
    } else if (th.fx === 'petals') {
      ctx.rotate(p.rot + t * 0.6); ctx.globalAlpha = 0.65; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.25, 0, 0, TAU); ctx.fill();
    } else if (th.fx === 'hearts') {
      ctx.rotate(Math.sin(t + p.ph) * 0.4); ctx.globalAlpha = 0.5; ctx.fillStyle = p.col; var k = s * 0.5;
      ctx.beginPath(); ctx.moveTo(0, k * 0.9); ctx.bezierCurveTo(-k * 1.6, -k * 0.2, -k * 0.7, -k * 1.2, 0, -k * 0.4);
      ctx.bezierCurveTo(k * 0.7, -k * 1.2, k * 1.6, -k * 0.2, 0, k * 0.9); ctx.fill();
    } else if (th.fx === 'embers') {
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5 + p.ph); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha = 0.35 + 0.6 * Math.abs(Math.sin(t * 1.6 + p.ph)); ctx.fillStyle = '#fff'; var q = s * 0.45;
      ctx.beginPath(); ctx.moveTo(0, -q); ctx.quadraticCurveTo(0, 0, q, 0); ctx.quadraticCurveTo(0, 0, 0, q);
      ctx.quadraticCurveTo(0, 0, -q, 0); ctx.quadraticCurveTo(0, 0, 0, -q); ctx.fill();
    }
    ctx.restore();
  }

  function frame(now) {
    if (!on) return;
    requestAnimationFrame(frame);
    if (now - last < 33) return;
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    var t = now / 1000, i;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (back) ctx.drawImage(back, 0, 0, W, H);
    for (i = 0; i < clouds.length; i++) { var cl = clouds[i]; cl.x += cl.v * dt; if (cl.x > W + 90) cl.x = -90; cloud(ctx, cl.x, cl.y, cl.s, cl.a); }
    var up = th.fx === 'bubbles' || th.fx === 'hearts' || th.fx === 'sparkle' || th.fx === 'embers';
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (th.fx === 'stars') { /* twinkle in place */ }
      else if (up) { p.y -= p.v * dt; if (p.y < -30) spawn(p, false); }
      else { p.y += p.v * dt; if (p.y > H + 30) spawn(p, false); }
      drawPart(p, t);
    }
    if (front) ctx.drawImage(front, 0, 0, W, H);
  }

  var curKey = '';
  function set(n) {
    var key = n ? 'v' + variantFor(n) : 'home';
    if (key === curKey) return;
    curKey = key;
    th = n ? themeFor(n) : THEMES[0];
    seed = n ? variantFor(n) + 1 : 1;
    var app = document.getElementById('app');
    app.style.background = 'linear-gradient(170deg,' + th.c[0] + ' 0%,' + th.c[1] + ' 55%,' + th.c[2] + ' 100%)';
    document.documentElement.style.setProperty('--board', th.board);
    if (cv) { bake(); build(); }
  }
  function init() {
    cv = document.getElementById('fx'); ctx = cv.getContext('2d'); curKey = ''; resize(); set(0);
    window.addEventListener('resize', function () { var k = curKey; resize(); curKey = k; });
    on = true; requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () { on = !document.hidden; if (on) requestAnimationFrame(frame); });
  }

  root.SweetTheme = { init: init, set: set, THEMES: THEMES, themeFor: themeFor, variantFor: variantFor };
})(window);
