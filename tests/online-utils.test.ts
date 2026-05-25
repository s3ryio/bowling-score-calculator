import { describe, expect, test } from "vitest";

import {
  buildOnlineLeaderboard,
  createInviteCode,
  getActiveSeasons,
  sanitizeUsername,
} from "@/lib/online/online-utils";
import type { OnlineGameRow, OnlineProfile, OnlineSeason } from "@/types/online";

const profiles: OnlineProfile[] = [
  {
    id: "u1",
    username: "ana",
    displayName: "Ana",
    createdAt: "2026-05-20T10:00:00.000Z",
  },
  {
    id: "u2",
    username: "luis",
    displayName: "Luis",
    createdAt: "2026-05-20T10:00:00.000Z",
  },
];

const games: OnlineGameRow[] = [
  {
    id: "g1",
    ownerId: "u1",
    score: 180,
    summary: "X 8 /",
    playedAt: "2026-05-22T20:00:00.000Z",
  },
  {
    id: "g2",
    ownerId: "u1",
    score: 220,
    summary: "X X 9 /",
    playedAt: "2026-05-24T20:00:00.000Z",
  },
  {
    id: "g3",
    ownerId: "u2",
    score: 210,
    summary: "9 / X",
    playedAt: "2026-05-23T20:00:00.000Z",
  },
];

describe("online utils", () => {
  test("sanitizes usernames for public profiles", () => {
    expect(sanitizeUsername("  Ana Núñez!!  ")).toBe("ana-nunez");
    expect(sanitizeUsername("A")).toBe("a");
    expect(sanitizeUsername("___")).toBe("");
  });

  test("creates deterministic invite codes from a seed", () => {
    expect(createInviteCode("group-1", "2026-05-25")).toBe(createInviteCode("group-1", "2026-05-25"));
    expect(createInviteCode("group-1", "2026-05-25")).toHaveLength(8);
  });

  test("builds friend leaderboard by best score and average", () => {
    expect(buildOnlineLeaderboard(games, profiles)).toEqual([
      {
        userId: "u1",
        username: "ana",
        displayName: "Ana",
        rank: 1,
        gamesPlayed: 2,
        bestScore: 220,
        averageScore: 200,
        lastScore: 220,
      },
      {
        userId: "u2",
        username: "luis",
        displayName: "Luis",
        rank: 2,
        gamesPlayed: 1,
        bestScore: 210,
        averageScore: 210,
        lastScore: 210,
      },
    ]);
  });

  test("filters active seasons by date boundaries", () => {
    const seasons: OnlineSeason[] = [
      {
        id: "s1",
        groupId: "group",
        name: "Primavera",
        startsAt: "2026-03-01T00:00:00.000Z",
        endsAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "s2",
        groupId: "group",
        name: "Verano",
        startsAt: "2026-06-01T00:00:00.000Z",
        endsAt: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ];

    expect(getActiveSeasons(seasons, "2026-05-25T12:00:00.000Z").map((season) => season.id)).toEqual(["s1"]);
  });
});
