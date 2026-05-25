import { describe, expect, test } from "vitest";

import {
  ACHIEVEMENT_DEFINITIONS,
  evaluateAchievements,
  hasNoOpenFrames,
  maxConsecutiveStrikes,
  summarizeAchievements,
} from "@/lib/bowling-achievements";
import type { SavedGame } from "@/types/bowling";

const perfectRolls = Array.from({ length: 12 }, () => 10);
const turkeyRolls = [10, 10, 10, 5, 4, 7, 2, 8, 1, 6, 3, 4, 5, 9, 0, 5, 4]; // 3 strikes seguidos al inicio
const openGameRolls = [3, 4, 5, 3, 2, 6, 7, 1, 4, 4, 5, 3, 6, 2, 5, 4, 7, 1, 5, 3];

const games: SavedGame[] = [
  {
    id: "g3",
    date: "2026-05-24T20:00:00.000Z",
    winningScore: 300,
    players: [
      { id: "ana", name: "Ana", rolls: perfectRolls, score: 300, summary: "X×12", strikes: 12, spares: 0 },
    ],
  },
  {
    id: "g2",
    date: "2026-05-23T20:00:00.000Z",
    winningScore: 173,
    players: [
      { id: "ana", name: "Ana", rolls: turkeyRolls, score: 173, summary: "—", strikes: 3, spares: 0 },
      { id: "luis", name: "Luis", rolls: openGameRolls, score: 90, summary: "—", strikes: 0, spares: 0 },
    ],
  },
  {
    id: "g1",
    date: "2026-05-22T20:00:00.000Z",
    winningScore: 90,
    players: [
      { id: "luis", name: "Luis", rolls: openGameRolls, score: 90, summary: "—", strikes: 0, spares: 0 },
    ],
  },
];

describe("maxConsecutiveStrikes", () => {
  test("partida perfecta = 12 strikes seguidos", () => {
    expect(maxConsecutiveStrikes(perfectRolls)).toBe(12);
  });

  test("turkey detecta 3 strikes", () => {
    expect(maxConsecutiveStrikes(turkeyRolls)).toBe(3);
  });

  test("partida abierta = 0 strikes consecutivos", () => {
    expect(maxConsecutiveStrikes(openGameRolls)).toBe(0);
  });

  test("rolls vacíos = 0", () => {
    expect(maxConsecutiveStrikes([])).toBe(0);
  });
});

describe("hasNoOpenFrames", () => {
  test("partida perfecta no tiene huecos", () => {
    expect(hasNoOpenFrames(perfectRolls)).toBe(true);
  });

  test("partida abierta tiene huecos", () => {
    expect(hasNoOpenFrames(openGameRolls)).toBe(false);
  });

  test("partida incompleta no califica", () => {
    expect(hasNoOpenFrames([10, 10])).toBe(false);
  });
});

describe("evaluateAchievements", () => {
  test("desbloquea perfecto y turkey cuando aplica", () => {
    const result = evaluateAchievements(games);
    const byId = new Map(result.map((entry) => [entry.definition.id, entry]));

    expect(byId.get("score-300")?.unlocked).toBe(true);
    expect(byId.get("score-300")?.unlockedBy).toBe("Ana");
    expect(byId.get("turkey")?.unlocked).toBe(true);
    expect(byId.get("first-strike")?.unlocked).toBe(true);
    expect(byId.get("first-game")?.unlocked).toBe(true);
  });

  test("logros volumen calculan progreso", () => {
    const result = evaluateAchievements(games);
    const games10 = result.find((entry) => entry.definition.id === "games-10");
    expect(games10?.unlocked).toBe(false);
    expect(games10?.progress).toEqual({ current: 3, target: 10 });
  });

  test("listado completo y consistente", () => {
    const result = evaluateAchievements([]);
    expect(result).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
    expect(result.every((entry) => !entry.unlocked)).toBe(true);
  });
});

describe("summarizeAchievements", () => {
  test("cuenta desbloqueados y devuelve los últimos", () => {
    const result = evaluateAchievements(games);
    const summary = summarizeAchievements(result);
    expect(summary.total).toBe(ACHIEVEMENT_DEFINITIONS.length);
    expect(summary.unlockedCount).toBeGreaterThan(0);
    expect(summary.latest.length).toBeLessThanOrEqual(3);
  });
});
