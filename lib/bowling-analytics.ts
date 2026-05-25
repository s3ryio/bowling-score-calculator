import type { SavedGame } from "@/types/bowling";

const FRAMES_PER_GAME = 10;

export interface PlayerAnalytics {
  name: string;
  gamesPlayed: number;
  bestScore: number;
  averageScore: number;
  totalScore: number;
  totalStrikes: number;
  totalSpares: number;
  strikePercentage: number;
  sparePercentage: number;
  lastScore: number;
}

export interface FriendsRankingEntry extends PlayerAnalytics {
  rank: number;
}

export interface HistoryFilters {
  query: string;
  minScore: number;
  onlyPerfect: boolean;
}

export interface GameComparison {
  scoreDelta: number;
  strikeDelta: number;
  spareDelta: number;
  leaderName: string;
  leaderScore: number;
}

function getGameStrikes(game: SavedGame): number {
  return game.players.reduce((sum, player) => sum + player.strikes, 0);
}

function getGameSpares(game: SavedGame): number {
  return game.players.reduce((sum, player) => sum + player.spares, 0);
}

export function getPlayerStats(history: SavedGame[]): PlayerAnalytics[] {
  const stats = new Map<string, PlayerAnalytics>();
  const latestPlayedAt = new Map<string, number>();

  for (const game of history) {
    const playedAt = new Date(game.date).getTime();

    for (const player of game.players) {
      const current = stats.get(player.name) ?? {
        name: player.name,
        gamesPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        totalScore: 0,
        totalStrikes: 0,
        totalSpares: 0,
        strikePercentage: 0,
        sparePercentage: 0,
        lastScore: player.score,
      };

      current.gamesPlayed += 1;
      current.bestScore = Math.max(current.bestScore, player.score);
      current.totalScore += player.score;
      current.totalStrikes += player.strikes;
      current.totalSpares += player.spares;
      if (!latestPlayedAt.has(player.name) || playedAt >= (latestPlayedAt.get(player.name) ?? 0)) {
        current.lastScore = player.score;
        latestPlayedAt.set(player.name, playedAt);
      }

      stats.set(player.name, current);
    }
  }

  return Array.from(stats.values())
    .map((player) => {
      const frameOpportunities = player.gamesPlayed * FRAMES_PER_GAME;

      return {
        ...player,
        averageScore: Math.round(player.totalScore / player.gamesPlayed),
        strikePercentage: Math.round((player.totalStrikes / frameOpportunities) * 100),
        sparePercentage: Math.round((player.totalSpares / frameOpportunities) * 100),
      };
    })
    .sort((a, b) => b.bestScore - a.bestScore || b.averageScore - a.averageScore || a.name.localeCompare(b.name));
}

export function getFriendsRanking(history: SavedGame[], limit = 12): FriendsRankingEntry[] {
  return getPlayerStats(history)
    .slice(0, limit)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}

export function filterHistory(history: SavedGame[], filters: HistoryFilters): SavedGame[] {
  const query = filters.query.trim().toLocaleLowerCase("es");

  return history.filter((game) => {
    const matchesQuery =
      query.length === 0 ||
      game.players.some((player) => player.name.toLocaleLowerCase("es").includes(query));
    const matchesScore = game.winningScore >= filters.minScore;
    const matchesPerfect = !filters.onlyPerfect || game.winningScore === 300;

    return matchesQuery && matchesScore && matchesPerfect;
  });
}

export function compareSavedGames(baseGame: SavedGame, comparisonGame: SavedGame): GameComparison {
  const leader = comparisonGame.players[0];
  const leaderScore = leader?.adjustedScore ?? leader?.score ?? comparisonGame.winningScore;

  return {
    scoreDelta: comparisonGame.winningScore - baseGame.winningScore,
    strikeDelta: getGameStrikes(comparisonGame) - getGameStrikes(baseGame),
    spareDelta: getGameSpares(comparisonGame) - getGameSpares(baseGame),
    leaderName: leader?.name ?? "Sin ganador",
    leaderScore,
  };
}

export function createShareText(game: SavedGame): string {
  const winner = game.players[0];
  const winnerScore = winner?.adjustedScore ?? winner?.score ?? game.winningScore;
  const winnerLine = winner
    ? `${winner.name} ganó con ${winnerScore} puntos.`
    : `Partida finalizada con ${game.winningScore} puntos.`;
  const playerLines = game.players.map((player) => {
    const finalScore = player.adjustedScore ?? player.score;
    const handicap = player.handicap && player.handicap > 0 ? ` (${player.score} +${player.handicap})` : "";
    return `${player.name}: ${finalScore}${handicap} (${player.summary})`;
  });

  return ["Bowling Score Calculator", winnerLine, ...playerLines].join("\n");
}
