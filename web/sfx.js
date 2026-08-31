/* web/sfx.js — Ludo SFX Engine v1 (standalone, no dependencies, no asset files needed) */
(function () {
  'use strict';
  if (window.__LUDO_SFX_V1__) return;
  window.__LUDO_SFX_V1__ = true;

  /* ---------------------- تنظیمات ---------------------- */
  var CFG = {
    volume: 0.85,
    stepGap: 130,   // فاصله صدای هر خانه در حرکت مهره (میلی‌ثانیه)
    // اگر بعداً فایل صوتی واقعی داشتی، آن‌ها را در web/sfx/ بگذار؛ خودکار جای صدای ساختگی استفاده می‌شوند
    files: {
      dice: 'sfx/dice.mp3',
      step: 'sfx/step.mp3',
      capture: 'sfx/capture.mp3',
      home: 'sfx/home.mp3',
      win: 'sfx/win.mp3',
      lose: 'sfx/lose.mp3',
      turn: 'sfx/turn.mp3'
    }
  };

  var AC = null, master = null, noiseBuf = null, buffers = {}, muted = false;

  try { muted = localStorage.getItem('ludo_sfx_muted') === '1'; } catch (e) {}

  function ctx() {
    if (!AC) {
      var K = window.AudioContext || window.webkitAudioContext;
      if (!K) return null;
      AC = new K();
      master = AC.createGain();
      master.gain.value = CFG.volume;
      master.connect(AC.destination);
      loadFiles();
    }
    return AC;
  }

  function ensure() {
    var c = ctx();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    return c;
  }

  function now() { var c = ctx(); return c ? c.currentTime + 0.02 : 0; }

  /* ---------------------- بلوک‌های صوتی ---------------------- */
  function noise() {
    var c = ctx();
    if (!noiseBuf) {
      var len = Math.floor(c.sampleRate * 1.2);
      noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    return s;
  }

  // صدای برخورد تاس با تخته (کلاک خشک)
  function clack(at, gain, freq, dur) {
    var c = ctx(); if (!c) return;
    var s = noise();
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 7;
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 380;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    s.connect(bp); bp.connect(hp); hp.connect(g); g.connect(master);
    s.start(at); s.stop(at + dur + 0.03);
  }

  function tone(at, f0, dur, type, gain, f1) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, at);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(24, f1), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(master);
    o.start(at); o.stop(at + dur + 0.03);
  }

  /* ---------------------- صداهای بازی ---------------------- */
  // تاس: تکان‌دادن در دست + رها شدن و چند جهش روی تخته (~۱ ثانیه)
  function sDice() {
    var t = now(), i;
    for (i = 0; i < 6; i++) clack(t + i * 0.065 + Math.random() * 0.018, 0.10, 1500 + Math.random() * 1000, 0.05);
    var hit = [0.44, 0.57, 0.665, 0.735, 0.785, 0.82];
    var gn  = [0.50, 0.33, 0.22, 0.15, 0.09, 0.05];
    for (i = 0; i < hit.length; i++) clack(t + hit[i], gn[i], 850 + Math.random() * 1300, Math.max(0.03, 0.09 - i * 0.012));
    tone(t + 0.44, 190, 0.13, 'sine', 0.16, 85);
  }

  // حرکت مهره: تیک ملایم با پرش پله‌ای فرکانس
  function sStep(i) {
    var t = now(), n = (i || 0) % 6;
    tone(t, 600 + n * 42, 0.075, 'triangle', 0.15, 760 + n * 42);
    clack(t, 0.05, 2600, 0.03);
  }

  // حذف شدن مهره توسط حریف
  function sCapture() {
    var c = ctx(); if (!c) return;
    var t = now();
    var s = noise();
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(280, t + 0.3);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t); s.stop(t + 0.36);
    tone(t + 0.17, 320, 0.26, 'sawtooth', 0.18, 70);
    tone(t + 0.17, 150, 0.30, 'sine', 0.28, 44);
  }

  // رسیدن مهره به خانه پایانی
  function sHome() {
    var t = now(), n = [784, 988, 1175, 1568], i;
    for (i = 0; i < n.length; i++) {
      tone(t + i * 0.085, n[i], 0.30, 'triangle', 0.16);
      tone(t + i * 0.085, n[i] * 2, 0.16, 'sine', 0.06);
    }
  }

  // برد
  function sWin() {
    var t = now(), m = [523, 659, 784, 1047, 1319], i;
    for (i = 0; i < m.length; i++) tone(t + i * 0.11, m[i], 0.45, 'triangle', 0.18);
    tone(t + 0.55, 523, 0.9, 'sine', 0.12);
    tone(t + 0.55, 659, 0.9, 'sine', 0.10);
    tone(t + 0.55, 784, 0.9, 'sine', 0.09);
    tone(t + 0.55, 1047, 0.9, 'sine', 0.08);
  }

  // باخت
  function sLose() {
    var t = now(), m = [440, 392, 330, 247], i;
    for (i = 0; i < m.length; i++) tone(t + i * 0.16, m[i], 0.45, 'sine', 0.20, m[i] * 0.97);
    tone(t + 0.64, 123, 0.8, 'sine', 0.16, 98);
  }

  // نوبت تو شد
  function sTurn() {
    var t = now();
    tone(t, 880, 0.10, 'sine', 0.14);
    tone(t + 0.11, 1175, 0.14, 'sine', 0.14);
  }

  var SYNTH = { dice: sDice, step: sStep, capture: sCapture, home: sHome, win: sWin, lose: sLose, turn: sTurn };

  /* ---------------------- فایل‌های صوتی اختیاری ---------------------- */
  function loadFiles() {
    Object.keys(CFG.files).forEach(function (k) {
      try {
        fetch(CFG.files[k]).then(function (r) {
          if (!r.ok) throw 0;
          return r.arrayBuffer();
        }).then(function (b) {
          return new Promise(function (res, rej) {
            var p = AC.decodeAudioData(b, res, rej);
            if (p && p.then) p.then(res, rej);
          });
        }).then(function (buf) { buffers[k] = buf; }).catch(function () {});
      } catch (e) {}
    });
  }

  function playFile(k, rate) {
    var b = buffers[k]; if (!b) return false;
    var c = ctx(); if (!c) return false;
    var s = c.createBufferSource();
    s.buffer = b;
    if (rate) s.playbackRate.value = rate;
    s.connect(master); s.start();
    return true;
  }

  /* ---------------------- پخش + محدودکننده ---------------------- */
  var last = {};

  function play(name, arg) {
    if (muted) return;
    try {
      if (!ensure()) return;
      if (!playFile(name, name === 'step' ? 0.94 + Math.random() * 0.13 : 0)) {
        (SYNTH[name] || function () {})(arg);
      }
    } catch (e) {}
  }

  function fire(name, arg) {
    var t = Date.now(), min = (name === 'step' ? 40 : 140);
    if (t - (last[name] || 0) < min) return;
    last[name] = t;
    play(name, arg);
  }

  function steps(n) {
    n = parseInt(n, 10);
    if (!n || n < 1) n = 1;
    if (n > 6) n = 6;
    for (var i = 0; i < n; i++) {
      (function (i) { setTimeout(function () { play('step', i); }, i * CFG.stepGap); })(i);
    }
  }

  function haptic(kind) {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      var h = tg && tg.HapticFeedback;
      if (!h) return;
      if (kind === 'capture') h.notificationOccurred('error');
      else if (kind === 'win') h.notificationOccurred('success');
      else if (kind === 'dice') h.impactOccurred('medium');
      else h.impactOccurred('light');
    } catch (e) {}
  }

  /* ---------------------- تشخیص رویدادهای سرور ---------------------- */
  function classify(type) {
    var s = String(type == null ? '' : type).toLowerCase();
    if (!s) return null;
    if (/winner|gameover|game_over|game-over|game_end|match_end|final_result|(^|_|-)win(_|-|$)/.test(s)) return 'over';
    if (/capture|kill|eaten|(^|_)eat|knock|kick|(^|_)hit|beat|senthome|sent_home/.test(s)) return 'capture';
    if (/home|goal|reach|arriv|token_in|piece_in/.test(s)) return 'home';
    if (/dice|roll/.test(s)) return 'dice';
    if (/move|step|advance|walk/.test(s)) return 'move';
    if (/turn|next_player|nextplayer/.test(s)) return 'turn';
    return null;
  }

  var seen = {}, seenN = 0;

  function seqOf(o) {
    if (o.n != null) return 'n' + o.n;
    if (o.seq != null) return 's' + o.seq;
    if (o.eventSeq != null) return 'e' + o.eventSeq;
    return null;
  }

  function myId() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return String(tg.initDataUnsafe.user.id);
    } catch (e) {}
    return null;
  }

  function winnerIsMe(o) {
    var me = myId();
    var cands = [o.winner, o.winnerId, o.winner_id, o.userId, o.uid, o.playerId, o.by];
    if (o.winners && o.winners.length) cands.push(o.winners[0]);
    var found = false, i, c, id;
    for (i = 0; i < cands.length; i++) {
      c = cands[i];
      if (c == null) continue;
      found = true;
      id = (typeof c === 'object') ? (c.id || c.userId || c.uid || c.tgId) : c;
      if (me && String(id) === me) return true;
    }
    return !found; // اگر برنده مشخص نبود، صدای خنثی برد
  }

  function trigger(cat, o) {
    var v = (o.dice != null) ? o.dice : (o.value != null ? o.value : (o.d != null ? o.d : (o.steps != null ? o.steps : null)));
    if (cat === 'dice') { fire('dice'); haptic('dice'); }
    else if (cat === 'move') { steps(v == null ? 2 : v); haptic('move'); }
    else if (cat === 'capture') { fire('capture'); haptic('capture'); }
    else if (cat === 'home') { fire('home'); haptic('win'); }
    else if (cat === 'turn') { fire('turn'); }
    else if (cat === 'over') {
      var mine = winnerIsMe(o);
      fire(mine ? 'win' : 'lose');
      haptic(mine ? 'win' : 'move');
    }
  }

  function visit(o, depth) {
    if (!o || typeof o !== 'object' || depth > 5) return;
    if (Object.prototype.toString.call(o) === '[object Array]') {
      for (var i = 0; i < o.length; i++) visit(o[i], depth + 1);
      return;
    }
    var cat = classify(o.type || o.t || o.kind || o.event || o.ev);
    if (cat) {
      var s = seqOf(o), key = s ? (cat + ':' + s) : null;
      if (!key || !seen[key]) {
        if (key) {
          if (seenN > 500) { seen = {}; seenN = 0; }
          seen[key] = 1; seenN++;
        }
        trigger(cat, o);
      }
    }
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var val = o[k];
      if (val && typeof val === 'object') visit(val, depth + 1);
    }
  }

  /* ---------------------- شنود WebSocket ---------------------- */
  (function () {
    var Native = window.WebSocket;
    if (!Native) return;
    function Patched(url, protocols) {
      var ws = (protocols === undefined) ? new Native(url) : new Native(url, protocols);
      try {
        ws.addEventListener('message', function (ev) {
          if (typeof ev.data !== 'string') return;
          var c = ev.data.charAt(0);
          if (c !== '{' && c !== '[') return;
          try { visit(JSON.parse(ev.data), 0); } catch (e) {}
        });
      } catch (e) {}
      return ws;
    }
    Patched.prototype = Native.prototype;
    Patched.CONNECTING = 0; Patched.OPEN = 1; Patched.CLOSING = 2; Patched.CLOSED = 3;
    window.WebSocket = Patched;
  })();

  /* ---------------------- واکنش فوری به لمس دکمه تاس ---------------------- */
  document.addEventListener('pointerdown', function (e) {
    ensure();
    var el = e.target;
    for (var i = 0; el && i < 5; i++) {
      var sig = String(el.id || '') + ' ' + String(el.className || '') + ' ' + String(el.getAttribute ? (el.getAttribute('data-act') || '') : '') + ' ' + String(el.textContent || '').slice(0, 24);
      if (/dice|roll|بریز|تاس/i.test(sig)) { fire('dice'); haptic('dice'); return; }
      el = el.parentElement;
    }
  }, true);

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { ensure(); }, { passive: true });
  });

  /* ---------------------- دکمه قطع/وصل صدا ---------------------- */
  function mountBtn() {
    if (document.getElementById('sfxBtn')) return;
    var b = document.createElement('button');
    b.id = 'sfxBtn';
    b.type = 'button';
    b.setAttribute('aria-label', 'صدا');
    b.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top));inset-inline-start:8px;z-index:99999;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(20,14,52,.55);backdrop-filter:blur(6px);color:#fff;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;';
    b.textContent = muted ? '🔇' : '🔊';
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      muted = !muted;
      try { localStorage.setItem('ludo_sfx_muted', muted ? '1' : '0'); } catch (er) {}
      b.textContent = muted ? '🔇' : '🔊';
      if (!muted) fire('turn');
    });
    document.body.appendChild(b);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBtn);
  else mountBtn();

  /* ---------------------- API عمومی ---------------------- */
  window.LudoSFX = {
    play: fire,
    steps: steps,
    dice: function () { fire('dice'); },
    capture: function () { fire('capture'); },
    home: function () { fire('home'); },
    win: function () { fire('win'); },
    lose: function () { fire('lose'); },
    turn: function () { fire('turn'); },
    setMuted: function (v) { muted = !!v; try { localStorage.setItem('ludo_sfx_muted', muted ? '1' : '0'); } catch (e) {} },
    isMuted: function () { return muted; },
    volume: function (v) { CFG.volume = v; if (master) master.gain.value = v; }
  };
})();
