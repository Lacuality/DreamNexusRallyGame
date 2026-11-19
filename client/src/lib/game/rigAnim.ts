import * as THREE from "three";
import type { CarRig } from "./vehicles";

/**
 * Brings a kart and its driver to life. Shared by the player's car and the rivals:
 * you describe what the car is doing and this poses the body, wheels, driver and hands.
 */
export interface RigPose {
  speed: number; // m/s
  steer: number; // -1..1
  pitch: number; // slope of the road under the car
  air: boolean;
  vy: number; // vertical speed while in the air
  hopY: number; // extra height (drift hop)
  offroad: boolean;
  nitro: boolean;
  drift: number; // -1..1: sliding left / right
  dizzy: boolean; // spinning out after a hit
  star: boolean; // powered up
  cheer: number; // seconds of celebration left
  throwing: number; // seconds left of the throwing gesture (0.35 -> 0)
}

export const THROW_TIME = 0.35;

const lerp = THREE.MathUtils.lerp;

/** Returns true on the frame the car lands from a jump. */
export function animateRig(rig: CarRig, p: RigPose, t: number, dt: number): boolean {
  const a = rig.anim;
  const k = (rate: number) => Math.min(1, dt * rate);
  const sp = Math.min(1, p.speed / 20);

  // --- feel the forces
  const accel = (p.speed - a.prevSpeed) / Math.max(dt, 1e-3);
  a.prevSpeed = p.speed;
  const wantPitch = THREE.MathUtils.clamp(-accel * 0.006, -0.1, 0.08) - (p.nitro ? 0.09 : 0);
  a.pitch += (wantPitch - a.pitch) * k(6);
  a.steer += (p.steer - a.steer) * k(9);
  a.drift += (p.drift - a.drift) * k(8);

  // --- squash and stretch: landing, getting hit, and the kick of a boost
  const landed = a.wasAir && !p.air;
  if (landed) a.squash = 1;
  a.wasAir = p.air;
  if (p.dizzy && !a.wasDizzy) a.squash = 1;
  a.wasDizzy = p.dizzy;
  if (p.nitro && !a.wasNitro) a.kick = 1;
  a.wasNitro = p.nitro;
  a.squash = Math.max(0, a.squash - dt * 4);
  a.kick = Math.max(0, a.kick - dt * 2.2);
  const sq = Math.sin(a.squash * Math.PI) * 0.2;
  const st = Math.sin(a.kick * Math.PI) * 0.16 + (p.nitro ? 0.04 : 0);
  const pulse = p.star ? Math.sin(t * 18) * 0.05 : 0;
  rig.body.scale.set(1 + sq * 0.5 - st * 0.45 + pulse, 1 - sq + pulse, 1 + sq * 0.3 + st + pulse);

  // --- body: roll out of corners, tip into a drift, shake at idle, bounce on rough ground
  rig.body.rotation.x = -p.pitch + (p.air ? -p.vy * 0.025 : a.pitch);
  rig.body.rotation.z = lerp(rig.body.rotation.z, a.steer * 0.07 - a.drift * 0.13, k(8));
  const idle = (1 - Math.min(1, p.speed / 6)) * Math.sin(t * 46 + a.seed) * 0.012; // the engine ticking over on the grid
  const bounce = p.air ? 0 : Math.sin(t * 22 + a.seed) * (p.offroad ? 0.06 : 0.012) * sp;
  const driftBob = Math.abs(a.drift) * Math.abs(Math.sin(t * 16)) * 0.035;
  rig.body.position.y = bounce + idle + driftBob + p.hopY;

  const roll = (p.speed * dt) / 0.42;
  for (const w of rig.wheels) w.rotation.x += roll;
  for (const w of rig.frontWheels) w.rotation.y = a.steer * 0.4;

  // --- ears, crests, antennas stream back with speed
  const flow = Math.min(1, p.speed / 55);
  rig.wobble.forEach((w, i) => {
    const flop = Math.sin(t * 9 + i * 1.7 + a.seed) * 0.08 * (p.offroad ? 2.5 : 1);
    w.rotation.x = (w.userData.baseX ?? 0) - 0.25 - flow * 0.9 + flop + (p.cheer > 0 ? Math.sin(t * 20 + i) * 0.3 : 0);
  });

  // --- the driver: leans into corners, looks where they're going, gets thrown about
  const d = rig.driver;
  const cheer = (a.cheer = lerp(a.cheer, p.cheer > 0 ? 1 : 0, k(10)));
  const dizzy = (a.dizzy = lerp(a.dizzy, p.dizzy ? 1 : 0, k(p.dizzy ? 14 : 4)));
  d.rotation.z = -a.steer * 0.3 - a.drift * 0.18 + dizzy * Math.sin(t * 13) * 0.35;
  d.rotation.y = a.steer * 0.45 + dizzy * Math.sin(t * 9) * 0.6;
  d.rotation.x = THREE.MathUtils.clamp(a.pitch * -2.2, -0.25, 0.3) + (p.nitro ? -0.22 : 0) + dizzy * Math.cos(t * 11) * 0.2;
  d.position.y = a.driverY + Math.abs(Math.sin(t * 11 + a.seed)) * 0.16 * cheer + Math.sin(t * 22 + a.seed) * 0.012 * sp;
  const dsq = 1 + Math.sin(t * 22 + a.seed) * 0.05 * cheer;
  d.scale.set(1 / dsq, dsq, 1 / dsq);

  rig.stars.visible = dizzy > 0.3;
  if (rig.stars.visible) rig.stars.rotation.y = t * 7;

  // --- hands: on the wheel, in the air when celebrating, swinging when throwing
  const th = p.throwing > 0 ? Math.sin((1 - p.throwing / THROW_TIME) * Math.PI) : 0;
  rig.hands.forEach((h, i) => {
    const side = i === 0 ? 1 : -1;
    const b = h.userData.base as THREE.Vector3;
    const wave = Math.sin(t * 14 + i * 1.3 + a.seed);
    let x = b.x, y = b.y + side * a.steer * 0.09, z = b.z;
    // hang on tight in a drift / flail when dizzy
    y += dizzy * (0.35 + wave * 0.15);
    x += dizzy * side * 0.15;
    // celebrate: both fists pumping
    x = lerp(x, side * (0.5 + wave * 0.06), cheer);
    y = lerp(y, b.y + 0.72 + wave * 0.12, cheer);
    z = lerp(z, 0.05, cheer);
    // throw with the right hand
    if (i === 1 && th > 0) {
      y += th * 0.75;
      z += th * 0.35;
    }
    h.position.set(x, y, z);
  });

  return landed;
}
