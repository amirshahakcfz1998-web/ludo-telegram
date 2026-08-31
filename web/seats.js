/* لودو استار — HUD بازیکنان (چهار گوشه) + جایگاه تاس نوبت‌دار (نسخهٔ ۳) */

(function (global) {
  'use strict';
  var D = global.document;
  function $(id) { return D.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
    });
  }

  var ROT = { RED: -90, GREEN: 180, YELLOW: 90, BLUE: 0 };
  var IDX = { RED: 0, GREEN: 1, YELLOW: 2, BLUE: 3 };     /* tl,tr,br,bl */
  var CORNER = ['tl', 'tr', 'br', 'bl'];
  var TINT = { RED: '#f2314c', GREEN: '#22c07d', YELLOW: '#ffc32e', BLUE: '#3b9bff' };

  var CSS = [
    '.players-strip{display:none!important}',
    '.board-wrap{position:relative!important;padding:4px 6px!important}',

    '.lb-row{display:flex;align-items:center;justify-content:space-between;gap:8px;',
    'padding:6px 12px;position:relative;z-index:14}',
    '.lb-row.bottom{padding:2px 12px 6px}',

    '.lb-hud{display:flex;align-items:center;gap:7px;min-width:0;max-width:49%;',
    'padding:5px 10px 5px 5px;border-radius:18px;color:#fff;opacity:.7;',
    'background:linear-gradient(180deg,rgba(74,36,126,.92),rgba(28,11,54,.94));',
    'border:1.5px solid rgba(255,255,255,.12);',
    'box-shadow:0 8px 18px rgba(6,2,18,.5),inset 0 1px 0 rgba(255,255,255,.16);',
    'transition:opacity .25s,border-color .25s,box-shadow .25s}',
    '.lb-hud.hide{visibility:hidden}',
    '.lb-hud.on{opacity:1;border-color:#ffd66b;',
    'box-shadow:0 0 18px rgba(255,214,107,.45),0 8px 18px rgba(6,2,18,.5),inset 0 1px 0 rgba(255,255,255,.2)}',

    '.lb-ava{position:relative;width:36px;height:36px;flex:none;border-radius:50%;overflow:hidden;',
    'display:grid;place-items:center;font-size:15px;font-weight:900;line-height:1;',
    'background:linear-gradient(160deg,#5c2e99,#2a1049);',
    'box-shadow:0 0 0 2px var(--t,#fff),0 2px 6px rgba(0,0,0,.45)}',
    '.lb-ava img{width:100%;height:100%;object-fit:cover;display:block}',
    '.lb-hud.on .lb-ava{animation:lbHudPulse 1.4s ease-in-out infinite}',
    '@keyframes lbHudPulse{0%,100%{box-shadow:0 0 0 2px var(--t,#fff),0 0 0 rgba(255,214,107,.6)}',
    '50%{box-shadow:0 0 0 2px var(--t,#fff),0 0 12px 3px rgba(255,214,107,.7)}}',

    '.lb-body{min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.lb-nm{font-size:11.5px;font-weight:800;line-height:1.2;max-width:96px;',
    'overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.lb-sub{font-size:10px;font-weight:700;opacity:.82;display:flex;align-items:center;gap:5px}',

    '.lb-slot{width:0;height:46px;display:grid;place-items:center;overflow:visible;',
    'pointer-events:auto;transition:width .28s ease}',
    '.lb-hud.on .lb-slot{width:46px}',
    '#dice.lb-seated{width:72px!important;height:72px!important;margin:-13px!important;',
    'transform:scale(.62)!important;cursor:pointer}',
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
    return '<span class="lb-ava"></span>' +
           '<span class="lb-body"><span class="lb-nm"></span>' +
           '<span class="lb-sub"><span class="hm"></span><span class="st"></span></span></span>' +
           '<span class="lb-slot"></span>';
  }

  function ensureRows() {
    if ($('lbRowTop') && $('lbRowBottom')) return true;
    var wrap = D.querySelector('.board-wrap');
    if (!wrap || !wrap.parentNode) return false;

    function row(id, cls, corners) {
      var el = $(id);
      if (el) return el;
      el = D.createElement('div');
      el.id = id;
      el.className = 'lb-row ' + cls;
      corners.forEach(function (c) {
        var card = D.createElement('div');
        card.className = 'lb-hud ' + c + ' hide';
        card.innerHTML = cardHtml();
        el.appendChild(card);
        cards[c] = card;
      });
      return el;
    }

    var top = row('lbRowTop', 'top', ['tl', 'tr']);
    var bot = row('lbRowBottom', 'bottom', ['bl', 'br']);
    if (!top.parentNode) wrap.parentNode.insertBefore(top, wrap);
    if (!bot.parentNode) wrap.parentNode.insertBefore(bot, wrap.nextSibling);

    var old = $('lbSeats');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    return true;
  }

  function shortName(s) {
    s = String(s || '').replace(/^🤖\s*/, '');
    return s.length > 11 ? s.slice(0, 11) + '…' : s;
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
    var A = global.LudoState, B = global.LudoSeat;
    if (A && A.players && A.players.length) return A;
    return B || null;
  }

  function render() {
    if (!ensureRows()) return;
    var S = readState();
    if (!S) return;

    var deg = (ROT[S.color] === undefined) ? 0 : ROT[S.color];
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

      var av = el.querySelector('.lb-ava');
      var html = avatar(p);
      if (av.getAttribute('data-h') !== html) {
        av.setAttribute('data-h', html);
        av.innerHTML = html;
      }
      el.querySelector('.lb-nm').textContent = shortName(p.name);
      el.querySelector('.hm').textContent = '🏠 ' + (p.finished || 0) + '/4';
      el.querySelector('.st').textContent = statusIcon(p.status);

      if (S.status === 'PLAYING' && p.seat === S.turnSeat) el.classList.add('on');
    }

    var dice = $('dice');
    if (!dice) return;
    var host = null;
    CORNER.forEach(function (c) {
      if (cards[c] && cards[c].classList.contains('on')) host = cards[c].querySelector('.lb-slot');
    });

    if (host) {
      if (dice.parentNode !== host) {
        host.appendChild(dice);
        dice.classList.add('lb-seated');
      }
    } else {
      var area = D.querySelector('.dice-area');
      if (area && dice.parentNode !== area) {
        area.insertBefore(dice, area.firstChild);
        dice.classList.remove('lb-seated');
      }
    }
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
    ensureRows();
    bindDiceTap();
    D.addEventListener('lb:state', render);
    D.addEventListener('lb:seat', render);
    setInterval(function () { bindDiceTap(); render(); }, 700);
    render();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
