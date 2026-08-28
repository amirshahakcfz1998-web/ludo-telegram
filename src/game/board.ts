/** نقشهٔ تخته: مسیر ۵۲ خانه، خانه‌های امن، ستون خانه و مختصات گرافیکی */
import type { ColorId } from './types';

export const TRACK_LEN = 52;      // تعداد خانه‌های مسیر مشترک
export const HOME_LEN = 6;        // تعداد خانه‌های ستون خانه
export const POS_BASE = -1;       // مهره داخل پایگاه (هنوز وارد بازی نشده)
export const LAST_TRACK = 50;     // آخرین خانهٔ مسیر مشترک برای هر رنگ
export const HOME_ENTRY = 51;     // اولین خانهٔ ستون خانه
export const POS_FINISH = 57;     // مرکز تخته = مهرهٔ تمام‌شده

/** نقطهٔ شروع هر رنگ روی مسیر مشترک */
export const START_OFFSET: Record<ColorId, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

export const START_CELLS: number[] = [0, 13, 26, 39];
export const SAFE_CELLS: number[] = [0, 8, 13, 21, 26, 34, 39, 47];
const SAFE_SET = new Set(SAFE_CELLS);

export interface Cell {
  x: number;
  y: number;
}

/** مختصات ۵۲ خانهٔ مسیر روی گرید ۱۵×۱۵ (ساعتگرد) */
export const TRACK_COORDS: Cell[] = [
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
  { x: 0, y: 8 }, { x: 0, y: 7 }, { x: 0, y: 6 },
];

/** ستون خانهٔ هر رنگ (۶ خانه) */
export const HOME_COORDS: Record<ColorId, Cell[]> = {
  RED: [
    { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 },
    { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 },
  ],
  GREEN: [
    { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 },
    { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 },
  ],
  YELLOW: [
    { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 },
    { x: 10, y: 7 }, { x: 9, y: 7 }, { x: 8, y: 7 },
  ],
  BLUE: [
    { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 },
    { x: 7, y: 10 }, { x: 7, y: 9 }, { x: 7, y: 8 },
  ],
};

/** جای چهار مهره داخل پایگاه هر رنگ */
export const BASE_SLOTS: Record<ColorId, Cell[]> = {
  RED: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 1, y: 4 }, { x: 4, y: 4 }],
  GREEN: [{ x: 10, y: 1 }, { x: 13, y: 1 }, { x: 10, y: 4 }, { x: 13, y: 4 }],
  YELLOW: [{ x: 10, y: 10 }, { x: 13, y: 10 }, { x: 10, y: 13 }, { x: 13, y: 13 }],
  BLUE: [{ x: 1, y: 10 }, { x: 4, y: 10 }, { x: 1, y: 13 }, { x: 4, y: 13 }],
};

export const CENTER: Cell = { x: 7, y: 7 };

export function isBase(p: number): boolean {
  return p === POS_BASE;
}

export function isOnTrack(p: number): boolean {
  return p >= 0 && p <= LAST_TRACK;
}

export function isInHomeColumn(p: number): boolean {
  return p >= HOME_ENTRY && p < POS_FINISH;
}

export function isFinished(p: number): boolean {
  return p >= POS_FINISH;
}

/** تبدیل موقعیت نسبی هر رنگ به خانهٔ مطلق روی مسیر مشترک */
export function toAbsolute(color: ColorId, p: number): number {
  if (!isOnTrack(p)) return -1;
  return (START_OFFSET[color] + p) % TRACK_LEN;
}

/** تبدیل خانهٔ مطلق به موقعیت نسبی یک رنگ (اگر در مسیر آن رنگ باشد) */
export function toRelative(color: ColorId, abs: number): number {
  return (abs - START_OFFSET[color] + TRACK_LEN) % TRACK_LEN;
}

export function isSafeCell(abs: number): boolean {
  return SAFE_SET.has(abs);
}

export function isSafePosition(color: ColorId, p: number): boolean {
  if (isInHomeColumn(p) || isFinished(p) || isBase(p)) return true;
  const abs = toAbsolute(color, p);
  return abs >= 0 && SAFE_SET.has(abs);
}

/** فاصلهٔ رو به جلو از یک خانهٔ مطلق تا خانهٔ مطلق دیگر */
export function forwardDistance(fromAbs: number, toAbs: number): number {
  return (toAbs - fromAbs + TRACK_LEN) % TRACK_LEN;
}

export function stepsToFinish(p: number): number {
  return POS_FINISH - p;
}

/** مختصات گرافیکی یک مهره برای نمایش در Mini App */
export function coordOf(color: ColorId, p: number, tokenIndex: number): Cell {
  if (isBase(p)) return BASE_SLOTS[color][tokenIndex] ?? BASE_SLOTS[color][0];
  if (isFinished(p)) return CENTER;
  if (isInHomeColumn(p)) return HOME_COORDS[color][p - HOME_ENTRY];
  return TRACK_COORDS[toAbsolute(color, p)];
}

export function absToCoord(abs: number): Cell {
  return TRACK_COORDS[((abs % TRACK_LEN) + TRACK_LEN) % TRACK_LEN];
  }
                    
