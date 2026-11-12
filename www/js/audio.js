'use strict';
/* Sweet Pop - tiny synthesized sound effects (no audio files, works offline). */
(function (root) {
  var ctx = null, enabled = true, master = null, sfxVol = 0.8;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.6 * sfxVol; master.connect(ctx.destination);
      musicInit();
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || !enabled) return;
    var t0 = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }


  // ---------------- background music (generated live, no audio files) ----------------
  var mEnabled = true, mVol = 0.5, mGain = null, want = -1, cur = null, timer = 0;
  // 12 gentle tracks, one per 10 levels. root = MIDI note, mode = scale, chords = semitone offsets from root.
  var MODES = { maj: [0, 2, 4, 7, 9], min: [0, 3, 5, 7, 10], lyd: [0, 2, 4, 6, 7, 9, 11], dor: [0, 2, 3, 5, 7, 9, 10] };
  var TRACKS = [
    { root: 60, mode: 'maj', bpm: 84, lead: 'sine',     ch: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [4, 7, 11]] },
    { root: 62, mode: 'maj', bpm: 92, lead: 'triangle', ch: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]] },
    { root: 57, mode: 'dor', bpm: 78, lead: 'sine',     ch: [[0, 3, 7], [5, 9, 12], [3, 7, 10], [7, 10, 14]] },
    { root: 64, mode: 'lyd', bpm: 72, lead: 'sine',     ch: [[0, 4, 7], [2, 6, 9], [4, 7, 11], [2, 6, 9]] },
    { root: 55, mode: 'min', bpm: 70, lead: 'triangle', ch: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]] },
    { root: 65, mode: 'maj', bpm: 88, lead: 'sine',     ch: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]] },
    { root: 58, mode: 'dor', bpm: 82, lead: 'triangle', ch: [[0, 3, 7], [3, 7, 10], [5, 9, 12], [0, 3, 7]] },
    { root: 67, mode: 'lyd', bpm: 90, lead: 'sine',     ch: [[0, 4, 7], [4, 7, 11], [2, 6, 9], [7, 11, 14]] },
    { root: 59, mode: 'min', bpm: 96, lead: 'triangle', ch: [[0, 3, 7], [5, 8, 12], [8, 12, 15], [7, 10, 14]] },
    { root: 53, mode: 'min', bpm: 68, lead: 'sine',     ch: [[0, 3, 7], [7, 10, 14], [8, 12, 15], [5, 8, 12]] },
    { root: 69, mode: 'maj', bpm: 100, lead: 'triangle', ch: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]] },
    { root: 63, mode: 'lyd', bpm: 86, lead: 'sine',     ch: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [9, 12, 16]] }
  ];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function hash(a) { a = (a ^ 61) ^ (a >>> 16); a = a + (a << 3); a = a ^ (a >>> 4); a = Math.imul(a, 0x27d4eb2d); a = a ^ (a >>> 15); return (a >>> 0) / 4294967296; }

  function musicInit() {
    mGain = ctx.createGain(); mGain.gain.value = 0; mGain.connect(ctx.destination);
    if (want >= 0) startTrack(want);
  }
  function mnote(out, f, t0, dur, type, vol, atk) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (atk || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function scheduleBar(tr, bar, t0) {
    var beat = 60 / tr.bpm, chord = tr.ch[bar % tr.ch.length], out = tr.out, i;
    // soft pad (2 detuned voices per chord tone) + bass
    chord.forEach(function (n) {
      mnote(out, mtof(tr.root + n), t0, beat * 4.2, 'sine', 0.035, beat * 1.2);
      mnote(out, mtof(tr.root + n) * 1.004, t0, beat * 4.2, 'triangle', 0.014, beat * 1.2);
    });
    mnote(out, mtof(tr.root + chord[0] - 12), t0, beat * 2, 'sine', 0.06, 0.03);
    mnote(out, mtof(tr.root + chord[0] - 12), t0 + beat * 2, beat * 1.8, 'sine', 0.04, 0.03);
    // sparse melody on the scale (deterministic per track + bar, so it feels composed)
    var sc = MODES[tr.mode], step = hash(tr.id * 131 + bar) * sc.length | 0;
    for (i = 0; i < 8; i++) {
      var r = hash(tr.id * 977 + bar * 13 + i * 7);
      if (r < 0.42) continue;
      step = (step + (r < 0.7 ? 1 : (r < 0.88 ? -1 : 2)) + sc.length * 3) % (sc.length * 2);
      var deg = sc[step % sc.length] + 12 * Math.floor(step / sc.length);
      mnote(out, mtof(tr.root + 12 + deg), t0 + i * beat * 0.5, beat * 1.6, tr.lead, 0.045, 0.015);
    }
  }
  function pump() {
    if (!ctx || !cur) return;
    var beat = 60 / cur.bpm;
    while (cur.next < ctx.currentTime + 1.2) {
      scheduleBar(cur, cur.bar, cur.next);
      cur.bar++; cur.next += beat * 4;
    }
  }
  function applyMusicGain() {
    if (!mGain || !ctx) return;
    mGain.gain.cancelScheduledValues(ctx.currentTime);
    mGain.gain.setTargetAtTime(mEnabled ? mVol * 0.6 : 0, ctx.currentTime, 0.15);
  }
  function startTrack(idx) {
    if (!ctx || !mGain) return;
    if (cur) {  // crossfade: fade the old track out and drop it
      var old = cur; cur = null;
      old.out.gain.cancelScheduledValues(ctx.currentTime);
      old.out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(function () { try { old.out.disconnect(); } catch (e) {} }, 2500);
    }
    var def = TRACKS[idx % TRACKS.length];
    var out = ctx.createGain(); out.gain.value = 0; out.connect(mGain);
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
    cur = { id: idx, root: def.root, mode: def.mode, bpm: def.bpm, lead: def.lead, ch: def.ch, out: out, bar: 0, next: ctx.currentTime + 0.15 };
    applyMusicGain();
    if (!timer) timer = setInterval(pump, 250);
    pump();
  }
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  var NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

  var api = {
    init: init,
    setEnabled: function (v) { enabled = !!v; },
    setSfxVolume: function (v) { sfxVol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = 0.6 * sfxVol; },
    setMusicEnabled: function (v) { mEnabled = !!v; applyMusicGain(); },
    setMusicVolume: function (v) { mVol = Math.max(0, Math.min(1, v)); applyMusicGain(); },
    musicPlay: function (idx) { if (cur && cur.id === idx && ctx) return; want = idx; if (ctx) startTrack(idx); },
    isEnabled: function () { return enabled; },
    click: function () { tone(660, 0.07, 'triangle', 0.18); },
    swap: function () { tone(420, 0.09, 'sine', 0.18, 560); },
    bad: function () { tone(220, 0.14, 'sawtooth', 0.12, 150); },
    match: function (chain) {
      var n = Math.min(chain - 1, 5);
      tone(NOTES[n], 0.16, 'triangle', 0.26);
      tone(NOTES[n + 2], 0.2, 'sine', 0.16, null, 0.05);
    },
    special: function () { tone(300, 0.35, 'sawtooth', 0.12, 1200); tone(900, 0.3, 'sine', 0.2, 1800, 0.08); },
    bomb: function () { tone(200, 0.6, 'sawtooth', 0.14, 1600); tone(1200, 0.5, 'triangle', 0.2, 300, 0.15); },
    cherry: function () { tone(880, 0.12, 'sine', 0.25); tone(1320, 0.22, 'sine', 0.22, null, 0.1); },
    crack: function () { tone(180, 0.1, 'square', 0.1, 90); },
    win: function () { [0, 2, 4, 7].forEach(function (n, i) { tone(NOTES[n], 0.3, 'triangle', 0.26, null, i * 0.13); }); },
    lose: function () { [4, 2, 0].forEach(function (n, i) { tone(NOTES[n] * 0.5, 0.35, 'sine', 0.22, null, i * 0.18); }); },
    star: function (i) { tone(NOTES[3 + i * 2], 0.25, 'sine', 0.3); }
  };
  root.SweetAudio = api;
})(window);
