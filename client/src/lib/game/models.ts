import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural low-poly models. Built once, then cloned (clones share
 * geometry + materials, so they're cheap). No external files needed.
 */

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...extra });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, shadow = true) {
  const me = new THREE.Mesh(geo, m);
  me.castShadow = shadow;
  me.receiveShadow = shadow;
  return me;
}

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* Cars and drivers live in vehicles.ts */

/* =========================================================
 * Obstacles
 * ======================================================= */
export type ObstacleKind = "cone" | "rock" | "sacks" | "barrier" | "puddle" | "ramp" | "cow" | "boost" | "hueco" | "fotomulta" | "limpiavidrios" | "semaforo";
export type PickupKind = "jar" | "nitro" | "shield" | "heart" | "tunjo";

/** half sizes for collision: [halfWidth (lateral), halfLength (z)] */
export const OBSTACLE_SIZE: Record<ObstacleKind, [number, number]> = {
  cone: [0.45, 0.45],
  rock: [0.95, 0.9],
  sacks: [0.95, 0.7],
  barrier: [1.45, 0.3],
  puddle: [1.3, 1.3],
  ramp: [1.35, 1.8],
  cow: [1.1, 0.6],
  boost: [1.4, 1.6],
  hueco: [1.0, 0.9],
  fotomulta: [0, 0], // pass-through: it photographs the whole road
  limpiavidrios: [0.6, 0.5],
  semaforo: [0, 0], // pass-through: the light logic lives in RaceSystem
};

function buildHueco() {
  // a pothole: dark hole with a cracked, muddy rim
  const g = new THREE.Group();
  const rim = mesh(new THREE.CircleGeometry(1.25, 18), mat("#5a4a3a", { roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), false);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.03;
  rim.scale.set(1, 0.85, 1);
  const hole = mesh(new THREE.CircleGeometry(0.95, 16), mat("#17120e", { roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }), false);
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.04;
  hole.scale.set(1, 0.85, 1);
  for (let i = 0; i < 6; i++) {
    const crack = mesh(new THREE.BoxGeometry(0.06, 0.01, 0.5 + (i % 3) * 0.2), mat("#2a211a"), false);
    const a = (i / 6) * Math.PI * 2;
    crack.position.set(Math.cos(a) * 1.3, 0.045, Math.sin(a) * 1.1);
    crack.rotation.y = -a + Math.PI / 2;
    g.add(crack);
  }
  g.add(rim, hole);
  return g;
}

function buildFotomulta() {
  // speed camera: grey pole over the road, camera box, warning sign
  const g = new THREE.Group();
  const grey = mat("#8e9399", { metalness: 0.5, roughness: 0.5 });
  const pole = mesh(new THREE.CylinderGeometry(0.14, 0.16, 5.2, 10), grey);
  pole.position.set(5.6, 2.6, 0);
  const arm = mesh(new THREE.BoxGeometry(6.4, 0.18, 0.18), grey);
  arm.position.set(2.6, 5.1, 0);
  const cam = mesh(new THREE.BoxGeometry(0.6, 0.45, 0.7), mat("#2b2f36"));
  cam.position.set(1.2, 4.75, 0);
  const lens = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 10), mat("#111", { metalness: 0.8, roughness: 0.2 }), false);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(1.2, 4.72, -0.42);
  const flash = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), mat("#ffffff", { emissive: "#ffffff", emissiveIntensity: 0.4 }), false);
  flash.position.set(1.65, 4.8, -0.42);
  flash.name = "flash";
  const signTex = canvasTex(256, 192, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = "#CE1126";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(128, 84, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("100", 128, 86);
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("FOTOMULTA 📸", 128, 168);
  });
  const sign = mesh(new THREE.PlaneGeometry(1.5, 1.12), new THREE.MeshStandardMaterial({ map: signTex, side: THREE.DoubleSide }), false);
  sign.position.set(5.6, 3.1, -0.2);
  sign.rotation.y = Math.PI;
  g.add(pole, arm, cam, lens, flash, sign);
  return g;
}

function buildLimpiavidrios() {
  // el mono de los vidrios: squeegee in one hand, spray bottle in the other,
  // walking up and down between the cars at the semáforo
  const g = new THREE.Group();
  const jeans = mat("#2f3f6b");
  const shirt = mat("#e8572a");
  const skin = mat("#c98f63");
  const legs = mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), jeans);
  legs.position.y = 0.4;
  const torso = mesh(new THREE.BoxGeometry(0.58, 0.7, 0.32), shirt);
  torso.position.y = 1.15;
  const head = mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.72;
  const hair = mesh(new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#2a1a0e"), false);
  hair.position.y = 1.76;
  // right arm up with the squeegee (stick + rubber blade)
  const armR = mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), shirt);
  armR.position.set(0.45, 1.5, 0);
  armR.rotation.z = -0.9;
  const stick = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), mat("#777"), false);
  stick.position.set(0.95, 1.95, 0);
  stick.rotation.z = -0.4;
  const blade = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), mat("#111"), false);
  blade.position.set(1.15, 2.4, 0);
  blade.rotation.z = 0.2;
  const sq = new THREE.Group();
  sq.add(stick, blade);
  sq.name = "squeegee";
  // left arm with the spray bottle
  const armL = mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), shirt);
  armL.position.set(-0.42, 1.25, 0.05);
  armL.rotation.z = 0.5;
  const bottle = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.32, 8), mat("#4fc3f7", { transparent: true, opacity: 0.85 }), false);
  bottle.position.set(-0.6, 1.05, 0.12);
  const nozzle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), mat("#c62828"), false);
  nozzle.position.set(-0.6, 1.26, 0.12);
  g.add(legs, torso, head, hair, armR, sq, armL, bottle, nozzle);
  // walks across the road, like the cows
  g.rotation.y = Math.PI / 2;
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

function buildSemaforo() {
  // traffic light hanging over the road
  const g = new THREE.Group();
  const grey = mat("#555b63", { metalness: 0.5, roughness: 0.5 });
  const pole = mesh(new THREE.CylinderGeometry(0.16, 0.18, 6.2, 10), grey);
  pole.position.set(5.6, 3.1, 0);
  const arm = mesh(new THREE.BoxGeometry(6.2, 0.2, 0.2), grey);
  arm.position.set(2.5, 6.1, 0);
  const box = mesh(new THREE.BoxGeometry(0.7, 1.9, 0.6), mat("#1e2328"));
  box.position.set(0, 5.0, 0);
  const lights = [
    ["red", "#ff2a2a", 5.6],
    ["amber", "#ffb000", 5.0],
    ["green", "#2ecc40", 4.4],
  ] as const;
  for (const [name, color, y] of lights) {
    const l = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(color, { emissive: color, emissiveIntensity: name === "red" ? 2.5 : 0.08 }), false);
    l.position.set(0, y, -0.3);
    l.name = name;
    g.add(l);
  }
  const line = mesh(new THREE.PlaneGeometry(9, 0.5), mat("#ffffff", { polygonOffset: true, polygonOffsetFactor: -3 }), false);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.03, -3);
  g.add(pole, arm, box, line);
  return g;
}

function buildCone() {
  const g = new THREE.Group();
  const orange = mat("#ff6b1a", { emissive: "#ff4400", emissiveIntensity: 0.15 });
  const white = mat("#ffffff");
  const base = mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), orange);
  base.position.y = 0.04;
  const c = mesh(new THREE.ConeGeometry(0.36, 1.1, 14), orange);
  c.position.y = 0.6;
  const band = mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.16, 14), white, false);
  band.position.y = 0.62;
  g.add(base, c, band);
  // second cone offset so it reads as a group
  const g2 = g.clone();
  g2.position.set(0.45, 0, 0.3);
  g2.scale.setScalar(0.85);
  const out = new THREE.Group();
  out.add(g, g2);
  return out;
}

