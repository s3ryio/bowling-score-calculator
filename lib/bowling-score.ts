import type {
  BowlingStats,
  FrameKind,
  FrameScore,
  GameScore,
  SavedGame,
  ValidationResult,
} from "@/types/bowling";

const FRAME_COUNT = 10;
const MAX_PINS = 10;

interface ParsedFrame {
  rolls: number[];
  startIndex: number;
  kind: FrameKind;
  isComplete: boolean;
}

const invalid = (message: string): ValidationResult => ({ isValid: false, message });

const valid: ValidationResult = { isValid: true };

export function validateRolls(rolls: number[]): ValidationResult {
  if (!Array.isArray(rolls)) {
    return invalid("La partida debe ser una lista de tiradas.");
  }

  for (const roll of rolls) {
    if (!Number.isInteger(roll)) {
      return invalid("Las tiradas deben ser números enteros.");
    }

    if (roll < 0) {
      return invalid("No puedes derribar menos de 0 bolos.");
    }

    if (roll > MAX_PINS) {
      return invalid("No puedes derribar más de 10 bolos en una tirada.");
    }
  }

  let cursor = 0;

  for (let frame = 0; frame < FRAME_COUNT - 1; frame += 1) {
    if (cursor >= rolls.length) {
      return valid;
    }

    const first = rolls[cursor];

    if (first === MAX_PINS) {
      cursor += 1;
      continue;
    }

    if (cursor + 1 >= rolls.length) {
      return valid;
    }

    const second = rolls[cursor + 1];
    if (first + second > MAX_PINS) {
      return invalid(`En el frame ${frame + 1}, la suma de tiradas no puede superar 10.`);
    }

    cursor += 2;
  }

  const tenth = rolls.slice(cursor);

  if (tenth.length === 0) {
    return valid;
  }

  if (tenth.length > 3) {
    return invalid("El décimo frame no puede tener más de 3 tiradas.");
  }

  const [first, second, third] = tenth;

  if (tenth.length === 1) {
    return valid;
  }

  if (first < MAX_PINS) {
    if (first + second > MAX_PINS) {
      return invalid("En el décimo frame, si no hay strike, las dos primeras tiradas no pueden superar 10.");
    }

    if (first + second < MAX_PINS && tenth.length > 2) {
      return invalid("Solo hay tirada extra en el décimo frame si hay strike o spare.");
    }

    return valid;
  }

  if (tenth.length === 2) {
    return valid;
  }

  if (second < MAX_PINS && second + third > MAX_PINS) {
    return invalid("Tras un strike en el décimo frame, las dos bolas extra no pueden superar 10 si la segunda no fue strike.");
  }

  return valid;
}

function parseFrames(rolls: number[]): ParsedFrame[] {
  const frames: ParsedFrame[] = [];
  let cursor = 0;

  for (let frame = 0; frame < FRAME_COUNT - 1; frame += 1) {
    const startIndex = cursor;

    if (cursor >= rolls.length) {
      frames.push({ rolls: [], startIndex, kind: "incomplete", isComplete: false });
      continue;
    }

    const first = rolls[cursor];

    if (first === MAX_PINS) {
      frames.push({ rolls: [first], startIndex, kind: "strike", isComplete: true });
      cursor += 1;
      continue;
    }

    if (cursor + 1 >= rolls.length) {
      frames.push({ rolls: [first], startIndex, kind: "incomplete", isComplete: false });
      cursor += 1;
      continue;
    }

    const second = rolls[cursor + 1];
    const kind: FrameKind = first + second === MAX_PINS ? "spare" : "open";
    frames.push({ rolls: [first, second], startIndex, kind, isComplete: true });
    cursor += 2;
  }

  const tenthRolls = rolls.slice(cursor, cursor + 3);
  frames.push({
    rolls: tenthRolls,
    startIndex: cursor,
    kind: getTenthFrameKind(tenthRolls),
    isComplete: isTenthFrameComplete(tenthRolls),
  });

  return frames;
}

function getTenthFrameKind(rolls: number[]): FrameKind {
  const [first, second] = rolls;

  if (rolls.length === 0) {
    return "incomplete";
  }

  if (first === MAX_PINS) {
    return rolls.length === 3 ? "strike" : "incomplete";
  }

  if (rolls.length < 2) {
    return "incomplete";
  }

  if (first + second === MAX_PINS) {
    return rolls.length === 3 ? "spare" : "incomplete";
  }

  return "open";
}

function isTenthFrameComplete(rolls: number[]): boolean {
  const [first, second] = rolls;

  if (rolls.length < 2) {
    return false;
  }

  if (first === MAX_PINS || first + second === MAX_PINS) {
    return rolls.length === 3;
  }

  return rolls.length === 2;
}

function frameSymbols(frame: ParsedFrame, frameIndex: number): string[] {
  const [first, second, third] = frame.rolls;

  if (frameIndex < FRAME_COUNT - 1) {
    if (first === undefined) {
      return ["", ""];
    }

    if (first === MAX_PINS) {
      return ["X", ""];
    }

    if (second === undefined) {
      return [formatPins(first), ""];
    }

    return [formatPins(first), first + second === MAX_PINS ? "/" : formatPins(second)];
  }

  const symbols: string[] = [];

  if (first !== undefined) {
    symbols.push(first === MAX_PINS ? "X" : formatPins(first));
  }

  if (second !== undefined) {
    if (first !== MAX_PINS && first + second === MAX_PINS) {
      symbols.push("/");
    } else {
      symbols.push(second === MAX_PINS ? "X" : formatPins(second));
    }
  }

  if (third !== undefined) {
    if (first === MAX_PINS && second !== MAX_PINS && second + third === MAX_PINS) {
      symbols.push("/");
    } else {
      symbols.push(third === MAX_PINS ? "X" : formatPins(third));
    }
  }

  return symbols;
}

