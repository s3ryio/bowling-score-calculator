import {
  addRoll,
  calculateGameScore,
  countMarks,
  isGameComplete,
  summarizeRolls,
} from "@/lib/bowling-score";
import {
  DEFAULT_HANDICAP,
  normalizeHandicap,
  normalizeHandicapMap,
  normalizeMode,
} from "@/lib/bowling-modes";
import type {
  BowlingGame,
  GameMode,
  GameStatus,
  HandicapConfig,
  PlayerGame,
  SavedGame,
  SavedPlayerResult,
} from "@/types/bowling";

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 1;

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clampPlayerCount(count: number): number {
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));
}

export function createPlayers(count: number): PlayerGame[] {
  return Array.from({ length: clampPlayerCount(count) }, (_, index) => ({
    id: createId("player"),
    name: `Jugador ${index + 1}`,
    rolls: [],
  }));
}

export interface CreateGameOptions {
  mode?: GameMode;
  handicap?: HandicapConfig;
  playerHandicaps?: Record<string, number>;
}

export function createGame(playerCount = 1, options: CreateGameOptions = {}): BowlingGame {
  return {
    id: createId("game"),
    players: createPlayers(playerCount),
    activePlayerIndex: 0,
    rollHistory: [],
    createdAt: new Date().toISOString(),
    mode: normalizeMode(options.mode),
    handicap: normalizeHandicap(options.handicap ?? DEFAULT_HANDICAP),
    playerHandicaps: normalizeHandicapMap(options.playerHandicaps ?? {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeStoredRolls(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  let rolls: number[] = [];

  for (const roll of value) {
    if (!Number.isInteger(roll) || roll < 0 || roll > 10) {
      break;
    }

    try {
      rolls = addRoll(rolls, roll);
    } catch {
      break;
    }
  }

  return rolls;
}

function rebuildRollHistory(players: PlayerGame[]): number[] {
  return players.flatMap((player, index) => player.rolls.map(() => index));
}

function sanitizeStoredRollHistory(value: unknown, players: PlayerGame[]): number[] {
  if (!Array.isArray(value)) {
    return rebuildRollHistory(players);
  }

  return value.filter(
    (playerIndex): playerIndex is number =>
      Number.isInteger(playerIndex) && playerIndex >= 0 && playerIndex < players.length,
  );
}

export function restoreStoredGame(value: unknown): BowlingGame {
  if (!isRecord(value) || !Array.isArray(value.players) || value.players.length === 0) {
    return createGame(1);
  }

  const playerCount = clampPlayerCount(value.players.length);
  const players = value.players.slice(0, playerCount).map((playerValue, index) => {
    const player = isRecord(playerValue) ? playerValue : {};
    const name = typeof player.name === "string" ? player.name.trim() : "";

    return {
      id: typeof player.id === "string" && player.id ? player.id : createId("player"),
      name: name || `Jugador ${index + 1}`,
      rolls: sanitizeStoredRolls(player.rolls),
    };
  });

  const rawActivePlayerIndex =
    typeof value.activePlayerIndex === "number" && Number.isInteger(value.activePlayerIndex)
      ? value.activePlayerIndex
      : 0;
  const activePlayerIndex = Math.min(Math.max(rawActivePlayerIndex, 0), players.length - 1);

  return {
    id: typeof value.id === "string" && value.id ? value.id : createId("game"),
    players,
    activePlayerIndex,
    rollHistory: sanitizeStoredRollHistory(value.rollHistory, players),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    savedAt: typeof value.savedAt === "string" ? value.savedAt : undefined,
    mode: normalizeMode(value.mode),
    handicap: normalizeHandicap(value.handicap),
    playerHandicaps: normalizeHandicapMap(value.playerHandicaps),
  };
}

export function restartGameWithPlayers(game: BowlingGame): BowlingGame {
  return {
    id: createId("game"),
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      rolls: [],
    })),
    activePlayerIndex: 0,
    rollHistory: [],
    createdAt: new Date().toISOString(),
    mode: game.mode,
    handicap: game.handicap,
    playerHandicaps: game.playerHandicaps,
  };
}

export function hasStarted(game: BowlingGame): boolean {
  return game.players.some((player) => player.rolls.length > 0);
}

export function isGameFinished(game: BowlingGame): boolean {
  return game.players.every((player) => isGameComplete(player.rolls));
}

export function getWinningScore(game: BowlingGame): number {
  const ranking = rankPlayers(game.players, game.mode, game.playerHandicaps);
  return ranking[0]?.adjustedScore ?? ranking[0]?.score ?? 0;
}

export function getGameStatus(game: BowlingGame, bestScore: number): GameStatus {
  if (!isGameFinished(game)) {
    return "in-progress";
  }

  const winningScore = getWinningScore(game);

  // "Perfect" se evalúa con el score bruto oficial, sin handicap.
  const rawWinningScore = Math.max(...game.players.map((player) => calculateGameScore(player.rolls).total));
  if (rawWinningScore === 300) {
    return "perfect";
  }

  if (winningScore > bestScore) {
    return "new-best";
  }

  return "complete";
}

export function findNextActivePlayer(players: PlayerGame[], currentIndex: number): number {
  if (players.every((player) => isGameComplete(player.rolls))) {
    return currentIndex;
  }

  for (let offset = 1; offset <= players.length; offset += 1) {
    const nextIndex = (currentIndex + offset) % players.length;
    if (!isGameComplete(players[nextIndex].rolls)) {
      return nextIndex;
    }
  }

  return currentIndex;
}

export function findPlayerToUndo(game: BowlingGame): number | null {
  const playerIndex = game.rollHistory.at(-1);

  if (playerIndex === undefined || game.players[playerIndex]?.rolls.length === 0) {
    return null;
  }

  return playerIndex;
}

export function renamePlayer(game: BowlingGame, playerId: string, name: string): BowlingGame {
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            name: name.trim(),
          }
        : player,
    ),
  };
}