function buildRock() {
  const g = new THREE.Group();
  const m = mat("#8a8580", { flatShading: true, roughness: 1 });
  const r1 = mesh(new THREE.DodecahedronGeometry(0.85, 0), m);
  r1.scale.set(1.1, 0.75, 1);
  r1.position.y = 0.5;
  const r2 = mesh(new THREE.DodecahedronGeometry(0.45, 0), m);
  r2.position.set(0.7, 0.3, 0.3);
  g.add(r1, r2);
  return g;
}

function buildSacks() {
  const g = new THREE.Group();
  const burlap = mat("#7d6a52", { roughness: 1 });
  const tex = canvasTex(128, 64, (ctx) => {
    ctx.fillStyle = "#b08a5a";
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#6b3d1e";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CAFÉ", 64, 34);
  });
  const labeled = mat("#ffffff", { map: tex, roughness: 1 });
  const geo = new THREE.CapsuleGeometry(0.35, 0.7, 4, 10);
  [
    [-0.45, 0.35, 0],
    [0.45, 0.35, 0],
    [0, 0.95, 0],
  ].forEach(([x, y, z], i) => {
    const s = mesh(geo, i === 2 ? labeled : burlap);
    s.rotation.z = Math.PI / 2;
    s.rotation.y = i === 2 ? 0.2 : 0;
    s.position.set(x, y, z);
    s.scale.set(1, 1, 0.8);
    g.add(s);
  });
  return g;
}

function buildBarrier() {
  const g = new THREE.Group();
  const tex = canvasTex(256, 32, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#ffffff" : "#e23b3b";
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32 + 32, 0);
      ctx.lineTo(i * 32 + 16, 32);
      ctx.lineTo(i * 32 - 16, 32);
      ctx.fill();
    }
  });
  const stripes = mat("#ffffff", { map: tex, emissive: "#331111", emissiveIntensity: 0.3 });
  const wood = mat("#6b4a2b");
  const board = mesh(new THREE.BoxGeometry(2.9, 0.4, 0.12), stripes);
  board.position.y = 0.95;
  const board2 = board.clone();
  board2.position.y = 0.45;
  g.add(board, board2);
  [-1.3, 1.3].forEach((x) => {
    const leg = mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), wood);
    leg.position.set(x, 0.65, 0);
    const foot = mesh(new THREE.BoxGeometry(0.14, 0.12, 0.8), wood);
    foot.position.set(x, 0.06, 0);
    g.add(leg, foot);
  });
  // blinking lamp
  const lamp = mesh(new THREE.SphereGeometry(0.12, 8, 6), mat("#ffcc00", { emissive: "#ffaa00", emissiveIntensity: 1.5 }), false);
  lamp.position.set(0, 1.25, 0);
  g.add(lamp);
  return g;
}

function buildPuddle() {
  const g = new THREE.Group();
  const water = new THREE.MeshStandardMaterial({
    color: "#3d7fb0",
    roughness: 0.05,
    metalness: 0.4,
    transparent: true,
    opacity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });
  const p = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), water);
  p.rotation.x = -Math.PI / 2;
  p.position.y = 0.04;
  p.scale.set(1, 1.2, 1);
  p.receiveShadow = true;
  const mud = new THREE.Mesh(new THREE.CircleGeometry(1.55, 20), new THREE.MeshStandardMaterial({ color: "#5a4230", roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  mud.rotation.x = -Math.PI / 2;
  mud.position.y = 0.03;
  mud.scale.set(1, 1.2, 1);
  g.add(mud, p);
  return g;
}

function buildRamp() {
  const g = new THREE.Group();
  // chevrons pointing forward (texture u runs along the road)
  const tex = canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#111";
    for (let i = 0; i < 3; i++) {
      const x = 8 + i * 40;
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x + 30, 64);
      ctx.lineTo(x, 114);
      ctx.lineTo(x + 14, 114);
      ctx.lineTo(x + 44, 64);
      ctx.lineTo(x + 14, 14);
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 3.6, 1 / 2.6);
  tex.offset.set(0.5, 0.5);
  // wedge: profile in z/y, extruded across x
  const shape = new THREE.Shape();
  shape.moveTo(-1.8, 0);
  shape.lineTo(1.8, 0);
  shape.lineTo(1.8, 0.95);
  shape.lineTo(-1.8, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false });
  geo.translate(0, 0, -1.3);
  geo.rotateY(-Math.PI / 2);
  const m = mat("#ffffff", { map: tex, emissive: "#332200", emissiveIntensity: 0.3 });
  const w = mesh(geo, m);
  g.add(w);
  return g;
}

/* =========================================================
 * Pickups
 * ======================================================= */
function glowRing(color: string) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 1.0, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.name = "ring";
  return ring;
}

/** Tall light beam so pickups read as "good stuff" from far away. */
function lightBeam(color: string) {
  const geo = new THREE.CylinderGeometry(0.12, 0.3, 5, 12, 1, true);
  geo.translate(0, 4.4, 0); // starts above the item so the item stays visible
  // fade out toward the top using vertex colours
  const colors: number[] = [];
  const pos = geo.attributes.position;
  const c = new THREE.Color(color);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, 1 - (pos.getY(i) - 1.9) / 5);
    colors.push(c.r * t, c.g * t, c.b * t);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const beam = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    }),
  );
  beam.name = "beam";
  return beam;
}

/** Red warning mark on the road under things that hurt you. */
function dangerMark(halfW: number, halfL: number) {
  const shape = new THREE.Shape();
  const w = halfW + 0.35;
  const l = halfL + 0.35;
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.82, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const m = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 32),
    new THREE.MeshBasicMaterial({ color: "#ff2a2a", transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  m.scale.set(w, l, 1);
  m.name = "danger";
  return m;
}

function buildJar() {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  spin.name = "spin";
  const caramel = mat("#ffb02e", { emissive: "#ff8a00", emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1 });
  const lid = mat("#ffe14a", { metalness: 0.6, roughness: 0.2, emissive: "#ffcc00", emissiveIntensity: 0.9 });
  const labelTex = canvasTex(256, 64, (ctx) => {
    ctx.fillStyle = "#fff4e0";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#c0392b";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AREQUIPE", 128, 34);
  });
  const label = mat("#ffffff", { map: labelTex, emissive: "#ffffff", emissiveIntensity: 0.15 });
  const jar = mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.7, 18), caramel, false);
  const lbl = mesh(new THREE.CylinderGeometry(0.425, 0.43, 0.3, 18, 1, true), label, false);
  lbl.position.y = -0.02;
  const top = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.16, 18), lid, false);
  top.position.y = 0.43;
  // sparkle halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  spin.add(jar, lbl, top, halo);
  spin.scale.setScalar(1.3);
  g.add(spin, glowRing("#ffcc55"), lightBeam("#ffd23f"));
  return g;
}

function buildNitro() {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  spin.name = "spin";
  const red = mat("#ff3b3b", { emissive: "#aa0000", emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.3 });
  const can = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), red, false);
  const cap = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.22, 12), mat("#cccccc", { metalness: 0.9, roughness: 0.2 }), false);
  cap.position.y = 0.56;
  // lightning bolt
  const bolt = new THREE.Shape();
  bolt.moveTo(0.05, 0.35);
  bolt.lineTo(-0.15, 0);
  bolt.lineTo(0, 0);
  bolt.lineTo(-0.08, -0.35);
  bolt.lineTo(0.16, 0.06);
  bolt.lineTo(0.01, 0.06);
  bolt.lineTo(0.1, 0.35);
  const bg = new THREE.ExtrudeGeometry(bolt, { depth: 0.05, bevelEnabled: false });
  const yellow = mat("#ffe14a", { emissive: "#ffcc00", emissiveIntensity: 1 });
  const b1 = mesh(bg, yellow, false);
  b1.position.z = 0.29;
  const b2 = mesh(bg, yellow, false);
  b2.position.z = -0.34;
  spin.add(can, cap, b1, b2);
  spin.scale.setScalar(1.2);
  g.add(spin, glowRing("#ff6a3a"), lightBeam("#ff6a3a"));
  return g;
}

