/* لودو استار — تاس سه‌بعدی + موتور جلوه‌های گیم‌پلی (نسخهٔ ۳ / مرحلهٔ ۴)
   بدون هیچ تغییری در index.html و app.js کار می‌کند.
   بخش ۱: تاس واقعی با فیزیک پرتاب و صدا
   بخش ۲: حرکت خانه‌به‌خانه، زدن مهره، خانهٔ نهایی، جشن برد */

/* ==================================================================
   بخش ۱ — تاس
   ================================================================== */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }

  function A(name, opt) {
    if (global.LudoAudio) { try { global.LudoAudio.play(name, opt); } catch (e) { } }
  }

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

  var SEGS = [[72, 340], [34, 250], [15, 190], [6, 130], [0, 240]];
  var TOTAL = 1150, LOCK = 780;

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

    var startX = -34 - Math.random() * 16;
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
          A('dice_bounce', { strength: Math.min(1, SEGS[segIdx][0] / 72) });
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
      setTimeout(function () { dice.classList.remove('lb-land'); }, 420);

      busy = false;
      if (pending !== null) { var nx = pending; pending = null; setTimeout(function () { roll(nx); }, 220); }
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
        var ready = !btn.disabled && btn.classList.contains('ready');
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

  global.LudoDice = { roll: roll, throwTo: roll };
})(window);


