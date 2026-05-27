import { describe, expect, test } from "vitest";

import {
  BOWLING_LANE_METERS,
  deriveShotFromGesture,
  getPinRackPositions,
  resolveShotOutcome,
} from "@/lib/game/bowling-simulation";

describe("bowling 3D simulation helpers", () => {
  test("builds a regulation ten-pin rack centered on the lane", () => {
    const pins = getPinRackPositions();

    expect(pins).toHaveLength(10);
    expect(pins.map((pin) => pin.row)).toEqual([0, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
    expect(pins[0]).toMatchObject({ id: "pin-1", x: 0, z: BOWLING_LANE_METERS.pinDeckZ });
    expect(Math.min(...pins.map((pin) => pin.x))).toBeCloseTo(-0.4572, 4);
    expect(Math.max(...pins.map((pin) => pin.x))).toBeCloseTo(0.4572, 4);
  });

  test("maps a straight upward drag to a centered shot", () => {
    const shot = deriveShotFromGesture({
      points: [
        { x: 180, y: 520, t: 0 },
        { x: 180, y: 260, t: 420 },
      ],
      viewport: { width: 360, height: 720 },
    });

    expect(shot).toMatchObject({
      direction: 0,
      spin: 0,
    });
    expect(shot?.power).toBeGreaterThan(0.65);
    expect(shot?.power).toBeLessThanOrEqual(1);
  });

  test("maps a pull-back release to a powered centered shot", () => {
    const shot = deriveShotFromGesture({
      points: [
        { x: 180, y: 450, t: 0 },
        { x: 180, y: 620, t: 360 },
      ],
      viewport: { width: 360, height: 720 },
    });

    expect(shot).toMatchObject({
      direction: 0,
      spin: 0,
    });
    expect(shot?.power).toBeGreaterThan(0.45);
    expect(shot?.releaseSpeed).toBeGreaterThan(7);
  });

  test("uses pull-back horizontal offset for aim and spin", () => {
    const shot = deriveShotFromGesture({
      points: [
        { x: 180, y: 450, t: 0 },
        { x: 235, y: 520, t: 150 },
        { x: 255, y: 650, t: 360 },
      ],
      viewport: { width: 360, height: 720 },
    });

    expect(shot?.direction).toBeGreaterThan(0.2);
    expect(shot?.spin).toBeGreaterThan(0.05);
    expect(shot?.power).toBeGreaterThan(0.55);
  });

  test("uses horizontal aim and gesture curve for direction and spin", () => {
    const shot = deriveShotFromGesture({
      points: [
        { x: 180, y: 520, t: 0 },
        { x: 230, y: 390, t: 180 },
        { x: 255, y: 260, t: 390 },
      ],
      viewport: { width: 360, height: 720 },
    });

    expect(shot?.direction).toBeGreaterThan(0.2);
    expect(shot?.spin).toBeGreaterThan(0.1);
    expect(shot?.releaseSpeed).toBeGreaterThan(5);
  });

  test("rejects tiny accidental gestures", () => {
    expect(
      deriveShotFromGesture({
        points: [
          { x: 180, y: 520, t: 0 },
          { x: 183, y: 508, t: 180 },
        ],
        viewport: { width: 360, height: 720 },
      }),
    ).toBeNull();
  });

  test("turns a strong centered shot into a strike from a full rack", () => {
    const outcome = resolveShotOutcome({
      shot: { direction: 0, power: 1, spin: 0, releaseSpeed: 11.6 },
      previousKnockedPins: 0,
      standingPinIds: getPinRackPositions().map((pin) => pin.id),
    });

    expect(outcome.rollPins).toBe(10);
    expect(outcome.knockedPinsTotal).toBe(10);
    expect(outcome.knockedPinIds).toHaveLength(10);
    expect(outcome.isStrike).toBe(true);
  });

  test("keeps weak off-target throws below a strike", () => {
    const outcome = resolveShotOutcome({
      shot: { direction: 0.9, power: 0.22, spin: -0.4, releaseSpeed: 6.2 },
      previousKnockedPins: 0,
      standingPinIds: getPinRackPositions().map((pin) => pin.id),
    });

    expect(outcome.rollPins).toBeGreaterThanOrEqual(0);
    expect(outcome.rollPins).toBeLessThan(10);
    expect(outcome.knockedPinsTotal).toBe(outcome.rollPins);
  });

  test("adds second-roll pins to the previous total without exceeding ten", () => {
    const standingPinIds = getPinRackPositions().slice(4).map((pin) => pin.id);
    const outcome = resolveShotOutcome({
      shot: { direction: 0.1, power: 0.85, spin: 0.2, releaseSpeed: 10.2 },
      previousKnockedPins: 4,
      standingPinIds,
    });

    expect(outcome.rollPins).toBeLessThanOrEqual(6);
    expect(outcome.knockedPinsTotal).toBe(4 + outcome.rollPins);
    expect(outcome.knockedPinsTotal).toBeLessThanOrEqual(10);
    expect(outcome.knockedPinIds.every((id) => standingPinIds.includes(id))).toBe(true);
  });

  test("does not invent pins when the rack is already empty", () => {
    const outcome = resolveShotOutcome({
      shot: { direction: 0, power: 1, spin: 0, releaseSpeed: 11.6 },
      previousKnockedPins: 10,
      standingPinIds: [],
    });

    expect(outcome.rollPins).toBe(0);
    expect(outcome.knockedPinsTotal).toBe(10);
    expect(outcome.knockedPinIds).toEqual([]);
  });
});
