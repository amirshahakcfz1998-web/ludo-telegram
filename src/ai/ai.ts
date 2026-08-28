/** هوش مصنوعی حریف در پنج سطح: EASY, NORMAL, HARD, EXPERT, MASTER */
import {
  POS_FINISH,
  isBase,
  isOnTrack,
  isInHomeColumn,
  isFinished,
  toAbsolute,
  isSafeCell,
  forwardDistance,
  LAST_TRACK,
} from '../game/board';
import {
  cloneState,
  getLegalMoves,
  applyMove,
  seatPlayer,
  threatProbability,
} from '../game/engine';
import { getRules } from '../config/rules';
import { pick, randFloat, randInt } from '../game/rng';
import type { AILevel, GameState, Move, Player } from '../game/types';

/* ------------------------------------------------------------------ */
/* وزن‌های امتیازدهی برای هر سطح                                        */
/* ------------------------------------------------------------------ */

export interface AIWeights {
  capture: number;         // زدن مهرهٔ حریف
  finish: number;          // رساندن مهره به خانه
  enterBoard: number;      // بیرون آوردن مهره از پایگاه
  advance: number;         // هر خانه پیشروی
  reachSafe: number;       // رسیدن به خانهٔ امن
  leaveSafe: number;       // ترک خانهٔ امن (منفی)
  enterHomeColumn: number; // ورود به ستون خانه
  riskAfter: number;       // خطر خورده‌شدن بعد از حرکت (منفی)
  riskRelief: number;      // فرار از خطر فعلی
  blockForm: number;       // ساختن بلوک با دو مهره
  blockBreak: number;      // شکستن بلوک خودی (منفی)
  progressLead: number;    // فشار روی حریف نزدیک به برد
  spread: number;          // پخش کردن مهره‌ها
  depth: number;           // عمق محاسبه (۰ = بدون پیش‌بینی)
  noise: number;           // مقدار تصادفی‌بودن
  blunder: number;         // احتمال انتخاب حرکت اشتباه
}

export const AI_WEIGHTS: Record<AILevel, AIWeights> = {
  EASY: {
    capture: 40, finish: 30, enterBoard: 20, advance: 1, reachSafe: 5,
    leaveSafe: 0, enterHomeColumn: 10, riskAfter: 0, riskRelief: 0,
    blockForm: 0, blockBreak: 0, progressLead: 0, spread: 0,
    depth: 0, noise: 45, blunder: 0.35,
  },
  NORMAL: {
    capture: 80, finish: 60, enterBoard: 45, advance: 2, reachSafe: 25,
    leaveSafe: -8, enterHomeColumn: 35, riskAfter: -25, riskRelief: 15,
    blockForm: 8, blockBreak: -5, progressLead: 0, spread: 2,
    depth: 0, noise: 18, blunder: 0.12,
  },
  HARD: {
    capture: 100, finish: 80, enterBoard: 55, advance: 3, reachSafe: 50,
    leaveSafe: -18, enterHomeColumn: 55, riskAfter: -60, riskRelief: 35,
    blockForm: 25, blockBreak: -18, progressLead: 10, spread: 5,
    depth: 0, noise: 6, blunder: 0.03,
  },
  EXPERT: {
    capture: 110, finish: 95, enterBoard: 60, advance: 3, reachSafe: 55,
    leaveSafe: -22, enterHomeColumn: 65, riskAfter: -70, riskRelief: 45,
    blockForm: 32, blockBreak: -24, progressLead: 18, spread: 7,
    depth: 1, noise: 2, blunder: 0,
  },
  MASTER: {
    capture: 120, finish: 110, enterBoard: 65, advance: 4, reachSafe: 60,
    leaveSafe: -25, enterHomeColumn: 75, riskAfter: -80, riskRelief: 55,
    blockForm: 38, blockBreak: -28, progressLead: 25, spread: 9,
    depth: 2, noise: 0, blunder: 0,
  },
};

/* ------------------------------------------------------------------ */
/* ابزارهای کمکی                                                       */
/* ------------------------------------------------------------------ */

function totalProgress(player: Player): number {
  let sum = 0;
  for (const tk of player.tokens) {
    if (isBase(tk.p)) continue;
    sum += Math.min(tk.p, POS_FINISH) + 1;
  }
  return sum;
}

