/**
 * Tiny particle-burst queue. Game code calls `burst(...)`; the <Bursts />
 * component in the scene turns each request into flying confetti/sparks.
 */
export interface BurstRequest {
  x: number;
  y: number;
  z: number;
  colors: string[];
  count: number;
  speed: number;
  up: number; // extra upward kick
  size: number;
}

export const burstQueue: BurstRequest[] = [];

export function burst(x: number, y: number, z: number, colors: string[], count = 14, speed = 6, up = 5, size = 0.18) {
  if (burstQueue.length > 40) return;
  burstQueue.push({ x, y, z, colors, count, speed, up, size });
}

export const FX = {
  jar: ["#ffd23f", "#ffb02e", "#fff3b0"],
  smash: ["#ff9f43", "#ffffff", "#c8772e"],
  hit: ["#ff5a5f", "#ffd23f", "#ffffff"],
  box: ["#FCD116", "#003893", "#CE1126"],
  nitro: ["#5fd8ff", "#ffffff", "#ff9f43"],
};
