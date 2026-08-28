/** موتور بازی: تولید حرکت‌های مجاز، اجرای حرکت، مدیریت نوبت و تشخیص برنده */
import {
  POS_BASE,
  POS_FINISH,
  isBase,
  isOnTrack,
  isFinished,
  toAbsolute,
  isSafeCell,
  forwardDistance,
} from './board';
import type {
  AILevel,
  ColorId,
  GameEvent,
  GameMode,
  GameState,
  Move,
  Player,
  TokenRef,
  Visibility,
} from './types';
import { getRules, MODE_SEATS, SEAT_COLORS, type GameRules } from '../config/rules';
import { generateId, rollDice } from './rng';

const MAX_EVENTS = 40;
const MAX_CHAT = 60;

/* ------------------------------------------------------------------ */
/* ابزارهای پایه                                                       */
/* ------------------------------------------------------------------ */

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function pushEvent(state: GameState, ev: GameEvent): void {
  state.events.push(ev);
  if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
}

export function pushChat(state: GameState, seat: number, name: string, text: string, quick: boolean): void {
  const msg = { id: generateId('m'), seat, name, text, quick, at: Date.now() };
  state.chat.push(msg);
  if (state.chat.length > MAX_CHAT) state.chat.splice(0, state.chat.length - MAX_CHAT);
  pushEvent(state, { t: 'CHAT', msg });
}

export function seatPlayer(state: GameState, seat: number): Player | undefined {
  return state.players.find((p) => p.seat === seat);
}

export function playerById(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** بازیکنانی که هنوز در بازی هستند (رتبه نگرفته و اتاق را ترک نکرده‌اند) */
export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.rank === null && p.status !== 'LEFT');
}

/* ------------------------------------------------------------------ */
/* ساخت بازیکن و وضعیت اولیه                                           */
/* ------------------------------------------------------------------ */

export interface NewPlayerInput {
  id: string;
  tgId?: number | null;
  name: string;
  username?: string | null;
  photo?: string | null;
  seat: number;
  color: ColorId;
  isAI?: boolean;
  aiLevel?: AILevel | null;
  rating?: number;
  tokensPerPlayer?: number;
}

export function createPlayer(input: NewPlayerInput): Player {
  const count = input.tokensPerPlayer ?? 4;
  const tokens = [];
  for (let i = 0; i < count; i++) tokens.push({ i, p: POS_BASE });
  return {
    id: input.id,
    tgId: input.tgId ?? null,
    name: input.name,
    username: input.username ?? null,
    photo: input.photo ?? null,
    color: input.color,
    seat: input.seat,
    isAI: input.isAI ?? false,
    aiLevel: input.aiLevel ?? null,
    status: input.isAI ? 'BOT_CONTROLLED' : 'ONLINE',
    lastSeen: Date.now(),
    leftAt: null,
    tokens,
    finished: 0,
    rank: null,
    captures: 0,
    lostTokens: 0,
    missedTurns: 0,
    consecutiveMissed: 0,
    rating: input.rating ?? 1200,
    ready: input.isAI ?? false,
  };
}

export interface NewRoomInput {
  roomId: string;
  joinCode: string;
  mode: GameMode;
  visibility: Visibility;
  rulesId: string;
  hostId: string;
}

export function createInitialState(input: NewRoomInput): GameState {
  const now = Date.now();
  return {
    version: 1,
    roomId: input.roomId,
    joinCode: input.joinCode,
    mode: input.mode,
    visibility: input.visibility,
    rulesId: input.rulesId,
    status: 'LOBBY',
    hostId: input.hostId,
    players: [],
    seatsTotal: MODE_SEATS[input.mode] ?? 4,
    turnSeat: 0,
    phase: 'ROLL',
    dice: null,
    diceHistory: [],
    consecutiveSixes: 0,
    legalMoves: [],
    turnStartedAt: now,
    deadlineAt: now,
    turnCount: 0,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    winners: [],
    chat: [],
    events: [],
  };
}

/** رنگ‌ها را بر اساس تعداد واقعی بازیکنان دوباره پخش می‌کند */
export function assignColors(state: GameState): void {
  const n = state.players.length;
  const palette = SEAT_COLORS[n] ?? SEAT_COLORS[4];
  const sorted = [...state.players].sort((a, b) => a.seat - b.seat);
  sorted.forEach((p, idx) => {
    p.seat = idx;
    p.color = palette[idx] ?? 'RED';
  });
  state.players = sorted;
}

