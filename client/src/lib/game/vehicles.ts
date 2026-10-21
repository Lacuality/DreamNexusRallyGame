import * as THREE from "three";
import { paintById, type CarId, type DriverId, type PaintId } from "./garage";

/**
 * Procedural cars + drivers. Every car points toward +z.
 * buildVehicle() returns a "rig" the game animates (wheels, ears, flames...).
 */

export interface CarRig {
  root: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheels: THREE.Object3D[];
  wobble: THREE.Object3D[]; // ears / crests / antennas that flap with speed
  flames: THREE.Object3D;
  shield: THREE.Mesh;
  length: number;
}

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], shadow = true) {
  const me = new THREE.Mesh(geo, m as any);
  me.castShadow = shadow;
  me.receiveShadow = shadow;
  return me;
}

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true) {
  const b = mesh(new THREE.BoxGeometry(w, h, d), m, shadow);
  b.position.set(x, y, z);
  return b;
}

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Palette {
  main: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  light: THREE.MeshStandardMaterial;
  tail: THREE.MeshStandardMaterial;
}

function palette(paintId: PaintId): Palette {
  const p = paintById(paintId);
  return {
    main: mat(p.main, { roughness: 0.35, metalness: 0.3 }),
    accent: mat(p.accent, { roughness: 0.4, metalness: 0.2 }),
    trim: mat(p.trim, { roughness: 0.5 }),
    dark: mat("#0E1B24", { roughness: 0.6 }),
    glass: mat("#9fd8f0", { roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75 }),
    chrome: mat("#dddddd", { roughness: 0.2, metalness: 0.9 }),
    light: mat("#fff6c8", { emissive: "#fff2a0", emissiveIntensity: 1.2 }),
    tail: mat("#ff3344", { emissive: "#ff1122", emissiveIntensity: 0.8 }),
  };
}

function numberPlate(n: string) {
  const tex = canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0E1B24";
    ctx.font = "bold 70px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n, 64, 70);
  });
  return mat("#ffffff", { map: tex });
}

interface BodyResult {
  group: THREE.Group;
  mount: THREE.Vector3; // where the driver's head sits
  wheels: [number, number][]; // x,z of each wheel (first two = front)
  wheelR: number;
  length: number;
}

/* ---------------- car bodies ---------------- */

function bodyRally7(c: Palette): BodyResult {
  const g = new THREE.Group();
  g.add(box(1.8, 0.5, 3.9, c.main, 0, 0.55, 0));
  const bonnet = box(1.7, 0.2, 1.2, c.main, 0, 0.85, 1.2);
  bonnet.rotation.x = 0.12;
  g.add(bonnet);
  g.add(box(0.5, 0.52, 3.92, c.accent, 0, 0.555, 0, false));
  g.add(box(1.55, 0.6, 1.8, c.main, 0, 1.1, -0.25));
  const ws = box(1.45, 0.5, 0.06, c.glass, 0, 1.12, 0.66, false);
  ws.rotation.x = -0.35;
  g.add(ws);
  g.add(box(0.04, 0.38, 1.4, c.glass, 0.785, 1.14, -0.25, false), box(0.04, 0.38, 1.4, c.glass, -0.785, 1.14, -0.25, false));
  g.add(box(1.6, 0.08, 1.9, c.accent, 0, 1.44, -0.25));
  g.add(box(1.9, 0.08, 0.45, c.trim, 0, 1.25, -1.85));
  [-0.7, 0.7].forEach((x) => g.add(box(0.08, 0.4, 0.15, c.trim, x, 1.02, -1.8)));
  g.add(box(1.85, 0.25, 0.25, c.dark, 0, 0.38, 1.95), box(1.85, 0.25, 0.25, c.dark, 0, 0.38, -1.95));
  [-0.6, 0.6].forEach((x) => {
    g.add(box(0.35, 0.18, 0.06, c.light, x, 0.66, 1.96, false), box(0.35, 0.14, 0.06, c.tail, x, 0.66, -1.96, false));
    const spot = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), c.light, false);
    spot.rotation.x = Math.PI / 2;
    spot.position.set(x * 0.6, 0.5, 2.1);
    g.add(spot);
  });
  const plate = numberPlate("7");
  [-1, 1].forEach((side) => {
    const num = mesh(new THREE.PlaneGeometry(0.75, 0.75), plate, false);
    num.position.set(side * 0.905, 0.62, -0.1);
    num.rotation.y = (side * Math.PI) / 2;
    g.add(num);
  });
  return { group: g, mount: new THREE.Vector3(0, 1.5, -0.35), wheels: [[0.92, 1.25], [-0.92, 1.25], [0.92, -1.25], [-0.92, -1.25]], wheelR: 0.42, length: 3.9 };
}

