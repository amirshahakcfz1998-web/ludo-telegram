/* Ludo Star — Telegram Mini App client (single authoritative renderer)
 * معماری: سرور صاحب حقیقت است. کلاینت فقط درخواست می‌دهد و لاگ رویدادها را
 * به ترتیب (event.n) بازپخش می‌کند. هیچ قانونی سمت کلاینت تصمیم‌گیری نمی‌کند.
 */
(function () {
'use strict';

/* ==================== ابزار ==================== */
var D = document;
var $ = function (s, r) { return (r || D).querySelector(s); };
var el = function (t, c, x) { var n = D.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var uid = function () { return Math.random().toString(36).slice(2) + Date.now().toString(36); };

/* ==================== تلگرام ==================== */
var TG = (window.Telegram && window.Telegram.WebApp) || null;
var INIT = (TG && TG.initData) || '';
if (TG) {
  try { TG.ready(); TG.expand(); } catch (e) {}
  try { TG.setHeaderColor('#0b0e24'); TG.setBackgroundColor('#0b0e24'); } catch (e) {}
  try { TG.disableVerticalSwipes(); } catch (e) {}
}
function haptic(kind) {
  try {
    if (kind === 'ok') TG.HapticFeedback.notificationOccurred('success');
    else TG.HapticFeedback.impactOccurred(kind || 'light');
  } catch (e) {}
}

/* ==================== نقشهٔ تخته (آینهٔ src/game/board.ts) ==================== */
var TRACK = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],
[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],
[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],
[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
var HOME = {
  RED:[[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  GREEN:[[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  YELLOW:[[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  BLUE:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]]
};
var BASE = {
  RED:[[1,1],[4,1],[1,4],[4,4]], GREEN:[[10,1],[13,1],[10,4],[13,4]],
  YELLOW:[[10,10],[13,10],[10,13],[13,13]], BLUE:[[1,10],[4,10],[1,13],[4,13]]
};
var QUAD = { RED:[0,0], GREEN:[9,0], YELLOW:[9,9], BLUE:[0,9] };
var START = { RED:0, GREEN:13, YELLOW:26, BLUE:39 };
var SAFE = [0,8,13,21,26,34,39,47];
var HEX = { RED:'#e5393b', GREEN:'#3ec46d', YELLOW:'#f7c331', BLUE:'#2f9bf0' };
/* چرخش تخته تا پایگاه من پایین-چپ بیفتد */
var ROT = { RED:-90, GREEN:180, YELLOW:90, BLUE:0 };
var HUD_POS = { 1:['bl'], 2:['bl','tr'], 3:['bl','tl','tr'], 4:['bl','tl','tr','br'] };
var U = 100 / 15;

function coordOf(color, p, i) {
  if (p < 0) return (BASE[color] || BASE.RED)[i] || BASE[color][0];
  if (p >= 57) return [7, 7];
  if (p >= 51) return HOME[color][p - 51];
  return TRACK[(START[color] + p) % 52];
}
function cx(c) { return (c[0] + 0.5) * U; }
function cy(c) { return (c[1] + 0.5) * U; }

/* ==================== شبکه ==================== */
function api(path, body) {
  var opt = { method: body ? 'POST' : 'GET', headers: { 'X-Init-Data': INIT } };
  if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  return fetch(path, opt).then(function (r) {
    return r.json().catch(function () { return null; }).then(function (d) {
      return d || { ok: false, error: 'HTTP_' + r.status };
    });
  }).catch(function () { return { ok: false, error: 'NETWORK' }; });
}

/* ==================== صدا (بدون فایل، با WebAudio) ==================== */
var Sound = (function () {
  var ctx = null, on = true;
  function ac() {
    if (!on) return null;
    try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function beep(freq, dur, type, vol) {
    var c = ac(); if (!c) return;
    try {
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol == null ? 0.06 : vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch (e) {}
  }
  return {
    toggle: function () { on = !on; return on; },
    isOn: function () { return on; },
    unlock: function () { ac(); },
    dice: function () { beep(220, 0.08, 'square', 0.04); setTimeout(function(){beep(180,0.08,'square',0.04);}, 90); },
    step: function () { beep(520, 0.05, 'triangle', 0.03); },
    capture: function () { beep(140, 0.25, 'sawtooth', 0.07); },
    home: function () { beep(660, 0.12); setTimeout(function(){beep(880,0.18);},110); },
    turn: function () { beep(440, 0.1, 'sine', 0.05); },
    win: function () { [523,659,784,1047].forEach(function(f,i){ setTimeout(function(){beep(f,0.2);}, i*140); }); }
  };
})();

/* ==================== وضعیت برنامه ==================== */
var App = {
  me: null, roomId: null, joinCode: null,
  state: null, mySeat: -1, myId: null,
  lastSeq: 0, skew: 0,
  ws: null, wsTries: 0, wsTimer: null, pingTimer: null, closing: false,
  queue: [], running: false,
  tokenEls: {}, viewPos: {},
  pendingResult: null, prefRules: 'classic', prefAI: 'NORMAL'
};

/* ==================== صفحه‌ها ==================== */
function show(id) {
  var list = D.querySelectorAll('.screen');
  for (var i = 0; i < list.length; i++) list[i].classList.toggle('active', list[i].id === id);
}
function toast(msg, ms) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
}
function banner(text, ok) {
  var b = $('#net-banner');
  if (!text) { b.classList.remove('show'); return; }
  b.textContent = text; b.classList.toggle('ok', !!ok); b.classList.add('show');
  if (ok) setTimeout(function () { b.classList.remove('show'); }, 1500);
}

/* ==================== ساخت تخته (یک‌بار) ==================== */
var boardBuilt = false;
function buildBoard() {
  if (boardBuilt) return;
  boardBuilt = true;
  var host = $('#cells');
  host.textContent = '';

  // چهار پایگاه
  Object.keys(QUAD).forEach(function (col) {
    var q = QUAD[col];
    var d = el('div', 'quad');
    d.style.cssText = 'left:' + (q[0]*U) + '%;top:' + (q[1]*U) + '%;width:' + (6*U) + '%;height:' + (6*U) + '%;background:' + HEX[col];
    var inner = el('div', 'inner');
    d.appendChild(inner);
    BASE[col].forEach(function (b) {
      var s = el('div', 'slot');
      s.style.cssText = 'left:' + ((b[0]-q[0])*U/6*100) + '%;top:' + ((b[1]-q[1])*U/6*100) + '%;width:16%;height:16%;transform:translate(-50%,-50%);margin:' + (U/6*100/2) + '% 0 0 ' + (U/6*100/2) + '%';
      inner.appendChild(s);
    });
    host.appendChild(d);
  });

  // مسیر مشترک
  var startAbs = {}; Object.keys(START).forEach(function (c) { startAbs[START[c]] = c; });
  TRACK.forEach(function (c, idx) {
    var d = el('div', 'cell' + (SAFE.indexOf(idx) >= 0 ? ' safe' : ''));
    d.style.cssText = 'left:' + (c[0]*U) + '%;top:' + (c[1]*U) + '%;width:' + U + '%;height:' + U + '%';
    if (startAbs[idx]) d.style.background = HEX[startAbs[idx]];
    host.appendChild(d);
  });

  // ستون‌های خانه
  Object.keys(HOME).forEach(function (col) {
    HOME[col].forEach(function (c) {
      var d = el('div', 'cell');
      d.style.cssText = 'left:' + (c[0]*U) + '%;top:' + (c[1]*U) + '%;width:' + U + '%;height:' + U + '%;background:' + HEX[col];
      host.appendChild(d);
    });
  });

  // مرکز
  var ctr = el('div', 'center-piece');
  ctr.style.cssText = 'left:' + (6*U) + '%;top:' + (6*U) + '%;width:' + (3*U) + '%;height:' + (3*U) + '%';
  var tris = [['RED','0 0,50% 50%,0 100%'],['GREEN','0 0,100% 0,50% 50%'],
              ['YELLOW','100% 0,100% 100%,50% 50%'],['BLUE','0 100%,50% 50%,100% 100%']];
  tris.forEach(function (t) {
    var q = el('div', 'tri');
    q.style.cssText = 'background:' + HEX[t[0]] + ';clip-path:polygon(' + t[1] + ')';
    ctr.appendChild(q);
  });
  host.appendChild(ctr);
}

function applyRotation() {
  var b = $('#board');
  var me = myPlayer();
  var deg = me ? (ROT[me.color] || 0) : 0;
  b.style.transform = 'rotate(' + deg + 'deg)';
  b.dataset.rot = String(deg);
}

/* ==================== مهره‌ها ==================== */
function myPlayer() {
  if (!App.state) return null;
  for (var i = 0; i < App.state.players.length; i++)
    if (App.state.players[i].seat === App.mySeat) return App.state.players[i];
  return null;
}
function playerBySeat(seat) {
  if (!App.state) return null;
  for (var i = 0; i < App.state.players.length; i++)
    if (App.state.players[i].seat === seat) return App.state.players[i];
  return null;
}
function key(seat, tok) { return seat + ':' + tok; }

function ensureTokens() {
  var host = $('#tokens');
  var wanted = {};
  var deg = -(Number($('#board').dataset.rot) || 0);
  (App.state.players || []).forEach(function (p) {
    p.tokens.forEach(function (t) {
      var k = key(p.seat, t.i);
      wanted[k] = true;
      var node = App.tokenEls[k];
      if (!node) {
        node = el('div', 'tk');
        node.dataset.seat = String(p.seat);
        node.dataset.tok = String(t.i);
        node.style.background = 'radial-gradient(circle at 35% 30%,#fff9,' + HEX[p.color] + ' 60%)';
        node.addEventListener('click', onTokenClick);
        host.appendChild(node);
        App.tokenEls[k] = node;
      }
      node.style.setProperty('--anti', deg + 'deg');
    });
  });
  Object.keys(App.tokenEls).forEach(function (k) {
    if (!wanted[k]) { App.tokenEls[k].remove(); delete App.tokenEls[k]; delete App.viewPos[k]; }
  });
}

/** موقعیت‌های دیده‌شده روی صفحه (ممکن است چند قدم عقب‌تر از سرور باشد) */
function placeAll() {
  var groups = {};
  (App.state.players || []).forEach(function (p) {
    p.tokens.forEach(function (t) {
      var k = key(p.seat, t.i);
      var pos = App.viewPos[k];
      if (pos == null) pos = t.p;
      var c = coordOf(p.color, pos, t.i);
      var g = c[0] + '_' + c[1];
      (groups[g] = groups[g] || []).push({ k: k, c: c, onTrack: pos >= 0 && pos < 57 });
    });
  });
  Object.keys(groups).forEach(function (g) {
    var list = groups[g];
    list.forEach(function (item, idx) {
      var node = App.tokenEls[item.k];
      if (!node) return;
      var off = list.length > 1 && item.onTrack ? (idx - (list.length - 1) / 2) * (U * 0.28) : 0;
      node.style.left = (cx(item.c) + off) + '%';
      node.style.top = (cy(item.c) - (list.length > 1 && item.onTrack ? U * 0.12 : 0)) + '%';
      var n = node.querySelector('.n');
      if (list.length > 1 && idx === list.length - 1 && item.onTrack) {
        if (!n) { n = el('div', 'n'); node.appendChild(n); }
        n.textContent = String(list.length);
      } else if (n) n.remove();
    });
  });
}

function snapTokens() {
  App.viewPos = {};
  (App.state.players || []).forEach(function (p) {
    p.tokens.forEach(function (t) { App.viewPos[key(p.seat, t.i)] = t.p; });
  });
  ensureTokens();
  placeAll();
}

function setTokenPos(seat, tok, p) {
  App.viewPos[key(seat, tok)] = p;
  placeAll();
}

/* ==================== تاس سه‌بعدی ==================== */
var PIPS = {
  1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]
};
var FACE_ROT = { 1:[0,0], 2:[0,-90], 3:[-90,0], 4:[90,0], 5:[0,90], 6:[0,180] };
var FACE_CSS = {
  1:'translateZ(26px)', 6:'rotateY(180deg) translateZ(26px)',
  2:'rotateY(90deg) translateZ(26px)', 5:'rotateY(-90deg) translateZ(26px)',
  3:'rotateX(90deg) translateZ(26px)', 4:'rotateX(-90deg) translateZ(26px)'
};
var diceSpins = 0;
function buildDice() {
  var cube = $('#dice');
  if (cube.childElementCount) return;
  for (var v = 1; v <= 6; v++) {
    var f = el('div', 'face');
    f.style.transform = FACE_CSS[v];
    for (var i = 0; i < 9; i++) {
      var cell = el('div');
      if (PIPS[v].indexOf(i) >= 0) cell.appendChild(el('div', 'pip'));
      f.appendChild(cell);
    }
    cube.appendChild(f);
  }
  faceTo(1, 0);
}
function faceTo(v, ms) {
  var cube = $('#dice');
  var r = FACE_ROT[v] || [0, 0];
  cube.style.transitionDuration = (ms || 0) + 'ms';
  cube.style.transform = 'rotateX(' + (diceSpins * 1080 + r[0]) + 'deg) rotateY(' + (diceSpins * 720 + r[1]) + 'deg)';
}
/** انیمیشن کامل ریختن تاس — همیشه دست‌کم ۱٫۶ ثانیه */
function rollDiceAnim(value) {
  diceSpins += 3;
  $('#dice-wrap').classList.add('shake');
  Sound.dice(); haptic('medium');
  faceTo(value, 1600);
  setTimeout(function () { $('#dice-wrap').classList.remove('shake'); }, 320);
  return sleep(1680);
}

/* ==================== صف انیمیشن ==================== */
function enqueue(fn) { App.queue.push(fn); runQueue(); }
function runQueue() {
  if (App.running) return;
  App.running = true;
  (function next() {
    var job = App.queue.shift();
    if (!job) {
      App.running = false;
      reconcile();
      renderControls();
      return;
    }
    Promise.resolve().then(job).catch(function (e) { console.log('anim', e); })
      .then(function () { next(); });
  })();
}
function busy() { return App.running || App.queue.length > 0; }

/** بعد از خالی‌شدن صف، نمایش را با حقیقت سرور یکی می‌کنیم */
function reconcile() {
  if (!App.state) return;
  var drift = false;
  App.state.players.forEach(function (p) {
    p.tokens.forEach(function (t) {
      if (App.viewPos[key(p.seat, t.i)] !== t.p) drift = true;
    });
  });
  if (drift) snapTokens();
  renderHud();
}

/* ==================== پخش رویدادها ==================== */
function playEvent(ev) {
  var st = App.state;
  switch (ev.t) {
    case 'DICE':
      return rollDiceAnim(ev.value);

    case 'ENTER': {
      var p = playerBySeat(ev.seat); if (!p) return;
      setTokenPos(ev.seat, ev.token, ev.to);
      Sound.step();
      return sleep(220);
    }

    case 'MOVE': {
      var steps = [];
      for (var q = ev.from + 1; q <= ev.to; q++) steps.push(q);
      if (!steps.length) return;
      var dur = steps.length > 5 ? 110 : 155;
      var node = App.tokenEls[key(ev.seat, ev.token)];
      if (node) node.style.transitionDuration = dur + 'ms';
      var i = 0;
      return (function walk() {
        if (i >= steps.length) { if (node) node.style.transitionDuration = ''; return sleep(60); }
        setTokenPos(ev.seat, ev.token, steps[i++]);
        Sound.step();
        return sleep(dur).then(walk);
      })();
    }

    case 'CAPTURE': {
      var vn = App.tokenEls[key(ev.victimSeat, ev.victimToken)];
      if (vn) vn.style.transitionDuration = '420ms';
      setTokenPos(ev.victimSeat, ev.victimToken, -1);
      Sound.capture(); haptic('heavy');
      toast('یک مهره زده شد!');
      return sleep(460).then(function () { if (vn) vn.style.transitionDuration = ''; });
    }

    case 'HOME':
      Sound.home(); haptic('ok');
      toast('مهره به خانه رسید');
      return sleep(260);

    case 'NO_MOVES':
      toast('حرکت ممکن نیست');
      return sleep(500);

    case 'THREE_SIXES':
      toast('سه شش پشت‌سرهم — نوبت سوخت');
      return sleep(600);

    case 'EXTRA_TURN':
      toast('نوبت اضافه!');
      return sleep(300);

    case 'TURN':
      Sound.turn();
      renderHud();
      return sleep(120);

    case 'TIMEOUT':
      toast('مهلت تمام شد');
      return sleep(300);

    case 'RANK':
      return sleep(150);

    case 'CHAT':
      addChat(ev.msg);
      return;

    case 'GAME_OVER':
      Sound.win();
      return sleep(400);

    default:
      return;
  }
}

/* ==================== HUD ==================== */
function renderHud() {
  var st = App.state; if (!st) return;
  var hud = $('#hud');
  var n = st.players.length;
  var order = HUD_POS[n] || HUD_POS[4];

  st.players.forEach(function (p) {
    var rel = ((p.seat - App.mySeat) % n + n) % n;
    var slot = order[rel] || 'tl';
    var id = 'seat-' + p.seat;
    var node = D.getElementById(id);
    if (!node) {
      node = el('div', 'seat');
      node.id = id;
      var pic = el('div', 'pic');
      var img = el('img'); img.alt = '';
      var svg = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 42 42');
      var c1 = D.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c1.setAttribute('cx','21'); c1.setAttribute('cy','21'); c1.setAttribute('r','19');
      c1.setAttribute('stroke','#ffffff22');
      var c2 = c1.cloneNode(); c2.setAttribute('stroke','#ffc63a'); c2.classList.add('prog');
      svg.appendChild(c1); svg.appendChild(c2);
      pic.appendChild(img); pic.appendChild(svg);
      var box = el('div');
      box.appendChild(el('div', 'sname'));
      box.appendChild(el('div', 'sinfo'));
      node.appendChild(pic); node.appendChild(box);
      hud.appendChild(node);
    }
    node.className = 'seat ' + slot + (st.turnSeat === p.seat && st.status === 'PLAYING' ? ' active' : '') +
      (p.status === 'DISCONNECTED' || p.status === 'LEFT' ? ' off' : '');
    positionSeat(node, slot);
    var im = node.querySelector('img');
    var src = p.photo || '';
    if (im.dataset.src !== src) { im.dataset.src = src; im.src = src || avatarFallback(p); }
    node.querySelector('.sname').textContent = p.name;
    node.querySelector('.sinfo').textContent =
      (p.isAI ? 'ربات' : p.status === 'DISCONNECTED' ? 'آفلاین' : p.status === 'BOT_CONTROLLED' ? 'خودکار' : '') +
      ' • خانه ' + p.finished + '/4';
    node.style.setProperty('--c', HEX[p.color]);
    node.style.borderColor = HEX[p.color];
  });
}
function positionSeat(node, slot) {
  node.style.top = node.style.bottom = node.style.insetInlineStart = node.style.insetInlineEnd = '';
  if (slot === 'tl') { node.style.top = '8px'; node.style.insetInlineStart = '8px'; }
  if (slot === 'tr') { node.style.top = '8px'; node.style.insetInlineEnd = '8px'; }
  if (slot === 'bl') { node.style.top = '56px'; node.style.insetInlineStart = '8px'; }
  if (slot === 'br') { node.style.top = '56px'; node.style.insetInlineEnd = '8px'; }
}
function avatarFallback(p) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
    '<rect width="64" height="64" rx="32" fill="' + HEX[p.color] + '"/>' +
    '<text x="32" y="42" font-size="28" text-anchor="middle" fill="#fff">' +
    (p.isAI ? '🤖' : (p.name || '?').slice(0, 1)) + '</text></svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* حلقهٔ واحد تایمر — تنها تایمر تکرارشوندهٔ برنامه */
setInterval(function () {
  var st = App.state;
  if (!st || st.status !== 'PLAYING') return;
  var now = Date.now() + App.skew;
  var total = Math.max(1, st.deadlineAt - st.turnStartedAt);
  var left = Math.max(0, st.deadlineAt - now);
  var frac = left / total;
  st.players.forEach(function (p) {
    var node = D.getElementById('seat-' + p.seat);
    if (!node) return;
    var c = node.querySelector('circle.prog');
    if (!c) return;
    var len = 2 * Math.PI * 19;
    var active = p.seat === st.turnSeat;
    c.style.strokeDasharray = len;
    c.style.strokeDashoffset = active ? String(len * (1 - frac)) : String(len);
  });
}, 120);

/* ==================== کنترل‌ها ==================== */
function renderControls() {
  var st = App.state;
  var btn = $('#btn-roll');
  if (!st || st.status !== 'PLAYING') { btn.disabled = true; clearHints(); return; }
  var mine = st.turnSeat === App.mySeat;
  btn.disabled = !(mine && st.phase === 'ROLL' && !busy());
  btn.textContent = mine ? (st.phase === 'MOVE' ? 'مهره را بزن' : 'بریز') : 'نوبت حریف';

  clearHints();
  if (mine && st.phase === 'MOVE' && !busy()) {
    (st.legalMoves || []).forEach(function (m) {
      var node = App.tokenEls[key(App.mySeat, m.token)];
      if (node) node.classList.add('movable');
    });
  }
}
function clearHints() {
  Object.keys(App.tokenEls).forEach(function (k) { App.tokenEls[k].classList.remove('movable'); });
}
function onTokenClick(e) {
  var st = App.state; if (!st || busy()) return;
  var seat = Number(e.currentTarget.dataset.seat);
  var tok = Number(e.currentTarget.dataset.tok);
  if (seat !== App.mySeat || st.turnSeat !== App.mySeat || st.phase !== 'MOVE') return;
  var legal = (st.legalMoves || []).some(function (m) { return m.token === tok; });
  if (!legal) { toast('این مهره نمی‌تواند حرکت کند'); return; }
  clearHints(); haptic('light');
  send({ t: 'MOVE', token: tok, turn: st.turnCount, aid: uid() });
}
$('#btn-roll').addEventListener('click', function () {
  var st = App.state; if (!st || busy()) return;
  if (st.turnSeat !== App.mySeat || st.phase !== 'ROLL') return;
  $('#btn-roll').disabled = true;
  Sound.unlock(); haptic('light');
  send({ t: 'ROLL', turn: st.turnCount, aid: uid() });
});

/* ==================== WebSocket ==================== */
function send(obj) {
  if (App.ws && App.ws.readyState === 1) { App.ws.send(JSON.stringify(obj)); return true; }
  toast('اتصال برقرار نیست');
  return false;
}
function connect() {
  if (!App.roomId) return;
  closeSocket();
  App.closing = false;
  var proto = location.protocol === 'https:' ? 'wss' : 'ws';
  var url = proto + '://' + location.host + '/api/ws?room=' + encodeURIComponent(App.roomId) +
            '&initData=' + encodeURIComponent(INIT);
  var ws;
  try { ws = new WebSocket(url); } catch (e) { scheduleReconnect(); return; }
  App.ws = ws;

  ws.onopen = function () {
    App.wsTries = 0;
    banner('متصل شد', true);
    clearInterval(App.pingTimer);
    App.pingTimer = setInterval(function () { send({ t: 'PING' }); }, 20000);
  };
  ws.onmessage = function (e) {
    var m; try { m = JSON.parse(e.data); } catch (err) { return; }
    onMessage(m);
  };
  ws.onclose = function () {
    clearInterval(App.pingTimer);
    if (App.closing) return;
    banner('در حال اتصال مجدد…');
    scheduleReconnect();
  };
  ws.onerror = function () { try { ws.close(); } catch (e) {} };
}
function scheduleReconnect() {
  clearTimeout(App.wsTimer);
  App.wsTries = Math.min(App.wsTries + 1, 6);
  var wait = Math.min(500 * Math.pow(2, App.wsTries), 12000);
  App.wsTimer = setTimeout(connect, wait);
}
function closeSocket() {
  App.closing = true;
  clearInterval(App.pingTimer);
  clearTimeout(App.wsTimer);
  if (App.ws) { try { App.ws.close(); } catch (e) {} App.ws = null; }
}

function onMessage(m) {
  if (m.t === 'PONG') { App.skew = m.now - Date.now(); return; }
  if (m.t === 'ERROR') { toast(errText(m.code)); renderControls(); return; }
  if (m.t === 'WELCOME') {
    App.myId = m.you; App.mySeat = m.seat; App.skew = m.now - Date.now();
    applyState(m.state, true);
    return;
  }
  if (m.t === 'SYNC') { App.skew = m.now - Date.now(); applyState(m.state, false); return; }
  if (m.t === 'RESULT') {
    App.pendingResult = m;
    applyState(m.state, false);
    enqueue(function () { showResult(m); });
    return;
  }
}
function errText(c) {
  return ({ NOT_YOUR_TURN: 'نوبت تو نیست', ILLEGAL_MOVE: 'این حرکت مجاز نیست',
            NOT_MOVE_PHASE: 'اول تاس بریز' })[c] || 'خطا';
}

/* ==================== اعمال وضعیت سرور ==================== */
function applyState(s, first) {
  if (!s) return;
  if (App.state && s.version < App.state.version) return; // نسخهٔ کهنه را دور می‌ریزیم

  var prev = App.state;
  App.state = s;
  App.roomId = s.roomId; App.joinCode = s.joinCode;

  if (s.status === 'LOBBY') { renderLobby(); show('sc-lobby'); return; }
  if (s.status === 'ABORTED') { toast('اتاق منقضی شد'); goMenu(); return; }

  var switching = !prev || prev.status === 'LOBBY';
  if (switching) {
    buildBoard();
    show('sc-game');
    applyRotation();
    snapTokens();
    App.lastSeq = s.eventSeq || 0;
    renderHud(); renderControls(); renderChat();
    return;
  }

  applyRotation();
  ensureTokens();
  renderHud();

  var evs = (s.events || []).filter(function (e) { return (e.n || 0) > App.lastSeq; })
                            .sort(function (a, b) { return a.n - b.n; });
  App.lastSeq = s.eventSeq || App.lastSeq;

  if (first || evs.length === 0) { if (!busy()) { snapTokens(); renderControls(); } return; }
  if (evs.length > 24) { App.queue.length = 0; snapTokens(); renderControls(); return; } // خیلی عقبیم → پرش

  evs.forEach(function (ev) { enqueue(function () { return playEvent(ev); }); });
  renderControls();
}

/* ==================== لابی ==================== */
function renderLobby() {
  var s = App.state; if (!s) return;
  $('#lobby-code').textContent = s.joinCode || '—';
  var ul = $('#lobby-seats'); ul.textContent = '';
  for (var i = 0; i < s.seatsTotal; i++) {
    var p = playerBySeat(i);
    var li = el('li');
    var dot = el('span', 'dot');
    dot.style.background = p ? HEX[p.color] : '#ffffff22';
    li.appendChild(dot);
    li.appendChild(el('span', null, p ? p.name : 'در انتظار بازیکن…'));
    ul.appendChild(li);
  }
  var isHost = s.hostId === App.myId;
  $('#lobby-start').style.display = isHost ? '' : 'none';
  $('#lobby-bot').style.display = isHost && s.players.length < s.seatsTotal ? '' : 'none';
}
$('#lobby-bot').addEventListener('click', function () {
  api('/api/room/addbot', { roomId: App.roomId, level: App.prefAI });
});
$('#lobby-start').addEventListener('click', function () {
  api('/api/room/start', { roomId: App.roomId }).then(function (r) {
    if (r && r.ok === false) toast(r.error === 'NEED_MORE_PLAYERS' ? 'حداقل دو بازیکن لازم است' : 'شروع نشد');
  });
});
$('#lobby-leave').addEventListener('click', leaveRoom);
$('#lobby-share').addEventListener('click', function () {
  var txt = 'به بازی لودوی من بیا! کد اتاق: ' + App.joinCode;
  try { TG.switchInlineQuery(txt, ['users', 'groups']); }
  catch (e) { try { navigator.clipboard.writeText(App.joinCode); toast('کد کپی شد'); } catch (e2) {} }
});

/* ==================== چت ==================== */
var QUICK = ['سلام 👋', 'آفرین!', 'عجله کن ⏱', 'ای بابا 😅', 'خوش‌شانسی 🍀', 'بازی خوبی بود 🤝'];
function renderChat() {
  var q = $('#chat-quick');
  if (q.childElementCount) return;
  QUICK.forEach(function (t) {
    var b = el('button', null, t);
    b.addEventListener('click', function () { send({ t: 'CHAT', text: t, quick: true }); });
    q.appendChild(b);
  });
}
function addChat(msg) {
  var log = $('#chat-log');
  var d = el('div');
  d.textContent = msg.name + ': ' + msg.text; // textContent → ایمن در برابر XSS
  log.appendChild(d);
  while (log.childElementCount > 60) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}
$('#chat-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var inp = $('#chat-input');
  var v = inp.value.trim().slice(0, 160);
  if (!v) return;
  if (Date.now() - ($('#chat-form')._last || 0) < 800) { toast('کمی آرام‌تر'); return; }
  $('#chat-form')._last = Date.now();
  send({ t: 'CHAT', text: v, quick: false });
  inp.value = '';
});
$('#btn-chat').addEventListener('click', function () { $('#chat-sheet').classList.add('open'); });
$('#chat-close').addEventListener('click', function () { $('#chat-sheet').classList.remove('open'); });
$('#btn-menu').addEventListener('click', function () { $('#menu-sheet').classList.add('open'); });
$('#menu-close').addEventListener('click', function () { $('#menu-sheet').classList.remove('open'); });
$('#opt-sound').addEventListener('click', function () {
  this.textContent = 'صدا: ' + (Sound.toggle() ? 'روشن' : 'خاموش');
});
$('#opt-resync').addEventListener('click', function () {
  App.queue.length = 0; App.lastSeq = 0; send({ t: 'SYNC' }); toast('همگام شد');
});
$('#opt-leave').addEventListener('click', leaveRoom);

/* ==================== نتیجه ==================== */
function showResult(m) {
  var s = m.state;
  var mine = null;
  s.players.forEach(function (p) { if (p.seat === App.mySeat) mine = p; });
  $('#res-icon').textContent = mine && mine.rank === 1 ? '🏆' : '🏁';
  $('#res-title').textContent = mine && mine.rank === 1 ? 'تو بردی!' : 'بازی تمام شد';
  var ol = $('#res-rank'); ol.textContent = '';
  s.players.slice().sort(function (a, b) { return (a.rank || 99) - (b.rank || 99); })
    .forEach(function (p) { ol.appendChild(el('li', null, p.name)); });
  var prize = m.prizes && mine && mine.tgId ? m.prizes[String(mine.tgId)] : 0;
  $('#res-reward').textContent = prize ? ('جایزه: ' + prize + ' سکه') : '';
  show('sc-result');
}
$('#res-home').addEventListener('click', goMenu);
$('#res-again').addEventListener('click', function () { goMenu(); });

/* ==================== ساخت/ورود اتاق ==================== */
function enterRoom(roomId) {
  App.roomId = roomId;
  App.lastSeq = 0; App.state = null; App.queue.length = 0;
  connect();
}
function leaveRoom() {
  if (!App.roomId) { goMenu(); return; }
  api('/api/room/leave', { roomId: App.roomId }).then(goMenu);
}
function goMenu() {
  closeSocket();
  App.roomId = null; App.state = null; App.lastSeq = 0; App.queue.length = 0;
  $('#chat-sheet').classList.remove('open');
  $('#menu-sheet').classList.remove('open');
  show('sc-menu');
  refreshMe();
}

function createRoom(opts) {
  show('sc-load'); $('#load-text').textContent = 'در حال ساخت اتاق…';
  return api('/api/room/create', opts).then(function (r) {
    if (!r || r.ok === false) {
      show('sc-menu');
      toast(r && r.error === 'NOT_ENOUGH_COINS' ? 'سکهٔ کافی نداری' : 'ساخت اتاق ناموفق بود');
      return null;
    }
    enterRoom(r.roomId);
    return r;
  });
}

D.querySelectorAll('.tile').forEach(function (t) {
  t.addEventListener('click', function () {
    Sound.unlock();
    App.prefAI = $('#ai-level').value;
    App.prefRules = $('#rules-id').value;
    var act = t.dataset.act;

    if (act === 'ai') {
      createRoom({ mode: 'AI', rulesId: App.prefRules, aiLevel: App.prefAI, visibility: 'PRIVATE', stake: 0 });
    } else if (act === 'ai4') {
      createRoom({ mode: '4P', rulesId: App.prefRules, visibility: 'PRIVATE', stake: 0 }).then(function (r) {
        if (!r) return;
        var chain = Promise.resolve();
        for (var i = 0; i < 3; i++) {
          chain = chain.then(function () {
            return api('/api/room/addbot', { roomId: r.roomId, level: App.prefAI });
          });
        }
      });
    } else if (act === 'friends2') {
      createRoom({ mode: '2P', rulesId: App.prefRules, visibility: 'PRIVATE', stake: 0 });
    } else if (act === 'friends4') {
      createRoom({ mode: '4P', rulesId: App.prefRules, visibility: 
