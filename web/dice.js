/* لودو استار — تاس سه‌بعدی + جایگاه تاس هر بازیکن + حرکت آرام مهره (نسخهٔ ۴ / مرحلهٔ ۵)
   بدون تغییر در index.html و app.js
   بخش ۱: تاس   بخش ۲: جلوه‌های گیم‌پلی   بخش ۳: جایگاه تاس بازیکنان */

/* ================== بخش ۱ — تاس ================== */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }
  function A(n, o) { if (global.LudoAudio) { try { global.LudoAudio.play(n, o); } catch (e) { } } }

  var tg = global.Telegram && global.Telegram.WebApp ? global.Telegram.WebApp : null;
  function haptic(kind) {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (kind === 'success') tg.HapticFeedback.notificationOccurred('success');
      else if (kind === 'select') tg.HapticFeedback.selectionChanged();
      else tg.HapticFeedback.impactOccurred(kind || 'light');
    } catch (e) { }
  }
  global.LudoHaptic = haptic;

  var H = 30;

  var CSS = [
    '#dice{position:relative!important;width:74px!important;height:74px!important;',
    'perspective:560px!important;transform-style:preserve-3d!important;overflow:visible!important;background:none!important}',
    '#dice .dice-raw{display:none!important}',
    '#dice .dice-shadow{position:absolute!important;left:50%!important;bottom:-4px!important;',
    'width:58px!important;height:15px!important;border-radius:50%!important;',
    'background:radial-gradient(ellipse at center,rgba(8,2,22,.55),rgba(8,2,22,0) 72%)!important;',
    'transform:translateX(-50%)!important;filter:blur(1px);will-change:transform,opacity}',
    '#diceCube{position:absolute!important;left:0!important;top:0!important;width:74px!important;height:74px!important;',
    'transform-style:preserve-3d!important;will-change:transform}',
    '#diceCube .face{position:absolute!important;left:7px!important;top:7px!important;',
    'width:' + (H * 2) + 'px!important;height:' + (H * 2) + 'px!important;border-radius:13px!important;',
    'box-sizing:border-box!important;padding:7px!important;',
    'display:grid!important;grid-template-columns:repeat(3,1fr)!important;grid-template-rows:repeat(3,1fr)!important;',
    'background:linear-gradient(150deg,#fffdf6 0%,#f1e8ff 52%,#cbb9ec 100%)!important;',
    'box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.92),inset 0 -7px 12px rgba(86,52,140,.28),',
    '0 2px 6px rgba(12,3,30,.35)!important;backface-visibility:visible!important}',
    '#diceCube .face i{width:11px;height:11px;border-radius:50%;align-self:center;justify-self:center;',
    'background:radial-gradient(circle at 32% 28%,#7b4bb5,#280b47);',
    'box-shadow:inset 0 1px 1.5px rgba(255,255,255,.55),0 1px 1px rgba(0,0,0,.3)}',
    '#diceCube .fa{transform:translateZ(' + H + 'px)!important}',
    '#diceCube .fb{transform:rotateY(90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fc{transform:rotateX(90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fd{transform:rotateX(-90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fe{transform:rotateY(-90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .ff{transform:rotateY(180deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fa i:nth-child(1){grid-area:2/2}',
    '#diceCube .fb i:nth-child(1){grid-area:1/1}#diceCube .fb i:nth-child(2){grid-area:3/3}',
    '#diceCube .fc i:nth-child(1){grid-area:1/1}#diceCube .fc i:nth-child(2){grid-area:2/2}',
    '#diceCube .fc i:nth-child(3){grid-area:3/3}',
    '#diceCube .fd i:nth-child(1){grid-area:1/1}#diceCube .fd i:nth-child(2){grid-area:1/3}',
    '#diceCube .fd i:nth-child(3){grid-area:3/1}#diceCube .fd i:nth-child(4){grid-area:3/3}',
    '#diceCube .fe i:nth-child(1){grid-area:1/1}#diceCube .fe i:nth-child(2){grid-area:1/3}',
    '#diceCube .fe i:nth-child(3){grid-area:2/2}#diceCube .fe i:nth-child(4){grid-area:3/1}',
    '#diceCube .fe i:nth-child(5){grid-area:3/3}',
    '#diceCube .ff i:nth-child(1){grid-area:1/1}#diceCube .ff i:nth-child(2){grid-area:1/3}',
    '#diceCube .ff i:nth-child(3){grid-area:2/1}#diceCube .ff i:nth-child(4){grid-area:2/3}',
    '#diceCube .ff i:nth-child(5){grid-area:3/1}#diceCube .ff i:nth-child(6){grid-area:3/3}',
    '#dice.lb-ready::after{content:"";position:absolute;inset:-12px;border-radius:26px;pointer-events:none;',
    'background:radial-gradient(circle,rgba(255,214,107,.42),rgba(255,214,107,0) 68%);animation:lbPulse 1.25s ease-in-out infinite}',
    '@keyframes lbPulse{0%,100%{opacity:.35;transform:scale(.94)}50%{opacity:.9;transform:scale(1.06)}}',
    '#dice.lb-land .face{box-shadow:inset 0 0 0 1.5px #fff,0 0 16px 4px rgba(255,214,107,.85)!important}',
    '.btn,.icon-btn,.row-btn,.ls-mode,.ls-sub,.ls-nav-btn{transition:transform .09s ease}',
    '.btn:active,.icon-btn:active,.row-btn:active,.ls-mode:active,.ls-sub:active,.ls-nav-btn:active{transform:scale(.94)}'
  ].join('');

  function injectCss() {
    if ($('lb-dice-style')) return;
    var st = D.createElement('style');
    st.id = 'lb-dice-style';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  var FACE = {
    1: { rx: 0, ry: 0 }, 2: { rx: 0, ry: -90 }, 3: { rx: -90, ry: 0 },
    4: { rx: 90, ry: 0 }, 5: { rx: 0, ry: 90 }, 6: { rx: 0, ry: 180 }
  };

  var SEGS = [[70, 380], [33, 280], [14, 210], [6, 150], [0, 260]];
  var TOTAL = 1280, LOCK = 880;

  var busy = false, pending = null, raf = 0, lastValue = 1;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function readValue() {
    var el = $('diceValue');
    if (!el) return 0;
    var v = parseInt(String(el.textContent || '').replace(/[^\d]/g, ''), 10);
    return (v >= 1 && v <= 6) ? v : 0;
  }

  function setCube(x, h, rx, ry, rz, sq) {
    var cube = $('diceCube');
    if (!cube) return;
    cube.style.transform =
      'translate3d(' + x.toFixed(1) + 'px,' + (-h).toFixed(1) + 'px,0) ' +
      'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg) rotateZ(' + rz.toFixed(1) + 'deg) ' +
      'scale3d(' + (1 / sq).toFixed(3) + ',' + sq.toFixed(3) + ',1)';
    var sh = D.querySelector('#dice .dice-shadow');
    if (sh) {
      var k = Math.max(0.35, 1 - h / 110);
      sh.style.transform = 'translateX(-50%) translateX(' + (x * 0.55).toFixed(1) + 'px) scale(' + k.toFixed(2) + ')';
      sh.style.opacity = String(Math.max(0.2, k));
    }
  }

  function roll(value) {
    injectCss();
    var dice = $('dice');
    if (!dice) return;
    if (busy) { pending = value || 0; return; }
    busy = true;

    var startX = -30 - Math.random() * 14;
    var freeX = 360 * 3 + 180, freeY = 360 * 2 + 90, freeZ = 360 * 2;
    var locked = null, segIdx = -1, t0 = 0;

    A('dice_roll');
    haptic('medium');
    dice.classList.remove('lb-land');

    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0;
      if (el > TOTAL) el = TOTAL;

      var acc = 0, i, h = 0, sq = 1, idx = 0;
      for (i = 0; i < SEGS.length; i++) {
        if (el <= acc + SEGS[i][1] || i === SEGS.length - 1) {
          idx = i;
          var u = SEGS[i][1] ? (el - acc) / SEGS[i][1] : 1;
          if (u < 0) u = 0; if (u > 1) u = 1;
          h = 4 * SEGS[i][0] * u * (1 - u);
          if (SEGS[i][0] > 4 && u > 0.86) sq = 1 - 0.16 * ((u - 0.86) / 0.14);
          break;
        }
        acc += SEGS[i][1];
      }
      if (idx > segIdx) {
        if (segIdx >= 0 && SEGS[segIdx][0] > 0) {
          A('dice_bounce', { strength: Math.min(1, SEGS[segIdx][0] / 70) });
          haptic('light');
        }
        segIdx = idx;
      }

      var p = el / TOTAL;
      var x = startX * (1 - easeOut(p));
      var e = easeOut(Math.min(1, el / (TOTAL * 0.92)));
      var rx = freeX * e, ry = freeY * e, rz = freeZ * e;

      if (el >= LOCK) {
        if (!locked) {
          var v = value || readValue() || lastValue;
          if (!(v >= 1 && v <= 6)) v = 1;
          lastValue = v;
          var f = FACE[v];
          var eL = easeOut(Math.min(1, LOCK / (TOTAL * 0.92)));
          locked = {
            fromX: freeX * eL, fromY: freeY * eL, fromZ: freeZ * eL,
            toX: Math.ceil((freeX * eL - f.rx) / 360) * 360 + f.rx,
            toY: Math.ceil((freeY * eL - f.ry) / 360) * 360 + f.ry,
            toZ: Math.ceil((freeZ * eL) / 360) * 360
          };
        }
        var q = easeOut((el - LOCK) / (TOTAL - LOCK));
        rx = locked.fromX + (locked.toX - locked.fromX) * q;
        ry = locked.fromY + (locked.toY - locked.fromY) * q;
        rz = locked.fromZ + (locked.toZ - locked.fromZ) * q;
      }

      setCube(x, h, rx, ry, rz, sq);

      if (el < TOTAL) { raf = requestAnimationFrame(frame); return; }

      A('dice_settle');
      haptic('success');
      dice.classList.add('lb-land');
      setTimeout(function () { dice.classList.remove('lb-land'); }, 480);

      busy = false;
      if (pending !== null) { var nx = pending; pending = null; setTimeout(function () { roll(nx); }, 240); }
    }

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function watchDice() {
    var dice = $('dice');
    if (!dice || !global.MutationObserver) return;
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].attributeName === 'class' && dice.classList.contains('rolling')) {
          dice.classList.remove('rolling');
          roll(0);
          return;
        }
      }
    }).observe(dice, { attributes: true, attributeFilter: ['class'] });
  }

  function watchRollButton() {
    var btn = $('btnRoll');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (global.LudoAudio) { try { global.LudoAudio.unlock(); } catch (e) { } }
      A('button_click');
      haptic('select');
    });
    if (global.MutationObserver) {
      var sync = function () {
        var dice = $('dice');
        var ready = !btn.disabled;
        if (dice) dice.classList.toggle('lb-ready', ready);
        var fr = D.querySelector('.board-frame');
        if (fr) fr.classList.toggle('lb-myturn', ready);
      };
      new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ['class', 'disabled'] });
      sync();
    }
  }

  function bridgeSounds() {
    if (!global.MutationObserver) return;

    var tn = $('turnName');
    if (tn) {
      new MutationObserver(function () { A('turn_change', { throttle: 500 }); })
        .observe(tn, { childList: true, characterData: true, subtree: true });
    }

    var over = $('overScreen');
    if (over) {
      new MutationObserver(function () {
        if (over.classList.contains('hidden')) return;
        var t = ($('overTitle') && $('overTitle').textContent) || '';
        if (t.indexOf('بردی') !== -1) { A('victory'); haptic('success'); }
        else A('defeat');
      }).observe(over, { attributes: true, attributeFilter: ['class'] });
    }

    setInterval(function () {
      var g = $('gameScreen'), f = $('timerFill');
      if (!g || !f || g.classList.contains('hidden')) return;
      if (f.classList.contains('critical')) A('countdown', { urgent: true, throttle: 900 });
      else if (f.classList.contains('low')) A('countdown', { throttle: 1900 });
    }, 500);

    D.addEventListener('click', function (ev) {
      var t = ev.target;
      while (t && t !== D.body) {
        if (t.tagName === 'BUTTON') {
          if (t.id !== 'btnRoll') A('button_click', { throttle: 60 });
          return;
        }
        t = t.parentNode;
      }
    }, true);
  }

  function bridgeSetting() {
    function apply() {
      var v = $('setSoundVal');
      if (!v || !global.LudoAudio) return;
      global.LudoAudio.setEnabled((v.textContent || '').indexOf('خاموش') === -1);
    }
    var btn = $('setSound');
    if (btn) btn.addEventListener('click', function () { setTimeout(apply, 120); });
    setTimeout(apply, 1500);
  }

  function unlockOnce() {
    var fn = function () {
      if (global.LudoAudio) { try { global.LudoAudio.unlock(); } catch (e) { } }
      D.removeEventListener('touchstart', fn, true);
      D.removeEventListener('click', fn, true);
    };
    D.addEventListener('touchstart', fn, true);
    D.addEventListener('click', fn, true);
  }

  function start() {
    injectCss();
    setCube(0, 0, -18, 24, 0, 1);
    watchDice();
    watchRollButton();
    bridgeSounds();
    bridgeSetting();
    unlockOnce();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();

  global.LudoDice = { roll: roll, throwTo: roll, isBusy: function () { return busy; } };
})(window);


