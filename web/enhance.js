/* ============================================================
   لودو استار — لایهٔ ارتقا
   تاس سه‌بعدی + انیمیشن مهره + دکمه‌های لابی + سیستم سکه
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  function haptic(kind) {
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(kind || 'light'); }
    catch (e) { /* ignore */ }
  }

  function num(n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ---------- بارگذاری استایل سکه ---------- */
  (function () {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/stake.css';
    document.head.appendChild(l);
  })();

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
     ۰) اقتصاد سکه
     ============================================================ */

  var COIN = {
    balance: 0,
    stakes: [0, 500, 2000, 5000, 10000, 25000],
    chosen: parseInt(localStorage.getItem('ls_stake') || '0', 10) || 0,
    seats: 4
  };

  var SHARES = {
    2: [1],
    3: [0.65, 0.35],
    4: [0.625, 0.25, 0.125]
  };

  function entryFee(stake, seats) {
    if (stake <= 0 || seats <= 0) return 0;
    return Math.floor(stake / seats);
  }

  function potOf(stake, seats) { return entryFee(stake, seats) * seats; }

  function prizeList(stake, seats) {
    var pot = potOf(stake, seats);
    var out = [];
    var sh = SHARES[seats] || SHARES[2];
    var given = 0, i;
    for (i = 0; i < sh.length; i++) {
      var a = Math.floor(pot * sh[i]);
      out.push(a); given += a;
    }
    if (out.length && given < pot) out[0] += pot - given;
    while (out.length < seats) out.push(0);
    return out;
  }

  function stakeLabel(s) {
    if (s <= 0) return 'دوستانه';
    if (s >= 1000) return (s / 1000) + 'k';
    return String(s);
  }

  function setBalance(v) {
    if (typeof v !== 'number' || !isFinite(v)) return;
    var changed = v !== COIN.balance;
    COIN.balance = v;
    var el = $('menuCoins');
    if (el) {
      el.textContent = num(v);
      if (changed && el.parentNode) {
        var p = el.parentNode;
        p.classList.remove('bump');
        void p.offsetWidth;
        p.classList.add('bump');
      }
    }
    var bal = document.querySelector('.lsx-bal b');
    if (bal) bal.textContent = num(v);
    paintStakes();
  }

  function refreshCoins() {
    var init = (tg && tg.initData) ? tg.initData : '';
    if (!init) return;
    nativeFetch('/api/coins', { headers: { 'X-Init-Data': init } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) return;
        if (Array.isArray(d.stakes) && d.stakes.length) COIN.stakes = d.stakes;
        setBalance(Number(d.coins) || 0);
      })
      .catch(function () { /* ignore */ });
  }

  /* ---------- تزریق مبلغ به درخواست ساخت اتاق ---------- */

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var url = '';
    try { url = (typeof input === 'string') ? input : (input && input.url) || ''; }
    catch (e) { url = ''; }

    if (init && init.body && url.indexOf('/api/room/create') !== -1) {
      try {
        var b = JSON.parse(init.body);
        if (b.mode !== 'AI') b.stake = COIN.chosen;
        else b.stake = 0;
        init = Object.assign({}, init, { body: JSON.stringify(b) });
      } catch (e) { /* ignore */ }
    }

    var p = nativeFetch(input, init);

    if (url.indexOf('/api/me') !== -1 || url.indexOf('/api/room/') !== -1) {
      p.then(function (res) {
        try {
          res.clone().json().then(function (d) {
            if (!d) return;
            if (d.user && typeof d.user.coins === 'number') setBalance(d.user.coins);
            if (typeof d.coins === 'number') setBalance(d.coins);
            if (Array.isArray(d.stakes) && d.stakes.length) COIN.stakes = d.stakes;
            if (d.ok === false && d.error === 'NOT_ENOUGH_COINS') {
              alertCoins(d.need || 0);
            }
          }).catch(function () { /* ignore */ });
        } catch (e) { /* ignore */ }
        return res;
      }).catch(function () { /* ignore */ });
    }

    return p;
  };

  function alertCoins(need) {
    var t = $('toast');
    if (!t) return;
    t.textContent = 'سکه کافی نداری — ورودی این میز ' + num(need) + ' سکه است';
    t.classList.remove('hidden');
    setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }

  /* ============================================================
     ۱) پنجرهٔ انتخاب مبلغ میز
     ============================================================ */

  var mask = null, grid = null, prizeBox = null, goBtn = null, subEl = null;
  var pendingAct = null;

  function buildModal() {
    if (mask) return;
    mask = document.createElement('div');
    mask.className = 'lsx-mask hidden';
    mask.innerHTML =
      '<div class="lsx-modal">' +
        '<div class="lsx-head">' +
          '<b>مبلغ میز را انتخاب کن</b>' +
          '<button class="lsx-x" type="button">✖</button>' +
        '</div>' +
        '<div class="lsx-sub"></div>' +
        '<div class="lsx-bal">🪙 موجودی تو: <b>0</b> سکه</div>' +
        '<div class="lsx-stakes"></div>' +
        '<div class="lsx-prizes"><h4>تقسیم جایزه</h4><div class="lsx-plist"></div></div>' +
        '<button class="lsx-go" type="button">▶️ شروع میز</button>' +
      '</div>';
    document.body.appendChild(mask);

    grid = mask.querySelector('.lsx-stakes');
    prizeBox = mask.querySelector('.lsx-plist');
    goBtn = mask.querySelector('.lsx-go');
    subEl = mask.querySelector('.lsx-sub');

    mask.querySelector('.lsx-x').addEventListener('click', closeModal);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });

    grid.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.lsx-stake') : null;
      if (!b || b.classList.contains('locked')) return;
      COIN.chosen = parseInt(b.getAttribute('data-v'), 10) || 0;
      localStorage.setItem('ls_stake', String(COIN.chosen));
      haptic('light');
      paintStakes();
    });

    goBtn.addEventListener('click', function () {
      var act = pendingAct;
      closeModal();
      if (act) startLegacy(act);
    });
  }

  function paintStakes() {
    if (!grid) return;
    grid.innerHTML = '';
    var seats = COIN.seats;

    for (var i = 0; i < COIN.stakes.length; i++) {
      var v = COIN.stakes[i];
      var fee = entryFee(v, seats);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lsx-stake' + (v === 0 ? ' free' : '');
      b.setAttribute('data-v', String(v));
      if (v === COIN.chosen) b.className += ' on';
      if (fee > COIN.balance) b.className += ' locked';

      b.innerHTML = v === 0
        ? '<span class="amt">دوستانه</span><span class="fee">بدون سکه</span>'
        : '<span class="amt">🪙 ' + num(v) + '</span>' +
          '<span class="fee">' + (fee > COIN.balance ? 'سکه کم داری' : 'ورودی ' + num(fee)) + '</span>';

      grid.appendChild(b);
    }

    // اگر مبلغ انتخاب‌شده قابل پرداخت نیست، برگرد به دوستانه
    if (entryFee(COIN.chosen, seats) > COIN.balance) {
      COIN.chosen = 0;
      var f = grid.querySelector('.lsx-stake[data-v="0"]');
      if (f) f.classList.add('on');
    }

    paintPrizes();
  }

  function paintPrizes() {
    if (!prizeBox) return;
    var seats = COIN.seats;
    var stake = COIN.chosen;
    var fee = entryFee(stake, seats);

    if (subEl) {
      subEl.textContent = seats + ' نفره — هر بازیکن ' +
        (fee > 0 ? num(fee) + ' سکه می‌گذارد' : 'چیزی نمی‌پردازد');
    }

    if (stake <= 0) {
      prizeBox.innerHTML = '<div class="lsx-prow zero"><span>بازی دوستانه</span><b>بدون سکه</b></div>';
      if (goBtn) goBtn.disabled = false;
      return;
    }

    var list = prizeList(stake, seats);
    var icons = ['🥇 نفر اول', '🥈 نفر دوم', '🥉 نفر سوم', '4️⃣ نفر چهارم'];
    var html = '';
    for (var i = 0; i < seats; i++) {
      var a = list[i] || 0;
      html += '<div class="lsx-prow' + (a ? '' : ' zero') + '">' +
              '<span>' + icons[i] + '</span><b>' + (a ? '🪙 ' + num(a) : '—') + '</b></div>';
    }
    if (seats === 4) {
      html += '<div class="lsx-prow"><span>حالت تیمی</span><b>🪙 ' +
              num(Math.floor(potOf(stake, seats) / 2)) + ' برای هر نفر تیم برنده</b></div>';
    }
    prizeBox.innerHTML = html;
    if (goBtn) goBtn.disabled = fee > COIN.balance;
  }

  function openModal(act, seats) {
    buildModal();
    pendingAct = act;
    COIN.seats = seats;
    paintStakes();
    mask.classList.remove('hidden');
    refreshCoins();
    haptic('light');
  }

  function closeModal() {
    if (mask) mask.classList.add('hidden');
    pendingAct = null;
  }

  /* ============================================================
     ۲) اتصال دکمه‌های لابی به منطق app.js
     ============================================================ */

  var legacy = {};

  function startLegacy(act) {
    if (legacy[act]) legacy[act].click();
  }

  (function wireLobby() {
    var menu = $('menuScreen');
    if (!menu) return;

    var acts = ['ai', 'create2', 'create4', 'join', 'board', 'profile'];
    var box = document.createElement('div');
    box.className = 'menu-grid ls-legacy';
    box.setAttribute('aria-hidden', 'true');

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

      e.preventDefault();
      e.stopPropagation();

      if (btn.classList.contains('ls-nav-btn')) {
        var navs = document.querySelectorAll('.ls-nav-btn');
        for (var n = 0; n < navs.length; n++) navs[n].classList.remove('active');
        btn.classList.add('active');
      }

      haptic('light');

      if (act === 'create2') { openModal(act, 2); return; }
      if (act === 'create4') { openModal(act, 4); return; }
      if (act === 'ai') COIN.chosen = 0;

      startLegacy(act);
    }, true);
  })();

  /* ---------- تازه‌سازی سکه هنگام دیدن منو ---------- */
  (function () {
    var menu = $('menuScreen');
    if (!menu) return;
    var wasHidden = menu.classList.contains('hidden');
    new MutationObserver(function () {
      var hid = menu.classList.contains('hidden');
      if (wasHidden && !hid) refreshCoins();
      wasHidden = hid;
    }).observe(menu, { attributes: true, attributeFilter: ['class'] });
    if (!wasHidden) refreshCoins();
    setTimeout(refreshCoins, 1200);
  })();

  /* ---------- نشان مبلغ در اتاق انتظار ---------- */
  (function () {
    var lob = $('lobbyScreen');
    var code = $('lobbyCode');
    if (!lob || !code) return;
    var badge = document.createElement('div');
    badge.className = 'lsx-badge';
    badge.style.display = 'none';
    if (code.parentNode) code.parentNode.appendChild(badge);

    new MutationObserver(function () {
      if (lob.classList.contains('hidden')) return;
      if (COIN.chosen > 0) {
        badge.textContent = '🪙 میز ' + stakeLabel(COIN.chosen) + ' — ورودی ' +
                            num(entryFee(COIN.chosen, COIN.seats)) + ' سکه';
        badge.style.display = '';
      } else {
        badge.textContent = '🤝 میز دوستانه';
        badge.style.display = '';
      }
    }).observe(lob, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ============================================================
     ۳) تاس سه‌بعدی
     ============================================================ */

  var dice = $('dice');
  var cube = $('diceCube');
  var valEl = $('diceValue');
  var layer = $('tokensLayer');

  var FACE = {
    1: { x: 0,   y: 0 },
    2: { x: 0,   y: 180 },
    3: { x: 0,   y: -90 },
    4: { x: 0,   y: 90 },
    5: { x: -90, y: 0 },
    6: { x: 90,  y: 0 }
  };

  var rolling = false, rollStart = 0, landTimer = null, stopTimer = null;

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
    stopTimer = setTimeout(function () { land(lastVal || 1); }, 3000);
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
      haptic('rigid');
    }, wait);
  }

  var lastVal = 0, settle = null;

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
     ۴) انیمیشن مهره‌ها
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
          if (!el.dataset || !el.dataset.seen) continue;
          var pos = el.style.left + '|' + el.style.top;
          if (pos === el.dataset.pos) continue;
          el.dataset.pos = pos;
          flash(el, 'hop', 460);
        }
      }
    }).observe(layer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
  }

  /* ---------- تازه‌سازی سکه بعد از پایان بازی ---------- */
  (function () {
    var over = $('overScreen');
    if (!over) return;
    new MutationObserver(function () {
      if (!over.classList.contains('hidden')) setTimeout(refreshCoins, 900);
    }).observe(over, { attributes: true, attributeFilter: ['class'] });
  })();

})();
