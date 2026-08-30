/* لودو استار — Audio Manager (Web Audio، سنتز زنده، بدون فایل صوتی، تأخیر صفر) */
(function (global) {
  'use strict';

  var Ctor = global.AudioContext || global.webkitAudioContext;

  var CTX = null;
  var master = null, sfxBus = null, musicBus = null;
  var noiseBuf = null;
  var unlocked = false;
  var enabled = true;
  var lastPlay = {};

  var KEY = 'ludo_sound_v1';

  try {
    var saved = global.localStorage && localStorage.getItem(KEY);
    if (saved === '0') enabled = false;
  } catch (e) { /* بی‌اهمیت */ }

  /* ------------------------------------------------------------------ */
  /* راه‌اندازی و Preload                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    if (CTX || !Ctor) return CTX;
    try { CTX = new Ctor(); } catch (e) { CTX = null; return null; }

    master = CTX.createGain();
    master.gain.value = enabled ? 0.95 : 0;
    master.connect(CTX.destination);

    sfxBus = CTX.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);

    musicBus = CTX.createGain();   // برای آینده: موسیقی پس‌زمینه
    musicBus.gain.value = 0.45;
    musicBus.connect(master);

    buildNoise();
    return CTX;
  }

  /** بافر نویز یک‌بار ساخته و کش می‌شود = Preload واقعی */
  function buildNoise() {
    if (noiseBuf || !CTX) return;
    var len = Math.floor(CTX.sampleRate * 1.0);
    noiseBuf = CTX.createBuffer(1, len, CTX.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  /** موبایل تا اولین لمس اجازهٔ صدا نمی‌دهد؛ اینجا آزاد می‌شود */
  function unlock() {
    init();
    if (!CTX) return;
    if (CTX.state === 'suspended' && CTX.resume) CTX.resume();
    if (unlocked) return;
    unlocked = true;
    try {
      var s = CTX.createBufferSource();
      s.buffer = CTX.createBuffer(1, 1, CTX.sampleRate);
      s.connect(CTX.destination);
      s.start(0);
    } catch (e) { /* بی‌اهمیت */ }
  }

  function t0() { return CTX ? CTX.currentTime : 0; }
  function live() { return !!(CTX && enabled); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ------------------------------------------------------------------ */
  /* بلوک‌های سازندهٔ صدا                                                */
  /* ------------------------------------------------------------------ */

  /** یک نُت با پوشش ADSR و امکان سُر خوردن فرکانس */
  function tone(at, o) {
    if (!live()) return;
    o = o || {};
    var f = o.f || 440;
    var dur = o.dur || 0.16;
    var vol = (o.vol == null ? 0.22 : o.vol);
    var atk = o.atk == null ? 0.006 : o.atk;

    var osc = CTX.createOscillator();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(f, at);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), at + dur);

    var g = CTX.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + atk);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);

    var node = osc;
    if (o.lp) {
      var lp = CTX.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lp;
      node.connect(lp); node = lp;
    }
    node.connect(g);
    g.connect(o.bus === 'music' ? musicBus : sfxBus);

    osc.start(at);
    osc.stop(at + dur + 0.04);
  }

  /** برخورد چوبی/پلاستیکی: نویز باندپَس + بدنهٔ کوتاه */
  function clack(at, o) {
    if (!live()) return;
    o = o || {};
    var f = o.f || 1500;
    var dur = o.dur || 0.075;
    var vol = o.vol == null ? 0.3 : o.vol;

    var src = CTX.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = rnd(0.85, 1.25);

    var bp = CTX.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = o.q || 2.4;

    var hp = CTX.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 320;

    var g = CTX.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0006, at + dur);

    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(sfxBus);
    src.start(at);
    src.stop(at + dur + 0.03);

    tone(at, { f: f * 0.32, f2: f * 0.2, type: 'square', vol: vol * 0.35, dur: dur * 0.8, lp: 900 });
  }

  /** غرش کم‌فرکانس زیر پرتاب تاس */
  function rumble(at, dur, vol) {
    if (!live()) return;
    var src = CTX.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;

    var lp = CTX.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, at);
    lp.frequency.exponentialRampToValueAtTime(180, at + dur);

    var g = CTX.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0006, at + dur);

    src.connect(lp); lp.connect(g); g.connect(sfxBus);
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  /* ------------------------------------------------------------------ */
  /* کتابخانهٔ صداها                                                     */
  /* ------------------------------------------------------------------ */

  var SFX = {

    /* پرتاب تاس: کلاتر چندضربه‌ای با تراکم نزولی */
    dice_roll: function (at) {
      rumble(at, 0.34, 0.1);
      var n = 7, t = at + 0.01;
      for (var i = 0; i < n; i++) {
        var k = i / n;
        clack(t, { f: rnd(1200, 2400), dur: rnd(0.035, 0.06), vol: 0.3 - k * 0.14, q: 2.8 });
        t += rnd(0.028, 0.055) + k * 0.02;
      }
    },

    /* برخورد تاس با تخته */
    dice_bounce: function (at, o) {
      var s = o && o.strength != null ? o.strength : 1;
      clack(at, { f: rnd(900, 1600), dur: 0.09 * s + 0.03, vol: 0.16 + 0.24 * s, q: 1.9 });
      tone(at + 0.005, { f: 160 * s + 90, f2: 70, type: 'sine', vol: 0.16 * s, dur: 0.1, lp: 400 });
    },

    /* فرود نهایی و نمایش عدد */
    dice_settle: function (at) {
      clack(at, { f: 780, dur: 0.07, vol: 0.2, q: 1.4 });
      tone(at + 0.02, { f: 880, f2: 1320, type: 'triangle', vol: 0.12, dur: 0.14 });
    },

    /* هر خانه از حرکت مهره؛ پیچ صدا پله‌پله بالا می‌رود */
    token_move: function (at, o) {
      var step = (o && o.step) || 0;
      var total = (o && o.total) || 6;
      var f = 480 + Math.min(step, total) * 46;
      tone(at, { f: f, f2: f * 1.5, type: 'sine', vol: 0.17, dur: 0.075, atk: 0.003 });
      clack(at, { f: 2600, dur: 0.022, vol: 0.07, q: 4 });
    },

    /* زدن مهرهٔ حریف */
    token_capture: function (at) {
      tone(at, { f: 220, f2: 55, type: 'square', vol: 0.34, dur: 0.24, lp: 700 });
      clack(at, { f: 2200, dur: 0.11, vol: 0.34, q: 1.2 });
      tone(at + 0.02, { f: 1000, f2: 180, type: 'sawtooth', vol: 0.14, dur: 0.28, lp: 2200 });
      tone(at + 0.16, { f: 300, f2: 120, type: 'triangle', vol: 0.12, dur: 0.18 });
    },

    /* رسیدن مهره به خانهٔ نهایی */
    token_finish: function (at) {
      var notes = [784, 988, 1175, 1568];
      for (var i = 0; i < notes.length; i++) {
        tone(at + i * 0.055, { f: notes[i], type: 'triangle', vol: 0.2, dur: 0.2 });
        tone(at + i * 0.055, { f: notes[i] * 2, type: 'sine', vol: 0.07, dur: 0.14 });
      }
    },

    turn_change: function (at) {
      tone(at, { f: 620, type: 'sine', vol: 0.14, dur: 0.1 });
      tone(at + 0.075, { f: 880, type: 'sine', vol: 0.14, dur: 0.14 });
    },

    button_click: function (at) {
      clack(at, { f: 2000, dur: 0.028, vol: 0.13, q: 3.5 });
      tone(at, { f: 540, f2: 700, type: 'sine', vol: 0.09, dur: 0.05 });
    },

    player_join: function (at) {
      tone(at, { f: 523, type: 'triangle', vol: 0.17, dur: 0.12 });
      tone(at + 0.09, { f: 784, type: 'triangle', vol: 0.17, dur: 0.16 });
    },

    player_leave: function (at) {
      tone(at, { f: 660, type: 'triangle', vol: 0.15, dur: 0.13 });
      tone(at + 0.09, { f: 415, type: 'triangle', vol: 0.15, dur: 0.2 });
    },

    /* شمارش معکوس تایمر نوبت */
    countdown: function (at, o) {
      var urgent = o && o.urgent;
      tone(at, {
        f: urgent ? 1180 : 820, type: 'square',
        vol: urgent ? 0.2 : 0.12, dur: urgent ? 0.1 : 0.07, lp: 3000
      });
    },

    /* برد: فانفار چندمرحله‌ای */
    victory: function (at) {
      var seq = [
        [523, 0.00, 0.16], [659, 0.09, 0.16], [784, 0.18, 0.16],
        [1046, 0.30, 0.34], [1318, 0.40, 0.40], [1568, 0.50, 0.55]
      ];
      for (var i = 0; i < seq.length; i++) {
        tone(at + seq[i][1], { f: seq[i][0], type: 'triangle', vol: 0.24, dur: seq[i][2] });
        tone(at + seq[i][1], { f: seq[i][0] * 0.5, type: 'sine', vol: 0.1, dur: seq[i][2] });
      }
      for (var j = 0; j < 8; j++) {
        tone(at + 0.55 + j * 0.045, { f: 1568 + j * 190, type: 'sine', vol: 0.07, dur: 0.16 });
      }
      rumble(at + 0.28, 0.5, 0.08);
    },

    defeat: function (at) {
      var d = [[440, 0], [392, 0.14], [330, 0.28], [262, 0.42]];
      for (var i = 0; i < d.length; i++) {
        tone(at + d[i][1], { f: d[i][0], type: 'triangle', vol: 0.2, dur: 0.3, lp: 2200 });
      }
    },

    notification: function (at) {
      tone(at, { f: 987, type: 'sine', vol: 0.16, dur: 0.1 });
      tone(at + 0.11, { f: 1318, type: 'sine', vol: 0.14, dur: 0.16 });
    }
  };

  SFX.dice_stop = SFX.dice_settle;
  SFX.token_home = SFX.token_finish;

  /* ------------------------------------------------------------------ */
  /* API عمومی                                                           */
  /* ------------------------------------------------------------------ */

  function play(name, o) {
    if (!enabled) return;
    init();
    if (!CTX) return;
    if (CTX.state === 'suspended' && CTX.resume) CTX.resume();

    var fn = SFX[name];
    if (!fn) return;

    o = o || {};
    var thr = o.throttle == null ? 0 : o.throttle;
    var stamp = Date.now();
    if (thr && lastPlay[name] && stamp - lastPlay[name] < thr) return;
    lastPlay[name] = stamp;

    try { fn(t0() + (o.delay || 0), o); } catch (e) { /* صدا حیاتی نیست */ }
  }

  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) { /* بی‌اهمیت */ }
    if (master) {
      var at = t0();
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(enabled ? 0.95 : 0, at, 0.03);
    }
    if (enabled) unlock();
  }

  /* آزادسازی صدا با اولین تعامل کاربر */
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, unlock, { passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && CTX && CTX.state === 'suspended' && CTX.resume) CTX.resume();
  });

  /* هم‌گام‌سازی با کلید صدا در تنظیمات فعلی اپ */
  function bindSettings() {
    var val = document.getElementById('setSoundVal');
    if (!val) return;
    var read = function () {
      var txt = (val.textContent || '').trim();
      if (txt === 'روشن' || txt === 'ON') setEnabled(true);
      else if (txt === 'خاموش' || txt === 'OFF') setEnabled(false);
    };
    read();
    try { new MutationObserver(read).observe(val, { childList: true, characterData: true, subtree: true }); }
    catch (e) { /* بی‌اهمیت */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSettings);
  } else {
    bindSettings();
  }

  global.LudoAudio = {
    init: init,
    unlock: unlock,
    play: play,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    toggle: function () { setEnabled(!enabled); return enabled; },
    musicBus: function () { init(); return musicBus; },
    context: function () { init(); return CTX; },
    NAMES: Object.keys(SFX)
  };
})(window);
