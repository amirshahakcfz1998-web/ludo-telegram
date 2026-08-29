/** Hub: انبار مرکزی داده‌ها — کاربران، آمار، امتیاز، تاریخچه، دستاوردها و صف بازی سریع */
import { DurableObject } from 'cloudflare:workers';
import { computeElo, levelFromXp, tierOf, type EloInput } from '../utils/helpers';
import { getRules } from '../config/rules';

export interface UserRow {
  tg_id: number;
  name: string;
  username: string | null;
  photo: string | null;
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
  streak: number;
  best_streak: number;
  last_room: string | null;
  created_at: number;
  updated_at: number;
}

export interface MatchPlayerInput {
  tgId: number | null;
  name: string;
  isAI: boolean;
  aiLevel: string | null;
  seat: number;
  rank: number;
  captures: number;
  lostTokens: number;
  finished: number;
}

export interface MatchInput {
  roomId: string;
  mode: string;
  rulesId: string;
  startedAt: number;
  finishedAt: number;
  players: MatchPlayerInput[];
}

export interface PlayerOutcome {
  tgId: number;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  xpGained: number;
  coinsGained: number;
  level: number;
  leveledUp: boolean;
  newAchievements: string[];
  won: boolean;
}

export interface AchievementDef {
  key: string;
  fa: string;
  en: string;
  icon: string;
  check: (u: UserRow) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_game', fa: 'اولین بازی', en: 'First Game', icon: '🎲', check: (u) => u.games >= 1 },
  { key: 'first_win', fa: 'اولین برد', en: 'First Win', icon: '🥇', check: (u) => u.wins >= 1 },
  { key: 'win_10', fa: 'ده برد', en: '10 Wins', icon: '🏅', check: (u) => u.wins >= 10 },
  { key: 'win_50', fa: 'پنجاه برد', en: '50 Wins', icon: '🏆', check: (u) => u.wins >= 50 },
  { key: 'hunter_50', fa: 'شکارچی', en: 'Hunter', icon: '⚔️', check: (u) => u.captures >= 50 },
  { key: 'hunter_250', fa: 'شکارچی افسانه‌ای', en: 'Legendary Hunter', icon: '🗡', check: (u) => u.captures >= 250 },
  { key: 'streak_5', fa: 'پنج برد پیاپی', en: '5 Win Streak', icon: '🔥', check: (u) => u.best_streak >= 5 },
  { key: 'bot_slayer', fa: 'ربات‌کش', en: 'Bot Slayer', icon: '🤖', check: (u) => u.ai_wins >= 20 },
  { key: 'level_10', fa: 'سطح ۱۰', en: 'Level 10', icon: '🎚', check: (u) => levelFromXp(u.xp).level >= 10 },
  { key: 'rating_1500', fa: 'امتیاز ۱۵۰۰', en: 'Rating 1500', icon: '💎', check: (u) => u.best_rating >= 1500 },
  { key: 'rating_1800', fa: 'استاد بزرگ', en: 'Grandmaster', icon: '👑', check: (u) => u.best_rating >= 1800 },
];

const QUEUE_TTL_MS = 120000;

