/** نقطهٔ ورود Worker: وب‌هوک تلگرام، API مینی‌اپ، WebSocket و فایل‌های ثابت */
import { handleUpdate, makeContext } from './bot/handlers';
import { TelegramAPI, BOT_COMMANDS_EN, BOT_COMMANDS_FA, type TgUpdate } from './telegram/api';
import { verifyInitData, verifyWebhookSecret, displayName, isValidJoinCode } from './utils/auth';
import { RATE, fail, json, ok, preflight, rateLimit, readJson } from './utils/helpers';
import { pickLang } from './config/texts';
import { getRules, MODE_SEATS } from './config/rules';
import { generateJoinCode, generateRoomId } from './game/rng';
import { STAKE_OPTIONS, entryFee, normalizeStake } from './config/coins';

export { GameRoom } from './do/gameroom';
export { Hub } from './do/hub';

interface HubRpc {
  ensureUser(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  getUser(tgId: number): Promise<Record<string, unknown> | null>;
  profileOf(tgId: number): Promise<Record<string, unknown> | null>;
  updateSettings(tgId: number, patch: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  setLastRoom(tgId: number, roomId: string | null): Promise<void>;
  leaderboard(page: number, pageSize?: number): Promise<Record<string, unknown>>;
  history(tgId: number, limit?: number): Promise<Record<string, unknown>[]>;
  registerRoom(r: Record<string, unknown>): Promise<void>;
  updateRoom(roomId: string, players: number, status: string): Promise<void>;
  roomByCode(code: string): Promise<Record<string, unknown> | null>;
  publicRooms(limit?: number): Promise<Record<string, unknown>[]>;
  coinsOf(tgId: number): Promise<number>;
  canAfford(tgId: number, amount: number): Promise<boolean>;
  coinHistory(tgId: number, limit?: number): Promise<Record<string, unknown>[]>;
}

function hub(env: Env): HubRpc {
  return env.HUB.get(env.HUB.idFromName('global')) as unknown as HubRpc;
}

function roomStub(env: Env, roomId: string) {
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId));
}

