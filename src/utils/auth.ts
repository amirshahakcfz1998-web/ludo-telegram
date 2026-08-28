/** اعتبارسنجی امنیتی: initData مینی‌اپ تلگرام و وب‌هوک ربات */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface InitDataResult {
  ok: boolean;
  error?: string;
  user?: TelegramUser;
  startParam?: string | null;
  authDate?: number;
  queryId?: string | null;
}

const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** مقایسهٔ امن دو رشته بدون نشت زمانی */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * اعتبارسنجی initData مینی‌اپ تلگرام طبق مستندات رسمی.
 * maxAgeSec: حداکثر عمر مجاز داده (پیش‌فرض ۲۴ ساعت)
 */
export async function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 86400,
): Promise<InitDataResult> {
  if (!initData) return { ok: false, error: 'EMPTY_INIT_DATA' };
  if (!botToken) return { ok: false, error: 'NO_BOT_TOKEN' };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, error: 'MALFORMED' };
  }

  const hash = params.get('hash');
  if (!hash) return { ok: false, error: 'NO_HASH' };

  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k === 'hash' || k === 'signature') continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = await hmac(encoder.encode('WebAppData'), botToken);
  const computed = toHex(await hmac(secretKey, dataCheckString));

  if (!timingSafeEqual(computed, hash.toLowerCase())) {
    return { ok: false, error: 'BAD_SIGNATURE' };
  }

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate) return { ok: false, error: 'NO_AUTH_DATE' };

  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (maxAgeSec > 0 && ageSec > maxAgeSec) return { ok: false, error: 'EXPIRED' };

  let user: TelegramUser | undefined;
  const rawUser = params.get('user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as TelegramUser;
    } catch {
      return { ok: false, error: 'BAD_USER_JSON' };
    }
  }
  if (!user || typeof user.id !== 'number') return { ok: false, error: 'NO_USER' };

  return {
    ok: true,
    user,
    startParam: params.get('start_param'),
    authDate,
    queryId: params.get('query_id'),
  };
}

/** بررسی هدر مخفی وب‌هوک تلگرام */
export function verifyWebhookSecret(request: Request, expected: string | undefined): boolean {
  if (!expected) return true;
  const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
  return timingSafeEqual(got, expected);
}

/** نام قابل نمایش کاربر تلگرام */
export function displayName(user: TelegramUser): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const name = full || user.username || `Player ${user.id % 10000}`;
  return name.length > 24 ? name.slice(0, 24) + '…' : name;
}

/** پاک‌سازی متن ورودی کاربر (چت و نام اتاق) */
export function sanitizeText(text: string, maxLen = 200): string {
  return text
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s{3,}/g, '  ')
    .trim()
    .slice(0, maxLen);
}

/** فرار دادن کاراکترهای HTML برای پیام‌های تلگرام */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** بررسی درستی شکل کد اتاق */
export function isValidJoinCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code.toUpperCase());
}

/** بررسی درستی شکل شناسهٔ اتاق */
export function isValidRoomId(id: string): boolean {
  return /^r_[0-9a-f]{12}$/.test(id);
}
