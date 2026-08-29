/** مغز ربات: پردازش دستورها، پیام‌ها و دکمه‌های شیشه‌ای */
import {
  TelegramAPI,
  type TgCallbackQuery,
  type TgMessage,
  type TgUpdate,
  type InlineKeyboard,
} from '../telegram/api';
import {
  aiLevelMenu,
  backOnly,
  gameOverKeyboard,
  groupJoinKeyboard,
  joinPromptKeyboard,
  leaderboardKeyboard,
  mainMenu,
  modeMenu,
  parseCb,
  profileKeyboard,
  roomKeyboard,
  rulesMenu,
  searchingKeyboard,
  settingsKeyboard,
} from '../telegram/keyboards';
import { AI_LEVEL_NAME, COLOR_EMOJI, STATUS_ICON, pickLang, t, type Lang } from '../config/texts';
import { getRules, MODE_SEATS, RULE_SETS } from '../config/rules';
import { generateJoinCode, generateRoomId } from '../game/rng';
import { displayName, escapeHtml, isValidJoinCode } from '../utils/auth';
import { RATE, formatDuration, levelFromXp, percent, rateLimit, tierOf } from '../utils/helpers';

/* ------------------------------------------------------------------ */
/* ابزارهای دسترسی به Durable Object ها                                */
/* ------------------------------------------------------------------ */

function hubOf(env: Env) {
  return env.HUB.get(env.HUB.idFromName('global')) as unknown as HubRpc;
}

interface HubRpc {
  ensureUser(input: { tgId: number; name: string; username?: string | null; photo?: string | null; lang?: string }): Promise<UserLike>;
  getUser(tgId: number): Promise<UserLike | null>;
  profileOf(tgId: number): Promise<Record<string, unknown> | null>;
  updateSettings(tgId: number, patch: Record<string, unknown>): Promise<UserLike | null>;
  setLastRoom(tgId: number, roomId: string | null): Promise<void>;
  leaderboard(page: number, pageSize?: number): Promise<{ rows: UserLike[]; hasNext: boolean; total: number }>;
  registerRoom(r: Record<string, unknown>): Promise<void>;
  updateRoom(roomId: string, players: number, status: string): Promise<void>;
  removeRoom(roomId: string): Promise<void>;
  roomByCode(code: string): Promise<Record<string, unknown> | null>;
  publicRooms(limit?: number): Promise<Record<string, unknown>[]>;
  joinQueue(entry: Record<string, unknown>): Promise<{ matched: boolean; opponents: { tgId: number; chatId: number; messageId: number | null }[] }>;
  leaveQueue(tgId: number): Promise<void>;
}

interface UserLike {
  tg_id: number;
  name: string;
  lang: string;
  sound: number;
  chat: number;
  theme: string;
  rating: number;
  best_rating: number;
  xp: number;
  coins: number;
  games: number;
  wins: number;
  losses: number;
  captures: number;
  lost_tokens: number;
  tokens_home: number;
  ai_wins: number;
  playtime_ms: number;
  last_room: string | null;
}

interface RoomSummary {
  roomId: string;
  joinCode: string;
  mode: string;
  visibility: string;
  rulesId: string;
  status: string;
  hostId: string;
  seatsTotal: number;
  count: number;
  players: {
    tgId: number | null;
    name: string;
    color: string;
    seat: number;
    isAI: boolean;
    aiLevel: string | null;
    status: string;
    rank: number | null;
  }[];
}

