/* ============================================================
   لودو استار — لایهٔ ارتقای تعامل
   تاس سه‌بعدی واقعی (بدون عدد) + انیمیشن مهره‌ها
   این فایل هیچ کدی از app.js را تغییر نمی‌دهد، فقط روی آن سوار می‌شود.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- اصلاح دو غلط تایپی کوچک در enhance.css ---------- */
  var fix = document.createElement('style');
  fix.textContent =
    '.face.ff i:nth-child(4){grid-area:2 / 3;}' +
    '.token{transition:left .42s cubic-bezier(.35,.05,.25,1),top .42s cubic-bezier(.35,.05,.25,1);}';
  document.head.appendChild(fix);

  function $(id) { return document.getElementById(id); }

  var dice = $('dice');
  var cube = $('diceCube');
  var valEl = $('diceValue');
  var layer = $('tokensLayer');

  /* ============================================================
     ۱) تاس سه‌بعدی
     ============================================================ */

  // چرخشی که هر وجه را رو به بیننده می‌آورد
  var FACE = {
    1: { x: 0,   y: 0 },
    2: { x: 0,   y: 180 },
    3: { x: 0,   y: -90 },
    4: { x: 0,   y: 90 },
    5: { x: -90, y: 0 },
    6: { x: 90,  y: 0 }
  };

  var rolling = false;
  var rollStart = 0;
  var landTimer = null;
  var stopTimer = null;

  function setFace(v, animated) {
    var f = FACE[v] || FACE[1];
    var spin = animated ? 1440 : 0;
    cube.style.transform =
      'rotateX(' + (f.x + spin) + 'deg) rotateY(' + (f.y + spin) + 'deg) rotateZ(8deg)';
  }

  function beginRoll() {
    if (rolling) return;
    rolling = true;
    rollStart = Date.now();
    dice.classList.remove('landed');
    dice.classList.remove('rolling');
    void dice.offsetWidth;      // ریست انیمیشن
    dice.classList.add('rolling');
    clearTimeout(stopTimer);
    // اگر پاسخی از سرور نیامد، بعد از ۳ ثانیه تاس را آرام کن
    stopTimer = setTimeout(function () { land(null); }, 3000);
  }

  function land(value) {
    clearTimeout(stopTimer);
    clearTimeout(landTimer);
    var wait = Math.max(0, 900 - (Date.now() - rollStart));   // تا پایان پرش
    landTimer = setTimeout(function () {
      rolling = false;
      dice.classList.remove('rolling');
      setFace(value, true);
      dice.classList.add('landed');
      setTimeout(function () { dice.classList.remove('landed'); }, 320);
      try {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('rigid');
      } catch (e) { /* ignore */ }
    }, wait);
  }

  // مقدار تاس را از متن مخفی‌شدهٔ app.js می‌خوانیم
  var lastVal = 0;
  var settle = null;

  function readValue() {
    var n = parseInt((valEl.textContent || '').replace(/[^\d]/g, ''), 10);
    return (n >= 1 && n <= 6) ? n : 0;
  }

  if (valEl && cube && dice) {
    setFace(1, false);

    new MutationObserver(function () {
      var v = readValue();
      if (!v) return;

      if (dice.classList.contains('rolling') || rolling) {
        // وسط پرتاب هستیم: آخرین عدد ثابت را به عنوان نتیجه بگیر
        clearTimeout(settle);
        settle = setTimeout(function () {
          lastVal = readValue() || lastVal;
          land(lastVal);
        }, 180);
      } else if (v !== lastVal) {
        // همگام‌سازی ساده (بدون پرتاب)
        lastVal = v;
        setFace(v, false);
      }
    }).observe(valEl, { childList: true, characterData: true, subtree: true });

    // با کلیک، تاس فوراً شروع به چرخش می‌کند (حس پاسخ‌گویی)
    var rollBtn = $('btnRoll');
    if (rollBtn) rollBtn.addEventListener('click', function () {
      if (!rollBtn.disabled) beginRoll();
    });

    // اگر app.js خودش کلاس rolling را گذاشت هم تشخیص بده
    new MutationObserver(function () {
      if (dice.classList.contains('rolling') && !rolling) {
        rolling = true;
        rollStart = Date.now();
      }
    }).observe(dice, { attributes: true, attributeFilter: ['class'] });
  }

  /* ============================================================
     ۲) انیمیشن مهره‌ها
     ============================================================ */

  function flash(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  if (layer) {
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];

        // مهرهٔ تازه‌ساخته‌شده: ظاهر شدن با پاپ
        if (m.type === 'childList' && m.addedNodes.length) {
          for (var a = 0; a < m.addedNodes.length; a++) {
            var node = m.addedNodes[a];
            if (node.nodeType !== 1) continue;
            (function (n) {
              setTimeout(function () {
                n.dataset.seen = '1';
                n.dataset.pos = n.style.left + '|' + n.style.top;
                flash(n, 'pop', 460);
              }, 0);
            })(node);
          }
        }

        // جابه‌جایی مهره: پرش
        if (m.type === 'attributes' && m.attributeName === 'style') {
          var el = m.target;
          if (!el.dataset || el.dataset.seen !== '1') continue;
          var now = el.style.left + '|' + el.style.top;
          if (now === el.dataset.pos) continue;
          el.dataset.pos = now;
          flash(el, 'hop', 440);
        }
      }
    }).observe(layer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
  }
})();
