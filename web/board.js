/* نقشهٔ تخته برای مینی‌اپ — باید دقیقاً با src/game/board.ts هماهنگ باشد */
(function (global) {
  'use strict';

  var TRACK_LEN = 52;
  var POS_BASE = -1;
  var LAST_TRACK = 50;
  var HOME_ENTRY = 51;
  var POS_FINISH = 57;
  var GRID = 15;

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

  var BASE_SLOTS = {
    RED: [{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }],
    GREEN: [{ x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 }, { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 }],
    YELLOW: [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }],
    BLUE: [{ x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 }, { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 }]
  };

  /** ناحیهٔ پایگاه هر رنگ روی گرید ۱۵×۱۵ */
  var BASE_AREA = {
    RED: { col: 1, row: 1 },
    GREEN: { col: 10, row: 1 },
    YELLOW: { col: 10, row: 10 },
    BLUE: { col: 1, row: 10 }
  };

  var CENTER = { x: 7, y: 7 };

  function isBase(p) { return p === POS_BASE; }
  function isOnTrack(p) { return p >= 0 && p <= LAST_TRACK; }
  function isInHome(p) { return p >= HOME_ENTRY && p < POS_FINISH; }
  function isFinished(p) { return p >= POS_FINISH; }

  function toAbsolute(color, p) {
    if (!isOnTrack(p)) return -1;
    return (START_OFFSET[color] + p) % TRACK_LEN;
  }

  function isSafeAbs(abs) { return SAFE_CELLS.indexOf(abs) !== -1; }

  /** مختصات گرید یک مهره */
  function cellOf(color, p, tokenIndex) {
    if (isBase(p)) return BASE_SLOTS[color][tokenIndex] || BASE_SLOTS[color][0];
    if (isFinished(p)) return finishSlot(color);
    if (isInHome(p)) return HOME_COORDS[color][p - HOME_ENTRY];
    return TRACK_COORDS[toAbsolute(color, p)];
  }

  /** مهره‌های تمام‌شده کمی کنار هم در مرکز می‌نشینند */
  function finishSlot(color) {
    var d = 0.42;
    if (color === 'RED') return { x: CENTER.x - d, y: CENTER.y };
    if (color === 'GREEN') return { x: CENTER.x, y: CENTER.y - d };
    if (color === 'YELLOW') return { x: CENTER.x + d, y: CENTER.y };
    return { x: CENTER.x, y: CENTER.y + d };
  }

  /** تبدیل مختصات گرید به درصد برای چیدن مهره روی تخته */
  function toPercent(cell) {
    var unit = 100 / GRID;
    return {
      left: (cell.x + 0.5) * unit,
      top: (cell.y + 0.5) * unit
    };
  }

  /** ساخت خانه‌های تخته یک‌بار در شروع */
  function renderGrid(container) {
    container.innerHTML = '';
    var i, c;

    var map = {}; // "x,y" -> className
    function mark(x, y, cls) {
      var k = x + ',' + y;
      map[k] = (map[k] ? map[k] + ' ' : '') + cls;
    }

    for (i = 0; i < TRACK_COORDS.length; i++) {
      c = TRACK_COORDS[i];
      mark(c.x, c.y, 'path');
      if (isSafeAbs(i)) mark(c.x, c.y, 'safe');
    }

    for (i = 0; i < START_CELLS.length; i++) {
      c = TRACK_COORDS[START_CELLS[i]];
      mark(c.x, c.y, 'start-' + COLORS[i]);
    }

    for (var ci = 0; ci < COLORS.length; ci++) {
      var color = COLORS[ci];
      var hc = HOME_COORDS[color];
      for (i = 0; i < hc.length; i++) mark(hc[i].x, hc[i].y, 'home-' + color);
    }

    var frag = document.createDocumentFragment();

    // چهار پایگاه به‌صورت بلوک ۶×۶
    for (var bi = 0; bi < COLORS.length; bi++) {
      var col = COLORS[bi];
      var area = BASE_AREA[col];
      var base = document.createElement('div');
      base.className = 'base ' + col;
      base.style.gridColumn = (area.col + 1) + ' / span 5';
      base.style.gridRow = (area.row + 1) + ' / span 5';
      frag.appendChild(base);
    }

    // مرکز تخته
    var center = document.createElement('div');
    center.className = 'center-home';
    center.style.gridColumn = '7 / span 3';
    center.style.gridRow = '7 / span 3';
    center.textContent = '🏆';
    frag.appendChild(center);

    // بقیهٔ خانه‌ها
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        var key = x + ',' + y;
        var cls = map[key];
        if (!cls) continue;
        var el = document.createElement('div');
        el.className = 'cell ' + cls;
        el.style.gridColumn = (x + 1);
        el.style.gridRow = (y + 1);
        frag.appendChild(el);
      }
    }

    container.appendChild(frag);
  }

  /** پخش کردن مهره‌های هم‌خانه تا روی هم نیفتند */
  function spreadOffset(index, total) {
    if (total <= 1) return { dx: 0, dy: 0 };
    var step = 1.1;
    var start = -((total - 1) * step) / 2;
    return { dx: start + index * step, dy: index % 2 === 0 ? -0.5 : 0.5 };
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
