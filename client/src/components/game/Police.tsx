import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { run } from "@/lib/game/run";
import { toWorld, headingAt } from "@/lib/track";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { burst } from "@/lib/game/fx";

/**
 * Los tombos: every so often a police car appears behind you with the siren
 * on. Outrun it for a few seconds and you get a bonus; let it catch you and
 * you're pulled over ("licencia y papeles") and lose a couple of seconds.
 */
const CHASE_TIME = 13;
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
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.42), m("#ff2a2a", { emissive: "#ff2a2a", emissiveIntensity: 2 }));
  red.position.set(-0.38, 1.92, -0.2);
  red.name = "red";
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.42), m("#2a6bff", { emissive: "#2a6bff", emissiveIntensity: 2 }));
  blue.position.set(0.38, 1.92, -0.2);
  blue.name = "blue";
  // the cop: green cap
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
  g.add(body, cabin, glass, bar, red, blue, head, cap);
  const wheels: THREE.Mesh[] = [];
  const tyre = m("#1b1b1f", { roughness: 0.9 });
  [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
    wheels.push(w);
  });
  return { group: g, wheels, red, blue };
}

export function Police() {
  const rig = useMemo(buildCop, []);
  const cop = useRef({ state: "idle" as "idle" | "chase" | "busted" | "leaving", z: 0, lat: 0, speed: 0, timer: 0, nextAt: 700 + Math.random() * 300 });

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

    if (c.state === "idle") {
      rig.group.visible = false;
      if (playing && run.z > c.nextAt && run.hearts > 0) {
        c.state = "chase";
        c.z = run.z - 48;
        c.lat = run.lat;
        c.speed = run.speed;
        c.timer = CHASE_TIME;
        audioManager.setSiren(true, 48);
        gs.popup("👮 ¡UY, EL TOMBO! ¡PÍSALE!", COLORS.red, true);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }
      return;
    }
    rig.group.visible = true;

    if (playing) {
      if (c.state === "chase") {
        c.timer -= dt;
        const dz = run.z - c.z;
        // a bit quicker than you, and quicker still when far behind — but nitro leaves it for dead
        const want = Math.max(26, run.speed * (dz > 30 ? 1.18 : dz > 12 ? 1.08 : 1.02));
        c.speed += (want - c.speed) * Math.min(1, dt * 1.2);
        c.z += c.speed * dt;
        c.lat += (run.lat - c.lat) * Math.min(1, dt * 2.2);
        audioManager.setSiren(true, Math.abs(dz));
        if (dz > -1 && dz < 4.2 && Math.abs(run.lat - c.lat) < 1.8 && !run.airborne && run.spin <= 0) {
          // caught: pulled over
          c.state = "busted";
          c.timer = 2.4;
          run.busted = 2.4;
          run.combo = 0;
          run.shake = 0.5;
          gs.popup("👮 ¡TOMBO! «Licencia y papeles…»", COLORS.red, true);
          audioManager.playWhistle();
          toWorld(run.z, run.lat, 1, rig.group.position);
          burst(rig.group.position.x, rig.group.position.y, rig.group.position.z, ["#2a6bff", "#ff2a2a", "#ffffff"], 18, 6, 5);
        } else if (c.timer <= 0 || dz > 140) {
          c.state = "leaving";
          c.timer = 3;
          run.score += 400;
          gs.popup("🏃 ¡ESCAPASTE DEL TOMBO! +400", COLORS.gold, true);
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
          gs.popup("«Siga, siga… y con cuidado» 👮", COLORS.cyan);
          audioManager.setSiren(false);
        }
      } else if (c.state === "leaving") {
        c.timer -= dt;
        c.speed += (6 - c.speed) * Math.min(1, dt * 1.5);
        c.z += c.speed * dt;
        if (c.timer <= 0 || run.z - c.z > 120) {
          c.state = "idle";
          c.nextAt = run.z + 650 + Math.random() * 500;
        }
      }
    }

    // draw
    toWorld(c.z, c.lat, 0, rig.group.position);
    rig.group.rotation.set(0, headingAt(c.z) + (run.lat - c.lat) * 0.04, 0);
    rig.wheels.forEach((w) => (w.rotation.x += (c.speed * dt) / 0.42));
    const flash = Math.floor(t * 6) % 2 === 0;
    (rig.red.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 3 : 0.2;
    (rig.blue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.2 : 3;
  });

  return <primitive object={rig.group} />;
}


