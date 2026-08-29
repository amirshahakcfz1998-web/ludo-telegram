/**
 * قوانین سکه و جایزه
 * با تغییر عددهای همین فایل، اقتصاد بازی عوض می‌شود.
 */

/** موجودی اولیهٔ هر کاربر */
export const DEFAULT_COINS = 5000;

/** مبلغ‌های مجاز برای میز (کل جایزهٔ میز) */
export const STAKE_OPTIONS = [0, 500, 2000, 5000, 10000, 25000];

/** سهم هر رتبه از کل میز، بر اساس تعداد بازیکن */
const SHARES: Record<number, number[]> = {
  2: [1],
  3: [0.65, 0.35],
  4: [0.625, 0.25, 0.125],
};

/** نزدیک‌ترین مبلغ مجاز */
export function normalizeStake(value: unknown): number {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (STAKE_OPTIONS.includes(n)) return n;
  let best = 0;
  for (const s of STAKE_OPTIONS) {
    if (Math.abs(s - n) < Math.abs(best - n)) best = s;
  }
  return best;
}

/** ورودی هر بازیکن = مبلغ میز تقسیم بر تعداد صندلی */
export function entryFee(stake: number, seats: number): number {
  if (stake <= 0 || seats <= 0) return 0;
  return Math.floor(stake / seats);
}

/** کل سکه‌های جمع‌شده روی میز */
export function potOf(stake: number, seats: number): number {
  return entryFee(stake, seats) * seats;
}

/**
 * تقسیم جایزه بین رتبه‌ها.
 * خروجی: نگاشت rank -> مقدار سکه
 * مثال: میز ۲۰۰۰ و ۴ نفره → {1: 1250, 2: 500, 3: 250}
 */
export function prizeByRank(stake: number, seats: number): Record<number, number> {
  const pot = potOf(stake, seats);
  const out: Record<number, number> = {};
  if (pot <= 0) return out;

  const shares = SHARES[seats] ?? SHARES[2];
  let given = 0;

  for (let i = 0; i < shares.length; i++) {
    const amount = Math.floor(pot * shares[i]);
    out[i + 1] = amount;
    given += amount;
  }

  // باقی‌ماندهٔ گرد کردن به نفر اول می‌رسد
  if (given < pot && out[1] !== undefined) out[1] += pot - given;
  return out;
}

/**
 * حالت تیمی: کل میز بین اعضای تیم برنده به‌طور مساوی تقسیم می‌شود.
 * winnersCount معمولاً ۲ است.
 */
export function teamPrizeEach(stake: number, seats: number, winnersCount: number): number {
  const pot = potOf(stake, seats);
  if (pot <= 0 || winnersCount <= 0) return 0;
  return Math.floor(pot / winnersCount);
}

/** متن فارسی برای نمایش مبلغ */
export function stakeLabel(stake: number): string {
  if (stake <= 0) return 'دوستانه (بدون سکه)';
  if (stake >= 1000) return `${stake / 1000}k سکه`;
  return `${stake} سکه`;
}
