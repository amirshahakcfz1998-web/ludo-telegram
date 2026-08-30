/** GameRoom: اتاق زندهٔ بازی — WebSocket، تایمر نوبت، ربات جایگزین، چت، سکه و پایان بازی */
import { DurableObject } from 'cloudflare:workers';
import {
  applyChosenMove,
  cloneState,
  createInitialState,
  createPlayer,
  getLegalMoves,
  performMove,
  performRoll,
  playerById,
  pushChat,
  pushEvent,
  seatPlayer,
  startGame,
  assignColors,
} from '../game/engine';
import { chooseFallbackMove, chooseMove, thinkDelayMs } from '../ai/ai';
import { getRules, MODE_SEATS, SEAT_COLORS } from '../config/rules';
import { generateSessionToken } from '../game/rng';
import { sanitizeText } from '../utils/auth';
import { fail, json, ok } from '../utils/helpers';
import { TelegramAPI } from '../telegram/api';
import { entryFee, prizeByRank, teamPrizeEach, normalizeStake, stakeLabel } from '../config/coins';
import type { AILevel, GameMode, GameState, Player, Visibility } from '../game/types';

const STATE_KEY = 'state';
const MAX_TICKS = 40;

interface SocketMeta {
  tgId: number;
  playerId: string;
  name: string;
  session: string;
}

interface JoinInput {
  tgId: number;
  name: string;
  username?: string | null;
  photo?: string | null;
  rating?: number;
  chatId?: number | null;
}

interface HubCoins {
  chargeEntry(
    tgIds: number[],
    amount: number,
    roomId: string,
  ): Promise<{ ok: boolean; short: number[]; balances: Record<string, number> }>;
  refundEntry(tgIds: number[], amount: number, roomId: string): Promise<void>;
  recordMatch(input: unknown): Promise<unknown[]>;
  updateRoom(roomId: string, players: number, status: string): Promise<void>;
  setLastRoom(tgId: number, roomId: string | null): Promise<void>;
  removeRoom(roomId: string): Promise<void>;
}

export class GameRoom extends DurableObject {
  private state: GameState | null = null;
  private notifyChats = new Map<number, number>(); // tgId -> chatId

