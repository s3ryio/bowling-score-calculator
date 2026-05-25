import { createId } from "@/lib/bowling-game";
import { normalizeMode } from "@/lib/bowling-modes";
import type {
  GameMode,
  Tournament,
  TournamentFixture,
  TournamentStanding,
} from "@/types/bowling";

const MAX_PLAYERS_PER_TOURNAMENT = 8;
const MIN_PLAYERS_PER_TOURNAMENT = 2;

export function clampTournamentPlayers(players: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of players) {
    const clean = name.trim();
    if (!clean) {
      continue;
    }
    const dedupKey = clean.toLocaleLowerCase("es");
    if (seen.has(dedupKey)) {
      continue;
    }
    seen.add(dedupKey);
    result.push(clean);
    if (result.length >= MAX_PLAYERS_PER_TOURNAMENT) {
      break;
    }
  }

  return result;
}

function generateRoundRobinFixtures(players: string[]): TournamentFixture[] {
  const fixtures: TournamentFixture[] = [];

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      fixtures.push({
        id: createId("fix"),
        playerA: players[i],
        playerB: players[j],
        scoreA: null,
        scoreB: null,
        completedAt: null,
      });
    }
  }

  return fixtures;
}

export function createTournament(
  name: string,
  players: string[],
  mode: GameMode = "classic",
): Tournament {
  const cleanedPlayers = clampTournamentPlayers(players);

  if (cleanedPlayers.length < MIN_PLAYERS_PER_TOURNAMENT) {
    throw new Error("Un torneo requiere al menos 2 jugadores distintos.");
  }

  const cleanName = name.trim() || `Torneo ${new Date().toLocaleDateString("es-ES")}`;

  return {
    id: createId("tour"),
    name: cleanName,
    createdAt: new Date().toISOString(),
    mode: normalizeMode(mode),
    players: cleanedPlayers,
    fixtures: generateRoundRobinFixtures(cleanedPlayers),
  };
}

export function recordFixtureResult(
  tournament: Tournament,
  fixtureId: string,
  scoreA: number,
  scoreB: number,
): Tournament {
  if (
    !Number.isFinite(scoreA) ||
    !Number.isFinite(scoreB) ||
    scoreA < 0 ||
    scoreB < 0 ||
    scoreA > 450 ||
    scoreB > 450
  ) {
    throw new Error("Las puntuaciones deben estar entre 0 y 450.");
  }

  const now = new Date().toISOString();
  return {
    ...tournament,
    fixtures: tournament.fixtures.map((fixture) =>
      fixture.id === fixtureId
        ? { ...fixture, scoreA: Math.round(scoreA), scoreB: Math.round(scoreB), completedAt: now }
        : fixture,
    ),
  };
}

export function clearFixtureResult(tournament: Tournament, fixtureId: string): Tournament {
  return {
    ...tournament,
    fixtures: tournament.fixtures.map((fixture) =>
      fixture.id === fixtureId
        ? { ...fixture, scoreA: null, scoreB: null, completedAt: null }
        : fixture,
    ),
  };
}

export function isTournamentComplete(tournament: Tournament): boolean {
  return (
    tournament.fixtures.length > 0 &&
    tournament.fixtures.every((fixture) => fixture.scoreA != null && fixture.scoreB != null)
  );
}

export function computeStandings(tournament: Tournament): TournamentStanding[] {
  const standings = new Map<string, TournamentStanding>();

  for (const player of tournament.players) {
    standings.set(player, {
      player,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalScore: 0,
      scoreDiff: 0,
      averageScore: 0,
    });
  }

  for (const fixture of tournament.fixtures) {
    if (fixture.scoreA == null || fixture.scoreB == null) {
      continue;
    }

    const standingA = standings.get(fixture.playerA);
    const standingB = standings.get(fixture.playerB);
    if (!standingA || !standingB) {
      continue;
    }

    standingA.played += 1;
    standingB.played += 1;
    standingA.totalScore += fixture.scoreA;
    standingB.totalScore += fixture.scoreB;
    standingA.scoreDiff += fixture.scoreA - fixture.scoreB;
    standingB.scoreDiff += fixture.scoreB - fixture.scoreA;

    if (fixture.scoreA === fixture.scoreB) {
      standingA.draws += 1;
      standingB.draws += 1;
    } else {
      const aWins = fixture.scoreA > fixture.scoreB;
      if (aWins) {
        standingA.wins += 1;
        standingB.losses += 1;
      } else {
        standingA.losses += 1;
        standingB.wins += 1;
      }
    }
  }

  for (const standing of standings.values()) {
    standing.averageScore = standing.played > 0 ? Math.round(standing.totalScore / standing.played) : 0;
  }

  return Array.from(standings.values()).sort((a, b) => {
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }
    if (a.scoreDiff !== b.scoreDiff) {
      return b.scoreDiff - a.scoreDiff;
    }
    return b.averageScore - a.averageScore || a.player.localeCompare(b.player);
  });
}

export function getTournamentChampion(tournament: Tournament): string | null {
  if (!isTournamentComplete(tournament)) {
    return null;
  }
  return computeStandings(tournament)[0]?.player ?? null;
}

export function attachTournamentOwner(tournament: Tournament, ownerId: string | null): Tournament {
  return ownerId ? { ...tournament, ownerId } : tournament;
}

export function getAccountTournaments(
  tournaments: Tournament[],
  ownerId: string | null,
): Tournament[] {
  return tournaments.filter((tournament) => {
    if (!ownerId) {
      return !tournament.ownerId;
    }
    return tournament.ownerId === ownerId;
  });
}

export const TOURNAMENT_LIMITS = {
  minPlayers: MIN_PLAYERS_PER_TOURNAMENT,
  maxPlayers: MAX_PLAYERS_PER_TOURNAMENT,
};
