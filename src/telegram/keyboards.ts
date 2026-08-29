/** ساخت منوها و دکمه‌های شیشه‌ای ربات */
import {
  btn,
  grid,
  linkBtn,
  startAppBtn,
  webAppBtn,
  type InlineButton,
  type InlineKeyboard,
} from './api';
import { t, AI_LEVEL_NAME, type Lang } from '../config/texts';
import { RULE_SETS } from '../config/rules';

/* ------------------------------------------------------------------ */
/* الگوی داده‌های دکمه (callback_data) — حداکثر ۶۴ بایت                 */
/* ------------------------------------------------------------------ */
/*
  m:<page>              حرکت بین صفحه‌های منو
  nw:<mode>             انتخاب حالت بازی
  ai:<level>            انتخاب سطح ربات
  mk:<mode>:<rules>:<ai>  ساخت نهایی اتاق
  rm:<action>:<roomId>  عملیات داخل اتاق
  qm:<action>           بازی سریع
  st:<key>              تغییر تنظیمات
  lb:<page>             صفحهٔ جدول برترین‌ها
  x                     بدون عملیات
*/

export function parseCb(data: string): { ns: string; parts: string[] } {
  const parts = data.split(':');
  return { ns: parts[0] ?? '', parts: parts.slice(1) };
}

/* ------------------------------------------------------------------ */
/* منوی اصلی                                                           */
/* ------------------------------------------------------------------ */

export function mainMenu(lang: Lang): InlineKeyboard {
  return [
    [btn(t(lang, 'menu_new'), 'm:new'), btn(t(lang, 'menu_quick'), 'qm:find')],
    [btn(t(lang, 'menu_join'), 'm:join'), btn(t(lang, 'menu_profile'), 'm:profile')],
    [btn(t(lang, 'menu_leaderboard'), 'lb:1'), btn(t(lang, 'menu_settings'), 'm:settings')],
    [btn(t(lang, 'menu_help'), 'm:help')],
  ];
}

export function backOnly(lang: Lang, target = 'm:main'): InlineKeyboard {
  return [[btn(t(lang, 'menu_back'), target)]];
}

/* ------------------------------------------------------------------ */
/* انتخاب حالت بازی                                                    */
/* ------------------------------------------------------------------ */

export function modeMenu(lang: Lang): InlineKeyboard {
  return [
    [btn(t(lang, 'mode_2p'), 'nw:2P'), btn(t(lang, 'mode_4p'), 'nw:4P')],
    [btn(t(lang, 'mode_ai'), 'nw:AI')],
    [btn(t(lang, 'mode_public'), 'nw:PUB')],
    [btn(t(lang, 'menu_back'), 'm:main')],
  ];
}

export function aiLevelMenu(lang: Lang): InlineKeyboard {
  const names = AI_LEVEL_NAME[lang];
  const icons: Record<string, string> = {
    EASY: '🟢', NORMAL: '🔵', HARD: '🟠', EXPERT: '🔴', MASTER: '👑',
  };
  const levels = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER'];
  const buttons = levels.map((lv) => btn(`${icons[lv]} ${names[lv]}`, `ai:${lv}`));
  const kb = grid(buttons, 2);
  kb.push([btn(t(lang, 'menu_back'), 'm:new')]);
  return kb;
}

/** انتخاب مجموعهٔ قوانین؛ mode و aiLevel در داده حمل می‌شوند */
export function rulesMenu(lang: Lang, mode: string, aiLevel = '-'): InlineKeyboard {
  const buttons: InlineButton[] = Object.values(RULE_SETS).map((r) =>
    btn(r.title[lang] ?? r.title.en, `mk:${mode}:${r.id}:${aiLevel}`),
  );
  const kb = grid(buttons, 1);
  kb.push([btn(t(lang, 'menu_back'), mode === 'AI' ? 'nw:AI' : 'm:new')]);
  return kb;
}

/* ------------------------------------------------------------------ */
/* صفحهٔ اتاق                                                          */
/* ------------------------------------------------------------------ */

export interface RoomKbOptions {
  lang: Lang;
  roomId: string;
  joinCode: string;
  botUsername: string;
  miniAppUrl: string;
  isHost: boolean;
  isPrivateChat: boolean;
  canStart: boolean;
  canAddBot: boolean;
  inviteText: string;
}

