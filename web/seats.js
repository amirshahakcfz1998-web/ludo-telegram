/* لودو استار — آواتار/تاس/تایمر گوشهٔ خانهٔ هر بازیکن + چرخش تخته (نسخهٔ ۵) */

(function (global) {
  'use strict';
  var D = global.document;
  function $(id) { return D.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  /* چیدمان طبیعی تخته: RED=بالا‑چپ، GREEN=بالا‑راست، YELLOW=پایین‑راست، BLUE=پایین‑چپ */
  var ROT = { RED: -90, GREEN: 180, YELLOW: 90, BLUE: 0 };
  var IDX = { RED: 0, GREEN: 1, YELLOW: 2, BLUE: 3 };
  var CORNER = ['tl', 'tr', 'br', 'bl'];
  var TINT = { RED: '#f2314c', GREEN: '#22c07d', YELLOW: '#ffc32e', BLUE: '#3b9bff' };

  var C = 131.95;   /* محیط حلقهٔ تایمر (r=21) */

  var CSS = [
    '.players-strip{display:none!important}',
    '.timer-bar{position:absolute!important;left:0!important;right:0!important;top:0!important;',
    'height:2px!important;opacity:0!important;pointer-events:none!important;z-index:-1!important}',

    '.board-wrap{position:relative!important;padding:56px 4px 58px!important;overflow:visible!important}',

    '.lb-hud{position:absolute;z-index:16;direction:ltr;display:flex;align-items:center;gap:7px;',
    'max-width:47%;padding:5px 10px 5px 5px;border-radius:20px;color:#fff;opacity:.7;',
    'background:linear-gradient(180deg,rgba(74,36,126,.94),rgba(28,11,54,.96));',
    'border:1.5px solid rgba(255,255,255,.12);transform:scale(.96);',
    'box-shadow:0 8px 18px rgba(6,2,18,.5),inset 0 1px 0 rgba(255,255,255,.16);',
    'transition:opacity .3s ease,transform .3s cubic-bezier(.3,.9,.3,1),',
    'border-color .3s ease,box-shadow .3s ease}',
    '.lb-hud.hide{display:none}',
    '.lb-hud.on{opacity:1;transform:scale(1);border-color:#ffd66b;',
    'box-shadow:0 0 18px rgba(255,214,107,.45),0 8px 18px rgba(6,2,18,.5),inset 0 1px 0 rgba(255,255,255,.2)}',
    '.lb-hud.tr,.lb-hud.br{flex-direction:row-reverse;padding:5px 5px 5px 10px}',

    '.lb-ava{position:relative;width:46px;height:46px;flex:none}',
    '.lb-tmr{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}',
    '.lb-tmr .tk{fill:none;stroke:rgba(255,255,255,.15);stroke-width:3.6}',
    '.lb-tmr .tp{fill:none;stroke:#4be08a;stroke-width:3.6;stroke-linecap:round;',
    'stroke-dasharray:' + C + ';stroke-dashoffset:' + C + ';transition:stroke .35s ease}',
    '.lb-face{position:absolute;inset:5px;border-radius:50%;overflow:hidden;display:grid;',
    'place-items:center;font-size:15px;font-weight:900;line-height:1;',
    'background:linear-gradient(160deg,#5c2e99,#2a1049);',
    'box-shadow:0 0 0 2px var(--t,#fff),0 2px 6px rgba(0,0,0,.45)}',
    '.lb-face img{width:100%;height:100%;object-fit:cover;display:block}',

    '.lb-body{min-width:0;display:flex;flex-direction:column;gap:2px;direction:rtl}',
    '.lb-nm{font-size:11.5px;font-weight:800;line-height:1.2;max-width:88px;',
    'overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.lb-sub{font-size:10px;font-weight:700;opacity:.85;display:flex;align-items:center;gap:5px}',

    '.lb-slot{width:0;height:44px;display:grid;place-items:center;overflow:visible;',
    'pointer-events:auto;transition:width .3s cubic-bezier(.3,.9,.3,1)}',
    '.lb-hud.on .lb-slot{width:44px}',

    /* ترنسفورم تاس ترکیبی: جابه‌جایی نرم (FLIP) + مقیاس */
    '#dice{transform:var(--lbMove,translate(0,0)) scale(var(--lbScale,1))!important;',
    'transform-origin:50% 50%!important}',
    '#dice.lb-seated{--lbScale:.58;margin:-14px!important;cursor:pointer}',
    '.dice-area:empty{display:none}'
  ].join('');

  function css() {
    var st = $('lb-seats-style');
    if (!st) {
      st = D.createElement('style');
      st.id = 'lb-seats-style';
      (D.head || D.documentElement).appendChild(st);
    }
    if (st.textContent !== CSS) st.textContent = CSS;
  }

  var cards = {};

  function cardHtml() {
    return '<span class="lb-ava">' +
             '<svg class="lb-tmr" viewBox="0 0 46 46">' +
               '<circle class="tk" cx="23" cy="23" r="21"></circle>' +
               '<circle class="tp" cx="23" cy="23" r="21"></circle>' +
             '</svg><span class="lb-face"></span></span>' +
           '<span class="lb-body"><span class="lb-nm"></span>' +
           '<span class="lb-sub"><span class="hm"></span><span class="st"></span></span></span>' +
           '<span class="lb-slot"></span>';
  }

  function ensureCards() {
    var wrap = D.querySelector('.board-wrap');
    if (!wrap) return false;
    ['lbRowTop', 'lbRowBottom', 'lbSeats'].forEach(function (id) {
      var o = $(id);
      if (o && o.parentNode) o.parentNode.removeChild(o);
    });
    CORNER.forEach(function (c) {
      if (cards[c] && cards[c].parentNode === wrap) return;
      var el = D.createElement('div');
      el.className = 'lb-hud ' + c + ' hide';
      el.innerHTML = cardHtml();
      wrap.appendChild(el);
      cards[c] = el;
    });
    return true;
  }

  /* هر کارت را دقیقاً روی گوشهٔ خانهٔ خودش می‌چسباند */
  function place() {
    var wrap = D.querySelector('.board-wrap');
    var frame = D.querySelector('.board-frame');
    if (!wrap || !frame || !frame.offsetWidth) return;
    var fl = frame.offsetLeft, ft = frame.offsetTop;
    var fw = frame.offsetWidth, fh = frame.offsetHeight;
    var rightGap = Math.max(0, wrap.clientWidth - fl - fw);

    CORNER.forEach(function (c) {
      var el = cards[c];
      if (!el || el.classList.contains('hide')) return;
      var h = el.offsetHeight || 54;
      var isTop = (c === 'tl' || c === 'tr');
      var isLeft = (c === 'tl' || c === 'bl');
      el.style.top = (isTop ? Math.max(0, ft - h - 6) : ft + fh + 6) + 'px';
      if (isLeft) { el.style.left = fl + 'px'; el.style.right = 'auto'; }
      else { el.style.right = rightGap + 'px'; el.style.left = 'auto'; }
    });
  }

  function shortName(s) {
    s = String(s || '').replace(/^🤖\s*/, '');
    return s.length > 10 ? s.slice(0, 10) + '…' : s;
  }

  function avatar(p) {
    if (p.photo) return '<img src="' + esc(p.photo) + '" alt="">';
    if (p.isAI || String(p.name || '').indexOf('🤖') === 0) return '🤖';
    var n = String(p.name || '').trim();
    return n ? esc(n.charAt(0).toUpperCase()) : '👤';
  }

  function statusIcon(st) {
    return st === 'ONLINE' ? '🟢' : st === 'IDLE' ? '🟡' : st === 'DISCONNECTED' ? '🔴'
      : st === 'BOT_CONTROLLED' ? '🤖' : st === 'LEFT' ? '⚫' : '⚪';
  }

  function readState() {
    var A = global.LudoState;
    if (A && A.players && A.players.length) return A;
    return global.LudoSeat || null;
  }

  function myColor(S) {
    var B = global.LudoSeat;
    if (B && B.color) return B.color;
    return S ? S.color : null;
  }

  /* ---- انتقال نرم تاس بین بازیکنان (FLIP) ---- */
  function busyNow() {
    var G = global.LudoGate;
    return !!(G && G.until && Date.now() < G.until);
  }

  function moveDice(host, seated) {
    var dice = $('dice');
    if (!dice || dice.parentNode === host) return;
    if (busyNow()) return;                 /* وسط چرخش تاس جابه‌جا نمی‌شود */

    var from = dice.getBoundingClientRect();
    host.appendChild(dice);
    dice.classList.toggle('lb-seated', !!seated);
    var to = dice.getBoundingClientRect();
    var dx = from.left - to.left, dy = from.top - to.top;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;

    dice.style.transition = 'none';
    dice.style.setProperty('--lbMove', 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)');
    requestAnimationFrame(function () {
      dice.style.transition = 'transform .45s cubic-bezier(.35,.9,.3,1)';
      dice.style.setProperty('--lbMove', 'translate(0,0)');
    });
  }

  function render() {
    if (!ensureCards()) return;
    var S = readState();
    if (!S) return;

    /* ✅ چرخش تخته — همان خطی که در نسخهٔ قبل جا افتاده بود */
    var col = myColor(S);
    var deg = (ROT[col] === undefined) ? 0 : ROT[col];
    var root = D.documentElement.style;
    root.setProperty('--lbRot', deg + 'deg');
    root.setProperty('--lbCounter', (-deg) + 'deg');
    var shift = deg / 90;

    CORNER.forEach(function (c) {
      if (!cards[c]) return;
      cards[c].classList.add('hide');
      cards[c].classList.remove('on');
    });

    var players = S.players || [], i;
    for (i = 0; i < players.length; i++) {
      var p = players[i];
      if (IDX[p.color] === undefined) continue;
      var ci = (((IDX[p.color] + shift) % 4) + 4) % 4;
      var el = cards[CORNER[ci]];
      if (!el) continue;

      el.classList.remove('hide');
      el.style.setProperty('--t', TINT[p.color] || '#fff');

      var face = el.querySelector('.lb-face');
      var html = avatar(p);
      if (face.getAttribute('data-h') !== html) {
        face.setAttribute('data-h', html);
        face.innerHTML = html;
      }
      el.querySelector('.lb-nm').textContent = shortName(p.name);
      el.querySelector('.hm').textContent = '🏠 ' + (p.finished || 0) + '/4';
      el.querySelector('.st').textContent = statusIcon(p.status);

      if (S.status === 'PLAYING' && p.seat === S.turnSeat) el.classList.add('on');
    }

    place();

    var host = null;
    CORNER.forEach(function (c) {
      if (cards[c] && cards[c].classList.contains('on')) host = cards[c].querySelector('.lb-slot');
    });
    if (host) moveDice(host, true);
    else {
      var area = D.querySelector('.dice-area');
      if (area) moveDice(area, false);
    }
  }

  /* ---------- تایمر حلقه‌ای دور آواتار ---------- */

  function timerRatio() {
    var f = $('timerFill');
    if (!f) return -1;
    var w = parseFloat(f.style.width);
    if (!isNaN(w)) return Math.max(0, Math.min(1, w / 100));
    var p = f.parentNode;
    if (!p || !p.offsetWidth) return -1;
    return Math.max(0, Math.min(1, f.offsetWidth / p.offsetWidth));
  }

  function tickRing() {
    var g = $('gameScreen');
    if (g && !g.classList.contains('hidden')) {
      var r = timerRatio();
      CORNER.forEach(function (c) {
        var el = cards[c];
        if (!el) return;
        var tp = el.querySelector('.lb-tmr .tp');
        if (!tp) return;
        var v = (el.classList.contains('on') && r >= 0) ? r : 0;
        tp.style.strokeDashoffset = (C * (1 - v)).toFixed(2);
        tp.style.stroke = v > 0.5 ? '#4be08a' : v > 0.22 ? '#ffc32e' : '#ff4d63';
      });
    }
    requestAnimationFrame(tickRing);
  }

  function bindDiceTap() {
    var dice = $('dice');
    if (!dice || dice.__lbTap) return;
    dice.__lbTap = true;
    dice.addEventListener('click', function () {
      var btn = $('btnRoll');
      if (btn && !btn.disabled) btn.click();
    });
  }

  function start() {
    css();
    ensureCards();
    bindDiceTap();
    D.addEventListener('lb:state', render);
    D.addEventListener('lb:seat', render);
    global.addEventListener('resize', place);
    setInterval(function () { css(); bindDiceTap(); render(); }, 700);
    render();
    requestAnimationFrame(tickRing);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
