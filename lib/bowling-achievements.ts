import type { SavedGame, SavedPlayerResult } from "@/types/bowling";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  /** Nombre de icono de lucide-react. Se resuelve en el componente para no acoplar la lib. */
  iconName: string;
  tier: AchievementTier;
  /** Si es true, el achievement se calcula contando partidas guardadas (no por jugador). */
  global?: boolean;
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  unlocked: boolean;
  /** ISO de la partida que desbloqueó el logro. */
  unlockedAt?: string;
  /** Nombre del jugador que lo desbloqueó (cuando aplica). */
  unlockedBy?: string;
  /** Para logros con avance medible (10 partidas, media, etc.). */
  progress?: { current: number; target: number };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "first-game",
    title: "Primera partida",
    description: "Guarda tu primera partida en el historial.",
    iconName: "Sparkles",
    tier: "bronze",
    global: true,
  },
  {
    id: "first-strike",
    title: "Primer strike",
    description: "Registra tu primer strike.",
    iconName: "Zap",
    tier: "bronze",
  },
  {
    id: "first-spare",
    title: "Primer spare",
    description: "Cierra un frame con spare.",
    iconName: "CircleDot",
    tier: "bronze",
  },
  {
    id: "score-150",
    title: "150 club",
    description: "Termina una partida con 150 o más puntos.",
    iconName: "Trophy",
    tier: "silver",
  },
  {
    id: "score-200",
    title: "200 club",
    description: "Termina una partida con 200 o más puntos.",
    iconName: "Trophy",
    tier: "silver",
  },
  {
    id: "score-250",
    title: "250 club",
    description: "Termina una partida con 250 o más puntos.",
    iconName: "Crown",
    tier: "gold",
  },
  {
    id: "score-300",
    title: "Partida perfecta",
    description: "Anota una partida perfecta de 300 puntos.",
    iconName: "Award",
    tier: "platinum",
  },
  {
    id: "turkey",
    title: "Turkey",
    description: "Encadena 3 strikes consecutivos en una misma partida.",
    iconName: "Flame",
    tier: "silver",
  },
  {
    id: "four-bagger",
    title: "Four-bagger",
    description: "Encadena 4 strikes consecutivos en una misma partida.",
    iconName: "Flame",
    tier: "gold",
  },
  {
    id: "five-bagger",
    title: "Five-bagger",
    description: "Encadena 5 strikes consecutivos en una misma partida.",
    iconName: "Flame",
    tier: "platinum",
  },
  {
    id: "all-marks",
    title: "Sin huecos",
    description: "Cierra una partida sin ningún frame abierto: todo strikes o spares.",
    iconName: "ShieldCheck",
    tier: "gold",
  },
  {
    id: "five-strikes",
    title: "Cinco strikes",
    description: "Anota 5 o más strikes en una misma partida.",
    iconName: "Zap",
    tier: "silver",
  },
  {
    id: "five-spares",
    title: "Cinco spares",
    description: "Anota 5 o más spares en una misma partida.",
    iconName: "CircleDot",
    tier: "silver",
  },
  {
    id: "games-10",
    title: "10 partidas",
    description: "Guarda 10 partidas en el historial.",
    iconName: "Gamepad2",
    tier: "bronze",
    global: true,
  },
  {
    id: "games-50",
    title: "50 partidas",
    description: "Guarda 50 partidas en el historial.",
    iconName: "Gamepad2",
    tier: "silver",
    global: true,
  },
  {
    id: "games-100",
    title: "100 partidas",
    description: "Guarda 100 partidas en el historial.",
    iconName: "Gamepad2",
    tier: "gold",
    global: true,
  },
  {
    id: "average-150",
    title: "Constante",
    description: "Mantén una media de 150+ en tus últimas 5 partidas.",
    iconName: "BarChart3",
    tier: "silver",
    global: true,
  },
  {
    id: "average-180",
    title: "Profesional",
    description: "Mantén una media de 180+ en tus últimas 10 partidas.",
    iconName: "BarChart3",
    tier: "gold",
    global: true,
  },
];

const MAX_PINS = 10;

/**
 * Cuenta strikes consecutivos máximos en un set de tiradas de bowling.
 * Considera correctamente frames 1-9 (strike = 1 tirada) y frame 10 (hasta 3 tiradas).
 */
export function maxConsecutiveStrikes(rolls: number[]): number {
  if (rolls.length === 0) {
    return 0;
  }

  let max = 0;
  let current = 0;
  let cursor = 0;
  let frame = 0;

  while (frame < 9 && cursor < rolls.length) {
    if (rolls[cursor] === MAX_PINS) {
      current += 1;
      if (current > max) {
        max = current;
      }
      cursor += 1;
    } else {
      current = 0;
      cursor += 2; // saltamos la segunda tirada (no puede ser strike en frames 1-9)
    }
    frame += 1;
  }

  // Frame 10: cada tirada de 10 cuenta como strike-roll
  for (let i = cursor; i < rolls.length; i += 1) {
    if (rolls[i] === MAX_PINS) {
      current += 1;
      if (current > max) {
        max = current;
      }
    } else {
      current = 0;
    }
  }

  return max;
}

/**
 * Devuelve true si todos los frames de la partida cerraron como strike o spare.
 * Sólo aplica a partidas completas (10 frames terminados).
 */
