export interface SimulationPoint {
  x: number;
  y: number;
  t: number;
}

export interface SimulationViewport {
  width: number;
  height: number;
}

export interface ShotInput {
  direction: number;
  power: number;
  spin: number;
  releaseSpeed: number;
}

export interface PinRackPosition {
  id: string;
  pinNumber: number;
  row: number;
  x: number;
  z: number;
}

export const BOWLING_LANE_METERS = {
  laneLength: 18.29,
  laneWidth: 1.0668,
  pinDeckZ: -16.45,
  pinSpacing: 0.3048,
  ballRadius: 0.108,
  pinHeight: 0.381,
  pinRadius: 0.061,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getPinRackPositions(): PinRackPosition[] {
  const positions: PinRackPosition[] = [];
  const rowCounts = [1, 2, 3, 4];
  let pinNumber = 1;

  for (let row = 0; row < rowCounts.length; row += 1) {
    const count = rowCounts[row];
    const rowZ = BOWLING_LANE_METERS.pinDeckZ - row * BOWLING_LANE_METERS.pinSpacing;
    const rowStartX = -((count - 1) * BOWLING_LANE_METERS.pinSpacing) / 2;

    for (let index = 0; index < count; index += 1) {
      positions.push({
        id: `pin-${pinNumber}`,
        pinNumber,
        row,
        x: rowStartX + index * BOWLING_LANE_METERS.pinSpacing,
        z: rowZ,
      });
      pinNumber += 1;
    }
  }

  return positions;
}

export function deriveShotFromGesture(input: {
  points: SimulationPoint[];
  viewport: SimulationViewport;
}): ShotInput | null {
  if (input.points.length < 2) {
    return null;
  }

  const first = input.points[0];
  const last = input.points[input.points.length - 1];
  const dx = last.x - first.x;
  const dy = first.y - last.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = Math.min(input.viewport.width, input.viewport.height) * 0.08;

  if (dy <= 0 || distance < minDistance) {
    return null;
  }

  const durationSeconds = Math.max((last.t - first.t) / 1000, 0.08);
  const distancePower = distance / (input.viewport.height * 0.42);
  const speedPower = distance / durationSeconds / 900;
  const power = clamp(distancePower * 0.72 + speedPower * 0.28, 0.12, 1);
  const direction = clamp(dx / (input.viewport.width * 0.32), -1, 1);

  const midpoint = input.points[Math.floor(input.points.length / 2)] ?? first;
  const expectedMidX = first.x + dx * 0.5;
  const curve = midpoint.x - expectedMidX;
  const spin = clamp(curve / (input.viewport.width * 0.22) + direction * 0.18, -1, 1);

  return {
    direction: Math.abs(direction) < 0.01 ? 0 : Number(direction.toFixed(3)),
    power: Number(power.toFixed(3)),
    spin: Math.abs(spin) < 0.01 ? 0 : Number(spin.toFixed(3)),
    releaseSpeed: Number((4.8 + power * 6.8).toFixed(3)),
  };
}
