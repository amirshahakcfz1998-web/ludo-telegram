/** تولید عدد تصادفی امن سمت سرور: تاس، کد اتاق، شناسه‌ها */

/** یک عدد تصادفی امن در بازهٔ [0, max) بدون سوگیری */
function secureBelow(max: number): number {
  if (max <= 0) throw new Error('max must be positive');
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let v = 0;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

/** ریختن تاس با تعداد وجه دلخواه (پیش‌فرض ۶) */
export function rollDice(sides = 6): number {
  return secureBelow(sides) + 1;
}

/** انتخاب تصادفی یک عضو از آرایه */
export function pick<T>(arr: T[]): T {
  return arr[secureBelow(arr.length)];
}

/** عدد تصادفی صحیح بین min و max (هر دو شامل) */
export function randInt(min: number, max: number): number {
  return min + secureBelow(max - min + 1);
}

/** عدد اعشاری تصادفی بین ۰ و ۱ */
export function randFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

/** بُر زدن آرایه (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureBelow(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** حروف بدون شباهت بصری برای کد اتاق (بدون O/0/I/1) */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** کد ورود ۶ کاراکتری برای اتاق، مثل K7M2QX */
export function generateJoinCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[secureBelow(CODE_ALPHABET.length)];
  return out;
}

/** شناسهٔ یکتای اتاق */
export function generateRoomId(): string {
  return 'r_' + hex(12);
}

/** شناسهٔ یکتای پیام یا رویداد */
export function generateId(prefix = 'id'): string {
  return prefix + '_' + hex(10);
}

/** رشتهٔ هگز تصادفی با طول دلخواه */
export function hex(len: number): string {
  const bytes = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s.slice(0, len);
}

/** توکن نشست برای اتصال WebSocket */
export function generateSessionToken(): string {
  return hex(32);
}
