/** تعریف اجزای بازی: بازیکن، مهره، حرکت، وضعیت بازی */

export type ColorId = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';
export type GameMode = '2P' | '4P' | 'AI';
export type Visibility = 'PRIVATE' | 'PUBLIC' | 'QUICK';
export type RoomStatus = 'LOBBY' | 'PLAYING' | 'FINISHED' | 'ABORTED';
export type TurnPhase = 'ROLL' | 'MOVE' | 'RESOLVING' | 'ENDED';
export type PlayerStatus =
  | 'ONLINE'
  | 'IDLE'
  | 'DISCONNECTED'
  | 'BOT_CONTROLLED'
  | 'LEFT';
export type AILevel = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER';

/** یک مهره: i شمارهٔ مهره (۰ تا ۳) و p موقعیت آن */
export interface Token {
  i: number;
  p: number;
}

export interface TokenRef {
  seat: number;
  token: number;
}

export interface Player {
  id: string;
  tgId: number | null;
  name: string;
  username: string | null;
  photo: string | null;
  color: ColorId;
  seat: number;
  isAI: boolean;
  aiLevel: AILevel | null;
  status: PlayerStatus;
  lastSeen: number;
  leftAt: number | null;
  tokens: Token[];
  finished: number;
  rank: number | null;
  captures: number;
  lostTokens: number;
  missedTurns: number;
  consecutiveMissed: number;
  rating: number;
  ready: boolean;
}

export interface Move {
  token: number;
  from: number;
  to: number;
  captures: TokenRef[];
  finishes: boolean;
  extraTurn: boolean;
  entering: boolean;
}

export interface ChatMessage {
  id: string;
  seat: number;
  name: string;
  text: string;
  quick: boolean;
  at: number;
}

/** بدنهٔ رویداد؛ شمارهٔ ترتیب (n) هنگام ثبت اضافه می‌شود */
export type GameEventBody =
  | { t: 'DICE'; seat: number; value: number }
  | { t: 'MOVE'; seat: number; token: number; from: number; to: number }
  | { t: 'ENTER'; seat: number; token: number; to: number }
  | { t: 'CAPTURE'; seat: number; token: number; victimSeat: number; victimToken: number }
  | { t: 'HOME'; seat: number; token: number }
  | { t: 'NO_MOVES'; seat: number }
  | { t: 'THREE_SIXES'; seat: number }
  | { t: 'EXTRA_TURN'; seat: number }
  | { t: 'TURN'; seat: number }
  | { t: 'TIMEOUT'; seat: number; auto: 'ROLL' | 'MOVE' }
  | { t: 'RANK'; seat: number; rank: number }
  | { t: 'GAME_OVER'; winners: string[] }
  | { t: 'PLAYER_JOIN'; seat: number }
  | { t: 'PLAYER_STATUS'; seat: number; status: PlayerStatus }
  | { t: 'PLAYER_LEAVE'; seat: number }
  | { t: 'GAME_START' }
  | { t: 'CHAT'; msg: ChatMessage };

/** هر رویداد یک شمارهٔ ترتیب یکنواخت و صعودی دارد (n) */
export type GameEvent = GameEventBody & { n?: number };

export interface GameState {
  version: number;
  roomId: string;
  joinCode: string;
  mode: GameMode;
  visibility: Visibility;
  rulesId: string;
  status: RoomStatus;
  hostId: string;
  players: Player[];
  seatsTotal: number;
  turnSeat: number;
  phase: TurnPhase;
  dice: number | null;
  diceHistory: number[];
  consecutiveSixes: number;
  legalMoves: Move[];
  turnStartedAt: number;
  deadlineAt: number;
  turnCount: number;
  /** شمارندهٔ سراسری رویدادها — پایهٔ همگام‌سازی انیمیشن کلاینت */
  eventSeq: number;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  winners: string[];
  chat: ChatMessage[];
  events: GameEvent[];
}