function bodyCuatro(c: Palette): BodyResult {
  // small, tall, boxy classic with a roof rack
  const g = new THREE.Group();
  g.add(box(1.6, 0.7, 3.4, c.main, 0, 0.7, 0));
  g.add(box(1.5, 0.75, 2.1, c.main, 0, 1.4, -0.35));
  const ws = box(1.4, 0.6, 0.05, c.glass, 0, 1.4, 0.72, false);
  ws.rotation.x = -0.15;
  g.add(ws);
  g.add(box(0.04, 0.5, 1.8, c.glass, 0.76, 1.45, -0.35, false), box(0.04, 0.5, 1.8, c.glass, -0.76, 1.45, -0.35, false));
  g.add(box(1.55, 0.06, 2.0, c.accent, 0, 1.8, -0.35));
  // roof rack + luggage
  [-0.6, 0.6].forEach((x) => g.add(box(0.06, 0.08, 1.9, c.chrome, x, 1.9, -0.35)));
  g.add(box(0.9, 0.35, 0.7, mat("#c0392b"), 0.25, 2.05, -0.9));
  g.add(box(1.62, 0.3, 0.15, c.chrome, 0, 0.45, 1.72), box(1.62, 0.3, 0.15, c.chrome, 0, 0.45, -1.72));
  [-0.52, 0.52].forEach((x) => {
    const hl = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 14), c.light, false);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 0.85, 1.71);
    g.add(hl);
    g.add(box(0.2, 0.2, 0.05, c.tail, x, 0.85, -1.71, false));
  });
  g.add(box(0.7, 0.35, 0.05, c.trim, 0, 0.85, 1.72, false)); // grille
  return { group: g, mount: new THREE.Vector3(0, 1.85, -0.1), wheels: [[0.78, 1.15], [-0.78, 1.15], [0.78, -1.15], [-0.78, -1.15]], wheelR: 0.36, length: 3.4 };
}

function bodyWillys(c: Palette): BodyResult {
  // open-top coffee jeep with a roll bar and spare wheel
  const g = new THREE.Group();
  g.add(box(1.75, 0.6, 3.6, c.main, 0, 0.75, 0));
  g.add(box(1.6, 0.25, 1.3, c.main, 0, 1.12, 1.1)); // bonnet
  g.add(box(1.0, 0.45, 0.08, c.dark, 0, 0.9, 1.81)); // grille
  for (let i = 0; i < 5; i++) g.add(box(0.06, 0.38, 0.1, c.chrome, -0.36 + i * 0.18, 0.9, 1.84, false));
  const ws = box(1.6, 0.55, 0.05, c.glass, 0, 1.45, 0.42, false);
  ws.rotation.x = -0.1;
  g.add(ws);
  g.add(box(1.6, 0.05, 0.08, c.trim, 0, 1.75, 0.42));
  // roll bar
  [-0.75, 0.75].forEach((x) => g.add(box(0.08, 0.9, 0.08, c.trim, x, 1.5, -0.9)));
  g.add(box(1.58, 0.08, 0.08, c.trim, 0, 1.95, -0.9));
  // fenders
  [-0.95, 0.95].forEach((x) => [1.2, -1.2].forEach((z) => g.add(box(0.35, 0.12, 1.0, c.accent, x, 1.08, z))));
  // spare wheel + coffee sacks in the back
  const spare = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 14), mat("#1b1b1f"));
  spare.rotation.x = Math.PI / 2;
  spare.position.set(0, 1.0, -1.92);
  g.add(spare);
  g.add(box(0.9, 0.35, 0.6, mat("#7d6a52"), -0.25, 1.22, -1.3), box(0.7, 0.3, 0.5, mat("#8d7a62"), 0.4, 1.2, -1.2));
  [-0.55, 0.55].forEach((x) => {
    const hl = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14), c.light, false);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 1.05, 1.8);
    g.add(hl);
    g.add(box(0.18, 0.18, 0.05, c.tail, x * 1.3, 0.85, -1.81, false));
  });
  return { group: g, mount: new THREE.Vector3(0, 1.45, -0.25), wheels: [[0.95, 1.2], [-0.95, 1.2], [0.95, -1.2], [-0.95, -1.2]], wheelR: 0.5, length: 3.6 };
}

