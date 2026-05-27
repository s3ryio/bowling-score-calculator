"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Target, Zap } from "lucide-react";
import * as THREE from "three";

import { FrameBox } from "@/components/FrameBox";
import {
  createGame3DSavedGame,
  createGame3DSession,
  getGame3DNextShot,
  recordGame3DShot,
  type Game3DSession,
} from "@/lib/game/bowling-game-session";
import {
  BOWLING_LANE_METERS,
  deriveShotFromGesture,
  getPinRackPositions,
  resolveShotOutcome,
  type PinRackPosition,
  type ShotInput,
  type ShotOutcome,
  type SimulationPoint,
} from "@/lib/game/bowling-simulation";
import type { SavedGame } from "@/types/bowling";

type GameStatus = "loading" | "ready" | "aiming" | "rolling" | "settled";

interface BowlingGame3DProps {
  bestScore?: number;
  onGameComplete?: (game: SavedGame) => void;
  playerName?: string | null;
}

interface DragState {
  points: SimulationPoint[];
  pointerId: number;
}

interface PinVisual {
  id: string;
  mesh: THREE.Group;
  rack: PinRackPosition;
  start: THREE.Vector3;
  fallProgress: number;
  fallSide: number;
  standing: boolean;
}

interface RuntimeRoll {
  shot: ShotInput;
  outcome: ShotOutcome;
  startedAt: number;
  settled: boolean;
}

interface BowlingRuntime {
  dispose: () => void;
  launch: (shot: ShotInput, outcome: ShotOutcome) => void;
  resetBall: () => void;
  resetRack: () => void;
}

