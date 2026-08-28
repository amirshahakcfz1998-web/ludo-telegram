/**
 * تمام قوانین بازی منچ در همین یک فایل است.
 * با تغییر عددهای اینجا می‌توانی رفتار بازی را عوض کنی.
 */

export interface TimingRules {
  rollTimeoutMs: number;
  moveTimeoutMs: number;
  missedTurnsToBotControl: number;
  aiThinkMinMs: number;
  aiThinkMaxMs: number;
  lobbyTimeoutMs: number;
  roomTtlMs: number;
  idleAfterMs: number;
  disconnectedAfterMs: number;
  leaveGraceMs: number;
}

export interface BlockRules {
  enabled: boolean;
  canBePassed: boolean;
  activeOnSafeCells: boolean;
}

export interface GameRules {
  id: string;
  title: { fa: string; en: string };
  diceSides: number;
  entryRolls: number[];
  extraTurnRolls: number[];
  extraTurnOnCapture: boolean;
  extraTurnOnFinish: boolean;
  maxConsecutiveSixes: number;
  exactRollToFinish: boolean;
  captureOnSafeCell: boolean;
  stackLimitOnSafe: number;
  mustEnterIfPossible: boolean;
  autoMoveOnSingleOption: boolean;
  tokensPerPlayer: number;
  playUntilLastPlayer: boolean;
  blocks: BlockRules;
  timing: TimingRules;
  elo: { kFactor: number; base: number; min: number };
  rewards: {
    xpWin: number;
    xpLoss: number;
    xpPerCapture: number;
    xpPerTokenHome: number;
    coinsWin: number;
    coinsLoss: number;
  };
}

const DEFAULT_TIMING: TimingRules = {
  rollTimeoutMs: 15000,
  moveTimeoutMs: 10000,
  missedTurnsToBotControl: 2,
  aiThinkMinMs: 700,
  aiThinkMaxMs: 1600,
  lobbyTimeoutMs: 600000,
  roomTtlMs: 1800000,
  idleAfterMs: 20000,
  disconnectedAfterMs: 45000,
  leaveGraceMs: 60000,
};

/** قوانین کلاسیک - پیش‌فرض بازی */
export const CLASSIC_RULES: GameRules = {
  id: 'classic',
  title: { fa: 'کلاسیک', en: 'Classic' },
  diceSides: 6,
  entryRolls: [6],
  extraTurnRolls: [6],
  extraTurnOnCapture: true,
  extraTurnOnFinish: true,
  maxConsecutiveSixes: 3,
  exactRollToFinish: true,
  captureOnSafeCell: false,
  stackLimitOnSafe: 0,
  mustEnterIfPossible: false,
  autoMoveOnSingleOption: true,
  tokensPerPlayer: 4,
  playUntilLastPlayer: true,
  blocks: { enabled: true, canBePassed: false, activeOnSafeCells: true },
  timing: DEFAULT_TIMING,
  elo: { kFactor: 32, base: 1200, min: 100 },
  rewards: {
    xpWin: 120,
    xpLoss: 35,
    xpPerCapture: 12,
    xpPerTokenHome: 20,
    coinsWin: 150,
    coinsLoss: 25,
  },
};

/** حالت سریع - ورود با ۱ یا ۶ و بدون سد */
export const QUICK_RULES: GameRules = {
  ...CLASSIC_RULES,
  id: 'quick',
  title: { fa: 'سریع', en: 'Quick' },
  entryRolls: [1, 6],
  exactRollToFinish: false,
  blocks: { enabled: false, canBePassed: true, activeOnSafeCells: false },
  timing: { ...DEFAULT_TIMING, rollTimeoutMs: 10000, moveTimeoutMs: 7000 },
};

/** منچ سنتی ایرانی */
export const MANCH_RULES: GameRules = {
  ...CLASSIC_RULES,
  id: 'manch',
  title: { fa: 'منچ سنتی', en: 'Traditional Manch' },
  captureOnSafeCell: true,
  extraTurnOnFinish: false,
  blocks: { enabled: false, canBePassed: true, activeOnSafeCells: false },
};

export const RULE_SETS: Record<string, GameRules> = {
  classic: CLASSIC_RULES,
  quick: QUICK_RULES,
  manch: MANCH_RULES,
};

export function getRules(id: string | undefined | null): GameRules {
  return RULE_SETS[id ?? 'classic'] ?? CLASSIC_RULES;
}

export const MODE_SEATS: Record<string, number> = { '2P': 2, '4P': 4, AI: 2 };

export const SEAT_COLORS: Record<number, ('RED' | 'GREEN' | 'YELLOW' | 'BLUE')[]> = {
  2: ['RED', 'YELLOW'],
  3: ['RED', 'GREEN', 'YELLOW'],
  4: ['RED', 'GREEN', 'YELLOW', 'BLUE'],
};
