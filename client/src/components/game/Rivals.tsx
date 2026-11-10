import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { race, type Racer } from "@/lib/game/race";
import { run } from "@/lib/game/run";
import { session, hasRivals, classRivals, classSpeed } from "@/lib/game/session";
import { RIVALS } from "@/lib/game/circuits";
import { carById, type CarId, type DriverId, type PaintId } from "@/lib/game/garage";
import { buildVehicle, type CarRig } from "@/lib/game/vehicles";
import { room, myId } from "@/lib/game/net";
import { toWorld, headingAt, roadCurvature, roadHalf, bendAhead, cornerSpeed } from "@/lib/track";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { animateWobble } from "./Car";
import { shoveLat } from "@/lib/game/physics";
import { burst } from "@/lib/game/fx";
import { useProfile } from "@/lib/stores/useProfile";

const tmpV = { x: 0, y: 0, z: 0 };
/** Rough kart mass (relative): what wins a shoving match. */
const massOf = (id: string) => (id === "chiva" ? 2.2 : id === "willys" ? 1.5 : id === "taxi" ? 1.3 : id === "cuatro" ? 0.9 : id === "dn" ? 1.1 : 1);

function nameTag(text: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(14,27,36,0.75)";
  ctx.beginPath();
  ctx.roundRect(4, 8, 248, 48, 20);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(3.2, 0.8, 1);
  s.renderOrder = 10;
  return s;
}

