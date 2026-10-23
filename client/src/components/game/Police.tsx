import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { run, speedGear } from "@/lib/game/run";
import { car } from "@/lib/game/session";
import { toWorld, headingAt, ROAD_HALF } from "@/lib/track";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { burst } from "@/lib/game/fx";

/**
 * Los tombos. A patrol car waits on the roadside (you get a warning when it's
 * ahead). Pass it calmly: "siga, siga". Pass it on nitro or over the speed
 * limit and it pulls out after you with the siren on. Get ESCAPE_GAP metres
 * ahead (or hold them off for CHASE_TIME seconds) and you're clear; get
 * caught and you're pulled over: stopped, and you lose a life.
 */
const CHASE_TIME = 15;
const ESCAPE_GAP = 100;
const SPEED_LIMIT = 150; // km/h past a patrol
const COLORS = { gold: "#ffd23f", red: "#ff5a5f", cyan: "#5fd8ff", orange: "#ff9f43" };

const m = (c: string, e: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...e });

function label() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1f8a3c";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("POLICÍA", 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildCop() {
  const g = new THREE.Group();
  const white = m("#f2f4f5");
  const green = m("#1f8a3c");
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.2), white);
  body.position.y = 0.75;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.0), green);
  cabin.position.set(0, 1.45, -0.2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.4, 2.02), m("#9fd8f0", { metalness: 0.3, roughness: 0.2 }));
  glass.position.set(0, 1.5, -0.2);
  const tex = label();
  [-1.02, 1.02].forEach((x) => {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map: tex }));
    d.position.set(x, 0.85, 0);
    d.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(d);
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.4), m("#222"));
  bar.position.set(0, 1.9, -0.2);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.42), m("#ff2a2a", { emissive: "#ff2a2a", emissiveIntensity: 0.2 }));
  red.position.set(-0.38, 1.92, -0.2);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.42), m("#2a6bff", { emissive: "#2a6bff", emissiveIntensity: 0.2 }));
  blue.position.set(0.38, 1.92, -0.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), m("#e2b690"));
  head.position.set(0.35, 1.55, -0.1);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 10), green);
  cap.position.set(0.35, 1.78, -0.1);
  const lampMat = m("#fff6c8", { emissive: "#fff6c8", emissiveIntensity: 1.5 });
  [-0.7, 0.7].forEach((x) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), lampMat);
    l.position.set(x, 0.75, 2.12);
    g.add(l);
  });
  // radar sign next to the parked patrol
  const signTex = (() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = "#1f8a3c";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 118);
    ctx.fillStyle = "#111";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CONTROL", 128, 44);
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("👮 RADAR 150", 128, 92);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: signTex, side: THREE.DoubleSide }));
  sign.position.set(0, 2.2, -3.2);
  sign.rotation.y = Math.PI;
  sign.name = "sign";
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), m("#888"));
  post.position.set(0, 0.9, -3.2);
  post.name = "post";
  g.add(body, cabin, glass, bar, red, blue, head, cap, sign, post);
  const wheels: THREE.Mesh[] = [];
  const tyre = m("#1b1b1f", { roughness: 0.9 });
  [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
    wheels.push(w);
  });
  return { group: g, wheels, red, blue, sign, post };
}

type CopState = "idle" | "parked" | "chase" | "busted" | "leaving";