  /** مبلغ میز و وضعیت پرداخت */
  private stake = 0;
  private teamMode = false;
  private charged = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<GameState>(STATE_KEY)) ?? null;
      this.notifyChats = (await ctx.storage.get<Map<number, number>>('chats')) ?? new Map();
      this.stake = (await ctx.storage.get<number>('stake')) ?? 0;
      this.teamMode = (await ctx.storage.get<boolean>('teamMode')) ?? false;
      this.charged = (await ctx.storage.get<boolean>('charged')) ?? false;
    });
  }

  private hub(): HubCoins {
    const env = this.env as Env;
    return env.HUB.get(env.HUB.idFromName('global')) as unknown as HubCoins;
  }

  /* ---------------------------------------------------------------- */
  /* ذخیره و پخش وضعیت                                                 */
  /* ---------------------------------------------------------------- */

  private async save(): Promise<void> {
    if (!this.state) return;
    this.state.version++;
    await this.ctx.storage.put(STATE_KEY, this.state);
  }

  private publicState(): (GameState & { stake?: number; fee?: number; teamMode?: boolean }) | null {
    if (!this.state) return null;
    const s = cloneState(this.state) as GameState & { stake?: number; fee?: number; teamMode?: boolean };
    s.stake = this.stake;
    s.fee = entryFee(this.stake, this.state.seatsTotal);
    s.teamMode = this.teamMode;
    return s;
  }

  private broadcast(payload: unknown): void {
    const text = JSON.stringify(payload);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(text);
      } catch {
        /* اتصال بسته شده است */
      }
    }
  }

  private syncAll(): void {
    if (!this.state) return;
    this.broadcast({ t: 'SYNC', state: this.publicState(), now: Date.now() });
  }

  private metaOf(ws: WebSocket): SocketMeta | null {
    try {
      return ws.deserializeAttachment() as SocketMeta;
    } catch {
      return null;
    }
  }

  private socketsOf(playerId: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => this.metaOf(ws)?.playerId === playerId);
  }

  /* ---------------------------------------------------------------- */
  /* مسیرهای HTTP                                                      */
  /* ---------------------------------------------------------------- */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '');

    if (path === 'ws') return this.handleUpgrade(request, url);

    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

    switch (path) {
      case 'init':
        return this.doInit(body as Record<string, unknown>);
      case 'join':
        return this.doJoin(body as unknown as JoinInput);
      case 'addbot':
        return this.doAddBot(body as { level?: AILevel; tgId?: number });
      case 'start':
        return this.doStart(body as { tgId: number });
      case 'leave':
        return this.doLeave(body as { tgId: number });
      case 'state':
        return this.state ? json({ ok: true, state: this.publicState(), now: Date.now() }) : fail('NO_ROOM', 404);
      case 'summary':
        return json({ ok: true, summary: this.summary() });
      default:
        return fail('NOT_FOUND', 404);
    }
  }

  private summary(): Record<string, unknown> | null {
    if (!this.state) return null;
    const s = this.state;
    return {
      roomId: s.roomId,
      joinCode: s.joinCode,
      mode: s.mode,
      visibility: s.visibility,
      rulesId: s.rulesId,
      status: s.status,
      hostId: s.hostId,
      seatsTotal: s.seatsTotal,
      count: s.players.length,
      stake: this.stake,
      fee: entryFee(this.stake, s.seatsTotal),
      teamMode: this.teamMode,
      players: s.players.map((p) => ({
        tgId: p.tgId,
        name: p.name,
        color: p.color,
        seat: p.seat,
        isAI: p.isAI,
        aiLevel: p.aiLevel,
        status: p.status,
        rank: p.rank,
      })),
    };
  }

  /* ---------------------------------------------------------------- */
  /* ساخت اتاق و ورود بازیکن                                           */
  /* ---------------------------------------------------------------- */

  private async doInit(body: Record<string, unknown>): Promise<Response> {
    if (this.state) return json({ ok: true, summary: this.summary(), existed: true });

    const roomId = String(body.roomId ?? '');
    const joinCode = String(body.joinCode ?? '');
    const mode = (body.mode as GameMode) ?? '2P';
    const visibility = (body.visibility as Visibility) ?? 'PRIVATE';
    const rulesId = String(body.rulesId ?? 'classic');
    const host = body.host as JoinInput | undefined;
    if (!roomId || !joinCode || !host) return fail('BAD_INIT');

    this.state = createInitialState({
      roomId,
      joinCode,
      mode,
      visibility,
      rulesId,
      hostId: `u${host.tgId}`,
    });
    this.state.seatsTotal = MODE_SEATS[mode] ?? 4;

    // بازی با ربات همیشه دوستانه است
    this.stake = mode === 'AI' ? 0 : normalizeStake(body.stake);
    this.teamMode = Boolean(body.teamMode ?? false) && this.state.seatsTotal === 4;
    this.charged = false;
    await this.ctx.storage.put('stake', this.stake);
    await this.ctx.storage.put('teamMode', this.teamMode);
    await this.ctx.storage.put('charged', false);

    this.addHuman(host);

    if (mode === 'AI') {
      const level = (body.aiLevel as AILevel) ?? 'NORMAL';
      const seats = this.state.seatsTotal;
      while (this.state.players.length < seats) this.addBot(level);
    }

    if (host.chatId) this.notifyChats.set(host.tgId, host.chatId);
    await this.persistChats();
    await this.save();
    await this.scheduleNext();
    return json({ ok: true, summary: this.summary() });
  }

  private addHuman(input: JoinInput): Player {
    const s = this.state as GameState;
    const rules = getRules(s.rulesId);
    const seat = s.players.length;
    const palette = SEAT_COLORS[s.seatsTotal] ?? SEAT_COLORS[4];
    const p = createPlayer({
      id: `u${input.tgId}`,
      tgId: input.tgId,
      name: input.name,
      username: input.username ?? null,
      photo: input.photo ?? null,
      seat,
      color: palette[seat] ?? 'RED',
      rating: input.rating ?? rules.elo.base,
      tokensPerPlayer: rules.tokensPerPlayer,
    });
    s.players.push(p);
    pushEvent(s, { t: 'PLAYER_JOIN', seat });
    return p;
  }

  private addBot(level: AILevel): Player {
    const s = this.state as GameState;
    const rules = getRules(s.rulesId);
    const seat = s.players.length;
    const palette = SEAT_COLORS[s.seatsTotal] ?? SEAT_COLORS[4];
    const names: Record<AILevel, string> = {
      EASY: '🤖 ربات آسان',
      NORMAL: '🤖 ربات معمولی',
      HARD: '🤖 ربات سخت',
      EXPERT: '🤖 ربات حرفه‌ای',
      MASTER: '🤖 ربات استاد',
    };
    const p = createPlayer({
      id: `bot${seat}_${level}`,
      tgId: null,
      name: names[level] ?? '🤖 ربات',
      seat,
      color: palette[seat] ?? 'BLUE',
      isAI: true,
      aiLevel: level,
      tokensPerPlayer: rules.tokensPerPlayer,
    });
    s.players.push(p);
    pushEvent(s, { t: 'PLAYER_JOIN', seat });
    return p;
  }

  private async doJoin(input: JoinInput): Promise<Response> {
    const s = this.state;
    if (!s) return fail('NO_ROOM', 404);

    const existing = playerById(s, `u${input.tgId}`);
    if (existing) {
      existing.status = 'ONLINE';
      existing.leftAt = null;
      existing.lastSeen = Date.now();
      existing.name = input.name;
      if (input.chatId) this.notifyChats.set(input.tgId, input.chatId);
      await this.persistChats();
      await this.save();
      this.syncAll();
      return json({ ok: true, rejoined: true, summary: this.summary() });
    }

    if (s.status !== 'LOBBY') return fail('ALREADY_STARTED', 409);
    if (s.players.length >= s.seatsTotal) return fail('ROOM_FULL', 409);

    this.addHuman(input);
    if (input.chatId) this.notifyChats.set(input.tgId, input.chatId);
    await this.persistChats();
    await this.save();
    this.syncAll();

    if (s.players.length >= s.seatsTotal) await this.beginGame();
    return json({ ok: true, summary: this.summary() });
  }

  private async doAddBot(body: { level?: AILevel; tgId?: number }): Promise<Response> {
    const s = this.state;
    if (!s) return fail('NO_ROOM', 404);
    if (s.status !== 'LOBBY') return fail('ALREADY_STARTED', 409);
    if (s.players.length >= s.seatsTotal) return fail('ROOM_FULL', 409);
    if (body.tgId && s.hostId !== `u${body.tgId}`) return fail('NOT_HOST', 403);

    this.addBot(body.level ?? 'NORMAL');
    await this.save();
    this.syncAll();
    if (s.players.length >= s.seatsTotal) await this.beginGame();
    return json({ ok: true, summary: this.summary() });
  }

  private async doStart(body: { tgId: number }): Promise<Response> {
    const s = this.state;
    if (!s) return fail('NO_ROOM', 404);
    if (s.status !== 'LOBBY') return fail('ALREADY_STARTED', 409);
    if (s.hostId !== `u${body.tgId}`) return fail('NOT_HOST', 403);
    if (s.players.length < 2) return fail('NEED_MORE_PLAYERS', 409);

    const res = await this.beginGame();
    if (!res.ok) return json(res, 402);
    return json({ ok: true, summary: this.summary() });
  }

  /** کسر ورودی از همهٔ بازیکنان انسانی */
  private async chargeAll(): Promise<{ ok: boolean; error?: string; short?: number[] }> {
    const s = this.state as GameState;
    if (this.charged) return { ok: true };

    const fee = entryFee(this.stake, s.players.length);
    if (fee <= 0) {
      this.charged = true;
      await this.ctx.storage.put('charged', true);
      return { ok: true };
    }

    const ids = s.players.filter((p) => !p.isAI && p.tgId).map((p) => p.tgId as number);
    if (!ids.length) {
      this.charged = true;
      await this.ctx.storage.put('charged', true);
      return { ok: true };
    }

    try {
      const res = await this.hub().chargeEntry(ids, fee, s.roomId);
      if (!res.ok) {
        const names = s.players
          .filter((p) => p.tgId && res.short.includes(p.tgId))
          .map((p) => p.name)
          .join('، ');
        pushChat(s, -1, 'سیستم', `⚠️ سکهٔ کافی نیست: ${names}`, false);
        return { ok: false, error: 'NOT_ENOUGH_COINS', short: res.short };
      }
      this.charged = true;
      await this.ctx.storage.put('charged', true);
      pushChat(s, -1, 'سیستم', `🪙 میز ${stakeLabel(this.stake)} — ورودی هر نفر ${fee} سکه`, false);
      return { ok: true };
    } catch (err) {
      console.log('chargeEntry failed:', String(err));
      return { ok: true }; // اگر Hub در دسترس نبود، بازی متوقف نشود
    }
  }

  private async beginGame(): Promise<{ ok: boolean; error?: string; short?: number[] }> {
    const s = this.state as GameState;
    if (s.status !== 'LOBBY') return { ok: true };

    s.seatsTotal = s.players.length;

    const charge = await this.chargeAll();
    if (!charge.ok) {
      await this.save();
      this.syncAll();
      return charge;
    }

    assignColors(s);
    startGame(s, Date.now());
    await this.save();
    this.syncAll();
    await this.scheduleNext();
    await this.notifyTurn();
    return { ok: true };
  }

  private async doLeave(body: { tgId: number }): Promise<Response> {
    const s = this.state;
    if (!s) return fail('NO_ROOM', 404);
    const p = playerById(s, `u${body.tgId}`);
    if (!p) return fail('NOT_IN_ROOM', 404);

    if (s.status === 'LOBBY') {
      s.players = s.players.filter((x) => x.id !== p.id);
      assignColors(s);
      if (s.players.length === 0) {
        s.status = 'ABORTED';
      } else if (s.hostId === p.id) {
        s.hostId = s.players[0].id;
      }
    } else {
      p.status = 'LEFT';
      p.leftAt = Date.now();
      pushEvent(s, { t: 'PLAYER_LEAVE', seat: p.seat });
    }

    await this.save();
    this.syncAll();
    await this.scheduleNext();
    return json({ ok: true, summary: this.summary() });
  }

  private async persistChats(): Promise<void> {
    await this.ctx.storage.put('chats', this.notifyChats);
  }

  /* ---------------------------------------------------------------- */
  /* WebSocket                                                         */
  /* ---------------------------------------------------------------- */

  private handleUpgrade(request: Request, url: URL): Response {
    if (request.headers.get('Upgrade') !== 'websocket') return fail('EXPECTED_WEBSOCKET', 426);
    const s = this.state;
    if (!s) return fail('NO_ROOM', 404);

    const tgId = Number(url.searchParams.get('tgId') ?? 0);
    const name = url.searchParams.get('name') ?? 'Player';
    const player = playerById(s, `u${tgId}`);
    if (!player) return fail('NOT_A_PLAYER', 403);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      tgId,
      playerId: player.id,
      name,
      session: generateSessionToken(),
    } satisfies SocketMeta);

    player.status = 'ONLINE';
    player.lastSeen = Date.now();
    player.leftAt = null;
    pushEvent(s, { t: 'PLAYER_STATUS', seat: player.seat, status: 'ONLINE' });

    this.ctx.waitUntil(
      (async () => {
        await this.save();
        this.syncAll();
        await this.scheduleNext();
      })(),
    );

    server.send(
      JSON.stringify({ t: 'WELCOME', you: player.id, seat: player.seat, state: this.publicState(), now: Date.now() }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    const meta = this.metaOf(ws);
    const s = this.state;
    if (!meta || !s) return;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(message) as Record<string, unknown>;
    } catch {
      return;
    }

    const player = playerById(s, meta.playerId);
    if (!player) return;
    player.lastSeen = Date.now();
    if (player.status !== 'ONLINE') {
      player.status = 'ONLINE';
      pushEvent(s, { t: 'PLAYER_STATUS', seat: player.seat, status: 'ONLINE' });
    }

    switch (msg.t) {
      case 'PING':
        ws.send(JSON.stringify({ t: 'PONG', now: Date.now() }));
        return;

      case 'SYNC':
        ws.send(JSON.stringify({ t: 'SYNC', state: this.publicState(), now: Date.now() }));
        return;

      case 'ROLL':
        await this.handleRoll(player);
        return;

      case 'MOVE':
        await this.handleMove(player, Number(msg.token ?? -1));
        return;

      case 'CHAT': {
        const text = sanitizeText(String(msg.text ?? ''), 160);
        if (!text) return;
        pushChat(s, player.seat, player.name, text, Boolean(msg.quick));
        await this.save();
        this.syncAll();
        return;
      }

      default:
        return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.onSocketGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.onSocketGone(ws);
  }

  private async onSocketGone(ws: WebSocket): Promise<void> {
    const meta = this.metaOf(ws);
    const s = this.state;
    if (!meta || !s) return;
    const player = playerById(s, meta.playerId);
    if (!player) return;

    const others = this.socketsOf(player.id).filter((w) => w !== ws);
    if (others.length > 0) return;

    if (player.status === 'ONLINE') {
      player.status = 'DISCONNECTED';
      player.lastSeen = Date.now();
      pushEvent(s, { t: 'PLAYER_STATUS', seat: player.seat, status: 'DISCONNECTED' });
      await this.save();
      this.syncAll();
      await this.scheduleNext();
    }
  }

  /* ---------------------------------------------------------------- */
  /* حرکت‌های بازیکن                                                   */
  /* ---------------------------------------------------------------- */

  private async handleRoll(player: Player): Promise<void> {
    const s = this.state as GameState;
    if (s.status !== 'PLAYING') return;
    if (s.turnSeat !== player.seat) {
      this.sendTo(player.id, { t: 'ERROR', code: 'NOT_YOUR_TURN' });
      return;
    }
    if (s.phase !== 'ROLL') return;

    player.consecutiveMissed = 0;
    performRoll(s, Date.now());
    await this.save();
    this.syncAll();
    await this.scheduleNext();
    await this.afterStateChange();
  }

  private async handleMove(player: Player, token: number): Promise<void> {
    const s = this.state as GameState;
    if (s.status !== 'PLAYING') return;
    if (s.turnSeat !== player.seat) {
      this.sendTo(player.id, { t: 'ERROR', code: 'NOT_YOUR_TURN' });
      return;
    }
    const res = performMove(s, token, Date.now());
    if (!res.ok) {
      this.sendTo(player.id, { t: 'ERROR', code: res.error ?? 'BAD_MOVE' });
      return;
    }
    player.consecutiveMissed = 0;
    await this.save();
    this.syncAll();
    await this.scheduleNext();
    await this.afterStateChange();
  }

  private sendTo(playerId: string, payload: unknown): void {
    const text = JSON.stringify(payload);
    for (const ws of this.socketsOf(playerId)) {
      try {
        ws.send(text);
      } catch {
        /* ignore */
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* تایمر و نوبت خودکار                                               */
  /* ---------------------------------------------------------------- */

  private currentPlayer(): Player | undefined {
    const s = this.state;
    if (!s) return undefined;
    return seatPlayer(s, s.turnSeat);
  }

  private isAutoControlled(p: Player | undefined): boolean {
    if (!p) return false;
    return p.isAI || p.status === 'BOT_CONTROLLED' || p.status === 'LEFT';
  }

  private async scheduleNext(): Promise<void> {
    const s = this.state;
    if (!s) return;
    const rules = getRules(s.rulesId);
    const now = Date.now();

    if (s.status === 'FINISHED' || s.status === 'ABORTED') {
      await this.ctx.storage.setAlarm(now + 60000);
      return;
    }

    if (s.status === 'LOBBY') {
      await this.ctx.storage.setAlarm(now + Math.min(rules.timing.lobbyTimeoutMs, 300000));
      return;
    }

    const p = this.currentPlayer();
    if (this.isAutoControlled(p)) {
      const level = (p?.aiLevel ?? 'NORMAL') as AILevel;
      await this.ctx.storage.setAlarm(now + thinkDelayMs(s, level));
      return;
    }

    await this.ctx.storage.setAlarm(Math.max(now + 500, s.deadlineAt));
  }

  async alarm(): Promise<void> {
    const s = this.state;
    if (!s) return;
    const now = Date.now();
    const rules = getRules(s.rulesId);

    if (s.status === 'ABORTED') return;

    if (s.status === 'FINISHED') {
      if (now - (s.finishedAt ?? now) > rules.timing.roomTtlMs) await this.ctx.storage.deleteAll();
      return;
    }

    if (s.status === 'LOBBY') {
      if (now - s.createdAt > rules.timing.lobbyTimeoutMs) {
        s.status = 'ABORTED';
        await this.refundAll();
        await this.save();
        this.syncAll();
        await this.releaseRoom();
      }
      return;
    }

    // بازیکنانی که مدتی خبری از آن‌ها نیست
    this.refreshPresence(now, rules.timing.idleAfterMs, rules.timing.disconnectedAfterMs);

    let guard = 0;
    while (guard++ < MAX_TICKS && this.state && this.state.status === 'PLAYING') {
      const cur = this.currentPlayer();
      if (!cur) break;

      if (this.isAutoControlled(cur)) {
        this.playAutomatically(cur);
        continue;
      }

      if (Date.now() < this.state.deadlineAt) break;
      this.handleTimeout(cur);
    }

    await this.save();
    this.syncAll();
    await this.scheduleNext();
    await this.afterStateChange();
  }

  /** برگرداندن ورودی وقتی بازی هرگز شروع نشد */
  private async refundAll(): Promise<void> {
    const s = this.state;
    if (!s || !this.charged) return;
    const fee = entryFee(this.stake, s.seatsTotal);
    if (fee <= 0) return;
    const ids = s.players.filter((p) => !p.isAI && p.tgId).map((p) => p.tgId as number);
    if (!ids.length) return;
    try {
      await this.hub().refundEntry(ids, fee, s.roomId);
      this.charged = false;
      await this.ctx.storage.put('charged', false);
    } catch {
      /* ignore */
    }
  }

  private refreshPresence(now: number, idleMs: number, discMs: number): void {
    const s = this.state as GameState;
    for (const p of s.players) {
      if (p.isAI || p.status === 'LEFT' || p.status === 'BOT_CONTROLLED') continue;
      const gap = now - p.lastSeen;
      const online = this.socketsOf(p.id).length > 0;
      if (online && gap < idleMs) {
        if (p.status !== 'ONLINE') {
          p.status = 'ONLINE';
          pushEvent(s, { t: 'PLAYER_STATUS', seat: p.seat, status: 'ONLINE' });
        }
      } else if (gap >= discMs || !online) {
        if (p.status !== 'DISCONNECTED') {
          p.status = 'DISCONNECTED';
          pushEvent(s, { t: 'PLAYER_STATUS', seat: p.seat, status: 'DISCONNECTED' });
        }
      } else if (gap >= idleMs && p.status === 'ONLINE') {
        p.status = 'IDLE';
        pushEvent(s, { t: 'PLAYER_STATUS', seat: p.seat, status: 'IDLE' });
      }
    }
  }

  /** یک اقدام خودکار برای ربات یا بازیکن غایب */
  private playAutomatically(p: Player): void {
    const s = this.state as GameState;
    const now = Date.now();

    if (s.phase === 'ROLL') {
      performRoll(s, now);
      return;
    }

    if (s.phase === 'MOVE') {
      const moves = s.legalMoves.length ? s.legalMoves : getLegalMoves(s, p.seat, s.dice ?? 0);
      const decision = p.isAI
        ? chooseMove(s, p.seat, moves, (p.aiLevel ?? 'NORMAL') as AILevel)
        : chooseFallbackMove(s, p.seat, moves);
      if (decision) applyChosenMove(s, decision.move, now);
      else performRoll(s, now);
      return;
    }

    performRoll(s, now);
  }

  /** پایان مهلت بازیکن انسانی */
  private handleTimeout(p: Player): void {
    const s = this.state as GameState;
    const rules = getRules(s.rulesId);
    const now = Date.now();

    p.missedTurns++;
    p.consecutiveMissed++;
    pushEvent(s, { t: 'TIMEOUT', seat: p.seat, auto: s.phase === 'ROLL' ? 'ROLL' : 'MOVE' });

    if (p.consecutiveMissed >= rules.timing.missedTurnsToBotControl && p.status !== 'BOT_CONTROLLED') {
      p.status = 'BOT_CONTROLLED';
      pushEvent(s, { t: 'PLAYER_STATUS', seat: p.seat, status: 'BOT_CONTROLLED' });
    }

    if (s.phase === 'ROLL') {
      performRoll(s, now);
      return;
    }

    const moves = s.legalMoves.length ? s.legalMoves : getLegalMoves(s, p.seat, s.dice ?? 0);
    const decision = chooseFallbackMove(s, p.seat, moves);
    if (decision) applyChosenMove(s, decision.move, now);
    else performRoll(s, now);
  }

  /* ---------------------------------------------------------------- */
  /* پایان بازی و پرداخت جایزه                                         */
  /* ---------------------------------------------------------------- */

  private finalized = false;

  private async afterStateChange(): Promise<void> {
    const s = this.state;
    if (!s || s.status !== 'FINISHED' || this.finalized) return;
    this.finalized = true;
    await this.finalize();
  }

  /** محاسبهٔ جایزهٔ سکه‌ای هر بازیکن */
  private computePrizes(): Record<string, number> {
    const s = this.state as GameState;
    const prizes: Record<string, number> = {};
    if (this.stake <= 0 || !this.charged) return prizes;

    const seats = s.seatsTotal;

    // حالت تیمی: تیم‌ها بر اساس صندلی‌های روبه‌رو (۰ و ۲ در برابر ۱ و ۳)
    if (this.teamMode && seats === 4) {
      const winnerSeat = s.players.find((p) => p.rank === 1)?.seat ?? 0;
      const team = winnerSeat % 2;
      const winners = s.players.filter((p) => p.seat % 2 === team && !p.isAI && p.tgId);
      const each = teamPrizeEach(this.stake, seats, winners.length || 1);
      for (const w of winners) prizes[String(w.tgId)] = each;
      return prizes;
    }

    // حالت عادی: تقسیم بر اساس رتبه
    const table = prizeByRank(this.stake, seats);
    for (const p of s.players) {
      if (p.isAI || !p.tgId) continue;
      const amount = table[p.rank ?? seats];
      if (amount && amount > 0) prizes[String(p.tgId)] = amount;
    }
    return prizes;
  }

  private async finalize(): Promise<void> {
    const s = this.state as GameState;
    const hub = this.hub();
    const prizes = this.computePrizes();

    let outcomes: Record<string, unknown>[] = [];
    try {
      outcomes = (await hub.recordMatch({
        roomId: s.roomId,
        mode: s.mode,
        rulesId: s.rulesId,
        startedAt: s.startedAt ?? s.createdAt,
        finishedAt: s.finishedAt ?? Date.now(),
        stake: this.stake,
        prizes,
        players: s.players.map((p) => ({
          tgId: p.tgId,
          name: p.name,
          isAI: p.isAI,
          aiLevel: p.aiLevel,
          seat: p.seat,
          rank: p.rank ?? s.players.length,
          captures: p.captures,
          lostTokens: p.lostTokens,
          finished: p.finished,
        })),
      })) as Record<string, unknown>[];
    } catch (err) {
      console.log('recordMatch failed:', String(err));
    }

    try {
      await hub.updateRoom(s.roomId, s.players.length, 'FINISHED');
      for (const p of s.players) if (p.tgId) await hub.setLastRoom(p.tgId, null);
    } catch {
      /* ignore */
    }

    this.broadcast({
      t: 'RESULT',
      state: this.publicState(),
      outcomes,
      prizes,
      stake: this.stake,
      now: Date.now(),
    });
    await this.notifyResult(outcomes);
    await this.ctx.storage.setAlarm(Date.now() + getRules(s.rulesId).timing.roomTtlMs);
  }

  private async releaseRoom(): Promise<void> {
    const s = this.state;
    if (!s) return;
    try {
      await this.hub().removeRoom(s.roomId);
    } catch {
      /* ignore */
    }
  }

  /* ---------------------------------------------------------------- */
  /* اعلان‌های تلگرام                                                  */
  /* ---------------------------------------------------------------- */

  private tg(): TelegramAPI | null {
    const env = this.env as Env;
    if (!env.TELEGRAM_BOT_TOKEN) return null;
    return new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
  }

  private async notifyTurn(): Promise<void> {
    const s = this.state;
    const api = this.tg();
    if (!s || !api) return;
    const p = this.currentPlayer();
    if (!p || p.isAI || !p.tgId) return;
    if (this.socketsOf(p.id).length > 0) return;
    const chatId = this.notifyChats.get(p.tgId);
    if (!chatId) return;
    await api.sendMessage(chatId, `🎲 نوبت توست! کد اتاق <code>${s.joinCode}</code>`);
  }

  private async notifyResult(outcomes: Record<string, unknown>[]): Promise<void> {
    const s = this.state;
    const api = this.tg();
    if (!s || !api) return;

    const ranking = [...s.players]
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((p, i) => `${['🥇', '🥈', '🥉', '4️⃣'][i] ?? '•'} ${p.name}`)
      .join('\n');

    for (const p of s.players) {
      if (!p.tgId) continue;
      const chatId = this.notifyChats.get(p.tgId);
      if (!chatId) continue;
      const o = outcomes.find((x) => Number(x.tgId) === p.tgId);
      const delta = o ? Number(o.ratingDelta ?? 0) : 0;
      const sign = delta >= 0 ? '+' : '';
      const head = p.rank === 1 ? '🎉 <b>تو بردی!</b>' : '🏁 بازی تمام شد';
      const prize = o ? Number(o.coinsPrize ?? 0) : 0;
      const coinLine =
        this.stake > 0
          ? `\n🪙 جایزه: <b>${prize}</b> سکه (موجودی: ${o?.coinsBalance ?? '-'})`
          : '';
      await api.sendMessage(
        chatId,
        `${head}\n\n${ranking}\n\n📊 امتیاز: <b>${o?.ratingAfter ?? '-'}</b> (${sign}${delta})\n🎚 XP: +${o?.xpGained ?? 0}${coinLine}`,
      );
    }
  }
}
