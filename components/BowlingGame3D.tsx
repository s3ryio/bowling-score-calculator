"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Target, Zap } from "lucide-react";
import RAPIER from "@dimforge/rapier3d-compat";
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
  type ShotInput,
  type SimulationPoint,
} from "@/lib/game/bowling-simulation";
import type { SavedGame } from "@/types/bowling";

interface PinRuntime {
  body: RAPIER.RigidBody;
  mesh: THREE.Group;
  start: { x: number; y: number; z: number };
}

interface BowlingRuntime {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  world: RAPIER.World;
  ballBody: RAPIER.RigidBody;
  ballMesh: THREE.Mesh;
  pins: PinRuntime[];
  animationFrame: number;
  resizeObserver: ResizeObserver;
  dispose: () => void;
  launch: (shot: ShotInput) => void;
  resetBall: () => void;
  resetRack: () => void;
  reset: () => void;
}

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

const BALL_START = {
  x: 0,
  y: BOWLING_LANE_METERS.ballRadius,
  z: 0.35,
};

const PIN_CENTER_Y = BOWLING_LANE_METERS.pinHeight / 2;
const AUTO_RESET_DELAY_MS = 350;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (context) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#a86a2c");
    gradient.addColorStop(0.22, "#d69645");
    gradient.addColorStop(0.5, "#f0bd63");
    gradient.addColorStop(0.78, "#c37c31");
    gradient.addColorStop(1, "#8f5525");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 10) {
      const alpha = 0.08 + Math.random() * 0.08;
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.fillRect(0, y, canvas.width, 1);
    }

    for (let x = 30; x < canvas.width; x += 58) {
      context.fillStyle = "rgba(92, 45, 14, 0.18)";
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
  const geometry = new THREE.LatheGeometry(points, 36);
  const material = new THREE.MeshStandardMaterial({
    color: "#fff4df",
    roughness: 0.34,
    metalness: 0.02,
  });
  const body = new THREE.Mesh(geometry, material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const bandMaterial = new THREE.MeshStandardMaterial({
    color: "#d3212c",
    roughness: 0.42,
    metalness: 0.02,
  });
  for (const y of [height * 0.16, height * 0.22]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.014, 36, 1, true), bandMaterial);
    band.position.y = y;
    group.add(band);
  }

  return group;
}

function createBallMesh(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(BOWLING_LANE_METERS.ballRadius, 48, 32);
  const material = new THREE.MeshPhysicalMaterial({
    color: "#24d6ff",
    emissive: "#031018",
    emissiveIntensity: 0.18,
    metalness: 0.18,
    roughness: 0.22,
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
  });
  const ball = new THREE.Mesh(geometry, material);
  ball.castShadow = true;
  ball.receiveShadow = true;

  const holeMaterial = new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.5 });
  const holeGeometry = new THREE.SphereGeometry(BOWLING_LANE_METERS.ballRadius * 0.18, 18, 12);
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

