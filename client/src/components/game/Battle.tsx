import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { race, playerPosition, type Racer } from "@/lib/game/race";
import { run } from "@/lib/game/run";
import { input } from "@/lib/input";
import { roadX, roadY, LANES, lapLength } from "@/lib/track";
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";

/**
 * Rally Loco: surprise boxes on the circuit give Colombian power-ups.
 *  🥑 Aguacate  – throw an avocado at the car ahead
 *  🍌 Plátano   – drop a banana peel behind you
 *  ☕ Tinto     – coffee turbo
 *  🎆 Volador   – firework rocket that hits whoever is 1st
 *  👒 Sombrero  – sombrero vueltiao shield, blocks one hit
 *  🌧️ Aguacero  – tropical downpour slows everyone ahead
 */
export type ItemId = "aguacate" | "platano" | "tinto" | "volador" | "sombrero" | "aguacero";

export const ITEMS: Record<ItemId, { emoji: string; name: string; hint: string }> = {
  aguacate: { emoji: "🥑", name: "Aguacate", hint: "Throw it at the car ahead" },
  platano: { emoji: "🍌", name: "Cáscara de plátano", hint: "Drop it behind you" },
  tinto: { emoji: "☕", name: "Tinto Turbo", hint: "Coffee boost!" },
  volador: { emoji: "🎆", name: "Volador", hint: "Firework hits the leader" },
  sombrero: { emoji: "👒", name: "Sombrero Vueltiao", hint: "Shield against one hit" },
  aguacero: { emoji: "🌧️", name: "Aguacero", hint: "Rain slows everyone ahead" },
};

const COLORS = { gold: "#ffd23f", orange: "#ff9f43", red: "#ff5a5f", green: "#7bd389", cyan: "#5fd8ff" };

/** Who's holding what: the player is id "me". */
type Car = { id: string; z: number; lat: number; name: string };

interface Projectile {
  kind: "aguacate" | "volador";
  owner: string;
  target: string | null;
  z: number;
  lat: number;
  y: number;
  speed: number;
  life: number;
  obj: THREE.Object3D;
}
interface Trap {
  z: number;
  lat: number;
  life: number;
  obj: THREE.Object3D;
}
interface Cloud {
  target: string;
  time: number;
  obj: THREE.Object3D;
}

function rollItem(pos: number, total: number): ItemId {
  const back = (pos - 1) / Math.max(1, total - 1); // 0 = leader, 1 = last
  const table: [ItemId, number][] =
    back < 0.2
      ? [["platano", 35], ["aguacate", 30], ["sombrero", 25], ["tinto", 10]]
      : back < 0.6
        ? [["aguacate", 30], ["platano", 20], ["tinto", 20], ["sombrero", 15], ["aguacero", 10], ["volador", 5]]
        : [["tinto", 30], ["aguacero", 20], ["volador", 20], ["aguacate", 20], ["sombrero", 10]];
  let sum = 0;
  table.forEach(([, w]) => (sum += w));
  let r = Math.random() * sum;
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return "aguacate";
}

/* ---------- small models ---------- */
const m = (c: string, e: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });

function boxTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FCD116";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#003893";
  ctx.fillRect(0, 64, 128, 32);
  ctx.fillStyle = "#CE1126";
  ctx.fillRect(0, 96, 128, 32);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#0E1B24";
  ctx.lineWidth = 8;
  ctx.font = "bold 90px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("?", 64, 66);
  ctx.fillText("?", 64, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeBox(tex: THREE.Texture) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), m("#ffffff", { map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.45 }));
  b.position.y = 1.1;
  b.name = "spin";
  b.castShadow = true;
  g.add(b);
  return g;
}

function makeAguacate() {
  const g = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), m("#2f5d1e"));
  skin.scale.set(1, 1.3, 1);
  const flesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), m("#c8e07a"));
  flesh.scale.set(1, 1.3, 1);
  flesh.position.z = 0.12;
  const seed = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), m("#7a4a1e"));
  seed.position.set(0, -0.1, 0.42);
  g.add(skin, flesh, seed);
  return g;
}

function makePlatano() {
  const g = new THREE.Group();
  const peel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.16, 8, 14, Math.PI * 1.1), m("#ffd23f", { emissive: "#664c00", emissiveIntensity: 0.3 }));
  peel.rotation.x = -Math.PI / 2;
  peel.position.y = 0.2;
  g.add(peel);
  for (let i = 0; i < 3; i++) {
    const flap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 5), m("#e8c030"));
    flap.position.set(Math.cos(i * 2.1) * 0.3, 0.2, Math.sin(i * 2.1) * 0.3);
    flap.rotation.z = Math.PI / 2;
    flap.rotation.y = i * 2.1;
    g.add(flap);
  }
  return g;
}