/* ================== بخش ۲ — جلوه‌ها و حرکت آرام مهره ================== */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }
  function A(n, o) { if (global.LudoAudio) { try { global.LudoAudio.play(n, o); } catch (e) { } } }
  function haptic(k) { if (global.LudoHaptic) global.LudoHaptic(k); }

  var B = null, LOOKUP = {};

  /* سرعت‌ها — برای کندتر/تندتر کردن همین سه عدد را تغییر بده */
  var STEP_MS = 200;        // مدت هر خانه
  var STEP_GAP = 30;        // توقف کوتاه بین خانه‌ها
  var CAPTURE_MS = 760;     // پرتاب مهرهٔ زده‌شده
  var EXIT_MS = 430;        // خروج از خانه

  var CSS = [
    '.tokens-layer .token{will-change:left,top,transform}',
    '.token.lb-squash{transform:scale(1.14,.86)!important;transition:transform .11s ease-out!important}',
    '.token.lb-fly{z-index:14!important;transition:none!important;filter:drop-shadow(0 7px 9px rgba(6,1,18,.6))}',
    '.token.lb-walk{z-index:9!important;transition:none!important}',
    '.token.lb-fin{animation:lbFin 1.05s cubic-bezier(.2,.9,.3,1.2)}',
    '@keyframes lbFin{0%{transform:none}35%{transform:scale(1.3);filter:drop-shadow(0 0 17px rgba(255,222,120,.95)) brightness(1.55)}',
    '100%{transform:none;filter:none}}',
    '.lb-ring{position:absolute;width:24%;height:24%;margin:-12% 0 0 -12%;border-radius:50%;',
    'border:3px solid rgba(255,255,255,.92);pointer-events:none;animation:lbRing .6s ease-out forwards}',
    '@keyframes lbRing{0%{transform:scale(.18);opacity:1}100%{transform:scale(1.8);opacity:0}}',
    '.lb-glow{position:absolute;width:34%;height:34%;margin:-17% 0 0 -17%;border-radius:50%;pointer-events:none;',
    'background:radial-gradient(circle,rgba(255,226,132,.85),rgba(255,196,60,0) 70%);animation:lbGlow 1s ease-out forwards}',
    '@keyframes lbGlow{0%{transform:scale(.3);opacity:0}30%{transform:scale(1);opacity:1}100%{transform:scale(1.5);opacity:0}}',
    '.lb-spark{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;',
    'pointer-events:none;will-change:transform,opacity}',
    '.lb-shake{animation:lbShake .38s ease-in-out}',
    '@keyframes lbShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-6px,3px)}',
    '45%{transform:translate(5px,-4px)}70%{transform:translate(-4px,-2px)}}',
    '#lbConfetti{position:fixed;left:0;top:0;width:100%;height:100%;z-index:120;pointer-events:none}',
    '.board-frame.lb-myturn{box-shadow:0 0 0 2px rgba(255,214,107,.75),0 0 28px 7px rgba(255,214,107,.32)!important}'
  ].join('');

  function injectCss() {
    if ($('lb-fx-style')) return;
    var st = D.createElement('style');
    st.id = 'lb-fx-style';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  function buildLookup() {
    B.COLORS.forEach(function (c) {
      var arr = [];
      for (var p = -1; p <= B.POS_FINISH; p++) {
        var lim = (p === B.POS_BASE) ? 4 : 1;
        for (var i = 0; i < lim; i++) {
          var cell = B.cellOf(c, p, i);
          if (cell) arr.push({ p: p, i: i, x: cell.x, y: cell.y });
        }
      }
      LOOKUP[c] = arr;
    });
  }

  function nearest(color, cell) {
    var arr = LOOKUP[color];
    if (!arr || !cell) return null;
    var best = null, bd = 1e9;
    for (var k = 0; k < arr.length; k++) {
      var dx = arr[k].x - cell.x, dy = arr[k].y - cell.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = arr[k]; }
    }
    return (bd <= 1.2) ? best : null;
  }

  function cellFromStyle(el) {
    var l = parseFloat(el.style.left), t = parseFloat(el.style.top);
    if (isNaN(l) || isNaN(t)) return null;
    var u = 100 / B.GRID;
    return { x: l / u - 0.5, y: t / u - 0.5 };
  }

  function put(el, cell) {
    var pos = B.toPercent(cell);
    el.style.left = pos.left + '%';
    el.style.top = pos.top + '%';
  }

  function colorOf(el) {
    var cn = ' ' + el.className + ' ';
    for (var i = 0; i < B.COLORS.length; i++) if (cn.indexOf(' ' + B.COLORS[i] + ' ') !== -1) return B.COLORS[i];
    return null;
  }

  function release(el, oldTr) {
    el.style.transform = '';
    el.classList.remove('lb-walk', 'lb-fly');
    el.classList.add('lb-squash');
    setTimeout(function () {
      el.classList.remove('lb-squash');
      el.style.transition = oldTr;
      el.__lbBusy = false;
      el.__lbCell = cellFromStyle(el);
    }, 120);
  }

  /* ---------- راه‌رفتن خانه‌به‌خانه، آرام و نرم ---------- */
  function walk(el, color, fromP, toP, slot) {
    var n = toP - fromP;
    if (n <= 0) return;

    var cells = [], j;
    for (j = 0; j <= n; j++) {
      var c = B.cellOf(color, fromP + j, slot);
      cells.push(c || cells[cells.length - 1]);
    }

    el.__lbBusy = true;
    var oldTr = el.style.transition;
    el.style.transition = 'none';
    el.classList.add('lb-walk');

    j = 0;
    function seg() {
      j++;
      if (j > n) {
        release(el, oldTr);
        haptic('light');
        if (toP >= B.HOME_ENTRY + 5 || toP >= B.POS_FINISH) {
          el.classList.add('lb-fin');
          setTimeout(function () { el.classList.remove('lb-fin'); }, 1050);
        }
        return;
      }

      var a = cells[j - 1], b = cells[j], t0 = 0;
      A('token_move', { step: j, total: n });

      function fr(now) {
        if (!t0) t0 = now;
        var t = Math.min(1, (now - t0) / STEP_MS);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var lift = 0.32 * Math.sin(Math.PI * t);
        put(el, { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - lift });
        el.style.transform = 'scale(' + (1 + 0.12 * Math.sin(Math.PI * t)).toFixed(3) + ')';
        if (t < 1) { requestAnimationFrame(fr); return; }
        el.style.transform = '';
        setTimeout(seg, STEP_GAP);
      }
      requestAnimationFrame(fr);
    }
    seg();
  }

  /* ---------- پرتاب قوسی ---------- */
  function arc(el, fromCell, toCell, dur, spin) {
    el.__lbBusy = true;
    var oldTr = el.style.transition;
    el.style.transition = 'none';
    el.classList.add('lb-fly');
    var t0 = 0, lift = spin ? 2.4 : 1.2;

    function frame(now) {
      if (!t0) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      var e = spin ? t : (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      put(el, {
        x: fromCell.x + (toCell.x - fromCell.x) * e,
        y: fromCell.y + (toCell.y - fromCell.y) * e - 4 * lift * t * (1 - t)
      });
      if (spin) el.style.transform = 'rotate(' + (t * 720).toFixed(0) + 'deg) scale(' + (1 + 0.28 * Math.sin(Math.PI * t)).toFixed(2) + ')';
      if (t < 1) { requestAnimationFrame(frame); return; }
      haptic(spin ? 'heavy' : 'light');
      release(el, oldTr);
    }
    requestAnimationFrame(frame);
  }

  function watchTokens() {
    var layer = $('tokensLayer');
    if (!layer || !global.MutationObserver) return;

    new MutationObserver(function (recs) {
      for (var r = 0; r < recs.length; r++) {
        var el = recs[r].target;
        if (!el || el.nodeType !== 1) continue;
        if (String(el.className).indexOf('token') === -1) continue;
        if (el.__lbBusy) continue;

        var now = cellFromStyle(el);
        if (!now) continue;
        var was = el.__lbCell;
        el.__lbCell = now;
        if (!was) continue;

        var dx = now.x - was.x, dy = now.y - was.y;
        if (dx * dx + dy * dy < 0.5) continue;

        var color = colorOf(el);
        if (!color) continue;
        var a = nearest(color, was), b = nearest(color, now);
        if (!a || !b) continue;

        if (b.p === B.POS_BASE && a.p !== B.POS_BASE) {
          arc(el, was, now, CAPTURE_MS, true);
        } else if (a.p === B.POS_BASE && b.p >= 0) {
          arc(el, was, now, EXIT_MS, false);
        } else if (b.p > a.p && b.p - a.p <= 6) {
          put(el, was);
          walk(el, color, a.p, b.p, b.i);
        } else {
          arc(el, was, now, 480, false);
        }
      }
    }).observe(layer, { attributes: true, attributeFilter: ['style'], subtree: true });
  }

  function sparks(left, top, colors, count, spread) {
    var layer = $('fxLayer');
    if (!layer) return;
    for (var i = 0; i < count; i++) {
      var s = D.createElement('div');
      s.className = 'lb-spark';
      s.style.left = left + '%';
      s.style.top = top + '%';
      s.style.background = colors[i % colors.length];
      layer.appendChild(s);
      (function (node, idx) {
        var a = (Math.PI * 2 * idx) / count + Math.random() * 0.5;
        var dist = spread * (0.6 + Math.random() * 0.7);
        requestAnimationFrame(function () {
          node.style.transition = 'transform .68s cubic-bezier(.2,.7,.3,1), opacity .68s ease-out';
          node.style.transform = 'translate(' + (Math.cos(a) * dist).toFixed(0) + 'px,' +
            (Math.sin(a) * dist + 14).toFixed(0) + 'px) scale(.25)';
          node.style.opacity = '0';
        });
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 760);
      })(s, i);
    }
  }

  function overlay(cls, left, top) {
    var layer = $('fxLayer');
    if (!layer) return;
    var el = D.createElement('div');
    el.className = cls;
    el.style.left = left + '%';
    el.style.top = top + '%';
    layer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1050);
  }

  function watchFx() {
    var layer = $('fxLayer');
    if (!layer || !global.MutationObserver) return;
    new MutationObserver(function (recs) {
      for (var r = 0; r < recs.length; r++) {
        var add = recs[r].addedNodes;
        for (var j = 0; j < add.length; j++) {
          var n = add[j];
          if (!n || n.nodeType !== 1 || n.className !== 'fx') continue;
          var txt = n.textContent || '';
          var l = parseFloat(n.style.left) || 50, t = parseFloat(n.style.top) || 50;
          if (txt.indexOf('💥') !== -1) {
            A('token_capture'); haptic('heavy');
            overlay('lb-ring', l, t);
            sparks(l, t, ['#fff3c4', '#ff9a3c', '#ff4d63'], 12, 46);
            var fr = D.querySelector('.board-frame');
            if (fr) { fr.classList.remove('lb-shake'); void fr.offsetWidth; fr.classList.add('lb-shake'); }
          } else if (txt.indexOf('🏠') !== -1) {
            A('token_finish'); haptic('success');
            overlay('lb-glow', l, t);
            sparks(l, t, ['#ffe58a', '#ffc32e', '#ffffff'], 14, 52);
          }
        }
      }
    }).observe(layer, { childList: true });
  }

  function confetti() {
    var old = $('lbConfetti');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var cv = D.createElement('canvas');
    cv.id = 'lbConfetti';
    D.body.appendChild(cv);
    var w = cv.width = cv.offsetWidth, h = cv.height = cv.offsetHeight;
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var cols = ['#ffc32e', '#ff4d63', '#22c07d', '#3b9bff', '#ffffff', '#b06bff'], ps = [];
    for (var i = 0; i < 110; i++) {
      ps.push({
        x: Math.random() * w, y: -20 - Math.random() * h * 0.6,
        vx: (Math.random() - 0.5) * 2.4, vy: 2.4 + Math.random() * 3.2,
        s: 5 + Math.random() * 7, a: Math.random() * Math.PI,
        va: (Math.random() - 0.5) * 0.28, c: cols[i % cols.length]
      });
    }
    var t0 = 0;
    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0;
      ctx.clearRect(0, 0, w, h);
      for (var k = 0; k < ps.length; k++) {
        var p = ps[k];
        p.x += p.vx; p.y += p.vy; p.a += p.va; p.vy += 0.03;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - el / 3200);
        ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (el < 3200) requestAnimationFrame(frame);
      else if (cv.parentNode) cv.parentNode.removeChild(cv);
    }
    requestAnimationFrame(frame);
  }

  function watchVictory() {
    var over = $('overScreen');
    if (!over || !global.MutationObserver) return;
    new MutationObserver(function () {
      if (over.classList.contains('hidden')) return;
      var t = ($('overTitle') && $('overTitle').textContent) || '';
      if (t.indexOf('بردی') !== -1) { confetti(); setTimeout(confetti, 900); }
    }).observe(over, { attributes: true, attributeFilter: ['class'] });
  }

  function start() {
    B = global.LudoBoard;
    if (!B || !B.cellOf) { setTimeout(start, 250); return; }
    injectCss(); buildLookup(); watchTokens(); watchFx(); watchVictory();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);