/** آیا بعد از حرکت، دو مهرهٔ هم‌رنگ روی یک خانه می‌نشینند؟ */
function formsBlock(state: GameState, seat: number, move: Move): boolean {
  const me = seatPlayer(state, seat);
  if (!me || !isOnTrack(move.to)) return false;
  return me.tokens.some((t) => t.i !== move.token && t.p === move.to);
}

/** آیا حرکت باعث می‌شود بلوکِ موجود خودمان شکسته شود؟ */
function breaksBlock(state: GameState, seat: number, move: Move): boolean {
  const me = seatPlayer(state, seat);
  if (!me || !isOnTrack(move.from)) return false;
  return me.tokens.some((t) => t.i !== move.token && t.p === move.from);
}

/** بیشترین پیشرفت حریفان */
function bestOpponentProgress(state: GameState, seat: number): number {
  let best = 0;
  for (const p of state.players) {
    if (p.seat === seat || p.rank !== null) continue;
    best = Math.max(best, totalProgress(p));
  }
  return best;
}

/** چند مهرهٔ حریف در برد این مهره قرار می‌گیرند (تهدید ساختن) */
function threatCreated(state: GameState, seat: number, pos: number): number {
  const rules = getRules(state.rulesId);
  const me = seatPlayer(state, seat);
  if (!me || !isOnTrack(pos)) return 0;
  const myAbs = toAbsolute(me.color, pos);
  let count = 0;
  for (const opp of state.players) {
    if (opp.seat === seat || opp.rank !== null) continue;
    for (const tk of opp.tokens) {
      if (!isOnTrack(tk.p)) continue;
      const oppAbs = toAbsolute(opp.color, tk.p);
      const d = forwardDistance(myAbs, oppAbs);
      if (d >= 1 && d <= rules.diceSides) count++;
    }
  }
  return count;
}

/* ------------------------------------------------------------------ */
/* امتیازدهی یک حرکت                                                   */
/* ------------------------------------------------------------------ */

export function scoreMove(state: GameState, seat: number, move: Move, w: AIWeights): number {
  const rules = getRules(state.rulesId);
  const me = seatPlayer(state, seat);
  if (!me) return 0;

  let score = 0;

  // زدن مهرهٔ حریف: هرچه مهرهٔ زده‌شده جلوتر باشد ارزش بیشتری دارد
  for (const cap of move.captures) {
    const victim = seatPlayer(state, cap.seat);
    const vt = victim?.tokens.find((t) => t.i === cap.token);
    const depthBonus = vt ? Math.min(vt.p, LAST_TRACK) / 2 : 0;
    score += w.capture + depthBonus;
  }

  if (move.finishes) score += w.finish;
  if (move.entering) score += w.enterBoard;
  if (isInHomeColumn(move.to) && !isInHomeColumn(move.from)) score += w.enterHomeColumn;

  // پیشروی
  if (!move.entering && !isFinished(move.to)) {
    score += (move.to - move.from) * w.advance;
  }

  // امنیت مقصد و مبدأ
  const toSafe = isOnTrack(move.to)
    ? isSafeCell(toAbsolute(me.color, move.to))
    : true;
  const fromSafe = isOnTrack(move.from)
    ? isSafeCell(toAbsolute(me.color, move.from))
    : false;

  if (toSafe && !isFinished(move.to)) score += w.reachSafe;
  if (fromSafe && !toSafe) score += w.leaveSafe;

  // خطر: قبل و بعد از حرکت
  const riskBefore = isOnTrack(move.from) ? threatProbability(state, seat, move.from) : 0;
  const riskAfter = isOnTrack(move.to) && !toSafe
    ? threatProbability(state, seat, move.to)
    : 0;
  score += riskAfter * w.riskAfter;
  score += riskBefore * w.riskRelief;

  // بلوک‌سازی
  if (rules.blocks.enabled) {
    if (formsBlock(state, seat, move)) score += w.blockForm;
    if (breaksBlock(state, seat, move)) score += w.blockBreak;
  }

  // تهدید ساختن روی حریف
  if (w.progressLead > 0) {
    score += threatCreated(state, seat, move.to) * (w.progressLead / 4);
    const oppLead = bestOpponentProgress(state, seat) - totalProgress(me);
    if (oppLead > 20 && move.captures.length > 0) score += w.progressLead;
  }

  // پخش‌کردن مهره‌ها (نه همه در یک نقطه)
  if (w.spread > 0) {
    const active = me.tokens.filter((t) => isOnTrack(t.p)).length;
    if (move.entering && active < 2) score += w.spread * 3;
  }

  // نوبت اضافه ارزش دارد
  if (move.extraTurn) score += 15;

  if (w.noise > 0) score += (randFloat() - 0.5) * 2 * w.noise;

  return score;
}