export function hasNoOpenFrames(rolls: number[]): boolean {
  let cursor = 0;
  let frame = 0;

  while (frame < 9) {
    if (cursor >= rolls.length) {
      return false; // partida incompleta
    }

    if (rolls[cursor] === MAX_PINS) {
      cursor += 1;
      frame += 1;
      continue;
    }

    if (cursor + 1 >= rolls.length) {
      return false;
    }

    if (rolls[cursor] + rolls[cursor + 1] !== MAX_PINS) {
      return false; // frame abierto
    }

    cursor += 2;
    frame += 1;
  }

  // Frame 10: debe haber 3 tiradas y la primera debe ser strike o (primera + segunda = 10).
  const tenth = rolls.slice(cursor);
  if (tenth.length < 2) {
    return false;
  }

  if (tenth[0] === MAX_PINS) {
    return tenth.length === 3;
  }

  if (tenth[0] + tenth[1] === MAX_PINS) {
    return tenth.length === 3;
  }

  return false;
}

interface PlayerGameEntry {
  player: SavedPlayerResult;
  game: SavedGame;
}

function listPlayerGames(history: SavedGame[]): PlayerGameEntry[] {
  return history.flatMap((game) => game.players.map((player) => ({ player, game })));
}

function findFirstMatch(
  oldestFirst: PlayerGameEntry[],
  predicate: (entry: PlayerGameEntry) => boolean,
): PlayerGameEntry | null {
  for (const entry of oldestFirst) {
    if (predicate(entry)) {
      return entry;
    }
  }
  return null;
}

function averageOfLastN(games: SavedGame[], n: number): number {
  if (games.length < n) {
    return 0;
  }

  const slice = games.slice(0, n); // history es más reciente primero
  const total = slice.reduce((sum, game) => sum + game.winningScore, 0);
  return Math.round(total / slice.length);
}

/**
 * Evalúa todos los achievements contra un historial. El historial entra ordenado
 * con la partida más reciente primero (como se guarda en localStorage).
 */
export function evaluateAchievements(history: SavedGame[]): AchievementProgress[] {
  const oldestFirst = [...listPlayerGames(history)].reverse();
  const oldestGames = [...history].reverse();

  const totalGames = history.length;
  const avg5 = averageOfLastN(history, 5);
  const avg10 = averageOfLastN(history, 10);

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    switch (definition.id) {
      case "first-game": {
        const first = oldestGames[0];
        return progressFromGame(definition, first, totalGames, 1);
      }
      case "games-10":
        return progressByGamesCount(definition, oldestGames, totalGames, 10);
      case "games-50":
        return progressByGamesCount(definition, oldestGames, totalGames, 50);
      case "games-100":
        return progressByGamesCount(definition, oldestGames, totalGames, 100);
      case "score-150":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.score >= 150);
      case "score-200":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.score >= 200);
      case "score-250":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.score >= 250);
      case "score-300":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.score === 300);
      case "first-strike":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.strikes >= 1);
      case "first-spare":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.spares >= 1);
      case "five-strikes":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.strikes >= 5);
      case "five-spares":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => entry.player.spares >= 5);
      case "turkey":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => maxConsecutiveStrikes(entry.player.rolls) >= 3);
      case "four-bagger":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => maxConsecutiveStrikes(entry.player.rolls) >= 4);
      case "five-bagger":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => maxConsecutiveStrikes(entry.player.rolls) >= 5);
      case "all-marks":
        return progressFromFirstMatch(definition, oldestFirst, (entry) => hasNoOpenFrames(entry.player.rolls));
      case "average-150":
        return progressByAverage(definition, avg5, 150, 5, totalGames);
      case "average-180":
        return progressByAverage(definition, avg10, 180, 10, totalGames);
      default:
        return { definition, unlocked: false };
    }
  });
}

function progressFromGame(
  definition: AchievementDefinition,
  game: SavedGame | undefined,
  current: number,
  target: number,
): AchievementProgress {
  if (!game) {
    return { definition, unlocked: false, progress: { current, target } };
  }

  return {
    definition,
    unlocked: true,
    unlockedAt: game.date,
    progress: { current, target },
  };
}

function progressByGamesCount(
  definition: AchievementDefinition,
  oldestGames: SavedGame[],
  total: number,
  target: number,
): AchievementProgress {
  if (total < target) {
    return { definition, unlocked: false, progress: { current: total, target } };
  }

  const targetGame = oldestGames[target - 1];

  return {
    definition,
    unlocked: true,
    unlockedAt: targetGame?.date,
    progress: { current: total, target },
  };
}

function progressFromFirstMatch(
  definition: AchievementDefinition,
  oldestFirst: PlayerGameEntry[],
  predicate: (entry: PlayerGameEntry) => boolean,
): AchievementProgress {
  const match = findFirstMatch(oldestFirst, predicate);

  if (!match) {
    return { definition, unlocked: false };
  }

  return {
    definition,
    unlocked: true,
    unlockedAt: match.game.date,
    unlockedBy: match.player.name,
  };
}

function progressByAverage(
  definition: AchievementDefinition,
  averageScore: number,
  target: number,
  minGames: number,
  totalGames: number,
): AchievementProgress {
  if (totalGames < minGames) {
    return { definition, unlocked: false, progress: { current: 0, target } };
  }

  if (averageScore < target) {
    return { definition, unlocked: false, progress: { current: averageScore, target } };
  }

  return {
    definition,
    unlocked: true,
    progress: { current: averageScore, target },
  };
}

export function summarizeAchievements(achievements: AchievementProgress[]) {
  const unlocked = achievements.filter((entry) => entry.unlocked);
  return {
    total: achievements.length,
    unlockedCount: unlocked.length,
    latest: unlocked
      .filter((entry) => entry.unlockedAt)
      .sort((a, b) => (a.unlockedAt && b.unlockedAt ? b.unlockedAt.localeCompare(a.unlockedAt) : 0))
      .slice(0, 3),
  };
}
