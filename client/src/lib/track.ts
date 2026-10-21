import { GAME_CONFIG } from "./constants";

/**
 * One source of truth for the track shape. The road, car, obstacles,
 * pickups and scenery all read these functions so everything lines up.
 * "z" is distance travelled along the road (world z).
 */

export const ROAD_HALF = GAME_CONFIG.LANE_WIDTH / 2; // 4.5m
export const LANES = [-3, 0, 3] as const;

// Curves fade in over the first stretch so the start is a calm straight.
function ramp(z: number) {
  const t = Math.min(1, Math.max(0, (z - 40) / 360));
  return t * t * (3 - 2 * t);
}

export function roadX(z: number) {
  return (Math.sin(z * 0.0105) * 10 + Math.sin(z * 0.0041 + 1.3) * 16) * ramp(z);
}

export function roadY(z: number) {
  return (Math.sin(z * 0.012) * 1.8 + Math.sin(z * 0.029 + 0.7) * 0.7) * ramp(z);
}

/** Slope of the road centre line (dx/dz). */
export function roadSlope(z: number) {
  return (roadX(z + 0.5) - roadX(z - 0.5));
}

/** Curvature (d²x/dz²), used to push the car outwards in bends. */
export function roadCurvature(z: number) {
  return (roadX(z + 2) - 2 * roadX(z) + roadX(z - 2)) / 4;
}

export function roadPitch(z: number) {
  return Math.atan(roadY(z + 0.5) - roadY(z - 0.5));
}

/* ---------------- Biomes ---------------- */
export type BiomeType = "coffee_hills" | "andes_highland" | "pueblo" | "ciudad_perdida" | "comuna_13";
export const BIOME_LENGTH = 800;
export const BIOME_SEQUENCE: BiomeType[] = ["coffee_hills", "andes_highland", "pueblo", "ciudad_perdida", "comuna_13"];

export function biomeAt(z: number): BiomeType {
  const i = Math.floor(Math.max(0, z) / BIOME_LENGTH) % BIOME_SEQUENCE.length;
  return BIOME_SEQUENCE[i];
}

/** Small deterministic random generator so the world is repeatable. */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