function buildShield() {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  spin.name = "spin";
  const gem = mesh(new THREE.OctahedronGeometry(0.42, 0), mat("#5fd8ff", { emissive: "#24A0CE", emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.15, flatShading: true }), false);
  gem.scale.set(1, 1.3, 1);
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 18, 12),
    new THREE.MeshStandardMaterial({ color: "#a8ecff", transparent: true, opacity: 0.25, emissive: "#24A0CE", emissiveIntensity: 0.4, depthWrite: false }),
  );
  spin.add(gem, bubble);
  spin.scale.setScalar(1.2);
  g.add(spin, glowRing("#5fd8ff"), lightBeam("#5fd8ff"));
  return g;
}

function buildHeart() {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  spin.name = "spin";
  const s = new THREE.Shape();
  s.moveTo(0, -0.35);
  s.bezierCurveTo(-0.6, 0.05, -0.35, 0.5, 0, 0.22);
  s.bezierCurveTo(0.35, 0.5, 0.6, 0.05, 0, -0.35);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  geo.center();
  const h = mesh(geo, mat("#ff3d6e", { emissive: "#cc0033", emissiveIntensity: 0.7, roughness: 0.3 }), false);
  h.scale.setScalar(1.3);
  spin.add(h);
  g.add(spin, glowRing("#ff6d8f"), lightBeam("#ff6d8f"));
  return g;
}

/* =========================================================
 * Scenery
 * ======================================================= */
export type SceneryKind =
  | "coffeeBush"
  | "waxPalm"
  | "banana"
  | "fence"
  | "frailejon"
  | "boulder"
  | "pine"
  | "house"
  | "lamp"
  | "banner"
  | "bunting"
  | "arch"
  | "ceiba"
  | "fern"
  | "terrace"
  | "hut"
  | "stairs"
  | "barrio"
  | "graffiti"
  | "escalator"
  | "neonPalm"
  | "neonSign";

function buildCoffeeBush() {
  const g = new THREE.Group();
  const leaf = mat("#2f6b2a", { flatShading: true, roughness: 1 });
  const berry = mat("#c0262d", { emissive: "#550000", emissiveIntensity: 0.3 });
  const geo = new THREE.IcosahedronGeometry(0.8, 0);
  [
    [0, 0.8, 0, 1],
    [0.6, 0.6, 0.3, 0.75],
    [-0.5, 0.65, -0.2, 0.8],
  ].forEach(([x, y, z, s]) => {
    const b = mesh(geo, leaf);
    b.position.set(x, y, z);
    b.scale.setScalar(s);
    g.add(b);
  });
  const bg = new THREE.SphereGeometry(0.09, 6, 4);
  for (let i = 0; i < 7; i++) {
    const b = mesh(bg, berry, false);
    const a = i * 0.9;
    b.position.set(Math.cos(a) * 0.75, 0.6 + (i % 3) * 0.3, Math.sin(a) * 0.75);
    g.add(b);
  }
  return g;
}

function buildWaxPalm() {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.15, 0.22, 9, 7), mat("#d9d2c0"));
  trunk.position.y = 4.5;
  g.add(trunk);
  const leafMat = mat("#3f8a3a", { side: THREE.DoubleSide, flatShading: true });
  const leafGeo = new THREE.ConeGeometry(0.35, 3, 4);
  for (let i = 0; i < 8; i++) {
    const l = mesh(leafGeo, leafMat);
    const a = (i / 8) * Math.PI * 2;
    l.position.set(Math.cos(a) * 1.2, 8.8, Math.sin(a) * 1.2);
    l.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    g.add(l);
  }
  return g;
}

function buildBanana() {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.6, 6), mat("#6f8a3a"));
  trunk.position.y = 1.3;
  g.add(trunk);
  const leafMat = mat("#5cb83a", { side: THREE.DoubleSide, flatShading: true });
  const leafGeo = new THREE.BoxGeometry(0.7, 0.04, 2.4);
  for (let i = 0; i < 6; i++) {
    const l = mesh(leafGeo, leafMat);
    const a = (i / 6) * Math.PI * 2;
    l.position.set(Math.cos(a) * 1.0, 2.8, Math.sin(a) * 1.0);
    l.rotation.y = -a + Math.PI / 2;
    l.rotation.x = 0.5;
    g.add(l);
  }
  return g;
}

function buildFence() {
  const g = new THREE.Group();
  const wood = mat("#7a5532", { roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const p = mesh(new THREE.BoxGeometry(0.14, 1.2, 0.14), wood);
    p.position.set(0, 0.6, -3 + i * 2);
    g.add(p);
  }
  [0.4, 0.9].forEach((y) => {
    const r = mesh(new THREE.BoxGeometry(0.06, 0.1, 6.2), wood);
    r.position.set(0, y, 0);
    g.add(r);
  });
  return g;
}

function buildFrailejon() {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.6, 7), mat("#5a4a3a", { roughness: 1 }));
  trunk.position.y = 0.8;
  g.add(trunk);
  const leaf = mat("#b8c79a", { flatShading: true, roughness: 1, side: THREE.DoubleSide });
  const geo = new THREE.ConeGeometry(0.16, 1.0, 4);
  for (let i = 0; i < 12; i++) {
    const l = mesh(geo, leaf);
    const a = (i / 12) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.35, 1.85, Math.sin(a) * 0.35);
    l.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(l);
  }
  const flower = mesh(new THREE.SphereGeometry(0.16, 8, 6), mat("#ffd23f", { emissive: "#664400", emissiveIntensity: 0.3 }), false);
  flower.position.y = 2.1;
  g.add(flower);
  return g;
}

function buildBoulder() {
  const g = new THREE.Group();
  const m = mat("#7f7a75", { flatShading: true, roughness: 1 });
  const b = mesh(new THREE.DodecahedronGeometry(1.6, 0), m);
  b.scale.set(1.2, 0.8, 1);
  b.position.y = 0.9;
  const moss = mesh(new THREE.DodecahedronGeometry(0.9, 0), mat("#6f8f4a", { flatShading: true }));
  moss.position.set(0.8, 0.5, 0.6);
  g.add(b, moss);
  return g;
}

function buildPine() {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.4, 6), mat("#5a3d25"));
  trunk.position.y = 0.7;
  g.add(trunk);
  const green = mat("#2d5e3e", { flatShading: true });
  [
    [2.4, 2.2, 1.9],
    [1.9, 2.0, 3.2],
    [1.3, 1.6, 4.3],
  ].forEach(([r, h, y]) => {
    const c = mesh(new THREE.ConeGeometry(r, h, 7), green);
    c.position.y = y;
    g.add(c);
  });
  return g;
}

const HOUSE_COLORS = ["#ff6b6b", "#ffd23f", "#4ecdc4", "#a06cd5", "#ff9f43", "#5fa8ff", "#7bd389"];
const ZOCALO_COLORS = ["#24A0CE", "#e23b3b", "#2e8b57", "#ffb703", "#8338ec"];

function buildHouse(variant: number) {
  const g = new THREE.Group();
  const wall = mat("#fff6e8", { roughness: 0.95 });
  const zocalo = mat(ZOCALO_COLORS[variant % ZOCALO_COLORS.length]);
  const trim = mat(HOUSE_COLORS[variant % HOUSE_COLORS.length]);
  const roof = mat("#b5532f", { flatShading: true });
  const w = 6;
  const d = 5;
  const h = 3.4 + (variant % 3) * 0.8;
  const body = mesh(new THREE.BoxGeometry(w, h, d), wall);
  body.position.y = h / 2;
  g.add(body);
  const z = mesh(new THREE.BoxGeometry(w + 0.04, 1.1, d + 0.04), zocalo);
  z.position.y = 0.55;
  g.add(z);
  const r = mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.3, 1.8, 4), roof);
  r.rotation.y = Math.PI / 4;
  r.scale.set(1, 1, d / w);
  r.position.y = h + 0.9;
  g.add(r);
  // door + windows + balcony facing the road (+x local)
  const door = mesh(new THREE.BoxGeometry(0.1, 2.1, 1.2), trim, false);
  door.position.set(w / 2 + 0.03, 1.05, 0);
  g.add(door);
  [-1.6, 1.6].forEach((zz) => {
    const win = mesh(new THREE.BoxGeometry(0.1, 1.1, 1.0), trim, false);
    win.position.set(w / 2 + 0.03, h - 1.2, zz);
    g.add(win);
    const pot = mesh(new THREE.BoxGeometry(0.4, 0.3, 1.1), mat("#c0262d"), false);
    pot.position.set(w / 2 + 0.25, h - 1.8, zz);
    g.add(pot);
  });
  return g;
}

