import { describe, expect, test } from "vitest";

import {
  calculateAutoHandicap,
  DEFAULT_HANDICAP,
  getGameMode,
  normalizeMode,
} from "@/lib/bowling-modes";
import type { SavedGame } from "@/types/bowling";

describe("calculateAutoHandicap", () => {
  const history: SavedGame[] = [
    {
      id: "g1",
      date: "2026-05-22T20:00:00.000Z",
      winningScore: 120,
      players: [{ id: "ana", name: "Ana", rolls: [], score: 120, summary: "—", strikes: 0, spares: 0 }],
    },
    {
      id: "g2",
      date: "2026-05-23T20:00:00.000Z",
      winningScore: 140,
      players: [{ id: "ana", name: "Ana", rolls: [], score: 140, summary: "—", strikes: 0, spares: 0 }],
    },
  ];

  test("devuelve 0 si está deshabilitado", () => {
    expect(calculateAutoHandicap("Ana", history, DEFAULT_HANDICAP)).toBe(0);
  });

  test("calcula handicap a partir de la media histórica", () => {
    const handicap = calculateAutoHandicap("Ana", history, {
      enabled: true,
      targetScore: 200,
      percentage: 100,
    });
    // Media de Ana = 130. Diff = 70. Al 100% = 70.
    expect(handicap).toBe(70);
  });

  test("aplica el porcentaje configurado", () => {
    const handicap = calculateAutoHandicap("Ana", history, {
      enabled: true,
      targetScore: 200,
      percentage: 80,
    });
    expect(handicap).toBe(56); // 70 * 0.8
  });

  test("devuelve 0 si el jugador no aparece en el historial", () => {
    const handicap = calculateAutoHandicap("Pedro", history, {
      enabled: true,
      targetScore: 200,
      percentage: 100,
    });
    expect(handicap).toBe(0);
  });

  test("devuelve 0 si la media supera el target", () => {
    const handicap = calculateAutoHandicap("Ana", history, {
      enabled: true,
      targetScore: 100,
      percentage: 100,
    });
    expect(handicap).toBe(0);
  });
});

describe("getGameMode", () => {
  test("devuelve el modo clásico por defecto", () => {
    expect(getGameMode(undefined).id).toBe("classic");
  });

  test("normaliza modos legacy al clásico", () => {
    expect(normalizeMode("golf")).toBe("classic");
    expect(normalizeMode("no-tap")).toBe("classic");
    expect(normalizeMode("3-6-9")).toBe("classic");
  });
});
