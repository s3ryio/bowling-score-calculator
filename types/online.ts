export interface OnlineProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface OnlineFriendGroup {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  createdAt: string;
}

export interface OnlineGroupMember {
  groupId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface OnlineInvite {
  id: string;
  groupId: string;
  code: string;
  createdBy: string;
  expiresAt: string | null;
  usedBy?: string | null;
  usedAt?: string | null;
  createdAt: string;
}

export interface OnlineSeason {
  id: string;
  groupId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface OnlineGameRow {
  id: string;
  ownerId: string;
  groupId?: string | null;
  seasonId?: string | null;
  score: number;
  summary: string;
  playedAt: string;
}

export interface OnlineLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  rank: number;
  gamesPlayed: number;
  bestScore: number;
  averageScore: number;
  lastScore: number;
}

export interface OnlineDashboard {
  profile: OnlineProfile;
  groups: OnlineFriendGroup[];
  seasons: OnlineSeason[];
  invites: OnlineInvite[];
  games: OnlineGameRow[];
  leaderboard: OnlineLeaderboardEntry[];
}