export function Police() {
  const rig = useMemo(buildCop, []);
  const cop = useRef({ state: "idle" as CopState, z: 0, lat: 0, speed: 0, timer: 0, warned: false, nextAt: 900 + Math.random() * 400 });

  useEffect(() => {
    (window as any).__cop = cop.current; // debug
    return () => audioManager.setSiren(false);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const gs = useRally.getState();
    const c = cop.current;
    const playing = gs.phase === "playing";
    run.chaseGap = c.state === "chase" ? run.z - c.z : -1;
    run.chaseGoal = ESCAPE_GAP;
    run.copAhead = c.state === "parked" && c.z - run.z < 170 && c.z > run.z ? c.z - run.z : -1;

    if (c.state === "idle") {
      rig.group.visible = false;
      if (playing && run.z > c.nextAt && run.hearts > 0) {
        // park on the right shoulder, well ahead
        c.state = "parked";
        c.z = run.z + 260;
        c.lat = -(ROAD_HALF + 2.3);
        c.speed = 0;
        c.warned = false;
      }
      return;
    }
    rig.group.visible = true;
    rig.sign.visible = rig.post.visible = c.state === "parked";

    if (playing) {
      const dz = run.z - c.z; // + = you're past it
      if (c.state === "parked") {
        if (!c.warned && dz > -150) {
          c.warned = true;
          gs.popup("👮 POLICÍA ADELANTE — nada de nitro, máx 150", COLORS.orange, true);
          audioManager.playClick();
        }
        if (dz > 2) {
          const kmh = run.speed * 3.6;
          if (run.nitroTime > 0 || kmh > SPEED_LIMIT) {
            c.state = "chase";
            c.timer = CHASE_TIME;
            c.lat = run.lat;
            audioManager.setSiren(true, 10);
            gs.popup(run.nitroTime > 0 ? "🚨 ¡NITRO FRENTE A LOS AGUACATES! ¡TE PERSIGUEN!" : `🚨 ¡${Math.round(kmh)} km/h! ¡EXCESO DE VELOCIDAD, TE PERSIGUEN!`, COLORS.red, true);
            if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
          } else {
            c.state = "leaving";
            c.timer = 2;
            gs.popup("👮 «Siga, siga» — todo bien", COLORS.cyan);
          }
        }
      } else if (c.state === "chase") {
        c.timer -= dt;
        // as quick as your car flat out, a touch slower: hold ↑ and use nitro / boosts to pull away
        const gear = speedGear(run.z);
        const top = ((178 + gear * 12) / 3.6) * car.top;
        const want = Math.min(top * 0.95, Math.max(26, run.speed * 1.05));
        c.speed += (want - c.speed) * Math.min(1, dt * 1.4);
        c.z += c.speed * dt;
        c.lat += (run.lat - c.lat) * Math.min(1, dt * 2.5);
        audioManager.setSiren(true, Math.abs(dz));
        if (dz > -1 && dz < 4.2 && Math.abs(run.lat - c.lat) < 1.8 && !run.airborne && run.spin <= 0 && run.busted <= 0) {
          c.state = "busted";
          c.timer = 2.4;
          run.pullOver = true; // RaceSystem stops you and takes the life
          toWorld(run.z, run.lat, 1, rig.group.position);
          burst(rig.group.position.x, rig.group.position.y, rig.group.position.z, ["#2a6bff", "#ff2a2a", "#ffffff"], 18, 6, 5);
        } else if (dz >= ESCAPE_GAP || c.timer <= 0) {
          c.state = "leaving";
          c.timer = 3;
          run.score += 400;
          gs.popup("🏃 ¡LOS DEJASTE ATRÁS! +400", COLORS.gold, true);
          audioManager.playMilestone();
          audioManager.setSiren(false);
        }
      } else if (c.state === "busted") {
        c.timer -= dt;
        c.z = run.z - 4;
        c.lat += (run.lat + (run.lat > 0 ? -2.6 : 2.6) - c.lat) * Math.min(1, dt * 4);
        c.speed = run.speed;
        audioManager.setSiren(true, 4);
        if (c.timer <= 0) {
          c.state = "leaving";
          c.timer = 3;
          gs.popup("«Siga… y baje la velocidad» 👮", COLORS.cyan);
          audioManager.setSiren(false);
        }
      } else if (c.state === "leaving") {
        c.timer -= dt;
        c.speed += (6 - c.speed) * Math.min(1, dt * 1.5);
        if (dz > 0) c.z += c.speed * dt;
        if (c.timer <= 0 || dz > 120) {
          c.state = "idle";
          c.nextAt = run.z + 900 + Math.random() * 600;
        }
      }
    }

    // draw
    toWorld(c.z, c.lat, 0, rig.group.position);
    rig.group.rotation.set(0, headingAt(c.z) + (c.state === "chase" ? (run.lat - c.lat) * 0.04 : 0), 0);
    rig.wheels.forEach((w) => (w.rotation.x += (c.speed * dt) / 0.42));
    const lightsOn = c.state === "chase" || c.state === "busted";
    const flash = Math.floor(t * 6) % 2 === 0;
    (rig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = lightsOn ? (flash ? 3 : 0.2) : 0.2;
    (rig.blue.material as THREE.MeshStandardMaterial).emissiveIntensity = lightsOn ? (flash ? 0.2 : 3) : 0.2;
  });

  return <primitive object={rig.group} />;
}
