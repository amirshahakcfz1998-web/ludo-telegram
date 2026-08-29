/* لودو استار — منطق مینی‌اپ: اتصال زنده، تخته، تاس، چت و نتیجه */
(function () {
  'use strict';

  var B = window.LudoBoard;
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  var S = {
    initData: '',
    me: null,
    profile: null,
    roomId: null,
    state: null,
    seat: -1,
    playerId: null,
    ws: null,
    wsTries: 0,
    reconnectTimer: null,
    pingTimer: null,
    timerRaf: null,
    lastDice: null,
    sound: true,
    chatOn: true,
    screen: 'loader',
    history: [],
    seenEvents: 0,
    busy: false
  };

  var QUICK_REPLIES = ['سلام 👋', 'آفرین 👏', 'عجله کن ⏰', 'شانس آوردی 😅', 'خوب بازی کردی 🤝', 'دوباره؟ 🔁'];

  /* ---------------- ابزارها ---------------- */

  function $(id) { return document.getElementById(id); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  function show(name) {
    var ids = ['loader', 'errorScreen', 'menuScreen', 'aiScreen', 'joinScreen', 'lobbyScreen',
      'gameScreen', 'overScreen', 'boardScreen', 'profileScreen', 'settingsScreen'];
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (el) el.classList.add('hidden');
    }
    var target = $(name);
    if (target) target.classList.remove('hidden');
    if (S.screen !== name && name !== 'loader') S.history.push(S.screen);
    S.screen = name;
    if (tg) {
      if (name === 'menuScreen' || name === 'gameScreen') tg.BackButton.hide();
      else tg.BackButton.show();
    }
  }

  function goBack() {
    var prev = S.history.pop() || 'menuScreen';
    if (prev === 'loader' || prev === 'gameScreen') prev = 'menuScreen';
    S.screen = '';
    show(prev);
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 2200);
  }

  function haptic(type) {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (type === 'select') tg.HapticFeedback.selectionChanged();
      else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
      else tg.HapticFeedback.impactOccurred(type || 'light');
    } catch (e) { /* ignore */ }
  }

  var audioCtx = null;
  function beep(freq, dur) {
    if (!S.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* ignore */ }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  /* ---------------- ارتباط با سرور ---------------- */

  function api(path, body) {
    var opts = {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': S.initData }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(path, opts).then(function (r) { return r.json(); }).catch(function () {
      return { ok: false, error: 'NETWORK' };
    });
  }

  function showError(title, text) {
    $('errorTitle').textContent = title;
    $('errorText').textContent = text || '';
    show('errorScreen');
  }

  /* ---------------- شروع ---------------- */

  function boot() {
    if (tg) {
      tg.ready();
      tg.expand();
      try { tg.disableVerticalSwipes(); } catch (e) { /* نسخهٔ قدیمی */ }
      tg.BackButton.onClick(goBack);
      S.initData = tg.initData || '';
      if (tg.colorScheme === 'light') document.body.className = 'theme-light';
    }

    if (!S.initData) {
      showError('این صفحه باید از داخل تلگرام باز شود', 'لطفاً از دکمهٔ ربات وارد شو.');
      return;
    }

    B.renderGrid($('boardGrid'));
    bindUI();

    api('/api/me').then(function (res) {
      if (!res.ok) {
        showError('اتصال برقرار نشد', res.error || '');
        return;
      }
      S.me = res.user;
      S.profile = res.profile;
      S.sound = !!res.user.sound;
      S.chatOn = !!res.user.chat;
      if (res.user.theme === 'light') document.body.className = 'theme-light';
      paintMenu();

      var startParam = res.startParam || paramFromUrl();
      if (startParam) {
        joinRoom({ roomId: startParam.indexOf('r_') === 0 ? startParam : '', code: startParam });
      } else {
        show('menuScreen');
      }
    });
  }

  function paramFromUrl() {
    var q = new URLSearchParams(location.search);
    var r = q.get('room') || q.get('tgWebAppStartParam');
    if (r) return r;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) return tg.initDataUnsafe.start_param;
    return null;
  }

  function paintMenu() {
    var u = S.me || {};
    $('menuName').textContent = u.name || 'بازیکن';
    $('menuRating').textContent = u.rating || 1200;
    $('statGames').textContent = u.games || 0;
    $('statWins').textContent = u.wins || 0;
    var rate = u.games ? Math.round((u.wins / u.games) * 100) : 0;
    $('statRate').textContent = rate + '٪';
    if (S.profile && S.profile.tierIcon) $('menuTier').textContent = S.profile.tierIcon;
    var photo = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.photo_url : null;
    if (photo) $('menuAvatar').innerHTML = '<img src="' + esc(photo) + '" alt="">';
  }

  /* ---------------- اتاق ---------------- */

  function createRoom(opts) {
    if (S.busy) return;
    S.busy = true;
    show('loader');
    api('/api/room/create', opts).then(function (res) {
      S.busy = false;
      if (!res.ok) { showError('ساخت اتاق ناموفق بود', res.error || ''); return; }
      S.roomId = res.roomId;
      connect();
    });
  }

  function joinRoom(opts) {
    if (S.busy) return;
    S.busy = true;
    show('loader');
    api('/api/room/join', opts).then(function (res) {
      S.busy = false;
      if (!res.ok) {
        var msgs = {
          ROOM_FULL: 'این اتاق پر است.',
          ALREADY_STARTED: 'بازی این اتاق شروع شده.',
          NOT_FOUND: 'اتاق پیدا نشد.'
        };
        $('joinErr').textContent = msgs[res.error] || 'ورود ناموفق بود.';
        show(S.me ? 'menuScreen' : 'errorScreen');
        toast(msgs[res.error] || 'ورود ناموفق بود');
        return;
      }
      S.roomId = res.roomId;
      connect();
    });
  }

  /* ---------------- WebSocket ---------------- */

  function connect() {
    if (!S.roomId) return;
    closeSocket();

    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var url = proto + '//' + location.host + '/api/ws?room=' + encodeURIComponent(S.roomId) +
      '&initData=' + encodeURIComponent(S.initData);

    var ws;
    try { ws = new WebSocket(url); } catch (e) { scheduleReconnect(); return; }
    S.ws = ws;
    setConn('connecting');

    ws.onopen = function () {
      S.wsTries = 0;
      setConn('online');
      clearInterval(S.pingTimer);
      S.pingTimer = setInterval(function () {
        if (ws.readyState === 1) ws.send(JSON.stringify({ t: 'PING' }));
      }, 20000);
    };

    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      onServerMessage(msg);
    };

    ws.onclose = function () {
      clearInterval(S.pingTimer);
      setConn('offline');
      scheduleReconnect();
    };

    ws.onerror = function () { setConn('offline'); };
  }

  function closeSocket() {
    clearInterval(S.pingTimer);
    if (S.ws) {
      try { S.ws.onclose = null; S.ws.close(); } catch (e) { /* ignore */ }
      S.ws = null;
    }
  }

  function scheduleReconnect() {
    if (S.reconnectTimer) return;
    if (!S.roomId) return;
    S.wsTries++;
    var delay = Math.min(1000 * Math.pow(1.6, S.wsTries), 15000);
    setConn('connecting');
    S.reconnectTimer = setTimeout(function () {
      S.reconnectTimer = null;
      connect();
    }, delay);
  }

  function send(obj) {
    if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(obj));
    else toast('اتصال برقرار نیست…');
  }

  function setConn(mode) {
    var icon = mode === 'online' ? '🟢' : mode === 'connecting' ? '🟡' : '🔴';
    $('gameConn').textContent = icon;
    $('lobbyConn').textContent = icon;
  }

  /* ---------------- پیام‌های سرور ---------------- */

  function onServerMessage(msg) {
    if (msg.t === 'PONG') return;

    if (msg.t === 'WELCOME') {
      S.playerId = msg.you;
      S.seat = msg.seat;
      applyState(msg.state, true);
      return;
    }

    if (msg.t === 'SYNC') { applyState(msg.state, false); return; }

    if (msg.t === 'RESULT') {
      applyState(msg.state, false);
      showResult(msg.outcomes || []);
      return;
    }

    if (msg.t === 'ERROR') {
      if (msg.code === 'NOT_YOUR_TURN') toast('الان نوبت تو نیست');
      haptic('error');
      return;
    }
  }

  function applyState(state, first) {
    if (!state) return;
    var prev = S.state;
    S.state = state;

    if (state.status === 'LOBBY') {
      renderLobby();
      if (S.screen !== 'lobbyScreen') show('lobbyScreen');
      return;
    }

    if (state.status === 'PLAYING') {
      if (S.screen !== 'gameScreen') show('gameScreen');
      renderGame(prev, first);
      return;
    }

    if (state.status === 'FINISHED') {
      renderGame(prev, false);
      if (S.screen !== 'overScreen') showResult([]);
      return;
    }

    if (state.status === 'ABORTED') {
      toast('اتاق بسته شد');
      leaveToMenu();
    }
  }

  /* ---------------- اتاق انتظار ---------------- */

  function renderLobby() {
    var s = S.state;
    $('lobbyCode').textContent = s.joinCode;

    var box = $('lobbyPlayers');
    box.innerHTML = '';
    for (var i = 0; i < s.seatsTotal; i++) {
      var p = null;
      for (var j = 0; j < s.players.length; j++) if (s.players[j].seat === i) p = s.players[j];
      var el = document.createElement('div');
      if (p) {
        el.className = 'player-card c-' + p.color;
        el.innerHTML = '<span class="pname">' + esc(p.name) + '</span>' +
          '<span class="pst">' + statusIcon(p.status) + '</span>';
      } else {
        el.className = 'player-card empty';
        el.innerHTML = '<span class="pname">در انتظار بازیکن…</span>';
      }
      box.appendChild(el);
    }

    var isHost = s.hostId === S.playerId;
    $('btnStart').disabled = !isHost || s.players.length < 2;
    $('btnAddBot').disabled = !isHost || s.players.length >= s.seatsTotal;
  }

  function statusIcon(st) {
    return st === 'ONLINE' ? '🟢' : st === 'IDLE' ? '🟡' : st === 'DISCONNECTED' ? '🔴'
      : st === 'BOT_CONTROLLED' ? '🤖' : '⚪';
  }

  /* ---------------- تخته و مهره‌ها ---------------- */

  function renderGame(prev, first) {
    var s = S.state;
    renderStrip();
    renderTokens();
    renderTurn();
    renderChat();
    processEvents(prev, first);
    startTimerLoop();
  }

  function renderStrip() {
    var s = S.state;
    var box = $('playersStrip');
    box.innerHTML = '';
    for (var i = 0; i < s.players.length; i++) {
      var p = s.players[i];
      var el = document.createElement('div');
      el.className = 'pstrip' + (p.seat === s.turnSeat ? ' active' : '');
      el.innerHTML =
        '<div class="top"><span class="dot ' + p.color + '"></span>' + esc(short(p.name)) + '</div>' +
        '<div class="bot">🏠 ' + p.finished + '/4 · ' + statusIcon(p.status) + '</div>';
      box.appendChild(el);
    }
  }

  function short(name) {
    return name.length > 9 ? name.slice(0, 9) + '…' : name;
  }

  function renderTokens() {
    var s = S.state;
    var layer = $('tokensLayer');
    var myTurn = isMyTurn();
    var movable = {};
    if (myTurn && s.phase === 'MOVE') {
      for (var m = 0; m < s.legalMoves.length; m++) movable[s.legalMoves[m].token] = true;
    }

    // گروه‌بندی مهره‌های هم‌خانه
    var groups = {};
    for (var i = 0; i < s.players.length; i++) {
      var p = s.players[i];
      for (var k = 0; k < p.tokens.length; k++) {
        var tk = p.tokens[k];
        var key;
        if (B.isOnTrack(tk.p)) key = 'a' + B.toAbsolute(p.color, tk.p);
        else if (B.isInHome(tk.p)) key = 'h' + p.color + tk.p;
        else if (B.isFinished(tk.p)) key = 'f' + p.color;
        else key = 'b' + p.color + tk.i;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ p: p, tk: tk });
      }
    }

    var existing = {};
    var nodes = layer.children;
    for (var n = 0; n < nodes.length; n++) existing[nodes[n].dataset.key] = nodes[n];

    var used = {};
    Object.keys(groups).forEach(function (gk) {
      var list = groups[gk];
      for (var idx = 0; idx < list.length; idx++) {
        var item = list[idx];
        var pl = item.p;
        var tk = item.tk;
        var id = pl.seat + '-' + tk.i;
        used[id] = true;

        var cell = B.cellOf(pl.color, tk.p, tk.i);
        var off = B.spreadOffset(idx, list.length);
        var pos = B.toPercent({ x: cell.x + (off.dx * 0.28), y: cell.y + (off.dy * 0.22) });

        var el = existing[id];
        if (!el) {
          el = document.createElement('div');
          el.dataset.key = id;
          el.innerHTML = '<div class="cap"></div><div class="gloss"></div>';
          layer.appendChild(el);
        }

        var cls = 'token ' + pl.color;
        if (B.isFinished(tk.p)) cls += ' done';
        if (pl.seat === S.seat && movable[tk.i]) cls += ' movable';
        if (list.length > 1) cls += ' stacked';
        el.className = cls;
        if (list.length > 1) el.dataset.stack = list.length; else delete el.dataset.stack;
        el.style.left = pos.left + '%';
        el.style.top = pos.top + '%';

        if (pl.seat === S.seat && movable[tk.i]) {
          el.onclick = makeMoveHandler(tk.i);
        } else {
          el.onclick = null;
        }
      }
    });

    for (var key in existing) {
      if (!used[key]) layer.removeChild(existing[key]);
    }
  }

  function makeMoveHandler(tokenIndex) {
    return function () {
      haptic('select');
      beep(660, 0.08);
      send({ t: 'MOVE', token: tokenIndex });
    };
  }

  function isMyTurn() {
    var s = S.state;
    if (!s || s.status !== 'PLAYING') return false;
    var me = playerBySeat(S.seat);
    return !!me && s.turnSeat === S.seat;
  }

  function playerBySeat(seat) {
    var s = S.state;
    if (!s) return null;
    for (var i = 0; i < s.players.length; i++) if (s.players[i].seat === seat) return s.players[i];
    return null;
  }

  function renderTurn() {
    var s = S.state;
    var cur = playerBySeat(s.turnSeat);
    $('turnName').textContent = cur ? cur.name : '—';
    var dot = $('turnDot');
    dot.style.background = cur ? colorVar(cur.color) : 'var(--muted)';

    var myTurn = isMyTurn();
    var rollBtn = $('btnRoll');
    rollBtn.disabled = !(myTurn && s.phase === 'ROLL');
    rollBtn.classList.toggle('ready', myTurn && s.phase === 'ROLL');

    if (s.dice) $('diceValue').textContent = s.dice;

    var hint = $('hint');
    if (!myTurn) hint.textContent = cur ? 'نوبت ' + short(cur.name) : '…';
    else if (s.phase === 'ROLL') hint.textContent = 'تاس را بریز 🎲';
    else if (s.phase === 'MOVE') hint.textContent = 'مهرهٔ درخشان را انتخاب کن';
    else hint.textContent = 'در حال پردازش…';
  }

  function colorVar(c) {
    return c === 'RED' ? 'var(--red)' : c === 'GREEN' ? 'var(--green)'
      : c === 'YELLOW' ? 'var(--yellow)' : 'var(--blue)';
  }

  /* ---------------- تایمر نوبت ---------------- */

  function startTimerLoop() {
    if (S.timerRaf) cancelAnimationFrame(S.timerRaf);
    var fill = $('timerFill');

    function tick() {
      var s = S.state;
      if (!s || s.status !== 'PLAYING') { fill.style.width = '0%'; return; }
      var total = Math.max(1, s.deadlineAt - s.turnStartedAt);
      var left = Math.max(0, s.deadlineAt - Date.now());
      var pct = Math.max(0, Math.min(100, (left / total) * 100));
      fill.style.width = pct + '%';
      fill.className = 'timer-fill' + (pct < 20 ? ' critical' : pct < 45 ? ' low' : '');
      S.timerRaf = requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------------- رویدادها و جلوه‌ها ---------------- */

  function processEvents(prev, first) {
    var s = S.state;
    if (!s.events) return;
    if (first) { S.seenEvents = s.events.length; return; }

    var start = Math.max(0, S.seenEvents);
    if (start > s.events.length) start = 0;

    for (var i = start; i < s.events.length; i++) {
      var e = s.events[i];
      if (e.t === 'DICE') {
        animateDice(e.value);
        beep(520, 0.1);
      } else if (e.t === 'CAPTURE') {
        fx('💥', e.seat, e.token);
        haptic('heavy');
        beep(220, 0.18);
      } else if (e.t === 'HOME') {
        fx('🏠', e.seat, e.token);
        beep(880, 0.15);
      } else if (e.t === 'NO_MOVES') {
        if (e.seat === S.seat) toast('حرکتی ممکن نیست');
      } else if (e.t === 'THREE_SIXES') {
        if (e.seat === S.seat) toast('سه شش پشت سر هم! نوبت سوخت');
      } else if (e.t === 'TURN' && e.seat === S.seat) {
        haptic('success');
        beep(700, 0.12);
      } else if (e.t === 'TIMEOUT' && e.seat === S.seat) {
        toast('وقتت تمام شد');
      } else if (e.t === 'PLAYER_STATUS') {
        var p = playerBySeat(e.seat);
        if (p && e.status === 'BOT_CONTROLLED') toast(short(p.name) + ' → ربات');
      }
    }
    S.seenEvents = s.events.length;
  }

  function animateDice(value) {
    var box = $('dice');
    var val = $('diceValue');
    box.classList.remove('rolling');
    void box.offsetWidth;
    box.classList.add('rolling');
    var spins = 0;
    var iv = setInterval(function () {
      val.textContent = 1 + Math.floor(Math.random() * 6);
      if (++spins > 6) { clearInterval(iv); val.textContent = value; }
    }, 90);
  }

  function fx(symbol, seat, tokenIndex) {
    var p = playerBySeat(seat);
    if (!p) return;
    var tk = null;
    for (var i = 0; i < p.tokens.length; i++) if (p.tokens[i].i === tokenIndex) tk = p.tokens[i];
    if (!tk) return;
    var cell = B.cellOf(p.color, tk.p, tk.i);
    var pos = B.toPercent(cell);

    var layer = $('fxLayer');
    var el = document.createElement('div');
    el.className = 'fx';
    el.textContent = symbol;
    el.style.left = pos.left + '%';
    el.style.top = pos.top + '%';
    layer.appendChild(el);

    var r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = pos.left + '%';
    r.style.top = pos.top + '%';
    layer.appendChild(r);

    setTimeout(function () {
      if (el.parentNode) layer.removeChild(el);
      if (r.parentNode) layer.removeChild(r);
    }, 1100);
  }

  /* ---------------- چت ---------------- */

  function renderChat() {
    var s = S.state;
    var box = $('chatMsgs');
    if (!s.chat) return;
    if (box.dataset.count === String(s.chat.length)) return;
    box.dataset.count = String(s.chat.length);
    box.innerHTML = '';
    for (var i = 0; i < s.chat.length; i++) {
      var m = s.chat[i];
      var el = document.createElement('div');
      el.className = 'cmsg' + (m.seat === S.seat ? ' mine' : '');
      el.innerHTML = '<span class="snd">' + esc(m.name) + '</span>' + esc(m.text);
      box.appendChild(el);
    }
    box.scrollTop = box.scrollHeight;
  }

  function buildQuickReplies() {
    var box = $('quickReplies');
    box.innerHTML = '';
    QUICK_REPLIES.forEach(function (text) {
      var b = document.createElement('button');
      b.textContent = text;
      b.onclick = function () { send({ t: 'CHAT', text: text, quick: true }); };
      box.appendChild(b);
    });
  }

  /* ---------------- نتیجه ---------------- */

  function showResult(outcomes) {
    var s = S.state;
    if (!s) return;

    var ranked = s.players.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    });

    var me = playerBySeat(S.seat);
    var won = me && me.rank === 1;
    $('overIcon').textContent = won ? '🎉' : '🏁';
    $('overTitle').textContent = won ? 'تو بردی!' : 'بازی تمام شد';

    var medals = ['🥇', '🥈', '🥉', '4️⃣'];
    var list = $('overRanks');
    list.innerHTML = '';
    ranked.forEach(function (p, i) {
      var d = document.createElement('div');
      d.innerHTML = '<span>' + (medals[i] || '•') + '</span><span class="dot ' + p.color +
        '" style="width:10px;height:10px;border-radius:50%"></span><span>' + esc(p.name) + '</span>';
      list.appendChild(d);
    });

    var mine = null;
    for (var i = 0; i < outcomes.length; i++) {
      if (S.me && Number(outcomes[i].tgId) === Number(S.me.tg_id)) mine = outcomes[i];
    }

    var dur = s.finishedAt && s.startedAt ? Math.round((s.finishedAt - s.startedAt) / 1000) : 0;
    var mm = Math.floor(dur / 60), ss = dur % 60;

    $('overStats').innerHTML =
      '<div>⏱ مدت<b>' + mm + ':' + (ss < 10 ? '0' : '') + ss + '</b></div>' +
      '<div>⚔️ زده‌شده<b>' + (me ? me.captures : 0) + '</b></div>' +
      '<div>📊 امتیاز<b>' + (mine ? mine.ratingAfter + ' (' + (mine.ratingDelta >= 0 ? '+' : '') + mine.ratingDelta + ')' : '—') + '</b></div>' +
      '<div>🎚 XP<b>+' + (mine ? mine.xpGained : 0) + '</b></div>';

    if (mine && mine.newAchievements && mine.newAchievements.length) {
      toast('🏅 دستاورد جدید!');
    }

    haptic(won ? 'success' : 'light');
    beep(won ? 900 : 300, 0.25);
    show('overScreen');
  }

  function leaveToMenu() {
    closeSocket();
    clearTimeout(S.reconnectTimer);
    S.reconnectTimer = null;
    S.roomId = null;
    S.state = null;
    S.seenEvents = 0;
    if (S.timerRaf) cancelAnimationFrame(S.timerRaf);
    api('/api/me').then(function (res) {
      if (res.ok) { S.me = res.user; S.profile = res.profile; paintMenu(); }
      S.history = [];
      S.screen = '';
      show('menuScreen');
    });
  }

  /* ---------------- صفحه‌های فرعی ---------------- */

  function openLeaderboard() {
    show('boardScreen');
    var box = $('leaderList');
    box.innerHTML = '<p class="muted">در حال بارگذاری…</p>';
    api('/api/leaderboard?page=1').then(function (res) {
      box.innerHTML = '';
      if (!res.ok || !res.rows || !res.rows.length) {
        box.innerHTML = '<p class="muted">هنوز بازی‌ای ثبت نشده است.</p>';
        return;
      }
      res.rows.forEach(function (r, i) {
        var medals = ['🥇', '🥈', '🥉'];
        var el = document.createElement('div');
        el.className = 'rank-row' + (S.me && r.tg_id === S.me.tg_id ? ' me' : '');
        el.innerHTML = '<span class="pos">' + (medals[i] || (i + 1) + '.') + '</span>' +
          '<span class="nm">' + esc(r.name) + '</span>' +
          '<span class="pt">' + r.rating + '</span>';
        box.appendChild(el);
      });
    });
  }

  function openProfile() {
    show('profileScreen');
    var box = $('profileBody');
    box.innerHTML = '<p class="muted">در حال بارگذاری…</p>';
    api('/api/profile').then(function (res) {
      if (!res.ok || !res.profile) { box.innerHTML = '<p class="muted">یافت نشد.</p>'; return; }
      var p = res.profile;
      var rate = p.games ? Math.round((p.wins / p.games) * 100) : 0;
      box.innerHTML =
        '<div class="glass-card">' +
        '<div class="big-icon">' + (p.tierIcon || '🌱') + '</div>' +
        '<h2>' + esc(p.name) + '</h2>' +
        '<p class="muted">امتیاز ' + p.rating + ' · رتبهٔ جهانی ' + p.globalRank + '</p>' +
        '</div>' +
        '<div class="stat-row">' +
        '<div class="stat"><b>' + p.games + '</b><span>بازی</span></div>' +
        '<div class="stat"><b>' + p.wins + '</b><span>برد</span></div>' +
        '<div class="stat"><b>' + rate + '٪</b><span>درصد برد</span></div>' +
        '</div>' +
        '<div class="stat-row">' +
        '<div class="stat"><b>' + p.level + '</b><span>سطح</span></div>' +
        '<div class="stat"><b>' + p.captures + '</b><span>زده‌شده</span></div>' +
        '<div class="stat"><b>' + p.coins + '</b><span>سکه</span></div>' +
        '</div>';
    });
  }

  function openSettings() {
    show('settingsScreen');
    paintSettings();
  }

  function paintSettings() {
    var u = S.me || {};
    $('setSoundVal').textContent = u.sound ? 'روشن' : 'خاموش';
    $('setChatVal').textContent = u.chat ? 'روشن' : 'خاموش';
    $('setThemeVal').textContent = u.theme === 'light' ? 'روشن' : 'تیره';
    $('setLangVal').textContent = u.lang === 'en' ? 'English' : 'فارسی';
  }

  function saveSetting(patch) {
    api('/api/settings', patch).then(function (res) {
      if (res.ok && res.user) {
        S.me = res.user;
        S.sound = !!res.user.sound;
        S.chatOn = !!res.user.chat;
        document.body.className = res.user.theme === 'light' ? 'theme-light' : 'theme-dark';
        paintSettings();
        paintMenu();
      }
    });
  }

  /* ---------------- اتصال دکمه‌ها ---------------- */

  function bindUI() {
    buildQuickReplies();

    var tiles = document.querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].addEventListener('click', function () {
        var act = this.dataset.act;
        haptic('select');
        if (act === 'ai') show('aiScreen');
        else if (act === 'create2') createRoom({ mode: '2P', rulesId: 'classic' });
        else if (act === 'create4') createRoom({ mode: '4P', rulesId: 'classic' });
        else if (act === 'join') { $('joinErr').textContent = ''; show('joinScreen'); }
        else if (act === 'board') openLeaderboard();
        else if (act === 'profile') openProfile();
      });
    }

    var aiBtns = document.querySelectorAll('[data-ai]');
    for (var j = 0; j < aiBtns.length; j++) {
      aiBtns[j].addEventListener('click', function () {
        createRoom({ mode: 'AI', rulesId: 'classic', aiLevel: this.dataset.ai });
      });
    }

    var backs = document.querySelectorAll('[data-back]');
    for (var k = 0; k < backs.length; k++) backs[k].addEventListener('click', goBack);

    on($('btnRetry'), 'click', function () { location.reload(); });
    on($('btnSettings'), 'click', openSettings);

    on($('btnJoinCode'), 'click', function () {
      var code = ($('codeInput').value || '').trim().toUpperCase();
      if (code.length !== 6) { $('joinErr').textContent = 'کد باید ۶ حرف باشد.'; return; }
      joinRoom({ code: code });
    });

    on($('btnCopyCode'), 'click', function () {
      var code = $('lobbyCode').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(code);
      toast('کد کپی شد: ' + code);
    });

    on($('btnInvite'), 'click', function () {
      if (!S.state || !tg) return;
      var link = 'https://t.me/' + (tg.initDataUnsafe.bot_username || '') + '?start=' + S.state.roomId;
      var text = '🎲 بیا منچ بازی کنیم! کد اتاق: ' + S.state.joinCode;
      try {
        tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) +
          '&text=' + encodeURIComponent(text));
      } catch (e) {
        if (navigator.clipboard) navigator.clipboard.writeText(link);
        toast('لینک کپی شد');
      }
    });

    on($('btnStart'), 'click', function () {
      api('/api/room/start', { roomId: S.roomId });
    });

    on($('btnAddBot'), 'click', function () {
      api('/api/room/addbot', { roomId: S.roomId, level: 'NORMAL' });
    });

    on($('btnLeaveLobby'), 'click', function () {
      api('/api/room/leave', { roomId: S.roomId }).then(leaveToMenu);
    });

    on($('btnExitGame'), 'click', function () {
      if (tg && tg.showConfirm) {
        tg.showConfirm('از بازی خارج می‌شوی؟ ربات جای تو بازی می‌کند.', function (yes) {
          if (yes) leaveToMenu();
        });
      } else {
        leaveToMenu();
      }
    });

    on($('btnRoll'), 'click', function () {
      haptic('medium');
      send({ t: 'ROLL' });
    });

    on($('btnChat'), 'click', function () {
      if (!S.chatOn) { toast('چت خاموش است'); return; }
      $('chatPanel').classList.remove('hidden');
      renderChat();
    });
    on($('btnCloseChat'), 'click', function () { $('chatPanel').classList.add('hidden'); });

    on($('btnSendChat'), 'click', sendChat);
    on($('chatText'), 'keydown', function (e) { if (e.key === 'Enter') sendChat(); });

    function sendChat() {
      var input = $('chatText');
      var text = (input.value || '').trim();
      if (!text) return;
      send({ t: 'CHAT', text: text, quick: false });
      input.value = '';
    }

    on($('btnAgain'), 'click', function () {
      var mode = S.state ? S.state.mode : '2P';
      var rules = S.state ? S.state.rulesId : 'classic';
      leaveToMenu();
      setTimeout(function () { createRoom({ mode: mode, rulesId: rules }); }, 300);
    });

    on($('btnHome'), 'click', leaveToMenu);

    on($('setSound'), 'click', function () { saveSetting({ sound: !S.me.sound }); });
    on($('setChat'), 'click', function () { saveSetting({ chat: !S.me.chat }); });
    on($('setTheme'), 'click', function () {
      saveSetting({ theme: S.me.theme === 'light' ? 'dark' : 'light' });
    });
    on($('setLang'), 'click', function () {
      saveSetting({ lang: S.me.lang === 'en' ? 'fa' : 'en' });
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && S.roomId && (!S.ws || S.ws.readyState !== 1)) connect();
    });
  }

  /* ---------------- شروع برنامه ---------------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
