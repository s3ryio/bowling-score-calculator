import { describe, expect, test } from "vitest";

import {
  createGame3DSavedGame,
  createGame3DSession,
  getGame3DNextShot,
  isGame3DSavedGame,
  recordGame3DShot,
} from "@/lib/game/bowling-game-session";

describe("3D bowling game session", () => {
  test("keeps standing pins for the second roll of an open frame", () => {
    let session = createGame3DSession("Seryio", "2026-05-26T10:00:00.000Z");

    const first = recordGame3DShot(session, 4);
    session = first.session;

    expect(first.rollPins).toBe(4);
    expect(first.resetRack).toBe(false);
    expect(first.resetBall).toBe(true);
    expect(getGame3DNextShot(session)).toMatchObject({
      frameNumber: 1,
      rollNumber: 2,
      previousKnockedPins: 4,
      standingPins: 6,
    });

    const second = recordGame3DShot(session, 9);

    expect(second.rollPins).toBe(5);
    expect(second.session.rolls).toEqual([4, 5]);
    expect(second.resetRack).toBe(true);
    expect(getGame3DNextShot(second.session)).toMatchObject({ frameNumber: 2, rollNumber: 1 });
  });

  test("resets the rack after a strike before the next frame", () => {
    const session = createGame3DSession("Seryio", "2026-05-26T10:00:00.000Z");
    const result = recordGame3DShot(session, 10);

    expect(result.rollPins).toBe(10);
    expect(result.session.rolls).toEqual([10]);
    expect(result.resetRack).toBe(true);
    expect(getGame3DNextShot(result.session)).toMatchObject({
      frameNumber: 2,
      rollNumber: 1,
      standingPins: 10,
    });
  });

  test("handles tenth-frame spare and bonus ball", () => {
    let session = createGame3DSession("Seryio", "2026-05-26T10:00:00.000Z");
    for (let frame = 0; frame < 9; frame += 1) {
      session = recordGame3DShot(session, 0).session;
      session = recordGame3DShot(session, 0).session;
    }

    session = recordGame3DShot(session, 7).session;
    const spare = recordGame3DShot(session, 10);
    session = spare.session;

    expect(spare.rollPins).toBe(3);
    expect(spare.resetRack).toBe(true);
    expect(getGame3DNextShot(session)).toMatchObject({
      frameNumber: 10,
      rollNumber: 3,
      standingPins: 10,
    });

    const bonus = recordGame3DShot(session, 5);

    expect(bonus.rollPins).toBe(5);
    expect(bonus.session.rolls.slice(-3)).toEqual([7, 3, 5]);
    expect(bonus.session.isComplete).toBe(true);
    expect(bonus.session.score.total).toBe(15);
  });

  test("builds a saved game tagged as game3d when complete", () => {
    let session = createGame3DSession("Seryio", "2026-05-26T10:00:00.000Z");
    for (let index = 0; index < 12; index += 1) {
      session = recordGame3DShot(session, 10).session;
    }

    const saved = createGame3DSavedGame(session, "saved-1", "2026-05-26T10:20:00.000Z");

    expect(saved.source).toBe("game3d");
    expect(saved.winningScore).toBe(300);
    expect(saved.players[0]?.name).toBe("Seryio");
    expect(isGame3DSavedGame(saved)).toBe(true);
  });
});