async function roomCall<T = Record<string, unknown>>(
  env: Env,
  roomId: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T | null> {
  const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
  const res = await stub.fetch(`https://room/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* بافت درخواست                                                        */
/* ------------------------------------------------------------------ */

export interface BotContext {
  env: Env;
  api: TelegramAPI;
  hub: HubRpc;
  origin: string;
  miniAppUrl: string;
  botUsername: string;
}

export function makeContext(env: Env, origin: string): BotContext {
  return {
    env,
    api: new TelegramAPI(env.TELEGRAM_BOT_TOKEN),
    hub: hubOf(env),
    origin,
    miniAppUrl: `${origin}/app`,
    botUsername: env.BOT_USERNAME,
  };
}

/* ------------------------------------------------------------------ */
/* نقطهٔ ورود                                                          */
/* ------------------------------------------------------------------ */

export async function handleUpdate(ctx: BotContext, update: TgUpdate): Promise<void> {
  try {
    if (update.message) await onMessage(ctx, update.message);
    else if (update.callback_query) await onCallback(ctx, update.callback_query);
    else if (update.inline_query) await onInlineQuery(ctx, update.inline_query);
  } catch (err) {
    console.log('handleUpdate error:', String(err));
  }
}

/* ------------------------------------------------------------------ */
/* پیام‌های متنی                                                       */
/* ------------------------------------------------------------------ */

async function onMessage(ctx: BotContext, msg: TgMessage): Promise<void> {
  const from = msg.from;
  if (!from || from.is_bot) return;

  const limit = rateLimit(`msg:${from.id}`, RATE.webhook.limit, RATE.webhook.windowMs);
  if (!limit.allowed) return;

  const user = await ctx.hub.ensureUser({
    tgId: from.id,
    name: displayName(from),
    username: from.username ?? null,
    lang: pickLang(from.language_code),
  });
  const lang = (user.lang as Lang) ?? 'fa';
  const isPrivate = msg.chat.type === 'private';
  const text = (msg.text ?? '').trim();
  if (!text) return;

  // دستورها
  if (text.startsWith('/')) {
    const [rawCmd, ...args] = text.split(/\s+/);
    const cmd = rawCmd.split('@')[0].toLowerCase();
    await runCommand(ctx, msg, user, lang, cmd, args, isPrivate);
    return;
  }

  // متن ساده در چت خصوصی: شاید کد اتاق باشد
  if (isPrivate && isValidJoinCode(text)) {
    await joinByCode(ctx, msg.chat.id, user, lang, text.toUpperCase(), null);
    return;
  }

  if (isPrivate) {
    await ctx.api.sendMessage(msg.chat.id, t(lang, 'err_generic'), mainMenu(lang));
  }
}

async function runCommand(
  ctx: BotContext,
  msg: TgMessage,
  user: UserLike,
  lang: Lang,
  cmd: string,
  args: string[],
  isPrivate: boolean,
): Promise<void> {
  const chatId = msg.chat.id;

  switch (cmd) {
    case '/start': {
      const payload = args[0] ?? '';
      if (payload && payload.startsWith('r_')) {
        await joinByRoomId(ctx, chatId, user, lang, payload);
        return;
      }
      if (payload && isValidJoinCode(payload)) {
        await joinByCode(ctx, chatId, user, lang, payload.toUpperCase(), null);
        return;
      }
      await ctx.api.sendMessage(chatId, welcomeText(lang, user), mainMenu(lang));
      return;
    }

    case '/game':
    case '/create': {
      if (!isPrivate) {
        await createGroupRoom(ctx, msg, user, lang);
        return;
      }
      await ctx.api.sendMessage(chatId, t(lang, 'choose_mode'), modeMenu(lang));
      return;
    }

    case '/join': {
      const code = (args[0] ?? '').toUpperCase();
      if (code && isValidJoinCode(code)) {
        await joinByCode(ctx, chatId, user, lang, code, null);
        return;
      }
      await ctx.api.sendMessage(chatId, t(lang, 'ask_join_code'), joinPromptKeyboard(lang));
      return;
    }

    case '/profile': {
      await ctx.api.sendMessage(chatId, await profileText(ctx, lang, user.tg_id), profileKeyboard(lang));
      return;
    }

    case '/stats': {
      await ctx.api.sendMessage(chatId, statsText(lang, user), profileKeyboard(lang));
      return;
    }

    case '/leaderboard': {
      const { text, kb } = await leaderboardView(ctx, lang, 1, user.tg_id);
      await ctx.api.sendMessage(chatId, text, kb);
      return;
    }

    case '/settings': {
      if (!isPrivate) {
        await ctx.api.sendMessage(chatId, t(lang, 'err_private_only'));
        return;
      }
      await ctx.api.sendMessage(chatId, settingsText(lang, user), settingsKeyboard(viewOf(user)));
      return;
    }

    case '/help': {
      await ctx.api.sendMessage(chatId, t(lang, 'help'), backOnly(lang));
      return;
    }

    default:
      if (isPrivate) await ctx.api.sendMessage(chatId, t(lang, 'help'), mainMenu(lang));
      return;
  }
}

/* ------------------------------------------------------------------ */
/* دکمه‌های شیشه‌ای                                                     */
/* ------------------------------------------------------------------ */

async function onCallback(ctx: BotContext, cb: TgCallbackQuery): Promise<void> {
  const from = cb.from;
  const msg = cb.message;
  const data = cb.data ?? '';
  if (!msg) {
    await ctx.api.answerCallback(cb.id);
    return;
  }

  const limit = rateLimit(`cb:${from.id}`, RATE.action.limit, RATE.action.windowMs);
  if (!limit.allowed) {
    await ctx.api.answerCallback(cb.id, t('fa', 'err_rate'), true);
    return;
  }

  const user = await ctx.hub.ensureUser({
    tgId: from.id,
    name: displayName(from),
    username: from.username ?? null,
    lang: pickLang(from.language_code),
  });
  const lang = (user.lang as Lang) ?? 'fa';
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const isPrivate = msg.chat.type === 'private';
  const { ns, parts } = parseCb(data);

  const edit = (text: string, kb?: InlineKeyboard) => ctx.api.editMessageText(chatId, messageId, text, kb);

  switch (ns) {
    case 'x':
      await ctx.api.answerCallback(cb.id);
      return;

    case 'm': {
      const page = parts[0] ?? 'main';
      if (page === 'main') await edit(welcomeText(lang, user), mainMenu(lang));
      else if (page === 'new') await edit(t(lang, 'choose_mode'), modeMenu(lang));
      else if (page === 'join') await edit(t(lang, 'ask_join_code'), joinPromptKeyboard(lang));
      else if (page === 'profile') await edit(await profileText(ctx, lang, user.tg_id), profileKeyboard(lang));
      else if (page === 'settings') await edit(settingsText(lang, user), settingsKeyboard(viewOf(user)));
      else if (page === 'help') await edit(t(lang, 'help'), backOnly(lang));
      await ctx.api.answerCallback(cb.id);
      return;
    }

    case 'nw': {
      const mode = parts[0] ?? '2P';
      if (mode === 'AI') await edit(t(lang, 'choose_ai_level'), aiLevelMenu(lang));
      else await edit(t(lang, 'choose_rules'), rulesMenu(lang, mode));
      await ctx.api.answerCallback(cb.id);
      return;
    }

    case 'ai': {
      const level = parts[0] ?? 'NORMAL';
      await edit(t(lang, 'choose_rules'), rulesMenu(lang, 'AI', level));
      await ctx.api.answerCallback(cb.id);
      return;
    }

    case 'mk': {
      const mode = parts[0] ?? '2P';
      const rulesId = parts[1] ?? 'classic';
      const aiLevel = parts[2] && parts[2] !== '-' ? parts[2] : 'NORMAL';
      const rl = rateLimit(`mk:${user.tg_id}`, RATE.createRoom.limit, RATE.createRoom.windowMs);
      if (!rl.allowed) {
        await ctx.api.answerCallback(cb.id, t(lang, 'err_rate'), true);
        return;
      }
      await createRoomFlow(ctx, { chatId, messageId, user, lang, mode, rulesId, aiLevel, isPrivate });
      await ctx.api.answerCallback(cb.id, t(lang, 'cb_done'));
      return;
    }

    case 'rm': {
      await roomAction(ctx, cb, user, lang, parts, chatId, messageId, isPrivate);
      return;
    }

    case 'qm': {
      if (parts[0] === 'cancel') {
        await ctx.hub.leaveQueue(user.tg_id);
        await edit(t(lang, 'search_canceled'), mainMenu(lang));
        await ctx.api.answerCallback(cb.id, t(lang, 'cb_done'));
        return;
      }
      await quickMatch(ctx, user, lang, chatId, messageId);
      await ctx.api.answerCallback(cb.id);
      return;
    }

    case 'st': {
      const key = parts[0] ?? '';
      const patch: Record<string, unknown> = {};
      if (key === 'sound') patch.sound = user.sound ? 0 : 1;
      else if (key === 'chat') patch.chat = user.chat ? 0 : 1;
      else if (key === 'theme') patch.theme = user.theme === 'dark' ? 'light' : 'dark';
      else if (key === 'lang') patch.lang = lang === 'fa' ? 'en' : 'fa';
      const updated = (await ctx.hub.updateSettings(user.tg_id, patch)) ?? user;
      const newLang = (updated.lang as Lang) ?? lang;
      await edit(settingsText(newLang, updated), settingsKeyboard(viewOf(updated)));
      await ctx.api.answerCallback(cb.id, t(newLang, 'cb_done'));
      return;
    }

    case 'lb': {
      const page = Math.max(1, Number(parts[0] ?? 1));
      const view = await leaderboardView(ctx, lang, page, user.tg_id);
      await edit(view.text, view.kb);
      await ctx.api.answerCallback(cb.id);
      return;
    }

    default:
      await ctx.api.answerCallback(cb.id);
      return;
  }
}

/* ------------------------------------------------------------------ */
/* ساخت اتاق                                                           */
/* ------------------------------------------------------------------ */

interface CreateArgs {
  chatId: number;
  messageId: number | null;
  user: UserLike;
  lang: Lang;
  mode: string;
  rulesId: string;
  aiLevel: string;
  isPrivate: boolean;
}

async function createRoomFlow(ctx: BotContext, a: CreateArgs): Promise<string | null> {
  const isPublic = a.mode === 'PUB';
  const mode = isPublic ? '4P' : a.mode;
  const visibility = isPublic ? 'PUBLIC' : 'PRIVATE';
  const rules = getRules(a.rulesId);
  const roomId = generateRoomId();
  const joinCode = generateJoinCode();
  const seats = MODE_SEATS[mode] ?? 4;

  await ctx.hub.registerRoom({
    roomId,
    joinCode,
    mode,
    visibility,
    rulesId: a.rulesId,
    hostId: `u${a.user.tg_id}`,
    seats,
    ttlMs: rules.timing.roomTtlMs,
  });

  const res = await roomCall<{ ok: boolean; summary: RoomSummary }>(ctx.env, roomId, 'init', {
    roomId,
    joinCode,
    mode,
    visibility,
    rulesId: a.rulesId,
    aiLevel: a.aiLevel,
    host: {
      tgId: a.user.tg_id,
      name: a.user.name,
      rating: a.user.rating,
      chatId: a.chatId,
    },
  });

  if (!res?.ok || !res.summary) {
    if (a.messageId) await ctx.api.editMessageText(a.chatId, a.messageId, t(a.lang, 'err_generic'), mainMenu(a.lang));
    return null;
  }

  await ctx.hub.setLastRoom(a.user.tg_id, roomId);
  await ctx.hub.updateRoom(roomId, res.summary.count, res.summary.status);
  await showRoom(ctx, a.chatId, a.messageId, a.user, a.lang, res.summary, a.isPrivate);
  return roomId;
}

async function createGroupRoom(ctx: BotContext, msg: TgMessage, user: UserLike, lang: Lang): Promise<void> {
  const roomId = await createRoomFlow(ctx, {
    chatId: msg.chat.id,
    messageId: null,
    user,
    lang,
    mode: '4P',
    rulesId: 'classic',
    aiLevel: 'NORMAL',
    isPrivate: false,
  });
  if (!roomId) return;
}

/* ------------------------------------------------------------------ */
/* نمایش اتاق                                                          */
/* ------------------------------------------------------------------ */

function roomText(lang: Lang, s: RoomSummary): string {
  const rules = getRules(s.rulesId);
  const lines = s.players
    .map((p) => {
      const icon = COLOR_EMOJI[p.color] ?? '⚪';
      const st = STATUS_ICON[p.status] ?? '';
      const ai = p.isAI ? ` (${AI_LEVEL_NAME[lang][p.aiLevel ?? 'NORMAL']})` : '';
      return `${icon} ${escapeHtml(p.name)}${ai} ${st}`;
    })
    .join('\n');

  const modeName =
    s.mode === 'AI' ? t(lang, 'mode_ai') : s.mode === '2P' ? t(lang, 'mode_2p') : t(lang, 'mode_4p');

  return t(lang, 'room_created', {
    code: s.joinCode,
    mode: modeName,
    rules: rules.title[lang] ?? rules.title.en,
    count: s.count,
    total: s.seatsTotal,
    players: lines || '—',
  });
}

async function showRoom(
  ctx: BotContext,
  chatId: number,
  messageId: number | null,
  user: UserLike,
  lang: Lang,
  s: RoomSummary,
  isPrivate: boolean,
): Promise<void> {
  const invite = t(lang, 'invite_text', {
    code: s.joinCode,
    link: `https://t.me/${ctx.botUsername}?start=${s.roomId}`,
  });

  if (!isPrivate) {
    const text = t(lang, 'group_game', { code: s.joinCode, count: s.count, total: s.seatsTotal });
    const kb = groupJoinKeyboard(lang, ctx.botUsername, s.roomId);
    if (messageId) await ctx.api.editMessageText(chatId, messageId, text, kb);
    else await ctx.api.sendMessage(chatId, text, kb);
    return;
  }

  const kb = roomKeyboard({
    lang,
    roomId: s.roomId,
    joinCode: s.joinCode,
    botUsername: ctx.botUsername,
    miniAppUrl: ctx.miniAppUrl,
    isHost: s.hostId === `u${user.tg_id}`,
    isPrivateChat: true,
    canStart: s.status === 'LOBBY' && s.count >= 2,
    canAddBot: s.status === 'LOBBY' && s.count < s.seatsTotal,
    inviteText: invite,
  });

  const text = roomText(lang, s);
  if (messageId) await ctx.api.editMessageText(chatId, messageId, text, kb);
  else await ctx.api.sendMessage(chatId, text, kb);
}

