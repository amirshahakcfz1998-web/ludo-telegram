/** متن‌های ربات به دو زبان فارسی و انگلیسی */

export type Lang = 'fa' | 'en';

export const COLOR_EMOJI: Record<string, string> = {
  RED: '🔴',
  GREEN: '🟢',
  YELLOW: '🟡',
  BLUE: '🔵',
};

export const COLOR_NAME: Record<Lang, Record<string, string>> = {
  fa: { RED: 'قرمز', GREEN: 'سبز', YELLOW: 'زرد', BLUE: 'آبی' },
  en: { RED: 'Red', GREEN: 'Green', YELLOW: 'Yellow', BLUE: 'Blue' },
};

export const DICE_EMOJI = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const AI_LEVEL_NAME: Record<Lang, Record<string, string>> = {
  fa: { EASY: 'آسان', NORMAL: 'معمولی', HARD: 'سخت', EXPERT: 'حرفه‌ای', MASTER: 'استاد' },
  en: { EASY: 'Easy', NORMAL: 'Normal', HARD: 'Hard', EXPERT: 'Expert', MASTER: 'Master' },
};

export const STATUS_ICON: Record<string, string> = {
  ONLINE: '🟢',
  IDLE: '🟡',
  DISCONNECTED: '🔴',
  BOT_CONTROLLED: '🤖',
  LEFT: '⚪',
};

type Dict = Record<string, string>;

