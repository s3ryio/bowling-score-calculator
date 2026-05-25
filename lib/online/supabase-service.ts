import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createInviteCode, sanitizeUsername, buildOnlineLeaderboard } from "@/lib/online/online-utils";
import type { SavedGame } from "@/types/bowling";
import type {
  OnlineDashboard,
  OnlineFriendGroup,
  OnlineGameRow,
  OnlineInvite,
  OnlineProfile,
  OnlineSeason,
} from "@/types/online";

interface ProfileRecord {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface GroupRecord {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  created_at: string;
}

interface MembershipRecord {
  group_id: string;
  user_id: string;
}

interface InviteRecord {
  id: string;
  group_id: string;
  code: string;
  created_by: string;
  expires_at: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

interface SeasonRecord {
  id: string;
  group_id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

interface GameRecord {
  id: string;
  owner_id: string;
  group_id: string | null;
  season_id: string | null;
  score: number;
  summary: string | null;
  played_at: string;
}

export interface OnlineAuthInput {
  username: string;
  email: string;
  password: string;
}

export interface OnlineAuthResult {
  user: User | null;
  profile: OnlineProfile | null;
  requiresEmailConfirmation?: boolean;
}

function mapProfile(record: ProfileRecord): OnlineProfile {
  return {
    id: record.id,
    username: record.username,
    displayName: record.display_name ?? record.username,
    avatarUrl: record.avatar_url,
    createdAt: record.created_at,
  };
}

function mapGroup(record: GroupRecord): OnlineFriendGroup {
  return {
    id: record.id,
    name: record.name,
    ownerId: record.owner_id,
    joinCode: record.join_code,
    createdAt: record.created_at,
  };
}

function mapInvite(record: InviteRecord): OnlineInvite {
  return {
    id: record.id,
    groupId: record.group_id,
    code: record.code,
    createdBy: record.created_by,
    expiresAt: record.expires_at,
    usedBy: record.used_by,
    usedAt: record.used_at,
    createdAt: record.created_at,
  };
}

function mapSeason(record: SeasonRecord): OnlineSeason {
  return {
    id: record.id,
    groupId: record.group_id,
    name: record.name,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    createdAt: record.created_at,
  };
}

function mapGame(record: GameRecord): OnlineGameRow {
  return {
    id: record.id,
    ownerId: record.owner_id,
    groupId: record.group_id,
    seasonId: record.season_id,
    score: record.score,
    summary: record.summary ?? "",
    playedAt: record.played_at,
  };
}

function assertUsername(username: string): string {
  const sanitized = sanitizeUsername(username);
  if (sanitized.length < 2) {
    throw new Error("El nombre de usuario online debe tener al menos 2 caracteres.");
  }
  return sanitized;
}

interface SupabaseServiceError {
  message: string;
  name?: string;
}

function isMissingAuthSessionError(error: SupabaseServiceError | null): boolean {
  return error?.name === "AuthSessionMissingError" || error?.message === "Auth session missing!";
}

function throwSupabaseError(error: SupabaseServiceError | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentOnlineUser(client: SupabaseClient): Promise<User | null> {
  const { data, error } = await client.auth.getUser();
  if (isMissingAuthSessionError(error)) {
    return null;
  }
  throwSupabaseError(error);
  return data.user ?? null;
}

export async function loadOnlineProfile(client: SupabaseClient, userId: string): Promise<OnlineProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  throwSupabaseError(error);
  return data ? mapProfile(data as ProfileRecord) : null;
}

export async function upsertOnlineProfile(
  client: SupabaseClient,
  input: { userId: string; username: string; displayName?: string },
): Promise<OnlineProfile> {
  const username = assertUsername(input.username);
  const displayName = input.displayName?.trim() || username;
  const { data, error } = await client
    .from("profiles")
    .upsert({
      id: input.userId,
      username,
      display_name: displayName,
    })
    .select("id, username, display_name, avatar_url, created_at")
    .single();

  throwSupabaseError(error);
  return mapProfile(data as ProfileRecord);
}

export async function signUpOnline(client: SupabaseClient, input: OnlineAuthInput): Promise<OnlineAuthResult> {
  const username = assertUsername(input.username);
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        username,
        display_name: username,
      },
    },
  });

  throwSupabaseError(error);
  if (!data.user || !data.session) {
    return {
      user: null,
      profile: null,
      requiresEmailConfirmation: true,
    };
  }

  const profile = await upsertOnlineProfile(client, {
    userId: data.user.id,
    username,
    displayName: username,
  });

  return { user: data.user, profile, requiresEmailConfirmation: false };
}

export async function signInOnline(
  client: SupabaseClient,
  input: Pick<OnlineAuthInput, "email" | "password">,
): Promise<OnlineAuthResult> {
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  throwSupabaseError(error);
  if (!data.user) {
    throw new Error("No se pudo iniciar sesión.");
  }

  return {
    user: data.user,
    profile: await loadOnlineProfile(client, data.user.id),
  };
}

export async function signOutOnline(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  throwSupabaseError(error);
}

export async function createFriendGroup(
  client: SupabaseClient,
  input: { userId: string; name: string },
): Promise<OnlineFriendGroup> {
  const name = input.name.trim() || "Mi club de bowling";
  const joinCode = createInviteCode(input.userId, name, new Date().toISOString());
  const { data, error } = await client
    .from("friend_groups")
    .insert({
      name,
      owner_id: input.userId,
      join_code: joinCode,
    })
    .select("id, name, owner_id, join_code, created_at")
    .single();

  throwSupabaseError(error);
  const group = mapGroup(data as GroupRecord);

  const membership = await client.from("friend_group_members").insert({
    group_id: group.id,
    user_id: input.userId,
    role: "owner",
  });
  throwSupabaseError(membership.error);

  return group;
}