/* ------------------------------------------------------------------ */
/* عملیات داخل اتاق                                                    */
/* ------------------------------------------------------------------ */

async function roomAction(
  ctx: BotContext,
  cb: TgCallbackQuery,
  user: UserLike,
  lang: Lang,
  parts: string[],
  chatId: number,
  messageId: number,
  isPrivate: boolean,
): Promise<void> {
  const action = parts[0] ?? '';
  const roomId = parts[1] ?? '';
  if (!roomId) {
    await ctx.api.answerCallback(cb.id, t(lang, 'err_not_found'), true);
    return;
  }

  if (action === 'again') {
    await ctx.api.editMessageText(chatId, messageId, t(lang, 'choose_mode'), modeMenu(lang));
    await ctx.api.answerCallback(cb.id);
    return;
  }

  let res: { ok: boolean; summary?: RoomSummary; error?: string } | null = null;

  if (action === 'ref') {
    res = await roomCall<{ ok: boolean; summary: RoomSummary }>(ctx.env, roomId, 'summary');
    if (res && !('summary' in res)) res = null;
  } else if (action === 'start') {
    res = await roomCall(ctx.env, roomId, 'start', { tgId: user.tg_id });
  } else if (action === 'addbot') {
    res = await roomCall(ctx.env, roomId, 'addbot', { tgId: user.tg_id, level: 'NORMAL' });
  } else if (action === 'leave') {
    res = await roomCall(ctx.env, roomId, 'leave', { tgId: user.tg_id });
    await ctx.hub.setLastRoom(user.tg_id, null);
    if (res?.ok) {
      await ctx.api.editMessageText(chatId, messageId, welcomeText(lang, user), mainMenu(lang));
      await ctx.api.answerCallback(cb.id, t(lang, 'cb_done'));
      if (res.summary) await ctx.hub.updateRoom(roomId, res.summary.count, res.summary.status);
      return;
    }
  } else if (action === 'join') {
    res = await roomCall(ctx.env, roomId, 'join', {
      tgId: user.tg_id,
      name: user.name,
      rating: user.rating,
      chatId,
    });
  }

  if (!res?.ok || !res.summary) {
    await ctx.api.answerCallback(cb.id, t(lang, res?.error === 'NOT_HOST' ? 'cb_not_allowed' : 'err_generic'), true);
    return;
  }

  await ctx.hub.updateRoom(roomId, res.summary.count, res.summary.status);
  await showRoom(ctx, chatId, messageId, user, lang, res.summary, isPrivate);
  await ctx.api.answerCallback(cb.id, t(lang, 'cb_done'));
}

