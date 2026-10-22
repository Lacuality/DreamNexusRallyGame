import { run } from "./run";
import { frameAt, toWorld, isCircuit, ROAD_HALF, roadY, currentLoop } from "../track";

/**
 * Free driving (Mario Kart style). The car has a real world position and
 * heading; steering turns the car, nothing pulls it round the bends. Where
 * the car is *along* the track (run.z) and how far from the centre line
 * (run.lat) are worked out by projecting the car onto the road each frame.
 */

/** Put the car on the road at distance z, `lat` metres left of centre, facing along it. */
export function placeOnTrack(z: number, lat: number) {
  const f = frameAt(z);
  run.wx = f.x + f.nx * lat;
  run.wz = f.z + f.nz * lat;
  run.heading = f.heading;
  run.z = z;
  run.lat = lat;
  run.latVel = 0;
}

const tmp = { x: 0, y: 0, z: 0 };

/** Find the closest point of the road near the current z: updates run.z and run.lat. */
export function projectToTrack() {
  const loop = currentLoop();
  const L = loop ? loop.length : 0;
  let bestZ = run.z;
  let bestD = Infinity;
  // coarse search around where we were (2 m), then refine (0.25 m)
  const search = (from: number, to: number, step: number) => {
    for (let z = from; z <= to; z += step) {
      const f = frameAt(z);
      const dx = run.wx - f.x, dz = run.wz - f.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        bestZ = z;
      }
    }
  };
  const win = 14 + run.speed * 0.3;
  search(run.z - win * 0.5, run.z + win, 2);
  search(bestZ - 2, bestZ + 2, 0.25);
  const f = frameAt(bestZ);
  const lat = (run.wx - f.x) * f.nx + (run.wz - f.z) * f.nz;
  // progress never runs backwards past the start of the lap window
  if (loop && bestZ < 0) bestZ += 0;
  void L;
  run.z = bestZ;
  run.lat = lat;
}

/** Push the car sideways (bumps from rivals) in world space. */
export function shoveLat(d: number) {
  const f = frameAt(run.z);
  run.wx += f.nx * d;
  run.wz += f.nz * d;
  run.lat += d;
}

/** Height of the ground under the car: road height, blending down to the flat infield on circuits. */
export function groundHeight() {
  const loop = currentLoop();
  const y = roadY(run.z);
  if (!loop) return y;
  const a = Math.abs(run.lat);
  if (a < 20) return y;
  const g = loop.minY - 0.45;
  const t = Math.min(1, (a - 20) / 14);
  return y + (g - y) * t;
}

/** Where the car is: asphalt, gravel/shoulder, grass, or lost. */
export function surface(): "road" | "shoulder" | "grass" | "lost" {
  const a = Math.abs(run.lat);
  if (a <= ROAD_HALF + 0.2) return "road";
  if (!isCircuit()) return a > ROAD_HALF + 3.2 ? "lost" : "shoulder";
  if (a <= ROAD_HALF + 3.9) return "shoulder";
  if (a <= 40) return "grass";
  return "lost";
}

export { toWorld, tmp as physTmp };