function bodyTaxi(c: Palette): BodyResult {
  // the yellow Bogotá taxi: always yellow body, paint colours the stripes
  const g = new THREE.Group();
  const yellow = mat("#ffcc00", { roughness: 0.35, metalness: 0.3 });
  g.add(box(1.8, 0.55, 4.2, yellow, 0, 0.6, 0));
  g.add(box(1.6, 0.55, 2.0, yellow, 0, 1.15, -0.2));
  const ws = box(1.5, 0.5, 0.05, c.glass, 0, 1.15, 0.85, false);
  ws.rotation.x = -0.45;
  g.add(ws);
  g.add(box(0.04, 0.4, 1.6, c.glass, 0.81, 1.18, -0.2, false), box(0.04, 0.4, 1.6, c.glass, -0.81, 1.18, -0.2, false));
  // checker stripe on each side
  const check = canvasTex(256, 32, (ctx) => {
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff";
        ctx.fillRect(i * 16, j * 16, 16, 16);
      }
  });
  const checkMat = mat("#ffffff", { map: check });
  [-0.905, 0.905].forEach((x) => {
    const s = mesh(new THREE.PlaneGeometry(3.6, 0.22), checkMat, false);
    s.position.set(x, 0.7, 0);
    s.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(s);
  });
  g.add(box(1.82, 0.12, 4.22, c.accent, 0, 0.42, 0, false));
  // TAXI roof sign
  const sign = canvasTex(128, 48, (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 128, 48);
    ctx.fillStyle = "#111";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TAXI", 64, 26);
  });
  const signMat = mat("#ffffff", { map: sign, emissive: "#ffffff", emissiveMap: sign, emissiveIntensity: 0.6 });
  g.add(box(0.7, 0.25, 0.3, signMat, 0, 1.55, 0.5));
  g.add(box(1.85, 0.22, 0.2, c.chrome, 0, 0.42, 2.12), box(1.85, 0.22, 0.2, c.chrome, 0, 0.42, -2.12));
  [-0.6, 0.6].forEach((x) => g.add(box(0.4, 0.16, 0.05, c.light, x, 0.7, 2.11, false), box(0.4, 0.14, 0.05, c.tail, x, 0.72, -2.11, false)));
  return { group: g, mount: new THREE.Vector3(0, 1.45, -0.45), wheels: [[0.9, 1.35], [-0.9, 1.35], [0.9, -1.35], [-0.9, -1.35]], wheelR: 0.4, length: 4.2 };
}

