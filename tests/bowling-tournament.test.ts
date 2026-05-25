import { describe, expect, test } from "vitest";

import {
  clampTournamentPlayers,
  clearFixtureResult,
  computeStandings,
  createTournament,
  getTournamentChampion,
  isTournamentComplete,
  recordFixtureResult,
} from "@/lib/bowling-tournament";

describe("clampTournamentPlayers", () => {
  test("limpia espacios y descarta duplicados case-insensitive", () => {
    const result = clampTournamentPlayers([" Ana ", "ANA", "Luis", "", "  ", "Luis"]);
    expect(result).toEqual(["Ana", "Luis"]);
  });

  test("respeta máximo de 8 jugadores", () => {
    const players = Array.from({ length: 12 }, (_, i) => `J${i + 1}`);
    expect(clampTournamentPlayers(players).length).toBe(8);
  });
});

describe("createTournament", () => {
  test("genera todas las parejas round-robin", () => {
    const tournament = createTournament("Test", ["A", "B", "C", "D"]);
    // 4 jugadores → C(4,2) = 6 partidos
    expect(tournament.fixtures.length).toBe(6);
    expect(tournament.players).toEqual(["A", "B", "C", "D"]);
  });

  test("rechaza torneos con menos de 2 jugadores", () => {
    expect(() => createTournament("Solo", ["A"])).toThrow();
  });

  test("normaliza torneos legacy al modo clásico", () => {
    const tournament = createTournament("Test", ["A", "B"], "golf" as never);

    expect(tournament.mode).toBe("classic");
  });
});

describe("recordFixtureResult + standings", () => {
  test("clasifica por victorias y luego por diferencia de pinos", () => {
    let tournament = createTournament("Test", ["Ana", "Luis", "Pedro"]);
    const [f1, f2, f3] = tournament.fixtures;
    tournament = recordFixtureResult(tournament, f1.id, 200, 150); // Ana vence
    tournament = recordFixtureResult(tournament, f2.id, 180, 120); // Ana o Luis vs Pedro
    tournament = recordFixtureResult(tournament, f3.id, 100, 200); // Luis vs Pedro?
    expect(isTournamentComplete(tournament)).toBe(true);
    const standings = computeStandings(tournament);
    expect(standings[0].player).toBe("Ana"); // 2 victorias
  });

  test("rechaza puntuaciones inválidas", () => {
    const tournament = createTournament("Test", ["A", "B"]);
    const [f1] = tournament.fixtures;
    expect(() => recordFixtureResult(tournament, f1.id, -10, 200)).toThrow();
    expect(() => recordFixtureResult(tournament, f1.id, 500, 200)).toThrow();
    expect(() => recordFixtureResult(tournament, f1.id, NaN, 200)).toThrow();
  });

  test("clearFixtureResult resetea el partido", () => {
    let tournament = createTournament("Test", ["A", "B"]);
    const [f1] = tournament.fixtures;
    tournament = recordFixtureResult(tournament, f1.id, 100, 200);
    tournament = clearFixtureResult(tournament, f1.id);
    expect(tournament.fixtures[0].scoreA).toBeNull();
    expect(tournament.fixtures[0].scoreB).toBeNull();
  });
});

describe("getTournamentChampion", () => {
  test("devuelve null si no está completo", () => {
    const tournament = createTournament("Test", ["A", "B"]);
    expect(getTournamentChampion(tournament)).toBeNull();
  });

  test("devuelve el primero de la clasificación cuando termina", () => {
    let tournament = createTournament("Test", ["Ana", "Luis"]);
    tournament = recordFixtureResult(tournament, tournament.fixtures[0].id, 200, 150);
    expect(getTournamentChampion(tournament)).toBe("Ana");
  });
});
