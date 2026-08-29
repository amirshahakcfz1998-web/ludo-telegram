/** ارتباط با Telegram Bot API و ساخت دکمه‌های شیشه‌ای (Inline Keyboard) */

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
}

export type InlineKeyboard = InlineButton[][];

export interface TgResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

/** کلاینت سبک برای Telegram Bot API */
export class TelegramAPI {
  private base: string;

  constructor(private token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
  }

  async call<T = unknown>(method: string, payload: Record<string, unknown> = {}): Promise<TgResponse<T>> {
    try {
      const res = await fetch(`${this.base}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as TgResponse<T>;
      if (!data.ok) console.log(`TG ${method} failed:`, data.description);
      return data;
    } catch (err) {
      console.log(`TG ${method} error:`, String(err));
      return { ok: false, description: String(err) };
    }
  }

  sendMessage(
    chatId: number | string,
    text: string,
    keyboard?: InlineKeyboard,
    extra: Record<string, unknown> = {},
  ) {
    return this.call<{ message_id: number }>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
      ...extra,
    });
  }

  editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    keyboard?: InlineKeyboard,
    extra: Record<string, unknown> = {},
  ) {
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
      ...extra,
    });
  }

  editMessageMarkup(chatId: number | string, messageId: number, keyboard: InlineKeyboard) {
    return this.call('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  deleteMessage(chatId: number | string, messageId: number) {
    return this.call('deleteMessage', { chat_id: chatId, message_id: messageId });
  }

  /** پاسخ به فشردن دکمهٔ شیشه‌ای (باید همیشه صدا زده شود) */
  answerCallback(callbackId: string, text?: string, alert = false) {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackId,
      ...(text ? { text } : {}),
      show_alert: alert,
    });
  }

  answerInlineQuery(inlineQueryId: string, results: unknown[], cacheTime = 5) {
    return this.call('answerInlineQuery', {
      inline_query_id: inlineQueryId,
      results,
      cache_time: cacheTime,
      is_personal: true,
    });
  }

  getChatMember(chatId: number | string, userId: number) {
    return this.call('getChatMember', { chat_id: chatId, user_id: userId });
  }

  setMyCommands(commands: { command: string; description: string }[], languageCode?: string) {
    return this.call('setMyCommands', {
      commands,
      ...(languageCode ? { language_code: languageCode } : {}),
    });
  }

  setWebhook(url: string, secretToken: string) {
    return this.call('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'],
      drop_pending_updates: true,
    });
  }

  deleteWebhook() {
    return this.call('deleteWebhook', { drop_pending_updates: true });
  }

  getWebhookInfo() {
    return this.call('getWebhookInfo');
  }

  getMe() {
    return this.call<{ username: string; id: number }>('getMe');
  }

  /** انیمیشن تاس داخل چت تلگرام (اختیاری) */
  sendDice(chatId: number | string) {
    return this.call('sendDice', { chat_id: chatId, emoji: '🎲' });
  }
}

/* ------------------------------------------------------------------ */
/* سازنده‌های دکمهٔ شیشه‌ای                                              */
/* ------------------------------------------------------------------ */

export function btn(text: string, data: string): InlineButton {
  return { text, callback_data: data };
}

export function linkBtn(text: string, url: string): InlineButton {
  return { text, url };
}

/** دکمه‌ای که مینی‌اپ را باز می‌کند (فقط در چت خصوصی مجاز است) */
export function webAppBtn(text: string, url: string): InlineButton {
  return { text, web_app: { url } };
}

/** در گروه‌ها به‌جای web_app از لینک startapp استفاده می‌شود */
export function startAppBtn(text: string, botUsername: string, param: string): InlineButton {
  return { text, url: `https://t.me/${botUsername}?startapp=${encodeURIComponent(param)}` };
}

/** لینک دعوت به اتاق از طریق دستور start */
export function inviteLink(botUsername: string, roomId: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(roomId)}`;
}

export function shareBtn(text: string, message: string): InlineButton {
  return { text, switch_inline_query: message };
}

/** چیدن دکمه‌ها در ردیف‌هایی با تعداد ستون مشخص */
export function grid(buttons: InlineButton[], columns: number): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (let i = 0; i < buttons.length; i += columns) {
    rows.push(buttons.slice(i, i + columns));
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* انواع دادهٔ آپدیت تلگرام                                             */
/* ------------------------------------------------------------------ */

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  reply_to_message?: TgMessage;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
  chat_instance?: string;
}

export interface TgInlineQuery {
  id: string;
  from: TgUser;
  query: string;
  offset: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
  inline_query?: TgInlineQuery;
  my_chat_member?: { chat: TgChat; from: TgUser; new_chat_member: { status: string } };
}

/** فهرست دستورهای ربات برای منوی تلگرام */
export const BOT_COMMANDS_FA = [
  { command: 'start', description: 'شروع و منوی اصلی' },
  { command: 'game', description: 'بازی جدید' },
  { command: 'create', description: 'ساخت اتاق' },
  { command: 'join', description: 'ورود با کد اتاق' },
  { command: 'profile', description: 'پروفایل من' },
  { command: 'stats', description: 'آمار من' },
  { command: 'leaderboard', description: 'جدول برترین‌ها' },
  { command: 'settings', description: 'تنظیمات' },
  { command: 'help', description: 'راهنما' },
];

export const BOT_COMMANDS_EN = [
  { command: 'start', description: 'Start and main menu' },
  { command: 'game', description: 'New game' },
  { command: 'create', description: 'Create a room' },
  { command: 'join', description: 'Join with code' },
  { command: 'profile', description: 'My profile' },
  { command: 'stats', description: 'My stats' },
  { command: 'leaderboard', description: 'Leaderboard' },
  { command: 'settings', description: 'Settings' },
  { command: 'help', description: 'Help' },
];
