import { GAME_CONFIG } from "./constants";

/**
 * One source of truth for the track shape. The road, car, obstacles,
 * pickups and scenery all read these functions so everything lines up.
 * "z" is distance travelled along the road (world z).
 *
 * Two kinds of track:
 *  - endless: the long rally road through all regions (or one region locked, for story stages)
 *  - circuit: a closed loop of `length` metres raced for N laps (the shape repeats every lap)
 */

export const ROAD_HALF = GAME_CONFIG.LANE_WIDTH / 2; // 4.5m
export const LANES = [-3, 0, 3] as const;

/* ---------------- Biomes ---------------- */
export type BiomeType =
  | "coffee_hills"
  | "andes_highland"
  | "pueblo"
  | "ciudad_perdida"
  | "comuna_13"
  | "tatacoa"
  | "cartagena"
  | "cali";
export const BIOME_LENGTH = 800;
export const BIOME_SEQUENCE: BiomeType[] = [
  "coffee_hills",
  "andes_highland",
  "pueblo",
  "ciudad_perdida",
  "comuna_13",
  "tatacoa",
  "cali",
  "cartagena",
];

/* ---------------- Track definition ---------------- */
/**
 * A circuit is a real closed loop: control points [x, z, y] in metres (x = left,
 * z = forward at the start line, y = height). A smooth curve (Catmull-Rom) is
 * threaded through them and the lap length is measured from that curve.
 */
export interface CircuitShape {
  loop: [number, number, number][];
}

export type TrackDef =
  | { kind: "endless"; lockedBiome?: BiomeType }
  | { kind: "circuit"; biome: BiomeType; shape: CircuitShape; laps: number };

/** The loop sampled every metre: position, heading and curvature along the lap. */
export interface LoopData {
  length: number;
  xs: Float32Array;
  ys: Float32Array;
  zs: Float32Array;
  hs: Float32Array; // heading (radians, 0 = +z, + = turning left/+x)
  ks: Float32Array; // signed curvature (1/m), + = bends left
  ps: Float32Array; // pitch (radians)
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
}

const loopCache = new WeakMap<CircuitShape, LoopData>();

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function loopData(shape: CircuitShape): LoopData {
  const hit = loopCache.get(shape);
  if (hit) return hit;
  const P = shape.loop;
  const n = P.length;
  // dense samples along the spline
  const SUB = 24;
  const raw: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], d = P[(i + 2) % n];
    for (let j = 0; j < SUB; j++) {
      const t = j / SUB;
      raw.push([catmull(a[0], b[0], c[0], d[0], t), catmull(a[1], b[1], c[1], d[1], t), catmull(a[2], b[2], c[2], d[2], t)]);
    }
  }
  // cumulative arc length (closed)
  const cum: number[] = [0];
  for (let i = 1; i <= raw.length; i++) {
    const p = raw[i - 1], q = raw[i % raw.length];
    cum.push(cum[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const length = Math.round(cum[raw.length]);
  const N = length;
  const xs = new Float32Array(N), ys = new Float32Array(N), zs = new Float32Array(N);
  const hs = new Float32Array(N), ks = new Float32Array(N), ps = new Float32Array(N);
  let seg = 0;
  for (let i = 0; i < N; i++) {
    const s = (i / N) * cum[raw.length];
    while (seg < raw.length - 1 && cum[seg + 1] < s) seg++;
    const t = (s - cum[seg]) / Math.max(1e-6, cum[seg + 1] - cum[seg]);
    const p = raw[seg], q = raw[(seg + 1) % raw.length];
    xs[i] = p[0] + (q[0] - p[0]) * t;
    zs[i] = p[1] + (q[1] - p[1]) * t;
    ys[i] = p[2] + (q[2] - p[2]) * t;
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, k = (i - 1 + N) % N;
    const dx = xs[j] - xs[k], dz = zs[j] - zs[k];
    hs[i] = Math.atan2(dx, dz);
    ps[i] = Math.atan2(ys[j] - ys[k], Math.hypot(dx, dz));
    minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]);
    minZ = Math.min(minZ, zs[i]); maxZ = Math.max(maxZ, zs[i]);
    minY = Math.min(minY, ys[i]);
  }
  // curvature = change of heading per metre, smoothed over ~8 m
  const rawK = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 2) % N, k = (i - 2 + N) % N;
    let d = hs[j] - hs[k];
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    rawK[i] = d / 4;
  }
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let o = -4; o <= 4; o++) sum += rawK[(i + o + N) % N];
    ks[i] = sum / 9;
  }
  const data: LoopData = { length, xs, ys, zs, hs, ks, ps, minX, maxX, minZ, maxZ, minY };
  loopCache.set(shape, data);
  return data;
}

let track: TrackDef = { kind: "endless" };
let loop: LoopData | null = null;

export function setTrack(t: TrackDef) {
  track = t;
  loop = t.kind === "circuit" ? loopData(t.shape) : null;
}
export function getTrack() {
  return track;
}
/** The sampled circuit loop (null on the endless road). */
export function currentLoop(): LoopData | null {
  return loop;
}
export function isCircuit() {
  return track.kind === "circuit";
}
export function lapLength() {
  return loop ? loop.length : 0;
}

// Curves fade in over the first stretch so the start is a calm straight.
function ramp(z: number) {
  const t = Math.min(1, Math.max(0, (z - 40) / 360));
  return t * t * (3 - 2 * t);
}

