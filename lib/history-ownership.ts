import type { SavedGame } from "@/types/bowling";

export function attachGameOwner(game: SavedGame, profileId: string | null): SavedGame {
  if (!profileId) {
    const guestGame = { ...game };
    delete guestGame.ownerId;
    return guestGame;
  }

  return { ...game, ownerId: profileId };
}

export function isGameVisibleForProfile(game: SavedGame, profileId: string | null): boolean {
  if (!profileId) {
    return !game.ownerId;
  }

  return game.ownerId === profileId || !game.ownerId;
}

export function getProfileHistory(history: SavedGame[], profileId: string | null): SavedGame[] {
  return history.filter((game) => isGameVisibleForProfile(game, profileId));
}
