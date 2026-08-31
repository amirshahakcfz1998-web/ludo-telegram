/* لودو استار — تاس آرام‌تر + حرکت روان مهره روی GPU (نسخهٔ ۸) */

/* ================== بخش ۰ — شنود وضعیت سرور ================== */
(function (g) {
  'use strict';
  var ST = {
    seat: null, color: null, players: [], turnSeat: null, status: null,
    phase: null, dice: null, rollSeq: 0
  };
  g.LudoState = ST;
  function emit() { try { document.dispatchEvent(new CustomEvent('lb:state')); } catch (e) { } }

  var OW = g.WebSocket;
  if (!OW || OW.__lbState) return;

  function W(u, p) {
    var ws = (p === undefined) ? new OW(u) : new OW(u, p);
    try {
      ws.addEventListener('message', function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'WELCOME' && typeof m.seat === 'number') ST.seat = m.seat;
        var s = m.state; if (!s) return;
        ST.status = s.status; ST.phase = s.phase; ST.turnSeat = s.turnSeat;
        ST.players = s.players || []; ST.dice = s.dice;
        ST.rollSeq = (s.diceHistory && s.diceHistory.length) || 0;
        if (ST.seat !== null) {
          for (var i = 0; i < ST.players.length; i++) {
            if (ST.players[i].seat === ST.seat) ST.color = ST.players[i].color;
          }
        }
        emit();
      });
    } catch (e) { }
    return ws;
  }
  W.prototype = OW.prototype;
  W.CONNECTING = 0; W.OPEN = 1; W.CLOSING = 2; W.CLOSED = 3;
  W.__lbState = true;
  g.WebSocket = W;
})(window);


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

  var BOX = 72, H = 30;

  var CSS = [
    '#dice{position:relative!important;width:' + BOX + 'px!important;height:' + BOX + 'px!important;',
    'perspective:620px!important;transform-style:preserve-3d!important;overflow:visible!important;',
    'background:none!important;border:0!important;box-shadow:none!important;flex:none!important}',
    '#dice .dice-raw{opacity:0!important;position:absolute!important;left:0!important;top:0!important;',
    'pointer-events:none!important}',
    '#dice .dice-shadow{position:absolute!important;left:50%!important;bottom:-3px!important;',
    'width:52px!important;height:12px!important;border-radius:50%!important;filter:none!important;',
    'background:radial-gradient(ellipse at center,rgba(8,2,22,.5),rgba(8,2,22,0) 72%)!important;',
    'transform:translateX(-50%)!important;animation:none!important}',
    '#diceCube{position:absolute!important;left:0!important;top:0!important;width:' + BOX + 'px!important;',
    'height:' + BOX + 'px!important;transform-style:preserve-3d!important;will-change:transform;',
    'transition:none!important;animation:none!important;background:none!important;box-shadow:none!important}',
    '#diceCube .face{position:absolute!important;left:' + ((BOX - H * 2) / 2) + 'px!important;',
    'top:' + ((BOX - H * 2) / 2) + 'px!important;width:' + (H * 2) + 'px!important;height:' + (H * 2) + 'px!important;',
    'border-radius:13px!important;box-sizing:border-box!important;padding:6px!important;',
    'direction:ltr!important;display:grid!important;',
    'grid-template-columns:repeat(3,1fr)!important;grid-template-rows:repeat(3,1fr)!important;',
    'backface-visibility:hidden!important;',
    'background:linear-gradient(150deg,#fffdf7 0%,#f2eaff 52%,#cdbcee 100%)!important;',
    'box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.92),inset 0 -7px 12px rgba(86,52,140,.26),',
    '0 2px 6px rgba(12,3,30,.35)!important}',
    '#diceCube .face i{width:11px!important;height:11px!important;border-radius:50%!important;',
    'align-self:center!important;justify-self:center!important;',
    'background:radial-gradient(circle at 32% 28%,#7b4bb5,#280b47)!important;',
    'box-shadow:inset 0 1px 1.5px rgba(255,255,255,.55),0 1px 1px rgba(0,0,0,.3)!important}',
    '#diceCube .fa{transform:translateZ(' + H + 'px)!important}',
    '#diceCube .fb{transform:rotateY(90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fc{transform:rotateX(90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fd{transform:rotateX(-90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .fe{transform:rotateY(-90deg) translateZ(' + H + 'px)!important}',
    '#diceCube .ff{transform:rotateY(180deg) translateZ(' + H + 'px)!important}',
    '#dice.lb-ready::after{content:"";position:absolute;inset:-12px;border-radius:26px;',
    'pointer-events:none;background:radial-gradient(circle,rgba(255,214,107,.42),rgba(255,214,107,0) 68%);',
    'animation:lbPulse 1.4s ease-in-out infinite}',
    '@keyframes lbPulse{0%,100%{opacity:.35;transform:scale(.94)}50%{opacity:.9;transform:scale(1.06)}}',
    '#dice.lb-land .face{box-shadow:inset 0 0 0 1.5px #fff,0 0 16px 4px rgba(255,214,107,.85)!important}'
  ].join('');

  function injectCss() {
    var st = $('lb-dice-style');
    if (!st) {
      st = D.createElement('style');
      st.id = 'lb-dice-style';
      (D.head || D.documentElement).appendChild(st);
    }
    if (st.textContent !== CSS) st.textContent = CSS;
  }

  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  function faceHtml(cls, num) {
    var list = PIPS[num], s = '<div class="face ' + cls + '">', k, i, r, c;
    for (k = 0; k < list.length; k++) {
      i = list[k];
      r = Math.floor(i / 3) + 1;
      c = (i % 3) + 1;
      s += '<i style="grid-row:' + r + ';grid-column:' + c + '"></i>';
    }
    return s + '</div>';
  }

  function build() {
    var dice = $('dice');
    if (!dice) return;
    var val = $('diceValue');
    if (val) val.classList.add('dice-raw');
    if (!dice.querySelector('.dice-shadow')) {
      var sh = D.createElement('div');
      sh.className = 'dice-shadow';
      dice.appendChild(sh);
    }
    var cube = $('diceCube');
    if (!cube) {
      cube = D.createElement('div');
      cube.id = 'diceCube';
      dice.appendChild(cube);
    }
    if (cube.getAttribute('data-lb') !== '8') {
      cube.setAttribute('data-lb', '8');
      cube.innerHTML = faceHtml('fa', 1) + faceHtml('fb', 2) + faceHtml('fc', 3) +
                       faceHtml('fd', 4) + faceHtml('fe', 5) + faceHtml('ff', 6);
    }
  }

  var FACE = { 1: { rx: 0, ry: 0 }, 2: { rx: 0, ry: -90 }, 3: { rx: -90, ry: 0 },
               4: { rx: 90, ry: 0 }, 5: { rx: 0, ry: 90 }, 6: { rx: 0, ry: 180 } };

  /* ⏱ سرعت پرتاب — عدد بزرگ‌تر = آرام‌تر */
  var TOTAL = 2200, LOCK = 1500;
  var SEGS = [[78, 620], [38, 460], [18, 340], [7, 240], [0, 540]];
  var SPIN = { x: 540, y: 360, z: 180 };

  var busy = false, raf = 0, lastValue = 1, lastRollAt = 0;

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
    cube.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (-h).toFixed(1) + 'px,0) ' +
      'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg) rotateZ(' + rz.toFixed(1) + 'deg) ' +
      'scale3d(' + (1 / sq).toFixed(3) + ',' + sq.toFixed(3) + ',1)';
    var shn = D.querySelector('#dice .dice-shadow');
    if (shn) {
      var k = Math.max(0.35, 1 - h / 120);
      shn.style.transform = 'translateX(-50%) translateX(' + (x * 0.55).toFixed(1) + 'px) scale(' + k.toFixed(2) + ')';
      shn.style.opacity = String(Math.max(0.2, k));
    }
  }

  function roll(value) {
    injectCss(); build();
    var dice = $('dice');
    if (!dice) return;
    var now0 = Date.now();
    if (busy || now0 - lastRollAt < 700) return;
    lastRollAt = now0;
    busy = true;

    var v = value || readValue() || lastValue;
    if (!(v >= 1 && v <= 6)) v = 1;
    lastValue = v;

    var startX = -24 - Math.random() * 10;
    var segIdx = -1, t0 = 0, locked = null;

    A('dice_roll'); haptic('medium');
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
          if (SEGS[i][0] > 4 && u > 0.87) sq = 1 - 0.12 * ((u - 0.87) / 0.13);
          break;
        }
        acc += SEGS[i][1];
      }
      if (idx > segIdx) {
        if (segIdx >= 0 && SEGS[segIdx][0] > 0) {
          A('dice_bounce', { strength: Math.min(1, SEGS[segIdx][0] / 78) });
          haptic('light');
        }
        segIdx = idx;
      }

      var p = el / TOTAL;
      var x = startX * (1 - easeOut(p));
      var e = easeOut(Math.min(1, el / (TOTAL * 0.94)));
      var rx = SPIN.x * e, ry = SPIN.y * e, rz = SPIN.z * e;

      if (el >= LOCK) {
        if (!locked) {
          var f = FACE[v];
          var eL = easeOut(Math.min(1, LOCK / (TOTAL * 0.94)));
          locked = {
            fromX: SPIN.x * eL, fromY: SPIN.y * eL, fromZ: SPIN.z * eL,
            toX: Math.ceil((SPIN.x * eL - f.rx) / 360) * 360 + f.rx,
            toY: Math.ceil((SPIN.y * eL - f.ry) / 360) * 360 + f.ry,
            toZ: Math.ceil((SPIN.z * eL) / 360) * 360
          };
        }
        var q = easeOut((el - LOCK) / (TOTAL - LOCK));
        rx = locked.fromX + (locked.toX - locked.fromX) * q;
        ry = locked.fromY + (locked.toY - locked.fromY) * q;
        rz = locked.fromZ + (locked.toZ - locked.fromZ) * q;
      }

      setCube(x, h, rx, ry, rz, sq);

      if (el < TOTAL) { raf = requestAnimationFrame(frame); return; }

      A('dice_settle'); haptic('success');
      dice.classList.add('lb-land');
      setTimeout(function () { dice.classList.remove('lb-land'); }, 420);
      busy = false;
    }

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  var lastSeq = -1, sniffOk = false, fbAt = 0;

  function onState() {
    var S = global.LudoState;
    if (!S || !S.rollSeq) return;
    if (S.rollSeq === lastSeq) return;
    var first = (lastSeq === -1);
    lastSeq = S.rollSeq;
    sniffOk = true;
    if (!first) roll(S.dice || 0);
  }

  function watchDice() {
    var dice = $('dice');
    if (!dice || !global.MutationObserver) return;
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].attributeName === 'class' && dice.classList.contains('rolling')) {
          dice.classList.remove('rolling');
          if (sniffOk) return;
          var t = Date.now();
          if (t - fbAt < 1500) return;
          fbAt = t;
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
      A('button_click'); haptic('select');
    });
    if (!global.MutationObserver) return;
    var sync = function () {
      var dice = $('dice');
      var ready = !btn.disabled && btn.classList.contains('ready');
      if (dice) dice.classList.toggle('lb-ready', ready);
    };
    new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ['class', 'disabled'] });
    sync();
  }

  function bridgeSounds() {
    if (!global.MutationObserver) return;
    var tn = $('turnName');
    if (tn) new MutationObserver(function () { A('turn_change', { throttle: 500 }); })
      .observe(tn, { childList: true, characterData: true, subtree: true });

    var over = $('overScreen');
    if (over) new MutationObserver(function () {
      if (over.classList.contains('hidden')) return;
      var t = ($('overTitle') && $('overTitle').textContent) || '';
      if (t.indexOf('بردی') !== -1) { A('victory'); haptic('success'); } else A('defeat');
    }).observe(over, { attributes: true, attributeFilter: ['class'] });

    setInterval(function () {
      var g = $('gameScreen'), f = $('timerFill');
      if (!g || !f || g.classList.contains('hidden')) return;
      if (f.classList.contains('critical')) A('countdown', { urgent: true, throttle: 900 });
      else if (f.classList.contains('low')) A('countdown', { throttle: 1900 });
    }, 500);
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
    injectCss(); build();
    setCube(0, 0, -18, 24, 0, 1);
    D.addEventListener('lb:state', onState);
    watchDice(); watchRollButton(); bridgeSounds(); bridgeSetting(); unlockOnce();
    setInterval(function () { injectCss(); build(); }, 1200);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();

  global.LudoDice = { roll: roll, throwTo: roll };
})(window);


