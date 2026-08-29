/** تعریف متغیرها و اتصال‌های Cloudflare برای کل پروژه */
import type { GameRoom } from './do/gameroom';
import type { Hub } from './do/hub';

declare global {
  interface Env {
    /** توکن ربات تلگرام — به‌صورت Secret در پنل Cloudflare وارد می‌شود */
    TELEGRAM_BOT_TOKEN: string;

    /** رمز مخفی وب‌هوک برای اطمینان از اینکه درخواست از تلگرام آمده است */
    WEBHOOK_SECRET: string;

    /** نام کاربری ربات، بدون @ */
    BOT_USERNAME: string;

    /** شناسهٔ تلگرام مدیران، جدا شده با کاما (اختیاری) */
    ADMIN_IDS?: string;

    /** اتاق‌های زندهٔ بازی */
    GAME_ROOM: DurableObjectNamespace<GameRoom>;

    /** انبار مرکزی داده‌ها */
    HUB: DurableObjectNamespace<Hub>;

    /** فایل‌های مینی‌اپ (پوشهٔ web) */
    ASSETS: Fetcher;
  }
}

export {};
    
