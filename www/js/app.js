'use strict';
/* Sweet Pop - screens, input, animation and progress. Plain ES2017 (runs on old WebEngine). */
(function () {
  var Core = window.SweetCore, D = window.SweetDraw, A = window.SweetAudio;
  var W = 9, H = 9;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

  // ---------------- storage (falls back to memory when localStorage is blocked) ----------------
  var KEY = 'sweetpop.v1';
  var store = { stars: {}, unlocked: 1, sound: true, music: true, musicVol: 0.5, sfxVol: 0.8, diff: 'easy', lang: 'ar', all: false };
  function loadStore() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) for (var k in s) store[k] = s[k];
    } catch (e) { /* memory only */ }
  }
  function saveStore() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }

  // ---------------- text ----------------
  var STR = {
    ar: {
      tagline: 'اقلب الحلوى وطابق ثلاثاً أو أكثر!', play: 'العب', levels: 'المراحل', settings: 'الإعدادات',
      moves: 'الحركات', score: 'النقاط', level: 'المرحلة {n}',
      g_score: 'اجمع {n} نقطة', g_ice: 'حطّم كل الجليد', g_color: 'اجمع {n} حلوى من هذا اللون',
      g_ing: 'أنزل {n} حبة كرز إلى الأسفل', g_crate: 'حطّم كل الصناديق', start: 'ابدأ', stepsLeft: 'عدد الحركات: {n}',
      win: 'أحسنت!', lose: 'نفدت الحركات', next: 'التالي', retry: 'أعد المحاولة', replay: 'العب مجدداً', toMap: 'المراحل',
      resume: 'متابعة', restart: 'إعادة المرحلة', home: 'الرئيسية', paused: 'إيقاف مؤقت', yourScore: 'نقاطك: {n}',
      goal: 'الهدف', hintBtn: 'تلميح', difficulty: 'الصعوبة', easy: 'سهل', normal: 'عادي', hard: 'صعب', sound: 'المؤثرات الصوتية', music: 'الموسيقى', musicVol: 'مستوى الموسيقى', sfxVol: 'مستوى المؤثرات', language: 'اللغة', unlock: 'فتح كل المراحل (للتجربة)', reset: 'مسح التقدم', on: 'يعمل', off: 'متوقف',
      done: 'تم', close: 'إغلاق', shuffle: 'خلط الحلوى!', bonus: 'مكافأة الحركات المتبقية!', worlds: ['مرج الحلوى', 'غابة الشوكولاتة', 'جبل الجيلي', 'مدينة الكراميل', 'بحر الآيس كريم', 'قصر السكر'],
      praise: ['لذيذ!', 'رائع!', 'مذهل!', 'خرافي!'], noMove: 'لا حركات!', confirmReset: 'سيتم مسح كل تقدمك. متأكد؟', yes: 'نعم', no: 'لا',
      stars3: 'ثلاث نجوم!', best: 'الأفضل'
    },
    en: {
      tagline: 'Swap candies and match three or more!', play: 'Play', levels: 'Levels', settings: 'Settings',
      moves: 'Moves', score: 'Score', level: 'Level {n}',
      g_score: 'Reach {n} points', g_ice: 'Clear all the ice', g_color: 'Collect {n} candies of this colour',
      g_ing: 'Bring {n} cherries to the bottom', g_crate: 'Break all the crates', start: 'Start', stepsLeft: 'Moves: {n}',
      win: 'Sweet!', lose: 'Out of moves', next: 'Next', retry: 'Try again', replay: 'Play again', toMap: 'Levels',
      resume: 'Resume', restart: 'Restart level', home: 'Home', paused: 'Paused', yourScore: 'Score: {n}',
      goal: 'Goal', hintBtn: 'Hint', difficulty: 'Difficulty', easy: 'Easy', normal: 'Normal', hard: 'Hard', sound: 'Sound effects', music: 'Music', musicVol: 'Music volume', sfxVol: 'Effects volume', language: 'Language', unlock: 'Unlock all levels (testing)', reset: 'Reset progress', on: 'On', off: 'Off',
      done: 'Done', close: 'Close', shuffle: 'Shuffling!', bonus: 'Bonus for leftover moves!', worlds: ['Candy Meadow', 'Chocolate Forest', 'Jelly Mountain', 'Caramel Town', 'Ice Cream Sea', 'Sugar Palace'],
      praise: ['Tasty!', 'Great!', 'Amazing!', 'Fantastic!'], noMove: 'No moves!', confirmReset: 'This erases all your progress. Sure?', yes: 'Yes', no: 'No',
      stars3: 'Three stars!', best: 'Best'
    }
  };
  function t(k, p) {
    var s = (STR[store.lang] && STR[store.lang][k]); if (s === undefined) s = STR.en[k]; if (s === undefined) s = k;
    if (p && typeof s === 'string') for (var x in p) s = s.split('{' + x + '}').join(p[x]);
    return s;
  }
  function applyLang() {
    document.documentElement.lang = store.lang;
    document.documentElement.dir = store.lang === 'ar' ? 'rtl' : 'ltr';
    $('tagline').textContent = t('tagline');
    $('btnPlay').textContent = t('play');
    $('btnLevels').textContent = t('levels');
    $('btnSettings').textContent = t('settings');
    $('mapTitle').textContent = t('levels');
    $('lblMoves').textContent = t('moves');
    $('lblScore').textContent = t('score');
    $('lblHint').textContent = t('hintBtn');
    buildMap();
  }

  // ---------------- levels ----------------
  var TOTAL = (window.SweetLevels && window.SweetLevels.TOTAL) || 120;
  function getLevel(n) {
    var d = window.SWEET_LEVELS && window.SWEET_LEVELS[n - 1];
    if (d) return d;
    var def = window.SweetLevels.levelDef(n);
    def.moves = 25; def.star2 = 8000; def.star3 = 14000;
    def.goals.forEach(function (g) { if (g.type === 'score') g.n = 5000; });
    return def;
  }
  function isUnlocked(n) { return store.all || n <= store.unlocked; }

  // ---------------- screens ----------------
  var current = 'home';
  function show(name) {
    ['home', 'map', 'game'].forEach(function (s) { $(s).classList.toggle('hidden', s !== name); });
    current = name;
    if (name === 'game') { resizeBoard(); } else { if (window.SweetTheme) SweetTheme.set(0); A.musicPlay(0); }
  }
  function showModal(html, cls) {
    var m = $('modal'); m.innerHTML = '<div class="card ' + (cls || '') + '">' + html + '</div>'; m.classList.remove('hidden');
  }
  function hideModal() { $('modal').classList.add('hidden'); $('modal').innerHTML = ''; }
  var toastTimer = 0;
  function toast(msg) {
    var e = $('toast'); e.textContent = msg; e.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { e.classList.remove('show'); }, 900);
  }
  function btn(act, label, cls) { return '<button class="btn ' + (cls || '') + '" data-act="' + act + '">' + label + '</button>'; }
  function img(name, px) { return '<img src="' + D.icon(name, px) + '" width="' + px + '" height="' + px + '" alt="">'; }

  function buildFloaters() {
    var f = $('floaters'); f.innerHTML = '';
    var names = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'cherry', 'stripe', 'wrap', 'bomb', 'c2', 'c5', 'c0', 'c4'];
    names.forEach(function (n, i) {
      var im = new Image(); im.src = D.icon(n, 64);
      var size = 40 + (i * 13) % 34;
      im.style.width = im.style.height = size + 'px';
      im.style.left = ((i * 37) % 88 + 2) + '%'; im.style.top = ((i * 53) % 86 + 3) + '%';
      im.style.animationDelay = (-i * 0.9) + 's';
      f.appendChild(im);
    });
  }

  function buildMap() {
    var box = $('mapList'); box.innerHTML = '';
    var worlds = t('worlds');
    for (var w = 0; w < Math.ceil(TOTAL / 20); w++) {
      var wd = el('div', 'world'), grid = el('div', 'lvgrid');
      wd.appendChild(el('h3', '', worlds[w % worlds.length]));
      for (var i = 0; i < 20; i++) {
        var n = w * 20 + i + 1;
        if (n > TOTAL) break;
        var b = el('button', 'lv'), s = store.stars[n] || 0;
        b.setAttribute('data-act', 'level'); b.setAttribute('data-n', n);
        if (!isUnlocked(n)) b.classList.add('locked'); else if (s) b.classList.add('done');
        var stars = '';
        for (var k = 0; k < 3; k++) stars += '<img src="' + D.icon(k < s ? 'star' : 'starOff', 32) + '" alt="">';
        b.innerHTML = '<span>' + n + '</span><i>' + (isUnlocked(n) ? stars : '') + '</i>';
        grid.appendChild(b);
      }
      wd.appendChild(grid); box.appendChild(wd);
    }
  }

  function goalText(gl, def) {
    if (gl.type === 'score') return { icon: 'star', text: t('g_score', { n: gl.n }) };
    if (gl.type === 'ice') return { icon: 'ice', text: t('g_ice') };
    if (gl.type === 'color') return { icon: 'c' + gl.color, text: t('g_color', { n: gl.n }) };
    if (gl.type === 'ingredient') return { icon: 'cherry', text: t('g_ing', { n: gl.n }) };
    return { icon: 'crate', text: t('g_crate') };
  }

  function openIntro(n) {
    if (!isUnlocked(n)) { A.bad(); return; }
    var def = applyDifficulty(getLevel(n)), html = '<h2>' + t('level', { n: n }) + '</h2>';
    def.goals.forEach(function (gl) { var g = goalText(gl, def); html += '<div class="goal-row">' + img(g.icon, 36) + '<span>' + g.text + '</span></div>'; });
    html += '<p>' + t('stepsLeft', { n: def.moves }) + '</p>';
    html += '<div class="btns">' + btn('start', t('start'), 'big') + btn('closemodal', t('close'), 'ghost small') + '</div>';
    pendingLevel = n;
    showModal(html);
  }
  var pendingLevel = 1;

  // ---------------- game state ----------------
  var cv, cx, size = 0, cell = 0, dpr = 1;
  var def = null, g = null, curLevel = 1, view = null, viewIce = null;
  var spr = [], dying = [], anims = [], effects = [], particles = [];
  var busy = false, sel = null, drag = null, hintMove = null, idleSince = 0, paused = false;
  var timeSec = 0, lastT = 0, rafOn = false, shownScore = 0;

  function mkSprite(tile, r, c) { return { tile: tile, x: c, y: r, s: 1, a: 1, rot: 0 }; }

  var bb = { r0: 0, r1: W - 1, c0: 0, c1: W - 1 }, ox = 0, oy = 0, cw = 0, ch = 0;
  function resizeBoard() {
    if (!cv) return;
    if (g) {
      bb = { r0: 99, r1: -1, c0: 99, c1: -1 };
      for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (g.play[r][c]) {
        if (r < bb.r0) bb.r0 = r; if (r > bb.r1) bb.r1 = r; if (c < bb.c0) bb.c0 = c; if (c > bb.c1) bb.c1 = c;
      }
    }
    var nc = bb.c1 - bb.c0 + 1, nr = bb.r1 - bb.r0 + 1;
    var wrap = $('boardWrap');
    var aw = wrap.clientWidth - 12, ah = wrap.clientHeight - 14;
    cell = Math.max(20, Math.floor(Math.min(aw / nc, ah / nr)));
    cw = cell * nc; ch = cell * nr; ox = bb.c0 * cell; oy = bb.r0 * cell;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    size = Math.max(cell * W, 1); D.dpr = dpr;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  }

  function setVh() { document.documentElement.style.setProperty('--vh', (window.innerHeight / 100) + 'px'); }

  // easy: more moves and lower targets; hard: fewer moves
  function applyDifficulty(d) {
    var m = store.diff === 'hard' ? 0.85 : (store.diff === 'normal' ? 1 : 1.6), k = store.diff === 'easy' ? 0.75 : 1;
    if (m === 1 && k === 1) return d;
    var o = {}, key;
    for (key in d) o[key] = d[key];
    o.moves = Math.max(5, Math.round(d.moves * m));
    o.goals = d.goals.map(function (gl) {
      var c = {}, q; for (q in gl) c[q] = gl[q];
      if (k !== 1 && gl.n && (gl.type === 'score' || gl.type === 'color')) c.n = Math.max(1, Math.round(gl.n * (gl.type === 'score' ? k : 0.8)));
      return c;
    });
    if (k !== 1) { if (d.star2) o.star2 = Math.round(d.star2 * k); if (d.star3) o.star3 = Math.round(d.star3 * k); }
    return o;
  }

  function startLevel(n) {
    A.init();
    curLevel = n; def = applyDifficulty(getLevel(n));
    var seed = ((Date.now() & 0x7fffffff) ^ (n * 2654435761)) | 0;
    g = Core.createGame(def, seed);
    view = { score: 0, got: [0, 0, 0, 0, 0, 0], iceLeft: g.iceTotal, crates: 0, ing: 0 };
    viewIce = g.ice.map(function (r) { return r.slice(); });
    shownScore = 0; busy = false; sel = null; drag = null; hintMove = null; paused = false;
    dying = []; anims = []; effects = []; particles = [];
    show('game'); hideModal(); if (window.SweetTheme) SweetTheme.set(n); A.musicPlay(Math.floor((n - 1) / 10) % 12);
    $('levelTitle').textContent = t('level', { n: n });
    buildGoals(); buildMarkers();
    syncSprites();
    // pop-in
    var all = [];
    for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (spr[r][c]) { spr[r][c].s = 0; all.push([spr[r][c], r + c]); }
    busy = true;
    anim(520, function (p) {
      all.forEach(function (e) { var q = Math.max(0, Math.min(1, p * 1.6 - e[1] * 0.045)); e[0].s = easeOutBack(q); });
    }).then(function () { busy = false; idleSince = performance.now(); });
    updateHud(true);
    startLoop();
  }

  function syncSprites() {
    spr = [];
    for (var r = 0; r < H; r++) {
      var row = [];
      for (var c = 0; c < W; c++) {
        var tile = g.grid[r][c];
        row.push(tile ? mkSprite({ k: tile.k, t: tile.t, s: tile.s, hp: tile.hp }, r, c) : null);
      }
      spr.push(row);
    }
  }

  // ---------------- HUD ----------------
  function buildGoals() {
    var box = $('goals'); box.innerHTML = '';
    var lab = el('div', 'goal-label'); lab.textContent = t('goal'); box.appendChild(lab);
    def.goals.forEach(function (gl, i) {
      var gi = goalText(gl, def), chip = el('div', 'chip');
      chip.id = 'goal' + i;
      chip.innerHTML = img(gi.icon, 30) + '<span></span>';
      box.appendChild(chip);
    });
  }
  function buildMarkers() {
    var m = $('markers'); m.innerHTML = '';
    var top = def.star3 || 1;
    var list = [];
    var sg = null; def.goals.forEach(function (gl) { if (gl.type === 'score') sg = gl.n; });
    if (sg) list.push(sg);
    list.push(def.star2, def.star3);
    list.forEach(function (v, i) {
      var im = new Image(); im.src = D.icon('star', 80); im.id = 'mk' + i; im.setAttribute('data-v', v);
      im.style.left = Math.min(98, v / top * 100) + '%';
      m.appendChild(im);
    });
  }
  function updateHud(force) {
    if (!g) return;
    $('moves').textContent = g.moves;
    var sc = Math.round(shownScore);
    if (force || $('score').textContent !== String(sc)) $('score').textContent = sc;
    var top = def.star3 || 1;
    $('barFill').style.width = Math.min(100, shownScore / top * 100) + '%';
    var mks = $('markers').children;
    for (var i = 0; i < mks.length; i++) {
      var lit = shownScore >= +mks[i].getAttribute('data-v');
      if (lit !== mks[i].classList.contains('lit')) { mks[i].classList.toggle('lit', lit); if (lit && !force) A.special && A.special(); }
    }
    $('movesBox').classList.toggle('low', g.moves <= 3 && g.status === 'playing');
    def.goals.forEach(function (gl, i) {
      var chip = $('goal' + i); if (!chip) return;
      var left = 0;
      if (gl.type === 'score') {
        left = Math.max(0, gl.n - sc);
        chip.lastChild.textContent = left > 0 ? sc + ' / ' + gl.n : '✓';
        chip.classList.toggle('done', left === 0); return;
      }
      if (gl.type === 'ice') left = view.iceLeft;
      else if (gl.type === 'color') left = Math.max(0, gl.n - view.got[gl.color]);
      else if (gl.type === 'ingredient') left = Math.max(0, gl.n - view.ing);
      else if (gl.type === 'crate') left = Math.max(0, g.crateTotal - view.crates);
      chip.lastChild.textContent = left > 0 ? left : '✓';
      chip.classList.toggle('done', left === 0);
    });
  }

  // ---------------- animation helpers ----------------
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeOutBounce(x) {
    var n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
    if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
    x -= 2.625 / d1; return n1 * x * x + 0.984375;
  }
  var speed = 1;   // >1 during the end-of-level bonus so it stays short
  function anim(dur, fn) {
    dur = dur / speed;
    return new Promise(function (res) { anims.push({ t0: performance.now(), dur: dur, fn: fn, res: res }); });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms / speed); }); }
  function stepAnims(now) {
    for (var i = anims.length - 1; i >= 0; i--) {
      var a = anims[i], p = Math.min(1, (now - a.t0) / a.dur);
      a.fn(p);
      if (p >= 1) { anims.splice(i, 1); a.res(); }
    }
  }

  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2, sp = (0.8 + Math.random() * 2.4) * cell;
      particles.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - cell * 0.8, life: 0.55 + Math.random() * 0.3, t: 0, col: color, sz: cell * (0.06 + Math.random() * 0.07) });
    }
  }
  function floatText(x, y, text, color) {
    effects.push({ t0: performance.now(), dur: 900, draw: function (c, p) {
      c.save(); c.globalAlpha = 1 - p * p; c.fillStyle = color || '#fff'; c.strokeStyle = 'rgba(90,30,120,.8)';
      c.lineWidth = cell * 0.09; c.font = '900 ' + Math.round(cell * 0.5) + 'px sans-serif'; c.textAlign = 'center';
      var yy = y - p * cell * 0.9; c.strokeText(text, x, yy); c.fillText(text, x, yy); c.restore();
    } });
  }
  function addBeam(r, c, dir) {
    effects.push({ t0: performance.now(), dur: 380, draw: function (ctx, p) {
      ctx.save(); ctx.globalAlpha = 1 - p;
      var th = cell * (0.75 - 0.6 * p);
      var grd;
      if (dir === 'h') {
        grd = ctx.createLinearGradient(0, 0, 0, 1); ctx.fillStyle = '#fff';
        ctx.shadowColor = '#ffb3e6'; ctx.shadowBlur = cell * 0.6;
        ctx.fillRect(0, (r + 0.5) * cell - th / 2, size, th);
      } else {
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#ffb3e6'; ctx.shadowBlur = cell * 0.6;
        ctx.fillRect((c + 0.5) * cell - th / 2, 0, th, size);
      }
      ctx.restore();
    } });
  }
  function addRing(r, c, big) {
    effects.push({ t0: performance.now(), dur: 420, draw: function (ctx, p) {
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#fff'; ctx.lineWidth = cell * 0.3 * (1 - p);
      ctx.beginPath(); ctx.arc((c + 0.5) * cell, (r + 0.5) * cell, cell * (0.4 + (big ? 3.2 : 1.6) * p), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    } });
  }
  function addFlash() {
    effects.push({ t0: performance.now(), dur: 380, draw: function (ctx, p) {
      ctx.save(); ctx.globalAlpha = 0.65 * (1 - p); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.restore();
    } });
  }

  // ---------------- phase playback ----------------
  function colorOf(tile) {
    if (tile.k === 'c' && tile.t >= 0) return D.PAL[tile.t].base;
    if (tile.k === 'i') return '#e0183a';
    if (tile.k === 'x') return '#ff8da1';
    return '#8b5a3c';
  }

  async function playPhases(phases) {
    for (var pi = 0; pi < phases.length; pi++) {
      var ph = phases[pi];
      if (ph.kind === 'swap') {
        A.swap();
        var a = ph.a, b = ph.b, sa = spr[a[0]][a[1]], sb = spr[b[0]][b[1]];
        spr[a[0]][a[1]] = sb; spr[b[0]][b[1]] = sa;
        await anim(150, function (p) {
          var e = easeInOut(p);
          sa.x = a[1] + (b[1] - a[1]) * e; sa.y = a[0] + (b[0] - a[0]) * e;
          sb.x = b[1] + (a[1] - b[1]) * e; sb.y = b[0] + (a[0] - b[0]) * e;
        });
      } else if (ph.kind === 'bonusmark') {
        var bs = spr[ph.r][ph.c];
        if (bs) {
          bs.tile.s = ph.s; A.special(); $('moves').textContent = ph.moves;
          burst((ph.c + 0.5) * cell, (ph.r + 0.5) * cell, '#ffe27a', 12);
          await anim(280, function (p) { bs.s = 1 + 0.5 * Math.sin(p * Math.PI); });
          bs.s = 1;
        }
      } else if (ph.kind === 'badswap') {
        A.bad();
        var a2 = ph.a, b2 = ph.b, s1 = spr[a2[0]][a2[1]], s2 = spr[b2[0]][b2[1]];
        await anim(230, function (p) {
          var e = p < 0.5 ? easeInOut(p * 2) : easeInOut((1 - p) * 2);
          s1.x = a2[1] + (b2[1] - a2[1]) * e * 0.8; s1.y = a2[0] + (b2[0] - a2[0]) * e * 0.8;
          s2.x = b2[1] + (a2[1] - b2[1]) * e * 0.8; s2.y = b2[0] + (a2[0] - b2[0]) * e * 0.8;
        });
        s1.x = a2[1]; s1.y = a2[0]; s2.x = b2[1]; s2.y = b2[0];
      } else if (ph.kind === 'clear') {
        await playClear(ph);
      } else if (ph.kind === 'fall') {
        await playFall(ph);
      } else if (ph.kind === 'collect') {
        A.cherry();
        var items = [];
        ph.items.forEach(function (it) { var s = spr[it.r][it.c]; if (s) { items.push(s); spr[it.r][it.c] = null; burst((it.c + 0.5) * cell, (it.r + 0.5) * cell, '#ff4d6d', 10); } });
        view.ing = ph.dropped; updateHud();
        items.forEach(function (s) { dying.push(s); });
        await anim(320, function (p) { items.forEach(function (s) { s.s = 1 + p * 0.5; s.a = 1 - p; s.y -= 0.02; }); });
        dying = dying.filter(function (s) { return items.indexOf(s) < 0; });
      } else if (ph.kind === 'shuffle') {
        toast(t('shuffle'));
        await anim(220, function (p) { forEachSprite(function (s) { s.a = 1 - p; s.s = 1 - p * 0.3; }); });
        spr = [];
        for (var r = 0; r < H; r++) { spr.push(new Array(W).fill(null)); }
        ph.tiles.forEach(function (e) { spr[e.r][e.c] = mkSprite({ k: e.tile.k, t: e.tile.t, s: e.tile.s, hp: e.tile.hp }, e.r, e.c); spr[e.r][e.c].a = 0; });
        await anim(260, function (p) { forEachSprite(function (s) { s.a = p; s.s = 0.7 + p * 0.3; }); });
      }
    }
  }
  function forEachSprite(fn) { for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (spr[r][c]) fn(spr[r][c]); }

  async function playClear(ph) {
    A.match(ph.chain);
    var hadBomb = false, hadSpecial = false;
    ph.fired.forEach(function (f) {
      hadSpecial = true;
      if (f.s === 1) addBeam(f.r, f.c, 'h');
      else if (f.s === 2) addBeam(f.r, f.c, 'v');
      else if (f.s === 3) addRing(f.r, f.c, false);
      else { hadBomb = true; addRing(f.r, f.c, true); }
    });
    if (hadBomb) { A.bomb(); addFlash(); } else if (hadSpecial) A.special();
    var gone = [], cx0 = 0, cy0 = 0;
    ph.cleared.forEach(function (e) {
      var s = spr[e.r][e.c];
      if (e.tile.k === 'c' && e.tile.t >= 0) view.got[e.tile.t]++;
      if (e.tile.k === 'x') { view.crates++; A.crack(); }
      burst((e.c + 0.5) * cell, (e.r + 0.5) * cell, colorOf(e.tile), e.tile.k === 'x' ? 12 : 7);
      if (s) { gone.push(s); spr[e.r][e.c] = null; }
      cx0 += e.c + 0.5; cy0 += e.r + 0.5;
    });
    gone.forEach(function (s) { dying.push(s); });
    var pops = [];
    ph.created.forEach(function (e) {
      var s = spr[e.r][e.c];
      if (s && s.tile.k === 'c' && s.tile.t >= 0) view.got[s.tile.t]++;
      if (!s) { s = mkSprite(null, e.r, e.c); spr[e.r][e.c] = s; }
      s.tile = { k: e.tile.k, t: e.tile.t, s: e.tile.s, hp: e.tile.hp };
      pops.push(s);
      burst((e.c + 0.5) * cell, (e.r + 0.5) * cell, '#ffffff', 10);
      A.special();
    });
    ph.iceHits.forEach(function (h) {
      A.crack();
      if (h.hp === 0) view.iceLeft--;
      viewIce[h.r][h.c] = h.hp;
      burst((h.c + 0.5) * cell, (h.r + 0.5) * cell, '#dff4ff', 8);
    });
    ph.crateHits.forEach(function (h) {
      var s = spr[h.r][h.c]; if (s) { s.tile.hp = h.hp; s.rot = 0.25; }
    });
    if (ph.cleared.length) floatText(cx0 / ph.cleared.length * cell, cy0 / ph.cleared.length * cell, '+' + ph.gain, '#fff');
    if (ph.chain >= 3) toast(t('praise')[Math.min(t('praise').length - 1, ph.chain - 3)]);
    view.score = ph.score; updateHud();
    await anim(240, function (p) {
      gone.forEach(function (s) { s.s = 1 + p * 0.25 - p * p * 1.25; s.a = 1 - p; s.rot = p * 0.8; });
      pops.forEach(function (s) { s.s = 1 + 0.45 * Math.sin(p * Math.PI); });
      forEachSprite(function (s) { if (s.rot && pops.indexOf(s) < 0 && gone.indexOf(s) < 0) s.rot *= 0.9; });
    });
    pops.forEach(function (s) { s.s = 1; });
    dying = dying.filter(function (s) { return gone.indexOf(s) < 0; });
  }

  async function playFall(ph) {
    var items = [], maxD = 0;
    var moving = [];
    ph.moves.forEach(function (m) { moving.push({ s: spr[m.from[0]][m.from[1]], from: m.from, to: m.to }); });
    ph.moves.forEach(function (m) { spr[m.from[0]][m.from[1]] = null; });
    moving.forEach(function (m) { if (m.s) { spr[m.to[0]][m.to[1]] = m.s; items.push({ s: m.s, y0: m.from[0], y1: m.to[0] }); maxD = Math.max(maxD, m.to[0] - m.from[0]); } });
    ph.spawned.forEach(function (e) {
      var s = mkSprite({ k: e.tile.k, t: e.tile.t, s: e.tile.s, hp: e.tile.hp }, e.fromR, e.c);
      spr[e.r][e.c] = s; items.push({ s: s, y0: e.fromR, y1: e.r }); maxD = Math.max(maxD, e.r - e.fromR);
    });
    var dur = 150 + 60 * Math.sqrt(maxD);
    await anim(dur, function (p) {
      items.forEach(function (it) {
        var d = it.y1 - it.y0, local = Math.min(1, p * (1 + 0.5 / Math.max(1, d)) );
        it.s.y = it.y0 + d * (d > 1 ? easeOutBounce(local) : easeInOut(local));
      });
    });
    items.forEach(function (it) { it.s.y = it.y1; });
  }

  // ---------------- input ----------------
  function cellAt(e) {
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (cw / rect.width) + ox, y = (e.clientY - rect.top) * (ch / rect.height) + oy;
    var c = Math.floor(x / cell), r = Math.floor(y / cell);
    if (r < 0 || r >= H || c < 0 || c >= W) return null;
    return { r: r, c: c, x: x, y: y };
  }
  function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  async function doSwap(a, b) {
    if (busy || !g || g.status !== 'playing') return;
    hintMove = null; sel = null;
    var res = Core.trySwap(g, a.r, a.c, b.r, b.c);
    if (!res.phases.length) { idleSince = performance.now(); return; }
    busy = true;
    await playPhases(res.phases);
    view.score = g.score; view.iceLeft = g.iceLeft; view.crates = g.cratesBroken; view.ing = g.ingDropped; view.got = g.got.slice();
    syncSprites();
    updateHud();
    if (g.status === 'won' && g.moves > 0) {
      toast(t('bonus'));
      await wait(700);
      var bph = Core.bonusRound(g);
      speed = 2.6;
      try { await playPhases(bph); } finally { speed = 1; }
      view.score = g.score; view.iceLeft = g.iceLeft; view.crates = g.cratesBroken; view.ing = g.ingDropped; view.got = g.got.slice();
      shownScore = g.score; syncSprites(); updateHud(true);
      $('moves').textContent = g.moves;
      floatText(ox + cw / 2, oy + ch / 2, '+' + g.bonus, '#ffd93d');
      await wait(900);
    }
    busy = false; idleSince = performance.now();
    if (g.status === 'won') { await wait(300); showResult(true); }
    else if (g.status === 'lost') { await wait(500); showResult(false); }
  }

  function onDown(e) {
    if (!g || paused || busy || g.status !== 'playing') return;
    A.init();
    var p = cellAt(e); if (!p) return;
    hintMove = null; idleSince = performance.now();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    if (sel && adjacent(sel, p)) { var from = sel; sel = null; drag = null; doSwap(from, p); return; }
    sel = { r: p.r, c: p.c };
    drag = { r: p.r, c: p.c, x: p.x, y: p.y };
    A.click();
  }
  function onMove(e) {
    if (!drag || busy) return;
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (cw / rect.width) + ox, y = (e.clientY - rect.top) * (ch / rect.height) + oy;
    var dx = x - drag.x, dy = y - drag.y;
    if (Math.abs(dx) < cell * 0.35 && Math.abs(dy) < cell * 0.35) return;
    var to = Math.abs(dx) > Math.abs(dy) ? { r: drag.r, c: drag.c + (dx > 0 ? 1 : -1) } : { r: drag.r + (dy > 0 ? 1 : -1), c: drag.c };
    var from = { r: drag.r, c: drag.c };
    drag = null; sel = null;
    if (to.r >= 0 && to.r < H && to.c >= 0 && to.c < W) doSwap(from, to);
  }
  function onUp() { drag = null; }

  // ---------------- results ----------------
  function showResult(won) {
    paused = true;
    var html;
    if (won) {
      A.win();
      var prev = store.stars[curLevel] || 0;
      if (g.stars > prev) store.stars[curLevel] = g.stars;
      if (curLevel + 1 > store.unlocked) store.unlocked = Math.min(TOTAL, curLevel + 1);
      saveStore();
      html = '<h2>' + t('win') + '</h2><div class="stars">';
      for (var i = 0; i < 3; i++) html += '<img class="' + (i < g.stars ? '' : 'off') + '" style="animation-delay:' + (0.25 + i * 0.3) + 's" src="' + D.icon(i < g.stars ? 'star' : 'starOff', 96) + '" alt="">';
      html += '</div><p>' + t('yourScore', { n: g.score }) + '</p><div class="btns">';
      if (curLevel < TOTAL) html += btn('next', t('next'), 'big');
      html += btn('replay', t('replay'), 'small') + btn('map', t('toMap'), 'ghost small') + '</div>';
      for (var s = 0; s < g.stars; s++) (function (k) { setTimeout(function () { A.star(k); }, 250 + k * 300); })(s);
    } else {
      A.lose();
      html = '<h2>' + t('lose') + '</h2><p>' + t('yourScore', { n: g.score }) + '</p><div class="btns">' +
        btn('replay', t('retry'), 'big') + btn('map', t('toMap'), 'ghost small') + '</div>';
    }
    showModal(html);
  }

  function showPause() {
    paused = true;
    showModal('<h2>' + t('paused') + '</h2><div class="btns">' + btn('resume', t('resume'), 'big') + btn('replay', t('restart'), 'small') +
      btn('settings', t('settings'), 'small') + btn('map', t('toMap'), 'ghost small') + '</div>');
  }

  function showSettings(back) {
    var html = '<h2>' + t('settings') + '</h2>';
    html += '<div class="row"><span>' + t('sound') + '</span>' + btn('sound', store.sound ? t('on') : t('off'), 'small') + '</div>';
    html += '<div class="row"><span>' + t('difficulty') + '</span>' + btn('diff', t(store.diff), 'small') + '</div>';
    html += '<div class="row"><span>' + t('sfxVol') + '</span><input type="range" class="vol" data-slider="sfxVol" min="0" max="100" value="' + Math.round(store.sfxVol * 100) + '"></div>';
    html += '<div class="row"><span>' + t('music') + '</span>' + btn('music', store.music ? t('on') : t('off'), 'small') + '</div>';
    html += '<div class="row"><span>' + t('musicVol') + '</span><input type="range" class="vol" data-slider="musicVol" min="0" max="100" value="' + Math.round(store.musicVol * 100) + '"></div>';
    html += '<div class="row"><span>' + t('language') + '</span>' + btn('lang', store.lang === 'ar' ? 'English' : 'العربية', 'small') + '</div>';
    html += '<div class="row"><span>' + t('unlock') + '</span>' + btn('unlockall', store.all ? t('on') : t('off'), 'small') + '</div>';
    html += '<div class="row"><span>' + t('reset') + '</span>' + btn('reset', '↺', 'small') + '</div>';
    html += '<div class="btns">' + btn(back || 'closemodal', t('done'), 'big') + '</div>';
    showModal(html);
  }

  // ---------------- render loop ----------------
  function startLoop() { if (!rafOn) { rafOn = true; lastT = performance.now(); requestAnimationFrame(frame); } }

  function frame(now) {
    if (current !== 'game') { rafOn = false; return; }
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; timeSec += dt;
    stepAnims(now);
    if (g) {
      shownScore += (view.score - shownScore) * Math.min(1, dt * 9);
      if (Math.abs(view.score - shownScore) < 1) shownScore = view.score;
      updateHud();
      if (!busy && !paused && g.status === 'playing' && !hintMove && now - idleSince > 7000) hintMove = Core.hint(g);
      draw(dt, now);
    }
    requestAnimationFrame(frame);
  }

  function draw(dt, now) {
    var ctx = cx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    var r, c;
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) {
      if (!g.play[r][c]) continue;
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.32)';
      D.rrect(ctx, c * cell + 1, r * cell + 1, cell - 2, cell - 2, cell * 0.16); ctx.fill();
    }
    // sprites (clip to playable columns so falling candies do not show above the board shape)
    ctx.save();
    ctx.beginPath();
    for (c = 0; c < W; c++) if (g.top[c] >= 0) ctx.rect(c * cell, g.top[c] * cell, cell, (g.bot[c] - g.top[c] + 1) * cell);
    ctx.clip();
    var pulse = 1 + 0.08 * Math.abs(Math.sin(timeSec * 6));
    function drawSprite(s) {
      if (s.a <= 0.01 || s.s <= 0.01) return;
      var px = (s.x + 0.5) * cell, py = (s.y + 0.5) * cell;
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, s.a));
      ctx.translate(px, py); if (s.rot) ctx.rotate(s.rot);
      var sc = s.s;
      if (selMatch(s)) sc *= 1.12;
      ctx.scale(sc, sc);
      var sp = s.tile && s.tile.k === 'c' && s.tile.s ? 1 + 0.04 * Math.sin(timeSec * 4) : 1;
      ctx.scale(sp, sp);
      D.drawCandy(ctx, 0, 0, cell, s.tile, timeSec);
      ctx.restore();
    }
    function selMatch(s) {
      if (sel && Math.round(s.y) === sel.r && Math.round(s.x) === sel.c && !busy) return true;
      if (hintMove) {
        if (Math.round(s.y) === hintMove[0] && Math.round(s.x) === hintMove[1]) return pulse > 1.04;
        if (Math.round(s.y) === hintMove[2] && Math.round(s.x) === hintMove[3]) return pulse > 1.04;
      }
      return false;
    }
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) if (spr[r] && spr[r][c]) drawSprite(spr[r][c]);
    for (var di = 0; di < dying.length; di++) drawSprite(dying[di]);
    ctx.restore();
    // ice on top of everything in the cell
    for (r = 0; r < H; r++) for (c = 0; c < W; c++) if (viewIce[r][c] > 0) D.drawIce(ctx, c * cell, r * cell, cell, viewIce[r][c]);
    // particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]; p.t += dt;
      if (p.t >= p.life) { particles.splice(i, 1); continue; }
      p.vy += cell * 7 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (var k = effects.length - 1; k >= 0; k--) {
      var ef = effects[k], pr = (now - ef.t0) / ef.dur;
      if (pr >= 1) { effects.splice(k, 1); continue; }
      ef.draw(ctx, pr);
    }
  }

  // ---------------- wiring ----------------
  function act(a, el0) {
    A.init();
    if (a !== 'level' && a !== 'start') A.click();
    switch (a) {
      case 'play': {
        var n = 1; for (var i = 1; i <= TOTAL; i++) { if (isUnlocked(i) && !store.stars[i]) { n = i; break; } n = i; }
        openIntro(Math.min(n, store.all ? n : store.unlocked)); break;
      }
      case 'map': buildMap(); hideModal(); show('map'); break;
      case 'home': hideModal(); show('home'); break;
      case 'level': openIntro(+el0.getAttribute('data-n')); break;
      case 'start': startLevel(pendingLevel); break;
      case 'next': hideModal(); openIntro(Math.min(TOTAL, curLevel + 1)); break;
      case 'replay': startLevel(curLevel); break;
      case 'pause': if (g && g.status === 'playing' && !busy) showPause(); break;
      case 'resume': paused = false; idleSince = performance.now(); hideModal(); break;
      case 'closemodal': hideModal(); if (current === 'game') paused = false; break;
      case 'mute': { var on = !(store.sound || store.music); store.sound = on; store.music = on; A.setEnabled(on); A.setMusicEnabled(on); saveStore(); $('btnMute').classList.toggle('off', !on); toast(t(on ? 'on' : 'off')); break; }
      case 'hint': if (g && !busy && g.status === 'playing') { hintMove = Core.hint(g); } break;
      case 'settings': showSettings(current === 'game' ? 'pause' : 'closemodal'); break;
      case 'diff': store.diff = store.diff === 'easy' ? 'normal' : (store.diff === 'normal' ? 'hard' : 'easy'); saveStore(); showSettings(current === 'game' ? 'pause' : 'closemodal'); break;
      case 'music': store.music = !store.music; A.setMusicEnabled(store.music); saveStore(); showSettings(current === 'game' ? 'pause' : 'closemodal'); break;
      case 'sound': store.sound = !store.sound; A.setEnabled(store.sound); saveStore(); showSettings(current === 'game' ? 'pause' : 'closemodal'); break;
      case 'lang': store.lang = store.lang === 'ar' ? 'en' : 'ar'; saveStore(); applyLang(); if (g && current === 'game') $('levelTitle').textContent = t('level', { n: curLevel }); showSettings(current === 'game' ? 'pause' : 'closemodal'); break;
      case 'unlockall': store.all = !store.all; saveStore(); buildMap(); showSettings(current === 'game' ? 'pause' : 'closemodal'); break;
      case 'reset':
        showModal('<h2>' + t('reset') + '</h2><p>' + t('confirmReset') + '</p><div class="btns">' + btn('doreset', t('yes'), 'big') + btn('settings', t('no'), 'ghost small') + '</div>'); break;
      case 'doreset': store.stars = {}; store.unlocked = 1; store.all = false; saveStore(); buildMap(); showSettings('closemodal'); break;
    }
  }

  function init() {
    if (window.SweetTheme) SweetTheme.init();
    loadStore();
    A.setEnabled(store.sound); A.setMusicEnabled(store.music); A.setMusicVolume(store.musicVol); A.setSfxVolume(store.sfxVol);
    document.addEventListener('input', function (e) {
      var k = e.target && e.target.getAttribute && e.target.getAttribute('data-slider'); if (!k) return;
      store[k] = (+e.target.value) / 100; if (k === 'musicVol') A.setMusicVolume(store[k]); else { A.setSfxVolume(store[k]); }
      saveStore();
    });
    document.addEventListener('change', function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-slider') === 'sfxVol') A.click(); });
    setVh();
    cv = $('board'); cx = cv.getContext('2d');
    document.addEventListener('click', function (e) {
      var t0 = e.target; while (t0 && t0 !== document.body && !(t0.getAttribute && t0.getAttribute('data-act'))) t0 = t0.parentNode;
      if (t0 && t0.getAttribute && t0.getAttribute('data-act')) act(t0.getAttribute('data-act'), t0);
    });
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('resize', function () { setVh(); if (current === 'game') resizeBoard(); });
    try {
      var keepOn = function () { if (navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').catch(function () {}); };
      document.addEventListener('pointerdown', keepOn); document.addEventListener('visibilitychange', keepOn);
    } catch (e) { /* not supported */ }
    buildFloaters();
    applyLang();
    show('home');
    // test hooks (used by automated tests only)
    window.__sweet = {
      state: function () { return g; }, store: store, startLevel: startLevel, busy: function () { return busy; },
      swap: function (r1, c1, r2, c2) { return doSwap({ r: r1, c: c1 }, { r: r2, c: c2 }); },
      view: function () { return view; }, bounds: function () { return { bb: bb, cell: cell, ox: ox, oy: oy }; }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