/* ------------------------------------------------------------------ */
/* ورود به اتاق                                                        */
/* ------------------------------------------------------------------ */

async function joinByCode(
  ctx: BotContext,
  chatId: number,
  user: UserLike,
  lang: Lang,
  code: string,
  messageId: number | null,
): Promise<void> {
  const room = await ctx.hub.roomByCode(code);
  if (!room) {
    await ctx.api.sendMessage(chatId, t(lang, 'join_not_found'), mainMenu(lang));
    return;
  }
  await joinByRoomId(ctx, chatId, user, lang, String(room.room_id), messageId);
}

async function joinByRoomId(
  ctx: BotContext,
  chatId: number,
  user: UserLike,
  lang: Lang,
  roomId: string,
  messageId: number | null = null,
): Promise<void> {
  const res = await roomCall<{ ok: boolean; summary?: RoomSummary; error?: string }>(ctx.env, roomId, 'join', {
    tgId: user.tg_id,
    name: user.name,
    rating: user.rating,
    chatId,
  });

  if (!res?.ok || !res.summary) {
    const key =
      res?.error === 'ROOM_FULL' ? 'join_full' : res?.error === 'ALREADY_STARTED' ? 'join_started' : 'join_not_found';
    await ctx.api.sendMessage(chatId, t(lang, key), mainMenu(lang));
    return;
  }

  await ctx.hub.setLastRoom(user.tg_id, roomId);
  await ctx.hub.updateRoom(roomId, res.summary.count, res.summary.status);
  await showRoom(ctx, chatId, messageId, user, lang, res.summary, true);
}

