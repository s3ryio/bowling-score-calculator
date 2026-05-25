import { describe, expect, test } from "vitest";

import {
  attachGameOwner,
  claimGuestHistory,
  getAccountHistory,
  getSessionAccount,
  loginLocalAccount,
  registerLocalAccount,
} from "@/lib/auth";
import type { AuthSession, SavedGame, UserAccount } from "@/types/bowling";

const savedGame: SavedGame = {
  id: "saved-1",
  date: "2026-05-24T10:00:00.000Z",
  players: [],
  winningScore: 212,
  mode: "classic",
};

describe("local auth", () => {
  test("registers a normalized account and creates a session", () => {
    const result = registerLocalAccount([], {
      id: "user-1",
      name: "  Ana  ",
      email: " ANA@Example.COM ",
      password: "secret12",
      now: "2026-05-24T10:00:00.000Z",
    });

    expect(result.account).toMatchObject({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      createdAt: "2026-05-24T10:00:00.000Z",
      lastLoginAt: "2026-05-24T10:00:00.000Z",
    });
    expect(result.account.passwordHash).not.toBe("secret12");
    expect(result.session).toEqual({
      userId: "user-1",
      startedAt: "2026-05-24T10:00:00.000Z",
    });
  });

  test("rejects duplicate emails and invalid login credentials", () => {
    const registered = registerLocalAccount([], {
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      password: "secret12",
      now: "2026-05-24T10:00:00.000Z",
    });

    expect(() =>
      registerLocalAccount(registered.accounts, {
        id: "user-2",
        name: "Ana 2",
        email: "ANA@example.com",
        password: "secret12",
        now: "2026-05-24T10:01:00.000Z",
      }),
    ).toThrow("Ya existe una cuenta con ese email.");

    expect(() =>
      loginLocalAccount(registered.accounts, {
        email: "ana@example.com",
        password: "badpass",
        now: "2026-05-24T10:02:00.000Z",
      }),
    ).toThrow("Email o contraseña incorrectos.");
  });

  test("logs in and resolves the current session account", () => {
    const registered = registerLocalAccount([], {
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      password: "secret12",
      now: "2026-05-24T10:00:00.000Z",
    });

    const loggedIn = loginLocalAccount(registered.accounts, {
      email: "ANA@example.com",
      password: "secret12",
      now: "2026-05-24T10:03:00.000Z",
    });

    expect(loggedIn.session).toEqual({
      userId: "user-1",
      startedAt: "2026-05-24T10:03:00.000Z",
    });
    expect(getSessionAccount(loggedIn.accounts, loggedIn.session)?.email).toBe("ana@example.com");
  });

  test("stores saved games by account and can claim guest history", () => {
    const registeredAccounts: UserAccount[] = [
      {
        id: "user-1",
        name: "Ana",
        email: "ana@example.com",
        passwordHash: "hash",
        createdAt: "2026-05-24T10:00:00.000Z",
        lastLoginAt: "2026-05-24T10:00:00.000Z",
      },
    ];
    const session: AuthSession = { userId: "user-1", startedAt: "2026-05-24T10:00:00.000Z" };
    expect(getSessionAccount(registeredAccounts, session)?.name).toBe("Ana");
    const ownedGame = attachGameOwner(savedGame, session.userId);
    const otherGame = attachGameOwner({ ...savedGame, id: "saved-2" }, "other-user");
    const guestGame = { ...savedGame, id: "saved-3" };

    expect(getAccountHistory([ownedGame, otherGame, guestGame], session.userId).map((game) => game.id)).toEqual([
      "saved-1",
    ]);
    expect(getAccountHistory([ownedGame, otherGame, guestGame], null).map((game) => game.id)).toEqual(["saved-3"]);
    expect(claimGuestHistory([ownedGame, guestGame], session.userId).map((game) => game.ownerId)).toEqual([
      "user-1",
      "user-1",
    ]);
  });

  test("preserves saved game metadata when keeping it as guest history", () => {
    const guestGame = attachGameOwner(savedGame, null);

    expect(guestGame).toEqual(savedGame);
  });
});
