import { describe, expect, test } from "vitest";

import {
  compareSavedGames,
  createShareText,
  filterHistory,
  getFriendsRanking,
  getPlayerStats,
} from "@/lib/bowling-analytics";
import type { SavedGame } from "@/types/bowling";

const history: SavedGame[] = [
  {
    id: "game-1",
    date: "2026-05-23T20:00:00.000Z",
    winningScore: 220,
    players: [
      {
        id: "ana-1",
        name: "Ana",
        rolls: [],
        score: 220,
        summary: "X X 9 / 8 1",
        strikes: 4,
        spares: 2,
      },
      {
        id: "luis-1",
        name: "Luis",
        rolls: [],
        score: 170,
        summary: "9 / 8 1",
        strikes: 2,
        spares: 3,
      },
    ],
  },
  {
    id: "game-2",
    date: "2026-05-24T20:00:00.000Z",
    winningScore: 300,
    players: [
      {
        id: "ana-2",
        name: "Ana",
        rolls: [],
        score: 300,
        summary: "X X X X X X X X X X X X",
        strikes: 10,
        spares: 0,
      },
    ],
  },
];

describe("bowling analytics", () => {
  test("aggregates player stats across saved history by player name", () => {
    expect(getPlayerStats(history)).toEqual([
      {
        name: "Ana",
        gamesPlayed: 2,
        bestScore: 300,
        averageScore: 260,
        totalScore: 520,
        totalStrikes: 14,
        totalSpares: 2,
        strikePercentage: 70,
        sparePercentage: 10,
        lastScore: 300,
      },
      {
        name: "Luis",
        gamesPlayed: 1,
        bestScore: 170,
        averageScore: 170,
        totalScore: 170,
        totalStrikes: 2,
        totalSpares: 3,
        strikePercentage: 20,
        sparePercentage: 30,
        lastScore: 170,
      },
    ]);
  });

  test("builds a friends ranking from saved games", () => {
    expect(getFriendsRanking(history).map((player) => ({
      rank: player.rank,
      name: player.name,
      bestScore: player.bestScore,
    }))).toEqual([
      { rank: 1, name: "Ana", bestScore: 300 },
      { rank: 2, name: "Luis", bestScore: 170 },
    ]);
  });

  test("filters history by player name, score range, and perfect games", () => {
    expect(filterHistory(history, { query: "luis", minScore: 0, onlyPerfect: false })).toHaveLength(1);
    expect(filterHistory(history, { query: "", minScore: 250, onlyPerfect: false }).map((game) => game.id)).toEqual([
      "game-2",
    ]);
    expect(filterHistory(history, { query: "", minScore: 0, onlyPerfect: true }).map((game) => game.id)).toEqual([
      "game-2",
    ]);
  });

  test("compares two saved games with scoring and mark deltas", () => {
    expect(compareSavedGames(history[0], history[1])).toEqual({
      scoreDelta: 80,
      strikeDelta: 4,
      spareDelta: -5,
      leaderName: "Ana",
      leaderScore: 300,
    });
  });

  test("creates compact share text for a saved game", () => {
    expect(createShareText(history[1])).toBe(
      "Bowling Score Calculator\nAna ganó con 300 puntos.\nAna: 300 (X X X X X X X X X X X X)",
    );
  });

  test("uses adjusted score when sharing handicap results", () => {
    const game: SavedGame = {
      id: "handicap",
      date: "2026-05-24T20:00:00.000Z",
      winningScore: 230,
      players: [
        {
          id: "ana",
          name: "Ana",
          rolls: [],
          score: 190,
          handicap: 40,
          adjustedScore: 230,
          summary: "—",
          strikes: 3,
          spares: 4,
        },
      ],
    };

    expect(createShareText(game)).toBe("Bowling Score Calculator\nAna ganó con 230 puntos.\nAna: 230 (190 +40) (—)");
  });
});