function buildLamp() {
  const g = new THREE.Group();
  const iron = mat("#222831", { metalness: 0.6, roughness: 0.4 });
  const pole = mesh(new THREE.CylinderGeometry(0.07, 0.1, 4, 8), iron);
  pole.position.y = 2;
  const arm = mesh(new THREE.BoxGeometry(1.0, 0.07, 0.07), iron);
  arm.position.set(-0.45, 3.9, 0);
  const bulb = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat("#fff2b0", { emissive: "#ffd36a", emissiveIntensity: 1.4 }), false);
  bulb.position.set(-0.9, 3.75, 0);
  g.add(pole, arm, bulb);
  return g;
}

let bannerTex: THREE.Texture | null = null;
function buildBanner() {
  if (!bannerTex) {
    bannerTex = canvasTex(512, 160, (ctx) => {
      const grd = ctx.createLinearGradient(0, 0, 512, 0);
      grd.addColorStop(0, "#0E1B24");
      grd.addColorStop(1, "#173447");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 512, 160);
      ctx.fillStyle = "#24A0CE";
      ctx.fillRect(0, 0, 512, 10);
      ctx.fillRect(0, 150, 512, 10);
      ctx.fillStyle = "#24A0CE";
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DREAM NEXUS", 256, 64);
      ctx.fillStyle = "#FDC6B5";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("dreamnexus.digital", 256, 118);
    });
  }
  const g = new THREE.Group();
  const post = mat("#333", { metalness: 0.5 });
  const face = mat("#ffffff", { map: bannerTex, emissive: "#ffffff", emissiveMap: bannerTex, emissiveIntensity: 0.25 });
  const board = mesh(new THREE.BoxGeometry(0.15, 1.6, 5), [post, post, post, post, post, post] as any);
  board.material = [face, face, post, post, post, post] as any;
  board.position.y = 2.2;
  g.add(board);
  [-2.2, 2.2].forEach((z) => {
    const p = mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), post);
    p.position.set(0, 1.5, z);
    g.add(p);
  });
  return g;
}

function buildBunting() {
  // flags strung across the road (local x = across road)
  const g = new THREE.Group();
  const rope = mesh(new THREE.BoxGeometry(14, 0.03, 0.03), mat("#333"), false);
  rope.position.y = 6;
  g.add(rope);
  const flagGeo = new THREE.ConeGeometry(0.3, 0.6, 3);
  for (let i = 0; i < 18; i++) {
    const f = mesh(flagGeo, mat(HOUSE_COLORS[i % HOUSE_COLORS.length], { side: THREE.DoubleSide, emissive: HOUSE_COLORS[i % HOUSE_COLORS.length], emissiveIntensity: 0.2 }), false);
    const x = -6.5 + i * (13 / 17);
    f.position.set(x, 6 - 0.32 - Math.sin((i / 17) * Math.PI) * 0.3, 0);
    f.rotation.x = Math.PI;
    f.scale.set(1, 1, 0.15);
    g.add(f);
  }
  [-7, 7].forEach((x) => {
    const pole = mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.2, 6), mat("#6b4a2b"));
    pole.position.set(x, 3.1, 0);
    g.add(pole);
  });
  return g;
}

function buildArch(label: string) {
  const g = new THREE.Group();
  const tex = canvasTex(512, 96, (ctx) => {
    ctx.fillStyle = "#0E1B24";
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = "#FDC6B5";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 88);
    ctx.fillStyle = "#ffd23f";
    ctx.font = "bold 60px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 256, 52);
  });
  const face = mat("#ffffff", { map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.5 });
  const frame = mat("#24A0CE", { metalness: 0.4, roughness: 0.4 });
  const top = mesh(new THREE.BoxGeometry(13, 1.3, 0.4), [frame, frame, frame, frame, face, face] as any);
  top.position.y = 6;
  g.add(top);
  [-6.3, 6.3].forEach((x) => {
    const p = mesh(new THREE.BoxGeometry(0.5, 6.6, 0.5), frame);
    p.position.set(x, 3.3, 0);
    g.add(p);
  });
  return g;
}

/* ---------- Ciudad Perdida (Teyuna) ---------- */
function buildCeiba() {
  // giant jungle tree with buttress roots, wide canopy and hanging vines
  const g = new THREE.Group();
  const bark = mat("#7b6a55", { roughness: 1, flatShading: true });
  const trunk = mesh(new THREE.CylinderGeometry(0.55, 0.9, 10, 8), bark);
  trunk.position.y = 5;
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const root = mesh(new THREE.BoxGeometry(0.25, 1.8, 1.6), bark);
    const a = (i / 5) * Math.PI * 2;
    root.position.set(Math.cos(a) * 0.9, 0.8, Math.sin(a) * 0.9);
    root.rotation.y = -a;
    g.add(root);
  }
  const leafA = mat("#2f7a36", { flatShading: true, roughness: 1 });
  const leafB = mat("#4f9a3c", { flatShading: true, roughness: 1 });
  const geo = new THREE.IcosahedronGeometry(2.4, 0);
  [
    [0, 10.5, 0, 1.3, leafA],
    [2.4, 9.8, 0.8, 1, leafB],
    [-2.2, 10, -0.6, 1.05, leafB],
    [0.6, 11.6, -1.6, 0.9, leafA],
    [-0.8, 9.6, 2, 0.85, leafA],
  ].forEach(([x, y, z, s, m]) => {
    const c = mesh(geo, m as THREE.Material);
    c.position.set(x as number, y as number, z as number);
    c.scale.set(s as number, (s as number) * 0.6, s as number);
    g.add(c);
  });
  const vine = mat("#3d6b2a");
  for (let i = 0; i < 6; i++) {
    const v = mesh(new THREE.CylinderGeometry(0.04, 0.04, 3 + (i % 3), 4), vine, false);
    const a = i * 1.1;
    v.position.set(Math.cos(a) * 2.2, 8 - (i % 3) * 0.5, Math.sin(a) * 2.2);
    g.add(v);
  }
  return g;
}

function buildFern() {
  const g = new THREE.Group();
  const leaf = mat("#3f9a3a", { side: THREE.DoubleSide, flatShading: true });
  const geo = new THREE.ConeGeometry(0.28, 1.8, 3);
  for (let i = 0; i < 9; i++) {
    const l = mesh(geo, leaf);
    const a = (i / 9) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.6, 0.6, Math.sin(a) * 0.6);
    l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    l.scale.set(1, 1, 0.25);
    g.add(l);
  }
  return g;
}

function buildTerrace() {
  // the round mossy stone terraces Ciudad Perdida is famous for
  const g = new THREE.Group();
  const stone = mat("#8f8c80", { flatShading: true, roughness: 1 });
  const moss = mat("#5f9a45", { flatShading: true, roughness: 1 });
  [
    [5.2, 0.9, 0.45],
    [3.8, 0.9, 1.35],
  ].forEach(([r, h, y]) => {
    const ring = mesh(new THREE.CylinderGeometry(r, r + 0.3, h, 20), stone);
    ring.position.y = y;
    g.add(ring);
    const top = mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, 0.12, 20), moss);
    top.position.y = y + h / 2 + 0.05;
    g.add(top);
  });
  return g;
}