/* ------------------------------------------------------------------ */
/* بازی سریع                                                           */
/* ------------------------------------------------------------------ */

async function quickMatch(
  ctx: BotContext,
  user: UserLike,
  lang: Lang,
  chatId: number,
  messageId: number,
): Promise<void> {
  await ctx.api.editMessageText(chatId, messageId, t(lang, 'searching'), searchingKeyboard(lang));

  const result = await ctx.hub.joinQueue({
    tgId: user.tg_id,
    rating: user.rating,
    mode: '2P',
    rulesId: 'classic',
    chatId,
    messageId,
  });

  if (!result.matched) return;

  const roomId = generateRoomId();
  const joinCode = generateJoinCode();
  const rules = getRules('classic');

  await ctx.hub.registerRoom({
    roomId,
    joinCode,
    mode: '2P',
    visibility: 'QUICK',
    rulesId: 'classic',
    hostId: `u${user.tg_id}`,
    seats: 2,
    ttlMs: rules.timing.roomTtlMs,
  });

  await roomCall(ctx.env, roomId, 'init', {
    roomId,
    joinCode,
    mode: '2P',
    visibility: 'QUICK',
    rulesId: 'classic',
    host: { tgId: user.tg_id, name: user.name, rating: user.rating, chatId },
  });

  for (const opp of result.opponents) {
    const oppUser = await ctx.hub.getUser(opp.tgId);
    await roomCall(ctx.env, roomId, 'join', {
      tgId: opp.tgId,
      name: oppUser?.name ?? 'Player',
      rating: oppUser?.rating ?? 1200,
      chatId: opp.chatId,
    });
    await ctx.hub.setLastRoom(opp.tgId, roomId);
  }
  await ctx.hub.setLastRoom(user.tg_id, roomId);

  const summary = (await roomCall<{ ok: boolean; summary: RoomSummary }>(ctx.env, roomId, 'summary'))?.summary;
  if (!summary) return;

  await showRoom(ctx, chatId, messageId, user, lang, summary, true);

  for (const opp of result.opponents) {
    const oppUser = await ctx.hub.getUser(opp.tgId);
    const oppLang = (oppUser?.lang as Lang) ?? 'fa';
    const fake: UserLike = oppUser ?? { ...user, tg_id: opp.tgId };
    if (opp.messageId) await showRoom(ctx, opp.chatId, opp.messageId, fake, oppLang, summary, true);
    else await showRoom(ctx, opp.chatId, null, fake, oppLang, summary, true);
  }
}

