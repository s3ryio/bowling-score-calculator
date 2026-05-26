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

export interface ShotOutcome {
  rollPins: number;
  knockedPinsTotal: number;
  knockedPinIds: string[];
  laneTargetX: number;
  hookAmount: number;
  quality: number;
  isStrike: boolean;
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

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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

function shotNoise(shot: ShotInput): number {
  const seed = shot.direction * 12.9898 + shot.power * 78.233 + shot.spin * 37.719 + shot.releaseSpeed * 9.173;
  return Math.sin(seed) * 43758.5453 - Math.floor(Math.sin(seed) * 43758.5453);
}

function chooseKnockedPins(input: {
  count: number;
  laneTargetX: number;
  standingPinIds: string[];
}): string[] {
  if (input.count <= 0 || input.standingPinIds.length === 0) {
    return [];
  }

  const standing = new Set(input.standingPinIds);
  return getPinRackPositions()
    .filter((pin) => standing.has(pin.id))
    .sort((a, b) => {
      const aDistance = Math.abs(a.x - input.laneTargetX);
      const bDistance = Math.abs(b.x - input.laneTargetX);
      return aDistance - bDistance || a.row - b.row || a.pinNumber - b.pinNumber;
    })
    .slice(0, input.count)
    .map((pin) => pin.id);
}

export function resolveShotOutcome(input: {
  shot: ShotInput;
  previousKnockedPins: number;
  standingPinIds: string[];
}): ShotOutcome {
  const standingPins = clamp(input.standingPinIds.length, 0, 10 - input.previousKnockedPins);
  const previousKnockedPins = clamp(input.previousKnockedPins, 0, 10);

  if (standingPins === 0 || previousKnockedPins >= 10) {
    return {
      rollPins: 0,
      knockedPinsTotal: previousKnockedPins,
      knockedPinIds: [],
      laneTargetX: 0,
      hookAmount: 0,
      quality: 0,
      isStrike: false,
    };
  }

  const hookAmount = clamp(input.shot.spin * 0.18, -0.24, 0.24);
  const laneTargetX = clamp(input.shot.direction * 0.48 + hookAmount, -0.62, 0.62);
  const accuracy = clamp(1 - Math.abs(laneTargetX) / 0.62, 0, 1);
  const powerQuality = clamp((input.shot.power - 0.12) / 0.88, 0, 1);
  const spinControl = clamp(1 - Math.max(0, Math.abs(input.shot.spin) - 0.52) * 0.7, 0.55, 1);
  const noise = shotNoise(input.shot);
  const quality = clamp(powerQuality * 0.58 + accuracy * 0.36 + spinControl * 0.06, 0, 1);

  let rollPins: number;
  if (standingPins === 10) {
    const strikeZone = Math.abs(laneTargetX) < 0.16 && input.shot.power > 0.78;
    rollPins = strikeZone && quality > 0.86
      ? 10
      : Math.floor(quality * 8.9 + noise * 1.4);
  } else {
    const spareLine = clamp(1 - Math.abs(laneTargetX) / 0.78, 0, 1);
    const spareQuality = clamp(powerQuality * 0.5 + spareLine * 0.42 + spinControl * 0.08, 0, 1);
    rollPins = Math.floor(spareQuality * standingPins + noise * 0.85);
    if (spareQuality > 0.82 && input.shot.power > 0.68) {
      rollPins = standingPins;
    }
  }

  rollPins = clamp(rollPins, 0, standingPins);
  const knockedPinIds = chooseKnockedPins({
    count: rollPins,
    laneTargetX,
    standingPinIds: input.standingPinIds,
  });

  return {
    rollPins,
    knockedPinsTotal: previousKnockedPins + rollPins,
    knockedPinIds,
    laneTargetX: round(laneTargetX),
    hookAmount: round(hookAmount),
    quality: round(quality),
    isStrike: standingPins === 10 && rollPins === 10,
  };
}