function buildHut() {
  // Tairona hut: stone base ring, round wall, tall conical thatch roof
  const g = new THREE.Group();
  const stone = mat("#8f8c80", { flatShading: true, roughness: 1 });
  const wall = mat("#b49a72", { roughness: 1 });
  const thatch = mat("#c9a85a", { flatShading: true, roughness: 1 });
  const base = mesh(new THREE.CylinderGeometry(3.3, 3.5, 0.8, 18), stone);
  base.position.y = 0.4;
  const w = mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.2, 16), wall);
  w.position.y = 1.9;
  const roof = mesh(new THREE.ConeGeometry(3.2, 4.2, 16), thatch);
  roof.position.y = 5.1;
  const tip = mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 5), mat("#5a4a3a"));
  tip.position.y = 7.6;
  const door = mesh(new THREE.BoxGeometry(0.9, 1.5, 0.2), mat("#3b2e22"), false);
  door.position.set(2.38, 1.55, 0);
  door.rotation.y = Math.PI / 2;
  g.add(base, w, roof, tip, door);
  return g;
}

function buildStairs() {
  // a stone stairway climbing into the jungle
  const g = new THREE.Group();
  const stone = mat("#9a968a", { flatShading: true, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const step = mesh(new THREE.BoxGeometry(1.6 + i * 0.35, 0.35, 2.2), stone);
    step.position.set(i * 0.7, 0.18 + i * 0.35, 0);
    g.add(step);
  }
  return g;
}

/* ---------- Comuna 13 at night (Medellín · Siloé · Soacha) ---------- */
const BRICK = ["#b5563a", "#a24a33", "#c46a45", "#e8d9c0", "#5fa8ff", "#ff9f43", "#7bd389"];
let windowMat: THREE.Material | null = null;

function buildBarrio(variant: number) {
  // houses stacked up the hillside, lights on in the windows
  const g = new THREE.Group();
  windowMat ??= mat("#ffd27a", { emissive: "#ffc04a", emissiveIntensity: 1.6 });
  const roofMat = mat("#5a5a5a", { roughness: 1 });
  const winGeo = new THREE.BoxGeometry(0.06, 0.6, 0.6);
  for (let i = 0; i < 7; i++) {
    const r = hashV(variant * 31 + i);
    const w = 3 + r * 2;
    const h = 2.6 + hashV(variant * 17 + i) * 2.6;
    const m = mat(BRICK[(variant + i) % BRICK.length], { roughness: 1 });
    const house = mesh(new THREE.BoxGeometry(w, h, 3.4), m);
    // each house sits higher and further from the road than the last
    const x = i * 2.6;
    const y = i * 1.5 + h / 2;
    const z = (hashV(variant * 7 + i) - 0.5) * 6;
    house.position.set(x, y, z);
    g.add(house);
    const roof = mesh(new THREE.BoxGeometry(w + 0.2, 0.15, 3.6), roofMat);
    roof.position.set(x, y + h / 2 + 0.07, z);
    g.add(roof);
    for (let k = 0; k < 2; k++) {
      if (hashV(variant * 13 + i * 3 + k) < 0.35) continue;
      const win = mesh(winGeo, windowMat, false);
      win.position.set(x - w / 2 - 0.02, y + 0.2, z - 0.8 + k * 1.6);
      g.add(win);
    }
  }
  return g;
}

function hashV(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function graffitiTexture(seed: number) {
  const words = ["COMUNA 13", "PIXEL", "SILOÉ", "SOACHA", "DNR", "PAZ", "BUNNY", "RALLY"];
  return canvasTex(512, 160, (ctx) => {
    ctx.fillStyle = "#3d3a45";
    ctx.fillRect(0, 0, 512, 160);
    const cols = ["#ff4f9a", "#5fd8ff", "#ffd23f", "#7bd389", "#ff9f43", "#b388ff"];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = cols[Math.floor(hashV(seed * 9 + i) * cols.length)];
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(hashV(seed + i * 3) * 512, hashV(seed + i * 5) * 160, 20 + hashV(i + seed) * 60, 12 + hashV(i * 2 + seed) * 40, hashV(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const word = words[seed % words.length];
    ctx.font = "bold 72px 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#111";
    ctx.strokeText(word, 256, 84);
    ctx.fillStyle = cols[seed % cols.length];
    ctx.fillText(word, 256, 84);
    // paint drips
    ctx.fillStyle = cols[(seed + 2) % cols.length];
    for (let i = 0; i < 8; i++) ctx.fillRect(60 + i * 55, 110, 5, 20 + hashV(seed * 3 + i) * 30);
  });
}

function buildGraffiti(variant: number) {
  const g = new THREE.Group();
  const tex = graffitiTexture(variant);
  const face = mat("#ffffff", { map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.35, roughness: 1 });
  const side = mat("#4a4652");
  const wall = mesh(new THREE.BoxGeometry(0.35, 2.6, 8), [face, face, side, side, side, side] as any);
  wall.position.y = 1.3;
  g.add(wall);
  return g;
}

function buildEscalator() {
  // Comuna 13's famous covered outdoor escalators, climbing the hill (+x)
  const g = new THREE.Group();
  const metal = mat("#9aa3ad", { metalness: 0.6, roughness: 0.4 });
  const roof = mat("#ff7a1a", { emissive: "#ff5a00", emissiveIntensity: 0.4 });
  const len = 9;
  const angle = Math.atan2(4.5, len);
  const run = new THREE.Group();
  run.rotation.z = angle;
  const belt = mesh(new THREE.BoxGeometry(Math.hypot(len, 4.5), 0.4, 1.6), metal);
  belt.position.x = Math.hypot(len, 4.5) / 2;
  const cover = mesh(new THREE.BoxGeometry(Math.hypot(len, 4.5), 0.12, 2.4), roof);
  cover.position.set(Math.hypot(len, 4.5) / 2, 2.4, 0);
  run.add(belt, cover);
  for (let i = 0; i < 5; i++) {
    const post = mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), metal);
    post.position.set(1 + i * 2.2, 1.2, 1.1);
    const post2 = post.clone();
    post2.position.z = -1.1;
    run.add(post, post2);
  }
  g.add(run);
  return g;
}

function buildNeonPalm() {
  const g = new THREE.Group();
  const pink = mat("#ff4f9a", { emissive: "#ff2a85", emissiveIntensity: 1.6 });
  const cyan = mat("#5fd8ff", { emissive: "#24c8ff", emissiveIntensity: 1.6, side: THREE.DoubleSide });
  const trunk = mesh(new THREE.CylinderGeometry(0.16, 0.22, 7, 7), mat("#1a1424"));
  trunk.position.y = 3.5;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.04, 4, 12), pink, false);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1 + i * 1.1;
    g.add(ring);
  }
  const leafGeo = new THREE.BoxGeometry(0.08, 0.06, 2.6);
  for (let i = 0; i < 7; i++) {
    const l = mesh(leafGeo, cyan, false);
    const a = (i / 7) * Math.PI * 2;
    l.position.set(Math.cos(a) * 1.1, 6.9, Math.sin(a) * 1.1);
    l.rotation.y = -a + Math.PI / 2;
    l.rotation.x = 0.45;
    g.add(l);
  }
  return g;
}

function buildNeonSign(variant: number) {
  const words = ["COMUNA 13", "SILOÉ", "SOACHA"];
  const colors = ["#ff4f9a", "#5fd8ff", "#ffd23f"];
  const word = words[variant % words.length];
  const col = colors[variant % colors.length];
  const tex = canvasTex(512, 160, (ctx) => {
    ctx.fillStyle = "#07040d";
    ctx.fillRect(0, 0, 512, 160);
    ctx.shadowColor = col;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = col;
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, 484, 132);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 76px 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(word, 256, 84);
  });
  const g = new THREE.Group();
  const face = mat("#ffffff", { map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 1.4 });
  const dark = mat("#111");
  const board = mesh(new THREE.BoxGeometry(0.15, 1.6, 5), [face, face, dark, dark, dark, dark] as any);
  board.position.y = 3.2;
  g.add(board);
  [-2, 2].forEach((z) => {
    const p = mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6), dark);
    p.position.set(0, 1.6, z);
    g.add(p);
  });
  return g;
}