/* ------------------------------------------------------------------ */
/* ارزیابی کل وضعیت (برای سطوح عمیق)                                    */
/* ------------------------------------------------------------------ */

function evaluateState(state: GameState, seat: number, w: AIWeights): number {
  const me = seatPlayer(state, seat);
  if (!me) return 0;

  let value = totalProgress(me) * 2 + me.finished * w.finish + me.captures * 10;

  for (const tk of me.tokens) {
    if (!isOnTrack(tk.p)) continue;
    const abs = toAbsolute(me.color, tk.p);
    if (isSafeCell(abs)) value += w.reachSafe / 3;
    else value -= threatProbability(state, seat, tk.p) * (w.riskAfter / -1) * 0.4;
  }

  for (const opp of state.players) {
    if (opp.seat === seat || opp.rank !== null) continue;
    value -= totalProgress(opp) * 0.9 + opp.finished * (w.finish * 0.6);
  }

  if (me.rank === 1) value += 5000;
  return value;
}

/** میانگین بهترین نتیجه روی همهٔ حالت‌های تاس (Expectimax ساده) */
function expectedValue(state: GameState, seat: number, w: AIWeights, depth: number): number {
  const rules = getRules(state.rulesId);
  if (depth <= 0 || state.status === 'FINISHED') return evaluateState(state, seat, w);

  let sum = 0;
  for (let d = 1; d <= rules.diceSides; d++) {
    const moves = getLegalMoves(state, seat, d);
    if (moves.length === 0) {
      sum += evaluateState(state, seat, w);
      continue;
    }
    let best = -Infinity;
    for (const mv of moves) {
      const next = cloneState(state);
      applyMove(next, seat, mv);
      const v = depth > 1
        ? expectedValue(next, seat, w, depth - 1)
        : evaluateState(next, seat, w);
      if (v > best) best = v;
    }
    sum += best;
  }
  return sum / rules.diceSides;
}

/* ------------------------------------------------------------------ */
/* انتخاب نهایی حرکت                                                   */
/* ------------------------------------------------------------------ */

export interface AIDecision {
  move: Move;
  score: number;
}

export function chooseMove(
  state: GameState,
  seat: number,
  moves: Move[],
  level: AILevel,
): AIDecision | null {
  if (moves.length === 0) return null;
  if (moves.length === 1) return { move: moves[0], score: 0 };

  const w = AI_WEIGHTS[level] ?? AI_WEIGHTS.NORMAL;

  // گاهی سطوح پایین اشتباه می‌کنند تا بازی طبیعی به نظر برسد
  if (w.blunder > 0 && randFloat() < w.blunder) {
    const notWinning = moves.filter((m) => !m.finishes && m.captures.length === 0);
    const chosen = notWinning.length > 0 ? pick(notWinning) : pick(moves);
    return { move: chosen, score: 0 };
  }

  const scored = moves.map((m) => {
    let s = scoreMove(state, seat, m, w);
    if (w.depth > 0) {
      const next = cloneState(state);
      applyMove(next, seat, m);
      s += expectedValue(next, seat, w, w.depth) * 0.5;
    }
    return { move: m, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/** تصمیم ربات برای بازیکن قطع‌شده: همیشه منطقی ولی نه بی‌رحم */
export function chooseFallbackMove(state: GameState, seat: number, moves: Move[]): AIDecision | null {
  return chooseMove(state, seat, moves, 'NORMAL');
}

/** مدت زمان «فکر کردن» ربات تا حرکت طبیعی به نظر برسد */
export function thinkDelayMs(state: GameState, level: AILevel): number {
  const rules = getRules(state.rulesId);
  const base = randInt(rules.timing.aiThinkMinMs, rules.timing.aiThinkMaxMs);
  const factor: Record<AILevel, number> = {
    EASY: 0.7, NORMAL: 0.9, HARD: 1, EXPERT: 1.1, MASTER: 1.25,
  };
  return Math.round(base * (factor[level] ?? 1));
}