function bodyChiva(c: Palette): BodyResult {
  // the rural "chiva" party bus: colourful wooden body, open sides, luggage on the roof
  const g = new THREE.Group();
  const wood = mat("#f4e9d0");
  const stripeTex = canvasTex(256, 64, (ctx) => {
    const cols = ["#e23b3b", "#ffd23f", "#24A0CE", "#7bd389", "#ff9f43", "#a06cd5"];
    ctx.fillStyle = "#f4e9d0";
    ctx.fillRect(0, 0, 256, 64);
    cols.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * 10 + 2, 256, 6);
    });
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(i * 32, 64);
      ctx.lineTo(i * 32 + 16, 50);
      ctx.lineTo(i * 32 + 32, 64);
      ctx.fill();
    }
  });
  const stripes = mat("#ffffff", { map: stripeTex });
  // cab + hood
  g.add(box(1.9, 0.7, 1.6, c.main, 0, 0.9, 2.3));
  g.add(box(1.7, 0.3, 1.0, c.main, 0, 1.4, 2.6));
  g.add(box(1.2, 0.5, 0.08, c.chrome, 0, 0.95, 3.12));
  // passenger box
  g.add(box(2.2, 0.6, 4.6, stripes, 0, 1.0, -0.6));
  for (let i = 0; i < 6; i++) {
    [-1.05, 1.05].forEach((x) => g.add(box(0.1, 1.1, 0.1, c.accent, x, 1.85, 1.4 - i * 0.85)));
  }
  g.add(box(2.3, 0.15, 4.9, c.accent, 0, 2.45, -0.4));
  // rooftop luggage, bananas and a hen basket
  g.add(box(0.8, 0.4, 0.6, mat("#7d6a52"), -0.5, 2.73, -1.8), box(0.6, 0.35, 0.5, mat("#c0392b"), 0.6, 2.7, -1.4));
  g.add(box(0.5, 0.3, 0.9, mat("#ffd23f"), 0.4, 2.68, -2.4));
  // seats
  for (let i = 0; i < 4; i++) g.add(box(2.0, 0.12, 0.35, mat("#8a5a2b"), 0, 1.45, 1.0 - i * 0.95));
  [-0.65, 0.65].forEach((x) => g.add(box(0.35, 0.2, 0.05, c.light, x, 1.0, 3.11, false), box(0.25, 0.2, 0.05, c.tail, x * 1.3, 1.0, -2.92, false)));
  return { group: g, mount: new THREE.Vector3(0, 2.95, -0.2), wheels: [[1.0, 2.2], [-1.0, 2.2], [1.0, -1.9], [-1.0, -1.9]], wheelR: 0.55, length: 6.2 };
}

function bodyDN(c: Palette): BodyResult {
  // low neon wedge hypercar
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0.25);
  shape.lineTo(2.2, 0.25);
  shape.lineTo(2.25, 0.45);
  shape.lineTo(0.6, 0.85);
  shape.lineTo(-0.6, 1.05);
  shape.lineTo(-2.1, 0.95);
  shape.lineTo(-2.1, 0.25);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  geo.translate(0, 0, -0.95);
  geo.rotateY(-Math.PI / 2);
  g.add(mesh(geo, c.main));
  const neon = mat(c.accent.color.getStyle(), { emissive: c.accent.color.getStyle(), emissiveIntensity: 2 });
  [-1.0, 1.0].forEach((x) => g.add(box(0.05, 0.05, 4.2, neon, x, 0.32, 0, false)));
  g.add(box(1.9, 0.05, 0.05, neon, 0, 0.5, 2.22, false));
  const canopy = mesh(new THREE.SphereGeometry(0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat("#1a1a2e", { metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 }));
  canopy.scale.set(0.9, 0.6, 1.6);
  canopy.position.set(0, 0.95, -0.1);
  g.add(canopy);
  g.add(box(2.2, 0.06, 0.5, c.trim, 0, 1.2, -1.95));
  [-0.8, 0.8].forEach((x) => g.add(box(0.06, 0.3, 0.15, c.trim, x, 1.05, -1.9)));
  const dnTex = canvasTex(128, 64, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#5fd8ff";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DN", 64, 34);
  });
  const dnMat = mat("#ffffff", { map: dnTex, emissive: "#ffffff", emissiveMap: dnTex, emissiveIntensity: 1.2 });
  [-1, 1].forEach((side) => {
    const p = mesh(new THREE.PlaneGeometry(0.8, 0.4), dnMat, false);
    p.position.set(side * 1.02, 0.6, -0.6);
    p.rotation.y = (side * Math.PI) / 2;
    g.add(p);
  });
  [-0.6, 0.6].forEach((x) => g.add(box(0.5, 0.06, 0.05, c.light, x, 0.42, 2.27, false), box(0.7, 0.08, 0.05, c.tail, x, 0.8, -2.12, false)));
  return { group: g, mount: new THREE.Vector3(0, 1.25, -0.2), wheels: [[1.0, 1.35], [-1.0, 1.35], [1.0, -1.35], [-1.0, -1.35]], wheelR: 0.42, length: 4.4 };
}

