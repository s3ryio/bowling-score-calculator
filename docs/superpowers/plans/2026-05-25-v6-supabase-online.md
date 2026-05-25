# V6 Supabase Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase-backed online accounts, friend rankings, seasons, player profiles, and invite codes while preserving the existing offline/local mode.

**Architecture:** Keep the current scoring and local persistence untouched. Add an optional online layer under `lib/online/` plus a client component `OnlineClubPanel` that only activates when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured. Supabase stores profiles, groups, memberships, invites, games, and seasons; local play remains the source of truth until the user syncs saved games online.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS, Vitest, `@supabase/supabase-js`, Supabase Postgres/RLS.

---

### Task 1: Online Types And Pure Helpers

**Files:**
- Create: `types/online.ts`
- Create: `lib/online/online-utils.ts`
- Test: `tests/online-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Test username normalization, invite code creation, leaderboard ordering, and season filtering.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/online-utils.test.ts`

- [ ] **Step 3: Implement helpers**

Create typed helpers that do not depend on Supabase so ranking and season behavior is testable.

- [ ] **Step 4: Run tests**

Run: `npm test tests/online-utils.test.ts`

### Task 2: Supabase Client And Repository

**Files:**
- Create: `lib/online/supabase-client.ts`
- Create: `lib/online/supabase-service.ts`
- Create: `supabase/schema.sql`
- Create: `.env.example`

- [ ] **Step 1: Install dependency**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Implement optional browser client**

Return `null` when env vars are missing so local mode never breaks.

- [ ] **Step 3: Implement repository functions**

Add sign-up/login/logout, profile load/upsert, group creation, invite creation/acceptance, season creation, dashboard load, and saved-game sync.

- [ ] **Step 4: Add Supabase schema**

Create tables and RLS policies for profiles, friend groups, memberships, invites, games, seasons, and season games.

### Task 3: Online Club UI

**Files:**
- Create: `components/OnlineClubPanel.tsx`
- Modify: `components/Scoreboard.tsx`

- [ ] **Step 1: Build setup state**

If Supabase is not configured, show env setup instructions.

- [ ] **Step 2: Build auth state**

Allow online register/login with username, email, password.

- [ ] **Step 3: Build dashboard state**

Show online profile, friend ranking, active seasons, invites, and sync button.

- [ ] **Step 4: Connect primary player name**

When online profile is active, lock the first player name to the online username.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document Supabase setup**

Add env vars, schema instructions, and deploy notes.

- [ ] **Step 2: Verify**

Run `npm test`, `npm run lint`, `npm run build`, and a production asset check.