/* ------------------------------------------------------------------ */
/* متن‌های آماده                                                       */
/* ------------------------------------------------------------------ */

function welcomeText(lang: Lang, u: UserLike): string {
  return t(lang, 'welcome', {
    name: escapeHtml(u.name),
    rating: u.rating,
    games: u.games,
    wins: u.wins,
  });
}

async function profileText(ctx: BotContext, lang: Lang, tgId: number): Promise<string> {
  const p = await ctx.hub.profileOf(tgId);
  if (!p) return t(lang, 'err_not_found');
  const tier = tierOf(Number(p.rating));
  return t(lang, 'profile', {
    tier_icon: tier.icon,
    name: escapeHtml(String(p.name)),
    tier: lang === 'fa' ? tier.fa : tier.en,
    rating: Number(p.rating),
    level: Number(p.level),
    xp: Number(p.xpInLevel),
    xp_needed: Number(p.xpNeeded),
    games: Number(p.games),
    wins: Number(p.wins),
    losses: Number(p.losses),
    winrate: percent(Number(p.wins), Number(p.games)),
    captures: Number(p.captures),
    ai_wins: Number(p.ai_wins),
    coins: Number(p.coins),
  });
}

function statsText(lang: Lang, u: UserLike): string {
  return t(lang, 'stats', {
    games: u.games,
    wins: u.wins,
    losses: u.losses,
    winrate: percent(u.wins, u.games),
    captures: u.captures,
    lost: u.lost_tokens,
    home: u.tokens_home,
    playtime: formatDuration(u.playtime_ms),
    best_rating: u.best_rating,
  });
}

