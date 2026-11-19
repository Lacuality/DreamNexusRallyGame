import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THROW_TIME } from "@/lib/game/rigAnim";
import { toonMat, addOutline } from "@/lib/game/toon";
import { race, playerPosition, type Racer } from "@/lib/game/race";
import { run } from "@/lib/game/run";
import { input } from "@/lib/input";
import { toWorld, lanes, lapLength, roadHalf, headingAt, isCircuit } from "@/lib/track";

const tmpV = { x: 0, y: 0, z: 0 };
const burstAt = (z: number, lat: number, h: number, colors: string[], count: number, speed: number, up: number) => {
  toWorld(z, lat, h, tmpV);
  burst(tmpV.x, tmpV.y, tmpV.z, colors, count, speed, up);
};
import { useRally } from "@/lib/stores/useRally";
import { audioManager } from "@/lib/audio";
import { room, myId } from "@/lib/game/net";
import { burst, FX } from "@/lib/game/fx";
import { cloneModel } from "@/lib/game/assets";
import { loseCoins, untouchable } from "@/lib/game/run";
import { taunt } from "@/lib/game/taunts";
import { driverById } from "@/lib/game/garage";
import { session } from "@/lib/game/session";

/**
 * Rally Loco: surprise boxes on the circuit give Colombian power-ups.
 *  🥑 Aguacate  – a fast shot that bounces off the rails (look back to fire it behind you)
 *  🥑×3         – three avocados circle your kart: a shield you can also fire one by one
 *  🍌 Plátano   – drop a banana peel behind you
 *  🧨 Mecha     – a tejo charge: lob it ahead, it blows up when anyone comes near
 *  ☕ Tinto     – coffee turbo
 *  🎆 Volador   – firework rocket that chases the leader and explodes
 *  👒 Sombrero  – sombrero vueltiao: blocks one hit
 *  🫓 Arepa     – cheese in the face of everyone ahead
 *  🌧️ Aguacero  – tropical downpour slows everyone ahead
 *  ⚡ Apagón    – lightning shrinks and slows every rival
 *  🌟 Panela    – invincible and flat out
 *  🚌 Chiva     – you become a chiva and get driven up the field
 */
export type ItemId = "aguacate" | "platano" | "tinto" | "volador" | "sombrero" | "aguacero" | "apagon" | "panela" | "chiva" | "arepa" | "mecha";

export const ITEMS: Record<ItemId, { emoji: string; name: string; hint: string }> = {
  apagon: { emoji: "⚡", name: "Apagón", hint: "Lightning shrinks every rival" },
  panela: { emoji: "🌟", name: "Panela Power", hint: "Invincible and flat out for 6 s" },
  chiva: { emoji: "🚌", name: "Chiva Express", hint: "Become a chiva and fly up the field" },
  aguacate: { emoji: "🥑", name: "Aguacate", hint: "Fire it ahead (look back to fire behind)" },
  platano: { emoji: "🍌", name: "Cáscara de plátano", hint: "Drop it behind you" },
  mecha: { emoji: "🧨", name: "Mecha de tejo", hint: "Lob it ahead: it blows when a kart comes near" },
  tinto: { emoji: "☕", name: "Tinto Turbo", hint: "Coffee boost!" },
  volador: { emoji: "🎆", name: "Volador", hint: "Rocket that hunts the leader" },
  sombrero: { emoji: "👒", name: "Sombrero Vueltiao", hint: "Blocks the next hit" },
  arepa: { emoji: "🫓", name: "Arepa con queso", hint: "Cheese in the face of everyone ahead" },
  aguacero: { emoji: "🌧️", name: "Aguacero", hint: "Rain slows everyone ahead" },
};

const COLORS = { gold: "#ffd23f", orange: "#ff9f43", red: "#ff5a5f", green: "#7bd389", cyan: "#5fd8ff" };
const PAL = {
  aguacate: ["#8fd14f", "#2f5d1e", "#e8f5a0"],
  fire: ["#ffd23f", "#ff9f1c", "#ff5a5f", "#ffffff"],
  firework: ["#ff5a5f", "#ffd23f", "#5fd8ff", "#7bd389", "#ff7ad9", "#ffffff"],
  smoke: ["#ffffff", "#d8dee8", "#aab4c2"],
  cheese: ["#ffe27a", "#fff6c8", "#f2b84b"],
  coffee: ["#7a4a1e", "#c89a6a", "#ffffff"],
  star: ["#ffd23f", "#fff3b0", "#ff9f1c", "#ffffff"],
  zap: ["#fff275", "#ffffff", "#5fd8ff"],
  banana: ["#ffd23f", "#fff3b0"],
};

/** Who's holding what: the player is id "me". */
type Car = { id: string; z: number; lat: number; name: string };

interface Projectile {
  kind: "aguacate" | "volador";
  owner: string;
  target: string | null;
  z: number;
  lat: number;
  vlat: number;
  y: number;
  speed: number;
  life: number;
  bounces: number;
  trail: number;
  obj: THREE.Object3D;
}
interface Trap {
  kind: "platano" | "mecha";
  owner: string;
  z: number;
  lat: number;
  life: number;
  arm: number; // seconds before it can go off
  // thrown through the air first
  fly: number;
  flyDur: number;
  z0: number;
  z1: number;
  obj: THREE.Object3D;
}
interface Cloud {
  target: string;
  time: number;
  obj: THREE.Object3D;
}
/** Something flying from one car to another; the effect lands when it arrives. */
interface Flyer {
  from: string;
  to: string;
  t: number;
  dur: number;
  obj: THREE.Object3D;
  land: () => void;
}
interface Ring {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  size: number;
}

