/** ابزارهای مشترک: پاسخ‌ها، محدودیت نرخ، امتیاز ELO، سطح و XP، زمان */

/* ------------------------------------------------------------------ */
/* پاسخ‌های HTTP                                                       */
/* ------------------------------------------------------------------ */

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data',
  'Access-Control-Max-Age': '86400',
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS, ...extra },
  });
}

export function ok(data: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...data });
}

export function fail(error: string, status = 400): Response {
  return json({ ok: false, error }, status);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ------------------------------------------------------------------ */
/* محدودیت نرخ درخواست (ضد اسپم)                                       */
/* ------------------------------------------------------------------ */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/** حداکثر limit درخواست در هر windowMs برای هر کلید */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) cleanupBuckets(now);
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (b.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }

  b.count++;
  return { allowed: true, remaining: limit - b.count, retryAfterMs: 0 };
}

function cleanupBuckets(now: number): void {
  for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
}

export const RATE = {
  webhook: { limit: 30, windowMs: 10000 },
  api: { limit: 60, windowMs: 10000 },
  chat: { limit: 8, windowMs: 10000 },
  createRoom: { limit: 5, windowMs: 60000 },
  action: { limit: 40, windowMs: 10000 },
};

/* ------------------------------------------------------------------ */
/* امتیاز ELO                                                          */
/* ------------------------------------------------------------------ */

export interface EloInput {
  id: string;
  rating: number;
  rank: number;
}

/**
 * محاسبهٔ تغییر امتیاز برای چند نفر:
 * هر بازیکن با تک‌تک بقیه مقایسه می‌شود و میانگین گرفته می‌شود.
 */
export function computeElo(
  players: EloInput[],
  kFactor: number,
  minRating: number,
): Record<string, { before: number; after: number; delta: number }> {
  const out: Record<string, { before: number; after: number; delta: number }> = {};
  const n = players.length;
  if (n < 2) {
    for (const p of players) out[p.id] = { before: p.rating, after: p.rating, delta: 0 };
    return out;
  }

  for (const p of players) {
    let delta = 0;
    for (const q of players) {
      if (q.id === p.id) continue;
      const expected = 1 / (1 + Math.pow(10, (q.rating - p.rating) / 400));
      const actual = p.rank < q.rank ? 1 : p.rank > q.rank ? 0 : 0.5;
      delta += kFactor * (actual - expected);
    }
    delta = Math.round(delta / (n - 1));
    const after = Math.max(minRating, p.rating + delta);
    out[p.id] = { before: p.rating, after, delta: after - p.rating };
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* سطح، XP و رتبه                                                      */
/* ------------------------------------------------------------------ */

/** XP لازم برای رسیدن به سطح مشخص */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpNeeded: number;
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (level < 100 && xp >= xpForLevel(level + 1)) level++;
  const base = level === 1 ? 0 : xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xpInLevel = xp - base;
  const xpNeeded = Math.max(1, next - base);
  return { level, xpInLevel, xpNeeded, progress: Math.min(1, xpInLevel / xpNeeded) };
}

export interface RankTier {
  key: string;
  fa: string;
  en: string;
  icon: string;
  min: number;
}

export const RANK_TIERS: RankTier[] = [
  { key: 'beginner', fa: 'تازه‌کار', en: 'Beginner', icon: '🌱', min: 0 },
  { key: 'skilled', fa: 'ماهر', en: 'Skilled', icon: '⭐', min: 1150 },
  { key: 'pro', fa: 'حرفه‌ای', en: 'Pro', icon: '🔥', min: 1350 },
  { key: 'expert', fa: 'خبره', en: 'Expert', icon: '💎', min: 1550 },
  { key: 'master', fa: 'استاد', en: 'Master', icon: '👑', min: 1800 },
];

export function tierOf(rating: number): RankTier {
  let found = RANK_TIERS[0];
  for (const t of RANK_TIERS) if (rating >= t.min) found = t;
  return found;
}

/* ------------------------------------------------------------------ */
/* زمان و اعداد                                                        */
/* ------------------------------------------------------------------ */

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function toFaDigits(input: string | number): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(input).replace(/[0-9]/g, (d) => fa[Number(d)]);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** خواندن امن بدنهٔ JSON یک درخواست */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
