import * as THREE from "three";

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

/* =========================================================
 * Rally car with Pixel the Bunny
 * ======================================================= */
export interface CarRig {
  root: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheels: THREE.Object3D[];
  earL: THREE.Object3D;
  earR: THREE.Object3D;
  flames: THREE.Object3D;
  shield: THREE.Mesh;
  paint: THREE.MeshStandardMaterial[];
}

export function buildCar(): CarRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paintMain = mat("#24A0CE", { roughness: 0.35, metalness: 0.3 });
  const paintAccent = mat("#FDC6B5", { roughness: 0.4, metalness: 0.2 });
  const dark = mat("#0E1B24", { roughness: 0.6 });
  const glass = mat("#9fd8f0", { roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75 });
  const chrome = mat("#dddddd", { roughness: 0.2, metalness: 0.9 });
  const light = mat("#fff6c8", { emissive: "#fff2a0", emissiveIntensity: 1.2 });
  const tail = mat("#ff3344", { emissive: "#ff1122", emissiveIntensity: 0.8 });

  const numberTex = canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0E1B24";
    ctx.font = "bold 76px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("7", 64, 70);
  });
  const numberMat = mat("#ffffff", { map: numberTex });

  // chassis (car points toward +z)
  const chassis = mesh(new THREE.BoxGeometry(1.8, 0.5, 3.9), paintMain);
  chassis.position.y = 0.55;
  body.add(chassis);
  // bonnet slope
  const bonnet = mesh(new THREE.BoxGeometry(1.7, 0.2, 1.2), paintMain);
  bonnet.position.set(0, 0.85, 1.2);
  bonnet.rotation.x = 0.12;
  body.add(bonnet);
  // stripe
  const stripe = mesh(new THREE.BoxGeometry(0.5, 0.52, 3.92), paintAccent, false);
  stripe.position.y = 0.555;
  body.add(stripe);
  // cabin
  const cabin = mesh(new THREE.BoxGeometry(1.55, 0.6, 1.8), paintMain);
  cabin.position.set(0, 1.1, -0.25);
  body.add(cabin);
  const windscreen = mesh(new THREE.BoxGeometry(1.45, 0.5, 0.06), glass, false);
  windscreen.position.set(0, 1.12, 0.66);
  windscreen.rotation.x = -0.35;
  body.add(windscreen);
  const sideGlassL = mesh(new THREE.BoxGeometry(0.04, 0.38, 1.4), glass, false);
  sideGlassL.position.set(0.785, 1.14, -0.25);
  body.add(sideGlassL);
  const sideGlassR = sideGlassL.clone();
  sideGlassR.position.x = -0.785;
  body.add(sideGlassR);
  // roof with sunroof hole look
  const roof = mesh(new THREE.BoxGeometry(1.6, 0.08, 1.9), paintAccent);
  roof.position.set(0, 1.44, -0.25);
  body.add(roof);
  // spoiler
  const spoiler = mesh(new THREE.BoxGeometry(1.9, 0.08, 0.45), dark);
  spoiler.position.set(0, 1.25, -1.85);
  body.add(spoiler);
  [-0.7, 0.7].forEach((x) => {
    const post = mesh(new THREE.BoxGeometry(0.08, 0.4, 0.15), dark);
    post.position.set(x, 1.02, -1.8);
    body.add(post);
  });
  // bumpers, lights, number plates
  const fb = mesh(new THREE.BoxGeometry(1.85, 0.25, 0.25), dark);
  fb.position.set(0, 0.38, 1.95);
  body.add(fb);
  const rb = fb.clone();
  rb.position.z = -1.95;
  body.add(rb);
  [-0.6, 0.6].forEach((x) => {
    const hl = mesh(new THREE.BoxGeometry(0.35, 0.18, 0.06), light, false);
    hl.position.set(x, 0.66, 1.96);
    body.add(hl);
    const tl = mesh(new THREE.BoxGeometry(0.35, 0.14, 0.06), tail, false);
    tl.position.set(x, 0.66, -1.96);
    body.add(tl);
    // rally spot lamps
    const spot = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), light, false);
    spot.rotation.x = Math.PI / 2;
    spot.position.set(x * 0.6, 0.5, 2.1);
    body.add(spot);
  });
  [-1, 1].forEach((side) => {
    const num = mesh(new THREE.PlaneGeometry(0.75, 0.75), numberMat, false);
    num.position.set(side * 0.905, 0.62, -0.1);
    num.rotation.y = side * Math.PI / 2;
    body.add(num);
  });
  // exhaust
  const ex = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), chrome, false);
  ex.rotation.x = Math.PI / 2;
  ex.position.set(0.55, 0.32, -2.05);
  body.add(ex);

  // wheels
  const tyre = mat("#1b1b1f", { roughness: 0.9 });
  const rim = mat("#FDC6B5", { metalness: 0.6, roughness: 0.3 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8);
  const wheels: THREE.Object3D[] = [];
  const frontWheels: THREE.Object3D[] = [];
  [
    [0.92, 1.25],
    [-0.92, 1.25],
    [0.92, -1.25],
    [-0.92, -1.25],
  ].forEach(([x, z], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.42, z);
    const spin = new THREE.Group();
    const w = mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2;
    const r = mesh(rimGeo, rim, false);
    r.rotation.z = Math.PI / 2;
    spin.add(w, r);
    pivot.add(spin);
    root.add(pivot);
    wheels.push(spin);
    if (i < 2) frontWheels.push(pivot);
  });

  // ---- Pixel the Bunny popping out of the sunroof ----
  const fur = mat("#fbfbfb", { roughness: 0.9 });
  const pink = mat("#ffb3c4", { roughness: 0.8 });
  const eye = mat("#111111", { roughness: 0.3 });
  const goggles = mat("#24A0CE", { roughness: 0.2, metalness: 0.5, emissive: "#0c4a66", emissiveIntensity: 0.4 });
  const bunny = new THREE.Group();
  bunny.position.set(0, 1.5, -0.35);
  const head = mesh(new THREE.SphereGeometry(0.36, 18, 14), fur);
  head.scale.set(1, 0.92, 1);
  head.position.y = 0.3;
  bunny.add(head);
  const cheekL = mesh(new THREE.SphereGeometry(0.14, 10, 8), fur);
  cheekL.position.set(0.16, 0.2, 0.26);
  bunny.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = -0.16;
  bunny.add(cheekR);
  const nose = mesh(new THREE.SphereGeometry(0.06, 8, 6), pink, false);
  nose.position.set(0, 0.27, 0.36);
  bunny.add(nose);
  const band = mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 24), dark, false);
  band.position.y = 0.4;
  band.rotation.x = Math.PI / 2 - 0.15;
  bunny.add(band);
  [-0.14, 0.14].forEach((x) => {
    const g = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), goggles, false);
    g.rotation.x = Math.PI / 2;
    g.position.set(x, 0.42, 0.3);
    bunny.add(g);
    const e = mesh(new THREE.SphereGeometry(0.05, 8, 6), eye, false);
    e.position.set(x, 0.33, 0.33);
    bunny.add(e);
  });
  const makeEar = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.14, 0.56, -0.02);
    const ear = mesh(new THREE.CapsuleGeometry(0.08, 0.55, 4, 10), fur);
    ear.position.y = 0.34;
    ear.scale.set(1, 1, 0.55);
    const inner = mesh(new THREE.CapsuleGeometry(0.045, 0.45, 4, 8), pink, false);
    inner.position.set(0, 0.34, 0.035);
    inner.scale.set(1, 1, 0.4);
    pivot.add(ear, inner);
    pivot.rotation.z = -side * 0.15;
    bunny.add(pivot);
    return pivot;
  };
  const earL = makeEar(1);
  const earR = makeEar(-1);
  // scarf flapping colour
  const scarf = mesh(new THREE.TorusGeometry(0.27, 0.07, 6, 18), mat("#ff5a5f"), false);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.02;
  bunny.add(scarf);
  body.add(bunny);

  // nitro flames
  const flames = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({ color: "#ffb03a", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameCore = new THREE.MeshBasicMaterial({ color: "#5fd8ff", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  [-0.45, 0.45].forEach((x) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 10), flameMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(x, 0.42, -2.7);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 8), flameCore);
    c.rotation.x = -Math.PI / 2;
    c.position.set(x, 0.42, -2.4);
    flames.add(f, c);
  });
  flames.visible = false;
  body.add(flames);

  // shield bubble
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 24, 16),
    new THREE.MeshStandardMaterial({
      color: "#5fd8ff",
      emissive: "#24A0CE",
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shield.scale.set(0.85, 0.62, 1.05);
  shield.position.y = 0.8;
  shield.visible = false;
  root.add(shield);

  // blob shadow helps read height during jumps
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4.4),
    new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.25, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  blob.name = "blob";
  root.add(blob);

  return { root, body, wheels, frontWheels, earL, earR, flames, shield, paint: [paintMain, paintAccent] };
}

/* =========================================================
 * Obstacles
 * ======================================================= */
export type ObstacleKind = "cone" | "rock" | "sacks" | "barrier" | "puddle" | "ramp";
export type PickupKind = "jar" | "nitro" | "shield" | "heart";

/** half sizes for collision: [halfWidth (lateral), halfLength (z)] */
export const OBSTACLE_SIZE: Record<ObstacleKind, [number, number]> = {
  cone: [0.45, 0.45],
  rock: [0.95, 0.9],
  sacks: [0.95, 0.7],
  barrier: [1.45, 0.3],
  puddle: [1.3, 1.3],
  ramp: [1.35, 1.8],
};

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
  | "arch";

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
      ctx.font = "bold 38px sans-serif";
      ctx.fillText("★ RALLY ★", 256, 118);
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

/* =========================================================
 * Pools
 * ======================================================= */
type Builder = () => THREE.Object3D;

const BUILDERS: Record<string, Builder> = {
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
  bunting: buildBunting,
};
for (let v = 0; v < 7; v++) BUILDERS[`house${v}`] = () => buildHouse(v);

const templates = new Map<string, THREE.Object3D>();
const SOLID_KINDS = ["cone", "rock", "sacks", "barrier"] as const;

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