/** "aguacate3" is three avocados in one box. The further back you are, the better the box. */
function rollItem(pos: number, total: number): ItemId | "aguacate3" {
  const back = (pos - 1) / Math.max(1, total - 1); // 0 = leader, 1 = last
  const table: [ItemId | "aguacate3", number][] =
    back < 0.2
      ? [["platano", 30], ["aguacate", 25], ["sombrero", 20], ["mecha", 15], ["tinto", 10]]
      : back < 0.6
        ? [["aguacate", 16], ["aguacate3", 12], ["platano", 10], ["mecha", 12], ["tinto", 14], ["sombrero", 8], ["arepa", 10], ["aguacero", 6], ["volador", 6], ["panela", 6]]
        : [["tinto", 12], ["aguacate3", 12], ["volador", 14], ["arepa", 10], ["aguacero", 6], ["panela", 18], ["apagon", 12], [back > 0.8 ? "chiva" : "panela", 16]];
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
const m = (c: string, e: Partial<THREE.MeshStandardMaterialParameters> = {}) => toonMat({ color: c, ...e });
const glow = (c: string, opacity = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

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
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), m("#ffffff", { map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.5 }));
  b.position.y = 1.1;
  b.name = "spin";
  b.castShadow = true;
  g.add(b);
  // a soft halo so you can spot the row from far away
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 8), glow("#fff3b0", 0.16));
  halo.position.y = 1.1;
  halo.name = "halo";
  g.add(halo);
  addOutline(b, 0.05);
  return g;
}

function makeAguacate(scale = 1.45) {
  const g = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), m("#2f5d1e"));
  skin.scale.set(1, 1.3, 1);
  const flesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), m("#c8e07a"));
  flesh.scale.set(1, 1.3, 1);
  flesh.position.z = 0.12;
  const seed = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), m("#7a4a1e"));
  seed.position.set(0, -0.1, 0.42);
  g.add(skin, flesh, seed);
  addOutline(g, 0.04);
  g.scale.setScalar(scale);
  return g;
}

function makePlatano() {
  const real = cloneModel("banana", 1.7, "max");
  if (real) {
    real.rotation.y = Math.random() * 6;
    addOutline(real, 0.04);
    return real;
  }
  const g = new THREE.Group();
  const peel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.2, 8, 14, Math.PI * 1.1), m("#ffd23f", { emissive: "#664c00", emissiveIntensity: 0.3 }));
  peel.rotation.x = -Math.PI / 2;
  peel.position.y = 0.25;
  g.add(peel);
  for (let i = 0; i < 3; i++) {
    const flap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 5), m("#e8c030"));
    flap.position.set(Math.cos(i * 2.1) * 0.35, 0.25, Math.sin(i * 2.1) * 0.35);
    flap.rotation.z = Math.PI / 2;
    flap.rotation.y = i * 2.1;
    g.add(flap);
  }
  addOutline(g, 0.04);
  return g;
}

/** A tejo "mecha": the little gunpowder packet you aim for, here very much bigger. */
function makeMecha() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 3), m("#ff5a8a"));
  paper.position.y = 0.3;
  const band = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.36, 3), m("#ffffff"));
  band.position.y = 0.5;
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff2a2a" }));
  light.position.y = 0.85;
  light.name = "light";
  const zone = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.6, 28), glow("#ff5a5f", 0.5));
  zone.rotation.x = -Math.PI / 2;
  zone.position.y = 0.06;
  zone.name = "zone";
  g.add(paper, band, light, zone);
  addOutline(paper, 0.04);
  return g;
}

function makeVolador() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.6, 10), m("#e23b3b", { emissive: "#661010", emissiveIntensity: 0.4 }));
  body.rotation.x = Math.PI / 2;
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 10), m("#ffffff"));
  stripe.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 10), m("#ffd23f"));
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 1.05;
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.5), m("#ffd23f"));
    fin.position.set(Math.cos((i / 3) * 6.28) * 0.3, Math.sin((i / 3) * 6.28) * 0.3, -0.7);
    fin.rotation.z = (i / 3) * 6.28 + Math.PI / 2;
    g.add(fin);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 8), glow("#ffb03a"));
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -1.6;
  flame.name = "flame";
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), glow("#ff9f1c", 0.3));
  g.add(body, stripe, tip, flame, halo);
  addOutline(body, 0.04);
  g.scale.setScalar(1.3);
  return g;
}

function makeArepa() {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.16, 14), m("#f3dc9a"));
  const q = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 10), m("#ffe27a"));
  g.add(a, q);
  addOutline(a, 0.04);
  return g;
}

function makeSombrero() {
  const g = new THREE.Group();
  const straw = m("#f1e3b4");
  const black = m("#1b1b1f");
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.1, 20), straw);
  const brimBand = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 6, 24), black);
  brimBand.rotation.x = Math.PI / 2;
  brimBand.position.y = 0.06;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.55, 14), straw);
  crown.position.y = 0.3;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.16, 14), black);
  band.position.y = 0.14;
  g.add(brim, brimBand, crown, band);
  addOutline(brim, 0.04);
  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  const grey = m("#59616f", { transparent: true, opacity: 0.94 });
  [[0, 0, 0, 1.5], [1.4, -0.1, 0.2, 1.1], [-1.4, -0.1, -0.1, 1.2], [0.4, 0.6, 0, 1.0]].forEach(([x, y, z, s]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), grey);
    p.position.set(x, y, z);
    p.scale.setScalar(s);
    g.add(p);
  });
  const drops = new THREE.Group();
  drops.name = "drops";
  const dropMat = new THREE.MeshBasicMaterial({ color: "#9fd8f0", transparent: true, opacity: 0.8 });
  for (let i = 0; i < 22; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), dropMat);
    d.position.set((Math.random() - 0.5) * 3.4, -1 - Math.random() * 3.5, (Math.random() - 0.5) * 2.6);
    drops.add(d);
  }
  g.add(drops);
  return g;
}

/** A jagged lightning bolt, 10 m tall, standing on its tip. */
function makeBolt() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: "#fff275" });
  const pts = [[0, 0], [0.5, 2.2], [-0.4, 4.1], [0.6, 6.3], [-0.2, 8.2], [0.3, 10.5]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.28, len, 0.28), mat);
    seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    seg.rotation.z = -Math.atan2(x1 - x0, y1 - y0);
    g.add(seg);
  }
  g.visible = false;
  return g;
}

