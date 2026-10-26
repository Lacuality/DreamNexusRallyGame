import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { burst, FX } from "@/lib/game/fx";
import { placeOnTrack, groundHeight } from "@/lib/game/physics";
import { run, multiplierFor, MAX_HEARTS, NITRO_DURATION, INVULNERABLE_TIME, speedGear } from "@/lib/game/run";
import { input, steerInput } from "@/lib/input";
import { toWorld, headingAt, frameAt, roadCurvature, roadHalf, lanes, hash, biomeAt, lapLength, isCircuit } from "@/lib/track";

const tmpV = { x: 0, y: 0, z: 0 };
import { ModelPool, OBSTACLE_SIZE, type ObstacleKind, type PickupKind, makeArch, makeFinishLine } from "@/lib/game/models";
import { useRally, goalProgress } from "@/lib/stores/useRally";
import { car, session, classSpeed } from "@/lib/game/session";
import { chapterById } from "@/lib/game/story";
import { race } from "@/lib/game/race";
import { room, myId } from "@/lib/game/net";
import { useProfile } from "@/lib/stores/useProfile";
import { useBiome, BIOME_CONFIGS } from "@/lib/stores/useBiome";
import { audioManager } from "@/lib/audio";

/**
 * The race: driving physics, spawning, collisions and scoring.
 * Everything runs inside one useFrame and mutates `run` directly.
 */

const CAR_HALF_W = 0.9;
const CAR_HALF_L = 1.9;
const SOLID: ObstacleKind[] = ["cone", "rock", "sacks", "barrier", "cow", "limpiavidrios", "hueco"];
const SMALL: ObstacleKind[] = ["cone", "sacks"];

interface Entity {
  kind: ObstacleKind | PickupKind;
  pickup: boolean;
  z: number;
  lat: number;
  h: number; // height above road (air jars)
  passed: boolean;
  done: boolean;
  fly: number; // >0 while flung away after a smash
  vx: number;
  vy: number;
  spin: number;
  obj: THREE.Object3D;
  seed: number;
  walk: number; // cows: sideways walking speed (m/s)
  state: number; // semáforo: 0 red, 1 washing, 2 green; fotomulta: 1 once it has flashed
  timer: number;
}

const COLORS = {
  gold: "#ffd23f",
  cyan: "#5fd8ff",
  pink: "#FDC6B5",
  red: "#ff5a5f",
  green: "#7bd389",
  orange: "#ff9f43",
};

/** Music style for each region. */
function themeFor(b: string) {
  if (b === "comuna_13") return "synthwave" as const;
  if (b === "pueblo" || b === "cartagena") return "cumbia" as const;
  if (b === "cali") return "salsa" as const;
  return "default" as const;
}