const PIN_RACK = getPinRackPositions();
const ALL_PIN_IDS = PIN_RACK.map((pin) => pin.id);
const ROLL_DURATION_MS = 1850;
const AUTO_RESET_DELAY_MS = 520;
const BALL_START = new THREE.Vector3(0, BOWLING_LANE_METERS.ballRadius, 0.35);
const CAMERA_HOME_POSITION = new THREE.Vector3(0, 1.3, 4.25);
const CAMERA_HOME_TARGET = new THREE.Vector3(0, 0.19, -10.2);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#9a5a20");
    gradient.addColorStop(0.18, "#d1903e");
    gradient.addColorStop(0.5, "#f0bd63");
    gradient.addColorStop(0.82, "#be762c");
    gradient.addColorStop(1, "#7a431d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 9) {
      context.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.08})`;
      context.fillRect(0, y, canvas.width, 1);
    }

    for (let x = 26; x < canvas.width; x += 54) {
      context.fillStyle = "rgba(68, 32, 10, 0.18)";
      context.fillRect(x, 0, 2, canvas.height);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPinMesh(): THREE.Group {
  const height = BOWLING_LANE_METERS.pinHeight;
  const points = [
    new THREE.Vector2(0.028, -height / 2),
    new THREE.Vector2(0.058, -height * 0.36),
    new THREE.Vector2(0.073, -height * 0.18),
    new THREE.Vector2(0.052, -height * 0.02),
    new THREE.Vector2(0.039, height * 0.14),
    new THREE.Vector2(0.047, height * 0.28),
    new THREE.Vector2(0.031, height * 0.42),
    new THREE.Vector2(0.018, height / 2),
  ];
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(points, 36),
    new THREE.MeshStandardMaterial({
      color: "#fff4df",
      metalness: 0.02,
      roughness: 0.34,
    }),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const bandMaterial = new THREE.MeshStandardMaterial({
    color: "#d3212c",
    metalness: 0.02,
    roughness: 0.42,
  });
  for (const y of [height * 0.16, height * 0.22]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.014, 36, 1, true), bandMaterial);
    band.position.y = y;
    group.add(band);
  }

  return group;
}

function createBallMesh(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(BOWLING_LANE_METERS.ballRadius * 1.18, 56, 36);
  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.16,
    color: "#20c8ee",
    emissive: "#031018",
    emissiveIntensity: 0.16,
    metalness: 0.18,
    roughness: 0.2,
  });
  const ball = new THREE.Mesh(geometry, material);
  ball.castShadow = true;
  ball.receiveShadow = true;

  const holeMaterial = new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.55 });
  const holeGeometry = new THREE.SphereGeometry(BOWLING_LANE_METERS.ballRadius * 0.16, 18, 12);
  for (const position of [
    new THREE.Vector3(-0.035, 0.065, -0.074),
    new THREE.Vector3(0.018, 0.088, -0.065),
    new THREE.Vector3(0.055, 0.047, -0.076),
  ]) {
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.copy(position);
    ball.add(hole);
  }

  return ball;
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.dispose();
      }
    }
  });
}

function resetPin(pin: PinVisual): void {
  pin.standing = true;
  pin.fallProgress = 0;
  pin.mesh.position.copy(pin.start);
  pin.mesh.rotation.set(0, 0, 0);
  pin.mesh.visible = true;
}

function poseFallenPin(pin: PinVisual, progress: number): void {
  const eased = easeInOutCubic(progress);
  pin.mesh.position.set(
    pin.start.x + pin.fallSide * 0.12 * eased,
    pin.start.y - 0.12 * eased,
    pin.start.z + 0.16 * eased,
  );
  pin.mesh.rotation.set(0.25 * eased, 0.55 * pin.fallSide * eased, (Math.PI / 2) * pin.fallSide * eased);
}

function createBowlingRuntime(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  onStatus: (status: GameStatus) => void,
  onShotSettled: (outcome: ShotOutcome) => void,
): BowlingRuntime {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#03050a");
  scene.fog = new THREE.Fog("#03050a", 10, 28);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.01, 60);
  camera.position.copy(CAMERA_HOME_POSITION);
  camera.lookAt(CAMERA_HOME_TARGET);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    canvas,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const ambient = new THREE.HemisphereLight("#bdefff", "#130b04", 0.95);
  scene.add(ambient);

  const key = new THREE.DirectionalLight("#f8fbff", 2.15);
  key.position.set(-1.5, 4.2, 2.2);
  key.castShadow = true;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -20;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const pinLight = new THREE.SpotLight("#9ff5ff", 2.5, 26, Math.PI / 7, 0.45, 1.2);
  pinLight.position.set(0, 3.1, -8.7);
  pinLight.target.position.set(0, 0, BOWLING_LANE_METERS.pinDeckZ);
  scene.add(pinLight, pinLight.target);

  const woodTexture = createWoodTexture();
  const lane = new THREE.Mesh(
    new THREE.BoxGeometry(BOWLING_LANE_METERS.laneWidth, 0.08, 22.2),
    new THREE.MeshPhysicalMaterial({
      clearcoat: 0.65,
      clearcoatRoughness: 0.2,
      color: "#f4b85c",
      map: woodTexture,
      metalness: 0.02,
      roughness: 0.24,
    }),
  );
  lane.position.set(0, -0.045, -7.35);
  lane.receiveShadow = true;
  scene.add(lane);

  const gutterMaterial = new THREE.MeshStandardMaterial({ color: "#020712", roughness: 0.66, metalness: 0.14 });
  for (const side of [-1, 1]) {
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 22.2), gutterMaterial);
    gutter.position.set(side * 0.68, -0.065, -7.35);
    gutter.receiveShadow = true;
    scene.add(gutter);
  }

  const foulLine = new THREE.Mesh(
    new THREE.BoxGeometry(BOWLING_LANE_METERS.laneWidth + 0.36, 0.012, 0.045),
    new THREE.MeshStandardMaterial({ color: "#8ceeff", emissive: "#0e7490", emissiveIntensity: 0.55 }),
  );
  foulLine.position.set(0, 0.014, 0.72);
  scene.add(foulLine);

  const arrows = new THREE.Group();
  const arrowMaterial = new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.4 });
  for (const x of [-0.32, -0.16, 0, 0.16, 0.32]) {
    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 3), arrowMaterial);
    marker.position.set(x, 0.02, -6.5);
    marker.rotation.y = Math.PI;
    arrows.add(marker);
  }
  scene.add(arrows);

  const ball = createBallMesh();
  scene.add(ball);

  const pins: PinVisual[] = PIN_RACK.map((rack) => {
    const mesh = createPinMesh();
    const start = new THREE.Vector3(rack.x, BOWLING_LANE_METERS.pinHeight / 2, rack.z);
    mesh.position.copy(start);
    scene.add(mesh);
    return {
      id: rack.id,
      mesh,
      rack,
      start,
      fallProgress: 0,
      fallSide: rack.x >= 0 ? 1 : -1,
      standing: true,
    };
  });

  let animationFrame = 0;
  let currentRoll: RuntimeRoll | null = null;

  function sizeRenderer() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(sizeRenderer);
  resizeObserver.observe(container);
  sizeRenderer();

  function resetBallPose() {
    ball.position.copy(BALL_START);
    ball.rotation.set(0, 0, 0);
  }

  function resetCameraPose() {
    camera.position.copy(CAMERA_HOME_POSITION);
    camera.lookAt(CAMERA_HOME_TARGET);
  }

  function updateCameraFollow(progress: number) {
    const followPosition = new THREE.Vector3(
      ball.position.x * 0.38,
      1.24 + progress * 0.26,
      clamp(ball.position.z + 4.2 - progress * 0.95, -12.6, CAMERA_HOME_POSITION.z),
    );
    const lookAt = new THREE.Vector3(
      ball.position.x * 0.52,
      0.2 + progress * 0.08,
      clamp(ball.position.z - 4.2, BOWLING_LANE_METERS.pinDeckZ - 0.7, -2.8),
    );

    camera.position.lerp(followPosition, 0.16);
    camera.lookAt(lookAt);
  }

  function animateRoll(now: number, roll: RuntimeRoll) {
    const progress = clamp((now - roll.startedAt) / ROLL_DURATION_MS, 0, 1);
    const travel = easeInOutCubic(progress);
    const hook = Math.sin(progress * Math.PI) * roll.outcome.hookAmount * 1.15;
    const x = roll.outcome.laneTargetX * travel + hook;
    const z = BALL_START.z + (BOWLING_LANE_METERS.pinDeckZ - 0.25 - BALL_START.z) * travel;

    ball.position.set(x, BALL_START.y, z);
    ball.rotation.x -= 0.16 + roll.shot.power * 0.18;
    ball.rotation.y += roll.shot.spin * 0.045;
    ball.rotation.z -= roll.shot.direction * 0.035;
    updateCameraFollow(progress);

    if (progress > 0.64) {
      const fallProgress = clamp((progress - 0.64) / 0.24, 0, 1);
      const knocked = new Set(roll.outcome.knockedPinIds);
      for (const pin of pins) {
        if (!knocked.has(pin.id)) {
          continue;
        }
        pin.standing = false;
        pin.fallProgress = Math.max(pin.fallProgress, fallProgress);
        poseFallenPin(pin, pin.fallProgress);
      }
    }

    if (progress >= 1 && !roll.settled) {
      roll.settled = true;
      currentRoll = null;
      onStatus("settled");
      onShotSettled(roll.outcome);
    }
  }

  function animate(now: number) {
    if (currentRoll) {
      animateRoll(now, currentRoll);
    }

    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function resetBall() {
    currentRoll = null;
    resetBallPose();
    resetCameraPose();
    onStatus("ready");
  }

  function resetRack() {
    currentRoll = null;
    resetBallPose();
    resetCameraPose();
    for (const pin of pins) {
      resetPin(pin);
    }
    onStatus("ready");
  }

  function launch(shot: ShotInput, outcome: ShotOutcome) {
    resetBallPose();
    resetCameraPose();
    currentRoll = {
      shot,
      outcome,
      settled: false,
      startedAt: performance.now(),
    };
    onStatus("rolling");
  }

  resetRack();
  animate(performance.now());

  return {
    dispose: () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      disposeObject3D(scene);
      woodTexture.dispose();
      renderer.dispose();
    },
    launch,
    resetBall,
    resetRack,
  };
}

export function BowlingGame3D({ bestScore = 0, onGameComplete, playerName }: BowlingGame3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BowlingRuntime | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const onShotSettledRef = useRef<(outcome: ShotOutcome) => void>(() => undefined);
  const completedSavedRef = useRef(false);
  const nextAutoResetRef = useRef<number | null>(null);
  const initialPlayerName = playerName?.trim() || "Invitado";
  const [session, setSession] = useState<Game3DSession>(() => createGame3DSession(initialPlayerName));
  const [status, setStatus] = useState<GameStatus>("loading");
  const [knockedPins, setKnockedPins] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ShotInput | null>(null);
  const [dragPoints, setDragPoints] = useState<SimulationPoint[]>([]);
  const [standingPinIds, setStandingPinIds] = useState<string[]>(ALL_PIN_IDS);
  const sessionRef = useRef(session);
  const standingPinIdsRef = useRef(standingPinIds);

  const clearAutoReset = useCallback(() => {
    if (nextAutoResetRef.current) {
      window.clearTimeout(nextAutoResetRef.current);
      nextAutoResetRef.current = null;
    }
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    standingPinIdsRef.current = standingPinIds;
  }, [standingPinIds]);

  useEffect(() => {
    const cleanName = playerName?.trim();
    if (!cleanName || sessionRef.current.rolls.length > 0) {
      return;
    }

    setSession((current) => ({
      ...current,
      playerName: cleanName,
    }));
  }, [playerName]);

  const handleShotSettled = useCallback(
    (outcome: ShotOutcome) => {
      const result = recordGame3DShot(sessionRef.current, outcome.knockedPinsTotal);
      const remainingPins = standingPinIdsRef.current.filter((pinId) => !outcome.knockedPinIds.includes(pinId));

      sessionRef.current = result.session;
      setSession(result.session);
      setStandingPinIds(remainingPins);
      setLastRoll(result.rollPins);
      setKnockedPins(result.knockedPinsTotal);
      setPreview(null);

      if (result.session.isComplete) {
        if (!completedSavedRef.current) {
          completedSavedRef.current = true;
          const savedGame = createGame3DSavedGame(result.session);
          onGameComplete?.(savedGame);
          setSavedMessage(`Partida guardada: ${savedGame.winningScore} puntos.`);
        }
        return;
      }

      clearAutoReset();
      nextAutoResetRef.current = window.setTimeout(() => {
        if (result.resetRack) {
          runtimeRef.current?.resetRack();
          standingPinIdsRef.current = ALL_PIN_IDS;
          setStandingPinIds(ALL_PIN_IDS);
          setKnockedPins(0);
        } else {
          runtimeRef.current?.resetBall();
        }
        nextAutoResetRef.current = null;
      }, AUTO_RESET_DELAY_MS);
    },
    [clearAutoReset, onGameComplete],
  );

  useEffect(() => {
    onShotSettledRef.current = handleShotSettled;
  }, [handleShotSettled]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    let cancelled = false;

    if (!container || !canvas) {
      return;
    }

    setStatus("loading");
    const runtime = createBowlingRuntime(
      container,
      canvas,
      setStatus,
      (outcome) => onShotSettledRef.current(outcome),
    );

    if (cancelled) {
      runtime.dispose();
      return;
    }

    runtimeRef.current = runtime;

    return () => {
      cancelled = true;
      clearAutoReset();
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
    };
  }, [clearAutoReset]);

  const nextShot = useMemo(() => getGame3DNextShot(session), [session]);
  const totalScore = session.score.total;
  const frameLabel = nextShot.isComplete ? "Final" : `${nextShot.frameNumber}.${nextShot.rollNumber}`;

  const statusLabel = useMemo(() => {
    switch (status) {
      case "loading":
        return "Cargando pista";
      case "aiming":
        return "Apuntando";
      case "rolling":
        return "Rodando";
      case "settled":
        return session.isComplete ? "Partida completa" : "Preparando";
      default:
        return session.isComplete ? "Partida completa" : "Listo";
    }
  }, [session.isComplete, status]);

  const updatePreview = useCallback((points: SimulationPoint[]) => {
    const container = containerRef.current;
    if (!container) {
      setPreview(null);
      return;
    }
    const shot = deriveShotFromGesture({
      points,
      viewport: {
        width: container.clientWidth,
        height: container.clientHeight,
      },
    });
    setPreview(shot);
  }, []);

  function eventPoint(event: React.PointerEvent<HTMLDivElement>): SimulationPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      t: performance.now(),
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!runtimeRef.current || session.isComplete || status !== "ready") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = eventPoint(event);
    dragRef.current = {
      pointerId: event.pointerId,
      points: [point],
    };
    setDragPoints([point]);
    setPreview(null);
    setStatus("aiming");
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const point = eventPoint(event);
    const points = [...drag.points, point].slice(-16);
    dragRef.current = { ...drag, points };
    setDragPoints(points);
    updatePreview(points);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    const point = eventPoint(event);
    const points = [...drag.points, point];
    dragRef.current = null;
    setDragPoints([]);

    const container = containerRef.current;
    const runtime = runtimeRef.current;
    if (!container || !runtime) {
      setPreview(null);
      setStatus("ready");
      return;
    }

    const shot = deriveShotFromGesture({
      points,
      viewport: {
        width: container.clientWidth,
        height: container.clientHeight,
      },
    });

    if (!shot) {
      setPreview(null);
      setStatus("ready");
      return;
    }

    const shotState = getGame3DNextShot(sessionRef.current);
    const outcome = resolveShotOutcome({
      shot,
      previousKnockedPins: shotState.previousKnockedPins,
      standingPinIds: standingPinIdsRef.current,
    });

    setPreview(shot);
    clearAutoReset();
    runtime.launch(shot, outcome);
  }

  function cancelGesture() {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    setDragPoints([]);
    setPreview(null);
    setStatus(runtimeRef.current ? "ready" : "loading");
  }

  function resetGame() {
    clearAutoReset();
    const nextSession = createGame3DSession(playerName?.trim() || "Invitado");
    sessionRef.current = nextSession;
    standingPinIdsRef.current = ALL_PIN_IDS;
    completedSavedRef.current = false;
    setSession(nextSession);
    setStandingPinIds(ALL_PIN_IDS);
    setLastRoll(null);
    setSavedMessage(null);
    setKnockedPins(0);
    runtimeRef.current?.resetRack();
    dragRef.current = null;
    setDragPoints([]);
    setPreview(null);
  }

  const pathData = dragPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const aimGuide = useMemo(() => {
    const origin = dragPoints[0];
    if (!origin || !preview) {
      return null;
    }

    const length = 92 + preview.power * 172;
    return {
      x1: origin.x,
      y1: origin.y,
      x2: origin.x + preview.direction * 132,
      y2: origin.y - length,
    };
  }, [dragPoints, preview]);

  return (
    <section className="game-3d-panel overflow-hidden rounded-lg border border-white/10 bg-[#03050a]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.045] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Target aria-hidden="true" className="text-cyan-200" size={18} />
            <h2 className="text-lg font-black">Bowling 3D</h2>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/35">{statusLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Score</p>
            <p className="text-xl font-black text-amber-200">{totalScore}</p>
          </div>
          <div className="hidden rounded-lg border border-white/10 bg-black/30 px-3 py-2 sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Frame</p>
            <p className="text-xl font-black text-white">{frameLabel}</p>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/75 transition hover:border-cyan-300/50 hover:text-white"
            onClick={resetGame}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Nueva
          </button>
        </div>
      </div>

      <div
        className="relative h-[68vh] min-h-[430px] touch-none select-none bg-black lg:h-[720px] lg:min-h-[620px]"
        onPointerCancel={cancelGesture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={containerRef}
      >
        <canvas aria-label="Pista de bowling 3D" className="block h-full w-full" ref={canvasRef} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_82%,rgba(34,211,238,0.14),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.36))]" />

        {dragPoints.length > 0 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
            {aimGuide && (
              <>
                <path
                  d={`M ${aimGuide.x1} ${aimGuide.y1} L ${aimGuide.x2} ${aimGuide.y2}`}
                  fill="none"
                  stroke="rgba(250, 204, 21, 0.88)"
                  strokeDasharray="9 8"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                <circle cx={aimGuide.x2} cy={aimGuide.y2} fill="rgba(250, 204, 21, 0.92)" r="6" />
              </>
            )}
            <path d={pathData} fill="none" stroke="rgba(103, 232, 249, 0.82)" strokeLinecap="round" strokeWidth="4" />
            {dragPoints[0] && (
              <circle cx={dragPoints[0].x} cy={dragPoints[0].y} fill="rgba(255,255,255,0.9)" r="5" />
            )}
            {dragPoints[dragPoints.length - 1] && (
              <circle
                cx={dragPoints[dragPoints.length - 1].x}
                cy={dragPoints[dragPoints.length - 1].y}
                fill="rgba(34,211,238,0.95)"
                r="7"
              />
            )}
          </svg>
        )}

        <div className="pointer-events-none absolute left-4 right-4 top-4 hidden gap-2 sm:grid sm:grid-cols-3 lg:right-auto lg:w-[520px]">
          <div className="rounded-lg border border-white/15 bg-black/60 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Potencia</p>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${(preview?.power ?? 0) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/60 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Dirección</p>
            <p className="mt-1 text-lg font-black text-white">{preview ? `${Math.round(preview.direction * 100)}%` : "0%"}</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/60 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Efecto</p>
            <p className="mt-1 inline-flex items-center gap-2 text-lg font-black text-white">
              <Zap aria-hidden="true" className="text-amber-200" size={16} />
              {preview ? `${Math.round(preview.spin * 100)}%` : "0%"}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 hidden gap-2 sm:grid sm:grid-cols-4 lg:left-auto lg:w-[600px]">
          <div className="rounded-lg border border-white/15 bg-black/65 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Turno</p>
            <p className="mt-1 text-lg font-black text-white">{session.playerName}</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/65 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Pinos</p>
            <p className="mt-1 text-lg font-black text-white">
              {knockedPins}/10 <span className="text-sm text-white/35">en pie {Math.max(0, 10 - knockedPins)}</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/65 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Última</p>
            <p className="mt-1 text-lg font-black text-white">{lastRoll ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/65 p-3 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Mejor</p>
            <p className="mt-1 text-lg font-black text-amber-200">{bestScore}</p>
          </div>
        </div>

        {session.isComplete && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-lg border border-cyan-300/40 bg-slate-950/90 p-5 text-center shadow-[0_30px_120px_rgba(34,211,238,0.22)]">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Partida completa</p>
              <p className="mt-2 text-6xl font-black text-white">{totalScore}</p>
              <p className="mt-2 text-sm font-semibold text-white/55">
                {savedMessage ?? "Resultado guardado en tu historial local del juego."}
              </p>
              <button
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-black text-black transition hover:bg-cyan-200"
                onClick={resetGame}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={16} />
                Nueva partida
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 bg-black/25 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Marcador oficial</p>
            <p className="mt-1 text-sm font-semibold text-white/55">
              {nextShot.isComplete
                ? "La partida ya está completa."
                : `Frame ${nextShot.frameNumber}, tirada ${nextShot.rollNumber}. ${nextShot.standingPins} pinos disponibles.`}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Total</p>
            <p className="text-2xl font-black text-amber-200">{totalScore}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
          {session.score.frames.map((frame) => (
            <FrameBox
              frame={frame}
              isActive={!session.isComplete && frame.frameNumber === nextShot.frameNumber}
              key={frame.frameNumber}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
