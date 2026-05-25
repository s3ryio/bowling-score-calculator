import { calculateGameScore } from "@/lib/bowling-score";
import type { SavedGame, SavedPlayerResult } from "@/types/bowling";

export interface EvolutionPoint {
  /** Índice cronológico (0 = más antiguo del subconjunto). */
  index: number;
  /** ISO date de la partida. */
  date: string;
  /** Puntuación ganadora de la partida. */
  score: number;
}

export interface FrameAverage {
  frameNumber: number;
  averageScore: number;
  samples: number;
}

export interface ScoreBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface HeadToHeadResult {
  playerA: string;
  playerB: string;
  meetings: number;
  winsA: number;
  winsB: number;
  ties: number;
  bestA: number;
  bestB: number;
  averageA: number;
  averageB: number;
  lastMeetingDate: string | null;
}

const DEFAULT_EVOLUTION_LIMIT = 20;

/**
 * Devuelve la evolución de la puntuación ganadora a lo largo del tiempo,
 * cronológica (más antigua primero), limitando a las últimas N partidas.
 */
export function scoreEvolutionSeries(
  history: SavedGame[],
  options: { limit?: number; playerName?: string } = {},
): EvolutionPoint[] {
  const limit = options.limit ?? DEFAULT_EVOLUTION_LIMIT;
  const relevant = options.playerName
    ? history.filter((game) => game.players.some((player) => player.name === options.playerName))
    : history;

  // history viene más reciente primero. Tomamos los últimos `limit` y los volteamos.
  const recent = relevant.slice(0, limit).reverse();

  return recent.map((game, index) => {
    const score = options.playerName
      ? game.players.find((player) => player.name === options.playerName)?.score ?? game.winningScore
      : game.winningScore;

    return {
      index,
      date: game.date,
      score,
    };
  });
}

/**
 * Calcula la puntuación media por frame a lo largo del historial.
 * Sólo cuenta frames completos. Si se pasa playerName, filtra a ese jugador.
 */
export function frameAverageHeatmap(history: SavedGame[], playerName?: string): FrameAverage[] {
  const totals = new Array<{ sum: number; samples: number }>(10);
  for (let i = 0; i < 10; i += 1) {
    totals[i] = { sum: 0, samples: 0 };
  }

  const playerEntries: SavedPlayerResult[] = history.flatMap((game) =>
    playerName ? game.players.filter((player) => player.name === playerName) : game.players,
  );

  for (const entry of playerEntries) {
    try {
      const score = calculateGameScore(entry.rolls);
      for (const frame of score.frames) {
        if (frame.frameScore == null) {
          continue;
        }
        const bucket = totals[frame.frameNumber - 1];
        bucket.sum += frame.frameScore;
        bucket.samples += 1;
      }
    } catch {
      // tiradas inválidas: ignoramos
    }
  }

  return totals.map((bucket, index) => ({
    frameNumber: index + 1,
    averageScore: bucket.samples === 0 ? 0 : Math.round((bucket.sum / bucket.samples) * 10) / 10,
    samples: bucket.samples,
  }));
}

const DISTRIBUTION_BINS: Array<{ label: string; min: number; max: number }> = [
  { label: "0–49", min: 0, max: 49 },
  { label: "50–99", min: 50, max: 99 },
  { label: "100–149", min: 100, max: 149 },
  { label: "150–199", min: 150, max: 199 },
  { label: "200–249", min: 200, max: 249 },
  { label: "250–299", min: 250, max: 299 },
  { label: "300", min: 300, max: 300 },
  { label: "300+", min: 301, max: Number.POSITIVE_INFINITY },
];

/**
 * Distribuye las puntuaciones ganadoras del historial en buckets para histograma.
 */
export function scoreDistribution(history: SavedGame[]): ScoreBin[] {
  const result = DISTRIBUTION_BINS.map((bin) => ({ ...bin, count: 0 }));

  for (const game of history) {
    const bucket = result.find((bin) => game.winningScore >= bin.min && game.winningScore <= bin.max);
    if (bucket) {
      bucket.count += 1;
    }
  }

  return result;
}

/**
 * Compara dos jugadores en partidas donde ambos aparecen.
 */
export function headToHead(history: SavedGame[], playerA: string, playerB: string): HeadToHeadResult {
  const empty: HeadToHeadResult = {
    playerA,
    playerB,
    meetings: 0,
    winsA: 0,
    winsB: 0,
    ties: 0,
    bestA: 0,
    bestB: 0,
    averageA: 0,
    averageB: 0,
    lastMeetingDate: null,
  };

  if (!playerA || !playerB || playerA === playerB) {
    return empty;
  }

  let totalA = 0;
  let totalB = 0;
  let lastDate: string | null = null;

  const meetingsSet: Array<{ a: SavedPlayerResult; b: SavedPlayerResult; date: string }> = [];

  for (const game of history) {
    const a = game.players.find((player) => player.name === playerA);
    const b = game.players.find((player) => player.name === playerB);
    if (!a || !b) {
      continue;
    }
    meetingsSet.push({ a, b, date: game.date });
  }

  if (meetingsSet.length === 0) {
    return empty;
  }

  const result = { ...empty, meetings: meetingsSet.length };

  for (const meeting of meetingsSet) {
    totalA += meeting.a.score;
    totalB += meeting.b.score;
    result.bestA = Math.max(result.bestA, meeting.a.score);
    result.bestB = Math.max(result.bestB, meeting.b.score);

    if (meeting.a.score > meeting.b.score) {
      result.winsA += 1;
    } else if (meeting.b.score > meeting.a.score) {
      result.winsB += 1;
    } else {
      result.ties += 1;
    }

    if (lastDate === null || meeting.date.localeCompare(lastDate) > 0) {
      lastDate = meeting.date;
    }
  }

  result.averageA = Math.round(totalA / meetingsSet.length);
  result.averageB = Math.round(totalB / meetingsSet.length);
  result.lastMeetingDate = lastDate;

  return result;
}

/**
 * Devuelve la lista de nombres de jugador únicos en el historial,
 * ordenados por número de partidas jugadas (desc) y luego alfabéticamente.
 */
export function listKnownPlayers(history: SavedGame[]): string[] {
  const counts = new Map<string, number>();
  for (const game of history) {
    for (const player of game.players) {
      counts.set(player.name, (counts.get(player.name) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map((entry) => entry[0]);
}
