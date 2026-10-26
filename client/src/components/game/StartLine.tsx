import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld, headingAt, roadHalf, isCircuit } from "@/lib/track";
import { useRally } from "@/lib/stores/useRally";
import { RIVALS } from "@/lib/game/circuits";
import { burst } from "@/lib/game/fx";

/**
 * The start/finish straight of a circuit: a checkered line across the whole
 * track, painted grid boxes for the eight karts, and a start gantry whose
 * lights go red → yellow → green with the countdown.
 */
const m = (c: string, e: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...e });

function checker() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 32; i++)
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#141414" : "#ffffff";
      ctx.fillRect(i * 16, j * 16, 16, 16);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTex(text: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0E1B24";
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = "#5fd8ff";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 150);
  ctx.fillStyle = "#ffd23f";
  ctx.font = "bold 96px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function StartLine() {
  const group = useRef<THREE.Group>(null);
  const countdown = useRally((s) => s.countdown);
  const phase = useRally((s) => s.phase);
  const goAt = useRef(-1);

  const built = useMemo(() => {
    const g = new THREE.Group();
    if (!isCircuit()) return { g, lamps: [] as THREE.Mesh[] };
    const half = roadHalf();
    const tmp = { x: 0, y: 0, z: 0 };
    const place = (obj: THREE.Object3D, z: number, lat: number, h: number) => {
      toWorld(z, lat, h, tmp);
      obj.position.set(tmp.x, tmp.y, tmp.z);
      obj.rotation.y = headingAt(z);
      g.add(obj);
    };

    // checkered start/finish line across the full width
    const line = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 0.6, 2.2), new THREE.MeshStandardMaterial({ map: checker(), polygonOffset: true, polygonOffsetFactor: -4 }));
    line.rotation.x = -Math.PI / 2;
    const lineWrap = new THREE.Group();
    lineWrap.add(line);
    place(lineWrap, 1.5, 0, 0.04);

    // painted grid boxes (same spots as the grid in Rivals.tsx: player at 0, rivals in rows of two)
    const boxMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.15, polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide });
    const slots: [number, number][] = [[0, 0]];
    RIVALS.forEach((_, i) => slots.push([8 + Math.floor(i / 2) * 9, i % 2 ? 3 : -3]));
    for (const [z, lat] of slots) {
      const box = new THREE.Group();
      const w = 2.6, l = 4.8, t = 0.18;
      const parts = [
        [0, -l / 2, w, t],
        [0, l / 2, w, t],
        [-w / 2, 0, t, l],
        [w / 2, 0, t, l],
      ];
      for (const [x, zz, pw, pl] of parts) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, pl), boxMat);
        p.rotation.x = -Math.PI / 2;
        p.position.set(x, 0, zz);
        box.add(p);
      }
      place(box, z, lat, 0.035);
    }

    // start gantry ahead of the grid
    const gantry = new THREE.Group();
    const post = m("#8e9399", { metalness: 0.5, roughness: 0.5 });
    [-(half + 1.4), half + 1.4].forEach((x) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 7, 10), post);
      p.position.set(x, 3.5, 0);
      gantry.add(p);
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 3.2, 0.3, 0.3), post);
    bar.position.set(0, 7, 0);
    gantry.add(bar);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.56), new THREE.MeshStandardMaterial({ map: signTex("DREAM NEXUS RALLY"), side: THREE.DoubleSide }));
    sign.position.set(0, 8, 0);
    sign.rotation.y = Math.PI; // readable from the grid
    gantry.add(sign);
    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 0.6), m("#1e2328"));
    lampBox.position.set(0, 5.9, 0);
    gantry.add(lampBox);
    const lamps: THREE.Mesh[] = [];
    (["#ff2a2a", "#ffb000", "#2ecc40"] as const).forEach((color, i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), m(color, { emissive: color, emissiveIntensity: 0.08 }));
      l.position.set((i - 1) * 1.15, 5.9, -0.3);
      gantry.add(l);
      lamps.push(l);
    });
    place(gantry, 44, 0, 0);
    return { g, lamps };
  }, []);

  useEffect(() => {
    const parent = group.current;
    parent?.add(built.g);
    return () => {
      parent?.remove(built.g);
    };
  }, [built]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const [red, yellow, green] = built.lamps;
    if (!red) return;
    const set = (l: THREE.Mesh, on: boolean) => ((l.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 3 : 0.08);
    if (phase === "countdown") {
      goAt.current = -1;
      set(red, countdown === 3 || countdown === 1);
      set(yellow, countdown === 2 || (countdown === 1 && Math.floor(t * 8) % 2 === 0));
      set(green, false);
    } else if (phase === "playing") {
      if (goAt.current < 0) {
        goAt.current = t;
        // ¡GO! fireworks over the gantry
        const g = built.lamps[2];
        const p = new THREE.Vector3();
        g.getWorldPosition(p);
        burst(p.x, p.y + 2, p.z, ["#FCD116", "#003893", "#CE1126", "#ffffff"], 40, 10, 9, 0.22);
      }
      const since = t - goAt.current;
      set(red, false);
      set(yellow, false);
      set(green, since < 3);
    } else {
      set(red, false);
      set(yellow, false);
      set(green, false);
    }
  });

  return <group ref={group} />;
}