/* ------------------------------------------------------------------ */
/* اشغال خانه‌ها و بلوک‌ها                                              */
/* ------------------------------------------------------------------ */

export interface Occupant {
  seat: number;
  token: number;
  color: ColorId;
}

export function buildOccupancy(state: GameState): Map<number, Occupant[]> {
  const map = new Map<number, Occupant[]>();
  for (const pl of state.players) {
    if (pl.status === 'LEFT' && pl.rank === null) {
      // مهره‌های بازیکن خارج‌شده هم روی تخته می‌مانند مگر ربات آن را اداره کند
    }
    for (const tk of pl.tokens) {
      if (!isOnTrack(tk.p)) continue;
      const abs = toAbsolute(pl.color, tk.p);
      const arr = map.get(abs);
      const item: Occupant = { seat: pl.seat, token: tk.i, color: pl.color };
      if (arr) arr.push(item);
      else map.set(abs, [item]);
    }
  }
  return map;
}

function isOpponentBlock(
  occ: Map<number, Occupant[]>,
  abs: number,
  mySeat: number,
  rules: GameRules,
): boolean {
  if (!rules.blocks.enabled) return false;
  if (isSafeCell(abs) && !rules.blocks.activeOnSafeCells) return false;
  const list = occ.get(abs);
  if (!list || list.length < 2) return false;
  const counts = new Map<number, number>();
  for (const o of list) {
    if (o.seat === mySeat) continue;
    counts.set(o.seat, (counts.get(o.seat) ?? 0) + 1);
  }
  for (const c of counts.values()) if (c >= 2) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* تولید حرکت‌های مجاز                                                 */
/* ------------------------------------------------------------------ */

function tryMove(
  rules: GameRules,
  occ: Map<number, Occupant[]>,
  player: Player,
  tokenIndex: number,
  from: number,
  dice: number,
): Move | null {
  if (isFinished(from)) return null;

  let to: number;
  let entering = false;

  if (isBase(from)) {
    if (!rules.entryRolls.includes(dice)) return null;
    to = 0;
    entering = true;
  } else {
    to = from + dice;
    if (to > POS_FINISH) {
      if (rules.exactRollToFinish) return null;
      to = POS_FINISH;
    }
  }

  // بررسی مسیر عبور (بلوک حریف)
  if (!entering && rules.blocks.enabled && !rules.blocks.canBePassed) {
    for (let q = from + 1; q < to; q++) {
      if (!isOnTrack(q)) continue;
      const abs = toAbsolute(player.color, q);
      if (isOpponentBlock(occ, abs, player.seat, rules)) return null;
    }
  }

  const captures: TokenRef[] = [];

  if (isOnTrack(to)) {
    const abs = toAbsolute(player.color, to);
    if (isOpponentBlock(occ, abs, player.seat, rules)) return null;

    const safe = isSafeCell(abs);
    const list = occ.get(abs) ?? [];
    const enemies = list.filter((o) => o.seat !== player.seat);

    if (enemies.length > 0 && (!safe || rules.captureOnSafeCell)) {
      for (const e of enemies) captures.push({ seat: e.seat, token: e.token });
    }

    if (safe && rules.stackLimitOnSafe > 0) {
      const staying = list.length - captures.length;
      if (staying + 1 > rules.stackLimitOnSafe) return null;
    }
  }

  const finishes = to === POS_FINISH;
  const extraTurn =
    rules.extraTurnRolls.includes(dice) ||
    (captures.length > 0 && rules.extraTurnOnCapture) ||
    (finishes && rules.extraTurnOnFinish);

  return { token: tokenIndex, from, to, captures, finishes, extraTurn, entering };
}

export function getLegalMoves(state: GameState, seat: number, dice: number): Move[] {
  const rules = getRules(state.rulesId);
  const player = seatPlayer(state, seat);
  if (!player || player.rank !== null) return [];

  const occ = buildOccupancy(state);
  const moves: Move[] = [];

  for (const tk of player.tokens) {
    const m = tryMove(rules, occ, player, tk.i, tk.p, dice);
    if (m) moves.push(m);
  }

  if (rules.mustEnterIfPossible) {
    const entries = moves.filter((m) => m.entering);
    if (entries.length > 0) return entries;
  }
  return moves;
}

/* ------------------------------------------------------------------ */
/* اجرای حرکت                                                          */
/* ------------------------------------------------------------------ */

export function applyMove(state: GameState, seat: number, move: Move): void {
  const rules = getRules(state.rulesId);
  const player = seatPlayer(state, seat);
  if (!player) return;

  const token = player.tokens.find((t) => t.i === move.token);
  if (!token) return;

  token.p = move.to;

  if (move.entering) pushEvent(state, { t: 'ENTER', seat, token: move.token, to: move.to });
  else pushEvent(state, { t: 'MOVE', seat, token: move.token, from: move.from, to: move.to });

  for (const cap of move.captures) {
    const victim = seatPlayer(state, cap.seat);
    if (!victim) continue;
    const vt = victim.tokens.find((t) => t.i === cap.token);
    if (!vt) continue;
    vt.p = POS_BASE;
    victim.lostTokens++;
    player.captures++;
    pushEvent(state, {
      t: 'CAPTURE',
      seat,
      token: move.token,
      victimSeat: cap.seat,
      victimToken: cap.token,
    });
  }

  if (move.finishes) {
    player.finished++;
    pushEvent(state, { t: 'HOME', seat, token: move.token });
    if (player.finished >= rules.tokensPerPlayer && player.rank === null) {
      const ranked = state.players.filter((p) => p.rank !== null).length;
      player.rank = ranked + 1;
      pushEvent(state, { t: 'RANK', seat, rank: player.rank });
    }
  }

  state.legalMoves = [];
}

/* ------------------------------------------------------------------ */
/* مدیریت نوبت                                                         */
/* ------------------------------------------------------------------ */

export function nextActiveSeat(state: GameState, fromSeat: number): number {
  const total = state.players.length;
  if (total === 0) return 0;
  for (let step = 1; step <= total; step++) {
    const seat = (fromSeat + step) % total;
    const p = seatPlayer(state, seat);
    if (p && p.rank === null) return seat;
  }
  return fromSeat;
}

export function startTurn(state: GameState, seat: number, now: number): void {
  const rules = getRules(state.rulesId);
  state.turnSeat = seat;
  state.phase = 'ROLL';
  state.dice = null;
  state.legalMoves = [];
  state.turnStartedAt = now;
  state.deadlineAt = now + rules.timing.rollTimeoutMs;
  state.turnCount++;
  pushEvent(state, { t: 'TURN', seat });
}

export function checkGameOver(state: GameState, now: number): boolean {
  const rules = getRules(state.rulesId);
  const remaining = activePlayers(state);
  const someoneRanked = state.players.some((p) => p.rank !== null);

  const over = rules.playUntilLastPlayer
    ? remaining.length <= 1 && someoneRanked
    : someoneRanked;

  if (!over) return false;

  for (const p of remaining) {
    if (p.rank === null) {
      const ranked = state.players.filter((x) => x.rank !== null).length;
      p.rank = ranked + 1;
    }
  }

  state.status = 'FINISHED';
  state.phase = 'ENDED';
  state.finishedAt = now;
  state.dice = null;
  state.legalMoves = [];
  state.winners = state.players
    .filter((p) => p.rank !== null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((p) => p.id);
  pushEvent(state, { t: 'GAME_OVER', winners: state.winners });
  return true;
}

export function endTurn(state: GameState, now: number, extraTurn: boolean): void {
  if (checkGameOver(state, now)) return;

  if (extraTurn) {
    pushEvent(state, { t: 'EXTRA_TURN', seat: state.turnSeat });
    startTurn(state, state.turnSeat, now);
    return;
  }

  state.consecutiveSixes = 0;
  const next = nextActiveSeat(state, state.turnSeat);
  startTurn(state, next, now);
}

/* ------------------------------------------------------------------ */
/* پردازش تاس و انتخاب مهره                                            */
/* ------------------------------------------------------------------ */

export interface RollResult {
  value: number;
  moves: Move[];
  autoMoved: Move | null;
  turnEnded: boolean;
}

export function applyChosenMove(state: GameState, move: Move, now: number): { turnEnded: boolean } {
  const seat = state.turnSeat;
  state.phase = 'RESOLVING';
  applyMove(state, seat, move);
  const player = seatPlayer(state, seat);
  const stillPlaying = player ? player.rank === null : false;
  endTurn(state, now, move.extraTurn && stillPlaying);
  return { turnEnded: !move.extraTurn };
}

export function performRoll(state: GameState, now: number): RollResult {
  const rules = getRules(state.rulesId);
  const player = seatPlayer(state, state.turnSeat);
  if (!player) return { value: 0, moves: [], autoMoved: null, turnEnded: true };

  const value = rollDice(rules.diceSides);
  state.dice = value;
  state.diceHistory.push(value);
  if (state.diceHistory.length > 20) state.diceHistory.shift();
  pushEvent(state, { t: 'DICE', seat: player.seat, value });

  if (value === rules.diceSides) state.consecutiveSixes++;
  else state.consecutiveSixes = 0;

  if (rules.maxConsecutiveSixes > 0 && state.consecutiveSixes >= rules.maxConsecutiveSixes) {
    pushEvent(state, { t: 'THREE_SIXES', seat: player.seat });
    state.legalMoves = [];
    endTurn(state, now, false);
    return { value, moves: [], autoMoved: null, turnEnded: true };
  }

  const moves = getLegalMoves(state, player.seat, value);
  state.legalMoves = moves;

  if (moves.length === 0) {
    pushEvent(state, { t: 'NO_MOVES', seat: player.seat });
    endTurn(state, now, false);
    return { value, moves: [], autoMoved: null, turnEnded: true };
  }

  if (moves.length === 1 && rules.autoMoveOnSingleOption) {
    const res = applyChosenMove(state, moves[0], now);
    return { value, moves, autoMoved: moves[0], turnEnded: res.turnEnded };
  }

  state.phase = 'MOVE';
  state.turnStartedAt = now;
  state.deadlineAt = now + rules.timing.moveTimeoutMs;
  return { value, moves, autoMoved: null, turnEnded: false };
}

export interface MoveResult {
  ok: boolean;
  error?: string;
  move?: Move;
  turnEnded?: boolean;
}

export function performMove(state: GameState, tokenIndex: number, now: number): MoveResult {
  if (state.phase !== 'MOVE') return { ok: false, error: 'NOT_MOVE_PHASE' };
  const move = state.legalMoves.find((m) => m.token === tokenIndex);
  if (!move) return { ok: false, error: 'ILLEGAL_MOVE' };
  const res = applyChosenMove(state, move, now);
  return { ok: true, move, turnEnded: res.turnEnded };
}

/* ------------------------------------------------------------------ */
/* تحلیل خطر (برای هوش مصنوعی و نمایش)                                 */
/* ------------------------------------------------------------------ */

/** احتمال اینکه مهره‌ای در موقعیت pos در نوبت بعد زده شود (۰ تا ۱) */
export function threatProbability(state: GameState, seat: number, pos: number): number {
  const rules = getRules(state.rulesId);
  if (!isOnTrack(pos)) return 0;
  const me = seatPlayer(state, seat);
  if (!me) return 0;

  const abs = toAbsolute(me.color, pos);
  if (isSafeCell(abs) && !rules.captureOnSafeCell) return 0;

  let safeProduct = 1;
  for (const opp of state.players) {
    if (opp.seat === seat || opp.rank !== null) continue;
    const hits = new Set<number>();
    for (const tk of opp.tokens) {
      if (isOnTrack(tk.p)) {
        const oppAbs = toAbsolute(opp.color, tk.p);
        const d = forwardDistance(oppAbs, abs);
        if (d >= 1 && d <= rules.diceSides) {
          const landing = tk.p + d;
          if (landing <= POS_FINISH) hits.add(d);
        }
      } else if (isBase(tk.p)) {
        const startAbs = toAbsolute(opp.color, 0);
        if (startAbs === abs) for (const r of rules.entryRolls) hits.add(r);
      }
    }
    if (hits.size > 0) safeProduct *= 1 - hits.size / rules.diceSides;
  }
  return 1 - safeProduct;
}

/** شروع رسمی بازی */
export function startGame(state: GameState, now: number): void {
  assignColors(state);
  state.status = 'PLAYING';
  state.startedAt = now;
  state.consecutiveSixes = 0;
  state.turnCount = 0;
  pushEvent(state, { t: 'GAME_START' });
  startTurn(state, 0, now);
}