function makeVolador() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 10), m("#e23b3b", { emissive: "#661010", emissiveIntensity: 0.4 }));
  body.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 10), m("#ffd23f"));
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.8;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 8), new THREE.MeshBasicMaterial({ color: "#ffb03a", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -1.1;
  g.add(body, tip, flame);
  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  const grey = m("#6b7280", { transparent: true, opacity: 0.9 });
  [[0, 0, 0, 1.2], [1.1, -0.1, 0.2, 0.9], [-1.1, -0.1, -0.1, 0.95], [0.3, 0.5, 0, 0.8]].forEach(([x, y, z, s]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), grey);
    p.position.set(x, y, z);
    p.scale.setScalar(s);
    g.add(p);
  });
  const drops = new THREE.Group();
  drops.name = "drops";
  const dropMat = new THREE.MeshBasicMaterial({ color: "#9fd8f0", transparent: true, opacity: 0.7 });
  for (let i = 0; i < 14; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), dropMat);
    d.position.set((Math.random() - 0.5) * 2.6, -1 - Math.random() * 2.5, (Math.random() - 0.5) * 2);
    drops.add(d);
  }
  g.add(drops);
  return g;
}

/* ---------- the system ---------- */
export function Battle() {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(boxTexture, []);
  const boxes = useMemo(() => Array.from({ length: 24 }, () => makeBox(tex)), [tex]);
  const projectiles = useRef<Projectile[]>([]);
  const traps = useRef<Trap[]>([]);
  const clouds = useRef<Cloud[]>([]);
  const taken = useRef(new Map<string, number>()); // box key -> time it comes back

  // 4 rows of 3 boxes per lap
  const rows = useMemo(() => {
    const L = lapLength();
    return [0.17, 0.42, 0.66, 0.88].map((f) => Math.round(L * f));
  }, []);

  useEffect(() => {
    boxes.forEach((b) => group.current?.add(b));
    run.item = null;
  }, [boxes]);

  const carsNow = (): Car[] => [{ id: "me", z: run.z, lat: run.lat, name: "You" }, ...race.racers.map((r) => ({ id: r.id, z: r.z, lat: r.lat, name: r.name }))];
  const racerById = (id: string) => race.racers.find((r) => r.id === id);

  /** Something hits a car. Returns true if it landed (not blocked). */
  const hit = (targetId: string, by: string, label: string) => {
    const gs = useRally.getState();
    if (targetId === "me") {
      if (run.shield) {
        run.shield = false;
        audioManager.playShieldBreak();
        gs.popup("👒 SOMBRERO SAVED YOU!", COLORS.cyan, true);
        return false;
      }
      run.spin = 1.1;
      run.speed *= 0.35;
      run.shake = 1;
      run.flash = 0.6;
      audioManager.playCrash();
      if (navigator.vibrate) navigator.vibrate(100);
      gs.popup(label, COLORS.red, true);
      return true;
    }
    const r = racerById(targetId);
    if (!r) return false;
    if (r.shield) {
      r.shield = false;
      if (by === "me") gs.popup(`${r.name} blocked it! 👒`, COLORS.cyan);
      return false;
    }
    r.spin = 1.1;
    r.speed *= 0.35;
    if (by === "me") {
      run.hitsLanded++;
      run.score += 100;
      audioManager.playSmash();
      gs.popup(`¡Le diste a ${r.name}!`, COLORS.gold, true);
    }
    return true;
  };

  const use = (ownerId: string, item: ItemId) => {
    const cars = carsNow();
    const me = cars.find((c) => c.id === ownerId)!;
    const gs = useRally.getState();
    const mine = ownerId === "me";
    const owner = mine ? null : racerById(ownerId);
    switch (item) {
      case "aguacate": {
        const obj = makeAguacate();
        group.current?.add(obj);
        projectiles.current.push({ kind: "aguacate", owner: ownerId, target: null, z: me.z + 3, lat: me.lat, y: 1, speed: (mine ? run.speed : owner?.speed ?? 40) + 28, life: 3, obj });
        audioManager.playJump();
        break;
      }
      case "platano": {
        const obj = makePlatano();
        group.current?.add(obj);
        traps.current.push({ z: me.z - 4.5, lat: me.lat, life: 45, obj });
        audioManager.playClick();
        break;
      }
      case "tinto":
        if (mine) {
          run.nitroTime = Math.max(run.nitroTime, 1.8);
          audioManager.playNitro();
          gs.popup("☕ ¡TINTO TURBO!", COLORS.orange, true);
        } else if (owner) owner.nitro = 1.8;
        break;
      case "sombrero":
        if (mine) {
          run.shield = true;
          audioManager.playShield();
          gs.popup("👒 SOMBRERO VUELTIAO!", COLORS.cyan, true);
        } else if (owner) owner.shield = true;
        break;
      case "volador": {
        // the leader (or 2nd place if you're leading)
        const sorted = [...cars].sort((a, b) => b.z - a.z);
        const target = sorted[0].id !== ownerId ? sorted[0] : sorted[1];
        if (!target) break;
        const obj = makeVolador();
        group.current?.add(obj);
        projectiles.current.push({ kind: "volador", owner: ownerId, target: target.id, z: me.z + 2, lat: me.lat, y: 3, speed: 95, life: 8, obj });
        audioManager.playNitro();
        if (mine) gs.popup(`🎆 VOLADOR → ${target.name}!`, COLORS.orange, true);
        else if (target.id === "me") gs.popup("🎆 A VOLADOR IS COMING!", COLORS.red, true);
        break;
      }
      case "aguacero": {
        let n = 0;
        for (const c of cars) {
          if (c.id === ownerId || c.z <= me.z) continue;
          n++;
          if (c.id === "me") {
            if (run.shield) continue;
            run.slowTime = 2.6;
            gs.popup("🌧️ ¡AGUACERO!", COLORS.cyan, true);
          } else {
            const r = racerById(c.id);
            if (r && !r.shield) r.slow = 2.6;
          }
          const obj = makeCloud();
          group.current?.add(obj);
          clouds.current.push({ target: c.id, time: 2.6, obj });
        }
        if (mine) gs.popup(n ? `🌧️ AGUACERO on ${n} rivals!` : "🌧️ Nobody ahead to rain on!", COLORS.cyan, true);
        audioManager.playSplash();
        break;
      }
    }
  };

  useFrame((state, delta) => {
    if (!race.active) return;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const phase = useRally.getState().phase;
    const L = lapLength();
    const total = race.laps * L;
    const now = run.time;

    // --- boxes: place the rows nearest to the player (this lap and next) ---
    let bi = 0;
    const lapNow = Math.floor(run.z / L);
    for (let lap = lapNow; lap <= lapNow + 1; lap++) {
      for (let ri = 0; ri < rows.length; ri++) {
        for (let li = 0; li < 3; li++) {
          const b = boxes[bi++];
          if (!b) continue;
          const z = lap * L + rows[ri];
          const lat = LANES[li];
          const key = `${lap}:${ri}:${li}`;
          const back = taken.current.get(key) ?? -1;
          const visible = z < total && z > run.z - 30 && z < run.z + 260 && back < now;
          b.visible = visible;
          if (!visible) continue;
          b.position.set(roadX(z) + lat, roadY(z) + Math.sin(t * 3 + li) * 0.15, z);
          const s = b.getObjectByName("spin");
          if (s) s.rotation.set(t * 1.2, t * 2, 0);
          if (phase !== "playing") continue;
          // pick-up by the player or any AI
          // every car gets its own box (AI grabbing one doesn't take it from you)
          for (const c of carsNow()) {
            if (Math.abs(c.z - z) < 2.2 && Math.abs(c.lat - lat) < 1.6) {
              const holder = c.id === "me" ? run.item : racerById(c.id)?.item;
              const ckey = c.id === "me" ? key : `${key}:${c.id}`;
              if ((taken.current.get(ckey) ?? -1) >= now) continue;
              taken.current.set(ckey, now + 2.5);
              if (c.id === "me") audioManager.playClick();
              if (holder) continue;
              const pos = c.id === "me" ? playerPosition(run.z, null) : 1 + carsNow().filter((o) => o.z > c.z).length;
              const item = rollItem(pos, race.racers.length + 1);
              if (c.id === "me") {
                run.item = item;
                audioManager.playPickup(6);
                useRally.getState().popup(`${ITEMS[item].emoji} ${ITEMS[item].name.toUpperCase()}!`, COLORS.gold, true);
              } else {
                const r = racerById(c.id);
                if (r && !r.remote) {
                  r.item = item;
                  r.itemCd = 0.8 + Math.random() * 2.5;
                }
              }
              break;
            }
          }
        }
      }
    }
    for (; bi < boxes.length; bi++) boxes[bi].visible = false;

    if (phase !== "playing") return;

    // --- player uses their item ---
    const want = input.item || input.touchItem || input.itemQueued;
    input.itemQueued = false;
    if (want && run.item && run.spin <= 0) {
      const it = run.item as ItemId;
      run.item = null;
      use("me", it);
    }

    // --- AI uses items ---
    for (const r of race.racers) {
      if (r.remote || !r.item) continue;
      r.itemCd -= dt;
      if (r.itemCd > 0 || r.spin > 0) continue;
      const it = r.item as ItemId;
      // aim avocados: only throw when someone is ahead in range
      if (it === "aguacate" && !carsNow().some((c) => c.id !== r.id && c.z > r.z && c.z - r.z < 60)) {
        r.itemCd = 0.6;
        continue;
      }
      r.item = null;
      use(r.id, it);
    }

    // --- projectiles ---
    projectiles.current = projectiles.current.filter((p) => {
      p.life -= dt;
      if (p.kind === "volador") {
        const tg = p.target === "me" ? { z: run.z, lat: run.lat } : racerById(p.target ?? "");
        if (!tg) p.life = 0;
        else {
          p.speed = Math.max(p.speed, 40);
          p.z += p.speed * dt;
          p.lat += (tg.lat - p.lat) * Math.min(1, dt * 4);
          if (p.z > tg.z - 12) {
            p.y = Math.max(0.8, p.y - dt * 8);
            p.z = Math.min(p.z, tg.z + 1);
          }
          if (Math.abs(tg.z - p.z) < 3 && Math.abs(tg.lat - p.lat) < 2.5) {
            hit(p.target!, p.owner, "🎆 ¡VOLADOR! BOOM!");
            p.life = 0;
          }
        }
      } else {
        p.z += p.speed * dt;
        // home in a little on the closest car ahead
        const ahead = carsNow()
          .filter((c) => c.id !== p.owner && c.z > p.z - 2 && c.z - p.z < 40)
          .sort((a, b) => a.z - b.z)[0];
        if (ahead) p.lat += (ahead.lat - p.lat) * Math.min(1, dt * 1.8);
        for (const c of carsNow()) {
          if (c.id === p.owner) continue;
          if (Math.abs(c.z - p.z) < 2.4 && Math.abs(c.lat - p.lat) < 1.5) {
            hit(c.id, p.owner, "🥑 ¡AGUACATAZO!");
            p.life = 0;
            break;
          }
        }
      }
      p.obj.position.set(roadX(p.z) + p.lat, roadY(p.z) + p.y, p.z);
      p.obj.rotation.set(t * (p.kind === "aguacate" ? 8 : 0), 0, 0);
      if (p.life <= 0) {
        p.obj.parent?.remove(p.obj);
        return false;
      }
      return true;
    });

    // --- banana traps ---
    traps.current = traps.current.filter((tr) => {
      tr.life -= dt;
      for (const c of carsNow()) {
        if (Math.abs(c.z - tr.z) < 2 && Math.abs(c.lat - tr.lat) < 1.4) {
          if (c.id === "me" && run.airborne) continue;
          hit(c.id, "trap", "🍌 ¡RESBALÓN!");
          tr.life = 0;
          break;
        }
      }
      tr.obj.position.set(roadX(tr.z) + tr.lat, roadY(tr.z), tr.z);
      if (tr.life <= 0 || tr.z < run.z - 400) {
        tr.obj.parent?.remove(tr.obj);
        return false;
      }
      return true;
    });

    // --- rain clouds follow their target ---
    clouds.current = clouds.current.filter((c) => {
      c.time -= dt;
      const tg = c.target === "me" ? { z: run.z, lat: run.lat } : racerById(c.target);
      if (tg) c.obj.position.set(roadX(tg.z) + tg.lat, roadY(tg.z) + 5, tg.z);
      const drops = c.obj.getObjectByName("drops");
      drops?.children.forEach((d) => {
        d.position.y -= dt * 9;
        if (d.position.y < -4) d.position.y = -1;
      });
      if (c.time <= 0 || !tg) {
        c.obj.parent?.remove(c.obj);
        return false;
      }
      return true;
    });
  });

  return <group ref={group} />;
}

export type { Racer };
