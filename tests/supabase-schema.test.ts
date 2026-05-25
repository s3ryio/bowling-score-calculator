import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const schema = readFileSync("supabase/schema.sql", "utf8");

function policyBlock(policyName: string): string {
  const start = schema.indexOf(`create policy "${policyName}"`);
  const nextPolicy = schema.indexOf("\ndrop policy", start + 1);

  expect(start).toBeGreaterThanOrEqual(0);
  return schema.slice(start, nextPolicy === -1 ? undefined : nextPolicy);
}

describe("supabase schema", () => {
  test("keeps friend group member policies non-recursive", () => {
    expect(policyBlock("member_select_own_groups")).not.toContain("public.friend_groups");
    expect(policyBlock("member_insert_self")).not.toContain("public.friend_groups");
  });
});