async function roomCall<T = Record<string, unknown>>(
  env: Env,
  roomId: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T | null> {
  const res = await roomStub(env, roomId).fetch(`https://room/${path}`, {
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

/** گرفتن فایل index.html از فضای فایل‌های ثابت، با دنبال کردن ریدایرکت */
async function loadMiniApp(env: Env, origin: string): Promise<Response> {
  let res = await env.ASSETS.fetch(new Request(`${origin}/`, { method: 'GET' }));
  let hops = 0;
  while (res.status >= 300 && res.status < 400 && hops < 3) {
    const loc = res.headers.get('Location');
    if (!loc) break;
    res = await env.ASSETS.fetch(new Request(new URL(loc, origin).toString(), { method: 'GET' }));
    hops++;
  }
  return res;
}

/* ------------------------------------------------------------------ */
/* احراز هویت مینی‌اپ                                                  */
/* ------------------------------------------------------------------ */

async function authOf(request: Request, env: Env, url: URL) {
  const initData =
    request.headers.get('X-Init-Data') ?? url.searchParams.get('initData') ?? '';
  const res = await verifyInitData(initData, env.TELEGRAM_BOT_TOKEN);
  return res;
}

/* ------------------------------------------------------------------ */
/* Worker                                                              */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = `${url.protocol}//${url.host}`;

    if (request.method === 'OPTIONS') return preflight();

    /* ---------------- وب‌هوک تلگرام ---------------- */
    if (path === '/webhook' && request.method === 'POST') {
      if (!verifyWebhookSecret(request, (env.WEBHOOK_SECRET ?? '').trim())) return fail('FORBIDDEN', 403);
      const update = await readJson<TgUpdate>(request);
      if (!update) return ok();
      const botCtx = makeContext(env, origin);
      ctx.waitUntil(handleUpdate(botCtx, update));
      return ok();
    }

    /* ---------------- نصب وب‌هوک ---------------- */
    if (path === '/setup') {
      const key = (url.searchParams.get('key') ?? '').trim();
      const want = (env.WEBHOOK_SECRET ?? '').trim();
      if (!want || key !== want) {
        return json(
          { ok: false, error: 'FORBIDDEN', secretLen: want.length, keyLen: key.length },
          403,
        );
      }
      const api = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
      const hookRes = await api.setWebhook(`${origin}/webhook`, want);
      await api.setMyCommands(BOT_COMMANDS_EN);
      await api.setMyCommands(BOT_COMMANDS_FA, 'fa');
      const me = await api.getMe();
      const info = await api.getWebhookInfo();
      return json({
        ok: hookRes.ok,
        webhook: `${origin}/webhook`,
        bot: me.result ?? null,
        info: info.result ?? null,
      });
    }

    if (path === '/health') {
      const probe = await loadMiniApp(env, origin);
      return json({
        ok: true,
        time: Date.now(),
        bot: env.BOT_USERNAME ?? null,
        hasToken: !!env.TELEGRAM_BOT_TOKEN,
        hasSecret: !!env.WEBHOOK_SECRET,
        secretLen: (env.WEBHOOK_SECRET ?? '').length,
        appStatus: probe.status,
      });
    }

    /* ---------------- اتصال زندهٔ بازی ---------------- */
    if (path === '/api/ws') {
      const roomId = url.searchParams.get('room') ?? '';
      if (!roomId) return fail('NO_ROOM');
      const auth = await authOf(request, env, url);
      if (!auth.ok || !auth.user) return fail(auth.error ?? 'UNAUTHORIZED', 401);

      const target = new URL('https://room/ws');
      target.searchParams.set('tgId', String(auth.user.id));
      target.searchParams.set('name', displayName(auth.user));
      return roomStub(env, roomId).fetch(new Request(target.toString(), request));
    }

    /* ---------------- API مینی‌اپ ---------------- */
    if (path.startsWith('/api/')) {
      const auth = await authOf(request, env, url);
      if (!auth.ok || !auth.user) return fail(auth.error ?? 'UNAUTHORIZED', 401);
      const tgId = auth.user.id;

      const rl = rateLimit(`api:${tgId}`, RATE.api.limit, RATE.api.windowMs);
      if (!rl.allowed) return fail('RATE_LIMITED', 429);

      const h = hub(env);
      const user = await h.ensureUser({
        tgId,
        name: displayName(auth.user),
        username: auth.user.username ?? null,
        photo: auth.user.photo_url ?? null,
        lang: pickLang(auth.user.language_code),
      });

      const body = request.method === 'POST' ? ((await readJson<Record<string, unknown>>(request)) ?? {}) : {};

      switch (path) {
        case '/api/me':
          return json({
            ok: true,
            user,
            profile: await h.profileOf(tgId),
            startParam: auth.startParam ?? null,
            stakes: STAKE_OPTIONS,
          });

        case '/api/profile':
          return json({ ok: true, profile: await h.profileOf(tgId) });

        case '/api/history':
          return json({ ok: true, history: await h.history(tgId, 15) });

        case '/api/coins':
          return json({
            ok: true,
            coins: await h.coinsOf(tgId),
            stakes: STAKE_OPTIONS,
            history: await h.coinHistory(tgId, 20),
          });

        case '/api/leaderboard': {
          const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
          return json({ ok: true, ...(await h.leaderboard(page, 10)) });
        }

        case '/api/settings': {
          const updated = await h.updateSettings(tgId, {
            lang: body.lang,
            sound: typeof body.sound === 'boolean' ? (body.sound ? 1 : 0) : undefined,
            chat: typeof body.chat === 'boolean' ? (body.chat ? 1 : 0) : undefined,
            theme: body.theme,
          });
          return json({ ok: true, user: updated });
        }

        case '/api/rooms':
          return json({ ok: true, rooms: await h.publicRooms(10) });

        case '/api/room/state': {
          const roomId = String(url.searchParams.get('room') ?? body.roomId ?? '');
          if (!roomId) return fail('NO_ROOM');
          const res = await roomCall(env, roomId, 'state');
          return res ? json(res) : fail('NOT_FOUND', 404);
        }

        case '/api/room/create': {
          const rlc = rateLimit(`create:${tgId}`, RATE.createRoom.limit, RATE.createRoom.windowMs);
          if (!rlc.allowed) return fail('RATE_LIMITED', 429);

          const mode = String(body.mode ?? '2P');
          const rulesId = String(body.rulesId ?? 'classic');
          const aiLevel = String(body.aiLevel ?? 'NORMAL');
          const visibility = String(body.visibility ?? 'PRIVATE');
          const teamMode = Boolean(body.teamMode ?? false);
          const rules = getRules(rulesId);
          const roomId = generateRoomId();
          const joinCode = generateJoinCode();
          const seats = MODE_SEATS[mode] ?? 4;

          // مبلغ میز: بازی با ربات همیشه دوستانه است
          const stake = mode === 'AI' ? 0 : normalizeStake(body.stake);
          const fee = entryFee(stake, seats);

          if (fee > 0 && !(await h.canAfford(tgId, fee))) {
            return json(
              { ok: false, error: 'NOT_ENOUGH_COINS', need: fee, coins: await h.coinsOf(tgId) },
              402,
            );
          }

          await h.registerRoom({
            roomId,
            joinCode,
            mode,
            visibility,
            rulesId,
            hostId: `u${tgId}`,
            seats,
            ttlMs: rules.timing.roomTtlMs,
            stake,
          });

          const res = await roomCall(env, roomId, 'init', {
            roomId,
            joinCode,
            mode,
            visibility,
            rulesId,
            aiLevel,
            stake,
            teamMode,
            host: {
              tgId,
              name: displayName(auth.user),
              photo: auth.user.photo_url ?? null,
              rating: Number(user.rating ?? 1200),
              chatId: tgId,
            },
          });
          await h.setLastRoom(tgId, roomId);
          return res ? json({ ...res, roomId, joinCode, stake, fee }) : fail('CREATE_FAILED', 500);
        }

        case '/api/room/join': {
          let roomId = String(body.roomId ?? '');
          const code = String(body.code ?? '').toUpperCase();
          let roomRow: Record<string, unknown> | null = null;

          if (!roomId && isValidJoinCode(code)) {
            roomRow = await h.roomByCode(code);
            if (!roomRow) return fail('NOT_FOUND', 404);
            roomId = String(roomRow.room_id);
          }
          if (!roomId) return fail('NO_ROOM');

          // بررسی موجودی پیش از ورود
          const info = await roomCall<{ ok: boolean; summary?: Record<string, unknown> }>(env, roomId, 'summary');
          const sum = info?.summary ?? null;
          const stake = Number(sum?.stake ?? roomRow?.stake ?? 0);
          const seats = Number(sum?.seatsTotal ?? roomRow?.seats ?? 4);
          const fee = entryFee(stake, seats);

          if (fee > 0 && !(await h.canAfford(tgId, fee))) {
            return json(
              { ok: false, error: 'NOT_ENOUGH_COINS', need: fee, coins: await h.coinsOf(tgId) },
              402,
            );
          }

          const res = await roomCall<{ ok: boolean; summary?: { count: number; status: string } }>(
            env,
            roomId,
            'join',
            {
              tgId,
              name: displayName(auth.user),
              photo: auth.user.photo_url ?? null,
              rating: Number(user.rating ?? 1200),
              chatId: tgId,
            },
          );
          if (res?.ok && res.summary) {
            await h.setLastRoom(tgId, roomId);
            await h.updateRoom(roomId, res.summary.count, res.summary.status);
          }
          return res ? json({ ...res, roomId, stake, fee }) : fail('JOIN_FAILED', 500);
        }

        case '/api/room/start': {
          const roomId = String(body.roomId ?? '');
          if (!roomId) return fail('NO_ROOM');
          const res = await roomCall<Record<string, unknown>>(env, roomId, 'start', { tgId });
          if (res && res.ok === false) return json(res, 402);
          return res ? json(res) : fail('START_FAILED', 500);
        }

        case '/api/room/addbot': {
          const roomId = String(body.roomId ?? '');
          if (!roomId) return fail('NO_ROOM');
          const res = await roomCall(env, roomId, 'addbot', { tgId, level: body.level ?? 'NORMAL' });
          return res ? json(res) : fail('ADDBOT_FAILED', 500);
        }

        case '/api/room/leave': {
          const roomId = String(body.roomId ?? '');
          if (!roomId) return fail('NO_ROOM');
          const res = await roomCall(env, roomId, 'leave', { tgId });
          await h.setLastRoom(tgId, null);
          return res ? json(res) : fail('LEAVE_FAILED', 500);
        }

        default:
          return fail('NOT_FOUND', 404);
      }
    }

    /* ---------------- مینی‌اپ ---------------- */
    if (path === '/app' || path === '/app/') {
      const res = await loadMiniApp(env, origin);
      return new Response(res.body, {
        status: res.status === 200 ? 200 : res.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (path === '/') {
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>Ludo Star</title>
         <body style="font-family:system-ui;background:#0f1226;color:#fff;display:grid;place-items:center;height:100vh;margin:0">
         <div style="text-align:center">
           <h1>🎲 Ludo Star</h1>
           <p>ربات فعال است.</p>
           <p><a style="color:#7cc4ff" href="https://t.me/${env.BOT_USERNAME}">@${env.BOT_USERNAME}</a></p>
         </div></body>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
