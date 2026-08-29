/* ============================================================
   لودو استار — لایهٔ ارتقای تعامل
   تاس سه‌بعدی + انیمیشن مهره‌ها + اتصال دکمه‌های لابی جدید
   ============================================================ */
(function () {
  'use strict';

  /* ---------- اصلاحیه‌های CSS ---------- */
  var fix = document.createElement('style');
  fix.textContent =
    '.face.ff i:nth-child(4){grid-area:2 / 3;}' +
    '.token{transition:left .42s cubic-bezier(.35,.05,.25,1),top .42s cubic-bezier(.35,.05,.25,1);}' +
    '.ls-mode.purple{background:linear-gradient(180deg,#8a4ce8,#5f27bd 60%,#421694);}' +
    '.ls-mode-art .d.green{background:radial-gradient(circle at 34% 28%,#96f2b8,#17a54e);}' +
    '.ls-legacy{position:absolute!important;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;}';
  document.head.appendChild(fix);

  /* ============================================================
     ۰) اتصال دکمه‌های لابی جدید به منطق app.js
     app.js فقط دکمه‌های کلاس .tile را می‌شناسد، پس یک نسخهٔ
     نامرئی از آن‌ها می‌سازیم و کلیک‌ها را به آن هدایت می‌کنیم.
     ============================================================ */
  (function wireLobby() {
    var menu = document.getElementById('menuScreen');
    if (!menu) return;

    var acts = ['ai', 'create2', 'create4', 'join', 'board', 'profile'];
    var box = document.createElement('div');
    box.className = 'menu-grid ls-legacy';
    box.setAttribute('aria-hidden', 'true');

    var legacy = {};
    for (var i = 0; i < acts.length; i++) {
      var b = document.createElement('button');
      b.className = 'tile';
      b.setAttribute('data-act', acts[i]);
      b.tabIndex = -1;
      box.appendChild(b);
      legacy[acts[i]] = b;
    }
    menu.appendChild(box);

    var SEL = '.ls-mode, .ls-sub, .ls-rail-btn, .ls-nav-btn';

    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!btn) return;

      var act = btn.getAttribute('data-act');
      if (!act || !legacy[act]) return;

      // جلوی اجرای دوباره را می‌گیریم و فقط یک بار عمل می‌کنیم
      e.preventDefault();
      e.stopPropagation();

      // نشان دادن دکمهٔ فعال در نوار پایین
      if (btn.classList.contains('ls-nav-btn')) {
        var navs = document.querySelectorAll('.ls-nav-btn');
        for (var n = 0; n < navs.length; n++) navs[n].classList.remove('active');
        btn.classList.add('active');
      }

      try {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      } catch (err) { /* ignore */ }

      legacy[act].click();
    }, true);
  })();

  function $(id) { return document.getElementById(id); }

  var dice = $('dice');
  var cube = $('diceCube');
  var valEl = $('diceValue');
  var layer = $('tokensLayer');

  /* ============================================================
     ۱) تاس سه‌بعدی
     ============================================================ */

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
    void dice.offsetWidth;
    dice.classList.add('rolling');
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () { land(null); }, 3000);
  }

  function land(value) {
    clearTimeout(stopTimer);
    clearTimeout(landTimer);
    var wait = Math.max(0, 900 - (Date.now() - rollStart));
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
        clearTimeout(settle);
        settle = setTimeout(function () {
          lastVal = readValue() || lastVal;
          land(lastVal);
        }, 180);
      } else if (v !== lastVal) {
        lastVal = v;
        setFace(v, false);
      }
    }).observe(valEl, { childList: true, characterData: true, subtree: true });

    var rollBtn = $('btnRoll');
    if (rollBtn) rollBtn.addEventListener('click', function () {
      if (!rollBtn.disabled) beginRoll();
    });

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
