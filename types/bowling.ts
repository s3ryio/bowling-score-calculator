export type GameStatus = "in-progress" | "complete" | "perfect" | "new-best";

export type FrameKind = "strike" | "spare" | "open" | "incomplete";

export type GameMode = "classic";

export type SavedGameSource = "calculator" | "game3d";

export interface HandicapConfig {
  enabled: boolean;
  /** Score objetivo desde el que se calcula el handicap. Por defecto 200. */
  targetScore: number;
  /** Porcentaje del diferencial que se aplica como handicap. 0-100. */
  percentage: number;
}

export interface FrameScore {
  frameNumber: number;
  rolls: number[];
  symbols: string[];
  kind: FrameKind;
  frameScore: number | null;
  cumulativeScore: number | null;
  isComplete: boolean;
}

export interface GameScore {
  frames: FrameScore[];
  total: number;
  isComplete: boolean;
  currentFrameIndex: number;
  nextRollOptions: number[];
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface PlayerGame {
  id: string;
  name: string;
  rolls: number[];
}

export interface BowlingGame {
  id: string;
  players: PlayerGame[];
  activePlayerIndex: number;
  rollHistory: number[];
  createdAt: string;
  savedAt?: string;
  mode: GameMode;
  handicap: HandicapConfig;
  /** Handicap calculado por jugador al iniciar la partida (snapshot, no se recalcula). */
  playerHandicaps: Record<string, number>;
}

export interface SavedPlayerResult {
  id: string;
  name: string;
  rolls: number[];
  score: number;
  summary: string;
  strikes: number;
  spares: number;
  /** Handicap aplicado a este jugador en esta partida. */
  handicap?: number;
  /** Score final incluyendo handicap. */
  adjustedScore?: number;
}

export interface SavedGame {
  id: string;
  date: string;
  players: SavedPlayerResult[];
  winningScore: number;
  ownerId?: string;
  mode?: GameMode;
  source?: SavedGameSource;
}

export interface BowlingStats {
  gamesPlayed: number;
  bestScore: number;
  averageScore: number;
  totalStrikes: number;
  totalSpares: number;
  strikePercentage: number;
  sparePercentage: number;
  recentGames: SavedGame[];
}

export interface TournamentFixture {
  id: string;
  playerA: string;
  playerB: string;
  scoreA: number | null;
  scoreB: number | null;
  completedAt: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  createdAt: string;
  mode: GameMode;
  players: string[];
  fixtures: TournamentFixture[];
  ownerId?: string;
}

export interface TournamentStanding {
  player: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  scoreDiff: number;
  averageScore: number;
}
