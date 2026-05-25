import { describe, expect, test } from "vitest";

import { suggestImageFilename } from "@/lib/bowling-export";
import type { SavedGame } from "@/types/bowling";

const baseGame: SavedGame = {
  id: "g1",
  date: "2026-05-24T20:00:00.000Z",
  winningScore: 220,
  mode: "classic",
  players: [
    { id: "p1", name: "Ana", rolls: [], score: 220, summary: "—", strikes: 4, spares: 2 },
    { id: "p2", name: "Luis", rolls: [], score: 170, summary: "—", strikes: 2, spares: 3 },
  ],
};

describe("suggestImageFilename", () => {
  test("usa el nombre del ganador y la fecha en ISO", () => {
    expect(suggestImageFilename(baseGame)).toBe("bowling-ana-2026-05-24.png");
  });

  test("sanea caracteres especiales y acentos", () => {
    const game: SavedGame = {
      ...baseGame,
      players: [
        { id: "p1", name: "Andrés Núñez!", rolls: [], score: 200, summary: "—", strikes: 0, spares: 0 },
      ],
    };
    expect(suggestImageFilename(game)).toBe("bowling-andres-nunez-2026-05-24.png");
  });

  test("usa siempre ranking clásico aunque una partida antigua tenga modo legacy", () => {
    const game: SavedGame = {
      ...baseGame,
      mode: "golf" as never,
      players: [
        { id: "p1", name: "Pedro", rolls: [], score: 200, summary: "—", strikes: 0, spares: 0 },
        { id: "p2", name: "Marta", rolls: [], score: 80, summary: "—", strikes: 0, spares: 0 },
      ],
    };
    expect(suggestImageFilename(game)).toBe("bowling-pedro-2026-05-24.png");
  });

  test("fallback cuando no hay jugadores", () => {
    const game: SavedGame = { ...baseGame, players: [] };
    expect(suggestImageFilename(game)).toBe("bowling-scorecard-2026-05-24.png");
  });

  test("fallback cuando la fecha es inválida", () => {
    const game: SavedGame = { ...baseGame, date: "not-a-date" };
    expect(suggestImageFilename(game)).toBe("bowling-ana-scorecard.png");
  });
});
