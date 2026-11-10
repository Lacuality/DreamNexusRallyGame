/**
 * Live, per-frame race state. The 3D game loop mutates this object every
 * frame (cheap, no React re-render). The HUD gets a throttled snapshot via
 * the useRally store.
 */
export const MAX_HEARTS = 3;

/** Endless rally gear: 0 at the start, +1 every km, up to 7. */
export function speedGear(z: number) {
  return Math.max(0, Math.min(7, Math.floor(z / 1000)));
}

export const NITRO_DURATION = 2.2; // seconds
export const INVULNERABLE_TIME = 1.6; // seconds after a hit

export interface RunState {
  // car (world position + heading: the car drives freely, see physics.ts)
  wx: number;
  wz: number;
  heading: number; // radians around Y, 0 = +z (the road's direction under the car)
  rel: number; // how far the car is turned relative to the road (+ = left), radians
  z: number; // progress along the track (projected)
  lat: number; // lateral offset from road centre (projected)
  busted: number; // seconds left stopped by the police
  wanted: boolean; // ran a red light: the police come now
  hop: number; // seconds left of the little hop at the start of a drift
  // --- kart racing mechanics ---
  coins: number; // jars carried in a race (0..10): each one adds top speed, a hit scatters three
  draft: number; // slipstream charge 0..1 (tucked in behind a rival)
  trick: number; // seconds left of the air-trick spin (visual)
  tricked: boolean; // did a trick on this jump: boost on landing
  star: number; // seconds of Panela Power left (invincible + fast)
  bullet: number; // seconds of Chiva Express left (autopilot rocket)
  itemCount: number; // uses left of the held item (triple aguacate)
  hitStop: number; // real seconds of freeze-frame left after a big hit
  timeScale: number; // 1 normally; <1 for the slow-motion photo finish
  finishing: number; // seconds of slow-mo left after the flag (0 = racing)
  lastPos: number; // position last frame, for overtake popups
  lastLapWarned: boolean;
  pullOver: boolean; // the police caught you: RaceSystem applies the stop + lost life
  chaseGap: number; // metres between you and the chasing patrol (-1 = no chase)
  chaseGoal: number; // metres you need to get away
  copAhead: number; // metres to a parked patrol ahead (-1 = none)
  washing: number; // seconds left while the window washer does your windshield
  camFlash: number; // white flash from a speed camera
  fines: number; // comparendos this run
  cleanCams: number; // speed cameras passed under the limit
  lostTime: number; // seconds spent way off the track
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

  // drifting (brake + steer): seconds held, direction, boosts earned
  drift: number;
  driftDir: number;
  driftBoosts: number;

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
    wx: 0,
    wz: 0,
    heading: 0,
    rel: 0,
    z: 0,
    lat: 0,
    busted: 0,
    wanted: false,
    hop: 0,
    coins: 0,
    draft: 0,
    trick: 0,
    tricked: false,
    star: 0,
    bullet: 0,
    itemCount: 0,
    hitStop: 0,
    timeScale: 1,
    finishing: 0,
    lastPos: 0,
    lastLapWarned: false,
    pullOver: false,
    chaseGap: -1,
    chaseGoal: 100,
    copAhead: -1,
    washing: 0,
    camFlash: 0,
    fines: 0,
    cleanCams: 0,
    lostTime: 0,
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
    drift: 0,
    driftDir: 0,
    driftBoosts: 0,
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

/** A hit in a race scatters up to three of your jars. Returns how many were lost. */
export function loseCoins() {
  const lost = Math.min(3, run.coins);
  run.coins -= lost;
  return lost;
}

/** Untouchable right now (Panela Power or Chiva Express)? */
export function untouchable() {
  return run.star > 0 || run.bullet > 0;
}