/* ---------- Colombian extras: cows, golden tunjo, race pieces ---------- */
function buildCow() {
  // a cow crossing the road — very Colombian countryside
  const g = new THREE.Group();
  const white = mat("#f4f1ea", { roughness: 1 });
  const black = mat("#1a1a1a", { roughness: 1 });
  const body = mesh(new THREE.BoxGeometry(0.9, 0.8, 1.8), white);
  body.position.y = 1.0;
  g.add(body);
  [[0.3, 1.25, 0.3, 0.5], [-0.25, 1.0, -0.4, 0.6], [0.46, 0.95, -0.2, 0.4]].forEach(([x, y, z, s]) => {
    const spot = mesh(new THREE.BoxGeometry(0.02 + (x > 0.4 ? 0.02 : 0.92), s * 0.8, s), black, false);
    spot.position.set(x > 0.4 ? x : 0, y, z);
    g.add(spot);
  });
  const head = mesh(new THREE.BoxGeometry(0.55, 0.5, 0.6), white);
  head.position.set(0, 1.25, 1.1);
  g.add(head);
  const snout = mesh(new THREE.BoxGeometry(0.5, 0.25, 0.2), mat("#f2a5b0"));
  snout.position.set(0, 1.1, 1.45);
  g.add(snout);
  [-0.2, 0.2].forEach((x) => {
    const horn = mesh(new THREE.ConeGeometry(0.05, 0.22, 6), mat("#e8dcc0"));
    horn.position.set(x, 1.6, 1.0);
    g.add(horn);
    const eye = mesh(new THREE.SphereGeometry(0.05, 6, 4), black, false);
    eye.position.set(x, 1.35, 1.41);
    g.add(eye);
  });
  [[0.3, 0.6], [-0.3, 0.6], [0.3, -0.6], [-0.3, -0.6]].forEach(([x, z]) => {
    const leg = mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), white);
    leg.position.set(x, 0.3, z);
    g.add(leg);
  });
  const bell = mesh(new THREE.SphereGeometry(0.08, 8, 6), mat("#ffd23f", { metalness: 0.8, roughness: 0.3 }), false);
  bell.position.set(0, 0.92, 1.3);
  g.add(bell);
  // cows walk sideways across the road: rotate so it faces across (+x)
  g.rotation.y = Math.PI / 2;
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

function buildTunjo() {
  // golden Muisca "tunjo" offering figure — rare treasure
  const g = new THREE.Group();
  const spin = new THREE.Group();
  spin.name = "spin";
  const gold = mat("#ffcf33", { metalness: 0.95, roughness: 0.2, emissive: "#b37400", emissiveIntensity: 0.7 });
  const body = mesh(new THREE.BoxGeometry(0.45, 0.8, 0.08), gold, false);
  const head = mesh(new THREE.BoxGeometry(0.34, 0.3, 0.08), gold, false);
  head.position.y = 0.55;
  const crown = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), gold, false);
  crown.position.y = 0.73;
  spin.add(body, head, crown);
  [-0.3, 0.3].forEach((x) => {
    const arm = mesh(new THREE.BoxGeometry(0.08, 0.5, 0.06), gold, false);
    arm.position.set(x, 0.05, 0);
    spin.add(arm);
  });
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#fff0a0", transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  spin.add(halo);
  spin.scale.setScalar(1.4);
  g.add(spin, glowRing("#ffe680"), lightBeam("#fff3b0"));
  return g;
}

function buildBoost() {
  // glowing chevron boost pad on the road (circuits)
  const g = new THREE.Group();
  const tex = canvasTex(128, 256, (ctx) => {
    ctx.fillStyle = "#0a3550";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "#5fd8ff";
    for (let i = 0; i < 3; i++) {
      const y = 200 - i * 70;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(64, y - 50);
      ctx.lineTo(118, y);
      ctx.lineTo(118, y + 22);
      ctx.lineTo(64, y - 28);
      ctx.lineTo(10, y + 22);
      ctx.fill();
    }
  });
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 3.2),
    new THREE.MeshStandardMaterial({ map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 1.2, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  pad.rotation.set(-Math.PI / 2, 0, Math.PI); // chevrons point the way you're driving
  pad.position.y = 0.04;
  g.add(pad);
  return g;
}

let checkerTex: THREE.Texture | null = null;
export function makeFinishLine() {
  checkerTex ??= canvasTex(256, 32, (ctx) => {
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff";
        ctx.fillRect(i * 16, j * 16, 16, 16);
      }
  });
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(9.8, 1.4),
    new THREE.MeshStandardMaterial({ map: checkerTex, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.04;
  return line;
}

function buildGrandstand() {
  // stepped stands full of colourful fans, along the road (+x local is away)
  const g = new THREE.Group();
  const concrete = mat("#9aa0a8", { roughness: 1 });
  const roof = mat("#24A0CE");
  const fanColors = ["#FCD116", "#003893", "#CE1126", "#ffffff", "#ff9f43", "#7bd389"];
  for (let i = 0; i < 5; i++) {
    const step = mesh(new THREE.BoxGeometry(1.2, 0.6 + i * 0.6, 14), concrete);
    step.position.set(i * 1.2, (0.6 + i * 0.6) / 2, 0);
    g.add(step);
    for (let k = 0; k < 12; k++) {
      const fan = mesh(new THREE.BoxGeometry(0.4, 0.55, 0.4), mat(fanColors[(i * 5 + k) % fanColors.length]), false);
      fan.position.set(i * 1.2 - 0.2, 0.6 + i * 0.6 + 0.28, -6.5 + k * 1.15 + (i % 2) * 0.3);
      g.add(fan);
    }
  }
  const r = mesh(new THREE.BoxGeometry(7, 0.15, 14.5), roof);
  r.position.set(2.4, 5.2, 0);
  r.rotation.z = -0.12;
  g.add(r);
  [0, 4.8].forEach((x) => [-7, 7].forEach((z) => {
    const p = mesh(new THREE.BoxGeometry(0.15, 5.2, 0.15), concrete);
    p.position.set(x, 2.6, z);
    g.add(p);
  }));
  return g;
}

function buildTireWall() {
  const g = new THREE.Group();
  const tyre = mat("#1b1b1f", { roughness: 1 });
  const red = mat("#e23b3b");
  const white = mat("#f4f4f4");
  const geo = new THREE.TorusGeometry(0.35, 0.16, 6, 12);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 2; j++) {
      const t = mesh(geo, j === 1 ? (i % 2 ? red : white) : tyre);
      t.rotation.x = Math.PI / 2;
      t.position.set(0, 0.16 + j * 0.32, -3.5 + i * 1.0);
      g.add(t);
    }
  return g;
}

/* ---------- Desierto de la Tatacoa ---------- */
function buildRedRock() {
  // eroded red "cárcavas" formation
  const g = new THREE.Group();
  const red = mat("#b5603a", { flatShading: true, roughness: 1 });
  const dark = mat("#8a4428", { flatShading: true, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const c = mesh(new THREE.ConeGeometry(1 + hashV(i) * 1.2, 3 + hashV(i * 3) * 4, 5), i % 2 ? red : dark);
    c.position.set((i - 2) * 1.4, 1.5 + hashV(i * 3) * 2, hashV(i * 7) * 2 - 1);
    g.add(c);
  }
  return g;
}

function buildCactus() {
  const g = new THREE.Group();
  const green = mat("#4f7a3a", { flatShading: true });
  const trunk = mesh(new THREE.CylinderGeometry(0.25, 0.3, 3, 8), green);
  trunk.position.y = 1.5;
  g.add(trunk);
  [[-1, 1.6], [1, 2.1]].forEach(([s, y]) => {
    const arm = mesh(new THREE.CylinderGeometry(0.17, 0.17, 1, 8), green);
    arm.position.set(s * 0.45, y + 0.5, 0);
    const elbow = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 8), green);
    elbow.rotation.z = Math.PI / 2;
    elbow.position.set(s * 0.25, y, 0);
    g.add(arm, elbow);
  });
  const flower = mesh(new THREE.SphereGeometry(0.15, 8, 6), mat("#ff4f9a", { emissive: "#661030", emissiveIntensity: 0.3 }), false);
  flower.position.y = 3.05;
  g.add(flower);
  return g;
}

