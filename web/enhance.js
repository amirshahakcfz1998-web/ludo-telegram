/* ============================================================
   لودو استار — لایهٔ ارتقا
   تاس سه‌بعدی + انیمیشن مهره + لابی + سکه + صفحهٔ نتیجه
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  function myId() {
    try { return Number(tg.initDataUnsafe.user.id) || 0; } catch (e) { return 0; }
  }

  function haptic(kind) {
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(kind || 'light'); }
    catch (e) { /* ignore */ }
  }

  function num(n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ---------- بارگذاری استایل سکه با ضدکش ---------- */
  (function () {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/stake.css?v=' + Math.floor(Date.now() / 60000);
    document.head.appendChild(l);
  })();

  /* ============================================================
     استایل بحرانی — داخل JS تا هرگز کش نشود
     ============================================================ */
  var css = document.createElement('style');
  css.textContent = [
    '.face.ff i:nth-child(4){grid-area:2 / 3;}',
    '.token{transition:left .42s cubic-bezier(.35,.05,.25,1),top .42s cubic-bezier(.35,.05,.25,1);}',
    '.ls-mode.purple{background:linear-gradient(180deg,#8a4ce8,#5f27bd 60%,#421694);}',
    '.ls-mode-art .d.green{background:radial-gradient(circle at 34% 28%,#96f2b8,#17a54e);}',
    '.ls-legacy{position:absolute!important;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;}',

    /* ---- صفحهٔ پایان بازی ---- */
    '#overScreen{padding:0!important;overflow-y:auto!important;',
      'align-items:stretch!important;justify-content:flex-start!important;',
      'background:radial-gradient(80vw 44vh at 50% -4%,#7a1d86,transparent 70%),',
      'linear-gradient(180deg,#4d1060 0%,#2c0742 100%)!important;}',

    '#overScreen *{color:#fff!important;}',

    '#overScreen .glass-card,#overScreen .glass-card.result{',
      'width:100%!important;max-width:430px!important;margin:auto!important;',
      'padding:calc(env(safe-area-inset-top) + 18px) 16px calc(env(safe-area-inset-bottom) + 20px)!important;',
      'border:0!important;border-radius:0!important;background:none!important;',
      'box-shadow:none!important;backdrop-filter:none!important;',
      '-webkit-backdrop-filter:none!important;}',

    '#overIcon{font-size:58px!important;filter:drop-shadow(0 6px 14px rgba(0,0,0,.6));',
      'animation:lsxDrop .6s cubic-bezier(.2,.9,.3,1.4);}',
    '@keyframes lsxDrop{0%{transform:translateY(-26px) scale(.6);opacity:0}100%{transform:none;opacity:1}}',

    '#overTitle{margin:4px 0 15px!important;font-size:22px!important;font-weight:900!important;',
      'text-shadow:0 3px 8px rgba(0,0,0,.55);}',

    /* رتبه‌ها */
    '.rank-list{display:flex!important;flex-direction:column!important;gap:8px!important;',
      'margin-bottom:12px!important;}',
    '.rank-list>*{display:flex!important;align-items:center!important;gap:9px!important;',
      'padding:11px 13px!important;border-radius:15px!important;',
      'font-size:14px!important;font-weight:800!important;text-align:start!important;',
      'background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(0,0,0,.22))!important;',
      'border:1.5px solid rgba(255,255,255,.18)!important;',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 4px 12px rgba(0,0,0,.35)!important;}',
    '.rank-list>*:first-child{border-color:#ffc247!important;',
      'background:linear-gradient(180deg,rgba(255,200,70,.32),rgba(180,110,0,.2))!important;}',
    '.rank-list>*:nth-child(2){border-color:rgba(214,224,244,.5)!important;',
      'background:linear-gradient(180deg,rgba(215,225,245,.22),rgba(60,70,100,.2))!important;}',
    '.rank-list>*:nth-child(3){border-color:rgba(208,139,74,.55)!important;',
      'background:linear-gradient(180deg,rgba(208,139,74,.26),rgba(90,50,20,.2))!important;}',

    /* آمار */
    '.result-stats{display:grid!important;grid-template-columns:1fr 1fr!important;',
      'gap:9px!important;margin-bottom:4px!important;}',
    '.result-stats>*{padding:10px 8px!important;border-radius:14px!important;',
      'text-align:center!important;font-size:13px!important;font-weight:800!important;',
      'background:rgba(255,255,255,.1)!important;',
      'border:1px solid rgba(255,255,255,.16)!important;',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.16)!important;}',
    '.result-stats b,.result-stats strong{color:#ffd85c!important;',
      'font-size:16px!important;font-weight:900!important;}',
    '.result-stats small{color:rgba(255,255,255,.78)!important;',
      'font-size:10.5px!important;font-weight:600!important;}',

    /* کارت جایزه */
    '#lsxPrize{margin:12px 0 10px;padding:12px;border-radius:17px;',
      'border:2px solid rgba(255,200,70,.5);',
      'background:linear-gradient(180deg,rgba(255,200,70,.22),rgba(0,0,0,.3));',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 6px 16px rgba(0,0,0,.4);}',
    '#lsxPrize .big{display:flex;align-items:center;justify-content:center;gap:8px;',
      'font-size:26px;font-weight:900;color:#ffd85c!important;',
      'text-shadow:0 2px 8px rgba(0,0,0,.6);}',
    '#lsxPrize .big.zero{color:rgba(255,255,255,.6)!important;font-size:17px;}',
    '#lsxPrize .cap{margin-top:4px;text-align:center;font-size:11px;',
      'color:rgba(255,255,255,.78)!important;}',
    '#lsxPrize .bal{margin-top:9px;padding-top:8px;text-align:center;',
      'font-size:12.5px;font-weight:800;border-top:1px dashed rgba(255,255,255,.18);}',
    '#lsxPrize .bal b{color:#ffd85c!important;}',
    '#lsxPrize.win{animation:lsxWin .7s cubic-bezier(.2,.9,.3,1.3);}',
    '@keyframes lsxWin{0%{transform:scale(.82);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1)}}',

    /* دکمه‌ها */
    '#btnAgain{margin-top:14px!important;border:2px solid #ffe08a!important;',
      'border-radius:16px!important;padding:14px 0!important;',
      'font-size:16px!important;font-weight:900!important;',
      'text-shadow:0 2px 3px rgba(0,0,0,.45);',
      'background:linear-gradient(180deg,#ffc247,#ef820c)!important;',
      'box-shadow:inset 0 2px 0 rgba(255,255,255,.45),0 8px 18px rgba(0,0,0,.5)!important;}',
    '#btnAgain:active{transform:translateY(3px);}',
    '#btnHome{margin-top:9px!important;border:1.5px solid rgba(255,255,255,.28)!important;',
      'border-radius:16px!important;padding:12px 0!important;',
      'font-size:14px!important;font-weight:800!important;',
      'background:rgba(255,255,255,.1)!important;',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.16)!important;}',
    '#btnHome:active{transform:translateY(2px);}',

    '@media (max-height:700px){#overIcon{font-size:44px!important}',
      '#overTitle{font-size:19px!important}}'
  ].join('');
  document.head.appendChild(css);

  /* ============================================================
     ۱) اقتصاد سکه
     ============================================================ */

  var COIN = {
    balance: 0,
    stakes: [0, 500, 2000, 5000, 10000, 25000],
    chosen: parseInt(localStorage.getItem('ls_stake') || '0', 10) || 0,
    seats: 4
  };

  var SHARES = { 2: [1], 3: [0.65, 0.35], 4: [0.625, 0.25, 0.125] };

  function entryFee(stake, seats) {
    if (stake <= 0 || seats <= 0) return 0;
    return Math.floor(stake / seats);
  }

  function potOf(stake, seats) { return entryFee(stake, seats) * seats; }

  function prizeList(stake, seats) {
    var pot = potOf(stake, seats);
    var sh = SHARES[seats] || SHARES[2];
    var out = [], given = 0, i;
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

  var nativeFetch = window.fetch.bind(window);

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

  window.fetch = function (input, init) {
    var url = '';
    try { url = (typeof input === 'string') ? input : (input && input.url) || ''; }
    catch (e) { url = ''; }

    if (init && init.body && url.indexOf('/api/room/create') !== -1) {
      try {
        var b = JSON.parse(init.body);
        b.stake = (b.mode === 'AI') ? 0 : COIN.chosen;
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
              toastMsg('سکه کافی نداری — ورودی این میز ' + num(d.need || 0) + ' سکه است');
            }
          }).catch(function () { /* ignore */ });
        } catch (e) { /* ignore */ }
        return res;
      }).catch(function () { /* ignore */ });
    }

    return p;
  };

  function toastMsg(text) {
    var t = $('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.remove('hidden');
    setTimeout(function () { t.classList.add('hidden'); }, 2800);
  }

  /* ============================================================
     ۲) کارت جایزه در پایان بازی
     ============================================================ */

  var lastResult = null;

  (function patchWS() {
    var Native = window.WebSocket;
    if (!Native) return;

    function Patched(url, protocols) {
      var ws = protocols === undefined ? new Native(url) : new Native(url, protocols);
      ws.addEventListener('message', function (ev) {
        var m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m) return;

        if (m.state && typeof m.state.stake === 'number') {
          COIN.chosen = m.state.stake;
          if (m.state.players && m.state.players.length) {
            COIN.seats = m.state.players.length;
          }
        }

        if (m.t === 'RESULT') {
          lastResult = m;
          setTimeout(renderPrize, 300);
        }
      });
      return ws;
    }

    Patched.prototype = Native.prototype;
    Patched.CONNECTING = 0; Patched.OPEN = 1;
    Patched.CLOSING = 2; Patched.CLOSED = 3;
    window.WebSocket = Patched;
  })();

  function renderPrize() {
    if (!lastResult) return;
    var box = $('overStats');
    if (!box || !box.parentNode) return;

    var old = $('lsxPrize');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var stake = Number(lastResult.stake || 0);
    var me = myId();
    var o = null;
    var arr = lastResult.outcomes || [];
    for (var i = 0; i < arr.length; i++) {
      if (Number(arr[i].tgId) === me) { o = arr[i]; break; }
    }

    var prize = o ? Number(o.coinsPrize || 0) : 0;
    var gained = o ? Number(o.coinsGained || 0) : 0;
    var balance = o ? Number(o.coinsBalance || 0) : COIN.balance;
    var fee = entryFee(stake, COIN.seats);

    if (stake <= 0 && gained <= 0) return;

    var card = document.createElement('div');
    card.id = 'lsxPrize';
    if (prize > 0) card.className = 'win';

    var head;
    if (prize > 0) {
      head = '<div class="big">🪙 <span>+' + num(prize) + '</span></div>' +
             '<div class="cap">جایزهٔ میز ' + stakeLabel(stake) +
             ' — ورودی تو ' + num(fee) + ' سکه بود</div>';
    } else if (stake > 0) {
      head = '<div class="big zero">این دور جایزه‌ای نبردی</div>' +
             '<div class="cap">' + num(fee) + ' سکه ورودی میز ' + stakeLabel(stake) + '</div>';
    } else {
      head = '<div class="big zero">میز دوستانه</div>';
    }

    var extra = (gained - prize) > 0
      ? '<div class="cap">🎁 پاداش بازی: +' + num(gained - prize) + ' سکه</div>'
      : '';

    card.innerHTML = head + extra +
      '<div class="bal">موجودی جدید: <b>' + num(balance) + '</b> سکه</div>';

    box.parentNode.insertBefore(card, box);
    if (balance > 0) setBalance(balance);
    if (prize > 0) haptic('heavy');
  }

  (function () {
    var over = $('overScreen');
    if (!over) return;
    new MutationObserver(function () {
      if (over.classList.contains('hidden')) return;
      renderPrize();
      setTimeout(refreshCoins, 900);
    }).observe(over, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ============================================================
     ۳) پنجرهٔ انتخاب مبلغ میز
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
     ۴) اتصال دکمه‌های لابی
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
      badge.textContent = COIN.chosen > 0
        ? '🪙 میز ' + stakeLabel(COIN.chosen) + ' — ورودی ' +
          num(entryFee(COIN.chosen, COIN.seats)) + ' سکه'
        : '🤝 میز دوستانه';
      badge.style.display = '';
    }).observe(lob, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ============================================================
     ۵) تاس سه‌بعدی
     ============================================================ */

  var dice = $('dice');
  var cube = $('diceCube');
  var valEl = $('diceValue');
  var layer = $('tokensLayer');

  var FACE = {
    1: { x: 0, y: 0 }, 2: { x: 0, y: 180 }, 3: { x: 0, y: -90 },
    4: { x: 0, y: 90 }, 5: { x: -90, y: 0 }, 6: { x: 90, y: 0 }
  };

  var rolling = false, rollStart = 0, landTimer = null, stopTimer = null;
  var lastVal = 0, settle = null;

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
     ۶) انیمیشن مهره‌ها
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
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['style']
    });
  }

})();