const FA: Dict = {
  welcome:
    '🎲 <b>لودو استار</b>\n\nسلام {name} عزیز!\nبه بازی منچ آنلاین خوش آمدی.\n\n🏆 امتیاز: <b>{rating}</b>\n🎮 بازی‌ها: <b>{games}</b>  •  بردها: <b>{wins}</b>\n\nیکی از گزینه‌ها را انتخاب کن:',
  menu_new: '🎮 بازی جدید',
  menu_quick: '⚡ بازی سریع',
  menu_join: '🔑 ورود با کد',
  menu_profile: '👤 پروفایل',
  menu_leaderboard: '🏆 برترین‌ها',
  menu_settings: '⚙️ تنظیمات',
  menu_help: '❓ راهنما',
  menu_back: '◀️ بازگشت',

  choose_mode: '🎮 <b>بازی جدید</b>\n\nنوع بازی را انتخاب کن:',
  mode_2p: '👥 دو نفره',
  mode_4p: '👨‍👩‍👦‍👦 چهار نفره',
  mode_ai: '🤖 بازی با ربات',
  mode_public: '🌍 اتاق عمومی',

  choose_ai_level: '🤖 <b>بازی با ربات</b>\n\nسطح ربات را انتخاب کن:',
  choose_rules: '📜 <b>قوانین بازی</b>\n\nکدام حالت؟',

  room_created:
    '✅ <b>اتاق ساخته شد</b>\n\n🔑 کد اتاق: <code>{code}</code>\n🎮 حالت: {mode}\n📜 قوانین: {rules}\n\n👥 بازیکنان ({count}/{total}):\n{players}\n\nبرای شروع، روی دکمهٔ زیر بزن یا کد را برای دوستانت بفرست.',
  btn_open_game: '🎲 ورود به بازی',
  btn_invite: '📨 دعوت دوستان',
  btn_start_now: '▶️ شروع بازی',
  btn_leave_room: '🚪 خروج از اتاق',
  btn_refresh: '🔄 بروزرسانی',
  btn_add_bot: '🤖 افزودن ربات',

  invite_text:
    '🎲 بیا منچ بازی کنیم!\n\n🔑 کد اتاق: <code>{code}</code>\n\nروی لینک زیر بزن تا وارد شوی:\n{link}',

  ask_join_code:
    '🔑 <b>ورود به اتاق</b>\n\nکد ۶ حرفی اتاق را بفرست.\nمثال: <code>K7M2QX</code>',
  join_ok: '✅ وارد اتاق <code>{code}</code> شدی!',
  join_bad_code: '❌ کد اتاق درست نیست. یک کد ۶ حرفی بفرست.',
  join_not_found: '❌ اتاقی با این کد پیدا نشد یا منقضی شده است.',
  join_full: '❌ این اتاق پر است.',
  join_started: '❌ بازی این اتاق شروع شده است.',
  already_in_room: 'ℹ️ تو از قبل در این اتاق هستی.',

  searching: '🔍 <b>در حال جستجوی حریف…</b>\n\nلطفاً چند لحظه صبر کن.',
  btn_cancel_search: '✖️ لغو جستجو',
  search_canceled: '✖️ جستجو لغو شد.',
  match_found: '🎯 <b>حریف پیدا شد!</b>\n\nبازی در حال شروع است…',

  game_started: '🎲 <b>بازی شروع شد!</b>\n\nنوبت: {player}',
  your_turn: '🎲 نوبت توست! ({seconds} ثانیه)',
  turn_warning: '⏰ {seconds} ثانیه تا پایان نوبت!',
  turn_timeout: '⏱ وقت {player} تمام شد؛ ربات به جای او بازی کرد.',
  player_joined: '➕ {name} وارد اتاق شد. ({count}/{total})',
  player_left: '➖ {name} از بازی خارج شد.',
  player_disconnected: '🔴 ارتباط {name} قطع شد؛ ربات جایش را گرفت.',
  player_reconnected: '🟢 {name} برگشت.',

  game_over:
    '🏁 <b>بازی تمام شد</b>\n\n{ranking}\n\n⏱ مدت بازی: {duration}\n📊 امتیاز جدید تو: <b>{rating}</b> ({delta})',
  you_won: '🎉 <b>تو بردی!</b>',
  you_lost: '😔 این بار نشد. دفعهٔ بعد!',
  btn_rematch: '🔁 بازی دوباره',
  btn_main_menu: '🏠 منوی اصلی',

  profile:
    '👤 <b>پروفایل</b>\n\n{tier_icon} {name}\n🏅 رتبه: <b>{tier}</b>\n📊 امتیاز: <b>{rating}</b>\n🎚 سطح: <b>{level}</b> ({xp}/{xp_needed} XP)\n\n🎮 بازی‌ها: {games}\n✅ برد: {wins}  •  ❌ باخت: {losses}\n📈 درصد برد: {winrate}٪\n⚔️ مهره‌های زده‌شده: {captures}\n🤖 بردها مقابل ربات: {ai_wins}\n🪙 سکه: {coins}',

  stats:
    '📊 <b>آمار تو</b>\n\n🎮 کل بازی‌ها: {games}\n✅ برد: {wins}\n❌ باخت: {losses}\n📈 درصد برد: {winrate}٪\n⚔️ مهره‌های زده‌شده: {captures}\n💀 مهره‌های از دست رفته: {lost}\n🏠 مهره‌های خانه‌رسیده: {home}\n⏱ زمان کل بازی: {playtime}\n🔥 بهترین امتیاز: {best_rating}',

  leaderboard: '🏆 <b>جدول برترین‌ها</b>\n\n{rows}\n\n📍 جایگاه تو: <b>{my_rank}</b>',
  leaderboard_empty: '🏆 هنوز بازی‌ای ثبت نشده است. اولین نفر باش!',

  settings:
    '⚙️ <b>تنظیمات</b>\n\n🔊 صدا: {sound}\n🎨 پوسته: {theme}\n💬 چت: {chat}\n🌐 زبان: {lang}',
  btn_toggle_sound: '🔊 صدا: {value}',
  btn_toggle_chat: '💬 چت: {value}',
  btn_toggle_theme: '🎨 پوسته: {value}',
  btn_toggle_lang: '🌐 زبان: {value}',
  on: 'روشن',
  off: 'خاموش',
  theme_dark: 'تیره',
  theme_light: 'روشن',

  help:
    '❓ <b>راهنمای بازی</b>\n\n<b>هدف:</b> هر چهار مهره را به خانهٔ مرکزی برسان.\n\n<b>قوانین:</b>\n• با آوردن ۶ می‌توانی مهره را از پایگاه بیرون بیاوری.\n• با ۶ یک نوبت اضافه می‌گیری (حداکثر سه بار پشت‌سرهم).\n• اگر روی مهرهٔ حریف بنشینی، آن مهره به پایگاه برمی‌گردد و تو نوبت اضافه می‌گیری.\n• خانه‌های ستاره‌دار امن هستند.\n• برای ورود به مرکز باید عدد دقیق بیاوری.\n\n<b>دستورها:</b>\n/start شروع\n/game بازی جدید\n/join ورود با کد\n/profile پروفایل\n/stats آمار\n/leaderboard برترین‌ها\n/settings تنظیمات\n\n<b>نکته:</b> اگر ارتباطت قطع شود، ربات موقتاً جای تو بازی می‌کند و با برگشتن، بازی را ادامه می‌دهی.',

  err_generic: '⚠️ مشکلی پیش آمد. دوباره تلاش کن.',
  err_rate: '⏳ کمی آرام‌تر! چند لحظه صبر کن.',
  err_not_found: '❌ پیدا نشد.',
  err_not_your_turn: '⛔ الان نوبت تو نیست.',
  err_no_room: '❌ در هیچ اتاقی نیستی.',
  err_group_only: 'ℹ️ این دستور فقط در گروه کار می‌کند.',
  err_private_only: 'ℹ️ این دستور فقط در چت خصوصی کار می‌کند.',

  group_game:
    '🎲 <b>منچ گروهی</b>\n\n🔑 کد اتاق: <code>{code}</code>\n👥 بازیکنان: {count}/{total}\n\nبرای ورود روی دکمهٔ زیر بزنید:',
  btn_join_group_game: '🎮 ورود به بازی',

  cb_joined: 'وارد شدی ✅',
  cb_not_allowed: 'این دکمه برای تو نیست',
  cb_done: 'انجام شد',
  cb_wait: 'صبر کن…',
};