export async function createOnlineInvite(
  client: SupabaseClient,
  input: { userId: string; groupId: string },
): Promise<OnlineInvite> {
  const code = createInviteCode(input.groupId, input.userId, new Date().toISOString());
  const { data, error } = await client
    .from("invites")
    .insert({
      group_id: input.groupId,
      code,
      created_by: input.userId,
    })
    .select("id, group_id, code, created_by, expires_at, used_by, used_at, created_at")
    .single();

  throwSupabaseError(error);
  return mapInvite(data as InviteRecord);
}

export async function acceptOnlineInvite(
  client: SupabaseClient,
  input: { userId: string; code: string },
): Promise<void> {
  const { data, error } = await client
    .from("invites")
    .select("id, group_id, code, created_by, expires_at, used_by, used_at, created_at")
    .eq("code", input.code.trim().toUpperCase())
    .is("used_at", null)
    .maybeSingle();

  throwSupabaseError(error);
  if (!data) {
    throw new Error("Invitación no válida o ya usada.");
  }

  const invite = data as InviteRecord;
  const membership = await client.from("friend_group_members").upsert({
    group_id: invite.group_id,
    user_id: input.userId,
    role: "member",
  });
  throwSupabaseError(membership.error);

  const update = await client
    .from("invites")
    .update({
      used_by: input.userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", invite.id);
  throwSupabaseError(update.error);
}

export async function createOnlineSeason(
  client: SupabaseClient,
  input: { groupId: string; name: string; startsAt: string; endsAt: string },
): Promise<OnlineSeason> {
  const name = input.name.trim() || "Temporada";
  const { data, error } = await client
    .from("seasons")
    .insert({
      group_id: input.groupId,
      name,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    })
    .select("id, group_id, name, starts_at, ends_at, created_at")
    .single();

  throwSupabaseError(error);
  return mapSeason(data as SeasonRecord);
}

export async function syncSavedGamesToSupabase(
  client: SupabaseClient,
  input: {
    userId: string;
    history: SavedGame[];
    groupId?: string | null;
    seasonId?: string | null;
  },
): Promise<number> {
  if (input.history.length === 0) {
    return 0;
  }

  const rows = input.history.map((game) => ({
    owner_id: input.userId,
    local_id: game.id,
    group_id: input.groupId ?? null,
    season_id: input.seasonId ?? null,
    score: game.winningScore,
    summary: game.players[0]?.summary ?? "",
    played_at: game.date,
    payload: game,
  }));

  const { error } = await client
    .from("games")
    .upsert(rows, { onConflict: "owner_id,local_id" });

  throwSupabaseError(error);
  return rows.length;
}

export async function loadOnlineDashboard(client: SupabaseClient, userId: string): Promise<OnlineDashboard | null> {
  const profile = await loadOnlineProfile(client, userId);
  if (!profile) {
    return null;
  }

  const membershipsResult = await client
    .from("friend_group_members")
    .select("group_id, user_id")
    .eq("user_id", userId);
  throwSupabaseError(membershipsResult.error);
  const memberships = (membershipsResult.data ?? []) as MembershipRecord[];
  const groupIds = memberships.map((membership) => membership.group_id);

  const groupsResult = groupIds.length > 0
    ? await client
        .from("friend_groups")
        .select("id, name, owner_id, join_code, created_at")
        .in("id", groupIds)
    : { data: [], error: null };
  throwSupabaseError(groupsResult.error);
  const groups = ((groupsResult.data ?? []) as GroupRecord[]).map(mapGroup);

  const seasonsResult = groupIds.length > 0
    ? await client
        .from("seasons")
        .select("id, group_id, name, starts_at, ends_at, created_at")
        .in("group_id", groupIds)
        .order("starts_at", { ascending: false })
    : { data: [], error: null };
  throwSupabaseError(seasonsResult.error);
  const seasons = ((seasonsResult.data ?? []) as SeasonRecord[]).map(mapSeason);

  const invitesResult = groupIds.length > 0
    ? await client
        .from("invites")
        .select("id, group_id, code, created_by, expires_at, used_by, used_at, created_at")
        .in("group_id", groupIds)
        .is("used_at", null)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  throwSupabaseError(invitesResult.error);
  const invites = ((invitesResult.data ?? []) as InviteRecord[]).map(mapInvite);

  const gamesResult = groupIds.length > 0
    ? await client
        .from("games")
        .select("id, owner_id, group_id, season_id, score, summary, played_at")
        .in("group_id", groupIds)
        .order("played_at", { ascending: false })
    : await client
        .from("games")
        .select("id, owner_id, group_id, season_id, score, summary, played_at")
        .eq("owner_id", userId)
        .order("played_at", { ascending: false });
  throwSupabaseError(gamesResult.error);
  const games = ((gamesResult.data ?? []) as GameRecord[]).map(mapGame);
  const ownerIds = Array.from(new Set(games.map((game) => game.ownerId)));

  const profilesResult = ownerIds.length > 0
    ? await client
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .in("id", ownerIds)
    : { data: [], error: null };
  throwSupabaseError(profilesResult.error);
  const leaderboardProfiles = ((profilesResult.data ?? []) as ProfileRecord[]).map(mapProfile);

  return {
    profile,
    groups,
    seasons,
    invites,
    games,
    leaderboard: buildOnlineLeaderboard(games, leaderboardProfiles),
  };
}
