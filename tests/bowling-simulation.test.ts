import { describe, expect, test } from "vitest";

import {
  BOWLING_LANE_METERS,
  deriveShotFromGesture,
  getPinRackPositions,
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
});