/* ================== بخش ۳ — جایگاه تاس هر بازیکن ================== */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }

  var COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
  var SPOT = {                        // مرکز خانهٔ هر رنگ روی تخته
    RED: { l: 22, t: 22 }, GREEN: { l: 78, t: 22 },
    YELLOW: { l: 78, t: 78 }, BLUE: { l: 22, t: 78 }
  };
  var TINT = { RED: '#f2314c', GREEN: '#22c07d', YELLOW: '#ffc32e', BLUE: '#3b9bff' };

  var CSS = [
    '.lb-pad{position:absolute;width:23%;height:23%;margin:-11.5% 0 0 -11.5%;z-index:13;',
    'display:flex;align-items:center;justify-content:center;border-radius:22px;',
    'pointer-events:none;opacity:0;transition:opacity .25s ease,transform .25s ease;transform:scale(.86)}',
    '.lb-pad.live{opacity:1;transform:scale(1)}',
    '.lb-pad::before{content:"";position:absolute;inset:6%;border-radius:20px;',
    'background:rgba(10,3,26,.34);border:2px solid rgba(255,255,255,.18);',
    'box-shadow:inset 0 2px 8px rgba(0,0,0,.35)}',
    '.lb-pad.turn{pointer-events:auto}',
    '.lb-pad.turn::before{border-color:var(--lbTint);box-shadow:0 0 16px 3px var(--lbTint),inset 0 2px 8px rgba(0,0,0,.3);',
    'animation:lbPadPulse 1.3s ease-in-out infinite}',
    '@keyframes lbPadPulse{0%,100%{opacity:.72}50%{opacity:1}}',
    '.lb-pad .lb-mini{width:34%;height:34%;border-radius:8px;',
    'background:linear-gradient(150deg,#fffdf6,#cbb9ec);opacity:.42;box-shadow:0 2px 5px rgba(0,0,0,.35)}',
    '.lb-pad.turn .lb-mini{display:none}',
    '#dice.lb-onboard{transform:scale(.58);z-index:14}',
    '#lbDiceSlot{width:74px;height:74px;opacity:0;pointer-events:none}'
  ].join('');

  function injectCss() {
    if ($('lb-pad-style')) return;
    var st = D.createElement('style');
    st.id = 'lb-pad-style';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  var pads = {}, moving = false;

  function buildPads() {
    var board = $('board');
    if (!board || pads.RED) return;
    COLORS.forEach(function (c) {
      var p = D.createElement('div');
      p.className = 'lb-pad ' + c;
      p.style.left = SPOT[c].l + '%';
      p.style.top = SPOT[c].t + '%';
      p.style.setProperty('--lbTint', TINT[c]);
      p.innerHTML = '<div class="lb-mini"></div>';
      p.addEventListener('click', function () {
        var btn = $('btnRoll');
        if (btn && !btn.disabled) btn.click();
      });
      board.appendChild(p);
      pads[c] = p;
    });

    var area = D.querySelector('.dice-area');
    if (area && !$('lbDiceSlot')) {
      var slot = D.createElement('div');
      slot.id = 'lbDiceSlot';
      area.insertBefore(slot, area.firstChild);
    }
  }

  function activeColor() {
    var d = D.querySelector('#playersStrip .pstrip.active .dot');
    if (!d) return null;
    var cn = ' ' + d.className + ' ';
    for (var i = 0; i < COLORS.length; i++) if (cn.indexOf(' ' + COLORS[i] + ' ') !== -1) return COLORS[i];
    return null;
  }

  function presentColors() {
    var out = {}, dots = D.querySelectorAll('#playersStrip .pstrip .dot');
    for (var i = 0; i < dots.length; i++) {
      var cn = ' ' + dots[i].className + ' ';
      for (var k = 0; k < COLORS.length; k++) if (cn.indexOf(' ' + COLORS[k] + ' ') !== -1) out[COLORS[k]] = true;
    }
    return out;
  }

  function sync() {
    buildPads();
    if (!pads.RED) return;

    var here = presentColors();
    var act = activeColor();

    COLORS.forEach(function (c) {
      pads[c].classList.toggle('live', !!here[c]);
      pads[c].classList.toggle('turn', c === act);
    });

    if (!act) return;
    var dice = $('dice');
    if (!dice) return;

    if (dice.parentNode === pads[act]) return;
    if (global.LudoDice && global.LudoDice.isBusy && global.LudoDice.isBusy()) {
      if (!moving) { moving = true; setTimeout(function () { moving = false; sync(); }, 400); }
      return;
    }

    dice.classList.add('lb-onboard');
    pads[act].appendChild(dice);
  }

  function start() {
    injectCss();
    buildPads();
    var strip = $('playersStrip');
    if (strip && global.MutationObserver) {
      new MutationObserver(function () { sync(); })
        .observe(strip, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    setInterval(sync, 900);
    sync();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
