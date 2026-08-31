/* لودو استار — وصلهٔ نهایی: تاس مطمئن + حرکت خانه‌به‌خانهٔ مهره */
(function (global) {
  'use strict';
  var D = global.document;
  function $(id) { return D.getElementById(id); }

  /* ---------- ۱) تاس: تشخیص مطمئن پرتاب ---------- */
  var lastVer = -1, lastDice = -1, lastFire = 0;

  function tryRoll() {
    var S = global.LudoState;
    if (!S || S.status !== 'PLAYING') return;

    var ver = S.version || 0;
    var val = S.dice || 0;

    /* اولین بار فقط ثبت کن، انیمیشن نده */
    if (lastVer === -1) { lastVer = ver; lastDice = val; return; }

    /* تاس تازه وقتی مقدار عوض شود یا فاز به MOVE برود */
    var fresh = (val >= 1 && val <= 6) && (val !== lastDice || ver !== lastVer);
    lastVer = ver; lastDice = val;
    if (!fresh) return;

    var now = Date.now();
    if (now - lastFire < 900) return;   /* ضد تکرار */
    lastFire = now;

    if (global.LudoDice && global.LudoDice.roll) global.LudoDice.roll(val);
  }

  D.addEventListener('lb:state', tryRoll);
  setInterval(tryRoll, 250);

  /* ---------- ۲) آزادکردن قفلِ گیرکرده ---------- */
  setInterval(function () {
    var G = global.LudoGate;
    if (!G) return;
    /* اگر دروازه بیش از ۵ ثانیه باز مانده، آزادش کن */
    if (G.until && G.until - Date.now() > 5000) G.until = 0;
  }, 1000);

  /* ---------- ۳) حرکت خانه‌به‌خانهٔ مهره ---------- */
  var B = null, hops = {};

  function board() {
    if (!B) B = global.LudoBoard || global.Board || global.B;
    return B;
  }

  function styleOnce() {
    if ($('lb-patch-style')) return;
    var st = D.createElement('style');
    st.id = 'lb-patch-style';
    st.textContent =
      '.tokens-layer .token{transition:left .17s linear,top .17s linear!important}' +
      '.tokens-layer .token.lb-hop{transition:left .16s ease-in-out,top .16s ease-in-out!important;' +
      'z-index:12!important}';
    (D.head || D.documentElement).appendChild(st);
  }

  /* مهره را خانه‌به‌خانه تا مقصد می‌برد */
  function hopTo(el, color, from, to) {
    var Bd = board();
    if (!Bd || !Bd.cellOf || !Bd.toPercent) return false;
    if (!(to > from)) return false;
    if (to - from > 6) return false;      /* ورود از پایگاه: پرش مستقیم */

    var key = el.dataset.key;
    if (hops[key]) return true;
    hops[key] = true;

    var p = from;
    el.classList.add('lb-hop');

    (function step() {
      p++;
      if (p > to) {
        el.classList.remove('lb-hop');
        delete hops[key];
        return;
      }
      var c = Bd.cellOf(color, p, 0);
      if (c) {
        var pos = Bd.toPercent(c);
        el.style.left = pos.left + '%';
        el.style.top = pos.top + '%';
      }
      setTimeout(step, 170);
    })();

    return true;
  }

  /* موقعیت مهره‌ها را رصد می‌کند */
  var seen = {};

  function watchTokens() {
    var S = global.LudoState;
    if (!S || S.status !== 'PLAYING' || !S.players) return;

    var layer = $('tokensLayer');
    if (!layer) return;

    for (var i = 0; i < S.players.length; i++) {
      var pl = S.players[i];
      if (!pl.tokens) continue;
      for (var k = 0; k < pl.tokens.length; k++) {
        var tk = pl.tokens[k];
        var id = pl.seat + '-' + tk.i;
        var prev = seen[id];
        seen[id] = tk.p;

        if (prev === undefined || prev === tk.p) continue;

        var el = layer.querySelector('[data-key="' + id + '"]');
        if (el) hopTo(el, pl.color, prev, tk.p);
      }
    }
  }

  function start() {
    styleOnce();
    D.addEventListener('lb:state', watchTokens);
    setInterval(watchTokens, 220);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