async function createBowlingRuntime(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  onStatus: (status: GameStatus) => void,
  onKnockedPins: (count: number) => void,
  onShotSettled: (count: number) => void,
): Promise<BowlingRuntime> {
  await RAPIER.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#03050a");
  scene.fog = new THREE.Fog("#03050a", 10, 28);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 60);
  camera.position.set(0, 1.18, 4.15);
  camera.lookAt(0, 0.24, -9.8);

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

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 60;

  const ambient = new THREE.HemisphereLight("#bdefff", "#130b04", 0.9);
  scene.add(ambient);

  const key = new THREE.DirectionalLight("#f8fbff", 2.2);
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

  const pinLight = new THREE.SpotLight("#9ff5ff", 2.4, 26, Math.PI / 7, 0.45, 1.2);
  pinLight.position.set(0, 3.1, -8.7);
  pinLight.target.position.set(0, 0, BOWLING_LANE_METERS.pinDeckZ);
  pinLight.castShadow = true;
  scene.add(pinLight, pinLight.target);

  const woodTexture = createWoodTexture();
  const laneMaterial = new THREE.MeshPhysicalMaterial({
    map: woodTexture,
    color: "#f4b85c",
    roughness: 0.24,
    metalness: 0.02,
    clearcoat: 0.65,
    clearcoatRoughness: 0.2,
  });
  const laneLength = 22.2;
  const laneCenterZ = -7.35;
  const lane = new THREE.Mesh(
    new THREE.BoxGeometry(BOWLING_LANE_METERS.laneWidth, 0.08, laneLength),
    laneMaterial,
  );
  lane.position.set(0, -0.045, laneCenterZ);
  lane.receiveShadow = true;
  scene.add(lane);

  const worldLaneBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, laneCenterZ));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(BOWLING_LANE_METERS.laneWidth / 2, 0.04, laneLength / 2)
      .setFriction(0.92)
      .setRestitution(0.02),
    worldLaneBody,
  );

  const gutterMaterial = new THREE.MeshStandardMaterial({ color: "#070a10", roughness: 0.46, metalness: 0.12 });
  for (const side of [-1, 1]) {
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, laneLength), gutterMaterial);
    gutter.position.set(side * (BOWLING_LANE_METERS.laneWidth / 2 + 0.2), -0.08, laneCenterZ);
    gutter.receiveShadow = true;
    scene.add(gutter);
  }

  const foulLine = new THREE.Mesh(
    new THREE.BoxGeometry(BOWLING_LANE_METERS.laneWidth + 0.52, 0.012, 0.06),
    new THREE.MeshStandardMaterial({ color: "#23e6ff", emissive: "#0b5365", emissiveIntensity: 0.9 }),
  );
  foulLine.position.set(0, 0.012, 0.02);
  scene.add(foulLine);

  const arrowsMaterial = new THREE.MeshStandardMaterial({ color: "#101820", roughness: 0.35 });
  for (const x of [-0.32, -0.16, 0, 0.16, 0.32]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 3), arrowsMaterial);
    arrow.rotation.x = Math.PI / 2;
    arrow.rotation.z = Math.PI;
    arrow.position.set(x, 0.018, -3.8);
    scene.add(arrow);
  }

  const backStop = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.1, 0.18),
    new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.45, metalness: 0.1 }),
  );
  backStop.position.set(0, 0.55, -19.05);
  backStop.receiveShadow = true;
  scene.add(backStop);

  const sideWallMaterial = new THREE.MeshStandardMaterial({ color: "#15151c", roughness: 0.55 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, laneLength), sideWallMaterial);
    wall.position.set(side * 0.93, 0.18, laneCenterZ);
    wall.receiveShadow = true;
    scene.add(wall);
  }

  const ballMesh = createBallMesh();
  ballMesh.position.set(BALL_START.x, BALL_START.y, BALL_START.z);
  scene.add(ballMesh);
  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(BALL_START.x, BALL_START.y, BALL_START.z)
      .setLinearDamping(0.08)
      .setAngularDamping(0.08),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(BOWLING_LANE_METERS.ballRadius).setDensity(7.0).setFriction(0.72).setRestitution(0.08),
    ballBody,
  );

  const pins = getPinRackPositions().map((pin) => {
    const mesh = createPinMesh();
    const start = { x: pin.x, y: PIN_CENTER_Y, z: pin.z };
    mesh.position.set(start.x, start.y, start.z);
    scene.add(mesh);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(start.x, start.y, start.z)
        .setLinearDamping(0.18)
        .setAngularDamping(0.12),
    );
    world.createCollider(
      RAPIER.ColliderDesc.capsule(BOWLING_LANE_METERS.pinHeight * 0.38, BOWLING_LANE_METERS.pinRadius)
        .setDensity(0.42)
        .setFriction(0.58)
        .setRestitution(0.28),
      body,
    );
    return { body, mesh, start };
  });

  let currentShot: ShotInput | null = null;
  let animationFrame = 0;
  let lastKnockedCount = -1;
  let settledFrames = 0;

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

  function pinIsKnocked(pin: PinRuntime): boolean {
    const rotation = pin.body.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
    const translation = pin.body.translation();
    return up.y < 0.72 || translation.y < PIN_CENTER_Y * 0.72;
  }

  function updateMeshes() {
    const ballTranslation = ballBody.translation();
    const ballRotation = ballBody.rotation();
    ballMesh.position.set(ballTranslation.x, ballTranslation.y, ballTranslation.z);
    ballMesh.quaternion.set(ballRotation.x, ballRotation.y, ballRotation.z, ballRotation.w);

    for (const pin of pins) {
      const translation = pin.body.translation();
      const rotation = pin.body.rotation();
      pin.mesh.position.set(translation.x, translation.y, translation.z);
      pin.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  function countKnockedPins(): number {
    return pins.reduce((total, pin) => total + (pinIsKnocked(pin) ? 1 : 0), 0);
  }

  function animate() {
    if (currentShot) {
      const translation = ballBody.translation();
      const progress = clamp((BALL_START.z - translation.z) / 18, 0, 1);
      const hookForce = currentShot.spin * 0.52 * Math.pow(progress, 1.45);
      ballBody.addForce({ x: hookForce, y: 0, z: 0 }, true);
    }

    world.step();
    updateMeshes();

    const knocked = countKnockedPins();
    if (knocked !== lastKnockedCount) {
      lastKnockedCount = knocked;
      onKnockedPins(knocked);
    }

    const ballSpeed = ballBody.linvel();
    const speed = Math.hypot(ballSpeed.x, ballSpeed.y, ballSpeed.z);
    const ballZ = ballBody.translation().z;
    if (currentShot && (speed < 0.12 || ballZ < -19.4)) {
      settledFrames += 1;
      if (settledFrames > 24) {
        currentShot = null;
        settledFrames = 0;
        const finalKnocked = countKnockedPins();
        onStatus("settled");
        onShotSettled(finalKnocked);
      }
    } else {
      settledFrames = 0;
    }

    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function resetBody(body: RAPIER.RigidBody, translation: { x: number; y: number; z: number }) {
    body.setTranslation(translation, true);
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.wakeUp();
  }

  function resetBall() {
    currentShot = null;
    lastKnockedCount = -1;
    settledFrames = 0;
    resetBody(ballBody, BALL_START);
    updateMeshes();
    onKnockedPins(countKnockedPins());
    onStatus("ready");
  }

  function resetRack() {
    currentShot = null;
    lastKnockedCount = -1;
    settledFrames = 0;
    resetBody(ballBody, BALL_START);
    for (const pin of pins) {
      resetBody(pin.body, pin.start);
    }
    updateMeshes();
    onKnockedPins(0);
    onStatus("ready");
  }

  function reset() {
    resetRack();
  }

  function launch(shot: ShotInput) {
    resetBody(ballBody, BALL_START);
    currentShot = shot;
    settledFrames = 0;
    ballBody.setLinvel(
      {
        x: shot.direction * 1.55,
        y: 0,
        z: -shot.releaseSpeed,
      },
      true,
    );
    ballBody.setAngvel(
      {
        x: -shot.releaseSpeed / BOWLING_LANE_METERS.ballRadius,
        y: shot.spin * 9.5,
        z: -shot.direction * 3.2,
      },
      true,
    );
    onStatus("rolling");
  }

  animate();
  reset();

  return {
    camera,
    renderer,
    scene,
    world,
    ballBody,
    ballMesh,
    pins,
    get animationFrame() {
      return animationFrame;
    },
    set animationFrame(value: number) {
      animationFrame = value;
    },
    resizeObserver,
    launch,
    resetBall,
    resetRack,
    reset,
    dispose: () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      disposeObject3D(scene);
      woodTexture.dispose();
      renderer.dispose();
    },
  };
}

export function BowlingGame3D({ bestScore = 0, onGameComplete, playerName }: BowlingGame3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<BowlingRuntime | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const onShotSettledRef = useRef<(count: number) => void>(() => undefined);
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
  const sessionRef = useRef(session);

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
    (count: number) => {
      const result = recordGame3DShot(sessionRef.current, count);
      sessionRef.current = result.session;
      setSession(result.session);
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
    void createBowlingRuntime(
      container,
      canvas,
      setStatus,
      setKnockedPins,
      (count) => onShotSettledRef.current(count),
    ).then((runtime) => {
      if (cancelled) {
        runtime.dispose();
        return;
      }
      runtimeRef.current = runtime;
      setStatus("ready");
    });

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
  const frameGridClass = "grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10";

  const statusLabel = useMemo(() => {
    switch (status) {
      case "loading":
        return "Cargando pista";
      case "aiming":
        return "Apuntando";
      case "rolling":
        return "Rodando";
      case "settled":
        return session.isComplete ? "Partida completa" : "Preparando siguiente tiro";
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

    setPreview(shot);
    clearAutoReset();
    runtime.launch(shot);
  }

  function resetGame() {
    clearAutoReset();

    const nextSession = createGame3DSession(playerName?.trim() || "Invitado");
    sessionRef.current = nextSession;
    completedSavedRef.current = false;
    setSession(nextSession);
    setLastRoll(null);
    setSavedMessage(null);
    setKnockedPins(0);
    runtimeRef.current?.reset();
    dragRef.current = null;
    setDragPoints([]);
    setPreview(null);
  }

  const pathData = dragPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

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
        onPointerCancel={() => {
          if (!dragRef.current) {
            return;
          }
          dragRef.current = null;
          setDragPoints([]);
          setPreview(null);
          setStatus(runtimeRef.current ? "ready" : "loading");
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={containerRef}
      >
        <canvas aria-label="Pista de bowling 3D" className="block h-full w-full" ref={canvasRef} />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_82%,rgba(34,211,238,0.18),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.42))]" />

        {dragPoints.length > 0 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
            <path d={pathData} fill="none" stroke="rgba(103, 232, 249, 0.8)" strokeLinecap="round" strokeWidth="4" />
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
          <div className="rounded-lg border border-white/15 bg-black/65 p-2.5 backdrop-blur-md sm:p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Turno</p>
            <p className="mt-1 text-base font-black text-white sm:text-lg">{session.playerName}</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/65 p-2.5 backdrop-blur-md sm:p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Pinos</p>
            <p className="mt-1 text-base font-black text-white sm:text-lg">
              {knockedPins}/10 <span className="text-sm text-white/35">en pie {Math.max(0, 10 - knockedPins)}</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/65 p-2.5 backdrop-blur-md sm:p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Última</p>
            <p className="mt-1 text-base font-black text-white sm:text-lg">{lastRoll ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/65 p-2.5 backdrop-blur-md sm:p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Mejor</p>
            <p className="mt-1 text-base font-black text-amber-200 sm:text-lg">{bestScore}</p>
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

        <div className={frameGridClass}>
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
