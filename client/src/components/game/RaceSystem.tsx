import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { run, multiplierFor, MAX_HEARTS, NITRO_DURATION, INVULNERABLE_TIME } from "@/lib/game/run";
import { input, steerInput } from "@/lib/input";
import { roadX, roadY, roadCurvature, ROAD_HALF, LANES, hash, biomeAt, lapLength, isCircuit } from "@/lib/track";
import { ModelPool, OBSTACLE_SIZE, type ObstacleKind, type PickupKind, makeArch, makeFinishLine } from "@/lib/game/models";
import { useRally, goalProgress } from "@/lib/stores/useRally";
import { car, session } from "@/lib/game/session";
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
const SOLID: ObstacleKind[] = ["cone", "rock", "sacks", "barrier", "cow"];
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
  const countdownTimer = useRef(0);
  const lastCount = useRef(4);
  const arches = useRef<THREE.Object3D[]>([]);
  const netTimer = useRef(0);
  const lapItems = useMemo(() => circuitLayout(), []);
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
    const walk = kind === "cow" ? (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.8) : 0;
    ents.current.push({ kind, pickup, z, lat, h, passed: false, done: false, fly: 0, vx: 0, vy: 0, spin: 0, obj, seed: Math.random() * 10, walk });
  };

  const lane = (i: number) => LANES[((i % 3) + 3) % 3];

  const spawnRow = (z: number) => {
    const d = Math.min(1, z / 3500); // difficulty 0..1
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

    const patterns: [number, () => number][] = [
      [3, () => { // jar line
        for (let i = 0; i < 6; i++) add("jar", z + i * 4, lane(li));
        if (Math.random() < 0.5 + d * 0.4) add(solid(), z + 10, lane(li + 1 + Math.floor(Math.random() * 2)));
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
      [1 + d * 3, () => { // double: thread the gap
        add(solid(), z, lane(li));
        add(solid(), z, lane(li + 1));
        add("jar", z, lane(li + 2));
        add("jar", z + 4, lane(li + 2));
        return 28;
      }],
      [0.5 + d * 1.5, () => { // cone slalom
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
      [["coffee_hills", "andes_highland", "pueblo"].includes(biomeAt(z)) ? 0.9 : 0, () => { // cows crossing!
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
      [0.55, () => { // power-up
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
        return len + 26 - d * 14 + Math.random() * 8;
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

    // countdown 3-2-1-GO
    if (phase === "countdown") {
      countdownTimer.current += dt;
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
          rally.getState().popup("GO!", COLORS.gold, true);
          countdownTimer.current = 0;
          lastCount.current = 4;
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
    const top = ((circ ? 182 : 170 + d * 30) / 3.6) * car.top;
    const cruise = circ ? top * 0.93 : ((100 + d * 50) / 3.6) * car.top;
    let target = input.up ? top : cruise;
    if (input.down || input.touchBrake) target = 40 / 3.6;

    // nitro
    const wantNitro = input.nitro || input.touchNitro || input.nitroQueued;
    input.nitroQueued = false;
    if (wantNitro && run.nitro >= 1 && run.nitroTime <= 0) {
      run.nitroTime = NITRO_DURATION * car.nitroTime;
      run.nitro = 0;
      run.nitroUses++;
      run.shake = 0.5;
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
        const deep = Math.abs(run.lat) > ROAD_HALF + 1.4;
        target = deep ? Math.min(target, 9 + car.offroad * 6) : target * car.offroad * 0.75;
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
    const rate = target > run.speed ? (run.nitroTime > 0 ? 2.5 : 0.75 * car.accel) : 2.2;
    run.speed += (target - run.speed) * Math.min(1, rate * dt);

    /* --- steering --- */
    const s = run.spin > 0 ? 0 : steerInput();
    run.steer += (s - run.steer) * Math.min(1, dt * 10);
    const latMax = (7 + run.speed * 0.13) * car.handling;
    const air = run.airborne ? 0.35 : 1;
    run.latVel += (run.steer * latMax - run.latVel) * Math.min(1, dt * 9 * air);
    const push = -roadCurvature(run.z) * run.speed * run.speed * (circ ? 0.35 : 0.5); // bends push you outward
    run.lat += (run.latVel + push) * dt;
    const wall = ROAD_HALF + (circ ? 3.6 : 3.2);
    if (Math.abs(run.lat) > wall) {
      run.lat = Math.sign(run.lat) * wall;
      run.latVel = 0;
      run.speed *= 0.985;
    }
    run.offroad = Math.abs(run.lat) > ROAD_HALF + 0.2;

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
      rally.getState().popup(`${run.nextMilestone} m!  +${pts}`, COLORS.gold, true);
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
        rally.getState().popup(race.lap === race.laps - 1 ? "FINAL LAP!" : `LAP ${race.lap + 1}/${race.laps}`, COLORS.gold, true);
      }
      netTimer.current += dt;
      if (session.mode === "online" && netTimer.current > 0.1) {
        netTimer.current = 0;
        room.send({ t: "pos", id: myId, z: run.z, lat: run.lat, y: run.y, speed: run.speed });
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
      a.position.set(roadX(nextArchZ), roadY(nextArchZ), nextArchZ);
      a.rotation.y = Math.atan(roadX(nextArchZ + 0.5) - roadX(nextArchZ - 0.5));
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
      else add(item.kind as Entity["kind"], z, item.lat);
      n.idx++;
      if (n.idx >= lapItems.length) {
        n.idx = 0;
        n.lap++;
      }
    }
  }

  function handlePass(e: Entity) {
    e.passed = true;
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
      if (e.walk && !e.done) {
        e.lat += e.walk * dt;
        if (Math.abs(e.lat) > ROAD_HALF - 0.5) {
          e.lat = Math.sign(e.lat) * (ROAD_HALF - 0.5);
          e.walk = -e.walk;
        }
        o.rotation.y = e.walk > 0 ? 0 : Math.PI;
        o.position.y += Math.abs(Math.sin(t * 6 + e.seed)) * 0.05;
      }
      const z = e.z;
      o.position.set(roadX(z) + e.lat, roadY(z) + e.h + (e.walk ? Math.abs(Math.sin(t * 6 + e.seed)) * 0.06 : 0), z);
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
        o.rotation.y = Math.atan(roadX(z + 0.5) - roadX(z - 0.5));
      }
    }
    // feedback decay
    run.shake = Math.max(0, run.shake - dt * 2.2);
    run.flash = Math.max(0, run.flash - dt * 2.5);
  }

  function writeCar() {
    carPositionRef.current.set(roadX(run.z) + run.lat, roadY(run.z) + run.y, run.z);
    carSpeedRef.current = run.speed * 3.6;
    if (rally.getState().phase === "playing") {
      audioManager.updateEngineSound(run.speed * 3.6, run.offroad && !run.airborne, run.nitroTime > 0);
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
  for (let off = 90; off < L - 60; off += 55 + hash(i * 3.7) * 30) {
    const r = hash(i * 9.1 + 4);
    const lat = LANES[Math.floor(hash(i * 5.3 + 1) * 3)];
    items.push({ off, kind: r < 0.35 ? "boost" : r < 0.42 ? "nitro" : "jars", lat });
    i++;
  }
  return items;
}

/** Scenery along both sides of the road, recycled as you drive. */
export function Scenery() {
  const group = useRef<THREE.Group>(null);
  const pool = useMemo(() => new ModelPool(), []);
  const placed = useRef<{ z: number; obj: THREE.Object3D }[]>([]);
  const nextZ = useRef(-30);
  const idx = useRef(0);

  useEffect(() => () => placed.current.forEach((p) => pool.release(p.obj)), [pool]);

  const place = (kind: string, z: number, lat: number, scale = 1, rotY = 0) => {
    const o = pool.acquire(kind);
    o.position.set(roadX(z) + lat, roadY(z) + (Math.abs(lat) > 12 ? 0.2 : -0.1), z);
    o.rotation.set(0, rotY, 0);
    o.scale.setScalar(scale);
    group.current?.add(o);
    placed.current.push({ z, obj: o });
  };

  useFrame(() => {
    while (nextZ.current < run.z + 250) {
      const z = nextZ.current;
      const i = idx.current++;
      const biome = biomeAt(z);
      const r1 = hash(i * 1.7);
      const r2 = hash(i * 3.3 + 1);
      const r3 = hash(i * 5.1 + 2);
      const heading = Math.atan(roadX(z + 0.5) - roadX(z - 0.5));

      // circuits: grandstands around the start/finish straight, tyre walls in the bends
      const circ = isCircuit();
      const off = circ ? ((z % lapLength()) + lapLength()) % lapLength() : 0;
      const nearStart = circ && (off < 150 || off > lapLength() - 60);
      if (circ) {
        for (const side of [-1, 1]) {
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (nearStart) place("grandstand", z, side * (ROAD_HALF + 4.5), 1, away);
          else if (i % 3 === 1) place("tireWall", z, side * (ROAD_HALF + 4.3), 1, heading);
        }
      }

      for (const side of [-1, 1]) {
        if (nearStart) break;
        const near = side * (ROAD_HALF + 3 + r1 * 3);
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
          if (r1 < 0.5) place(`graffiti${Math.floor(r3 * 8)}`, z, side * (ROAD_HALF + 3), 1, heading);
          else if (r1 < 0.75) place("neonPalm", z, side * (ROAD_HALF + 3 + r2 * 2), 0.9 + r3 * 0.3, r2 * 6);
          else place("lamp", z, side * (ROAD_HALF + 2.2), 1, heading + (side > 0 ? 0 : Math.PI));
          place(`barrio${Math.floor(r2 * 5)}`, z + 4, side * (ROAD_HALF + 9 + r3 * 6), 1, away);
          if (i % 7 === 3) place("escalator", z + 8, side * (ROAD_HALF + 5), 1, away);
          if (i % 6 === 2) place(`neonSign${Math.floor(r3 * 3)}`, z, side * (ROAD_HALF + 3.6), 1, heading + side * 0.3);
        } else if (biome === "tatacoa") {
          // red canyons, cacti and the observatory
          const away = heading + (side > 0 ? 0 : Math.PI);
          place("cactus", z + side * 2, near, 0.8 + r3 * 0.6, r2 * 6);
          if (r1 < 0.7) place("redRock", z + 4, far, 1 + r3 * 0.8, r2 * 6);
          if (i % 19 === 7 && side > 0) place("observatory", z, side * (ROAD_HALF + 16), 1, away);
        } else if (biome === "cali") {
          // sugar cane fields, fruit stands, salsa clubs, the cat by the river, Cristo Rey on the hill
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (r1 < 0.45) place("sugarcane", z, side * (ROAD_HALF + 7 + r2 * 4), 1, r3 * 6);
          else if (r1 < 0.6) place("fruitStand", z, side * (ROAD_HALF + 3), 1, away);
          else place("coconutPalm", z, side * (ROAD_HALF + 3 + r2 * 2), 0.9 + r3 * 0.3, r2 * 6);
          if (r2 > 0.55) place("sugarcane", z + 4, far, 1.2, r1 * 6);
          else if (r2 < 0.2) place(`barrio${Math.floor(r3 * 5)}`, z + 4, side * (ROAD_HALF + 14 + r3 * 6), 1, away);
          if (i % 11 === 5 && side < 0) place("gato", z, side * (ROAD_HALF + 4), 1, away + Math.PI);
          if (i % 9 === 1 && side > 0) place("salsaSign", z, side * (ROAD_HALF + 3.6), 1, heading + 0.3);
          if (i % 40 === 20 && side < 0) place("cristoRey", z + 60, side * 75, 1, 0);
        } else if (biome === "cartagena") {
          // sea on the left, walls + colonial balconies on the right
          const away = heading + (side > 0 ? 0 : Math.PI);
          if (side < 0) {
            if (i % 2 === 0) place("sea", z, -(ROAD_HALF + 4), 1, away);
            if (r1 < 0.6) place("coconutPalm", z + 3, -(ROAD_HALF + 3 + r2 * 3), 0.9 + r3 * 0.3, r2 * 6);
          } else {
            if (r1 < 0.45) place("cityWall", z, ROAD_HALF + 4, 1, heading);
            else place(`colonial${Math.floor(r3 * 7)}`, z, ROAD_HALF + 4, 1, away);
            if (i % 23 === 11) place("clockTower", z + 4, ROAD_HALF + 12, 1, away);
          }
        } else if (biome === "ciudad_perdida") {
          // dense jungle: ferns at the road, terraces, huts and giant ceibas behind
          place("fern", z + side * 2, near - side * 0.8, 0.9 + r3 * 0.6, r2 * 6);
          if (r1 < 0.3) place("hut", z + 3, side * (ROAD_HALF + 10 + r2 * 4), 1, face);
          else if (r1 < 0.55) place("terrace", z + 3, side * (ROAD_HALF + 11 + r2 * 3), 1, r3 * 6);
          else if (r1 < 0.65) place("stairs", z, side * (ROAD_HALF + 4.5), 1, heading + (side > 0 ? 0 : Math.PI)); // climbs away from the road
          place("ceiba", z + 6, far * 1.1, 0.8 + r3 * 0.5, r1 * 6);
        } else {
          if (r1 < 0.7) place(`house${Math.floor(r3 * 7)}`, z, side * (ROAD_HALF + 7 + r2 * 2), 1, face);
          else place("lamp", z, side * (ROAD_HALF + 2.2), 1, heading + (side > 0 ? 0 : Math.PI));
          if (r2 > 0.5) place(`house${Math.floor(r1 * 7)}`, z + 5, far, 1, face);
        }
      }
      // sponsor boards and bunting
      if (i % 9 === 4) {
        const side = i % 2 ? 1 : -1;
        place("banner", z, side * (ROAD_HALF + 2.6), 1, heading + side * 0.35);
      }
      if (biome === "pueblo" && i % 3 === 0) place("bunting", z + 3, 0, 1, heading);

      nextZ.current += biome === "pueblo" ? 13 : 9;
    }
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
