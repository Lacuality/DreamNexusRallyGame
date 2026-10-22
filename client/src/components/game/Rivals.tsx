import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { race, type Racer } from "@/lib/game/race";
import { run } from "@/lib/game/run";
import { session } from "@/lib/game/session";
import { RIVALS } from "@/lib/game/circuits";
import { carById, type CarId, type DriverId, type PaintId } from "@/lib/game/garage";
import { buildVehicle, type CarRig } from "@/lib/game/vehicles";
import { room, myId } from "@/lib/game/net";
import { roadX, roadY, roadSlope, roadCurvature, ROAD_HALF, bendAhead, cornerSpeed } from "@/lib/track";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { animateWobble } from "./Car";

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
    if (!race.active || online || race.racers.length) return;
    RIVALS.forEach((r, i) => {
      race.racers.push({
        id: `ai${i}`,
        name: r.name,
        car: r.car,
        driver: r.driver,
        paint: r.paint,
        z: 8 + Math.floor(i / 2) * 9,
        lat: i % 2 ? 2 : -2,
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
    const dt = Math.min(delta, 1 / 20);
    const phase = useRally.getState().phase;
    const t = state.clock.elapsedTime;
    const total = race.laps * race.length;

    for (const r of race.racers) {
      if (r.remote) {
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
        // bump into the player
        const dz = r.z - run.z;
        const dlat = run.lat - r.lat;
        const reach = (carById(r.car).id === "chiva" ? 3 : 2.1) + 1.9;
        if (phase === "playing" && Math.abs(dz) < reach && Math.abs(dlat) < 1.8 && run.y < 1) {
          const cd = bumpCd.current.get(r.id) ?? 0;
          const dir = Math.sign(dlat) || 1;
          const push = 1.8 - Math.abs(dlat);
          run.lat += dir * push * 0.6;
          r.lat -= dir * push * 0.4;
          run.latVel = dir * 4;
          if (dz > 0) run.speed *= 0.985;
          else r.speed *= 0.96;
          if (t > cd) {
            bumpCd.current.set(r.id, t + 0.6);
            run.shake = Math.max(run.shake, 0.3);
            audioManager.playSmash();
            if (run.nitroTime > 0) r.speed *= 0.7;
          }
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
      rig.root.position.set(roadX(z) + r.lat, roadY(z) + r.y, z);
      rig.root.rotation.set(0, Math.atan(roadSlope(z)) + (r.spin > 0 ? (1 - r.spin) * Math.PI * 4 : 0), 0);
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
    const base = (182 / 3.6) * c.top * r.skill;
    // brake for corners like a real driver: look ahead, judge more distance the faster you go
    const look = 10 + r.speed * 1.1;
    const corner = Math.min(1, (cornerSpeed(bendAhead(r.z, 0, look)) * (1 + (r.skill - 1) * 2)) / base);
    const diff = r.z - run.z;
    // rubber band so races stay close and exciting
    const band = diff > 80 ? 0.9 : diff > 35 ? 0.96 : diff < -80 ? 1.1 : diff < -35 ? 1.04 : 1;
    if (r.nitro > 0) r.nitro -= dt;
    else if (r.z > race.length * 0.2 && Math.random() < dt * 0.03) r.nitro = 1.8;
    if (r.spin > 0) r.spin -= dt;
    if (r.slow > 0) r.slow -= dt;
    const hurt = r.spin > 0 ? 0.25 : r.slow > 0 ? 0.6 : 1;
    const target = base * corner * band * (r.nitro > 0 ? 1.18 : 1) * hurt;
    r.speed += (target - r.speed) * Math.min(1, dt * (target < r.speed ? 2.2 : 0.9 * c.accel));
    r.z += r.speed * dt;

    // racing line: hug the inside of bends, dodge whoever is ahead
    let line = THREE.MathUtils.clamp(-roadCurvature(r.z + 25) * 450, -2.8, 2.8) + Math.sin(r.z * 0.01 + r.seed) * 0.6;
    const others = [{ z: run.z, lat: run.lat }, ...race.racers.filter((o) => o !== r)];
    for (const o of others) {
      const dz = o.z - r.z;
      if (dz > 0 && dz < 9 && Math.abs(o.lat - r.lat) < 2.2) {
        line = o.lat + (r.lat >= o.lat ? 2.6 : -2.6);
        break;
      }
    }
    r.lat += THREE.MathUtils.clamp(line - r.lat, -1, 1) * dt * 2.2 * c.handling;
    r.lat = THREE.MathUtils.clamp(r.lat, -(ROAD_HALF - 0.8), ROAD_HALF - 0.8);
    if (r.z >= total) r.finishedAt = run.time;
  }

  return <group ref={group} />;
}