/** Endless road: centre line x and height as functions of distance. */
export function roadX(z: number) {
  if (loop) return frameAt(z).x;
  return (Math.sin(z * 0.0105) * 10 + Math.sin(z * 0.0041 + 1.3) * 16) * ramp(z);
}

export function roadY(z: number) {
  if (loop) return frameAt(z).y;
  return (Math.sin(z * 0.012) * 1.8 + Math.sin(z * 0.029 + 0.7) * 0.7) * ramp(z);
}

/* ---------------- Track frame: distance along the road -> world ---------------- */
export interface Frame {
  x: number;
  y: number;
  z: number;
  heading: number; // radians around Y, 0 = +z
  nx: number; // "left" direction in the XZ plane
  nz: number;
}
const frame: Frame = { x: 0, y: 0, z: 0, heading: 0, nx: 1, nz: 0 };

/** Centre of the road at distance `z` (shared object: copy what you need). */
export function frameAt(z: number): Frame {
  if (loop) {
    const L = loop.length;
    let s = z % L;
    if (s < 0) s += L;
    const i = Math.floor(s);
    const t = s - i;
    const j = (i + 1) % L;
    frame.x = loop.xs[i] + (loop.xs[j] - loop.xs[i]) * t;
    frame.y = loop.ys[i] + (loop.ys[j] - loop.ys[i]) * t;
    frame.z = loop.zs[i] + (loop.zs[j] - loop.zs[i]) * t;
    // headings can wrap at ±π: blend via the unit tangent
    const h0 = loop.hs[i], h1 = loop.hs[j];
    const sx = Math.sin(h0) * (1 - t) + Math.sin(h1) * t;
    const cz = Math.cos(h0) * (1 - t) + Math.cos(h1) * t;
    frame.heading = Math.atan2(sx, cz);
    const len = Math.hypot(sx, cz) || 1;
    // left normal of the tangent (sx, cz)
    frame.nx = cz / len;
    frame.nz = -sx / len;
    return frame;
  }
  frame.x = roadX(z);
  frame.y = roadY(z);
  frame.z = z;
  frame.heading = Math.atan(roadX(z + 0.5) - roadX(z - 0.5));
  frame.nx = 1;
  frame.nz = 0;
  return frame;
}

/** World position of a point `lat` metres left of the road centre and `h` above it. */
export function toWorld<T extends { x: number; y: number; z: number }>(z: number, lat: number, h: number, out: T): T {
  const f = frameAt(z);
  out.x = f.x + f.nx * lat;
  out.y = f.y + h;
  out.z = f.z + f.nz * lat;
  return out;
}

/** Which way the road points at `z` (rotation around Y for cars/scenery). */
export function headingAt(z: number) {
  return frameAt(z).heading;
}

/** Slope of the road centre line (dx/dz) — endless road only. */
export function roadSlope(z: number) {
  return roadX(z + 0.5) - roadX(z - 0.5);
}

/** Curvature (1/m, + = bends left), used to push the car outwards in bends. */
export function roadCurvature(z: number) {
  if (loop) {
    const L = loop.length;
    let s = Math.floor(z % L);
    if (s < 0) s += L;
    return loop.ks[s];
  }
  return (roadX(z + 2) - 2 * roadX(z) + roadX(z - 2)) / 4;
}

/** Sharpest bend between `from` and `to` metres ahead (signed curvature, + = bends left). */
export function bendAhead(z: number, from: number, to: number) {
  let best = 0;
  for (let d = from; d <= to; d += 4) {
    const c = roadCurvature(z + d);
    if (Math.abs(c) > Math.abs(best)) best = c;
  }
  return best;
}

/** Fastest speed (m/s) a bend of curvature `c` can be held at without sliding wide. */
export function cornerSpeed(c: number) {
  return Math.sqrt(9 / (0.35 * Math.max(1e-5, Math.abs(c))));
}

export function roadPitch(z: number) {
  if (loop) {
    const L = loop.length;
    let s = Math.floor(z % L);
    if (s < 0) s += L;
    return loop.ps[s];
  }
  return Math.atan(roadY(z + 0.5) - roadY(z - 0.5));
}

/** Point on the circuit outline fitted into a 0..1 box (for minimaps). u = lap fraction. */
export function outlinePoint(shape: CircuitShape, u: number): [number, number] {
  const d = loopData(shape);
  const pad = 0.08;
  const span = Math.max(d.maxX - d.minX, d.maxZ - d.minZ) || 1;
  const scale = (1 - pad * 2) / span;
  const cx = (d.minX + d.maxX) / 2, cz = (d.minZ + d.maxZ) / 2;
  let s = Math.floor((((u % 1) + 1) % 1) * d.length) % d.length;
  // screen: driving "up" at the start line, left turns go left
  return [0.5 - (d.xs[s] - cx) * scale, 0.5 - (d.zs[s] - cz) * scale];
}

export function biomeAt(z: number): BiomeType {
  if (track.kind === "circuit") return track.biome;
  if (track.lockedBiome) return track.lockedBiome;
  const i = Math.floor(Math.max(0, z) / BIOME_LENGTH) % BIOME_SEQUENCE.length;
  return BIOME_SEQUENCE[i];
}

/** Small deterministic random generator so the world is repeatable. */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