const EN: Dict = {
  welcome:
    '🎲 <b>Ludo Star</b>\n\nHi {name}!\nWelcome to online Ludo.\n\n🏆 Rating: <b>{rating}</b>\n🎮 Games: <b>{games}</b>  •  Wins: <b>{wins}</b>\n\nPick an option:',
  menu_new: '🎮 New Game',
  menu_quick: '⚡ Quick Match',
  menu_join: '🔑 Join by Code',
  menu_profile: '👤 Profile',
  menu_leaderboard: '🏆 Leaderboard',
  menu_settings: '⚙️ Settings',
  menu_help: '❓ Help',
  menu_back: '◀️ Back',

  choose_mode: '🎮 <b>New Game</b>\n\nChoose a game type:',
  mode_2p: '👥 2 Players',
  mode_4p: '👨‍👩‍👦‍👦 4 Players',
  mode_ai: '🤖 Play vs Bot',
  mode_public: '🌍 Public Room',

  choose_ai_level: '🤖 <b>Play vs Bot</b>\n\nChoose difficulty:',
  choose_rules: '📜 <b>Rule Set</b>\n\nWhich mode?',

  room_created:
    '✅ <b>Room created</b>\n\n🔑 Code: <code>{code}</code>\n🎮 Mode: {mode}\n📜 Rules: {rules}\n\n👥 Players ({count}/{total}):\n{players}\n\nTap below to enter, or share the code with friends.',
  btn_open_game: '🎲 Enter Game',
  btn_invite: '📨 Invite Friends',
  btn_start_now: '▶️ Start Game',
  btn_leave_room: '🚪 Leave Room',
  btn_refresh: '🔄 Refresh',
  btn_add_bot: '🤖 Add Bot',

  invite_text:
    '🎲 Let\'s play Ludo!\n\n🔑 Room code: <code>{code}</code>\n\nTap the link to join:\n{link}',

  ask_join_code: '🔑 <b>Join Room</b>\n\nSend the 6-letter room code.\nExample: <code>K7M2QX</code>',
  join_ok: '✅ Joined room <code>{code}</code>!',
  join_bad_code: '❌ Invalid code. Send a 6-letter code.',
  join_not_found: '❌ Room not found or expired.',
  join_full: '❌ This room is full.',
  join_started: '❌ This game already started.',
  already_in_room: 'ℹ️ You are already in this room.',

  searching: '🔍 <b>Searching for an opponent…</b>\n\nPlease wait a moment.',
  btn_cancel_search: '✖️ Cancel',
  search_canceled: '✖️ Search canceled.',
  match_found: '🎯 <b>Opponent found!</b>\n\nStarting…',

  game_started: '🎲 <b>Game started!</b>\n\nTurn: {player}',
  your_turn: '🎲 Your turn! ({seconds}s)',
  turn_warning: '⏰ {seconds}s left!',
  turn_timeout: '⏱ {player} ran out of time; the bot played instead.',
  player_joined: '➕ {name} joined. ({count}/{total})',
  player_left: '➖ {name} left the game.',
  player_disconnected: '🔴 {name} disconnected; bot took over.',
  player_reconnected: '🟢 {name} is back.',

  game_over:
    '🏁 <b>Game over</b>\n\n{ranking}\n\n⏱ Duration: {duration}\n📊 Your rating: <b>{rating}</b> ({delta})',
  you_won: '🎉 <b>You won!</b>',
  you_lost: '😔 Not this time. Try again!',
  btn_rematch: '🔁 Rematch',
  btn_main_menu: '🏠 Main Menu',

  profile:
    '👤 <b>Profile</b>\n\n{tier_icon} {name}\n🏅 Tier: <b>{tier}</b>\n📊 Rating: <b>{rating}</b>\n🎚 Level: <b>{level}</b> ({xp}/{xp_needed} XP)\n\n🎮 Games: {games}\n✅ Wins: {wins}  •  ❌ Losses: {losses}\n📈 Win rate: {winrate}%\n⚔️ Captures: {captures}\n🤖 Wins vs bots: {ai_wins}\n🪙 Coins: {coins}',

  stats:
    '📊 <b>Your Stats</b>\n\n🎮 Games: {games}\n✅ Wins: {wins}\n❌ Losses: {losses}\n📈 Win rate: {winrate}%\n⚔️ Captures: {captures}\n💀 Tokens lost: {lost}\n🏠 Tokens home: {home}\n⏱ Total playtime: {playtime}\n🔥 Best rating: {best_rating}',

  leaderboard: '🏆 <b>Leaderboard</b>\n\n{rows}\n\n📍 Your rank: <b>{my_rank}</b>',
  leaderboard_empty: '🏆 No games yet. Be the first!',

  settings: '⚙️ <b>Settings</b>\n\n🔊 Sound: {sound}\n🎨 Theme: {theme}\n💬 Chat: {chat}\n🌐 Language: {lang}',
  btn_toggle_sound: '🔊 Sound: {value}',
  btn_toggle_chat: '💬 Chat: {value}',
  btn_toggle_theme: '🎨 Theme: {value}',
  btn_toggle_lang: '🌐 Language: {value}',
  on: 'On',
  off: 'Off',
  theme_dark: 'Dark',
  theme_light: 'Light',

  help:
    '❓ <b>How to play</b>\n\n<b>Goal:</b> bring all four tokens to the center.\n\n<b>Rules:</b>\n• Roll a 6 to bring a token out of base.\n• A 6 grants an extra turn (max three in a row).\n• Landing on an opponent sends it back to base and grants an extra turn.\n• Star cells are safe.\n• You need an exact roll to reach the center.\n\n<b>Commands:</b>\n/start start\n/game new game\n/join join by code\n/profile profile\n/stats stats\n/leaderboard leaderboard\n/settings settings\n\n<b>Note:</b> if you disconnect, the bot plays for you and you can rejoin anytime.',

  err_generic: '⚠️ Something went wrong. Try again.',
  err_rate: '⏳ Slow down a bit!',
  err_not_found: '❌ Not found.',
  err_not_your_turn: '⛔ It is not your turn.',
  err_no_room: '❌ You are not in a room.',
  err_group_only: 'ℹ️ This command works in groups only.',
  err_private_only: 'ℹ️ This command works in private chat only.',

  group_game:
    '🎲 <b>Group Ludo</b>\n\n🔑 Code: <code>{code}</code>\n👥 Players: {count}/{total}\n\nTap below to join:',
  btn_join_group_game: '🎮 Join Game',

  cb_joined: 'Joined ✅',
  cb_not_allowed: 'This button is not for you',
  cb_done: 'Done',
  cb_wait: 'Please wait…',
};

const TEXTS: Record<Lang, Dict> = { fa: FA, en: EN };

/** گرفتن متن با جایگذاری مقادیر: t('fa', 'welcome', { name: 'علی' }) */
export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const dict = TEXTS[lang] ?? FA;
  let s = dict[key] ?? TEXTS.fa[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function pickLang(code: string | null | undefined): Lang {
  return code && code.toLowerCase().startsWith('fa') ? 'fa' : 'en';
}
