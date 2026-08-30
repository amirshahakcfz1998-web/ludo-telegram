/* لودو استار — پوستهٔ تخته: مهرهٔ تخت گرد، چیدمان متقارن، جای تاس، چرخش نما (مرحلهٔ ۶) */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }

  var COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
  var BASE = { RED: [0, 0], GREEN: [9, 0], YELLOW: [9, 9], BLUE: [0, 9] };

  /* رنگ خودم باید پایین-چپ باشد (جای BLUE) */
  var ROT = { BLUE: 0, RED: -90, GREEN: 180, YELLOW: 90 };

  /* مرکز خانهٔ هر رنگ به درصد — جای تاس */
  var SPOT = { RED: 20, GREEN: 80, YELLOW: 80, BLUE: 20 };

  var TONE = {
    RED: ['#ff8093', '#f2314c', '#7d0c24'],
    GREEN: ['#7bf0bd', '#22c07d', '#08543a'],
    YELLOW: ['#ffe58a', '#ffc32e', '#8f5900'],
    BLUE: ['#9ccfff', '#3b9bff', '#0d3872']
  };

  /* ---------- ۱) چیدمان متقارن مهره‌ها در خانه ---------- */
  function fixBaseSlots() {
    var B = global.LudoBoard;
    if (!B || !B.BASE_SLOTS) return false;
    COLORS.forEach(function (c) {
      var bx = BASE[c][0], by = BASE[c][1], d = 1.2, m = 2.5;
      B.BASE_SLOTS[c] = [
        { x: bx + m - d, y: by + m - d },
        { x: bx + m + d, y: by + m - d },
        { x: bx + m - d, y: by + m + d },
        { x: bx + m + d, y: by + m + d }
      ];
    });
    return true;
  }

  /* ---------- ۲) استایل: مهرهٔ تخت گرد + جای تاس + چرخش ---------- */
  function css() {
    var s = [
      ':root{--lbCounter:0deg}',

      /* چرخش نمای تخته */
      '#board{transform:rotate(var(--lbRot,0deg));transition:transform .45s cubic-bezier(.3,.9,.3,1)}',

      /* مهرهٔ گرد و تخت مثل عکس مرجع */
      '.tokens-layer .token{width:9.4%!important;height:9.4%!important;',
      'margin:-4.7% 0 0 -4.7%!important;border-radius:50%!important;',
      'box-sizing:border-box!important;padding:0!important;background:none!important;',
      'border:0!important;box-shadow:none!important;display:block!important;',
      'transform:none;transition:none}',

      '.tokens-layer .token::before{content:"";position:absolute;inset:0;border-radius:50%;',
      'background:radial-gradient(circle at 50% 38%,var(--c1),var(--c2) 58%,var(--c3) 100%);',
      'box-shadow:inset 0 0 0 2px rgba(255,255,255,.9),inset 0 -3px 5px rgba(0,0,0,.28),',
      '0 2px 4px rgba(6,1,18,.55)}',

      '.tokens-layer .token .cap{position:absolute!important;left:50%!important;top:50%!important;',
      'width:40%!important;height:40%!important;margin:-20% 0 0 -20%!important;border-radius:50%!important;',
      'background:rgba(255,255,255,.94)!important;',
      'box-shadow:inset 0 -1px 2px rgba(0,0,0,.22),0 0 0 1.5px rgba(255,255,255,.5)!important;',
      'border:0!important;z-index:2}',

      '.tokens-layer .token .gloss{position:absolute!important;left:22%!important;top:14%!important;',
      'width:56%!important;height:32%!important;border-radius:50%!important;',
      'background:linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,0))!important;',
      'z-index:3;pointer-events:none}',

      '.token.RED{--c1:' + TONE.RED[0] + ';--c2:' + TONE.RED[1] + ';--c3:' + TONE.RED[2] + '}',
      '.token.GREEN{--c1:' + TONE.GREEN[0] + ';--c2:' + TONE.GREEN[1] + ';--c3:' + TONE.GREEN[2] + '}',
      '.token.YELLOW{--c1:' + TONE.YELLOW[0] + ';--c2:' + TONE.YELLOW[1] + ';--c3:' + TONE.YELLOW[2] + '}',
      '.token.BLUE{--c1:' + TONE.BLUE[0] + ';--c2:' + TONE.BLUE[1] + ';--c3:' + TONE.BLUE[2] + '}',

      /* مهرهٔ قابل حرکت */
      '.token.movable{cursor:pointer}',
      '.token.movable::after{content:"";position:absolute;inset:-22%;border-radius:50%;',
      'border:2px solid rgba(255,232,140,.95);animation:lbSel 1.1s ease-in-out infinite}',
      '@keyframes lbSel{0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}',

      /* عدد پشته — همیشه صاف */
      '.token[data-stack]{overflow:visible}',
      '.token[data-stack]::after{content:attr(data-stack);position:absolute;right:-16%;top:-20%;',
      'min-width:44%;height:44%;line-height:1;padding:2px;border-radius:999px;',
      'background:#1b0a30;color:#fff;font-size:9px;font-weight:700;',
      'display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(255,255,255,.75);',
      'transform:rotate(var(--lbCounter));animation:none;inset:auto}',

      /* جای تاس: مرکز خانهٔ رنگی */
      '.lb-pad{width:26%!important;height:26%!important;margin:-13% 0 0 -13%!important;border-radius:26px!important}',
      '.lb-pad::before{border-radius:22px!important;background:rgba(12,4,28,.28)!important}',
      '#dice.lb-onboard{transform:rotate(var(--lbCounter)) scale(.6)!important}',
      '.fx-layer .fx{transform:rotate(var(--lbCounter))}'
    ].join('');

    if ($('lb-skin-style')) { $('lb-skin-style').textContent = s; return; }
    var st = D.createElement('style');
    st.id = 'lb-skin-style';
    st.textContent = s;
    (D.head || D.documentElement).appendChild(st);
  }

  /* ---------- ۳) چرخش نما بر پایهٔ رنگ خودم ---------- */
  var myColor = null;

  function setMyColor(c) {
    if (!c || c === myColor || ROT[c] === undefined) return;
    myColor = c;
    var deg = ROT[c];
    D.documentElement.style.setProperty('--lbRot', deg + 'deg');
    D.documentElement.style.setProperty('--lbCounter', (-deg) + 'deg');
  }

  /* الف) خواندن صندلی و رنگ از پیام‌های سرور */
  var mySeat = null;

  function sniffWs() {
    var OW = global.WebSocket;
    if (!OW || OW.__lbSniff) return;

    function Wrapped(url, protocols) {
      var ws = (arguments.length > 1) ? new OW(url, protocols) : new OW(url);
      ws.addEventListener('message', function (ev) {
        var m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.t === 'WELCOME' && typeof m.seat === 'number') mySeat = m.seat;
        var st = m.state;
        if (st && st.players && mySeat !== null) {
          for (var i = 0; i < st.players.length; i++) {
            if (st.players[i].seat === mySeat) { setMyColor(st.players[i].color); break; }
          }
        }
      });
      return ws;
    }
    Wrapped.prototype = OW.prototype;
    Wrapped.CONNECTING = 0; Wrapped.OPEN = 1; Wrapped.CLOSING = 2; Wrapped.CLOSED = 3;
    Wrapped.__lbSniff = true;
    global.WebSocket = Wrapped;
  }

  /* ب) پشتیبان: رنگ مهرهٔ قابل حرکت = رنگ من */
  function fallbackColor() {
    var layer = $('tokensLayer');
    if (!layer) return;
    var pick = function () {
      if (myColor) return;
      var t = layer.querySelector('.token.movable');
      if (!t) return;
      var cn = ' ' + t.className + ' ';
      for (var i = 0; i < COLORS.length; i++) {
        if (cn.indexOf(' ' + COLORS[i] + ' ') !== -1) { setMyColor(COLORS[i]); return; }
      }
    };
    if (global.MutationObserver) {
      new MutationObserver(pick).observe(layer, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['class']
      });
    }
    setInterval(pick, 1200);
  }

  /* ---------- ۴) اصلاح جای تاس‌ها ---------- */
  function fixPads() {
    for (var i = 0; i < COLORS.length; i++) {
      var c = COLORS[i];
      var p = D.querySelector('.lb-pad.' + c);
      if (!p) continue;
      p.style.left = SPOT[c] + '%';
      p.style.top = (c === 'RED' || c === 'GREEN' ? 20 : 80) + '%';
    }
  }

  /* ---------- راه‌اندازی ---------- */
  function start() {
    if (!fixBaseSlots()) { setTimeout(start, 200); return; }
    css();
    sniffWs();
    fallbackColor();
    setInterval(fixPads, 1000);
    fixPads();

    var grid = $('boardGrid');
    if (grid && global.LudoBoard) {
      try { global.LudoBoard.renderGrid(grid); } catch (e) { }
    }
  }

  sniffWs();
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
