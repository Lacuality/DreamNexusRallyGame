/**
 * Live, per-frame race state. The 3D game loop mutates this object every
 * frame (cheap, no React re-render). The HUD gets a throttled snapshot via
 * the useRally store.
 */
export const MAX_HEARTS = 3;
export const NITRO_DURATION = 2.2; // seconds
export const INVULNERABLE_TIME = 1.6; // seconds after a hit

export interface RunState {
  // car
  z: number;
  lat: number; // lateral offset from road centre
  latVel: number;
  speed: number; // m/s
  y: number; // jump height above road
  vy: number;
  airborne: boolean;
  airTime: number;
  offroad: boolean;
  steer: number; // -1..1 smoothed, for visuals

  // health & power-ups
  hearts: number;
  maxHearts: number;
  shield: boolean;
  invulnerable: number; // seconds left
  nitro: number; // meter 0..1
  nitroTime: number; // seconds of boost left
  slowTime: number; // puddle slowdown

  // scoring
  score: number;
  jars: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;
  nearMisses: number;
  smashes: number;
  jumps: number;
  tunjos: number;
  boosts: number;
  maxSpeedKmh: number;
  nitroUses: number;
  firstHitZ: number; // -1 until the first crash
  totalAir: number;
  nextMilestone: number;

  // Rally Loco (items)
  spin: number;
  item: string | null;
  hitsLanded: number;

  // feedback
  shake: number;
  flash: number; // red screen flash on hit
  time: number;
}

export function freshRun(): RunState {
  return {
    z: 0,
    lat: 0,
    latVel: 0,
    speed: 0,
    y: 0,
    vy: 0,
    airborne: false,
    airTime: 0,
    offroad: false,
    steer: 0,
    hearts: MAX_HEARTS,
    maxHearts: MAX_HEARTS,
    shield: false,
    invulnerable: 0,
    nitro: 0.5,
    nitroTime: 0,
    slowTime: 0,
    score: 0,
    jars: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    nearMisses: 0,
    smashes: 0,
    jumps: 0,
    tunjos: 0,
    boosts: 0,
    maxSpeedKmh: 0,
    nitroUses: 0,
    firstHitZ: -1,
    totalAir: 0,
    nextMilestone: 500,
    spin: 0,
    item: null,
    hitsLanded: 0,
    shake: 0,
    flash: 0,
    time: 0,
  };
}

export const run: RunState = freshRun();

export function resetRun(hearts = MAX_HEARTS, shield = false) {
  Object.assign(run, freshRun(), { hearts, maxHearts: hearts, shield });
}

/** Score multiplier from the current combo (x1 .. x5). */
export function multiplierFor(combo: number) {
  return Math.min(5, 1 + Math.floor(combo / 5));
}
