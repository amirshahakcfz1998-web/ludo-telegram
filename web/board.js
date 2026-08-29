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

  var BASE_AREA = {
    RED: { col: 0, row: 0 },
    GREEN: { col: 9, row: 0 },
    YELLOW: { col: 9, row: 9 },
    BLUE: { col: 0, row: 9 }
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

  function cellOf(color, p, tokenIndex) {
    if (isBase(p)) return BASE_SLOTS[color][tokenIndex] || BASE_SLOTS[color][0];
    if (isFinished(p)) return finishSlot(color);
    if (isInHome(p)) return HOME_COORDS[color][p - HOME_ENTRY];
    return TRACK_COORDS[toAbsolute(color, p)];
  }

  function finishSlot(color) {
    var d = 0.4;
    if (color === 'RED') return { x: CENTER.x - d, y: CENTER.y };
    if (color === 'GREEN') return { x: CENTER.x, y: CENTER.y - d };
    if (color === 'YELLOW') return { x: CENTER.x + d, y: CENTER.y };
    return { x: CENTER.x, y: CENTER.y + d };
  }

  function toPercent(cell) {
    var unit = 100 / GRID;
    return { left: (cell.x + 0.5) * unit, top: (cell.y + 0.5) * unit };
  }

  function renderGrid(container) {
    if (!container) return;
    container.innerHTML = '';

    var map = {};
    function mark(x, y, cls) {
      var k = x + ',' + y;
      map[k] = (map[k] ? map[k] + ' ' : '') + cls;
    }

    var i, c, ci, color, hc;

    for (i = 0; i < TRACK_COORDS.length; i++) {
      c = TRACK_COORDS[i];
      mark(c.x, c.y, 'path');
      if (isSafeAbs(i) && START_CELLS.indexOf(i) === -1) mark(c.x, c.y, 'safe');
    }

    for (i = 0; i < START_CELLS.length; i++) {
      c = TRACK_COORDS[START_CELLS[i]];
      mark(c.x, c.y, 'start start-' + COLORS[i]);
    }

    for (ci = 0; ci < COLORS.length; ci++) {
      color = COLORS[ci];
      hc = HOME_COORDS[color];
      for (i = 0; i < hc.length; i++) mark(hc[i].x, hc[i].y, 'home home-' + color);
    }

    var frag = document.createDocumentFragment();

    var center = document.createElement('div');
    center.className = 'center-home';
    center.style.gridColumn = '7 / span 3';
    center.style.gridRow = '7 / span 3';
    center.innerHTML =
      '<div class="tri t-RED"></div><div class="tri t-GREEN"></div>' +
      '<div class="tri t-YELLOW"></div><div class="tri t-BLUE"></div>' +
      '<div class="crown">🏆</div>';
    frag.appendChild(center);

    for (ci = 0; ci < COLORS.length; ci++) {
      color = COLORS[ci];
      var area = BASE_AREA[color];
      var base = document.createElement('div');
      base.className = 'base ' + color;
      base.style.gridColumn = (area.col + 1) + ' / span 6';
      base.style.gridRow = (area.row + 1) + ' / span 6';

      var yard = document.createElement('div');
      yard.className = 'base-yard';
      for (var s = 0; s < 4; s++) {
        var slot = document.createElement('div');
        slot.className = 'base-slot ' + color;
        yard.appendChild(slot);
      }
      base.appendChild(yard);
      frag.appendChild(base);
    }

    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        var cls = map[x + ',' + y];
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

  function spreadOffset(index, total) {
    if (total <= 1) return { dx: 0, dy: 0 };
    var step = 1.05;
    var start = -((total - 1) * step) / 2;
    return { dx: start + index * step, dy: index % 2 === 0 ? -0.45 : 0.45 };
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