const bubbleTex = new Map<string, THREE.Texture>();
/** What a rival is holding, shown in a little bubble over their kart. */
function itemBubble(item: ItemId) {
  let t = bubbleTex.get(item);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(14,27,36,0.82)";
    g.beginPath();
    g.arc(64, 64, 56, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = "#ffd23f";
    g.stroke();
    g.font = "72px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(ITEMS[item].emoji, 64, 70);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    bubbleTex.set(item, t);
  }
  return t;
}

/* ---------- the system ---------- */
export function Battle() {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(boxTexture, []);
  const boxes = useMemo(() => Array.from({ length: 36 }, () => makeBox(tex)), [tex]);
  const projectiles = useRef<Projectile[]>([]);
  const traps = useRef<Trap[]>([]);
  const clouds = useRef<Cloud[]>([]);
  const flyers = useRef<Flyer[]>([]);
  const taken = useRef(new Map<string, number>()); // box key -> time it comes back
  const useCd = useRef(0);
  const beep = useRef(0);
  const trailT = useRef(0);

  // effects, built once and reused
  const rings = useMemo<Ring[]>(
    () =>
      Array.from({ length: 10 }, () => {
        const mesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 36), glow("#ffffff", 0.9));
        mesh.rotation.x = -Math.PI / 2;
        mesh.visible = false;
        return { mesh, t: 0, dur: 0.5, size: 6 };
      }),
    [],
  );
  const flashes = useMemo(
    () =>
      Array.from({ length: 6 }, () => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glow("#fff3b0", 0.9));
        mesh.visible = false;
        mesh.userData.t = 0;
        return mesh;
      }),
    [],
  );
  const bolts = useMemo(() => Array.from({ length: 8 }, makeBolt), []);
  const orbit = useMemo(() => [0, 1, 2].map(() => makeAguacate(0.95)), []);
  const hats = useRef(new Map<string, THREE.Object3D>());
  const bubbles = useRef(new Map<string, THREE.Sprite>());

  // 6 rows of 3 boxes per lap: you're never far from your next weapon
  const rows = useMemo(() => {
    const L = lapLength();
    return [0.12, 0.28, 0.44, 0.6, 0.76, 0.92].map((f) => Math.round(L * f));
  }, []);

  useEffect(() => {
    const g = group.current;
    boxes.forEach((b) => g?.add(b));
    rings.forEach((r) => g?.add(r.mesh));
    flashes.forEach((f) => g?.add(f));
    bolts.forEach((b) => g?.add(b));
    orbit.forEach((o) => g?.add(o));
    run.item = null;
    run.incoming = 0;
    run.tiny = 0;
    run.blackout = 0;
    run.splat = 0;
  }, [boxes, rings, flashes, bolts, orbit]);

  // online: friends' power-ups arrive over the network and play out here too
  const online = session.mode === "online";
  useEffect(() => {
    if (!online) return;
    return room.onMessage((msg) => {
      if (msg.t === "hit" && msg.by === myId) {
        const r = racerById(msg.id);
        run.cheer = 1.3;
        run.hitsLanded++;
        run.score += 100;
        audioManager.playHitLanded();
        useRally.getState().popup(`¡Le diste a ${r?.name ?? "tu amigo"}!`, COLORS.gold, true);
        return;
      }
      if (msg.t !== "item" || msg.id === myId || !(msg.item in ITEMS)) return;
      if (useRally.getState().phase !== "playing") return;
      const target = msg.target === myId ? "me" : msg.target;
      use(msg.id, msg.item as ItemId, { z: msg.z, lat: msg.lat, speed: msg.speed }, target);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const carsNow = (): Car[] => [{ id: "me", z: run.z, lat: run.lat, name: "You" }, ...race.racers.map((r) => ({ id: r.id, z: r.z, lat: r.lat, name: r.name }))];
  const racerById = (id: string) => race.racers.find((r) => r.id === id);
  const posOf = (id: string) => (id === "me" ? { z: run.z, lat: run.lat } : racerById(id));

  /** A shockwave on the ground + a flash + sparks. `size` is the radius in metres. */
  const boom = (z: number, lat: number, h: number, size: number, colors: string[], loud = true) => {
    const ring = rings.find((r) => !r.mesh.visible) ?? rings[0];
    toWorld(z, lat, 0.12, ring.mesh.position);
    (ring.mesh.material as THREE.MeshBasicMaterial).color.set(colors[0]);
    ring.mesh.visible = true;
    ring.t = 0;
    ring.dur = 0.35 + size * 0.03;
    ring.size = size;
    const fl = flashes.find((f) => !f.visible) ?? flashes[0];
    toWorld(z, lat, h, fl.position);
    (fl.material as THREE.MeshBasicMaterial).color.set(colors[1] ?? colors[0]);
    fl.visible = true;
    fl.userData.t = 0;
    fl.userData.size = size * 0.45;
    burstAt(z, lat, h, colors, Math.round(10 + size * 3), 6 + size, 5 + size * 0.5);
    burstAt(z, lat, h + 0.5, PAL.smoke, 6, 3, 3);
    if (loud) {
      const d = Math.abs(z - run.z);
      if (d < 60) {
        run.shake = Math.max(run.shake, (1 - d / 60) * Math.min(1, size / 6));
        audioManager.playBoom();
      }
    }
  };

  /** Something hits a car. Returns true if it landed (not blocked). */
  const hit = (targetId: string, by: string, label: string) => {
    const gs = useRally.getState();
    const victim = posOf(targetId);
    if (targetId === "me") {
      if (run.invulnerable > 0 || run.spin > 0 || untouchable()) return false; // just been hit, or powered up
      if (run.shield) {
        run.shield = false;
        audioManager.playShieldBreak();
        boom(run.z, run.lat, 1.6, 3, ["#5fd8ff", "#ffffff", "#f1e3b4"], false);
        gs.popup("👒 ¡EL SOMBRERO TE SALVÓ!", COLORS.cyan, true);
        return false;
      }
      boom(run.z, run.lat, 1.2, 4, PAL.fire, false);
      run.spin = 1.0;
      run.invulnerable = 2.6;
      run.speed *= 0.4;
      run.shake = 1;
      run.flash = 0.6;
      audioManager.playCrash();
      if (navigator.vibrate) navigator.vibrate(100);
      gs.popup(label, COLORS.red, true);
      run.hitStop = 0.07;
      if (loseCoins()) burstAt(run.z, run.lat, 1.2, FX.jar, 14, 7, 7);
      const who = racerById(by);
      if (who) who.cheer = 1.6;
      const line = who && !who.remote ? taunt(who.name, "hit") : null;
      if (line && who) gs.popup(`${driverById(who.driver).emoji} ${who.name}: «${line}»`, COLORS.orange);
      if (online && racerById(by)?.remote) room.send({ t: "hit", id: myId, by });
      return true;
    }
    const r = racerById(targetId);
    if (!r) return false;
    if (r.remote) {
      // a friend's own game decides if it landed and tells us (see the "hit" message)
      if (victim) boom(victim.z, victim.lat, 1.2, 3, PAL.fire, false);
      return !r.shield;
    }
    if (r.shield) {
      r.shield = false;
      boom(r.z, r.lat, 1.6, 3, ["#5fd8ff", "#ffffff", "#f1e3b4"], false);
      if (by === "me") gs.popup(`👒 ¡${r.name} lo bloqueó!`, COLORS.cyan);
      return false;
    }
    if (r.spin > 0 || (r.immune ?? 0) > 0 || (r.star ?? 0) > 0) return false;
    boom(r.z, r.lat, 1.2, 4, PAL.fire, false);
    if (by === "me") {
      run.hitStop = 0.06;
      const line = taunt(r.name, "ouch");
      if (line && Math.random() < 0.7) gs.popup(`${driverById(r.driver).emoji} ${r.name}: «${line}»`, COLORS.cyan);
    }
    r.spin = 1.1;
    r.immune = 2.6;
    r.speed *= 0.35;
    if (by === "me") {
      run.cheer = 1.3;
      run.hitsLanded++;
      run.score += 100;
      audioManager.playHitLanded();
      gs.popup(`💥 ¡Le diste a ${r.name}!`, COLORS.gold, true);
    }
    return true;
  };

  /** Everyone caught in a blast. */
  const blast = (z: number, lat: number, radius: number, by: string, label: string) => {
    for (const c of carsNow()) {
      if (Math.abs(c.z - z) < radius && Math.abs(c.lat - lat) < radius * 0.75) hit(c.id, by === c.id ? "" : by, label);
    }
  };

  const use = (ownerId: string, item: ItemId, from?: { z: number; lat: number; speed: number }, forcedTarget?: string) => {
    const cars = carsNow();
    const me = from ? { id: ownerId, ...from, name: racerById(ownerId)?.name ?? "Friend" } : cars.find((c) => c.id === ownerId);
    if (!me) return;
    const gs = useRally.getState();
    const mine = ownerId === "me";
    const owner = mine ? null : racerById(ownerId);
    const near = Math.abs(me.z - run.z) < 70;
    const back = mine && (input.lookBack || input.touchLook); // looking behind: fire behind
    let sentTarget: string | undefined;
    // the driver's arm swings as they use it
    if (mine) run.throwT = THROW_TIME;
    else if (owner) owner.throwT = THROW_TIME;
    const baseSpeed = from ? from.speed : mine ? run.speed : owner?.speed ?? 40;
    switch (item) {
      case "aguacate": {
        const obj = makeAguacate();
        group.current?.add(obj);
        projectiles.current.push({
          kind: "aguacate", owner: ownerId, target: null, bounces: 0, trail: 0,
          z: me.z + (back ? -3.5 : 3.5), lat: me.lat, vlat: mine ? Math.sin(run.rel) * 26 : 0, y: 0.9,
          speed: back ? Math.min(baseSpeed - 40, -12) : baseSpeed + 34, life: 4.5, obj,
        });
        if (near) audioManager.playThrow();
        break;
      }
      case "platano": {
        const obj = makePlatano();
        group.current?.add(obj);
        traps.current.push({ kind: "platano", owner: ownerId, z: me.z, lat: me.lat, life: 45, arm: 0.35, fly: 0.35, flyDur: 0.35, z0: me.z - 1, z1: me.z - 5, obj });
        if (near) audioManager.playThrow();
        break;
      }
      case "mecha": {
        const obj = makeMecha();
        group.current?.add(obj);
        const ahead = back ? -7 : 26 + baseSpeed * 0.35;
        traps.current.push({ kind: "mecha", owner: ownerId, z: me.z, lat: me.lat, life: 9, arm: back ? 0.8 : 0.9, fly: back ? 0.4 : 0.8, flyDur: back ? 0.4 : 0.8, z0: me.z + (back ? -2 : 2), z1: me.z + ahead, obj });
        if (near) audioManager.playThrow();
        if (mine) gs.popup("🧨 ¡MECHA!", COLORS.orange, true);
        break;
      }
      case "apagon": {
        // lightning: everyone but the owner is struck, shrunk and slowed
        let n = 0;
        let bi = 0;
        const strike = (z: number, lat: number) => {
          const b = bolts[bi++ % bolts.length];
          toWorld(z, lat, 0, b.position);
          b.visible = true;
          b.userData.t = 0.38;
          boom(z, lat, 1, 3.5, PAL.zap, false);
        };
        for (const c of cars) {
          if (c.id === ownerId) continue;
          if (c.id === "me") {
            if (untouchable() || run.invulnerable > 0) continue;
            if (run.shield) {
              run.shield = false;
              audioManager.playShieldBreak();
              gs.popup("👒 El sombrero te salvó del apagón", COLORS.cyan, true);
              continue;
            }
            strike(run.z, run.lat);
            run.slowTime = 3.5;
            run.tiny = 3.5;
            run.blackout = 3.5;
            run.shake = 0.9;
            if (loseCoins()) burstAt(run.z, run.lat, 1.2, FX.jar, 10, 6, 6);
            gs.popup("⚡ ¡APAGÓN! Te encogiste", COLORS.red, true);
          } else {
            const r = racerById(c.id);
            if (!r || r.remote || r.shield || (r.star ?? 0) > 0) {
              if (r && r.shield) r.shield = false;
              continue;
            }
            strike(r.z, r.lat);
            r.slow = 3.5;
            r.tiny = 3.5;
            n++;
          }
        }
        run.camFlash = 0.8;
        if (mine) gs.popup(`⚡ ¡APAGÓN! ${n} rivales encogidos`, COLORS.gold, true);
        audioManager.playBoom();
        break;
      }
      case "panela":
        boom(me.z, me.lat, 1.2, 5, PAL.star, false);
        if (mine) {
          run.star = 6;
          audioManager.playShield();
          audioManager.playNitro();
          gs.popup("🌟 ¡PANELA POWER! Invencible", COLORS.gold, true);
        } else if (owner) {
          owner.star = 6;
          owner.nitro = 6;
        }
        break;
      case "chiva":
        boom(me.z, me.lat, 1.2, 5, PAL.firework, false);
        if (mine) {
          run.bullet = 4;
          audioManager.playNitro();
          audioManager.playBoom();
          gs.popup("🚌 ¡CHIVA EXPRESS! Agárrese", COLORS.gold, true);
        } else if (owner) {
          owner.star = 4;
          owner.nitro = 4;
        }
        break;
      case "tinto":
        burstAt(me.z - 1.5, me.lat, 0.8, PAL.coffee, 16, 5, 5);
        if (mine) {
          run.nitroTime = Math.max(run.nitroTime, 2.2);
          audioManager.playNitro();
          gs.popup("☕ ¡TINTO TURBO!", COLORS.orange, true);
        } else if (owner) owner.nitro = 2.2;
        break;
      case "sombrero":
        boom(me.z, me.lat, 1.6, 2.5, ["#5fd8ff", "#ffffff"], false);
        if (mine) {
          run.shield = true;
          audioManager.playShield();
          gs.popup("👒 ¡SOMBRERO VUELTIAO!", COLORS.cyan, true);
        } else if (owner) owner.shield = true;
        break;
      case "volador": {
        // the leader (or 2nd place if you're leading)
        const sorted = [...cars].filter((c) => c.id !== ownerId).sort((a, b) => b.z - a.z);
        const target = (forcedTarget && cars.find((c) => c.id === forcedTarget)) || sorted[0];
        if (!target) break;
        sentTarget = target.id === "me" ? myId : target.id;
        const obj = makeVolador();
        group.current?.add(obj);
        projectiles.current.push({ kind: "volador", owner: ownerId, target: target.id, z: me.z + 2, lat: me.lat, vlat: 0, y: 1.5, speed: Math.max(baseSpeed + 20, 80), life: 12, bounces: 0, trail: 0, obj });
        if (near) {
          audioManager.playThrow();
          audioManager.playNitro();
        }
        if (mine) gs.popup(`🎆 VOLADOR → ${target.name}!`, COLORS.orange, true);
        else if (target.id === "me") gs.popup("🚨 ¡VIENE UN VOLADOR!", COLORS.red, true);
        break;
      }
      case "arepa": {
        // a hot arepa in the face of everyone ahead
        let n = 0;
        for (const c of cars) {
          if (c.id === ownerId || c.z <= me.z) continue;
          n++;
          const obj = makeArepa();
          group.current?.add(obj);
          const to = c.id;
          flyers.current.push({
            from: ownerId, to, t: 0, dur: 0.5 + Math.min(0.5, (c.z - me.z) / 200), obj,
            land: () => {
              const p = posOf(to);
              if (p) burstAt(p.z, p.lat, 1.4, PAL.cheese, 14, 5, 4);
              if (to === "me") {
                if (run.shield || untouchable()) return;
                run.splat = 4;
                audioManager.playSplash();
                gs.popup("🫓 ¡AREPAZO! Queso en la cara", COLORS.red, true);
              } else {
                const r = racerById(to);
                if (r && !r.remote && !r.shield && (r.star ?? 0) <= 0) r.splat = 3.2;
              }
            },
          });
        }
        if (near) audioManager.playThrow();
        if (mine) gs.popup(n ? `🫓 ¡AREPAZO a ${n} rivales!` : "🫓 Nadie adelante… te la comiste", COLORS.gold, true);
        break;
      }
      case "aguacero": {
        let n = 0;
        for (const c of cars) {
          if (c.id === ownerId || c.z <= me.z) continue;
          n++;
          if (c.id === "me") {
            if (run.shield) continue;
            run.slowTime = 3;
            gs.popup("🌧️ ¡AGUACERO!", COLORS.cyan, true);
          } else {
            const r = racerById(c.id);
            if (r && !r.shield) r.slow = 3;
          }
          const obj = makeCloud();
          group.current?.add(obj);
          clouds.current.push({ target: c.id, time: 3, obj });
        }
        if (mine) gs.popup(n ? `🌧️ ¡AGUACERO sobre ${n} rivales!` : "🌧️ Nadie adelante para mojar", COLORS.cyan, true);
        if (near) audioManager.playSplash();
        break;
      }
    }
    if (mine && online) room.send({ t: "item", id: myId, item, z: run.z, lat: run.lat, speed: run.speed, target: sentTarget });
  };

  useFrame((state, delta) => {
    if (!race.active) return;
    const real = Math.min(delta, 1 / 20);
    const dt = real * run.timeScale;
    const t = state.clock.elapsedTime;
    const phase = useRally.getState().phase;
    const L = lapLength();
    const total = race.laps * L;
    const now = run.time;

    // --- effects ---
    for (const r of rings) {
      if (!r.mesh.visible) continue;
      r.t += real;
      const k = r.t / r.dur;
      if (k >= 1) r.mesh.visible = false;
      else {
        const e = 1 - (1 - k) * (1 - k);
        r.mesh.scale.setScalar(0.4 + e * r.size);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      }
    }
    for (const f of flashes) {
      if (!f.visible) continue;
      f.userData.t += real;
      const k = f.userData.t / 0.22;
      if (k >= 1) f.visible = false;
      else {
        f.scale.setScalar((0.3 + k) * f.userData.size);
        (f.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      }
    }
    for (const b of bolts) {
      if (!b.visible) continue;
      b.userData.t -= real;
      b.visible = b.userData.t > 0;
      b.scale.x = Math.floor(t * 30) % 2 ? 1 : -1; // flicker
      b.rotation.y = state.camera.rotation.y;
    }

    // --- boxes: place the rows nearest to the player (this lap and next) ---
    let bi = 0;
    const lapNow = Math.floor(run.z / L);
    for (let lap = lapNow; lap <= lapNow + 1; lap++) {
      for (let ri = 0; ri < rows.length; ri++) {
        for (let li = 0; li < 3; li++) {
          const b = boxes[bi++];
          if (!b) continue;
          const z = lap * L + rows[ri];
          const lat = lanes()[li];
          const key = `${lap}:${ri}:${li}`;
          const back = taken.current.get(key) ?? -1;
          const visible = z < total && z > run.z - 30 && z < run.z + 260 && back < now;
          b.visible = visible;
          if (!visible) continue;
          toWorld(z, lat, Math.sin(t * 3 + li) * 0.18, b.position);
          // pops back in with a bounce
          const age = now - back;
          const pop = back > 0 && age < 0.4 ? 0.3 + Math.sin((age / 0.4) * Math.PI * 0.5) * 0.7 + Math.sin((age / 0.4) * Math.PI) * 0.25 : 1;
          b.scale.setScalar(pop);
          const s = b.getObjectByName("spin");
          if (s) s.rotation.set(t * 1.2, t * 2, 0);
          const h = b.getObjectByName("halo");
          if (h) h.scale.setScalar(1 + Math.sin(t * 5 + li) * 0.12);
          if (phase !== "playing") continue;
          // pick-up by the player or any AI
          // every car gets its own box (AI grabbing one doesn't take it from you)
          for (const c of carsNow()) {
            if (c.id !== "me" && racerById(c.id)?.remote) continue; // friends pick up boxes in their own game
            if (Math.abs(c.z - z) < 2.2 && Math.abs(c.lat - lat) < 1.6) {
              const holder = c.id === "me" ? run.item : racerById(c.id)?.item;
              const ckey = c.id === "me" ? key : `${key}:${c.id}`;
              if ((taken.current.get(ckey) ?? -1) >= now) continue;
              taken.current.set(ckey, now + 1.5);
              burstAt(z, lat, 1.1, FX.box, 16, 6, 6);
              if (c.id === "me") {
                boom(z, lat, 1.1, 2.5, ["#FCD116", "#ffffff"], false);
                audioManager.playBox();
              }
              if (holder) continue;
              const pos = c.id === "me" ? playerPosition(run.z, null) : 1 + carsNow().filter((o) => o.z > c.z).length;
              const rolled = rollItem(pos, race.racers.length + 1);
              const item: ItemId = rolled === "aguacate3" ? "aguacate" : rolled;
              if (c.id === "me") {
                run.item = item;
                run.itemCount = rolled === "aguacate3" ? 3 : 1;
                useRally.getState().popup(`${ITEMS[item].emoji} ${ITEMS[item].name.toUpperCase()}${rolled === "aguacate3" ? " ×3" : ""}!`, COLORS.gold, true);
              } else {
                const r = racerById(c.id);
                if (r && !r.remote) {
                  r.item = item;
                  r.itemCd = 0.6 + Math.random() * 1.6; // they don't sit on items
                }
              }
              break;
            }
          }
        }
      }
    }
    for (; bi < boxes.length; bi++) boxes[bi].visible = false;

    // --- what everyone is holding ---
    // your triple avocados circle the kart: they're a shield too
    const circling = run.item === "aguacate" && run.itemCount > 1 ? run.itemCount : 0;
    orbit.forEach((o, i) => {
      o.visible = i < circling;
      if (!o.visible) return;
      const a = t * 4.5 + (i / circling) * Math.PI * 2;
      toWorld(run.z + Math.cos(a) * 2.3, run.lat + Math.sin(a) * 2.1, 0.9 + run.y, o.position);
      o.rotation.set(t * 6, a, 0);
    });
    if (circling && phase === "playing") {
      for (const r of race.racers) {
        if (Math.abs(r.z - run.z) < 3.4 && Math.abs(r.lat - run.lat) < 3 && r.spin <= 0 && (r.immune ?? 0) <= 0) {
          if (hit(r.id, "me", "")) {
            run.itemCount--;
            break;
          }
        }
      }
    }
    // rivals: a bubble shows their item, a sombrero sits on whoever is shielded
    const seen = new Set<string>();
    for (const c of carsNow()) {
      const r = c.id === "me" ? null : racerById(c.id);
      const shielded = c.id === "me" ? run.shield : !!r?.shield;
      if (shielded) {
        seen.add("h" + c.id);
        let hat = hats.current.get(c.id);
        if (!hat) {
          hat = makeSombrero();
          hats.current.set(c.id, hat);
          group.current?.add(hat);
        }
        toWorld(c.z, c.lat, 2.35 + (c.id === "me" ? run.y : r?.y ?? 0) + Math.sin(t * 4) * 0.08, hat.position);
        hat.rotation.set(Math.sin(t * 3) * 0.12, t * 3, Math.cos(t * 3) * 0.12);
      }
      if (r && r.item && !r.remote) {
        seen.add("b" + c.id);
        let sp = bubbles.current.get(c.id);
        if (!sp) {
          sp = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
          sp.scale.setScalar(1.5);
          bubbles.current.set(c.id, sp);
          group.current?.add(sp);
        }
        const map = itemBubble(r.item as ItemId);
        if (sp.material.map !== map) {
          sp.material.map = map;
          sp.material.needsUpdate = true;
        }
        toWorld(c.z, c.lat, 4.3 + Math.sin(t * 5 + c.z) * 0.1, sp.position);
      }
    }
    hats.current.forEach((o, id) => {
      if (!seen.has("h" + id)) {
        o.parent?.remove(o);
        hats.current.delete(id);
      }
    });
    bubbles.current.forEach((o, id) => {
      if (!seen.has("b" + id)) {
        o.parent?.remove(o);
        bubbles.current.delete(id);
      }
    });

    if (phase !== "playing") return;

    // --- status effects wear off; trails for the powered-up ---
    if (run.tiny > 0) run.tiny -= dt;
    if (run.blackout > 0) run.blackout -= dt;
    if (run.splat > 0) run.splat -= dt;
    for (const r of race.racers) {
      if ((r.tiny ?? 0) > 0) r.tiny! -= dt;
      if ((r.splat ?? 0) > 0) r.splat! -= dt;
    }
    trailT.current -= real;
    if (trailT.current <= 0) {
      trailT.current = 0.05;
      if (run.star > 0) burstAt(run.z - 1.5, run.lat + (Math.random() - 0.5) * 1.6, 0.6 + Math.random(), PAL.star, 2, 2, 3);
      if (run.bullet > 0) burstAt(run.z - 3, run.lat + (Math.random() - 0.5) * 2, 0.5, PAL.firework, 2, 3, 3);
      for (const r of race.racers) {
        if ((r.star ?? 0) > 0 && Math.abs(r.z - run.z) < 120) burstAt(r.z - 1.5, r.lat + (Math.random() - 0.5) * 1.6, 0.6 + Math.random(), PAL.star, 1, 2, 3);
      }
    }

    // --- player uses their item ---
    const want = input.item || input.touchItem || input.itemQueued;
    // keep a tap that landed during the short re-fire delay; drop it otherwise
    if (!(run.item && useCd.current > 0)) input.itemQueued = false;
    useCd.current -= dt;
    if (run.item && run.itemCount <= 0) run.item = null;
    if (want && run.item && run.spin <= 0 && run.bullet <= 0 && useCd.current <= 0) {
      const it = run.item as ItemId;
      run.itemCount--;
      if (run.itemCount <= 0) run.item = null;
      useCd.current = 0.35; // so a held key doesn't fire all three avocados at once
      use("me", it);
    }

    // --- AI uses items ---
    for (const r of race.racers) {
      if (r.remote || !r.item) continue;
      r.itemCd -= dt;
      if (r.itemCd > 0 || r.spin > 0) continue;
      const it = r.item as ItemId;
      const someoneAhead = (range: number) => carsNow().some((c) => c.id !== r.id && c.z > r.z && c.z - r.z < range);
      // they wait for a target: no wasted shots
      if ((it === "aguacate" && !someoneAhead(60)) || (it === "mecha" && !someoneAhead(70)) || ((it === "arepa" || it === "aguacero") && !someoneAhead(400))) {
        r.itemCd = 0.6;
        continue;
      }
      r.item = null;
      use(r.id, it);
    }

    // --- projectiles ---
    let incoming = 0;
    const edge = roadHalf() + (isCircuit() ? 3.3 : 0.4);
    projectiles.current = projectiles.current.filter((p) => {
      p.life -= dt;
      p.trail -= real;
      if (p.kind === "volador") {
        const tg = p.target ? posOf(p.target) : null;
        if (!tg) p.life = 0;
        else {
          const gap = tg.z - p.z;
          p.speed = Math.max(p.speed, 60) + dt * 25;
          p.z += p.speed * dt;
          p.lat += (tg.lat - p.lat) * Math.min(1, dt * (gap < 40 ? 5 : 1.5));
          // cruises high, then dives on its target
          const wantY = gap < 30 ? 1 : 4.5;
          p.y += (wantY - p.y) * Math.min(1, dt * 4);
          if (p.target === "me" && gap > 0) incoming = Math.max(incoming, THREE.MathUtils.clamp(1 - gap / 160, 0.05, 1));
          if (gap < 3 && Math.abs(tg.lat - p.lat) < 2.8) {
            boom(tg.z, tg.lat, 1.5, 9, PAL.firework);
            burstAt(tg.z, tg.lat, 4, PAL.firework, 30, 14, 10);
            blast(tg.z, tg.lat, 6, p.owner, "🎆 ¡VOLADOR! ¡BOOM!");
            p.life = 0;
          }
        }
        if (p.trail <= 0) {
          p.trail = 0.03;
          burstAt(p.z - 2, p.lat, p.y, PAL.fire, 2, 2, 1);
        }
        p.obj.rotation.set(-(p.y > 2 ? 0 : 0.2), headingAt(p.z), t * 6);
      } else {
        p.z += p.speed * dt;
        p.lat += p.vlat * dt;
        // bounces off the rails
        if (Math.abs(p.lat) > edge) {
          p.lat = Math.sign(p.lat) * edge;
          p.vlat = -p.vlat * 0.9;
          p.bounces++;
          burstAt(p.z, p.lat, 0.8, PAL.aguacate, 8, 4, 3);
          if (Math.abs(p.z - run.z) < 50) audioManager.playLand();
          if (p.bounces > 3) p.life = 0;
        }
        // pulls a little toward a car right in front of it
        const dir = Math.sign(p.speed);
        const ahead = carsNow()
          .filter((c) => c.id !== p.owner && (c.z - p.z) * dir > -1 && (c.z - p.z) * dir < 16)
          .sort((a, b) => Math.abs(a.z - p.z) - Math.abs(b.z - p.z))[0];
        if (ahead) p.lat += (ahead.lat - p.lat) * Math.min(1, dt * 2.2);
        for (const c of carsNow()) {
          if (c.id === p.owner && p.life > 3.9) continue; // can't hit yourself as it leaves your hand
          if (Math.abs(c.z - p.z) < 2.6 && Math.abs(c.lat - p.lat) < 1.7) {
            hit(c.id, c.id === p.owner ? "" : p.owner, "🥑 ¡AGUACATAZO!");
            burstAt(p.z, p.lat, 1, PAL.aguacate, 18, 7, 6);
            p.life = 0;
            break;
          }
        }
        if (p.trail <= 0) {
          p.trail = 0.045;
          burstAt(p.z - dir * 1.2, p.lat, p.y, PAL.aguacate, 1, 1, 1);
        }
        p.y = 0.9 + Math.abs(Math.sin(t * 9)) * 0.35; // skips along the road
        p.obj.rotation.set(t * 14 * dir, 0, 0);
      }
      toWorld(p.z, p.lat, p.y, p.obj.position);
      if (p.life <= 0) {
        p.obj.parent?.remove(p.obj);
        return false;
      }
      return true;
    });
    // a rocket on your tail: the HUD warns and the beeps get faster
    run.incoming = incoming;
    if (incoming > 0) {
      beep.current -= real;
      if (beep.current <= 0) {
        beep.current = 0.55 - incoming * 0.42;
        audioManager.playCountdown(incoming > 0.8);
      }
    }

    // --- things lying on the road: banana peels and tejo charges ---
    traps.current = traps.current.filter((tr) => {
      tr.life -= dt;
      let y = 0;
      if (tr.fly > 0) {
        tr.fly -= dt;
        const k = 1 - Math.max(0, tr.fly) / tr.flyDur;
        tr.z = tr.z0 + (tr.z1 - tr.z0) * k;
        y = Math.sin(k * Math.PI) * (tr.kind === "mecha" ? 3.2 : 1.1) + (1 - k) * 1;
        tr.obj.rotation.x = k * Math.PI * 4;
        if (tr.fly <= 0) {
          tr.obj.rotation.set(0, Math.random() * 6, 0);
          burstAt(tr.z, tr.lat, 0.2, PAL.smoke, 6, 3, 2);
          if (Math.abs(tr.z - run.z) < 50) audioManager.playLand();
        }
      } else {
        tr.arm -= dt;
        if (tr.kind === "platano") {
          tr.obj.rotation.y += dt * 1.5;
          tr.obj.scale.setScalar(1 + Math.sin(t * 5 + tr.z) * 0.06);
          for (const c of carsNow()) {
            if (Math.abs(c.z - tr.z) < 2.1 && Math.abs(c.lat - tr.lat) < 1.5) {
              if (c.id === "me" && run.airborne) continue;
              if (c.id === tr.owner && tr.arm > -0.6) continue;
              burstAt(tr.z, tr.lat, 0.6, PAL.banana, 12, 6, 5);
              hit(c.id, c.id === tr.owner ? "" : tr.owner, "🍌 ¡RESBALÓN!");
              tr.life = 0;
              break;
            }
          }
        } else {
          // blinks faster and faster, then goes off
          const urgent = tr.life < 2 ? 14 : 5;
          const on = Math.floor(t * urgent) % 2 === 0;
          const light = tr.obj.getObjectByName("light");
          if (light) light.scale.setScalar(on ? 1.5 : 0.8);
          const zone = tr.obj.getObjectByName("zone");
          if (zone) zone.scale.setScalar(1 + Math.sin(t * 8) * 0.06);
          let go = tr.life <= 0.05;
          if (tr.arm <= 0) for (const c of carsNow()) if (Math.abs(c.z - tr.z) < 3 && Math.abs(c.lat - tr.lat) < 2.6 && !(c.id === "me" && run.airborne)) go = true;
          if (go) {
            boom(tr.z, tr.lat, 1, 8, PAL.fire);
            blast(tr.z, tr.lat, 6.5, tr.owner, "🧨 ¡MECHA! ¡PUM!");
            tr.life = 0;
          }
        }
      }
      toWorld(tr.z, tr.lat, y, tr.obj.position);
      if (tr.life <= 0 || tr.z < run.z - 400) {
        tr.obj.parent?.remove(tr.obj);
        return false;
      }
      return true;
    });

    // --- arepas in flight ---
    flyers.current = flyers.current.filter((f) => {
      f.t += dt;
      const a = posOf(f.from), b = posOf(f.to);
      const k = Math.min(1, f.t / f.dur);
      if (a && b) {
        toWorld(a.z + (b.z - a.z) * k, a.lat + (b.lat - a.lat) * k, 1.4 + Math.sin(k * Math.PI) * 3, f.obj.position);
        f.obj.rotation.set(t * 10, t * 7, 0);
      }
      if (k >= 1 || !a || !b) {
        if (a && b) f.land();
        f.obj.parent?.remove(f.obj);
        return false;
      }
      return true;
    });

    // --- rain clouds follow their target ---
    clouds.current = clouds.current.filter((c) => {
      c.time -= dt;
      const tg = posOf(c.target);
      if (tg) toWorld(tg.z, tg.lat, 5.5, c.obj.position);
      c.obj.scale.setScalar(Math.min(1, (3 - c.time) * 4) * Math.min(1, c.time * 3));
      const drops = c.obj.getObjectByName("drops");
      drops?.children.forEach((d) => {
        d.position.y -= dt * 12;
        if (d.position.y < -5) d.position.y = -1;
      });
      if (tg && Math.random() < dt * 14) burstAt(tg.z, tg.lat + (Math.random() - 0.5) * 2, 0.2, ["#9fd8f0", "#ffffff"], 1, 2, 2);
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
