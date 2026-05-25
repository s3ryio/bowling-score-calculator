import { describe, expect, test } from "vitest";

import {
  attachGameOwner,
  getProfileHistory,
  isGameVisibleForProfile,
} from "@/lib/history-ownership";
import type { SavedGame } from "@/types/bowling";

const baseGame: SavedGame = {
  id: "game-1",
  date: "2026-05-25T20:00:00.000Z",
  players: [],
  winningScore: 180,
};

describe("history ownership", () => {
  test("stores new games under the online profile id", () => {
    expect(attachGameOwner(baseGame, "profile-1")).toMatchObject({
      id: "game-1",
      ownerId: "profile-1",
    });
    expect(attachGameOwner({ ...baseGame, ownerId: "profile-1" }, null)).not.toHaveProperty("ownerId");
  });

  test("shows own online games and unclaimed guest games for the active profile", () => {
    const history: SavedGame[] = [
      { ...baseGame, id: "own", ownerId: "profile-1" },
      { ...baseGame, id: "guest" },
      { ...baseGame, id: "other", ownerId: "profile-2" },
    ];

    expect(getProfileHistory(history, "profile-1").map((game) => game.id)).toEqual(["own", "guest"]);
    expect(getProfileHistory(history, null).map((game) => game.id)).toEqual(["guest"]);
    expect(isGameVisibleForProfile(history[2], "profile-1")).toBe(false);
  });
});
