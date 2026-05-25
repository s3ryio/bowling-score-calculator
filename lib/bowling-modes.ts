import type { GameMode, HandicapConfig, SavedGame } from "@/types/bowling";

export interface GameModeDefinition {
  id: GameMode;
  title: string;
  shortLabel: string;
  description: string;
  rules: string[];
  winnerOrder: "highest" | "lowest";
}

export const GAME_MODES: GameModeDefinition[] = [
  {
    id: "classic",
    title: "Clásico",
    shortLabel: "Clásico",
    description: "Reglas oficiales 10-pin.",
    rules: [
      "Strike: 10 bolos en primera tirada.",
      "Spare: 10 bolos en dos tiradas del mismo frame.",
      "Gana la puntuación más alta.",
    ],
    winnerOrder: "highest",
  },
];

const DEFAULT_MODE_ID: GameMode = "classic";

export const DEFAULT_HANDICAP: HandicapConfig = {
  enabled: false,
  targetScore: 200,
  percentage: 80,
};

export function getGameMode(id: GameMode | undefined): GameModeDefinition {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0];
}

export function isValidGameMode(value: unknown): value is GameMode {
  return typeof value === "string" && GAME_MODES.some((mode) => mode.id === value);
}

export function normalizeMode(value: unknown): GameMode {
  return isValidGameMode(value) ? value : DEFAULT_MODE_ID;
}

export function normalizeHandicap(value: unknown): HandicapConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_HANDICAP };
  }
  const raw = value as Record<string, unknown>;
  return {
    enabled: raw.enabled === true,
    targetScore:
      typeof raw.targetScore === "number" && Number.isFinite(raw.targetScore)
        ? Math.min(300, Math.max(50, Math.round(raw.targetScore)))
        : DEFAULT_HANDICAP.targetScore,
    percentage:
      typeof raw.percentage === "number" && Number.isFinite(raw.percentage)
        ? Math.min(100, Math.max(0, Math.round(raw.percentage)))
        : DEFAULT_HANDICAP.percentage,
  };
}

export function normalizeHandicapMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === "number" && Number.isFinite(val)) {
      result[key] = Math.max(0, Math.round(val));
    }
  }
  return result;
}

export function getWinnerOrder(mode: GameMode): "highest" | "lowest" {
  return getGameMode(mode).winnerOrder;
}

/**
 * Ordena un set de jugadores con score numérico de mejor a peor según el modo.
 */
export function rankByMode<T extends { score: number }>(entries: T[], mode: GameMode): T[] {
  const order = getWinnerOrder(mode);
  return [...entries].sort((a, b) => (order === "highest" ? b.score - a.score : a.score - b.score));
}

/**
 * Calcula el handicap automático de un jugador a partir de su historial.
 * Fórmula: max(0, (targetScore - media) × percentage / 100). Redondeado.
 * Devuelve 0 si el handicap está deshabilitado o no hay datos suficientes.
 */
export function calculateAutoHandicap(
  playerName: string,
  history: SavedGame[],
  config: HandicapConfig,
): number {
  if (!config.enabled || !playerName) {
    return 0;
  }

  const scores = history
    .flatMap((game) => game.players)
    .filter((player) => player.name === playerName)
    .map((player) => player.score);

  if (scores.length === 0) {
    return 0;
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const diff = config.targetScore - average;
  if (diff <= 0) {
    return 0;
  }

  return Math.round(diff * (config.percentage / 100));
}
