/* لودو استار — وصلهٔ نهایی: ضدتکرار + تاس مطمئن + حرکت خانه‌به‌خانه */
(function (global) {
  'use strict';
  var D = global.document;
  function $(id) { return D.getElementById(id); }

  /* اگر این وصله دو بار لود شد، دومی کاری نکند */
  if (global.__lbPatch) return;
  global.__lbPatch = true;

  /* ---------- ۱) آزادکردن قفل گیرکردهٔ تاس ---------- */
  setInterval(function () {
    var G = global.LudoGate;
    if (G && G.until && G.until - Date.now() > 5000) G.until = 0;
  }, 1000);

  /* ---------- ۲) حرکت خانه‌به‌خانهٔ مهره ---------- */
  var B = global.LudoBoard;
  var busyTok = {}, seen = {}, ready = false;

  function styleOnce() {
    if ($('lb-patch-style')) return;
    var st = D.createElement('style');
    st.id = 'lb-patch-style';
    st.textContent =
      '.tokens-layer .token{transition:left .16s linear,top .16s linear}' +
      '.tokens-layer .token.lb-hop{z-index:14}';
    (D.head || D.documentElement).appendChild(st);
  }

  function hopTo(el, color, from, to, tokenIndex) {
    if (!B || !B.cellOf || !B.toPercent) return;
    if (!(to > from)) return;
    if (from < 0) return;              /* خروج از پایگاه: پرش مستقیم */
    if (to - from > 6) return;

    var key = el.getAttribute('data-key');
    if (busyTok[key]) return;
    busyTok[key] = true;

    var p = from;
    el.classList.add('lb-hop');

    (function step() {
      p++;
      if (p > to) {
        el.classList.remove('lb-hop');
        delete busyTok[key];
        return;
      }
      var c = B.cellOf(color, p, tokenIndex);
      if (c) {
        var pos = B.toPercent(c);
        el.style.left = pos.left + '%';
        el.style.top = pos.top + '%';
      }
      setTimeout(step, 165);
    })();
  }

  function watch() {
    var S = global.LudoSeat;
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

        if (!ready || prev === undefined || prev === tk.p) continue;

        var el = layer.querySelector('[data-key="' + id + '"]');
        if (el) hopTo(el, pl.color, prev, tk.p, tk.i);
      }
    }
    ready = true;
  }

  function start() {
    styleOnce();
    B = B || global.LudoBoard;
    D.addEventListener('lb:seat', watch);
    D.addEventListener('lb:state', watch);
    setInterval(watch, 200);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