export function RaceSystem({ carPositionRef, carSpeedRef }: {
  carPositionRef: React.MutableRefObject<THREE.Vector3>;
  carSpeedRef: React.MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const pool = useMemo(() => new ModelPool(), []);
  const ents = useRef<Entity[]>([]);
  const nextRow = useRef(60);
  const rowCount = useRef(0);
  const hudTimer = useRef(0);
  const gravelMsg = useRef(-99);
  const nextLight = useRef(1400);
  const nextCam = useRef(1200);
  const prevSpeed = useRef(0);
  const lastDt = useRef(1 / 60);
  const driftSpark = useRef(0);
  const driftStage = useRef(0);
  const countdownTimer = useRef(0);
  const holdStart = useRef(-1);
  const lastCount = useRef(4);
  const arches = useRef<THREE.Object3D[]>([]);
  const netTimer = useRef(0);
  const lapItems = useMemo(() => circuitLayout(), []);
  if (typeof window !== "undefined") (window as any).__layout = lapItems; // debug
  const circuitNext = useRef({ lap: 0, idx: 0 });

  const rally = useRally;

  // biome change banner
  useEffect(() => {
    useBiome.getState().reset(biomeAt(0));
    audioManager.setMusicTheme(themeFor(biomeAt(0)));
    useProfile.getState().visitRegion(biomeAt(0));
    return useBiome.subscribe((s, prev) => {
      if (s.currentBiome !== prev.currentBiome) {
        audioManager.setMusicTheme(themeFor(s.currentBiome));
        const isNew = useProfile.getState().visitRegion(s.currentBiome);
        if (isNew) rally.getState().popup("NEW REGION ON YOUR MAP!", COLORS.green, true);
      }
      if (s.currentBiome !== prev.currentBiome && rally.getState().phase === "playing") {
        const c = BIOME_CONFIGS[s.currentBiome];
        rally.getState().showBanner(c.name, c.subtitle);
        audioManager.playMilestone();
      }
    });
  }, [rally]);

  useEffect(() => {
    return () => {
      ents.current.forEach((e) => pool.release(e.obj));
      ents.current = [];
      audioManager.stopEngineSound();
    };
  }, [pool]);

  /* ---------------- spawning ---------------- */
  const add = (kind: Entity["kind"], z: number, lat: number, h = 0) => {
    const pickup = kind === "jar" || kind === "nitro" || kind === "shield" || kind === "heart" || kind === "tunjo";
    const obj = pool.acquire(kind);
    obj.visible = true;
    obj.rotation.set(0, 0, 0);
    const mark = obj.getObjectByName("danger");
    if (mark) mark.visible = true;
    obj.scale.setScalar(1);
    group.current?.add(obj);
    const walk = kind === "cow" ? (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.8) : kind === "limpiavidrios" ? (Math.random() < 0.5 ? -1 : 1) * 1.3 : 0;
    ents.current.push({ kind, pickup, z, lat, h, passed: false, done: false, fly: 0, vx: 0, vy: 0, spin: 0, obj, seed: Math.random() * 10, walk, state: 0, timer: 0 });
  };

  const lane = (i: number) => lanes()[((i % 3) + 3) % 3];

  const spawnRow = (z: number) => {
    const d = Math.min(1, z / 2400); // difficulty 0..1 over the first 2.4 km
    const d2 = Math.max(0, Math.min(1, (z - 2400) / 4000)); // ...and keeps climbing to ~6 km
    const r = Math.random();
    const li = Math.floor(Math.random() * 3);
    rowCount.current++;

    // the very first rows teach the game: jars, then one obstacle, then a ramp
    if (rowCount.current === 1) {
      for (let i = 0; i < 6; i++) add("jar", z + i * 4, 0);
      return 30;
    }
    if (rowCount.current === 2) {
      add("cone", z, 0);
      for (let i = 0; i < 4; i++) add("jar", z + i * 4, 3);
      return 34;
    }
    if (rowCount.current === 3) {
      add("ramp", z, 0);
      for (let i = 0; i < 5; i++) add("jar", z + 8 + i * 4.5, 0, 1.6 + Math.sin((i / 4) * Math.PI) * 1.4);
      add("barrier", z + 14, 0);
      return 40;
    }

    const solid = (): ObstacleKind => {
      const k = Math.random();
      if (k < 0.3) return "cone";
      if (k < 0.55) return "rock";
      if (k < 0.8) return "sacks";
      return "barrier";
    };

    // a semáforo every ~2 km with the limpiavidrios working the lanes: dodge them
    if (session.mode === "endless" && z > nextLight.current) {
      nextLight.current = z + 1700 + Math.random() * 700;
      add("semaforo", z + 30, 0);
      add("limpiavidrios", z + 14, lane(li) + (Math.random() - 0.5));
      if (d > 0.35) add("limpiavidrios", z + 26, lane(li + 1) + (Math.random() - 0.5));
      for (let i = 0; i < 3; i++) add("jar", z + 36 + i * 4, lane(li + 2));
      return 64;
    }
    // speed cameras: 100 km/h limit
    if (z > nextCam.current) {
      nextCam.current = z + 1300 + Math.random() * 700;
      add("fotomulta", z + 20, 0);
      for (let i = 0; i < 3; i++) add("jar", z + 34 + i * 4, lane(li));
      return 56;
    }

    const patterns: [number, () => number][] = [
      [0.8 + d * 1.6, () => { // huecos: potholes you weave around
        add("hueco", z, lane(li));
        add("hueco", z + 9, lane(li + 1));
        if (d > 0.4) add("hueco", z + 18, lane(li + 2));
        add("jar", z + 5, lane(li + 2));
        add("jar", z + 14, lane(li));
        return 30;
      }],
      [3, () => { // jar line
        for (let i = 0; i < 6; i++) add("jar", z + i * 4, lane(li));
        if (Math.random() < 0.55 + d * 0.4) add(solid(), z + 10, lane(li + 1 + Math.floor(Math.random() * 2)));
        if (d2 > 0.3 && Math.random() < d2) add(solid(), z + 22, lane(li));
        return 32;
      }],
      [1.6, () => { // jar weave
        for (let i = 0; i < 9; i++) add("jar", z + i * 4, Math.sin(i * 0.7) * 3);
        return 40;
      }],
      [3, () => { // single obstacle + jar bait
        add(solid(), z, lane(li));
        if (Math.random() < 0.7) for (let i = 0; i < 3; i++) add("jar", z + i * 3.5 - 3.5, lane(li + 1));
        return 24;
      }],
      [d * 1.5 + d2 * 2, () => { // zigzag: three walls, you have to change lane twice
        add("barrier", z, lane(li));
        add("barrier", z + 15, lane(li + 1));
        add("barrier", z + 30, lane(li + 2));
        add("jar", z + 7, lane(li + 1));
        add("jar", z + 22, lane(li + 2));
        add("jar", z + 37, lane(li));
        return 46;
      }],
      [1 + d * 3.5 + d2 * 2, () => { // double: thread the gap
        add(solid(), z, lane(li));
        add(solid(), z, lane(li + 1));
        add("jar", z, lane(li + 2));
        add("jar", z + 4, lane(li + 2));
        return 28;
      }],
      [0.5 + d * 2, () => { // cone slalom
        for (let i = 0; i < 4; i++) add("cone", z + i * 11, i % 2 ? 2.4 : -2.4);
        for (let i = 0; i < 4; i++) add("jar", z + i * 11 + 5.5, 0);
        return 50;
      }],
      [1.2, () => { // ramp over a wall
        add("ramp", z, lane(li));
        for (let i = 0; i < 5; i++) add("jar", z + 8 + i * 4.5, lane(li), 1.6 + Math.sin((i / 4) * Math.PI) * 1.4);
        add("barrier", z + 14, lane(li));
        add("barrier", z + 14, lane(li + 1));
        return 44;
      }],
      [0.9, () => { // puddles
        add("puddle", z, lane(li));
        if (Math.random() < 0.5) add("puddle", z + 12, lane(li + 1));
        add("jar", z + 6, lane(li + 2));
        return 26;
      }],
      [["coffee_hills", "andes_highland", "pueblo"].includes(biomeAt(z)) ? 0.9 + d * 0.5 : 0, () => { // cows crossing!
        add("cow", z, lane(li) + (Math.random() - 0.5));
        if (Math.random() < 0.5) add("cow", z + 9, lane(li + 1));
        for (let i = 0; i < 3; i++) add("jar", z + 16 + i * 4, lane(li + 2));
        return 34;
      }],
      [0.18, () => { // rare golden tunjo, guarded
        add("tunjo", z + 6, lane(li));
        add(solid(), z, lane(li + 1));
        add(solid(), z + 12, lane(li + 2));
        return 30;
      }],
      [0.55 - d2 * 0.2, () => { // power-up
        const p = Math.random();
        const hearts = run.hearts;
        const kind: PickupKind = hearts < run.maxHearts && p < 0.3 ? "heart" : p < 0.65 ? "nitro" : "shield";
        add(kind, z, lane(li));
        if (d > 0.3) add(solid(), z + 6, lane(li + 1));
        return 26;
      }],
    ];

    let total = 0;
    patterns.forEach(([w]) => (total += w));
    let pick = r * total;
    for (const [w, fn] of patterns) {
      pick -= w;
      if (pick <= 0) {
        const len = fn();
        // gaps shrink as the run goes on
        return len + 24 - d * 14 - d2 * 6 + Math.random() * 6;
      }
    }
    return 30;
  };

  /* ---------------- scoring helpers ---------------- */
  const bumpCombo = () => {
    const before = multiplierFor(run.combo);
    run.combo++;
    run.comboTimer = 4.5 + car.comboTime;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    const after = multiplierFor(run.combo);
    if (after > before) {
      rally.getState().popup(`x${after} COMBO!`, COLORS.orange, true);
      audioManager.playCombo(after);
    }
  };

  /** Particle burst just in front of the player's car. */
  const fxCar = (colors: string[], count = 14, speed = 6, up = 5) => {
    toWorld(run.z + 1.5, run.lat, run.y + 1, tmpV);
    burst(tmpV.x, tmpV.y, tmpV.z, colors, count, speed, up);
  };

  const award = (pts: number) => {
    // nitro doubles everything you earn
    const p = Math.round(pts * multiplierFor(run.combo) * (run.nitroTime > 0 ? 2 : 1));
    run.score += p;
    return p;
  };

  const hurt = () => {
    if (run.invulnerable > 0) return;
    if (run.shield) {
      run.shield = false;
      run.invulnerable = 1.0;
      run.shake = 0.6;
      audioManager.playShieldBreak();
      rally.getState().popup("SHIELD SAVED YOU!", COLORS.cyan, true);
      return;
    }
    run.hearts--;
    fxCar(FX.hit, 22, 8, 6);
    if (run.firstHitZ < 0) run.firstHitZ = run.z;
    run.speed *= 0.4;
    run.invulnerable = INVULNERABLE_TIME;
    run.combo = 0;
    run.shake = 1.2;
    run.flash = 1;
    audioManager.playCrash();
    if (navigator.vibrate) navigator.vibrate(120);
    if (run.hearts <= 0) {
      rally.getState().syncHud();
      // tiny delay so the crash registers before the game-over screen
      setTimeout(() => rally.getState().gameOver(), 450);
      run.speed = 0;
    } else {
      rally.getState().popup("OUCH! -1 ♥", COLORS.red, true);
    }
  };

  /* ---------------- main loop ---------------- */
  useFrame((state, delta) => {
    const phase = rally.getState().phase;
    const dt = Math.min(delta, 1 / 20);
    lastDt.current = dt;
    (window as any).__ents = ents.current; // debug

    // countdown 3-2-1-GO
    if (phase === "countdown") {
      placeOnTrack(run.z, run.lat); // sit on the grid facing down the track
      countdownTimer.current += dt;
      // rocket start: hold ↑ just as it goes green; hold it too long before and the engine floods
      if (input.up || input.touchNitro) {
        if (holdStart.current < 0) holdStart.current = countdownTimer.current;
      } else holdStart.current = -1;
      const left = 3 - Math.floor(countdownTimer.current / 0.8);
      if (left !== lastCount.current) {
        lastCount.current = left;
        if (left > 0) {
          rally.getState().setCountdown(left);
          audioManager.playCountdown(false);
          audioManager.unlock();
        } else {
          rally.getState().setCountdown(0);
          audioManager.playCountdown(true);
          audioManager.startEngineSound();
          rally.getState().beginRace();
          const held = holdStart.current >= 0 ? countdownTimer.current - holdStart.current : -1;
          if (held >= 0 && held < 0.55 && race.active) {
            run.nitroTime = Math.max(run.nitroTime, 1.4);
            run.speed = Math.max(run.speed, 12);
            fxCar(FX.nitro, 24, 8, 3);
            audioManager.playNitro();
            rally.getState().popup("🚀 ¡ARRANCÓN PERFECTO!", COLORS.orange, true);
          } else if (held >= 1.3 && race.active) {
            run.busted = 1.1; // flooded engine: you sit there while they all go past
            audioManager.playShieldBreak();
            rally.getState().popup("💨 ¡SE AHOGÓ EL MOTOR! (muy temprano)", COLORS.red, true);
          } else rally.getState().popup("GO!", COLORS.gold, true);
          countdownTimer.current = 0;
          lastCount.current = 4;
          holdStart.current = -1;
        }
      }
      updateVisuals(dt, state.clock.elapsedTime);
      writeCar();
      hudTimer.current += dt;
      if (hudTimer.current > 0.2) {
        hudTimer.current = 0;
        rally.getState().syncHud();
      }
      return;
    }
    countdownTimer.current = 0;
    lastCount.current = 4;

    if (phase !== "playing" || run.hearts <= 0) {
      updateVisuals(dt, state.clock.elapsedTime);
      return;
    }

    run.time += dt;
    const circ = race.active;
    const d = circ ? 0.6 : Math.min(1, run.z / 3500);

    /* --- speed (car stats apply) --- */
    // endless: the rally shifts up a gear every kilometre (announced on screen)
    const gear = circ ? 0 : speedGear(run.z);
    const top = ((circ ? 182 * classSpeed() : 178 + gear * 12) / 3.6) * car.top;
    const cruise = circ ? top * 0.93 : ((124 + gear * 14) / 3.6) * car.top;
    let target = input.up ? top : cruise;
    // brake + steer = drift (Mario Kart style): you keep rolling, turn tighter and charge a mini-turbo
    const braking = input.down || input.touchBrake;
    const steerNow = steerInput();
    const canDrift = braking && steerNow !== 0 && run.speed > 14 && !run.airborne && run.spin <= 0;
    if (canDrift) {
      if (run.drift === 0) {
        run.driftDir = steerNow;
        run.hop = 0.28; // the little Mario Kart hop into the slide
        audioManager.playClick();
      }
      run.drift += dt;
      target = Math.max(run.speed * 0.985, cruise * 0.72);
      const stage = run.drift > 2 ? 2 : run.drift > 1 ? 1 : 0;
      driftSpark.current -= dt;
      if (driftSpark.current <= 0) {
        driftSpark.current = 0.07;
        toWorld(run.z - 1.6, run.lat - run.driftDir * 0.9, 0.25, tmpV);
        burst(tmpV.x, tmpV.y, tmpV.z, [["#5fd8ff", "#ffffff"], ["#ff9f43", "#ffd23f"], ["#c84bff", "#ff4f9a"]][stage], 4, 3, 2.5, 0.12);
      }
      if (stage !== driftStage.current) {
        driftStage.current = stage;
        if (stage > 0) audioManager.playClick();
      }
    } else {
      if (run.drift > 0.55 && run.spin <= 0) {
        // release = mini-turbo, bigger the longer you held it
        const stage = run.drift > 2 ? 2 : run.drift > 1 ? 1 : 0;
        run.nitroTime = Math.max(run.nitroTime, [0.55, 0.9, 1.4][stage]);
        run.driftBoosts++;
        run.shake = Math.max(run.shake, 0.25);
        audioManager.playNitro();
        rally.getState().popup(["¡MINI-TURBO!", "¡SUPER TURBO!", "¡ULTRA TURBO! 💜"][stage], [COLORS.cyan, COLORS.orange, "#c84bff"][stage], stage > 0);
        fxCar(FX.nitro, 10 + stage * 8, 7, 3);
      }
      run.drift = 0;
      driftStage.current = 0;
      if (braking) target = 40 / 3.6;
    }

    // nitro
    const wantNitro = input.nitro || input.touchNitro || input.nitroQueued;
    input.nitroQueued = false;
    if (wantNitro && run.nitro >= 1 && run.nitroTime <= 0) {
      run.nitroTime = NITRO_DURATION * car.nitroTime;
      run.nitro = 0;
      run.nitroUses++;
      run.shake = 0.5;
      fxCar(FX.nitro, 26, 9, 3);
      audioManager.playNitro();
      rally.getState().popup("NITRO! x2 POINTS", COLORS.orange, true);
    }
    if (run.nitroTime > 0) {
      run.nitroTime -= dt;
      target = top + 40 / 3.6;
    }
    if (run.slowTime > 0) {
      run.slowTime -= dt;
      target *= 0.55;
    }
    if (run.offroad && !run.airborne) {
      if (circ) {
        // circuits: grass costs a lot, the gravel trap nearly stops you
        const deep = Math.abs(run.lat) > roadHalf() + 1.4;
        target = deep ? Math.min(target, 9 + car.offroad * 6) : target * car.offroad * 0.75;
        if (Math.abs(run.lat) > roadHalf() + 3.9) target = Math.min(target, 12 + car.offroad * 8); // grass
        if (deep && run.speed > 14) {
          run.shake = Math.max(run.shake, 0.3);
          if (run.time - gravelMsg.current > 4) {
            gravelMsg.current = run.time;
            rally.getState().popup("¡FUERA DE PISTA! 🪨", COLORS.orange);
          }
        }
      } else target *= car.offroad;
    }
    if (run.spin > 0) {
      run.spin -= dt;
      target = 8;
    }
    if (run.pullOver) {
      run.pullOver = false;
      const hadShield = run.shield;
      hurt();
      if (run.hearts > 0) {
        run.busted = 2.2;
        run.combo = 0;
        audioManager.playWhistle();
        rally.getState().popup(hadShield ? "🚔 ¡TE PARARON! El escudo pagó el comparendo" : "🚔 ¡TE PARARON! Comparendo por exceso de velocidad −1 ❤️", COLORS.red, true);
      }
    }
    if (run.busted > 0) {
      run.busted -= dt;
      target = 0;
    }
    if (run.washing > 0) {
      run.washing -= dt;
      target = 0;
    }
    const rate = target > run.speed ? (run.nitroTime > 0 ? 2.5 : 0.75 * car.accel) : 2.2;
    run.speed += (target - run.speed) * Math.min(1, rate * dt);

    /* --- steering: the car turns relative to the road and moves sideways by its angle --- */
    const s = run.spin > 0 || run.busted > 0 || run.washing > 0 ? 0 : steerInput();
    run.steer += (s - run.steer) * Math.min(1, dt * 8);
    const drifting = run.drift > 0;
    // how far the wheels can turn: nimble at low speed, calmer flat out; drifting lets you turn in harder
    const maxRel = (0.46 - Math.min(0.24, run.speed * 0.0045)) * car.handling * (drifting ? 1.5 : 1);
    const air = run.airborne ? 0.35 : 1;
    run.rel += (run.steer * maxRel - run.rel) * Math.min(1, dt * 6 * air); // turn in, and self-centre when you let go
    run.latVel = run.speed * Math.sin(run.rel);
    // the faster you go, the harder a bend throws you outward; drifting holds the line
    const push = -roadCurvature(run.z) * run.speed * run.speed * (circ ? 0.16 : 0.35) * (drifting ? 0.6 : 1);
    run.lat += (run.latVel + push) * dt;

    const wall = roadHalf() + (circ ? 3.85 : 3.2);
    if (Math.abs(run.lat) > wall) {
      const hard = circ && Math.abs(run.latVel + push) > 6 && run.speed > 25;
      run.lat = Math.sign(run.lat) * wall;
      run.rel = -Math.sign(run.lat) * 0.06; // nudged back toward the road
      run.latVel = 0;
      run.speed *= hard ? 0.8 : 0.985;
      if (hard) {
        run.shake = Math.max(run.shake, 0.45);
        if (run.time - gravelMsg.current > 1.2) {
          gravelMsg.current = run.time;
          audioManager.playSmash();
          fxCar(FX.smash, 12, 6, 4);
          rally.getState().popup("¡CONTRA LA BARRERA! 💥", COLORS.orange);
        }
      }
    }
    // world position + heading follow the track (used by the car, camera, friends online)
    {
      const f = frameAt(run.z);
      run.wx = f.x + f.nx * run.lat;
      run.wz = f.z + f.nz * run.lat;
      run.heading = f.heading;
    }
    run.offroad = Math.abs(run.lat) > roadHalf() + 0.2;

    /* --- jump physics --- */
    if (run.airborne) {
      run.vy -= 24 * dt;
      run.y += run.vy * dt;
      run.airTime += dt;
      if (run.y <= 0) {
        run.y = 0;
        run.airborne = false;
        audioManager.playLand();
        run.shake = Math.max(run.shake, 0.35);
        if (run.airTime > 0.4) {
          const pts = award(Math.round(run.airTime * 120 * car.airBonus));
          run.totalAir += run.airTime;
          bumpCombo();
          rally.getState().popup(`BIG AIR +${pts}`, COLORS.cyan);
        }
        run.airTime = 0;
      }
    }

    /* --- move --- */
    const dz = run.speed * dt;
    run.z += dz;
    run.score += dz * (run.speed * 3.6 / 100) * 0.5 * multiplierFor(run.combo) * (run.nitroTime > 0 ? 2 : 1);
    run.maxSpeedKmh = Math.max(run.maxSpeedKmh, run.speed * 3.6);

    if (run.combo > 0) {
      run.comboTimer -= dt;
      if (run.comboTimer <= 0) run.combo = 0;
    }
    if (run.invulnerable > 0) run.invulnerable -= dt;

    if (!circ && run.z >= run.nextMilestone) {
      const pts = award(250);
      const g = speedGear(run.nextMilestone);
      if (run.nextMilestone % 1000 === 0 && g > speedGear(run.nextMilestone - 1)) {
        rally.getState().popup(`⚡ MARCHA ${g + 1} — ¡MÁS RÁPIDO!  +${pts}`, COLORS.orange, true);
        run.shake = Math.max(run.shake, 0.4);
        audioManager.playNitro();
      } else rally.getState().popup(`${run.nextMilestone} m!  +${pts}`, COLORS.gold, true);
      audioManager.playMilestone();
      run.nextMilestone += 500;
    }

    useBiome.getState().updateDistance(run.z);

    /* --- story goals --- */
    if (session.mode === "story") {
      const ch = chapterById(session.chapterId);
      if (ch.stage.kind === "endless") {
        if (goalProgress() >= ch.goal.value) {
          rally.getState().popup("GOAL COMPLETE!", COLORS.green, true);
          rally.getState().syncHud();
          rally.getState().finishRace();
          return;
        }
        if (run.z >= ch.stage.limit) {
          rally.getState().syncHud();
          rally.getState().finishRace();
          return;
        }
      }
    }

    /* --- laps (circuits) --- */
    if (circ) {
      const L = lapLength();
      const lapIdx = Math.floor(run.z / L);
      if (lapIdx > race.lap) {
        const lt = run.time - race.lapStart;
        race.lapTimes.push(lt);
        race.lap = lapIdx;
        race.lapStart = run.time;
        if (race.lap >= race.laps) {
          race.finishedAt = run.time;
          if (session.mode === "online") room.send({ t: "finish", id: myId, time: run.time });
          rally.getState().syncHud();
          rally.getState().finishRace();
          return;
        }
        audioManager.playMilestone();
        rally.getState().popup(race.lap === race.laps - 1 ? "🏁 ¡ÚLTIMA VUELTA!" : `VUELTA ${race.lap + 1}/${race.laps}`, COLORS.gold, true);
      }
      netTimer.current += dt;
      if (session.mode === "online" && netTimer.current > 0.1) {
        netTimer.current = 0;
        room.send({ t: "pos", id: myId, z: run.z, lat: run.lat, y: run.y, speed: run.speed, sh: run.shield, sp: run.spin > 0 ? run.spin : 0, n: run.nitroTime > 0, h: run.heading });
      }
    }

    /* --- spawn --- */
    if (circ) spawnCircuit();
    else
      while (nextRow.current < run.z + 210) {
        const z = nextRow.current;
        nextRow.current += spawnRow(z);
      }
    // checkpoint arches (every 500 m) or the start/finish line on circuits
    const step = circ ? lapLength() : 500;
    const nextArchZ = Math.ceil((run.z + 1) / step) * step;
    if (nextArchZ - run.z < 220 && !arches.current.some((a) => a.userData.z === nextArchZ)) {
      const lapN = Math.round(nextArchZ / step) + 1;
      const label = circ ? (lapN > race.laps ? "FINISH" : lapN === race.laps ? "FINAL LAP" : `LAP ${lapN}`) : `${nextArchZ} m`;
      const a = makeArch(label);
      a.userData.z = nextArchZ;
      toWorld(nextArchZ, 0, 0, a.position);
      a.rotation.y = headingAt(nextArchZ);
      if (circ) a.add(makeFinishLine());
      group.current?.add(a);
      arches.current.push(a);
    }
    arches.current = arches.current.filter((a) => {
      if (a.userData.z < run.z - 30) {
        a.parent?.remove(a);
        return false;
      }
      return true;
    });

    /* --- collisions --- */
    for (const e of ents.current) {
      if (e.done) continue;
      const dzE = e.z - run.z;
      if (e.kind === "semaforo") {
        semaforo(e, dzE, dt);
        continue;
      }
      if (e.kind === "fotomulta") {
        if (!e.passed && dzE < -CAR_HALF_L - 0.5) handlePass(e);
        continue;
      }
      if (dzE > 6 || dzE < -4) {
        if (!e.passed && dzE < -CAR_HALF_L - 0.5) handlePass(e);
        continue;
      }
      const dLat = Math.abs(e.lat - run.lat);
      if (e.pickup) {
        const heightOk = e.h === 0 ? run.y < 1.6 : Math.abs(run.y + 0.6 - e.h) < 1.6;
        if (Math.abs(dzE) < 1.9 * car.pickupRange && dLat < 1.6 * car.pickupRange && heightOk) collect(e);
        continue;
      }
      const [hw, hl] = OBSTACLE_SIZE[e.kind as ObstacleKind];
      if (Math.abs(dzE) < CAR_HALF_L + hl && dLat < CAR_HALF_W + hw) {
        if (e.kind === "hueco") {
          if (run.airborne) continue; // jumped it
          e.done = true;
          run.speed *= 0.6;
          run.combo = 0;
          run.shake = Math.max(run.shake, 0.8);
          run.vy = 3; // a jolt
          run.airborne = true;
          run.y = 0.05;
          audioManager.playSmash();
          if (navigator.vibrate) navigator.vibrate(60);
          rally.getState().popup("🕳️ ¡HUECO!", COLORS.orange, true);
          continue;
        }
        if (e.kind === "limpiavidrios") {
          if (run.nitroTime > 0) {
            // on nitro he jumps out of the way
            e.done = true;
            e.obj.visible = false;
            rally.getState().popup("🧽 ¡El mono se quitó!", COLORS.cyan);
            continue;
          }
          if (run.busted > 0 || run.washing > 0) continue;
          e.done = true;
          e.obj.visible = false;
          if (run.shield) {
            // the shield keeps the water off
            rally.getState().popup("🧽 El mono rebotó en el escudo", COLORS.cyan);
            continue;
          }
          // agua, rasqueta y "una monedita": you're stuck for a moment and it costs jars (not a life)
          run.washing = 2.0;
          run.combo = 0;
          run.speed *= 0.3;
          run.shake = Math.max(run.shake, 0.4);
          const tip = Math.min(run.jars, 25);
          run.jars -= tip;
          audioManager.playSplash();
          rally.getState().popup(`🧽 ¡EL MONO TE ECHÓ AGUA!${tip ? ` «Una monedita» −${tip} 🍯` : " «¿Y la monedita?»"}`, COLORS.orange, true);
          continue;
        }
        if (e.kind === "ramp") {
          if (!run.airborne) {
            run.airborne = true;
            run.vy = 10 + run.speed * 0.06;
            run.y = 0.05;
            run.jumps++;
            audioManager.playJump();
            rally.getState().popup("JUMP!", COLORS.cyan);
          }
          e.done = true;
          continue;
        }
        if (e.kind === "boost") {
          if (!run.airborne) {
            run.speed = Math.min(run.speed + 9, top + 12);
            run.nitro = Math.min(1, run.nitro + 0.15 * car.nitroFill);
            run.boosts++;
            run.shake = Math.max(run.shake, 0.25);
            audioManager.playNitroReady();
            rally.getState().popup("BOOST!", COLORS.cyan);
          }
          e.done = true;
          continue;
        }
        if (run.airborne && run.y > 0.9) continue; // flew over it
        if (e.kind === "puddle" && car.puddleProof) {
          e.done = true;
          continue;
        }
        if (e.kind === "puddle") {
          run.slowTime = 0.7;
          e.done = true;
          audioManager.playSplash();
          rally.getState().popup("SPLASH!", COLORS.cyan);
          continue;
        }
        // solid hit
        if (run.nitroTime > 0) {
          smash(e, "SMASH!");
        } else if (car.smashSmall && SMALL.includes(e.kind as ObstacleKind)) {
          smash(e, "CHIVA SMASH!");
        } else if (run.invulnerable > 0) {
          e.passed = true;
        } else {
          const hadShield = run.shield;
          hurt();
          fling(e);
          if (hadShield) bumpCombo();
        }
      } else if (!e.passed && dzE < -CAR_HALF_L - 0.5) {
        handlePass(e);
      }
    }

    // recycle
    ents.current = ents.current.filter((e) => {
      if (e.z < run.z - 18 || (e.done && e.fly <= 0 && e.pickup)) {
        pool.release(e.obj);
        return false;
      }
      return true;
    });

    updateVisuals(dt, state.clock.elapsedTime);
    writeCar();

    hudTimer.current += dt;
    if (hudTimer.current > 0.08) {
      hudTimer.current = 0;
      rally.getState().syncHud();
    }
  });

  /** Spawn the fixed per-lap layout (jars + boost pads) ahead of the car. */
  function spawnCircuit() {
    const L = lapLength();
    const n = circuitNext.current;
    for (let guard = 0; guard < 50; guard++) {
      if (n.lap >= race.laps) return;
      const item = lapItems[n.idx];
      const z = n.lap * L + item.off;
      if (z > run.z + 210) return;
      if (item.kind === "jars") for (let i = 0; i < 5; i++) add("jar", z + i * 4, item.lat);
      else if (item.kind === "ramp") {
        add("ramp", z, item.lat);
        for (let i = 0; i < 5; i++) add("jar", z + 8 + i * 4.5, item.lat, 1.6 + Math.sin((i / 4) * Math.PI) * 1.4);
      } else if (item.kind === "chicane") {
        add("cone", z, item.lat);
        add("cone", z + 12, -item.lat || 4.5);
      } else if (item.kind === "cow") {
        add("cow", z, item.lat);
        if (hash(z) > 0.5) add("cow", z + 9, -item.lat);
      } else add(item.kind as Entity["kind"], z, item.lat);
      n.idx++;
      if (n.idx >= lapItems.length) {
        n.idx = 0;
        n.lap++;
      }
    }
  }

  /** The semáforo just cycles (red → green → amber); the limpiavidrios around it are the hazard. */
  function semaforo(e: Entity, _dz: number, dt: number) {
    e.timer += dt;
    const phase = e.timer % 8;
    const want = phase < 3 ? "red" : phase < 7 ? "green" : "amber";
    for (const n of ["red", "amber", "green"] as const) {
      const l = e.obj.getObjectByName(n) as THREE.Mesh | undefined;
      if (l) (l.material as THREE.MeshStandardMaterial).emissiveIntensity = n === want ? 2.5 : 0.08;
    }
  }

  function handlePass(e: Entity) {
    e.passed = true;
    if (e.kind === "fotomulta") {
      const kmh = run.speed * 3.6;
      const gs = rally.getState();
      const flash = e.obj.getObjectByName("flash") as THREE.Mesh | undefined;
      if (flash) (flash.material as THREE.MeshStandardMaterial).emissiveIntensity = 6;
      run.camFlash = 1;
      if (kmh > 100 || run.nitroTime > 0) {
        run.fines++;
        const fine = Math.min(run.jars, 120);
        run.jars -= fine;
        run.score = Math.max(0, run.score - 300);
        run.combo = 0;
        audioManager.playShieldBreak();
        gs.popup(`📸 ¡FOTOMULTA! COMPARENDO −${fine} 🍯`, COLORS.red, true);
      } else {
        run.cleanCams++;
        const pts = award(150);
        audioManager.playMilestone();
        gs.popup(`📸 ¡LIMPIO! +${pts}`, COLORS.gold, true);
      }
      return;
    }
    if (e.done || e.pickup || !SOLID.includes(e.kind as ObstacleKind)) return;
    const [hw] = OBSTACLE_SIZE[e.kind as ObstacleKind];
    const gap = Math.abs(e.lat - run.lat) - CAR_HALF_W - hw;
    if (gap < 0.9 && !run.airborne && run.speed > 20) {
      run.nearMisses++;
      bumpCombo();
      const pts = award(40);
      rally.getState().popup(`NEAR MISS +${pts}`, COLORS.pink);
      audioManager.playNearMiss();
    }
  }

  function collect(e: Entity) {
    e.done = true;
    e.obj.visible = false;
    const gs = rally.getState();
    fxCar(e.kind === "jar" ? FX.jar : FX.nitro, e.kind === "jar" ? 10 : 18, 4, 4);
    switch (e.kind) {
      case "jar": {
        run.jars++;
        bumpCombo();
        const pts = award(50);
        const wasReady = run.nitro >= 1;
        run.nitro = Math.min(1, run.nitro + (race.active ? 0.12 : 0.07) * car.nitroFill);
        audioManager.playPickup(run.combo);
        gs.popup(`+${pts}`, COLORS.gold);
        if (!wasReady && run.nitro >= 1) {
          audioManager.playNitroReady();
          gs.popup("NITRO READY!", COLORS.orange, true);
        }
        break;
      }
      case "nitro":
        run.nitro = 1;
        award(100);
        audioManager.playNitroReady();
        gs.popup("NITRO READY!", COLORS.orange, true);
        break;
      case "shield":
        run.shield = true;
        award(100);
        audioManager.playShield();
        gs.popup("SHIELD UP!", COLORS.cyan, true);
        break;
      case "tunjo": {
        run.tunjos++;
        bumpCombo();
        const pts = award(500);
        audioManager.playShield();
        audioManager.playMilestone();
        gs.popup(`GOLDEN TUNJO! +${pts}`, COLORS.gold, true);
        break;
      }
      case "heart":
        run.hearts = Math.min(run.maxHearts, run.hearts + 1);
        audioManager.playHeart();
        gs.popup("+1 ♥", COLORS.red, true);
        break;
    }
  }

  function fling(e: Entity) {
    e.done = true;
    const mark = e.obj.getObjectByName("danger");
    if (mark) mark.visible = false;
    e.fly = 1.6;
    e.vx = (e.lat > run.lat ? 1 : -1) * (6 + Math.random() * 4);
    e.vy = 7 + Math.random() * 4;
    e.spin = (Math.random() - 0.5) * 14;
  }

  function smash(e: Entity, label: string) {
    fling(e);
    e.vy += 4;
    run.smashes++;
    toWorld(e.z, e.lat, 0.8, tmpV);
    burst(tmpV.x, tmpV.y, tmpV.z, FX.smash, 16, 7, 6);
    bumpCombo();
    const pts = award(75);
    run.shake = Math.max(run.shake, 0.5);
    audioManager.playSmash();
    rally.getState().popup(`${label} +${pts}`, COLORS.orange);
  }

  function updateVisuals(dt: number, t: number) {
    for (const e of ents.current) {
      const o = e.obj;
      if (e.fly > 0) {
        e.fly -= dt;
        e.lat += e.vx * dt;
        e.vy -= 22 * dt;
        e.h += e.vy * dt;
        e.z += run.speed * 0.6 * dt;
        o.rotation.x += e.spin * dt;
        o.rotation.z += e.spin * 0.7 * dt;
        if (e.fly <= 0) o.visible = false;
      }
      if (e.kind === "limpiavidrios" && !e.done) {
        const sq = o.getObjectByName("squeegee");
        if (sq) sq.rotation.z = Math.sin(t * 7 + e.seed) * 0.35; // scrubbing the air, waiting for a windshield
      }
      if (e.walk && !e.done) {
        e.lat += e.walk * dt;
        if (Math.abs(e.lat) > roadHalf() - 0.5) {
          e.lat = Math.sign(e.lat) * (roadHalf() - 0.5);
          e.walk = -e.walk;
        }
        o.rotation.y = headingAt(e.z) + (e.walk > 0 ? 0 : Math.PI);
      }
      const z = e.z;
      toWorld(z, e.lat, e.h + (e.walk ? Math.abs(Math.sin(t * 6 + e.seed)) * 0.06 : 0), o.position);
      if (e.pickup && !e.done) {
        const spin = o.getObjectByName("spin");
        if (spin) {
          spin.rotation.y = t * 2.5 + e.seed;
          spin.position.y = 1.0 + Math.sin(t * 3 + e.seed) * 0.15;
        }
        const ring = o.getObjectByName("ring");
        if (ring) ring.scale.setScalar(1 + Math.sin(t * 4 + e.seed) * 0.12);
        const beam = o.getObjectByName("beam");
        if (beam) beam.rotation.y = t;
      } else if (!e.pickup && e.fly <= 0 && !e.walk) {
        o.rotation.y = headingAt(z);
      }
    }
    run.camFlash = Math.max(0, run.camFlash - dt * 3);
    // feedback decay
    run.shake = Math.max(0, run.shake - dt * 2.2);
    run.flash = Math.max(0, run.flash - dt * 2.5);
  }

  function writeCar() {
    carPositionRef.current.set(run.wx, groundHeight() + run.y, run.wz);
    carSpeedRef.current = run.speed * 3.6;
    if (rally.getState().phase === "playing") {
      const accel = (run.speed - prevSpeed.current) / Math.max(1e-3, lastDt.current);
      prevSpeed.current = run.speed;
      const throttle = run.nitroTime > 0 ? 1 : input.up ? 1 : input.down || input.touchBrake ? 0 : run.busted > 0 ? 0.1 : 0.55;
      audioManager.updateEngineSound(run.speed * 3.6, run.offroad && !run.airborne, run.nitroTime > 0, throttle, accel);
    }
  }

  return <group ref={group} />;
}

/** The same jars + boost pads every lap (deterministic, so online races match). */
function circuitLayout() {
  if (!isCircuit()) return [{ off: 0, kind: "jars", lat: 0 }];
  const L = lapLength();
  const items: { off: number; kind: string; lat: number }[] = [];
  let i = 0;
  const biome = biomeAt(0);
  const hazard = biome === "tatacoa" ? "rock" : biome === "cartagena" || biome === "cali" ? "puddle" : biome === "comuna_13" ? "chicane" : "cow";
  for (let off = 90; off < L - 60; off += 55 + hash(i * 3.7) * 30) {
    const r = hash(i * 2.17 + 9.3);
    const lat = lanes()[Math.floor(hash(i * 5.3 + 1) * 3)];
    // a jump at roughly a third and two thirds of the lap; hazards sprinkled in between
    const frac = off / L;
    const jumpSpot = (frac > 0.3 && frac < 0.36) || (frac > 0.62 && frac < 0.68);
    items.push({ off, kind: jumpSpot ? "ramp" : r < 0.26 ? "boost" : r < 0.32 ? "nitro" : r < 0.6 ? hazard : "jars", lat });
    i++;
  }
  return items;
}

/** Scenery along both sides of the road, recycled as you drive. */
export function Scenery() {
  const group = useRef<THREE.Group>(null);
  const pool = useMemo(() => new ModelPool(), []);
  const placed = useRef<{ z: number; obj: THREE.Object3D }[]>([]);
  const nextZ = useRef(isCircuit() ? 0 : -30);
  const idx = useRef(0);

  useEffect(() => () => placed.current.forEach((p) => pool.release(p.obj)), [pool]);

  const place = (kind: string, z: number, lat: number, scale = 1, rotY = 0) => {
    const o = pool.acquire(kind);
    toWorld(z, lat, Math.abs(lat) > 12 ? 0.2 : -0.1, o.position);
    o.rotation.set(0, rotY, 0);
    o.scale.setScalar(scale);
    group.current?.add(o);
    placed.current.push({ z, obj: o });
  };

  useFrame(() => {
    const circuitAll = isCircuit();
    const limit = circuitAll ? lapLength() : run.z + 250;
    while (nextZ.current < limit) {
      const z = nextZ.current;
      const i = idx.current++;
      const biome = biomeAt(z);
      const r1 = hash(i * 1.7);
      const r2 = hash(i * 3.3 + 1);
      const r3 = hash(i * 5.1 + 2);
      const heading = headingAt(z);

      // circuits: grandstands around the start/finish straight, tyre walls in the bends
      const circ = isCircuit();
      const off = circ ? ((z % lapLength()) + lapLength()) % lapLength() : 0;
      const nearStart = circ && (off < 150 || off > lapLength() - 60);
      if (circ) {
        for (const side of [-1, 1]) {
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (nearStart) place("grandstand", z, side * (roadHalf() + 4.5), 1, away);
          else if (i % 3 === 1) place("tireWall", z, side * (roadHalf() + 4.3), 1, heading);
        }
      }

      for (const side of [-1, 1]) {
        if (nearStart) break;
        const near = side * (roadHalf() + 3 + r1 * 3);
        const far = side * (16 + r2 * 22);
        const face = heading + (side > 0 ? Math.PI : 0); // doors look at the road
        if (biome === "coffee_hills") {
          if (r1 < 0.85) place(r1 < 0.6 ? "coffeeBush" : "banana", z + side * 2, near, 0.9 + r3 * 0.5, r2 * 6);
          else place("fence", z + side * 2, near, 1, heading);
          if (r2 > 0.45) place("waxPalm", z + 4, far, 0.8 + r3 * 0.6, 0);
          else place("coffeeBush", z + 4, far, 1.2 + r3, r1 * 6);
        } else if (biome === "andes_highland") {
          place(r1 < 0.6 ? "frailejon" : "boulder", z + side * 2, near + side * 0.5, 0.8 + r3 * 0.7, r2 * 6);
          place(r2 > 0.4 ? "pine" : "boulder", z + 4, far, 1 + r3 * 0.8, r1 * 6);
        } else if (biome === "comuna_13") {
          // night barrio: graffiti walls and neon by the road, houses up the hills
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (r1 < 0.5) place(`graffiti${Math.floor(r3 * 8)}`, z, side * (roadHalf() + 3), 1, heading);
          else if (r1 < 0.75) place("neonPalm", z, side * (roadHalf() + 3 + r2 * 2), 0.9 + r3 * 0.3, r2 * 6);
          else place("lamp", z, side * (roadHalf() + 2.2), 1, heading + (side > 0 ? 0 : Math.PI));
          place(`barrio${Math.floor(r2 * 5)}`, z + 4, side * (roadHalf() + 9 + r3 * 6), 1, away);
          if (i % 7 === 3) place("escalator", z + 8, side * (roadHalf() + 5), 1, away);
          if (i % 6 === 2) place(`neonSign${Math.floor(r3 * 3)}`, z, side * (roadHalf() + 3.6), 1, heading + side * 0.3);
        } else if (biome === "tatacoa") {
          // red canyons, cacti and the observatory
          const away = heading + (side > 0 ? 0 : Math.PI);
          place("cactus", z + side * 2, near, 0.8 + r3 * 0.6, r2 * 6);
          if (r1 < 0.7) place("redRock", z + 4, far, 1 + r3 * 0.8, r2 * 6);
          if (i % 19 === 7 && side > 0) place("observatory", z, side * (roadHalf() + 16), 1, away);
        } else if (biome === "cali") {
          // sugar cane fields, fruit stands, salsa clubs, the cat by the river, Cristo Rey on the hill
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (r1 < 0.45) place("sugarcane", z, side * (roadHalf() + 7 + r2 * 4), 1, r3 * 6);
          else if (r1 < 0.6) place("fruitStand", z, side * (roadHalf() + 3), 1, away);
          else place("coconutPalm", z, side * (roadHalf() + 3 + r2 * 2), 0.9 + r3 * 0.3, r2 * 6);
          if (r2 > 0.55) place("sugarcane", z + 4, far, 1.2, r1 * 6);
          else if (r2 < 0.2) place(`barrio${Math.floor(r3 * 5)}`, z + 4, side * (roadHalf() + 14 + r3 * 6), 1, away);
          if (i % 11 === 5 && side < 0) place("gato", z, side * (roadHalf() + 4), 1, away + Math.PI);
          if (i % 9 === 1 && side > 0) place("salsaSign", z, side * (roadHalf() + 3.6), 1, heading + 0.3);
          if (i % 40 === 20 && side < 0) place("cristoRey", z + 60, side * 75, 1, 0);
        } else if (biome === "cartagena") {
          // sea on the left, walls + colonial balconies on the right
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (side < 0) {
            if (i % 2 === 0) place("sea", z, -(roadHalf() + 4), 1, away);
            if (r1 < 0.6) place("coconutPalm", z + 3, -(roadHalf() + 3 + r2 * 3), 0.9 + r3 * 0.3, r2 * 6);
          } else {
            if (r1 < 0.45) place("cityWall", z, roadHalf() + 4, 1, heading);
            else place(`colonial${Math.floor(r3 * 7)}`, z, roadHalf() + 4, 1, away);
            if (i % 23 === 11) place("clockTower", z + 4, roadHalf() + 12, 1, away);
          }
        } else if (biome === "ciudad_perdida") {
          // dense jungle: ferns at the road, terraces, huts and giant ceibas behind
          place("fern", z + side * 2, near - side * 0.8, 0.9 + r3 * 0.6, r2 * 6);
          if (r1 < 0.3) place("hut", z + 3, side * (roadHalf() + 10 + r2 * 4), 1, face);
          else if (r1 < 0.55) place("terrace", z + 3, side * (roadHalf() + 11 + r2 * 3), 1, r3 * 6);
          else if (r1 < 0.65) place("stairs", z, side * (roadHalf() + 4.5), 1, heading + (side > 0 ? 0 : Math.PI)); // climbs away from the road
          place("ceiba", z + 6, far * 1.1, 0.8 + r3 * 0.5, r1 * 6);
        } else {
          if (r1 < 0.7) place(`house${Math.floor(r3 * 7)}`, z, side * (roadHalf() + 7 + r2 * 2), 1, face);
          else place("lamp", z, side * (roadHalf() + 2.2), 1, heading + (side > 0 ? 0 : Math.PI));
          if (r2 > 0.5) place(`house${Math.floor(r1 * 7)}`, z + 5, far, 1, face);
        }
      }
      // sponsor boards and bunting
      if (i % 9 === 4) {
        const side = i % 2 ? 1 : -1;
        place("banner", z, side * (roadHalf() + 2.6), 1, heading + side * 0.35);
      }
      if (biome === "pueblo" && i % 3 === 0) place("bunting", z + 3, 0, 1, heading);

      nextZ.current += circuitAll ? 12 : biome === "pueblo" ? 13 : 9;
    }
    if (circuitAll) return; // the whole circuit stays dressed for every lap
    placed.current = placed.current.filter((p) => {
      if (p.z < run.z - 40) {
        pool.release(p.obj);
        return false;
      }
      return true;
    });
  });

  return <group ref={group} />;
}