const BODIES: Record<CarId, (c: Palette) => BodyResult> = {
  rally7: bodyRally7,
  cuatro: bodyCuatro,
  willys: bodyWillys,
  taxi: bodyTaxi,
  chiva: bodyChiva,
  dn: bodyDN,
};

/* ---------------- drivers ---------------- */

interface DriverResult {
  group: THREE.Group;
  wobble: THREE.Object3D[];
}

function eyes(g: THREE.Group, y: number, z: number, spread = 0.14, r = 0.05) {
  const eye = mat("#111111", { roughness: 0.3 });
  [-spread, spread].forEach((x) => {
    const e = mesh(new THREE.SphereGeometry(r, 8, 6), eye, false);
    e.position.set(x, y, z);
    g.add(e);
  });
}

function goggles(g: THREE.Group, y: number, z: number) {
  const band = mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 24), mat("#0E1B24"), false);
  band.position.y = y;
  band.rotation.x = Math.PI / 2 - 0.15;
  g.add(band);
  const glass = mat("#24A0CE", { roughness: 0.2, metalness: 0.5, emissive: "#0c4a66", emissiveIntensity: 0.4 });
  [-0.14, 0.14].forEach((x) => {
    const gl = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), glass, false);
    gl.rotation.x = Math.PI / 2;
    gl.position.set(x, y, z);
    g.add(gl);
  });
}

function ear(g: THREE.Group, x: number, y: number, len: number, w: number, m: THREE.Material, inner?: THREE.Material) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, -0.02);
  const e = mesh(new THREE.CapsuleGeometry(w, len, 4, 10), m);
  e.position.y = len / 2 + w;
  e.scale.set(1, 1, 0.55);
  pivot.add(e);
  if (inner) {
    const i = mesh(new THREE.CapsuleGeometry(w * 0.55, len * 0.8, 4, 8), inner, false);
    i.position.set(0, len / 2 + w, w * 0.45);
    i.scale.set(1, 1, 0.4);
    pivot.add(i);
  }
  pivot.rotation.z = -Math.sign(x) * 0.15;
  g.add(pivot);
  return pivot;
}

function headBase(color: string, r = 0.36) {
  const g = new THREE.Group();
  const h = mesh(new THREE.SphereGeometry(r, 18, 14), mat(color, { roughness: 0.85 }));
  h.scale.set(1, 0.92, 1);
  h.position.y = 0.3;
  g.add(h);
  return g;
}

function scarf(g: THREE.Group, color = "#ff5a5f") {
  const s = mesh(new THREE.TorusGeometry(0.27, 0.07, 6, 18), mat(color), false);
  s.rotation.x = Math.PI / 2;
  s.position.y = 0.02;
  g.add(s);
}

function driverPixel(): DriverResult {
  const g = headBase("#fbfbfb");
  const pink = mat("#ffb3c4");
  const fur = mat("#fbfbfb", { roughness: 0.9 });
  [0.16, -0.16].forEach((x) => {
    const ch = mesh(new THREE.SphereGeometry(0.14, 10, 8), fur);
    ch.position.set(x, 0.2, 0.26);
    g.add(ch);
  });
  const nose = mesh(new THREE.SphereGeometry(0.06, 8, 6), pink, false);
  nose.position.set(0, 0.27, 0.36);
  g.add(nose);
  goggles(g, 0.42, 0.3);
  eyes(g, 0.33, 0.33);
  const w = [ear(g, 0.14, 0.56, 0.55, 0.08, fur, pink), ear(g, -0.14, 0.56, 0.55, 0.08, fur, pink)];
  scarf(g);
  return { group: g, wobble: w };
}

