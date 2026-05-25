import { describe, expect, test } from "vitest";

import {
  frameAverageHeatmap,
  headToHead,
  listKnownPlayers,
  scoreDistribution,
  scoreEvolutionSeries,
} from "@/lib/bowling-charts";
import type { SavedGame } from "@/types/bowling";

const perfectRolls = Array.from({ length: 12 }, () => 10);
const openRolls = [3, 4, 5, 3, 2, 6, 7, 1, 4, 4, 5, 3, 6, 2, 5, 4, 7, 1, 5, 3];

const history: SavedGame[] = [
  {
    id: "g3",
    date: "2026-05-24T20:00:00.000Z",
    winningScore: 300,
    players: [
      { id: "ana", name: "Ana", rolls: perfectRolls, score: 300, summary: "—", strikes: 12, spares: 0 },
      { id: "luis", name: "Luis", rolls: openRolls, score: 90, summary: "—", strikes: 0, spares: 0 },
    ],
  },
  {
    id: "g2",
    date: "2026-05-23T20:00:00.000Z",
    winningScore: 180,
    players: [
      { id: "ana", name: "Ana", rolls: openRolls, score: 90, summary: "—", strikes: 0, spares: 0 },
      { id: "luis", name: "Luis", rolls: openRolls, score: 180, summary: "—", strikes: 0, spares: 5 },
    ],
  },
  {
    id: "g1",
    date: "2026-05-22T20:00:00.000Z",
    winningScore: 90,
    players: [
      { id: "luis", name: "Luis", rolls: openRolls, score: 90, summary: "—", strikes: 0, spares: 0 },
    ],
  },
];

describe("scoreEvolutionSeries", () => {
  test("devuelve cronológico (más antiguo primero)", () => {
    const series = scoreEvolutionSeries(history);
    expect(series).toHaveLength(3);
    expect(series[0].score).toBe(90);
    expect(series[2].score).toBe(300);
  });

  test("filtra por jugador", () => {
    const series = scoreEvolutionSeries(history, { playerName: "Ana" });
    expect(series).toHaveLength(2);
    expect(series.map((point) => point.score)).toEqual([90, 300]);
  });

  test("limita la cantidad de puntos", () => {
    const series = scoreEvolutionSeries(history, { limit: 2 });
    expect(series).toHaveLength(2);
  });
});

describe("scoreDistribution", () => {
  test("distribuye en los buckets correctos", () => {
    const distribution = scoreDistribution(history);
    expect(distribution.find((bin) => bin.label === "300")?.count).toBe(1);
    expect(distribution.find((bin) => bin.label === "150–199")?.count).toBe(1);
    expect(distribution.find((bin) => bin.label === "50–99")?.count).toBe(1);
  });

  test("incluye puntuaciones con handicap por encima de 300", () => {
    const distribution = scoreDistribution([
      {
        id: "handicap",
        date: "2026-05-24T20:00:00.000Z",
        winningScore: 320,
        players: [],
      },
    ]);

    expect(distribution.find((bin) => bin.label === "300+")?.count).toBe(1);
  });

  test("buckets vacíos cuando no hay historial", () => {
    const distribution = scoreDistribution([]);
    expect(distribution.every((bin) => bin.count === 0)).toBe(true);
  });
});

describe("frameAverageHeatmap", () => {
  test("calcula promedio por frame", () => {
    const data = frameAverageHeatmap(history);
    expect(data).toHaveLength(10);
    expect(data[0].samples).toBeGreaterThan(0);
  });
});

describe("listKnownPlayers", () => {
  test("ordena por número de partidas desc", () => {
    const players = listKnownPlayers(history);
    expect(players[0]).toBe("Luis"); // 3 partidas
    expect(players[1]).toBe("Ana"); // 2 partidas
  });

  test("lista vacía para historial vacío", () => {
    expect(listKnownPlayers([])).toEqual([]);
  });
});

describe("headToHead", () => {
  test("compara dos jugadores en partidas comunes", () => {
    const result = headToHead(history, "Ana", "Luis");
    expect(result.meetings).toBe(2);
    expect(result.winsA).toBe(1); // Ana ganó game-3 (300 vs 90)
    expect(result.winsB).toBe(1); // Luis ganó game-2 (180 vs 90)
    expect(result.ties).toBe(0);
  });

  test("retorna ceros si no hay partidas comunes", () => {
    const result = headToHead(history, "Ana", "Pedro");
    expect(result.meetings).toBe(0);
    expect(result.lastMeetingDate).toBeNull();
  });

  test("retorna vacío si los jugadores son iguales", () => {
    const result = headToHead(history, "Ana", "Ana");
    expect(result.meetings).toBe(0);
  });
});
