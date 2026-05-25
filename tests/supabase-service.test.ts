import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentOnlineUser } from "@/lib/online/supabase-service";

function authClientWithGetUser(result: unknown): SupabaseClient {
  return {
    auth: {
      getUser: async () => result,
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
});