export class Hub extends DurableObject {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => this.init());
  }

  private init(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        tg_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        username TEXT,
        photo TEXT,
        lang TEXT NOT NULL DEFAULT 'fa',
        sound INTEGER NOT NULL DEFAULT 1,
        chat INTEGER NOT NULL DEFAULT 1,
        theme TEXT NOT NULL DEFAULT 'dark',
        rating INTEGER NOT NULL DEFAULT 1200,
        best_rating INTEGER NOT NULL DEFAULT 1200,
        xp INTEGER NOT NULL DEFAULT 0,
        coins INTEGER NOT NULL DEFAULT 100,
        games INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        captures INTEGER NOT NULL DEFAULT 0,
        lost_tokens INTEGER NOT NULL DEFAULT 0,
        tokens_home INTEGER NOT NULL DEFAULT 0,
        ai_wins INTEGER NOT NULL DEFAULT 0,
        playtime_ms INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        best_streak INTEGER NOT NULL DEFAULT 0,
        last_room TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);`);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        rules_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        player_count INTEGER NOT NULL
      );
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS match_players (
        match_id INTEGER NOT NULL,
        tg_id INTEGER,
        name TEXT NOT NULL,
        is_ai INTEGER NOT NULL DEFAULT 0,
        ai_level TEXT,
        seat INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        captures INTEGER NOT NULL DEFAULT 0,
        lost_tokens INTEGER NOT NULL DEFAULT 0,
        finished INTEGER NOT NULL DEFAULT 0,
        rating_before INTEGER NOT NULL DEFAULT 0,
        rating_after INTEGER NOT NULL DEFAULT 0,
        xp_gained INTEGER NOT NULL DEFAULT 0,
        coins_gained INTEGER NOT NULL DEFAULT 0
      );
    `);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_mp_user ON match_players(tg_id);`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_mp_match ON match_players(match_id);`);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        tg_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL,
        PRIMARY KEY (tg_id, key)
      );
    `);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        join_code TEXT NOT NULL,
        mode TEXT NOT NULL,
        visibility TEXT NOT NULL,
        rules_id TEXT NOT NULL,
        host_id TEXT NOT NULL,
        players INTEGER NOT NULL DEFAULT 0,
        seats INTEGER NOT NULL DEFAULT 4,
        status TEXT NOT NULL DEFAULT 'LOBBY',
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(join_code);`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_rooms_pub ON rooms(visibility, status);`);

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS queue (
        tg_id INTEGER PRIMARY KEY,
        rating INTEGER NOT NULL,
        mode TEXT NOT NULL,
        rules_id TEXT NOT NULL,
        chat_id INTEGER NOT NULL,
        message_id INTEGER,
        joined_at INTEGER NOT NULL
      );
    `);
  }

  /* ---------------------------------------------------------------- */
  /* کاربران                                                           */
  /* ---------------------------------------------------------------- */

  getUser(tgId: number): UserRow | null {
    const rows = this.sql.exec<UserRow>('SELECT * FROM users WHERE tg_id = ?', tgId).toArray();
    return rows.length ? rows[0] : null;
  }

  ensureUser(input: {
    tgId: number;
    name: string;
    username?: string | null;
    photo?: string | null;
    lang?: string;
  }): UserRow {
    const now = Date.now();
    const existing = this.getUser(input.tgId);
    if (existing) {
      this.sql.exec(
        'UPDATE users SET name = ?, username = ?, photo = COALESCE(?, photo), updated_at = ? WHERE tg_id = ?',
        input.name,
        input.username ?? null,
        input.photo ?? null,
        now,
        input.tgId,
      );
      return this.getUser(input.tgId) as UserRow;
    }
    this.sql.exec(
      `INSERT INTO users (tg_id, name, username, photo, lang, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.tgId,
      input.name,
      input.username ?? null,
      input.photo ?? null,
      input.lang ?? 'fa',
      now,
      now,
    );
    for (const a of ACHIEVEMENTS) {
      // هیچ دستاوردی در ابتدا باز نمی‌شود
      void a;
    }
    return this.getUser(input.tgId) as UserRow;
  }

  updateSettings(tgId: number, patch: Partial<Pick<UserRow, 'lang' | 'sound' | 'chat' | 'theme'>>): UserRow | null {
    const u = this.getUser(tgId);
    if (!u) return null;
    this.sql.exec(
      'UPDATE users SET lang = ?, sound = ?, chat = ?, theme = ?, updated_at = ? WHERE tg_id = ?',
      patch.lang ?? u.lang,
      patch.sound ?? u.sound,
      patch.chat ?? u.chat,
      patch.theme ?? u.theme,
      Date.now(),
      tgId,
    );
    return this.getUser(tgId);
  }

  setLastRoom(tgId: number, roomId: string | null): void {
    this.sql.exec('UPDATE users SET last_room = ?, updated_at = ? WHERE tg_id = ?', roomId, Date.now(), tgId);
  }

  profileOf(tgId: number): Record<string, unknown> | null {
    const u = this.getUser(tgId);
    if (!u) return null;
    const lvl = levelFromXp(u.xp);
    const tier = tierOf(u.rating);
    const ach = this.sql
      .exec<{ key: string }>('SELECT key FROM user_achievements WHERE tg_id = ?', tgId)
      .toArray()
      .map((r) => r.key);
    const rankRow = this.sql
      .exec<{ c: number }>('SELECT COUNT(*) AS c FROM users WHERE rating > ?', u.rating)
      .one();
    return {
      ...u,
      level: lvl.level,
      xpInLevel: lvl.xpInLevel,
      xpNeeded: lvl.xpNeeded,
      tier: tier.key,
      tierIcon: tier.icon,
      achievements: ach,
      globalRank: (rankRow?.c ?? 0) + 1,
    };
  }

  /* ---------------------------------------------------------------- */
  /* جدول برترین‌ها و تاریخچه                                          */
  /* ---------------------------------------------------------------- */

  leaderboard(page: number, pageSize = 10): { rows: UserRow[]; hasNext: boolean; total: number } {
    const offset = Math.max(0, (page - 1) * pageSize);
    const rows = this.sql
      .exec<UserRow>(
        'SELECT * FROM users WHERE games > 0 ORDER BY rating DESC, wins DESC LIMIT ? OFFSET ?',
        pageSize + 1,
        offset,
      )
      .toArray();
    const total = this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM users WHERE games > 0').one().c;
    const hasNext = rows.length > pageSize;
    return { rows: rows.slice(0, pageSize), hasNext, total };
  }

  history(tgId: number, limit = 10): Record<string, unknown>[] {
    return this.sql
      .exec(
        `SELECT m.id, m.mode, m.rules_id, m.finished_at, m.duration_ms, m.player_count,
                p.rank, p.captures, p.rating_before, p.rating_after, p.xp_gained
         FROM match_players p JOIN matches m ON m.id = p.match_id
         WHERE p.tg_id = ? ORDER BY m.finished_at DESC LIMIT ?`,
        tgId,
        limit,
      )
      .toArray() as unknown as Record<string, unknown>[];
  }

  /* ---------------------------------------------------------------- */
  /* ثبت نتیجهٔ بازی                                                   */
  /* ---------------------------------------------------------------- */

  recordMatch(input: MatchInput): PlayerOutcome[] {
    const rules = getRules(input.rulesId);
    const now = Date.now();
    const duration = Math.max(0, input.finishedAt - input.startedAt);

    this.sql.exec(
      `INSERT INTO matches (room_id, mode, rules_id, started_at, finished_at, duration_ms, player_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.roomId,
      input.mode,
      input.rulesId,
      input.startedAt,
      input.finishedAt,
      duration,
      input.players.length,
    );
    const matchId = this.sql.exec<{ id: number }>('SELECT last_insert_rowid() AS id').one().id;

    const humans = input.players.filter((p) => !p.isAI && p.tgId !== null);
    const beatAI = input.players.some((p) => p.isAI);

    // امتیاز ELO فقط وقتی حداقل دو انسان بازی کرده باشند
    const eloInputs: EloInput[] = humans.map((p) => {
      const u = this.getUser(p.tgId as number);
      return { id: String(p.tgId), rating: u?.rating ?? rules.elo.base, rank: p.rank };
    });
    const eloOut =
      eloInputs.length >= 2 ? computeElo(eloInputs, rules.elo.kFactor, rules.elo.min) : {};

    const outcomes: PlayerOutcome[] = [];

    for (const p of input.players) {
      if (p.isAI || p.tgId === null) {
        this.sql.exec(
          `INSERT INTO match_players (match_id, tg_id, name, is_ai, ai_level, seat, rank, captures, lost_tokens, finished)
           VALUES (?, NULL, ?, 1, ?, ?, ?, ?, ?, ?)`,
          matchId,
          p.name,
          p.aiLevel,
          p.seat,
          p.rank,
          p.captures,
          p.lostTokens,
          p.finished,
        );
        continue;
      }

      const tgId = p.tgId;
      const u = this.ensureUser({ tgId, name: p.name });
      const won = p.rank === 1;

      const elo = eloOut[String(tgId)] ?? { before: u.rating, after: u.rating, delta: 0 };
      const xpGained =
        (won ? rules.rewards.xpWin : rules.rewards.xpLoss) +
        p.captures * rules.rewards.xpPerCapture +
        p.finished * rules.rewards.xpPerTokenHome;
      const coinsGained = won ? rules.rewards.coinsWin : rules.rewards.coinsLoss;

      const beforeLevel = levelFromXp(u.xp).level;
      const newXp = u.xp + xpGained;
      const afterLevel = levelFromXp(newXp).level;
      const newStreak = won ? u.streak + 1 : 0;

      this.sql.exec(
        `UPDATE users SET
           rating = ?, best_rating = MAX(best_rating, ?), xp = ?, coins = coins + ?,
           games = games + 1, wins = wins + ?, losses = losses + ?,
           captures = captures + ?, lost_tokens = lost_tokens + ?, tokens_home = tokens_home + ?,
           ai_wins = ai_wins + ?, playtime_ms = playtime_ms + ?,
           streak = ?, best_streak = MAX(best_streak, ?), updated_at = ?
         WHERE tg_id = ?`,
        elo.after,
        elo.after,
        newXp,
        coinsGained,
        won ? 1 : 0,
        won ? 0 : 1,
        p.captures,
        p.lostTokens,
        p.finished,
        won && beatAI ? 1 : 0,
        duration,
        newStreak,
        newStreak,
        now,
        tgId,
      );

      this.sql.exec(
        `INSERT INTO match_players (match_id, tg_id, name, is_ai, ai_level, seat, rank, captures,
                                    lost_tokens, finished, rating_before, rating_after, xp_gained, coins_gained)
         VALUES (?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        matchId,
        tgId,
        p.name,
        p.seat,
        p.rank,
        p.captures,
        p.lostTokens,
        p.finished,
        elo.before,
        elo.after,
        xpGained,
        coinsGained,
      );

      const unlocked = this.checkAchievements(tgId);

      outcomes.push({
        tgId,
        ratingBefore: elo.before,
        ratingAfter: elo.after,
        ratingDelta: elo.delta,
        xpGained,
        coinsGained,
        level: afterLevel,
        leveledUp: afterLevel > beforeLevel,
        newAchievements: unlocked,
        won,
      });
    }

    this.pruneMatches();
    return outcomes;
  }

  private checkAchievements(tgId: number): string[] {
    const u = this.getUser(tgId);
    if (!u) return [];
    const owned = new Set(
      this.sql
        .exec<{ key: string }>('SELECT key FROM user_achievements WHERE tg_id = ?', tgId)
        .toArray()
        .map((r) => r.key),
    );
    const now = Date.now();
    const fresh: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (owned.has(a.key)) continue;
      if (a.check(u)) {
        this.sql.exec(
          'INSERT OR IGNORE INTO user_achievements (tg_id, key, unlocked_at) VALUES (?, ?, ?)',
          tgId,
          a.key,
          now,
        );
        fresh.push(a.key);
      }
    }
    return fresh;
  }

  /** نگه‌داشتن حجم داده در حد معقول */
  private pruneMatches(): void {
    const row = this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM matches').one();
    if (row.c <= 20000) return;
    this.sql.exec(
      `DELETE FROM match_players WHERE match_id IN
        (SELECT id FROM matches ORDER BY finished_at ASC LIMIT 2000)`,
    );
    this.sql.exec(`DELETE FROM matches WHERE id IN (SELECT id FROM matches ORDER BY finished_at ASC LIMIT 2000)`);
  }

  /* ---------------------------------------------------------------- */
  /* فهرست اتاق‌ها                                                     */
  /* ---------------------------------------------------------------- */

  registerRoom(r: {
    roomId: string;
    joinCode: string;
    mode: string;
    visibility: string;
    rulesId: string;
    hostId: string;
    seats: number;
    ttlMs: number;
  }): void {
    const now = Date.now();
    this.sql.exec(
      `INSERT OR REPLACE INTO rooms (room_id, join_code, mode, visibility, rules_id, host_id, players, seats, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'LOBBY', ?, ?)`,
      r.roomId,
      r.joinCode,
      r.mode,
      r.visibility,
      r.rulesId,
      r.hostId,
      r.seats,
      now,
      now + r.ttlMs,
    );
    this.cleanupRooms(now);
  }

  updateRoom(roomId: string, players: number, status: string): void {
    this.sql.exec('UPDATE rooms SET players = ?, status = ? WHERE room_id = ?', players, status, roomId);
  }

  removeRoom(roomId: string): void {
    this.sql.exec('DELETE FROM rooms WHERE room_id = ?', roomId);
  }

  roomByCode(code: string): Record<string, unknown> | null {
    const rows = this.sql
      .exec('SELECT * FROM rooms WHERE join_code = ? AND expires_at > ? LIMIT 1', code.toUpperCase(), Date.now())
      .toArray();
    return rows.length ? (rows[0] as unknown as Record<string, unknown>) : null;
  }

  publicRooms(limit = 10): Record<string, unknown>[] {
    return this.sql
      .exec(
        `SELECT * FROM rooms WHERE visibility = 'PUBLIC' AND status = 'LOBBY' AND expires_at > ?
         AND players < seats ORDER BY created_at DESC LIMIT ?`,
        Date.now(),
        limit,
      )
      .toArray() as unknown as Record<string, unknown>[];
  }

  private cleanupRooms(now: number): void {
    this.sql.exec('DELETE FROM rooms WHERE expires_at < ?', now);
  }

  /* ---------------------------------------------------------------- */
  /* صف بازی سریع                                                      */
  /* ---------------------------------------------------------------- */

  joinQueue(entry: {
    tgId: number;
    rating: number;
    mode: string;
    rulesId: string;
    chatId: number;
    messageId: number | null;
  }): { matched: boolean; opponents: { tgId: number; chatId: number; messageId: number | null }[] } {
    const now = Date.now();
    this.sql.exec('DELETE FROM queue WHERE joined_at < ?', now - QUEUE_TTL_MS);

    const need = entry.mode === '4P' ? 3 : 1;
    const candidates = this.sql
      .exec<{ tg_id: number; chat_id: number; message_id: number | null; rating: number }>(
        `SELECT tg_id, chat_id, message_id, rating FROM queue
         WHERE mode = ? AND rules_id = ? AND tg_id != ?
         ORDER BY ABS(rating - ?) ASC, joined_at ASC LIMIT ?`,
        entry.mode,
        entry.rulesId,
        entry.tgId,
        entry.rating,
        need,
      )
      .toArray();

    if (candidates.length >= need) {
      for (const c of candidates) this.sql.exec('DELETE FROM queue WHERE tg_id = ?', c.tg_id);
      this.sql.exec('DELETE FROM queue WHERE tg_id = ?', entry.tgId);
      return {
        matched: true,
        opponents: candidates.map((c) => ({ tgId: c.tg_id, chatId: c.chat_id, messageId: c.message_id })),
      };
    }

    this.sql.exec(
      `INSERT OR REPLACE INTO queue (tg_id, rating, mode, rules_id, chat_id, message_id, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      entry.tgId,
      entry.rating,
      entry.mode,
      entry.rulesId,
      entry.chatId,
      entry.messageId,
      now,
    );
    return { matched: false, opponents: [] };
  }

  leaveQueue(tgId: number): void {
    this.sql.exec('DELETE FROM queue WHERE tg_id = ?', tgId);
  }

  queueSize(): number {
    return this.sql.exec<{ c: number }>('SELECT COUNT(*) AS c FROM queue').one().c;
  }
}