function driverChiguiro(): DriverResult {
  // capybara: brown, square-ish head, big snout, tiny ears
  const g = new THREE.Group();
  const brown = mat("#8a5a3b", { roughness: 0.95 });
  const head = mesh(new THREE.BoxGeometry(0.55, 0.5, 0.65), brown);
  head.position.y = 0.32;
  g.add(head);
  const snout = mesh(new THREE.BoxGeometry(0.45, 0.32, 0.25), mat("#6f4730"));
  snout.position.set(0, 0.25, 0.4);
  g.add(snout);
  const nose = mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05), mat("#2a1a10"), false);
  nose.position.set(0, 0.33, 0.53);
  g.add(nose);
  eyes(g, 0.45, 0.25, 0.18, 0.045);
  const w = [ear(g, 0.2, 0.55, 0.05, 0.06, brown), ear(g, -0.2, 0.55, 0.05, 0.06, brown)];
  scarf(g, "#7bd389");
  return { group: g, wobble: w };
}

function driverTucan(): DriverResult {
  const g = headBase("#111111", 0.33);
  const white = mesh(new THREE.SphereGeometry(0.22, 12, 10), mat("#fff8e0"));
  white.position.set(0, 0.12, 0.18);
  g.add(white);
  const beak = mesh(new THREE.ConeGeometry(0.17, 0.75, 12), mat("#ff9f1a", { emissive: "#663300", emissiveIntensity: 0.2 }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.32, 0.62);
  beak.scale.set(1, 1, 0.8);
  g.add(beak);
  const tip = mesh(new THREE.ConeGeometry(0.06, 0.15, 8), mat("#c0262d"), false);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, 0.32, 1.02);
  g.add(tip);
  [-0.17, 0.17].forEach((x) => {
    const ring = mesh(new THREE.SphereGeometry(0.08, 10, 8), mat("#5fd8ff"), false);
    ring.position.set(x, 0.42, 0.22);
    g.add(ring);
  });
  eyes(g, 0.43, 0.29, 0.17, 0.04);
  const crest = new THREE.Group();
  crest.position.set(0, 0.6, -0.05);
  const fe = mesh(new THREE.ConeGeometry(0.08, 0.3, 6), mat("#111"));
  fe.position.y = 0.12;
  crest.add(fe);
  g.add(crest);
  return { group: g, wobble: [crest] };
}

function driverRana(): DriverResult {
  const g = new THREE.Group();
  const gold = mat("#ffcc00", { emissive: "#996600", emissiveIntensity: 0.35, roughness: 0.3 });
  const head = mesh(new THREE.SphereGeometry(0.38, 16, 12), gold);
  head.scale.set(1.15, 0.75, 1);
  head.position.y = 0.25;
  g.add(head);
  const eyeBalls: THREE.Object3D[] = [];
  [-0.2, 0.2].forEach((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.45, 0.1);
    const ball = mesh(new THREE.SphereGeometry(0.13, 12, 10), gold);
    const pupil = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat("#111"), false);
    pupil.position.set(0, 0.02, 0.1);
    pivot.add(ball, pupil);
    g.add(pivot);
    eyeBalls.push(pivot);
  });
  const mouth = mesh(new THREE.TorusGeometry(0.22, 0.015, 4, 20, Math.PI), mat("#111"), false);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 0.22, 0.36);
  g.add(mouth);
  [[-0.25, 0.1], [0.2, 0.15], [0, 0.42]].forEach(([x, y]) => {
    const spot = mesh(new THREE.SphereGeometry(0.05, 6, 4), mat("#111"), false);
    spot.position.set(x, y + 0.2, -0.25);
    g.add(spot);
  });
  return { group: g, wobble: eyeBalls };
}

function driverOso(): DriverResult {
  const g = headBase("#1c1c1c", 0.37);
  const cream = mat("#f2dcb0");
  [-0.14, 0.14].forEach((x) => {
    const ring = mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 16), cream, false);
    ring.position.set(x, 0.4, 0.31);
    g.add(ring);
  });
  const muzzle = mesh(new THREE.SphereGeometry(0.16, 12, 10), cream);
  muzzle.position.set(0, 0.22, 0.3);
  muzzle.scale.set(1, 0.8, 1);
  g.add(muzzle);
  const nose = mesh(new THREE.SphereGeometry(0.06, 8, 6), mat("#000"), false);
  nose.position.set(0, 0.27, 0.45);
  g.add(nose);
  eyes(g, 0.4, 0.34, 0.14, 0.04);
  const black = mat("#1c1c1c");
  const w = [0.25, -0.25].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.58, 0);
    const e = mesh(new THREE.SphereGeometry(0.1, 10, 8), black);
    pivot.add(e);
    g.add(pivot);
    return pivot;
  });
  scarf(g, "#ffd23f");
  return { group: g, wobble: w };
}

