import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentOnlineUser, signUpOnline, syncSavedGamesToSupabase } from "@/lib/online/supabase-service";
import type { SavedGame } from "@/types/bowling";

function authClientWithGetUser(result: unknown): SupabaseClient {
  return {
    auth: {
      getUser: async () => result,
    },
  } as unknown as SupabaseClient;
}

function authClientWithSignUp(result: unknown): SupabaseClient {
  return {
    auth: {
      signUp: async () => result,
    },
  } as unknown as SupabaseClient;
}

describe("supabase service", () => {
  test("treats a missing auth session as a signed-out visitor", async () => {
    const client = authClientWithGetUser({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
    });

    await expect(getCurrentOnlineUser(client)).resolves.toBeNull();
  });

  test("treats signup without a returned user as pending email confirmation", async () => {
    const client = authClientWithSignUp({
      data: { user: null, session: null },
      error: null,
    });

    await expect(signUpOnline(client, {
      username: "seryio",
      email: "seryio@example.com",
      password: "secret123",
    })).resolves.toMatchObject({
      user: null,
      profile: null,
      requiresEmailConfirmation: true,
    });
  });

  test("syncs only 3D game results to the online ranking table", async () => {
    const upsertedRows: unknown[] = [];
    const client = {
      from: () => ({
        upsert: (rows: unknown[]) => {
          upsertedRows.push(...rows);
          return { error: null };
        },
      }),
    } as unknown as SupabaseClient;
    const manualGame: SavedGame = {
      id: "manual-1",
      date: "2026-05-26T10:00:00.000Z",
      source: "calculator",
      winningScore: 300,
      players: [],
    };
    const game3d: SavedGame = {
      id: "game3d-1",
      date: "2026-05-26T11:00:00.000Z",
      source: "game3d",
      winningScore: 210,
      players: [{ id: "p1", name: "Seryio", rolls: [], score: 210, summary: "X 9 /", strikes: 1, spares: 1 }],
    };

    await expect(syncSavedGamesToSupabase(client, {
      userId: "user-1",
      history: [manualGame, game3d],
      groupId: "group-1",
      seasonId: "season-1",
    })).resolves.toBe(1);

    expect(upsertedRows).toHaveLength(1);
    expect(upsertedRows[0]).toMatchObject({
      owner_id: "user-1",
      local_id: "game3d-1",
      score: 210,
      payload: { source: "game3d" },
    });
  });
});