function formatPins(pins: number): string {
  return pins === 0 ? "-" : String(pins);
}

function scoreFrame(frame: ParsedFrame, frameIndex: number, rolls: number[]): number | null {
  const [first, second] = frame.rolls;

  if (frameIndex === FRAME_COUNT - 1) {
    return frame.isComplete ? frame.rolls.reduce((sum, roll) => sum + roll, 0) : null;
  }

  if (!frame.isComplete) {
    return null;
  }

  if (first === MAX_PINS) {
    const bonus = rolls.slice(frame.startIndex + 1, frame.startIndex + 3);
    return bonus.length === 2 ? MAX_PINS + bonus[0] + bonus[1] : null;
  }

  if (first + second === MAX_PINS) {
    const bonus = rolls[frame.startIndex + 2];
    return bonus === undefined ? null : MAX_PINS + bonus;
  }

  return first + second;
}

export function calculateGameScore(rolls: number[]): GameScore {
  const validation = validateRolls(rolls);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const parsedFrames = parseFrames(rolls);
  let cumulative = 0;

  const frames: FrameScore[] = parsedFrames.map((frame, index) => {
    const frameScore = scoreFrame(frame, index, rolls);
    const cumulativeScore = frameScore === null ? null : cumulative + frameScore;

    if (cumulativeScore !== null) {
      cumulative = cumulativeScore;
    }

    return {
      frameNumber: index + 1,
      rolls: frame.rolls,
      symbols: frameSymbols(frame, index),
      kind: frame.kind,
      frameScore,
      cumulativeScore,
      isComplete: frame.isComplete,
    };
  });

  return {
    frames,
    total: cumulative,
    isComplete: frames[FRAME_COUNT - 1]?.isComplete ?? false,
    currentFrameIndex: getCurrentFrameIndex(frames),
    nextRollOptions: getNextRollOptions(rolls),
  };
}

function getCurrentFrameIndex(frames: FrameScore[]): number {
  const nextFrameIndex = frames.findIndex((frame) => !frame.isComplete);
  return nextFrameIndex === -1 ? FRAME_COUNT - 1 : nextFrameIndex;
}

export function isGameComplete(rolls: number[]): boolean {
  return validateRolls(rolls).isValid && parseFrames(rolls)[FRAME_COUNT - 1]?.isComplete === true;
}

export function getNextRollOptions(rolls: number[]): number[] {
  if (!validateRolls(rolls).isValid || isGameComplete(rolls)) {
    return [];
  }

  return Array.from({ length: MAX_PINS + 1 }, (_, pins) => pins).filter((pins) => {
    const result = validateRolls([...rolls, pins]);
    return result.isValid;
  });
}

export function addRoll(rolls: number[], pins: number): number[] {
  const nextRolls = [...rolls, pins];
  const validation = validateRolls(nextRolls);

  if (!validation.isValid) {
    throw new Error(`No puedes derribar ${pins} bolos ahora. ${validation.message}`);
  }

  if (isGameComplete(rolls)) {
    throw new Error("La partida ya está completa.");
  }

  return nextRolls;
}

export function removeLastRoll(rolls: number[]): number[] {
  return rolls.slice(0, -1);
}

export function createEmptyRolls(): number[] {
  return [];
}

export function summarizeRolls(rolls: number[]): string {
  return calculateGameScore(rolls)
    .frames.flatMap((frame) => frame.symbols.filter(Boolean))
    .join(" ");
}

export function countMarks(rolls: number[]): { strikes: number; spares: number } {
  const frames = calculateGameScore(rolls).frames;

  return frames.reduce(
    (counts, frame) => {
      if (frame.kind === "strike") {
        counts.strikes += 1;
      }

      if (frame.kind === "spare") {
        counts.spares += 1;
      }

      return counts;
    },
    { strikes: 0, spares: 0 },
  );
}

export function calculateStats(history: SavedGame[]): BowlingStats {
  const playerResults = history.flatMap((game) => game.players);
  const gamesPlayed = playerResults.length;
  const finalScore = (result: SavedGame["players"][number]) => result.adjustedScore ?? result.score;
  const totalScore = playerResults.reduce((sum, result) => sum + finalScore(result), 0);
  const totalStrikes = playerResults.reduce((sum, result) => sum + result.strikes, 0);
  const totalSpares = playerResults.reduce((sum, result) => sum + result.spares, 0);
  const frameOpportunities = gamesPlayed * FRAME_COUNT;

  return {
    gamesPlayed,
    bestScore: playerResults.reduce((best, result) => Math.max(best, finalScore(result)), 0),
    averageScore: gamesPlayed === 0 ? 0 : Math.round(totalScore / gamesPlayed),
    totalStrikes,
    totalSpares,
    strikePercentage: frameOpportunities === 0 ? 0 : Math.round((totalStrikes / frameOpportunities) * 100),
    sparePercentage: frameOpportunities === 0 ? 0 : Math.round((totalSpares / frameOpportunities) * 100),
    recentGames: history.slice(0, 5),
  };
}
