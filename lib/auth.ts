import type { AuthSession, SavedGame, UserAccount } from "@/types/bowling";

interface RegisterInput {
  id: string;
  name: string;
  email: string;
  password: string;
  now: string;
}

interface LoginInput {
  email: string;
  password: string;
  now: string;
}

interface AuthResult {
  accounts: UserAccount[];
  account: UserAccount;
  session: AuthSession;
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("es");
}

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Introduce un email válido.");
  }
}

function validatePassword(password: string): void {
  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }
}

export function hashLocalPassword(email: string, password: string): string {
  const input = `${normalizeEmail(email)}:${password}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `local-v1-${(hash >>> 0).toString(16)}`;
}

export function registerLocalAccount(accounts: UserAccount[], input: RegisterInput): AuthResult {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (name.length < 2) {
    throw new Error("El nombre debe tener al menos 2 caracteres.");
  }

  validateEmail(email);
  validatePassword(input.password);

  if (accounts.some((account) => account.email === email)) {
    throw new Error("Ya existe una cuenta con ese email.");
  }

  const account: UserAccount = {
    id: input.id,
    name,
    email,
    passwordHash: hashLocalPassword(email, input.password),
    createdAt: input.now,
    lastLoginAt: input.now,
  };
  const session: AuthSession = { userId: account.id, startedAt: input.now };

  return {
    accounts: [...accounts, account],
    account,
    session,
  };
}

export function loginLocalAccount(accounts: UserAccount[], input: LoginInput): AuthResult {
  const email = normalizeEmail(input.email);
  const passwordHash = hashLocalPassword(email, input.password);
  const account = accounts.find((candidate) => candidate.email === email && candidate.passwordHash === passwordHash);

  if (!account) {
    throw new Error("Email o contraseña incorrectos.");
  }

  const updatedAccount: UserAccount = { ...account, lastLoginAt: input.now };
  const session: AuthSession = { userId: account.id, startedAt: input.now };

  return {
    accounts: accounts.map((candidate) => (candidate.id === account.id ? updatedAccount : candidate)),
    account: updatedAccount,
    session,
  };
}

export function getSessionAccount(accounts: UserAccount[], session: AuthSession | null): UserAccount | null {
  if (!session) {
    return null;
  }

  return accounts.find((account) => account.id === session.userId) ?? null;
}

export function attachGameOwner(game: SavedGame, userId: string | null): SavedGame {
  if (!userId) {
    const guestGame = { ...game };
    delete guestGame.ownerId;
    return guestGame;
  }

  return { ...game, ownerId: userId };
}

export function getAccountHistory(history: SavedGame[], userId: string | null): SavedGame[] {
  return history.filter((game) => (userId ? game.ownerId === userId : !game.ownerId));
}

export function claimGuestHistory(history: SavedGame[], userId: string): SavedGame[] {
  return history.map((game) => (game.ownerId ? game : { ...game, ownerId: userId }));
}