/* ================== بخش ۲ — حرکت روان مهره (GPU) ================== */
(function (global) {
  'use strict';
  var D = global.document;
  function $(id) { return D.getElementById(id); }
  function A(n, o) { if (global.LudoAudio) { try { global.LudoAudio.play(n, o); } catch (e) { } } }
  function haptic(k) { if (global.LudoHaptic) global.LudoHaptic(k); }

  var B = null;

  /* ⏱ زمان هر خانه و پرش‌ها (میلی‌ثانیه) */
  var CFG = { step: 210, capture: 780, exit: 520, jump: 480 };
  global.LudoFx = CFG;

  var CSS = [
    /* حرکت با transform روی GPU؛ left/top ثابت می‌ماند */
    '.tokens-layer .token.lb-anim{transform:translate(-50%,-50%) var(--lbT,translate3d(0,0,0))!important;',
    'transition:none!important;animation:none!important;z-index:9!important;will-change:transform}',
    '.lb-spark{position:absolute;width:7px;height:7px;border-radius:50%;margin:-3.5px 0 0 -3.5px;',
    'pointer-events:none;z-index:11}',
    '.lb-ring{position:absolute;width:16%;height:16%;margin:-8% 0 0 -8%;border-radius:50%;',
    'border:3px solid rgba(255,255,255,.95);animation:lbRing .85s ease-out forwards;pointer-events:none}',
    '@keyframes lbRing{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(2.4)}}',
    '.lb-glow{position:absolute;width:18%;height:18%;margin:-9% 0 0 -9%;border-radius:50%;',
    'background:radial-gradient(circle,rgba(255,232,150,.9),rgba(255,214,107,0) 70%);',
    'animation:lbGlowFx .95s ease-out forwards;pointer-events:none}',
    '@keyframes lbGlowFx{0%{opacity:0;transform:scale(.4)}35%{opacity:1}100%{opacity:0;transform:scale(1.8)}}',
    '#board.lb-shake{animation:lbShake .4s ease-in-out}',
    '@keyframes lbShake{0%,100%{margin-left:0}25%{margin-left:-5px}60%{margin-left:5px}}',
    '#lbConfetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999}'
  ].join('');

  function injectCss() {
    var st = $('lb-fx-style');
    if (!st) {
      st = D.createElement('style');
      st.id = 'lb-fx-style';
      (D.head || D.documentElement).appendChild(st);
    }
    if (st.textContent !== CSS) st.textContent = CSS;
  }

  var LK = {};
  function buildLookup() {
    B.COLORS.forEach(function (c) {
      var arr = [], i, p;
      for (i = 0; i < 4; i++) {
        var s = B.BASE_SLOTS[c][i];
        arr.push({ x: s.x, y: s.y, p: B.POS_BASE });
      }
      for (p = 0; p <= B.LAST_TRACK; p++) {
        var t = B.cellOf(c, p, 0);
        arr.push({ x: t.x, y: t.y, p: p });
      }
      for (p = B.HOME_ENTRY; p < B.POS_FINISH; p++) {
        var h = B.cellOf(c, p, 0);
        arr.push({ x: h.x, y: h.y, p: p });
      }
      var f = B.cellOf(c, B.POS_FINISH, 0);
      arr.push({ x: f.x, y: f.y, p: B.POS_FINISH });
      LK[c] = arr;
    });
  }

  function nearest(color, cell) {
    var a = LK[color];
    if (!a) return null;
    var best = null, bd = 1e9, i, dx, dy, d;
    for (i = 0; i < a.length; i++) {
      dx = a[i].x - cell.x; dy = a[i].y - cell.y; d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = a[i]; }
    }
    return bd <= 3 ? best : null;
  }

  function colorOf(el) {
    var cn = ' ' + el.className + ' ';
    for (var i = 0; i < B.COLORS.length; i++) {
      if (cn.indexOf(' ' + B.COLORS[i] + ' ') !== -1) return B.COLORS[i];
    }
    return null;
  }

  function put(el, cell) {
    var pos = B.toPercent(cell);
    el.style.left = pos.left + '%';
    el.style.top = pos.top + '%';
  }

  function cellFromStyle(el) {
    var l = parseFloat(el.style.left), t = parseFloat(el.style.top);
    if (isNaN(l) || isNaN(t)) return null;
    var unit = 100 / B.GRID;
    return { x: l / unit - 0.5, y: t / unit - 0.5 };
  }

  function cellPx() {
    var layer = $('tokensLayer');
    if (!layer || !layer.clientWidth) return 20;
    return layer.clientWidth / B.GRID;
  }

  /* حرکت پیوسته روی مسیر؛ هیچ وقفه‌ای بین خانه‌ها نیست */
  function animate(el, path, perStep, mode) {
    if (path.length < 2) return;
    el.__lbBusy = true;

    var cw = cellPx();
    var start = path[0];
    var end = path[path.length - 1];
    put(el, start);
    el.classList.add('lb-anim');
    el.style.setProperty('--lbT', 'translate3d(0,0,0)');

    var total = (path.length - 1) * perStep;
    var lift = mode === 'spin' ? 0.55 : mode === 'exit' ? 0.45 : 0.3;
    var t0 = 0, lastSeg = -1;

    function fr(now) {
      if (!t0) t0 = now;
      var t = Math.min(1, (now - t0) / total);
      var f = t * (path.length - 1);
      var i = Math.min(path.length - 2, Math.floor(f));
      var u = f - i;
      var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      var a = path[i], b = path[i + 1];

      if (i !== lastSeg) {
        lastSeg = i;
        if (mode === 'walk') A('token_move', { step: i + 1, total: path.length - 1 });
      }

      var x = (a.x + (b.x - a.x) * e - start.x) * cw;
      var y = (a.y + (b.y - a.y) * e - start.y) * cw - lift * Math.sin(Math.PI * u) * cw;
      var tr = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
      if (mode === 'spin') tr += ' rotate(' + (540 * t).toFixed(1) + 'deg)';
      el.style.setProperty('--lbT', tr);

      if (t < 1) { requestAnimationFrame(fr); return; }

      el.style.setProperty('--lbT', 'translate3d(0,0,0)');
      el.classList.remove('lb-anim');
      put(el, end);
      el.__lbCell = end;
      haptic(mode === 'spin' ? 'heavy' : 'light');
      setTimeout(function () { el.__lbBusy = false; }, 30);
    }
    requestAnimationFrame(fr);
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
        if (dx * dx + dy * dy < 0.4) continue;

        var color = colorOf(el);
        if (!color) continue;
        var a = nearest(color, was), b = nearest(color, now);
        if (!a || !b) continue;

        if (b.p === B.POS_BASE && a.p !== B.POS_BASE) {
          animate(el, [was, now], CFG.capture, 'spin');
        } else if (a.p === B.POS_BASE && b.p >= 0) {
          animate(el, [was, now], CFG.exit, 'exit');
        } else if (b.p > a.p && b.p - a.p <= 6) {
          var path = [was], p;
          for (p = a.p + 1; p <= b.p; p++) path.push(B.cellOf(color, p, 0));
          path[path.length - 1] = now;
          animate(el, path, CFG.step, 'walk');
        } else {
          animate(el, [was, now], CFG.jump, 'exit');
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
          node.style.transition = 'transform .7s cubic-bezier(.2,.7,.3,1),opacity .7s ease-out';
          node.style.transform = 'translate3d(' + (Math.cos(a) * dist).toFixed(0) + 'px,' +
            (Math.sin(a) * dist + 14).toFixed(0) + 'px,0) scale(.25)';
          node.style.opacity = '0';
        });
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 780);
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

  var fxSeen = {};
  function fxOnce(key) {
    var t = Date.now();
    if (fxSeen[key] && t - fxSeen[key] < 900) return false;
    fxSeen[key] = t;
    return true;
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
          if (!fxOnce(txt + '|' + l.toFixed(1) + '|' + t.toFixed(1))) continue;
          if (txt.indexOf('💥') !== -1) {
            A('token_capture'); haptic('heavy');
            overlay('lb-ring', l, t);
            sparks(l, t, ['#fff3c4', '#ff9a3c', '#ff4d63'], 12, 46);
            var bd = $('board');
            if (bd) { bd.classList.remove('lb-shake'); void bd.offsetWidth; bd.classList.add('lb-shake'); }
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
    setInterval(injectCss, 1500);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
