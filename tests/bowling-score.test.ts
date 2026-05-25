import { describe, expect, test } from "vitest";

import {
  addRoll,
  calculateGameScore,
  getNextRollOptions,
  isGameComplete,
  validateRolls,
} from "@/lib/bowling-score";

const repeat = (value: number, count: number) => Array.from({ length: count }, () => value);

describe("bowling scoring", () => {
  test("scores a gutter game as 0", () => {
    expect(calculateGameScore(repeat(0, 20)).total).toBe(0);
  });

  test("scores all ones as 20", () => {
    expect(calculateGameScore(repeat(1, 20)).total).toBe(20);
  });

  test("scores a spare followed by 5 as 15 for that frame", () => {
    const result = calculateGameScore([5, 5, 5, 0, ...repeat(0, 16)]);
    expect(result.frames[0]?.frameScore).toBe(15);
    expect(result.frames[0]?.cumulativeScore).toBe(15);
  });

  test("scores a strike followed by 4 and 3 as 17 for that frame", () => {
    const result = calculateGameScore([10, 4, 3, ...repeat(0, 16)]);
    expect(result.frames[0]?.frameScore).toBe(17);
    expect(result.frames[0]?.cumulativeScore).toBe(17);
  });

  test("scores a perfect game as 300", () => {
    const result = calculateGameScore(repeat(10, 12));
    expect(result.total).toBe(300);
    expect(result.isComplete).toBe(true);
  });

  test("scores all 5 spares with bonus 5 as 150", () => {
    const rolls = [...Array.from({ length: 10 }, () => [5, 5]).flat(), 5];
    expect(calculateGameScore(rolls).total).toBe(150);
  });

  test("handles frame 10 spare with one bonus roll", () => {
    const rolls = [...repeat(0, 18), 4, 6, 7];
    const result = calculateGameScore(rolls);
    expect(result.frames[9]?.frameScore).toBe(17);
    expect(result.total).toBe(17);
    expect(result.isComplete).toBe(true);
  });

  test("handles frame 10 strike with two bonus rolls", () => {
    const rolls = [...repeat(0, 18), 10, 7, 2];
    const result = calculateGameScore(rolls);
    expect(result.frames[9]?.frameScore).toBe(19);
    expect(result.total).toBe(19);
    expect(result.isComplete).toBe(true);
  });

  test("scores two consecutive strikes correctly", () => {
    const result = calculateGameScore([10, 10, 4, 3, ...repeat(0, 14)]);
    expect(result.frames[0]?.frameScore).toBe(24);
    expect(result.frames[1]?.frameScore).toBe(17);
    expect(result.total).toBe(48);
  });

  test("scores three consecutive strikes correctly", () => {
    const result = calculateGameScore([10, 10, 10, ...repeat(0, 14)]);
    expect(result.frames[0]?.frameScore).toBe(30);
    expect(result.frames[1]?.frameScore).toBe(20);
    expect(result.frames[2]?.frameScore).toBe(10);
  });

  test("does not break on an incomplete game", () => {
    const result = calculateGameScore([10, 7]);
    expect(result.total).toBe(0);
    expect(result.frames[0]?.frameScore).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  test("rejects impossible rolls", () => {
    expect(validateRolls([-1]).isValid).toBe(false);
    expect(validateRolls([11]).isValid).toBe(false);
    expect(validateRolls([8, 5]).isValid).toBe(false);
    expect(validateRolls([...repeat(0, 18), 10, 7, 4]).isValid).toBe(false);
  });

  test("adds only valid rolls and exposes valid next options", () => {
    expect(addRoll([8], 2)).toEqual([8, 2]);
    expect(() => addRoll([8], 3)).toThrow("No puedes derribar 3 bolos ahora");
    expect(getNextRollOptions([8])).toEqual([0, 1, 2]);
  });

  test("limits tenth frame bonus options after strike and non-strike bonus", () => {
    const rolls = [...repeat(0, 18), 10, 7];
    expect(getNextRollOptions(rolls)).toEqual([0, 1, 2, 3]);
    expect(validateRolls([...rolls, 4]).isValid).toBe(false);
  });

  test("allows any final bonus after two tenth-frame strikes", () => {
    const rolls = [...repeat(0, 18), 10, 10];
    expect(getNextRollOptions(rolls)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("does not allow extra rolls after an open tenth frame", () => {
    const rolls = [...repeat(0, 18), 4, 3];
    expect(isGameComplete(rolls)).toBe(true);
    expect(getNextRollOptions(rolls)).toEqual([]);
    expect(() => addRoll(rolls, 0)).toThrow();
  });

  test("detects complete and incomplete games", () => {
    expect(isGameComplete(repeat(0, 19))).toBe(false);
    expect(isGameComplete(repeat(0, 20))).toBe(true);
    expect(isGameComplete(repeat(10, 12))).toBe(true);
  });
});