function buildObservatory() {
  const g = new THREE.Group();
  const white = mat("#f4f4f4");
  const base = mesh(new THREE.CylinderGeometry(2.2, 2.4, 3, 16), white);
  base.position.y = 1.5;
  const dome = mesh(new THREE.SphereGeometry(2.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat("#d0d6de", { metalness: 0.6, roughness: 0.3 }));
  dome.position.y = 3;
  const slit = mesh(new THREE.BoxGeometry(0.5, 2.3, 0.1), mat("#111"), false);
  slit.position.set(0, 4, 1.9);
  slit.rotation.x = -0.6;
  g.add(base, dome, slit);
  return g;
}

/* ---------- Cartagena ---------- */
function buildCityWall() {
  // old stone city wall with battlements
  const g = new THREE.Group();
  const stone = mat("#c9b48a", { roughness: 1, flatShading: true });
  const wall = mesh(new THREE.BoxGeometry(2.2, 3.2, 10), stone);
  wall.position.y = 1.6;
  g.add(wall);
  for (let i = 0; i < 5; i++) {
    const m = mesh(new THREE.BoxGeometry(2.2, 0.6, 1.0), stone);
    m.position.set(0, 3.5, -4 + i * 2);
    g.add(m);
  }
  return g;
}

const BALCONY_COLORS = ["#ffd23f", "#ff6b6b", "#4ecdc4", "#ff9f43", "#a06cd5", "#5fa8ff", "#f7f1e3"];
function buildColonial(variant: number) {
  // two-storey colonial house with a wooden balcony and bougainvillea
  const g = new THREE.Group();
  const wall = mat(BALCONY_COLORS[variant % BALCONY_COLORS.length], { roughness: 0.95 });
  const wood = mat("#6b3f1f");
  const w = 7;
  const h = 6.2;
  const body = mesh(new THREE.BoxGeometry(5, h, w), wall);
  body.position.set(2.5, h / 2, 0);
  g.add(body);
  const roof = mesh(new THREE.BoxGeometry(5.4, 0.3, w + 0.4), mat("#b5532f"));
  roof.position.set(2.5, h + 0.15, 0);
  g.add(roof);
  // balcony on the road side (-x)
  const balcony = mesh(new THREE.BoxGeometry(0.9, 0.15, w - 1), wood);
  balcony.position.set(-0.4, 3.4, 0);
  g.add(balcony);
  const rail = mesh(new THREE.BoxGeometry(0.1, 0.9, w - 1), wood);
  rail.position.set(-0.8, 3.9, 0);
  g.add(rail);
  const roofB = mesh(new THREE.BoxGeometry(1.2, 0.1, w - 0.6), wood);
  roofB.position.set(-0.45, 5.0, 0);
  roofB.rotation.z = 0.25;
  g.add(roofB);
  for (let i = 0; i < 3; i++) {
    const door = mesh(new THREE.BoxGeometry(0.1, 2.2, 1.0), wood, false);
    door.position.set(-0.03, 1.1, -2 + i * 2);
    g.add(door);
  }
  // bougainvillea clusters
  const pink = mat("#e8336b", { flatShading: true });
  for (let i = 0; i < 4; i++) {
    const f = mesh(new THREE.IcosahedronGeometry(0.6, 0), pink);
    f.position.set(-0.7, 4.5 + hashV(variant + i) * 0.8, -2.6 + i * 1.7);
    f.scale.set(0.8, 0.6, 1.2);
    g.add(f);
  }
  return g;
}

function buildCoconutPalm() {
  const g = new THREE.Group();
  const trunkMat = mat("#8a6a4a");
  const pivot = new THREE.Group();
  pivot.rotation.z = 0.25;
  for (let i = 0; i < 6; i++) {
    const seg = mesh(new THREE.CylinderGeometry(0.17, 0.22, 1.2, 7), trunkMat);
    seg.position.set(i * 0.1, 0.6 + i * 1.15, 0);
    pivot.add(seg);
  }
  const leafMat = mat("#3f9a3a", { side: THREE.DoubleSide, flatShading: true });
  const leafGeo = new THREE.BoxGeometry(0.5, 0.04, 3);
  for (let i = 0; i < 8; i++) {
    const l = mesh(leafGeo, leafMat);
    const a = (i / 8) * Math.PI * 2;
    l.position.set(0.6 + Math.cos(a) * 1.3, 7.1, Math.sin(a) * 1.3);
    l.rotation.y = -a + Math.PI / 2;
    l.rotation.x = 0.55;
    pivot.add(l);
  }
  [0, 1, 2].forEach((i) => {
    const nut = mesh(new THREE.SphereGeometry(0.16, 8, 6), mat("#5a3d25"), false);
    nut.position.set(0.6 + Math.cos(i * 2) * 0.25, 6.8, Math.sin(i * 2) * 0.25);
    pivot.add(nut);
  });
  g.add(pivot);
  return g;
}

function buildClockTower() {
  // Torre del Reloj style gate tower
  const g = new THREE.Group();
  const yellow = mat("#f2c94c", { roughness: 0.9 });
  const white = mat("#f7f1e3");
  const base = mesh(new THREE.BoxGeometry(4, 6, 6), yellow);
  base.position.y = 3;
  const arch = mesh(new THREE.BoxGeometry(4.1, 3, 2), mat("#2a2420"), false);
  arch.position.set(0, 1.5, 0);
  const tower = mesh(new THREE.BoxGeometry(2.6, 4, 2.6), white);
  tower.position.y = 8;
  const clock = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 20), mat("#ffffff", { emissive: "#ffffee", emissiveIntensity: 0.4 }), false);
  clock.rotation.z = Math.PI / 2;
  clock.position.set(-1.33, 8.4, 0);
  const top = mesh(new THREE.ConeGeometry(1.6, 2.4, 4), mat("#b5532f"));
  top.rotation.y = Math.PI / 4;
  top.position.y = 11.2;
  g.add(base, arch, tower, clock, top);
  return g;
}

