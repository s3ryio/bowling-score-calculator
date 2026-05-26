import type {
  OnlineGameRow,
  OnlineLeaderboardEntry,
  OnlineProfile,
  OnlineSeason,
} from "@/types/online";

export function sanitizeUsername(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export function createInviteCode(...parts: string[]): string {
  const input = parts.join(":") || `${Date.now()}:${Math.random()}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
}

export function buildOnlineLeaderboard(
  games: OnlineGameRow[],
  profiles: OnlineProfile[],
): OnlineLeaderboardEntry[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const byUser = new Map<string, OnlineGameRow[]>();

  for (const game of games) {
    if (game.source !== "game3d") {
      continue;
    }
    const current = byUser.get(game.ownerId) ?? [];
    current.push(game);
    byUser.set(game.ownerId, current);
  }

  return Array.from(byUser.entries())
    .map(([userId, userGames]) => {
      const sortedGames = [...userGames].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
      const profile = profileById.get(userId);
      const totalScore = userGames.reduce((sum, game) => sum + game.score, 0);
      const bestScore = userGames.reduce((best, game) => Math.max(best, game.score), 0);

      return {
        userId,
        username: profile?.username ?? "jugador",
        displayName: profile?.displayName ?? profile?.username ?? "Jugador",
        rank: 0,
        gamesPlayed: userGames.length,
        bestScore,
        averageScore: Math.round(totalScore / userGames.length),
        lastScore: sortedGames[0]?.score ?? 0,
      };
    })
    .sort((a, b) => b.bestScore - a.bestScore || b.averageScore - a.averageScore || a.username.localeCompare(b.username))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function getActiveSeasons(seasons: OnlineSeason[], nowIso: string): OnlineSeason[] {
  const now = new Date(nowIso).getTime();

  return seasons.filter((season) => {
    const startsAt = new Date(season.startsAt).getTime();
    const endsAt = new Date(season.endsAt).getTime();
    return startsAt <= now && now < endsAt;
  });
}