function driverJaguar(): DriverResult {
  const g = headBase("#e8a23a", 0.36);
  const spot = mat("#3a2410");
  for (let i = 0; i < 10; i++) {
    const s = mesh(new THREE.SphereGeometry(0.045, 6, 4), spot, false);
    const a = i * 0.9;
    s.position.set(Math.cos(a) * 0.3, 0.42 + Math.sin(i) * 0.12, Math.sin(a) * 0.22 - 0.05);
    g.add(s);
  }
  const muzzle = mesh(new THREE.SphereGeometry(0.15, 12, 10), mat("#fff1d6"));
  muzzle.position.set(0, 0.22, 0.3);
  g.add(muzzle);
  const nose = mesh(new THREE.ConeGeometry(0.05, 0.06, 3), mat("#c06070"), false);
  nose.rotation.x = Math.PI;
  nose.position.set(0, 0.3, 0.44);
  g.add(nose);
  eyes(g, 0.4, 0.31, 0.14, 0.05);
  const orange = mat("#e8a23a");
  const w = [0.22, -0.22].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.58, 0);
    const e = mesh(new THREE.ConeGeometry(0.1, 0.2, 4), orange);
    e.position.y = 0.08;
    pivot.add(e);
    g.add(pivot);
    return pivot;
  });
  return { group: g, wobble: w };
}

function driverCondor(): DriverResult {
  const g = new THREE.Group();
  const head = mesh(new THREE.SphereGeometry(0.28, 14, 12), mat("#5a4a4a", { roughness: 0.9 }));
  head.position.y = 0.42;
  g.add(head);
  const ruff = mesh(new THREE.TorusGeometry(0.3, 0.12, 8, 18), mat("#ffffff", { roughness: 1 }));
  ruff.rotation.x = Math.PI / 2;
  ruff.position.y = 0.12;
  g.add(ruff);
  const body = mesh(new THREE.SphereGeometry(0.3, 12, 10), mat("#111"));
  body.position.y = -0.05;
  g.add(body);
  const beak = mesh(new THREE.ConeGeometry(0.07, 0.28, 8), mat("#d8c8a0"));
  beak.rotation.x = Math.PI / 2 + 0.4;
  beak.position.set(0, 0.36, 0.32);
  g.add(beak);
  eyes(g, 0.48, 0.22, 0.12, 0.04);
  const comb = new THREE.Group();
  comb.position.set(0, 0.68, 0.05);
  const c1 = mesh(new THREE.BoxGeometry(0.05, 0.14, 0.25), mat("#7a2a2a"));
  c1.position.y = 0.05;
  comb.add(c1);
  g.add(comb);
  // little wings
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.3, 0.0, -0.05);
    const w = mesh(new THREE.BoxGeometry(0.55, 0.06, 0.3), mat("#111"));
    w.position.x = s * 0.27;
    pivot.add(w);
    g.add(pivot);
    return pivot;
  });
  return { group: g, wobble: [comb, ...wings] };
}