export function roomKeyboard(o: RoomKbOptions): InlineKeyboard {
  const kb: InlineKeyboard = [];

  // دکمهٔ ورود به بازی: در چت خصوصی مینی‌اپ، در گروه لینک startapp
  const openUrl = `${o.miniAppUrl}?room=${encodeURIComponent(o.roomId)}`;
  kb.push([
    o.isPrivateChat
      ? webAppBtn(t(o.lang, 'btn_open_game'), openUrl)
      : startAppBtn(t(o.lang, 'btn_open_game'), o.botUsername, o.roomId),
  ]);

  const row2: InlineButton[] = [];
  if (o.isHost && o.canStart) row2.push(btn(t(o.lang, 'btn_start_now'), `rm:start:${o.roomId}`));
  if (o.isHost && o.canAddBot) row2.push(btn(t(o.lang, 'btn_add_bot'), `rm:addbot:${o.roomId}`));
  if (row2.length) kb.push(row2);

  kb.push([
    { text: t(o.lang, 'btn_invite'), switch_inline_query: o.inviteText },
    btn(t(o.lang, 'btn_refresh'), `rm:ref:${o.roomId}`),
  ]);

  kb.push([btn(t(o.lang, 'btn_leave_room'), `rm:leave:${o.roomId}`)]);
  return kb;
}

/** دکمهٔ ورود برای پیام گروهی */
export function groupJoinKeyboard(lang: Lang, botUsername: string, roomId: string): InlineKeyboard {
  return [
    [startAppBtn(t(lang, 'btn_join_group_game'), botUsername, roomId)],
    [btn(t(lang, 'btn_refresh'), `rm:ref:${roomId}`)],
  ];
}

/* ------------------------------------------------------------------ */
/* بازی سریع                                                           */
/* ------------------------------------------------------------------ */

export function searchingKeyboard(lang: Lang): InlineKeyboard {
  return [[btn(t(lang, 'btn_cancel_search'), 'qm:cancel')]];
}

/* ------------------------------------------------------------------ */
/* پایان بازی                                                          */
/* ------------------------------------------------------------------ */

export function gameOverKeyboard(lang: Lang, roomId: string): InlineKeyboard {
  return [
    [btn(t(lang, 'btn_rematch'), `rm:again:${roomId}`)],
    [btn(t(lang, 'btn_main_menu'), 'm:main')],
  ];
}

/* ------------------------------------------------------------------ */
/* پروفایل و جدول برترین‌ها                                            */
/* ------------------------------------------------------------------ */

export function profileKeyboard(lang: Lang): InlineKeyboard {
  return [
    [btn(t(lang, 'menu_leaderboard'), 'lb:1')],
    [btn(t(lang, 'menu_back'), 'm:main')],
  ];
}

export function leaderboardKeyboard(lang: Lang, page: number, hasNext: boolean): InlineKeyboard {
  const nav: InlineButton[] = [];
  if (page > 1) nav.push(btn('◀️', `lb:${page - 1}`));
  nav.push(btn(`${page}`, 'x'));
  if (hasNext) nav.push(btn('▶️', `lb:${page + 1}`));
  return [nav, [btn(t(lang, 'menu_back'), 'm:main')]];
}

/* ------------------------------------------------------------------ */
/* تنظیمات                                                             */
/* ------------------------------------------------------------------ */

export interface SettingsView {
  sound: boolean;
  chat: boolean;
  theme: 'dark' | 'light';
  lang: Lang;
}

export function settingsKeyboard(s: SettingsView): InlineKeyboard {
  const lang = s.lang;
  const onOff = (v: boolean) => t(lang, v ? 'on' : 'off');
  return [
    [btn(t(lang, 'btn_toggle_sound', { value: onOff(s.sound) }), 'st:sound')],
    [btn(t(lang, 'btn_toggle_chat', { value: onOff(s.chat) }), 'st:chat')],
    [btn(t(lang, 'btn_toggle_theme', { value: t(lang, s.theme === 'dark' ? 'theme_dark' : 'theme_light') }), 'st:theme')],
    [btn(t(lang, 'btn_toggle_lang', { value: lang === 'fa' ? 'فارسی' : 'English' }), 'st:lang')],
    [btn(t(lang, 'menu_back'), 'm:main')],
  ];
}

/* ------------------------------------------------------------------ */
/* ورود با کد                                                          */
/* ------------------------------------------------------------------ */

export function joinPromptKeyboard(lang: Lang): InlineKeyboard {
  return [[btn(t(lang, 'menu_back'), 'm:main')]];
}

/** دکمهٔ باز کردن مستقیم مینی‌اپ (مثلاً بعد از شروع بازی) */
export function openGameKeyboard(
  lang: Lang,
  roomId: string,
  miniAppUrl: string,
  botUsername: string,
  isPrivateChat: boolean,
): InlineKeyboard {
  const url = `${miniAppUrl}?room=${encodeURIComponent(roomId)}`;
  return [[
    isPrivateChat
      ? webAppBtn(t(lang, 'btn_open_game'), url)
      : startAppBtn(t(lang, 'btn_open_game'), botUsername, roomId),
  ]];
}

/** لینک ساده برای اشتراک‌گذاری بیرون از تلگرام */
export function shareLinkKeyboard(lang: Lang, url: string): InlineKeyboard {
  return [[linkBtn('🔗 ' + t(lang, 'btn_invite'), url)]];
}