/* ==================================================================
   بخش ۲ — موتور جلوه‌ها: حرکت خانه‌به‌خانه، زدن، خانهٔ نهایی، جشن
   ================================================================== */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }
  function A(n, o) { if (global.LudoAudio) { try { global.LudoAudio.play(n, o); } catch (e) { } } }
  function haptic(k) { if (global.LudoHaptic) global.LudoHaptic(k); }

  var B = null;
  var LOOKUP = {};          // رنگ → آرایهٔ {p,i,x,y}

  var CSS = [
    '.tokens-layer .token{will-change:left,top,transform}',
    '.token.lb-hop{transform:translateY(-9px) scale(1.09)!important;',
    'transition:transform .07s ease-out!important;z-index:9!important}',
    '.token.lb-squash{transform:translateY(0) scale(1.13,.88)!important;transition:transform .09s ease-out!important}',
    '.token.lb-fly{z-index:14!important;transition:none!important;filter:drop-shadow(0 6px 8px rgba(6,1,18,.6))}',
    '.token.lb-fin{animation:lbFin .95s cubic-bezier(.2,.9,.3,1.2)}',
    '@keyframes lbFin{0%{transform:none}35%{transform:scale(1.28);filter:drop-shadow(0 0 16px rgba(255,222,120,.95)) brightness(1.55)}',
    '100%{transform:none;filter:none}}',

    '.lb-ring{position:absolute;width:24%;height:24%;margin:-12% 0 0 -12%;border-radius:50%;',
    'border:3px solid rgba(255,255,255,.92);pointer-events:none;animation:lbRing .52s ease-out forwards}',
    '@keyframes lbRing{0%{transform:scale(.18);opacity:1}100%{transform:scale(1.75);opacity:0}}',

    '.lb-glow{position:absolute;width:34%;height:34%;margin:-17% 0 0 -17%;border-radius:50%;pointer-events:none;',
    'background:radial-gradient(circle,rgba(255,226,132,.85),rgba(255,196,60,0) 70%);animation:lbGlow .9s ease-out forwards}',
    '@keyframes lbGlow{0%{transform:scale(.3);opacity:0}30%{transform:scale(1);opacity:1}100%{transform:scale(1.5);opacity:0}}',

    '.lb-spark{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;',
    'pointer-events:none;will-change:transform,opacity}',

    '.lb-shake{animation:lbShake .34s ease-in-out}',
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

  /* ---------- نقشهٔ مکان‌ها ---------- */

  function buildLookup() {
    if (!B) return;
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
      var dx = arr[k].x - cell.x, dy = arr[k].y - cell.y;
      var d = dx * dx + dy * dy;
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
    for (var i = 0; i < B.COLORS.length; i++) {
      if (cn.indexOf(' ' + B.COLORS[i] + ' ') !== -1) return B.COLORS[i];
    }
    return null;
  }

  /* ---------- راه‌رفتن خانه‌به‌خانه ---------- */

  function walk(el, color, fromP, toP, slot) {
    var n = toP - fromP;
    var per = Math.max(72, Math.min(140, 150 - 8 * n));
    var cur = fromP;

    el.__lbBusy = true;
    var oldTr = el.style.transition;
    el.style.transition = 'none';

    function step() {
      cur++;
      var cell = B.cellOf(color, cur, slot);
      if (cell) put(el, cell);

      el.classList.add('lb-hop');
      A('token_move', { step: cur - fromP, total: n });
      setTimeout(function () { el.classList.remove('lb-hop'); }, Math.round(per * 0.55));

      if (cur >= toP) { setTimeout(land, per); return; }
      setTimeout(step, per);
    }

    function land() {
      el.classList.add('lb-squash');
      setTimeout(function () {
        el.classList.remove('lb-squash');
        el.style.transition = oldTr;
        el.__lbBusy = false;
        el.__lbCell = cellFromStyle(el);
      }, 110);
      haptic('light');
      if (toP >= B.POS_FINISH || toP >= B.HOME_ENTRY + 5) {
        el.classList.add('lb-fin');
        setTimeout(function () { el.classList.remove('lb-fin'); }, 950);
      }
    }

    step();
  }

  /* ---------- پرتاب قوسی (زدن مهره یا خروج از خانه) ---------- */

  function arc(el, fromCell, toCell, dur, spin) {
    el.__lbBusy = true;
    var oldTr = el.style.transition;
    el.style.transition = 'none';
    el.classList.add('lb-fly');

    var t0 = 0, lift = spin ? 2.1 : 1.1;

    function frame(now) {
      if (!t0) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      var x = fromCell.x + (toCell.x - fromCell.x) * t;
      var y = fromCell.y + (toCell.y - fromCell.y) * t - 4 * lift * t * (1 - t);
      put(el, { x: x, y: y });
      if (spin) el.style.transform = 'rotate(' + (t * 540).toFixed(0) + 'deg) scale(' + (1 + 0.25 * Math.sin(Math.PI * t)).toFixed(2) + ')';
      if (t < 1) { requestAnimationFrame(frame); return; }

      el.style.transform = '';
      el.classList.remove('lb-fly');
      el.classList.add('lb-squash');
      haptic(spin ? 'heavy' : 'light');
      setTimeout(function () {
        el.classList.remove('lb-squash');
        el.style.transition = oldTr;
        el.__lbBusy = false;
        el.__lbCell = cellFromStyle(el);
      }, 120);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- رصد جابه‌جایی مهره‌ها ---------- */

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
        if (dx * dx + dy * dy < 0.5) continue;           // فقط جابه‌جایی پشته

        var color = colorOf(el);
        if (!color) continue;
        var a = nearest(color, was), b = nearest(color, now);
        if (!a || !b) continue;

        if (b.p === B.POS_BASE && a.p !== B.POS_BASE) {
          el.__lbCell = now;
          arc(el, was, now, 560, true);                  // زده شد → پرتاب به خانه
        } else if (a.p === B.POS_BASE && b.p >= 0) {
          arc(el, was, now, 330, false);                 // خروج از خانه
        } else if (b.p > a.p && b.p - a.p <= 6) {
          el.__lbCell = now;
          put(el, was);
          walk(el, color, a.p, b.p, b.i);                // راه‌رفتن خانه‌به‌خانه
        } else {
          arc(el, was, now, 380, false);
        }
      }
    }).observe(layer, { attributes: true, attributeFilter: ['style'], subtree: true });
  }

  /* ---------- جلوه‌های ضربه و خانهٔ نهایی ---------- */

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
          node.style.transition = 'transform .62s cubic-bezier(.2,.7,.3,1), opacity .62s ease-out';
          node.style.transform = 'translate(' + (Math.cos(a) * dist).toFixed(0) + 'px,' +
            (Math.sin(a) * dist + 14).toFixed(0) + 'px) scale(.25)';
          node.style.opacity = '0';
        });
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 700);
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
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 950);
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
            A('token_capture');
            haptic('heavy');
            overlay('lb-ring', l, t);
            sparks(l, t, ['#fff3c4', '#ff9a3c', '#ff4d63'], 12, 46);
            var fr = D.querySelector('.board-frame');
            if (fr) { fr.classList.remove('lb-shake'); void fr.offsetWidth; fr.classList.add('lb-shake'); }
          } else if (txt.indexOf('🏠') !== -1) {
            A('token_finish');
            haptic('success');
            overlay('lb-glow', l, t);
            sparks(l, t, ['#ffe58a', '#ffc32e', '#ffffff'], 14, 52);
          }
        }
      }
    }).observe(layer, { childList: true });
  }

  /* ---------- کانفتی برد ---------- */

  function confetti() {
    var old = $('lbConfetti');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var cv = D.createElement('canvas');
    cv.id = 'lbConfetti';
    D.body.appendChild(cv);
    var w = cv.width = cv.offsetWidth, h = cv.height = cv.offsetHeight;
    var ctx = cv.getContext('2d');
    if (!ctx) return;

    var cols = ['#ffc32e', '#ff4d63', '#22c07d', '#3b9bff', '#ffffff', '#b06bff'];
    var ps = [];
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
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
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

  /* ---------- راه‌اندازی ---------- */

  function start() {
    B = global.LudoBoard;
    if (!B || !B.cellOf) { setTimeout(start, 250); return; }
    injectCss();
    buildLookup();
    watchTokens();
    watchFx();
    watchVictory();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