function driverTiti(): DriverResult {
  const g = new THREE.Group();
  const face = mesh(new THREE.SphereGeometry(0.27, 14, 12), mat("#2a2420"));
  face.position.y = 0.3;
  g.add(face);
  const body = mesh(new THREE.SphereGeometry(0.28, 12, 10), mat("#7a5a3a"));
  body.position.y = 0.0;
  g.add(body);
  eyes(g, 0.36, 0.23, 0.1, 0.045);
  const crest = new THREE.Group();
  crest.position.set(0, 0.5, -0.05);
  const white = mat("#ffffff", { roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const s = mesh(new THREE.ConeGeometry(0.06, 0.45, 5), white);
    s.position.set((i - 3) * 0.06, 0.18, -i * 0.02);
    s.rotation.z = (i - 3) * 0.18;
    s.rotation.x = -0.4;
    crest.add(s);
  }
  g.add(crest);
  scarf(g, "#ff9f43");
  return { group: g, wobble: [crest] };
}

function driverNexi(): DriverResult {
  const g = new THREE.Group();
  const head = mesh(new THREE.BoxGeometry(0.6, 0.5, 0.55), mat("#c8d6e0", { metalness: 0.85, roughness: 0.2 }));
  head.position.y = 0.32;
  g.add(head);
  const visor = mesh(new THREE.BoxGeometry(0.5, 0.16, 0.05), mat("#5fd8ff", { emissive: "#24c8ff", emissiveIntensity: 2 }), false);
  visor.position.set(0, 0.36, 0.28);
  g.add(visor);
  const mouth = mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), mat("#FDC6B5", { emissive: "#FDC6B5", emissiveIntensity: 1.2 }), false);
  mouth.position.set(0, 0.2, 0.28);
  g.add(mouth);
  const ant = new THREE.Group();
  ant.position.set(0, 0.57, 0);
  const stick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), mat("#888"));
  stick.position.y = 0.15;
  const ball = mesh(new THREE.SphereGeometry(0.06, 10, 8), mat("#ff4f9a", { emissive: "#ff2a85", emissiveIntensity: 2 }), false);
  ball.position.y = 0.32;
  ant.add(stick, ball);
  g.add(ant);
  return { group: g, wobble: [ant] };
}

const DRIVER_BUILDERS: Record<DriverId, () => DriverResult> = {
  pixel: driverPixel,
  chiguiro: driverChiguiro,
  tucan: driverTucan,
  rana: driverRana,
  oso: driverOso,
  jaguar: driverJaguar,
  condor: driverCondor,
  titi: driverTiti,
  nexi: driverNexi,
};

/* ---------------- assemble ---------------- */

export function buildVehicle(carId: CarId = "rally7", paintId: PaintId = "dn", driverId: DriverId = "pixel"): CarRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const c = palette(paintId);
  const b = (BODIES[carId] ?? bodyRally7)(c);
  body.add(b.group);

  const d = (DRIVER_BUILDERS[driverId] ?? driverPixel)();
  d.group.position.copy(b.mount);
  body.add(d.group);
  d.wobble.forEach((w) => (w.userData.baseX = w.rotation.x));

  // wheels
  const tyre = mat("#1b1b1f", { roughness: 0.9 });
  const rim = c.accent;
  const wheelGeo = new THREE.CylinderGeometry(b.wheelR, b.wheelR, 0.34, 16);
  const rimGeo = new THREE.CylinderGeometry(b.wheelR * 0.57, b.wheelR * 0.57, 0.36, 8);
  const wheels: THREE.Object3D[] = [];
  const frontWheels: THREE.Object3D[] = [];
  b.wheels.forEach(([x, z], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, b.wheelR, z);
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

  // nitro flames
  const flames = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({ color: "#ffb03a", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameCore = new THREE.MeshBasicMaterial({ color: "#5fd8ff", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  [-0.45, 0.45].forEach((x) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 10), flameMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(x, 0.42, -b.length / 2 - 0.7);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 8), flameCore);
    core.rotation.x = -Math.PI / 2;
    core.position.set(x, 0.42, -b.length / 2 - 0.4);
    flames.add(f, core);
  });
  flames.visible = false;
  body.add(flames);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 24, 16),
    new THREE.MeshStandardMaterial({ color: "#5fd8ff", emissive: "#24A0CE", emissiveIntensity: 0.6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  );
  shield.scale.set(0.85, 0.62, (b.length / 3.9) * 1.05);
  shield.position.y = 0.8;
  shield.visible = false;
  root.add(shield);

  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, b.length + 0.5),
    new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.25, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  blob.name = "blob";
  root.add(blob);

  return { root, body, wheels, frontWheels, wobble: d.wobble, flames, shield, length: b.length };
}