export function syncPrimaryPlayerName(game: BowlingGame, accountName: string | null | undefined): BowlingGame {
  const cleanName = accountName?.trim();
  const firstPlayer = game.players[0];

  if (!cleanName || !firstPlayer || firstPlayer.name === cleanName) {
    return game;
  }

  return {
    ...game,
    players: game.players.map((player, index) =>
      index === 0 ? { ...player, name: cleanName } : player,
    ),
  };
}

export function rankPlayers(
  players: PlayerGame[],
  mode: GameMode = "classic",
  playerHandicaps: Record<string, number> = {},
): SavedPlayerResult[] {
  void mode;
  const results: SavedPlayerResult[] = players.map((player, index) => {
    const score = calculateGameScore(player.rolls);
    const marks = countMarks(player.rolls);
    const handicap = playerHandicaps[player.id] ?? playerHandicaps[player.name] ?? 0;
    const adjustedScore = score.total + handicap;
    const name = player.name.trim() || `Jugador ${index + 1}`;

    return {
      id: player.id,
      name,
      rolls: player.rolls,
      score: score.total,
      summary: summarizeRolls(player.rolls),
      strikes: marks.strikes,
      spares: marks.spares,
      handicap,
      adjustedScore,
    };
  });

  // Ranking oficial clásico: gana la puntuación más alta.
  return [...results].sort((a, b) => {
    const aValue = a.adjustedScore ?? a.score;
    const bValue = b.adjustedScore ?? b.score;
    return bValue - aValue;
  });
}

export function createSavedGame(game: BowlingGame): SavedGame {
  const players = rankPlayers(game.players, game.mode, game.playerHandicaps);
  const winner = players[0];
  const winningScore = winner ? winner.adjustedScore ?? winner.score : 0;

  return {
    id: createId("saved"),
    date: new Date().toISOString(),
    players,
    winningScore,
    mode: game.mode,
  };
}
