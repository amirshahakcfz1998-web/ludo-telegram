/* لودو استار — تختهٔ حرفه‌ای SVG + مهره‌های سه‌بعدی (نسخهٔ ۲)
   API این فایل با نسخهٔ قبل سازگار است: renderGrid, cellOf, toPercent, spreadOffset */
(function (global) {
  'use strict';

  var TRACK_LEN = 52;
  var POS_BASE = -1;
  var LAST_TRACK = 50;
  var HOME_ENTRY = 51;
  var POS_FINISH = 57;
  var GRID = 15;
  var U = 100;                 // اندازهٔ هر خانه در مختصات SVG
  var SIZE = GRID * U;         // 1500

  var COLORS = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
  var START_OFFSET = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 };
  var SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];
  var START_CELLS = [0, 13, 26, 39];

  var TRACK_COORDS = [
    { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
    { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 },
    { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 8, y: 0 },
    { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
    { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 },
    { x: 14, y: 6 }, { x: 14, y: 7 }, { x: 14, y: 8 },
    { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
    { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 },
    { x: 8, y: 14 }, { x: 7, y: 14 }, { x: 6, y: 14 },
    { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
    { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 },
    { x: 0, y: 8 }, { x: 0, y: 7 }, { x: 0, y: 6 }
  ];

  var HOME_COORDS = {
    RED: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }],
    GREEN: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
    YELLOW: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }, { x: 8, y: 7 }],
    BLUE: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }, { x: 7, y: 8 }]
  };

  /* لانه‌ها دقیقاً وسط ناحیهٔ ۶×۶ قرار می‌گیرند */
  var BASE_SLOTS = {
    RED: [{ x: 1.8, y: 1.8 }, { x: 4.2, y: 1.8 }, { x: 1.8, y: 4.2 }, { x: 4.2, y: 4.2 }],
    GREEN: [{ x: 10.8, y: 1.8 }, { x: 13.2, y: 1.8 }, { x: 10.8, y: 4.2 }, { x: 13.2, y: 4.2 }],
    YELLOW: [{ x: 10.8, y: 10.8 }, { x: 13.2, y: 10.8 }, { x: 10.8, y: 13.2 }, { x: 13.2, y: 13.2 }],
    BLUE: [{ x: 1.8, y: 10.8 }, { x: 4.2, y: 10.8 }, { x: 1.8, y: 13.2 }, { x: 4.2, y: 13.2 }]
  };

  var BASE_AREA = {
    RED: { col: 0, row: 0 },
    GREEN: { col: 9, row: 0 },
    YELLOW: { col: 9, row: 9 },
    BLUE: { col: 0, row: 9 }
  };

  var CENTER = { x: 7, y: 7 };

  /* پالت اختصاصی بازی: تیره / اصلی / روشن */
  var PAL = {
    RED:    { d: '#8c0f2a', m: '#f2314c', l: '#ff92a0' },
    GREEN:  { d: '#0b6b47', m: '#22c07d', l: '#7ef0bd' },
    YELLOW: { d: '#a86a00', m: '#ffc32e', l: '#ffe58a' },
    BLUE:   { d: '#12468f', m: '#3b9bff', l: '#9ccfff' }
  };

  /* ------------------------------------------------------------------ */
  /* توابع منطقی (بدون تغییر نسبت به نسخهٔ قبل)                          */
  /* ------------------------------------------------------------------ */

  function isBase(p) { return p === POS_BASE; }
  function isOnTrack(p) { return p >= 0 && p <= LAST_TRACK; }
  function isInHome(p) { return p >= HOME_ENTRY && p < POS_FINISH; }
  function isFinished(p) { return p >= POS_FINISH; }

  function toAbsolute(color, p) {
    if (!isOnTrack(p)) return -1;
    return (START_OFFSET[color] + p) % TRACK_LEN;
  }

  function isSafeAbs(abs) { return SAFE_CELLS.indexOf(abs) !== -1; }

  function finishSlot(color) {
    var d = 0.42;
    if (color === 'RED') return { x: CENTER.x - d, y: CENTER.y };
    if (color === 'GREEN') return { x: CENTER.x, y: CENTER.y - d };
    if (color === 'YELLOW') return { x: CENTER.x + d, y: CENTER.y };
    return { x: CENTER.x, y: CENTER.y + d };
  }

  function cellOf(color, p, tokenIndex) {
    if (isBase(p)) return BASE_SLOTS[color][tokenIndex] || BASE_SLOTS[color][0];
    if (isFinished(p)) return finishSlot(color);
    if (isInHome(p)) return HOME_COORDS[color][p - HOME_ENTRY];
    return TRACK_COORDS[toAbsolute(color, p)];
  }

  function toPercent(cell) {
    var unit = 100 / GRID;
    return { left: (cell.x + 0.5) * unit, top: (cell.y + 0.5) * unit };
  }

  function spreadOffset(index, total) {
    if (total <= 1) return { dx: 0, dy: 0 };
    var step = 1.0;
    var start = -((total - 1) * step) / 2;
    return { dx: start + index * step, dy: index % 2 === 0 ? -0.4 : 0.4 };
  }

  /* ------------------------------------------------------------------ */
  /* ابزارهای ترسیم SVG                                                  */
  /* ------------------------------------------------------------------ */

  function n(v) { return Math.round(v * 10) / 10; }

  function starPath(cx, cy, r) {
    var p = '', i, a, rr;
    for (i = 0; i < 10; i++) {
      a = -Math.PI / 2 + i * Math.PI / 5;
      rr = (i % 2) ? r * 0.44 : r;
      p += (i ? 'L' : 'M') + n(cx + Math.cos(a) * rr) + ',' + n(cy + Math.sin(a) * rr);
    }
    return p + 'Z';
  }

  function angleAt(i) {
    var a = TRACK_COORDS[i];
    var b = TRACK_COORDS[(i + 1) % TRACK_LEN];
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  /** یک خانهٔ مسیر با عمق: سایه، بدنه، براقیت */
  function tile(x, y, opt) {
    opt = opt || {};
    var px = x * U, py = y * U;
    var pad = 6;
    var w = U - pad * 2;
    var fill = opt.fill || 'url(#lbTile)';
    var s = '';
    s += '<rect x="' + (px + pad) + '" y="' + (py + pad + 5) + '" width="' + w + '" height="' + w +
         '" rx="18" fill="rgba(10,4,26,.42)"/>';
    s += '<rect x="' + (px + pad) + '" y="' + (py + pad) + '" width="' + w + '" height="' + w +
         '" rx="18" fill="' + fill + '" stroke="' + (opt.stroke || 'rgba(60,25,95,.28)') + '" stroke-width="2"/>';
    s += '<rect x="' + (px + pad + 8) + '" y="' + (py + pad + 6) + '" width="' + (w - 16) + '" height="' + (w * 0.34) +
         '" rx="12" fill="rgba(255,255,255,.5)" opacity="' + (opt.glossy === false ? 0.16 : 0.42) + '"/>';
    if (opt.inner) s += opt.inner;
    return s;
  }

  function defs() {
    var g = '<defs>';

    /* پلیت اصلی تخته */
    g += '<linearGradient id="lbPlate" x1="0" y1="0" x2="0.4" y2="1">' +
         '<stop offset="0" stop-color="#4a1d7a"/><stop offset="0.45" stop-color="#331253"/>' +
         '<stop offset="1" stop-color="#1d0733"/></linearGradient>';

    /* کاشی سفید مسیر */
    g += '<linearGradient id="lbTile" x1="0" y1="0" x2="0" y2="1">' +
         '<stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f3edff"/>' +
         '<stop offset="1" stop-color="#d9cdf0"/></linearGradient>';

    /* گرادیان رنگی هر تیم: کاشی، لانه، مثلث مرکز */
    COLORS.forEach(function (c) {
      var p = PAL[c];
      g += '<linearGradient id="lbC' + c + '" x1="0" y1="0" x2="0" y2="1">' +
           '<stop offset="0" stop-color="' + p.l + '"/><stop offset="0.5" stop-color="' + p.m + '"/>' +
           '<stop offset="1" stop-color="' + p.d + '"/></linearGradient>';
      g += '<radialGradient id="lbY' + c + '" cx="0.32" cy="0.26" r="0.95">' +
           '<stop offset="0" stop-color="' + p.l + '"/><stop offset="0.5" stop-color="' + p.m + '"/>' +
           '<stop offset="1" stop-color="' + p.d + '"/></radialGradient>';
    });

    /* درخشش مرکز */
    g += '<radialGradient id="lbCore" cx="0.5" cy="0.42" r="0.7">' +
         '<stop offset="0" stop-color="#fff6cf"/><stop offset="0.55" stop-color="#ffd66b"/>' +
         '<stop offset="1" stop-color="#c98a12"/></radialGradient>';

    /* نور سراسری روی تخته */
    g += '<linearGradient id="lbSheen" x1="0" y1="0" x2="0.7" y2="1">' +
         '<stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>' +
         '<stop offset="0.42" stop-color="#ffffff" stop-opacity="0.03"/>' +
         '<stop offset="1" stop-color="#000000" stop-opacity="0.22"/></linearGradient>';

    /* سایهٔ نرم زیر لانه‌ها و مرکز */
    g += '<filter id="lbSoft" x="-20%" y="-20%" width="140%" height="140%">' +
         '<feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#12042a" flood-opacity="0.55"/></filter>';

    g += '</defs>';
    return g;
  }

  /** لانهٔ یک رنگ: پنل رنگی، صفحهٔ داخلی، چهار سوکت */
  function yard(color) {
    var a = BASE_AREA[color];
    var x = a.col * U, y = a.row * U, s = 6 * U;
    var p = PAL[color];
    var out = '<g filter="url(#lbSoft)">';
    out += '<rect x="' + (x + 14) + '" y="' + (y + 14) + '" width="' + (s - 28) + '" height="' + (s - 28) +
           '" rx="54" fill="url(#lbY' + color + ')"/>';
    out += '<rect x="' + (x + 14) + '" y="' + (y + 14) + '" width="' + (s - 28) + '" height="' + (s - 28) +
           '" rx="54" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="6"/>';
    out += '<rect x="' + (x + 26) + '" y="' + (y + 26) + '" width="' + (s - 52) + '" height="' + (s * 0.3) +
           '" rx="44" fill="rgba(255,255,255,.22)"/>';
    out += '</g>';

    /* صفحهٔ سفید داخلی */
    var ix = x + 0.9 * U, iy = y + 0.9 * U, iw = 4.2 * U;
    out += '<rect x="' + (ix) + '" y="' + (iy + 8) + '" width="' + iw + '" height="' + iw +
           '" rx="46" fill="rgba(8,2,20,.35)"/>';
    out += '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + iw +
           '" rx="46" fill="url(#lbTile)" stroke="' + p.d + '" stroke-width="4" stroke-opacity=".35"/>';

    /* سوکت مهره‌ها */
    BASE_SLOTS[color].forEach(function (sl) {
      var cx = sl.x * U, cy = sl.y * U;
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="' + p.d + '" opacity=".16"/>';
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="none" stroke="' + p.m +
             '" stroke-width="5" stroke-opacity=".55"/>';
      out += '<circle cx="' + cx + '" cy="' + (cy - 10) + '" r="30" fill="#ffffff" opacity=".35"/>';
    });
    return out;
  }

  function track() {
    var out = '', i;
    for (i = 0; i < TRACK_LEN; i++) {
      var c = TRACK_COORDS[i];
      var startIdx = START_CELLS.indexOf(i);
      if (startIdx !== -1) {
        var col = COLORS[startIdx];
        var cx = c.x * U + U / 2, cy = c.y * U + U / 2;
        var arrow = '<g transform="translate(' + cx + ',' + cy + ') rotate(' + n(angleAt(i)) + ')">' +
          '<path d="M -16,-18 L 14,0 L -16,18 Z" fill="rgba(255,255,255,.92)"/></g>';
        out += tile(c.x, c.y, { fill: 'url(#lbC' + col + ')', stroke: PAL[col].d, inner: arrow });
      } else if (isSafeAbs(i)) {
        var sx = c.x * U + U / 2, sy = c.y * U + U / 2;
        var st = '<path d="' + starPath(sx, sy, 26) + '" fill="#ffb02e" stroke="#a2670a" stroke-width="3"/>' +
                 '<path d="' + starPath(sx, sy - 3, 15) + '" fill="#ffe6a8" opacity=".85"/>';
        out += tile(c.x, c.y, { inner: st });
      } else {
        out += tile(c.x, c.y, {});
      }
    }
    return out;
  }

  function homeColumns() {
    var out = '';
    COLORS.forEach(function (color) {
      var list = HOME_COORDS[color];
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        var last = i === list.length - 1;
        var inner = '';
        if (last) {
          var cx = c.x * U + U / 2, cy = c.y * U + U / 2;
          inner = '<path d="' + starPath(cx, cy, 24) + '" fill="rgba(255,255,255,.85)"/>';
        }
        out += tile(c.x, c.y, {
          fill: 'url(#lbC' + color + ')',
          stroke: PAL[color].d,
          glossy: false,
          inner: inner
        });
      }
    });
    return out;
  }

  function centerHome() {
    var x0 = 6 * U, x1 = 9 * U, mid = 7.5 * U;
    var out = '<g filter="url(#lbSoft)">';
    out += '<rect x="' + (x0 + 6) + '" y="' + (x0 + 6) + '" width="' + (3 * U - 12) + '" height="' + (3 * U - 12) +
           '" rx="34" fill="#2a0f4b"/>';
    out += '</g>';

    var tri = {
      RED: [[x0, x0], [x0, x1], [mid, mid]],
      GREEN: [[x0, x0], [x1, x0], [mid, mid]],
      YELLOW: [[x1, x0], [x1, x1], [mid, mid]],
      BLUE: [[x0, x1], [x1, x1], [mid, mid]]
    };
    Object.keys(tri).forEach(function (c) {
      var pts = tri[c].map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
      out += '<polygon points="' + pts + '" fill="url(#lbC' + c + ')" stroke="rgba(20,6,40,.45)" stroke-width="3"/>';
    });

    /* هستهٔ طلایی وسط */
    out += '<circle cx="' + mid + '" cy="' + mid + '" r="62" fill="rgba(10,3,26,.45)"/>';
    out += '<circle cx="' + mid + '" cy="' + (mid - 4) + '" r="58" fill="url(#lbCore)" stroke="#8a5a06" stroke-width="4"/>';
    out += '<path d="' + starPath(mid, mid - 6, 34) + '" fill="#fff8dd" opacity=".92"/>';
    out += '<ellipse cx="' + (mid - 14) + '" cy="' + (mid - 28) + '" rx="22" ry="12" fill="#ffffff" opacity=".55"/>';
    return out;
  }

  function buildSvg() {
    var s = '<svg class="lb-svg" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" xmlns="http://www.w3.org/2000/svg" ' +
            'preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    s += defs();

    /* بدنهٔ تخته */
    s += '<rect x="0" y="0" width="' + SIZE + '" height="' + SIZE + '" rx="72" fill="url(#lbPlate)"/>';
    s += '<rect x="10" y="10" width="' + (SIZE - 20) + '" height="' + (SIZE - 20) +
         '" rx="64" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="6"/>';
    s += '<rect x="30" y="30" width="' + (SIZE - 60) + '" height="' + (SIZE - 60) +
         '" rx="52" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="10"/>';

    COLORS.forEach(function (c) { s += yard(c); });
    s += track();
    s += homeColumns();
    s += centerHome();

    /* نور سراسری */
    s += '<rect x="0" y="0" width="' + SIZE + '" height="' + SIZE + '" rx="72" fill="url(#lbSheen)" pointer-events="none"/>';
    s += '</svg>';
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* استایل تزریقی: تخته، مهره‌ها، جلوه‌ها                                */
  /* ------------------------------------------------------------------ */

  var CSS = [
    '.board-wrap{padding:10px 12px 6px;display:flex;justify-content:center}',
    '.board-frame{position:relative;width:100%;max-width:min(94vw,440px);padding:8px;border-radius:30px;',
    'background:linear-gradient(160deg,#ffe9a8,#d9a326 28%,#8d5f0c 55%,#f4d67c 78%,#8d5f0c);',
    'box-shadow:0 18px 38px rgba(6,2,18,.6),0 2px 0 rgba(255,255,255,.35) inset,0 -3px 8px rgba(0,0,0,.4) inset}',
    '.board{position:relative;width:100%;aspect-ratio:1/1;border-radius:24px;overflow:visible;background:none}',
    '.board-grid{position:absolute!important;inset:0!important;display:block!important;',
    'padding:0!important;margin:0!important;border:0!important;background:none!important;grid-template-columns:none!important;grid-template-rows:none!important}',
    '.board-grid .lb-svg{width:100%;height:100%;display:block;border-radius:24px}',
    '.tokens-layer,.fx-layer{position:absolute;inset:0;pointer-events:none}',
    '.tokens-layer{z-index:4}.fx-layer{z-index:8}',

    /* --- مهره‌های سه‌بعدی --- */
    '.tokens-layer .token{position:absolute;width:6.6%;height:6.6%;transform:translate(-50%,-58%);',
    'pointer-events:auto;z-index:5;',
    'transition:left .3s cubic-bezier(.34,1.36,.5,1),top .3s cubic-bezier(.34,1.36,.5,1),transform .18s ease;',
    'background:none;border:0;border-radius:0;box-shadow:none}',
    '.tokens-layer .token .cap{position:absolute;inset:0;border-radius:50%;',
    'background:radial-gradient(circle at 33% 26%,var(--tl) 0%,var(--tm) 52%,var(--td) 100%);',
    'box-shadow:inset 0 -3px 6px rgba(0,0,0,.5),inset 0 2px 4px rgba(255,255,255,.55),0 2px 5px rgba(0,0,0,.45)}',
    '.tokens-layer .token .gloss{position:absolute;left:20%;top:12%;width:38%;height:28%;border-radius:50%;',
    'background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,0));pointer-events:none}',
    '.tokens-layer .token::after{content:"";position:absolute;left:10%;right:10%;bottom:-16%;height:28%;',
    'border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.55),rgba(0,0,0,0) 72%);z-index:-1}',
    '.token.RED{--tl:#ff9dab;--tm:#f2314c;--td:#7d0c24}',
    '.token.GREEN{--tl:#84f2c3;--tm:#22c07d;--td:#08573a}',
    '.token.YELLOW{--tl:#ffe79a;--tm:#ffc32e;--td:#8f5900}',
    '.token.BLUE{--tl:#a6d5ff;--tm:#3b9bff;--td:#0e3d80}',
    '.token.movable{cursor:pointer;animation:lbHop 1s ease-in-out infinite}',
    '.token.movable .cap{animation:lbGlow 1s ease-in-out infinite}',
    '.token.movable:active{transform:translate(-50%,-58%) scale(.92)}',
    '.token.done .cap{box-shadow:inset 0 -3px 6px rgba(0,0,0,.4),0 0 10px rgba(255,214,107,.9)}',
    '.token[data-stack]::before{content:attr(data-stack);position:absolute;top:-26%;right:-26%;',
    'min-width:44%;height:44%;padding:0 2px;border-radius:99px;background:#1b0733;color:#ffd76b;',
    'font:700 8px/1.5 system-ui,sans-serif;display:grid;place-items:center;',
    'border:1px solid rgba(255,215,107,.7);box-shadow:0 1px 3px rgba(0,0,0,.6)}',
    '@keyframes lbHop{0%,100%{transform:translate(-50%,-58%) scale(1)}50%{transform:translate(-50%,-70%) scale(1.07)}}',
    '@keyframes lbGlow{0%,100%{filter:drop-shadow(0 0 2px rgba(255,255,255,.5))}',
    '50%{filter:drop-shadow(0 0 9px rgba(255,255,255,.95)) drop-shadow(0 0 16px var(--tm))}}',

    /* --- جلوه‌ها --- */
    '.fx-layer .fx{position:absolute;transform:translate(-50%,-50%);font-size:26px;',
    'animation:lbFx 1.05s cubic-bezier(.2,.9,.3,1) forwards;text-shadow:0 3px 8px rgba(0,0,0,.6)}',
    '@keyframes lbFx{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}',
    '25%{opacity:1;transform:translate(-50%,-90%) scale(1.35)}',
    '100%{opacity:0;transform:translate(-50%,-190%) scale(.85)}}',
    '.fx-layer .ripple{position:absolute;width:14%;height:14%;transform:translate(-50%,-50%);',
    'border-radius:50%;border:3px solid rgba(255,255,255,.9);animation:lbRipple .9s ease-out forwards}',
    '@keyframes lbRipple{0%{opacity:.95;transform:translate(-50%,-50%) scale(.3)}',
    '100%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('lb-style-v2')) return;
    var st = document.createElement('style');
    st.id = 'lb-style-v2';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ */
  /* رندر                                                                */
  /* ------------------------------------------------------------------ */

  function renderGrid(container) {
    injectStyle();
    if (!container) return;
    container.innerHTML = buildSvg();
  }

  global.LudoBoard = {
    TRACK_LEN: TRACK_LEN,
    POS_BASE: POS_BASE,
    POS_FINISH: POS_FINISH,
    HOME_ENTRY: HOME_ENTRY,
    LAST_TRACK: LAST_TRACK,
    GRID: GRID,
    COLORS: COLORS,
    SAFE_CELLS: SAFE_CELLS,
    TRACK_COORDS: TRACK_COORDS,
    HOME_COORDS: HOME_COORDS,
    BASE_SLOTS: BASE_SLOTS,
    PALETTE: PAL,
    CENTER: CENTER,
    isBase: isBase,
    isOnTrack: isOnTrack,
    isInHome: isInHome,
    isFinished: isFinished,
    toAbsolute: toAbsolute,
    isSafeAbs: isSafeAbs,
    cellOf: cellOf,
    toPercent: toPercent,
    renderGrid: renderGrid,
    spreadOffset: spreadOffset
  };
})(window);
