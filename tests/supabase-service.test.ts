import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentOnlineUser, signUpOnline } from "@/lib/online/supabase-service";

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
});