function settingsText(lang: Lang, u: UserLike): string {
  return t(lang, 'settings', {
    sound: t(lang, u.sound ? 'on' : 'off'),
    chat: t(lang, u.chat ? 'on' : 'off'),
    theme: t(lang, u.theme === 'dark' ? 'theme_dark' : 'theme_light'),
    lang: lang === 'fa' ? 'فارسی' : 'English',
  });
}

function viewOf(u: UserLike) {
  return {
    sound: Boolean(u.sound),
    chat: Boolean(u.chat),
    theme: (u.theme === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    lang: ((u.lang as Lang) ?? 'fa') as Lang,
  };
}

async function leaderboardView(
  ctx: BotContext,
  lang: Lang,
  page: number,
  tgId: number,
): Promise<{ text: string; kb: InlineKeyboard }> {
  const { rows, hasNext } = await ctx.hub.leaderboard(page, 10);
  if (rows.length === 0) {
    return { text: t(lang, 'leaderboard_empty'), kb: backOnly(lang) };
  }
  const medals = ['🥇', '🥈', '🥉'];
  const start = (page - 1) * 10;
  const lines = rows
    .map((r, i) => {
      const pos = start + i + 1;
      const badge = pos <= 3 ? medals[pos - 1] : `${pos}.`;
      const me = r.tg_id === tgId ? ' ⬅️' : '';
      const tier = tierOf(r.rating);
      return `${badge} ${tier.icon} ${escapeHtml(r.name)} — <b>${r.rating}</b>${me}`;
    })
    .join('\n');

  const profile = await ctx.hub.profileOf(tgId);
  const myRank = profile ? Number(profile.globalRank) : '-';

  return {
    text: t(lang, 'leaderboard', { rows: lines, my_rank: myRank }),
    kb: leaderboardKeyboard(lang, page, hasNext),
  };
}

/* ------------------------------------------------------------------ */
/* پاسخ به جستجوی درون‌خطی (دکمهٔ دعوت دوستان)                          */
/* ------------------------------------------------------------------ */

async function onInlineQuery(ctx: BotContext, q: { id: string; from: { id: number }; query: string }): Promise<void> {
  const text = q.query.trim() || `🎲 بیا منچ بازی کنیم!\nhttps://t.me/${ctx.botUsername}`;
  await ctx.api.answerInlineQuery(q.id, [
    {
      type: 'article',
      id: 'invite',
      title: '📨 ارسال دعوت‌نامه',
      description: 'دعوت دوستان به بازی منچ',
      input_message_content: {
        message_content_type: undefined,
        message_text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      },
      reply_markup: {
        inline_keyboard: [[{ text: '🎲 ورود به بازی', url: `https://t.me/${ctx.botUsername}` }]],
      },
    },
  ]);
}

/* ------------------------------------------------------------------ */
/* پایان بازی: پیام نتیجه با دکمه                                       */
/* ------------------------------------------------------------------ */

export async function sendGameOver(
  ctx: BotContext,
  chatId: number,
  lang: Lang,
  roomId: string,
  body: string,
): Promise<void> {
  await ctx.api.sendMessage(chatId, body, gameOverKeyboard(lang, roomId));
}

/** اتاق‌های عمومی برای نمایش در منو */
export async function publicRoomsText(ctx: BotContext, lang: Lang): Promise<string> {
  const rooms = await ctx.hub.publicRooms(8);
  if (rooms.length === 0) return t(lang, 'leaderboard_empty');
  return rooms
    .map((r) => `🔑 <code>${String(r.join_code)}</code> — ${Number(r.players)}/${Number(r.seats)}`)
    .join('\n');
}

export { RULE_SETS };
