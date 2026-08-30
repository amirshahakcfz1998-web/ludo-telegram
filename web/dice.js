/* لودو استار — تاس سه‌بعدی با فیزیک پرتاب + پل صوتی گیم‌پلی (مرحلهٔ ۳)
   این فایل بدون تغییر در index.html و app.js کار می‌کند:
   - تاس واقعی: پرتاب، چرخش سه‌محوره، جهش‌های نزولی، اسکواش، فرود روی عدد سرور
   - صدا همگام با فازها: پرتاب → برخوردها → فرود
   - پل صوتی موقت: زدن مهره، خانهٔ نهایی، تغییر نوبت، حرکت، شمارش معکوس، برد/باخت */
(function (global) {
  'use strict';

  var D = global.document;

  /* ---------------- ابزار ---------------- */

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

  /* ---------------- ظاهر تاس ---------------- */

  var H = 30;   // نیم‌یال مکعب (px)

  var CSS = [
    '#dice{position:relative!important;width:74px!important;height:74px!important;',
    'perspective:560px!important;transform-style:preserve-3d!important;overflow:visible!important;background:none!important}',

    '#dice .dice-raw{display:none!important}',

    '#dice .dice-shadow{position:absolute!important;left:50%!important;bottom:-4px!important;',
    'width:58px!important;height:15px!important;border-radius:50%!important;',
    'background:radial-gradient(ellipse at center,rgba(8,2,22,.55),rgba(8,2,22,0) 72%)!important;',
    'transform:translateX(-50%)!important;transform-origin:50% 50%!important;filter:blur(1px);will-change:transform,opacity}',

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

    /* شش وجه: ۱ جلو، ۲ راست، ۳ بالا، ۴ پایین، ۵ چپ، ۶ عقب */
    '#diceCube .fa{transform:translateZ(' + H + 'px)!important}',
    '#diceCube .fb{transform:rotateY(90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fc{transform:rotateX(90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fd{transform:rotateX(-90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fe{transform:rotateY(-90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .ff{transform:rotateY(180deg) translateZ(' + H + 'px)!important}',

    /* چیدمان خال‌ها */
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

    /* هالهٔ آماده‌بودن و فلاش فرود */
    '#dice.lb-ready::after{content:"";position:absolute;inset:-12px;border-radius:26px;pointer-events:none;',
    'background:radial-gradient(circle,rgba(255,214,107,.42),rgba(255,214,107,0) 68%);animation:lbPulse 1.25s ease-in-out infinite}',
    '@keyframes lbPulse{0%,100%{opacity:.35;transform:scale(.94)}50%{opacity:.9;transform:scale(1.06)}}',
    '#dice.lb-land .face{box-shadow:inset 0 0 0 1.5px #fff,0 0 16px 4px rgba(255,214,107,.85)!important}',

    /* بازخورد فشردن دکمه‌ها = حس موبایلی */
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

  /* ---------------- هدف چرخش برای هر عدد ---------------- */

  var FACE = {
    1: { rx: 0, ry: 0 },
    2: { rx: 0, ry: -90 },
    3: { rx: -90, ry: 0 },
    4: { rx: 90, ry: 0 },
    5: { rx: 0, ry: 90 },
    6: { rx: 0, ry: 180 }
  };

  /* ---------------- پرتاب ---------------- */

  var SEGS = [   // [ارتفاع px, مدت ms] — جهش‌های نزولی
    [72, 340], [34, 250], [15, 190], [6, 130], [0, 240]
  ];
  var TOTAL = 1150;
  var LOCK = 780;           // بعد از این لحظه عدد نهایی از سرور خوانده و قفل می‌شود

  var busy = false, pending = null, raf = 0;
  var lastValue = 1;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function readValue() {
    var el = $('diceValue');
    if (!el) return 0;
    var v = parseInt(String(el.textContent || '').replace(/[^\d]/g, ''), 10);
    return (v >= 1 && v <= 6) ? v : 0;
  }

  function setCube(x, y, h, rx, ry, rz, sq) {
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

    var startX = -34 - Math.random() * 16;          // از سمت راست وارد می‌شود (RTL)
    var freeX = 360 * 3 + 180, freeY = 360 * 2 + 90, freeZ = 360 * 2;
    var locked = null;
    var segIdx = -1;
    var t0 = 0;

    A('dice_roll');
    haptic('medium');
    dice.classList.remove('lb-land');

    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0;
      if (el > TOTAL) el = TOTAL;

      /* --- ارتفاع و جهش --- */
      var acc = 0, i = 0, h = 0, sq = 1, idx = 0;
      for (i = 0; i < SEGS.length; i++) {
        if (el <= acc + SEGS[i][1] || i === SEGS.length - 1) {
          idx = i;
          var u = SEGS[i][1] ? (el - acc) / SEGS[i][1] : 1;
          if (u < 0) u = 0; if (u > 1) u = 1;
          h = 4 * SEGS[i][0] * u * (1 - u);
          if (SEGS[i][0] > 4 && u > 0.86) sq = 1 - 0.16 * ((u - 0.86) / 0.14);   // فشردگی لحظهٔ برخورد
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

      /* --- جابه‌جایی افقی --- */
      var p = el / TOTAL;
      var x = startX * (1 - easeOut(p));

      /* --- چرخش: آزاد، سپس قفل روی عدد سرور --- */
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

      setCube(x, 0, h, rx, ry, rz, sq);

      if (el < TOTAL) { raf = requestAnimationFrame(frame); return; }

      /* --- فرود نهایی --- */
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

  /* ---------------- اتصال به بازی ---------------- */

  function watchDice() {
    var dice = $('dice');
    if (!dice || !global.MutationObserver) return;

    // app.js هنگام رسیدن رویداد DICE کلاس rolling را اضافه می‌کند
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

    // هالهٔ «آماده» روی تاس، همگام با فعال‌شدن دکمه
    if (global.MutationObserver) {
      var sync = function () {
        var dice = $('dice');
        if (dice) dice.classList.toggle('lb-ready', !btn.disabled && btn.classList.contains('ready'));
      };
      new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ['class', 'disabled'] });
      sync();
    }
  }

  /* ---------------- پل صوتی گیم‌پلی (موقت تا مرحلهٔ ۴) ---------------- */

  function bridgeSounds() {
    if (!global.MutationObserver) return;

    // زدن مهره / رسیدن به خانه: app.js در fxLayer نماد می‌سازد
    var fxl = $('fxLayer');
    if (fxl) {
      new MutationObserver(function (recs) {
        for (var i = 0; i < recs.length; i++) {
          var add = recs[i].addedNodes;
          for (var j = 0; j < add.length; j++) {
            var n = add[j];
            if (!n || n.nodeType !== 1 || n.className !== 'fx') continue;
            var s = n.textContent || '';
            if (s.indexOf('💥') !== -1) { A('token_capture'); haptic('heavy'); }
            else if (s.indexOf('🏠') !== -1) { A('token_finish'); haptic('success'); }
          }
        }
      }).observe(fxl, { childList: true });
    }

    // حرکت مهره: تغییر مکان در لایهٔ مهره‌ها
    var tl = $('tokensLayer');
    if (tl) {
      var step = 0;
      new MutationObserver(function () {
        step = (step + 1) % 6;
        A('token_move', { step: step, total: 6, throttle: 70 });
      }).observe(tl, { attributes: true, attributeFilter: ['style'], subtree: true });
    }

    // تغییر نوبت
    var tn = $('turnName');
    if (tn) {
      new MutationObserver(function () {
        A('turn_change', { throttle: 500 });
      }).observe(tn, { childList: true, characterData: true, subtree: true });
    }

    // برد / باخت
    var over = $('overScreen');
    if (over) {
      new MutationObserver(function () {
        if (over.classList.contains('hidden')) return;
        var t = ($('overTitle') && $('overTitle').textContent) || '';
        if (t.indexOf('بردی') !== -1) { A('victory'); haptic('success'); }
        else A('defeat');
      }).observe(over, { attributes: true, attributeFilter: ['class'] });
    }

    // شمارش معکوس تایمر نوبت
    setInterval(function () {
      var g = $('gameScreen'), f = $('timerFill');
      if (!g || !f || g.classList.contains('hidden')) return;
      if (f.classList.contains('critical')) A('countdown', { urgent: true, throttle: 900 });
      else if (f.classList.contains('low')) A('countdown', { throttle: 1900 });
    }, 500);

    // صدای عمومی دکمه‌ها
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

  /* ---------------- همگام‌سازی روشن/خاموش صدا با تنظیمات ---------------- */

  function bridgeSetting() {
    function apply() {
      var v = $('setSoundVal');
      if (!v || !global.LudoAudio) return;
      var on = (v.textContent || '').indexOf('خاموش') === -1;
      global.LudoAudio.setEnabled(on);
    }
    var btn = $('setSound');
    if (btn) btn.addEventListener('click', function () { setTimeout(apply, 120); });
    setTimeout(apply, 1500);
  }

  /* ---------------- آزادسازی صدا با اولین لمس ---------------- */

  function unlockOnce() {
    var fn = function () {
      if (global.LudoAudio) { try { global.LudoAudio.unlock(); } catch (e) { } }
      D.removeEventListener('touchstart', fn, true);
      D.removeEventListener('click', fn, true);
    };
    D.addEventListener('touchstart', fn, true);
    D.addEventListener('click', fn, true);
  }

  /* ---------------- راه‌اندازی ---------------- */

  function start() {
    injectCss();
    setCube(0, 0, 0, -18, 24, 0, 1);   // حالت استراحت با زاویهٔ زیبا
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