/** AI rivals on circuits, and friends' cars in online races. */
export function Rivals() {
  const group = useRef<THREE.Group>(null);
  const rigs = useRef(new Map<string, CarRig>());
  const bumpCd = useRef(new Map<string, number>());
  const targets = useRef(new Map<string, { z: number; lat: number; y: number; speed: number }>());
  const online = session.mode === "online";

  // create the grid
  useMemo(() => {
    if (!race.active || online || race.racers.length || !hasRivals()) return;
    RIVALS.forEach((r, i) => {
      race.racers.push({
        id: `ai${i}`,
        name: r.name,
        car: r.car,
        driver: r.driver,
        paint: r.paint,
        z: 8 + Math.floor(i / 2) * 9,
        lat: i % 2 ? 3 : -3,
        y: 0,
        speed: 0,
        skill: r.skill,
        seed: i * 1.7,
        finishedAt: null,
        remote: false,
        lastSeen: 0,
        nitro: 0,
        spin: 0,
        slow: 0,
        shield: false,
        item: null,
        itemCd: 0,
      });
    });
  }, [online]);

  // online: listen for friends' positions
  useEffect(() => {
    if (!online) return;
    return room.onMessage((m) => {
      if (m.t === "pos" && m.id !== myId) {
        let r = race.racers.find((x) => x.id === m.id);
        if (!r) {
          const peer = room.peers.get(m.id);
          r = {
            id: m.id,
            name: peer?.name || "Friend",
            car: peer?.car || "rally7",
            driver: peer?.driver || "pixel",
            paint: peer?.paint || "dn",
            z: m.z,
            lat: m.lat,
            y: m.y,
            speed: m.speed,
            skill: 1,
            seed: 0,
            finishedAt: null,
            remote: true,
            lastSeen: Date.now(),
            nitro: 0,
            spin: 0,
            slow: 0,
            shield: false,
            item: null,
            itemCd: 0,
          };
          race.racers.push(r);
        }
        r.lastSeen = Date.now();
        r.shield = !!m.sh;
        if (m.sp && r.spin <= 0) r.spin = m.sp;
        r.nitro = m.n ? 0.3 : 0;
        if (typeof m.h === "number") r.heading = m.h;
        targets.current.set(m.id, { z: m.z, lat: m.lat, y: m.y, speed: m.speed });
      } else if (m.t === "finish") {
        const r = race.racers.find((x) => x.id === m.id);
        if (r) r.finishedAt = m.time;
      } else if (m.t === "leave") {
        race.racers = race.racers.filter((x) => x.id !== m.id);
      }
    });
  }, [online]);

  useEffect(() => {
    const map = rigs.current;
    return () => {
      map.forEach((rig) => rig.root.parent?.remove(rig.root));
      map.clear();
    };
  }, []);

  useFrame((state, delta) => {
    if (!race.active) return;
    const dt = Math.min(delta, 1 / 20) * run.timeScale;
    const phase = useRally.getState().phase;
    const t = state.clock.elapsedTime;
    const total = race.laps * race.length;

    for (const r of race.racers) {
      if (r.remote) {
        if (r.spin > 0) r.spin -= dt;
        if (r.nitro > 0) r.nitro -= dt;
        // smooth toward the latest network position (with a little prediction)
        const tg = targets.current.get(r.id);
        if (tg) {
          tg.z += tg.speed * dt;
          r.z += (tg.z - r.z) * Math.min(1, dt * 8);
          r.lat += (tg.lat - r.lat) * Math.min(1, dt * 8);
          r.y += (tg.y - r.y) * Math.min(1, dt * 8);
          r.speed = tg.speed;
        }
      } else if (phase === "playing" || phase === "gameover") {
        updateAI(r, dt, total);
        // kart-to-kart contact with the player: heavier car wins, speed difference decides the hit
        const dz = r.z - run.z;
        const dlat = run.lat - r.lat;
        const rc = carById(r.car);
        const reach = (rc.id === "chiva" ? 3 : 2.1) + 1.9;
        if (phase === "playing" && Math.abs(dz) < reach && Math.abs(dlat) < 1.9 && run.y < 1) {
          const cd = bumpCd.current.get(r.id) ?? 0;
          const dir = Math.sign(dlat) || 1;
          const overlap = 1.9 - Math.abs(dlat);
          const mR = massOf(rc.id), mP = massOf(useProfile.getState().car);
          const total = mR + mP;
          // separate in proportion to mass (light kart gets shoved more)
          shoveLat(dir * overlap * (mR / total) * 1.2);
          r.lat -= dir * overlap * (mP / total) * 1.2;
          const closing = Math.abs(run.latVel) + Math.abs(dz) * 0.1;
          const rearEnd = Math.abs(dlat) < 0.9 && Math.abs(dz) > 1.4;
          if (rearEnd) {
            // nose to tail: the car behind loses speed, the one in front gets a shove
            if (dz > 0) {
              run.speed *= 0.9;
              r.speed = Math.min(r.speed + run.speed * 0.08, r.speed * 1.12);
            } else {
              r.speed *= 0.9;
              run.speed = Math.min(run.speed + r.speed * 0.08, run.speed * 1.12);
            }
          } else {
            run.heading += dir * 0.025 * (mR / total) * 2;
            run.rel += dir * 0.04;
            run.speed *= 0.985;
            r.speed *= 0.975;
          }
          if (t > cd) {
            bumpCd.current.set(r.id, t + 0.5);
            const hard = closing > 7 || run.nitroTime > 0 || r.nitro > 0;
            run.shake = Math.max(run.shake, hard ? 0.6 : 0.25);
            audioManager.playSmash();
            toWorld(run.z, run.lat + dlat * 0.5, 0.8, tmpV);
            burst(tmpV.x, tmpV.y, tmpV.z, ["#ffffff", "#ffd23f", "#aaaaaa"], hard ? 16 : 8, 5, 4, 0.14);
            // a hard side hit from a heavier car (or with nitro) spins the lighter one out
            if (hard && !rearEnd) {
              if (mR > mP * 1.15 && run.spin <= 0 && run.invulnerable <= 0 && !run.shield) {
                run.spin = 0.8;
                run.invulnerable = 2.4;
                run.speed *= 0.6;
                useRally.getState().popup(`💥 ¡${r.name} te mandó a volar!`, "#ff9f43", true);
              } else if (mP >= mR && r.spin <= 0 && (r.immune ?? 0) <= 0 && !r.shield) {
                r.spin = 0.8;
                r.immune = 2.4;
                r.speed *= 0.6;
                run.hitsLanded++;
                useRally.getState().popup(`💥 ¡Trompo a ${r.name}!`, "#ffd23f");
              }
            }
            if (run.nitroTime > 0) r.speed *= 0.7;
          }
        }
      }
    }

    // rivals bumping into each other (AI only, so online stays in sync)
    for (let i = 0; i < race.racers.length; i++) {
      const a = race.racers[i];
      if (a.remote) continue;
      for (let j = i + 1; j < race.racers.length; j++) {
        const b = race.racers[j];
        if (b.remote) continue;
        const dz = a.z - b.z, dl = a.lat - b.lat;
        if (Math.abs(dz) < 4 && Math.abs(dl) < 1.8) {
          const dir = Math.sign(dl) || (a.seed > b.seed ? 1 : -1);
          const overlap = 1.8 - Math.abs(dl);
          a.lat += dir * overlap * 0.5;
          b.lat -= dir * overlap * 0.5;
          if (dz > 0) b.speed *= 0.985;
          else a.speed *= 0.985;
        }
      }
    }

    // draw
    for (const r of race.racers) {
      let rig = rigs.current.get(r.id);
      if (!rig) {
        rig = buildVehicle(r.car as CarId, r.paint as PaintId, r.driver as DriverId);
        rig.wobble.forEach((w) => (w.userData.baseX = w.rotation.x));
        const tag = nameTag(r.name, r.remote ? "#7bd389" : "#ffd23f");
        tag.position.y = carById(r.car).id === "chiva" ? 4.4 : 3.1;
        rig.root.add(tag);
        rigs.current.set(r.id, rig);
        group.current?.add(rig.root);
      }
      const z = r.z;
      toWorld(z, r.lat, r.y, rig.root.position);
      rig.root.rotation.set(0, (r.remote && r.heading !== undefined ? r.heading : headingAt(z)) + (r.spin > 0 ? (1 - r.spin) * Math.PI * 4 : 0), 0);
      rig.shield.visible = r.shield;
      rig.wheels.forEach((w) => (w.rotation.x += (r.speed * dt) / 0.42));
      animateWobble(rig, t + r.seed, r.speed, false);
      rig.flames.visible = r.nitro > 0;
      // fade remote cars that stopped sending
      rig.root.visible = !r.remote || Date.now() - r.lastSeen < 6000;
    }
    // remove rigs for racers that left
    rigs.current.forEach((rig, id) => {
      if (!race.racers.some((r) => r.id === id)) {
        rig.root.parent?.remove(rig.root);
        rigs.current.delete(id);
      }
    });
  });

  function updateAI(r: Racer, dt: number, total: number) {
    if (r.finishedAt !== null) {
      r.speed += (20 - r.speed) * Math.min(1, dt);
      r.z += r.speed * dt;
      return;
    }
    const c = carById(r.car).stats;
    const base = (208 / 3.6) * c.top * r.skill * classSpeed() * classRivals();
    // brake for corners like a real driver: look ahead, judge more distance the faster you go
    const look = 10 + r.speed * 1.1;
    // rivals carry real speed through corners now (they 'drift' too): ~1.35x the plain cornering speed
    const corner = Math.min(1, (cornerSpeed(bendAhead(r.z, 0, look)) * 1.35 * (1 + (r.skill - 1) * 2)) / base);
    const diff = r.z - run.z;
    // rubber band: a leader far ahead eases off so you can catch up; a chaser gets a bit extra
    const band = diff > 90 ? 0.9 : diff > 40 ? 0.96 : diff < -120 ? 1.14 : diff < -60 ? 1.09 : diff < -20 ? 1.04 : 1;
    if (r.nitro > 0) r.nitro -= dt;
    else if (r.z > race.length * 0.15 && Math.random() < dt * 0.04) r.nitro = 1.6;
    if (r.spin > 0) r.spin -= dt;
    if (r.slow > 0) r.slow -= dt;
    if ((r.immune ?? 0) > 0) r.immune! -= dt;
    const hurt = r.spin > 0 ? 0.25 : r.slow > 0 ? 0.6 : 1;
    const target = base * corner * band * (r.nitro > 0 ? 1.18 : 1) * hurt;
    r.speed += (target - r.speed) * Math.min(1, dt * (target < r.speed ? 2.2 : 0.9 * c.accel));
    r.z += r.speed * dt;

    // racing line: hug the inside of bends, dodge whoever is ahead
    const edge = roadHalf() - 2.2;
    let line = THREE.MathUtils.clamp(-roadCurvature(r.z + 25) * 450, -edge, edge) + Math.sin(r.z * 0.01 + r.seed) * 0.9;
    const others = [{ z: run.z, lat: run.lat }, ...race.racers.filter((o) => o !== r)];
    for (const o of others) {
      const dz = o.z - r.z;
      if (dz > 0 && dz < 9 && Math.abs(o.lat - r.lat) < 2.2) {
        line = o.lat + (r.lat >= o.lat ? 2.6 : -2.6);
        break;
      }
    }
    // the rival just ahead of you defends: it drifts over to block your line (sharper drivers block more)
    const playerBehind = run.z < r.z && r.z - run.z < 16 && run.z > r.z - 16;
    if (playerBehind && r.skill >= 0.96 && Math.abs(run.lat - r.lat) < 4.5) line = THREE.MathUtils.clamp(run.lat, -edge, edge);
    // a rival alongside leans on you
    if (Math.abs(r.z - run.z) < 3 && Math.abs(run.lat - r.lat) < 3.2 && Math.abs(run.lat - r.lat) > 1.6 && r.skill >= 0.97) line = run.lat;
    r.lat += THREE.MathUtils.clamp(line - r.lat, -1, 1) * dt * 2.4 * c.handling;
    r.lat = THREE.MathUtils.clamp(r.lat, -(roadHalf() - 0.8), roadHalf() - 0.8);
    if (r.z >= total) r.finishedAt = run.time;
  }

  return <group ref={group} />;
}
