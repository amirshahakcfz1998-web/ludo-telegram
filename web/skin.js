/* لودو استار — چرخش نما (رنگ خودم پایین) + جای تاس در مرکز لانه (نسخهٔ ۲) */
(function (global) {
  'use strict';

  var D = global.document;
  function $(id) { return D.getElementById(id); }

  var COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

  /* لانهٔ BLUE پایین-چپ است؛ رنگ خودم را به آن گوشه می‌چرخانیم */
  var ROT = { BLUE: 0, RED: -90, GREEN: 180, YELLOW: 90 };

  /* مرکز لانهٔ هر رنگ به درصد (شبکهٔ ۱۵) */
  var SPOT = {
    RED: { l: 20, t: 20 }, GREEN: { l: 80, t: 20 },
    YELLOW: { l: 80, t: 80 }, BLUE: { l: 20, t: 80 }
  };

  var myColor = null, mySeat = null;

  function setMyColor(c) {
    if (!c || c === myColor || ROT[c] === undefined) return;
    myColor = c;
    var deg = ROT[c];
    var r = D.documentElement.style;
    r.setProperty('--lbRot', deg + 'deg');
    r.setProperty('--lbCounter', (-deg) + 'deg');
  }

  /* خواندن صندلی و رنگ من از پیام‌های سرور */
  function sniffWs() {
    var OW = global.WebSocket;
    if (!OW || OW.__lbSniff) return;

    function Wrapped(url, protocols) {
      var ws = (arguments.length > 1) ? new OW(url, protocols) : new OW(url);
      ws.addEventListener('message', function (ev) {
        var m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (typeof m.seat === 'number') mySeat = m.seat;
        if (m.you && typeof m.you.seat === 'number') mySeat = m.you.seat;
        var st = m.state || m;
        if (st && st.players && mySeat !== null) {
          for (var i = 0; i < st.players.length; i++) {
            if (st.players[i].seat === mySeat) { setMyColor(st.players[i].color); return; }
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

  /* پشتیبان: رنگ مهرهٔ قابل حرکت = رنگ من */
  function fallbackColor() {
    var pick = function () {
      if (myColor) return;
      var layer = $('tokensLayer');
      if (!layer) return;
      var t = layer.querySelector('.token.movable');
      if (!t) return;
      var cn = ' ' + t.className + ' ';
      for (var i = 0; i < COLORS.length; i++) {
        if (cn.indexOf(' ' + COLORS[i] + ' ') !== -1) { setMyColor(COLORS[i]); return; }
      }
    };
    setInterval(pick, 1000);
  }

  /* جای تاس: مرکز لانهٔ رنگی */
  function css() {
    var s = [
      '.lb-pad{width:27%!important;height:27%!important;margin:-13.5% 0 0 -13.5%!important;',
      'border-radius:26px!important}',
      '.lb-pad::before{border-radius:22px!important;background:rgba(12,4,28,.26)!important;',
      'border:2px solid rgba(255,255,255,.16)!important}',
      '#dice.lb-onboard{transform:rotate(var(--lbCounter)) scale(.62)!important}',
      '.lb-pad .lb-mini{width:30%;height:30%;border-radius:8px;opacity:.35;',
      'background:linear-gradient(150deg,#fffdf6,#cbb9ec)}'
    ].join('');
    var st = $('lb-skin-style');
    if (st) { st.textContent = s; return; }
    st = D.createElement('style');
    st.id = 'lb-skin-style';
    st.textContent = s;
    (D.head || D.documentElement).appendChild(st);
  }

  function fixPads() {
    for (var i = 0; i < COLORS.length; i++) {
      var c = COLORS[i];
      var p = D.querySelector('.lb-pad.' + c);
      if (!p) continue;
      p.style.left = SPOT[c].l + '%';
      p.style.top = SPOT[c].t + '%';
    }
  }

  function start() {
    css();
    fallbackColor();
    setInterval(fixPads, 900);
    fixPads();
  }

  sniffWs();
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
