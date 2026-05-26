import {
  addRoll,
  calculateGameScore,
  countMarks,
  summarizeRolls,
} from "@/lib/bowling-score";
import type { GameScore, SavedGame } from "@/types/bowling";

export interface Game3DSession {
  id: string;
  playerName: string;
  rolls: number[];
  createdAt: string;
  isComplete: boolean;
  score: GameScore;
}

export interface Game3DNextShot {
  frameNumber: number;
  rollNumber: 1 | 2 | 3;
  standingPins: number;
  previousKnockedPins: number;
  isComplete: boolean;
}

export interface Game3DRollResult {
  session: Game3DSession;
  rollPins: number;
  knockedPinsTotal: number;
  resetBall: boolean;
  resetRack: boolean;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `game3d-${crypto.randomUUID()}`;
  }

  return `game3d-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizePins(value: number): number {
  return clamp(Math.round(Number.isFinite(value) ? value : 0), 0, 10);
}

function createSession(id: string, playerName: string, createdAt: string, rolls: number[]): Game3DSession {
  const score = calculateGameScore(rolls);
  return {
    id,
    playerName: playerName.trim() || "Jugador",
    rolls,
    createdAt,
    isComplete: score.isComplete,
    score,
  };
}

function getCurrentFrameRolls(rolls: number[]): { frameIndex: number; frameRolls: number[] } {
  let cursor = 0;

  for (let frameIndex = 0; frameIndex < 9; frameIndex += 1) {
    if (cursor >= rolls.length) {
      return { frameIndex, frameRolls: [] };
    }

    if (rolls[cursor] === 10) {
      cursor += 1;
      continue;
    }

    if (cursor + 1 >= rolls.length) {
      return { frameIndex, frameRolls: [rolls[cursor]] };
    }

    cursor += 2;
  }

  return { frameIndex: 9, frameRolls: rolls.slice(cursor) };
}

export function createGame3DSession(playerName = "Jugador", now = new Date().toISOString()): Game3DSession {
  return createSession(createSessionId(), playerName, now, []);
}

export function getGame3DNextShot(session: Game3DSession): Game3DNextShot {
  if (session.isComplete) {
    return {
      frameNumber: 10,
      rollNumber: 3,
      standingPins: 0,
      previousKnockedPins: 10,
      isComplete: true,
    };
  }

  const { frameIndex, frameRolls } = getCurrentFrameRolls(session.rolls);

  if (frameIndex < 9) {
    if (frameRolls.length === 0) {
      return {
        frameNumber: frameIndex + 1,
        rollNumber: 1,
        standingPins: 10,
        previousKnockedPins: 0,
        isComplete: false,
      };
    }

    const previousKnockedPins = frameRolls[0];
    return {
      frameNumber: frameIndex + 1,
      rollNumber: 2,
      standingPins: 10 - previousKnockedPins,
      previousKnockedPins,
      isComplete: false,
    };
  }

  const [first = 0, second = 0] = frameRolls;

  if (frameRolls.length === 0) {
    return {
      frameNumber: 10,
      rollNumber: 1,
      standingPins: 10,
      previousKnockedPins: 0,
      isComplete: false,
    };
  }

  if (frameRolls.length === 1) {
    const firstWasStrike = first === 10;
    return {
      frameNumber: 10,
      rollNumber: 2,
      standingPins: firstWasStrike ? 10 : 10 - first,
      previousKnockedPins: firstWasStrike ? 0 : first,
      isComplete: false,
    };
  }

  if (first === 10) {
    const secondWasStrike = second === 10;
    return {
      frameNumber: 10,
      rollNumber: 3,
      standingPins: secondWasStrike ? 10 : 10 - second,
      previousKnockedPins: secondWasStrike ? 0 : second,
      isComplete: false,
    };
  }

  if (first + second === 10) {
    return {
      frameNumber: 10,
      rollNumber: 3,
      standingPins: 10,
      previousKnockedPins: 0,
      isComplete: false,
    };
  }

  return {
    frameNumber: 10,
    rollNumber: 2,
    standingPins: 0,
    previousKnockedPins: 10,
    isComplete: true,
  };
}

function shouldResetRackAfterRoll(before: Game3DNextShot, rollPins: number, nextSession: Game3DSession): boolean {
  if (nextSession.isComplete) {
    return false;
  }

  if (before.frameNumber < 10) {
    return before.rollNumber === 2 || rollPins === 10;
  }

  if (before.rollNumber === 1) {
    return rollPins === 10;
  }

  if (before.rollNumber === 2) {
    const tenthFrame = getCurrentFrameRolls(nextSession.rolls).frameRolls;
    const [first = 0, second = 0] = tenthFrame;
    return (first === 10 && second === 10) || (first < 10 && first + second === 10);
  }

  return false;
}

export function recordGame3DShot(session: Game3DSession, knockedPinsTotal: number): Game3DRollResult {
  const nextShot = getGame3DNextShot(session);

  if (nextShot.isComplete || nextShot.standingPins <= 0) {
    return {
      session,
      rollPins: 0,
      knockedPinsTotal: nextShot.previousKnockedPins,
      resetBall: false,
      resetRack: false,
    };
  }

  const total = clamp(normalizePins(knockedPinsTotal), nextShot.previousKnockedPins, 10);
  const rollPins = clamp(total - nextShot.previousKnockedPins, 0, nextShot.standingPins);
  const rolls = addRoll(session.rolls, rollPins);
  const nextSession = createSession(session.id, session.playerName, session.createdAt, rolls);
  const resetRack = shouldResetRackAfterRoll(nextShot, rollPins, nextSession);

  return {
    session: nextSession,
    rollPins,
    knockedPinsTotal: total,
    resetBall: !nextSession.isComplete,
    resetRack,
  };
}

export function createGame3DSavedGame(
  session: Game3DSession,
  id = createSessionId().replace(/^game3d-/, "saved-game3d-"),
  date = new Date().toISOString(),
): SavedGame {
  if (!session.isComplete) {
    throw new Error("Solo se puede guardar una partida 3D completa.");
  }

  const score = calculateGameScore(session.rolls);
  const marks = countMarks(session.rolls);

  return {
    id,
    date,
    mode: "classic",
    source: "game3d",
    winningScore: score.total,
    players: [
      {
        id: session.id,
        name: session.playerName,
        rolls: session.rolls,
        score: score.total,
        summary: summarizeRolls(session.rolls),
        strikes: marks.strikes,
        spares: marks.spares,
      },
    ],
  };
}

export function isGame3DSavedGame(game: SavedGame): boolean {
  return game.source === "game3d";
}
