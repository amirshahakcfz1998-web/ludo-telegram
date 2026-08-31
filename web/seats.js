/* لودو استار — چیدمان چهارگوشهٔ بازیکنان + جایگاه تاس نوبت‌دار
   رنگ خودم همیشه پایین-چپ (چرخش تخته) */

(function (global) {
  'use strict';
  var D = global.document;
  function $(id) { return D.getElementById(id); }

  var ROT = { RED: -90, GREEN: 180, YELLOW: 90, BLUE: 0 };
  var IDX = { RED: 0, GREEN: 1, YELLOW: 2, BLUE: 3 };     /* TL,TR,BR,BL */
  var CORNER = ['tl', 'tr', 'br', 'bl'];
  var TINT = { RED: '#f2314c', GREEN: '#22c07d', YELLOW: '#ffc32e', BLUE: '#3b9bff' };

  var CSS = [
    '.players-strip{display:none!important}',
    '.board-wrap{position:relative!important;padding:42px 6px 46px!important}',

    '.lb-seats{position:absolute;inset:0;pointer-events:none;z-index:12}',
    '.lb-seat{position:absolute;display:flex;align-items:center;gap:6px;max-width:46%;',
    'padding:5px 9px;border-radius:15px;color:#fff;opacity:.62;',
    'background:linear-gradient(180deg,rgba(52,24,96,.85),rgba(24,8,48,.85));',
    'border:1px solid rgba(255,255,255,.14);',
    'font-family:inherit;font-size:11px;font-weight:800;line-height:1.2;',
    'box-shadow:0 6px 16px rgba(4,1,14,.5);transition:opacity .25s,box-shadow .25s,border-color .25s}',
    '.lb-seat.off{display:none}',
    '.lb-seat.on{opacity:1;border-color:rgba(255,214,107,.95);',
    'box-shadow:0 0 16px rgba(255,214,107,.5),0 6px 16px rgba(4,1,14,.5)}',
    '.lb-seat.tl{left:6px;top:0}',
    '.lb-seat.tr{right:6px;top:0}',
    '.lb-seat.bl{left:6px;bottom:0}',
    '.lb-seat.br{right:6px;bottom:0}',
    '.lb-seat .d{width:11px;height:11px;border-radius:50%;flex:none;background:var(--t,#fff);',
    'box-shadow:0 0 0 2px rgba(255,255,255,.25)}',
    '.lb-seat .nm{max-width:78px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
    '.lb-seat .hm{opacity:.75;font-weight:700}',
    '.lb-seat .slot{width:0;height:48px;overflow:visible;display:grid;place-items:center;',
    'pointer-events:auto;transition:width .28s ease}',
    '.lb-seat.on .slot{width:52px}',
    '#dice.lb-seated{transform:scale(.62)!important;cursor:pointer}',
    '.dice-area:empty{display:none}'
  ].join('');

  function css() {
    var st = $('lb-seats-style');
    if (st) { st.textContent = CSS; return; }
    st = D.createElement('style');
    st.id = 'lb-seats-style';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  var cards = {};

  function ensureBox() {
    if ($('lbSeats')) return true;
    var wrap = D.querySelector('.board-wrap');
    if (!wrap) return false;
    var box = D.createElement('div');
    box.id = 'lbSeats';
    box.className = 'lb-seats';
    CORNER.forEach(function (c) {
      var el = D.createElement('div');
      el.className = 'lb-seat ' + c + ' off';
      el.innerHTML = '<span class="d"></span><span class="nm"></span>' +
                     '<span class="hm"></span><span class="slot"></span>';
      box.appendChild(el);
      cards[c] = el;
    });
    wrap.appendChild(box);
    return true;
  }

  function shortName(s) {
    s = String(s || '');
    return s.length > 10 ? s.slice(0, 10) + '…' : s;
  }

  function render() {
    if (!ensureBox()) return;
    var S = global.LudoSeat;
    if (!S) return;

    var deg = (ROT[S.color] === undefined) ? 0 : ROT[S.color];
    var root = D.documentElement.style;
    root.setProperty('--lbRot', deg + 'deg');
    root.setProperty('--lbCounter', (-deg) + 'deg');
    var shift = deg / 90;

    CORNER.forEach(function (c) {
      cards[c].classList.add('off');
      cards[c].classList.remove('on');
    });

    var players = S.players || [];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (IDX[p.color] === undefined) continue;
      var ci = (((IDX[p.color] + shift) % 4) + 4) % 4;
      var el = cards[CORNER[ci]];
      if (!el) continue;
      el.classList.remove('off');
      el.style.setProperty('--t', TINT[p.color] || '#fff');
      el.querySelector('.nm').textContent = shortName(p.name);
      el.querySelector('.hm').textContent = '🏠 ' + (p.finished || 0) + '/4';
      if (S.status === 'PLAYING' && p.seat === S.turnSeat) el.classList.add('on');
    }

    var dice = $('dice');
    if (!dice) return;
    var host = null;
    CORNER.forEach(function (c) {
      if (cards[c].classList.contains('on')) host = cards[c].querySelector('.slot');
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
    ensureBox();
    bindDiceTap();
    D.addEventListener('lb:seat', render);
    setInterval(function () { bindDiceTap(); render(); }, 700);
    render();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