function buildSea() {
  // a stretch of Caribbean sea beside the road
  const g = new THREE.Group();
  // +x local = away from the road
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 16),
    new THREE.MeshStandardMaterial({ color: "#1fb5c9", roughness: 0.15, metalness: 0.3 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(45, 0.25, 0);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(10, 16), new THREE.MeshStandardMaterial({ color: "#f2dca5", roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(6, 0.3, 0);
  g.add(sea, sand);
  return g;
}

/* ---------- Cali ---------- */
function buildSugarcane() {
  // a block of tall sugar cane from the Valle del Cauca fields (merged into 2 meshes, so it's cheap)
  const g = new THREE.Group();
  const stalks: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 28; i++) {
    const x = (hashV(i * 3.1) - 0.5) * 6;
    const z = (hashV(i * 7.7) - 0.5) * 8;
    const st = new THREE.CylinderGeometry(0.05, 0.06, 3.2, 5);
    st.rotateZ((hashV(i) - 0.5) * 0.15);
    st.translate(x, 1.6, z);
    stalks.push(st);
    const lf = new THREE.BoxGeometry(0.05, 0.9, 0.25);
    lf.rotateZ(-0.8);
    lf.translate(x + 0.2, 3.0, z);
    leaves.push(lf);
  }
  g.add(mesh(mergeGeometries(stalks)!, mat("#7fae3c", { flatShading: true })));
  g.add(mesh(mergeGeometries(leaves)!, mat("#5e9a2e", { side: THREE.DoubleSide, flatShading: true }), false));
  return g;
}

function buildCristoRey() {
  // white statue with open arms on a hill, seen from the road
  const g = new THREE.Group();
  const hill = mesh(new THREE.ConeGeometry(22, 26, 8), mat("#4f8a3c", { flatShading: true }));
  hill.position.y = 9;
  g.add(hill);
  const white = mat("#f4f1ea", { emissive: "#ffffff", emissiveIntensity: 0.15 });
  const base = mesh(new THREE.BoxGeometry(2.4, 3, 2.4), mat("#cfc8ba"));
  base.position.y = 23.5;
  const robe = mesh(new THREE.CylinderGeometry(0.9, 1.5, 8, 10), white);
  robe.position.y = 29;
  const arms = mesh(new THREE.BoxGeometry(9, 0.8, 0.8), white);
  arms.position.y = 32;
  const head = mesh(new THREE.SphereGeometry(0.85, 12, 10), white);
  head.position.y = 34;
  g.add(base, robe, arms, head);
  return g;
}

function buildGato() {
  // bronze cat sculpture by the river
  const g = new THREE.Group();
  const bronze = mat("#8a5a2b", { metalness: 0.7, roughness: 0.35 });
  const plinth = mesh(new THREE.BoxGeometry(2.2, 0.8, 2.2), mat("#9aa0a8"));
  plinth.position.y = 0.4;
  const body = mesh(new THREE.SphereGeometry(1, 14, 10), bronze);
  body.scale.set(0.8, 1.2, 1);
  body.position.y = 1.9;
  const head = mesh(new THREE.SphereGeometry(0.65, 14, 10), bronze);
  head.position.set(0, 3.3, 0.25);
  g.add(plinth, body, head);
  [-0.3, 0.3].forEach((x) => {
    const ear = mesh(new THREE.ConeGeometry(0.2, 0.45, 4), bronze);
    ear.position.set(x, 3.95, 0.2);
    g.add(ear);
  });
  const tail = mesh(new THREE.TorusGeometry(0.7, 0.12, 6, 12, Math.PI), bronze);
  tail.position.set(0, 1.2, -0.8);
  tail.rotation.y = Math.PI / 2;
  g.add(tail);
  return g;
}

function buildSalsaSign() {
  const tex = canvasTex(512, 160, (ctx) => {
    ctx.fillStyle = "#12051f";
    ctx.fillRect(0, 0, 512, 160);
    ctx.shadowColor = "#ff4f9a";
    ctx.shadowBlur = 26;
    ctx.fillStyle = "#ffffff";
    ctx.font = "italic bold 82px 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SALSA", 256, 70);
    ctx.shadowColor = "#ffd23f";
    ctx.fillStyle = "#ffd23f";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("♪ Cali Pachanguero ♪", 256, 132);
  });
  const g = new THREE.Group();
  const face = mat("#ffffff", { map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 1.3 });
  const dark = mat("#111");
  const board = mesh(new THREE.BoxGeometry(0.15, 1.6, 5), [face, face, dark, dark, dark, dark] as any);
  board.position.y = 3.2;
  g.add(board);
  [-2, 2].forEach((z) => {
    const p = mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6), dark);
    p.position.set(0, 1.6, z);
    g.add(p);
  });
  return g;
}

function buildFruitStand() {
  // cholado / lulada stand with a striped umbrella
  const g = new THREE.Group();
  const cart = mesh(new THREE.BoxGeometry(1.4, 1.0, 2.2), mat("#24A0CE"));
  cart.position.y = 0.8;
  g.add(cart);
  const fruitCols = ["#ff5a5f", "#ffd23f", "#7bd389", "#ff9f43", "#a06cd5"];
  for (let i = 0; i < 10; i++) {
    const f = mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(fruitCols[i % 5]), false);
    f.position.set(-0.3 + (i % 3) * 0.3, 1.4, -0.8 + Math.floor(i / 3) * 0.5);
    g.add(f);
  }
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mat("#ddd"));
  pole.position.y = 2.2;
  g.add(pole);
  for (let i = 0; i < 6; i++) {
    const seg = mesh(new THREE.ConeGeometry(1.5, 0.6, 6, 1, true, (i / 6) * Math.PI * 2, Math.PI / 3), mat(i % 2 ? "#ffffff" : "#e23b3b", { side: THREE.DoubleSide }), false);
    seg.position.y = 3.3;
    g.add(seg);
  }
  return g;
}

/* =========================================================
 * Pools
 * ======================================================= */
type Builder = () => THREE.Object3D;

const BUILDERS: Record<string, Builder> = {
  hueco: buildHueco,
  fotomulta: buildFotomulta,
  limpiavidrios: buildLimpiavidrios,
  semaforo: buildSemaforo,
  cone: buildCone,
  rock: buildRock,
  sacks: buildSacks,
  barrier: buildBarrier,
  puddle: buildPuddle,
  ramp: buildRamp,
  jar: buildJar,
  nitro: buildNitro,
  shield: buildShield,
  heart: buildHeart,
  coffeeBush: buildCoffeeBush,
  waxPalm: buildWaxPalm,
  banana: buildBanana,
  fence: buildFence,
  frailejon: buildFrailejon,
  boulder: buildBoulder,
  pine: buildPine,
  lamp: buildLamp,
  banner: buildBanner,
  ceiba: buildCeiba,
  fern: buildFern,
  terrace: buildTerrace,
  hut: buildHut,
  stairs: buildStairs,
  escalator: buildEscalator,
  cow: buildCow,
  tunjo: buildTunjo,
  boost: buildBoost,
  grandstand: buildGrandstand,
  tireWall: buildTireWall,
  redRock: buildRedRock,
  cactus: buildCactus,
  observatory: buildObservatory,
  cityWall: buildCityWall,
  coconutPalm: buildCoconutPalm,
  clockTower: buildClockTower,
  sea: buildSea,
  sugarcane: buildSugarcane,
  cristoRey: buildCristoRey,
  gato: buildGato,
  salsaSign: buildSalsaSign,
  fruitStand: buildFruitStand,
  neonPalm: buildNeonPalm,
  bunting: buildBunting,
};
for (let v = 0; v < 7; v++) BUILDERS[`house${v}`] = () => buildHouse(v);
for (let v = 0; v < 5; v++) BUILDERS[`barrio${v}`] = () => buildBarrio(v);
for (let v = 0; v < 8; v++) BUILDERS[`graffiti${v}`] = () => buildGraffiti(v);
for (let v = 0; v < 3; v++) BUILDERS[`neonSign${v}`] = () => buildNeonSign(v);
for (let v = 0; v < 7; v++) BUILDERS[`colonial${v}`] = () => buildColonial(v);

const templates = new Map<string, THREE.Object3D>();
const SOLID_KINDS = ["cone", "rock", "sacks", "barrier", "cow", "limpiavidrios", "hueco"] as const;

/** Pool of cloned models per kind, so we never allocate during a race. */
export class ModelPool {
  private free = new Map<string, THREE.Object3D[]>();

  acquire(kind: string): THREE.Object3D {
    const list = this.free.get(kind);
    if (list && list.length) return list.pop()!;
    let t = templates.get(kind);
    if (!t) {
      const b = BUILDERS[kind];
      t = b ? b() : new THREE.Group();
      if ((SOLID_KINDS as readonly string[]).includes(kind)) {
        const [hw, hl] = OBSTACLE_SIZE[kind as ObstacleKind];
        t.add(dangerMark(hw, hl));
      }
      templates.set(kind, t);
    }
    const o = t.clone(true);
    o.userData.kind = kind;
    return o;
  }

  release(o: THREE.Object3D) {
    o.parent?.remove(o);
    const kind = o.userData.kind as string;
    if (!this.free.has(kind)) this.free.set(kind, []);
    this.free.get(kind)!.push(o);
  }
}

export function makeArch(label: string) {
  return buildArch(label);
}
