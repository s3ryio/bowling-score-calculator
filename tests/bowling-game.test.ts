import { describe, expect, test } from "vitest";

import {
  findPlayerToUndo,
  rankPlayers,
  renamePlayer,
  restartGameWithPlayers,
  restoreStoredGame,
  syncPrimaryPlayerName,
} from "@/lib/bowling-game";
import { DEFAULT_HANDICAP } from "@/lib/bowling-modes";
import type { BowlingGame } from "@/types/bowling";

const baseGameFields = {
  mode: "classic" as const,
  handicap: DEFAULT_HANDICAP,
  playerHandicaps: {},
};

describe("bowling game state", () => {
  test("undo targets the player who made the last roll after turn wraps", () => {
    const game: BowlingGame = {
      id: "game-1",
      activePlayerIndex: 0,
      createdAt: "2026-05-23T00:00:00.000Z",
      rollHistory: [0, 1],
      players: [
        { id: "player-1", name: "Jugador 1", rolls: [10] },
        { id: "player-2", name: "Jugador 2", rolls: [10] },
      ],
      ...baseGameFields,
    };

    expect(findPlayerToUndo(game)).toBe(1);
  });

  test("renames players with trimmed names and a stable fallback", () => {
    const game: BowlingGame = {
      id: "game-1",
      activePlayerIndex: 0,
      createdAt: "2026-05-23T00:00:00.000Z",
      rollHistory: [],
      players: [
        { id: "player-1", name: "Jugador 1", rolls: [] },
        { id: "player-2", name: "Jugador 2", rolls: [] },
      ],
      ...baseGameFields,
    };

    expect(renamePlayer(game, "player-1", "  Ana  ").players[0]?.name).toBe("Ana");
    expect(renamePlayer(game, "player-2", "   ").players[1]?.name).toBe("");
  });

  test("syncs the first player to the online profile name", () => {
    const game: BowlingGame = {
      id: "game-1",
      activePlayerIndex: 0,
      createdAt: "2026-05-23T00:00:00.000Z",
      rollHistory: [],
      players: [
        { id: "player-1", name: "Jugador 1", rolls: [] },
        { id: "player-2", name: "Luis", rolls: [] },
      ],
      ...baseGameFields,
    };

    const synced = syncPrimaryPlayerName(game, "Ana");

    expect(synced.players[0]?.name).toBe("Ana");
    expect(synced.players[1]?.name).toBe("Luis");
  });

  test("uses player ids for handicap snapshots so duplicate names do not collide", () => {
    const players = [
      { id: "player-1", name: "Alex", rolls: Array.from({ length: 20 }, () => 1) },
      { id: "player-2", name: "Alex", rolls: Array.from({ length: 20 }, () => 2) },
    ];

    const ranked = rankPlayers(players, "classic", {
      "player-1": 30,
      "player-2": 0,
    });

    expect(ranked.find((player) => player.id === "player-1")?.adjustedScore).toBe(50);
    expect(ranked.find((player) => player.id === "player-2")?.adjustedScore).toBe(40);
  });

  test("restarts a game while preserving player identity and names", () => {
    const game: BowlingGame = {
      id: "game-1",
      activePlayerIndex: 1,
      createdAt: "2026-05-23T00:00:00.000Z",
      rollHistory: [0, 1, 0],
      savedAt: "2026-05-23T01:00:00.000Z",
      players: [
        { id: "player-1", name: "Ana", rolls: [10, 10] },
        { id: "player-2", name: "Luis", rolls: [5, 5] },
      ],
      ...baseGameFields,
    };

    const restarted = restartGameWithPlayers(game);

    expect(restarted.id).not.toBe(game.id);
    expect(restarted.activePlayerIndex).toBe(0);
    expect(restarted.rollHistory).toEqual([]);
    expect(restarted.savedAt).toBeUndefined();
    expect(restarted.players).toEqual([
      { id: "player-1", name: "Ana", rolls: [] },
      { id: "player-2", name: "Luis", rolls: [] },
    ]);
  });

  test("restores a stored game and adds missing state for active-game persistence", () => {
    const restored = restoreStoredGame({
      id: "stored-game",
      activePlayerIndex: 5,
      createdAt: "2026-05-23T00:00:00.000Z",
      players: [
        { id: "player-1", name: " Ana ", rolls: [10, 7, 3, 12, 5] },
        { id: "player-2", name: "", rolls: [4, 4] },
      ],
    });

    expect(restored.id).toBe("stored-game");
    expect(restored.activePlayerIndex).toBe(1);
    expect(restored.rollHistory).toEqual([0, 0, 0, 1, 1]);
    expect(restored.players).toEqual([
      { id: "player-1", name: "Ana", rolls: [10, 7, 3] },
      { id: "player-2", name: "Jugador 2", rolls: [4, 4] },
    ]);
  });
});
