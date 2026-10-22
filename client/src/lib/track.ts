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
export interface CircuitShape {
  length: number; // metres per lap
  // [amplitude, whole waves per lap, phase] for the sideways curve and for hills
  curves: [number, number, number][];
  hills: [number, number, number][];
  // real corners: [position along the lap 0..1, sideways size in metres (+ = left), length in metres].
  // Each one is a smooth bump, so you get a turn-in, a tight apex and an exit.
  corners?: [number, number, number][];
}

export type TrackDef =
  | { kind: "endless"; lockedBiome?: BiomeType }
  | { kind: "circuit"; biome: BiomeType; shape: CircuitShape; laps: number };

let track: TrackDef = { kind: "endless" };

export function setTrack(t: TrackDef) {
  track = t;
}
export function getTrack() {
  return track;
}
export function isCircuit() {
  return track.kind === "circuit";
}
export function lapLength() {
  return track.kind === "circuit" ? track.shape.length : 0;
}

// Curves fade in over the first stretch so the start is a calm straight.
function ramp(z: number) {
  const t = Math.min(1, Math.max(0, (z - 40) / 360));
  return t * t * (3 - 2 * t);
}

function periodic(z: number, parts: [number, number, number][], L: number) {
  let v = 0;
  for (const [a, n, p] of parts) v += a * Math.sin((z / L) * Math.PI * 2 * n + p);
  return v;
}

function cornerSum(z: number, corners: [number, number, number][] | undefined, L: number) {
  if (!corners) return 0;
  let v = 0;
  const zz = ((z % L) + L) % L;
  for (const [at, amp, w] of corners) {
    let d = zz - at * L;
    if (d > L / 2) d -= L;
    else if (d < -L / 2) d += L;
    const k = d / w;
    if (k > -4 && k < 4) v += amp * Math.exp(-k * k);
  }
  return v;
}

export function roadX(z: number) {
  if (track.kind === "circuit")
    return periodic(z, track.shape.curves, track.shape.length) + cornerSum(z, track.shape.corners, track.shape.length);
  return (Math.sin(z * 0.0105) * 10 + Math.sin(z * 0.0041 + 1.3) * 16) * ramp(z);
}

export function roadY(z: number) {
  if (track.kind === "circuit") return periodic(z, track.shape.hills, track.shape.length);
  return (Math.sin(z * 0.012) * 1.8 + Math.sin(z * 0.029 + 0.7) * 0.7) * ramp(z);
}

/** Slope of the road centre line (dx/dz). */
export function roadSlope(z: number) {
  return roadX(z + 0.5) - roadX(z - 0.5);
}

/** Curvature (d²x/dz²), used to push the car outwards in bends. */
export function roadCurvature(z: number) {
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
  return Math.atan(roadY(z + 0.5) - roadY(z - 0.5));
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
