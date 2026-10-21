/**
 * Everything you can unlock and choose in the Garage.
 *
 * - Drivers (Colombian animals) unlock with achievements, and each has a perk.
 * - Cars are bought with arequipe jars and have their own stats.
 * - Paint jobs unlock by visiting regions of Colombia.
 */
import type { BiomeType } from "../track";

export type DriverId = "pixel" | "chiguiro" | "tucan" | "rana" | "oso" | "jaguar" | "condor" | "titi" | "nexi";
export type CarId = "rally7" | "cuatro" | "willys" | "taxi" | "chiva" | "dn";
export type PaintId = "dn" | "cafe" | "tricolor" | "esmeralda" | "oro" | "rosaNeon" | "desierto" | "caribe";

/** What the player has done so far (stored on the device, see useProfile). */
export interface Progress {
  games: number;
  bestRunJars: number;
  maxSpeed: number;
  bestCleanDistance: number;
  bestDistance: number;
  bestNitroUses: number;
  storyComplete: boolean;
  regions: BiomeType[];
  onlineAchievements: string[]; // achievement names unlocked in the online database
}

export interface Unlock {
  label: string; // shown to the player, e.g. "Achievement: Collector"
  achievement?: string; // achievement name that also unlocks it
  test: (p: Progress) => boolean;
}

export interface Driver {
  id: DriverId;
  name: string;
  species: string;
  emoji: string;
  perk: string;
  unlock: Unlock | null; // null = available from the start
}

export const DRIVERS: Driver[] = [
  { id: "pixel", name: "Pixel", species: "Bunny", emoji: "🐰", perk: "All-rounder. The original Dream Nexus racer.", unlock: null },
  {
    id: "chiguiro",
    name: "Chigüi",
    species: "Capybara (chigüiro)",
    emoji: "🦫",
    perk: "Tranqui: puddles never slow you down.",
    unlock: { label: "Achievement: First Steps — finish 1 race", achievement: "First Steps", test: (p) => p.games >= 1 },
  },
  {
    id: "tucan",
    name: "Tuki",
    species: "Toucan",
    emoji: "🦜",
    perk: "Big beak: grabs pickups from further away.",
    unlock: { label: "Achievement: Collector — 20 jars in one run", achievement: "Collector", test: (p) => p.bestRunJars >= 20 },
  },
  {
    id: "rana",
    name: "Dorada",
    species: "Golden poison frog",
    emoji: "🐸",
    perk: "Turbo frog: nitro fills 35% faster.",
    unlock: { label: "Achievement: Speed Demon — reach 180 km/h", achievement: "Speed Demon", test: (p) => p.maxSpeed >= 180 },
  },
  {
    id: "oso",
    name: "Anteojos",
    species: "Spectacled bear",
    emoji: "🐻",
    perk: "Tough: +1 heart.",
    unlock: { label: "Achievement: Survivor — 2000 m without crashing", achievement: "Survivor", test: (p) => p.bestCleanDistance >= 2000 },
  },
  {
    id: "jaguar",
    name: "Yaguar",
    species: "Jaguar",
    emoji: "🐆",
    perk: "Fast: +6% top speed.",
    unlock: {
      label: "Achievement: Lost City Explorer — reach 2400 m",
      achievement: "Lost City Explorer",
      test: (p) => p.bestDistance >= 2400,
    },
  },
  {
    id: "titi",
    name: "Titi",
    species: "Cotton-top tamarin",
    emoji: "🐒",
    perk: "Party animal: combos last 2 s longer.",
    unlock: { label: "Achievement: Nitro Master — 10 nitros in one run", achievement: "Nitro Master", test: (p) => p.bestNitroUses >= 10 },
  },
  {
    id: "condor",
    name: "Kuntur",
    species: "Andean condor",
    emoji: "🦅",
    perk: "Flyer: jumps go higher and air points double.",
    unlock: { label: "Achievement: Marathon Runner — 5000 m in one run", achievement: "Marathon Runner", test: (p) => p.bestDistance >= 5000 },
  },
  {
    id: "nexi",
    name: "NEXI",
    species: "Dream Nexus robot",
    emoji: "🤖",
    perk: "Glitch shield: every race starts with a shield.",
    unlock: { label: "Finish Story Mode (La Ruta de Pixel)", test: (p) => p.storyComplete },
  },
];

export interface CarStats {
  top: number; // top-speed multiplier
  accel: number;
  handling: number;
  hearts: number;
  nitro: number; // nitro duration multiplier
  offroad: number; // speed kept off the road (0..1)
  smashSmall: boolean; // plough through cones and sacks without nitro
}

export interface Car {
  id: CarId;
  name: string;
  desc: string;
  price: number; // arequipe jars
  stats: CarStats;
  defaultPaint: PaintId;
}

export const CARS: Car[] = [
  {
    id: "rally7",
    name: "Rally 7",
    desc: "Pixel's trusty rally hatch. Balanced at everything.",
    price: 0,
    defaultPaint: "dn",
    stats: { top: 1, accel: 1, handling: 1, hearts: 3, nitro: 1, offroad: 0.62, smashSmall: false },
  },
  {
    id: "cuatro",
    name: "El Cuatro",
    desc: "The classic little family car of every Colombian road. Super nimble.",
    price: 250,
    defaultPaint: "cafe",
    stats: { top: 0.92, accel: 1.1, handling: 1.3, hearts: 3, nitro: 1, offroad: 0.62, smashSmall: false },
  },
  {
    id: "willys",
    name: "Willys Cafetero",
    desc: "The coffee-farm jeep. Tough, and doesn't care about mud.",
    price: 500,
    defaultPaint: "esmeralda",
    stats: { top: 0.94, accel: 0.95, handling: 0.95, hearts: 4, nitro: 1, offroad: 0.95, smashSmall: false },
  },
  {
    id: "taxi",
    name: "Taxi Amarillo",
    desc: "Bogotá's yellow legend. Quick off the line and slips through traffic.",
    price: 900,
    defaultPaint: "tricolor",
    stats: { top: 1.05, accel: 1.25, handling: 1.12, hearts: 3, nitro: 1, offroad: 0.62, smashSmall: false },
  },
  {
    id: "chiva",
    name: "La Chiva Rumbera",
    desc: "The party bus! Slow, but 5 hearts and it ploughs through cones and sacks.",
    price: 1500,
    defaultPaint: "caribe",
    stats: { top: 0.86, accel: 0.8, handling: 0.82, hearts: 5, nitro: 1.2, offroad: 0.75, smashSmall: true },
  },
  {
    id: "dn",
    name: "DN Prototype",
    desc: "Dream Nexus' neon hypercar. Fastest car in Colombia, longer nitro.",
    price: 3000,
    defaultPaint: "rosaNeon",
    stats: { top: 1.15, accel: 1.18, handling: 1.12, hearts: 3, nitro: 1.35, offroad: 0.62, smashSmall: false },
  },
];

export interface Paint {
  id: PaintId;
  name: string;
  main: string;
  accent: string;
  trim: string;
  unlock: Unlock | null;
}

const visited = (b: BiomeType, label: string): Unlock => ({ label: `Visit ${label}`, test: (p) => p.regions.includes(b) });

export const PAINTS: Paint[] = [
  { id: "dn", name: "Dream Nexus", main: "#24A0CE", accent: "#FDC6B5", trim: "#0E1B24", unlock: null },
  { id: "cafe", name: "Café con Leche", main: "#6b4226", accent: "#f2e3c9", trim: "#2a1a10", unlock: null },
  { id: "tricolor", name: "Tricolor", main: "#FCD116", accent: "#003893", trim: "#CE1126", unlock: visited("andes_highland", "the Andes") },
  { id: "esmeralda", name: "Esmeralda", main: "#0f8a4a", accent: "#ffd23f", trim: "#0a3d22", unlock: visited("andes_highland", "the Andes") },
  { id: "oro", name: "Oro Muisca", main: "#d4a017", accent: "#1a1a1a", trim: "#6b4a00", unlock: visited("ciudad_perdida", "Ciudad Perdida") },
  { id: "rosaNeon", name: "Neón Comuna", main: "#ff4f9a", accent: "#5fd8ff", trim: "#1a0b2e", unlock: visited("comuna_13", "Comuna 13") },
  { id: "desierto", name: "Tatacoa", main: "#c1572f", accent: "#f2c48d", trim: "#4a2a1a", unlock: visited("tatacoa", "the Tatacoa Desert") },
  { id: "caribe", name: "Caribe", main: "#1fb5c9", accent: "#ffffff", trim: "#f7b32b", unlock: visited("cartagena", "Cartagena") },
];

export function isUnlocked(u: Unlock | null, p: Progress) {
  if (!u) return true;
  if (u.achievement && p.onlineAchievements.includes(u.achievement)) return true;
  return u.test(p);
}

export const driverById = (id: string) => DRIVERS.find((d) => d.id === id) ?? DRIVERS[0];
export const carById = (id: string) => CARS.find((c) => c.id === id) ?? CARS[0];
export const paintById = (id: string) => PAINTS.find((c) => c.id === id) ?? PAINTS[0];

/** Final numbers the physics uses for a car + driver combo. */
export function loadout(carId: string, driverId: string) {
  const c = carById(carId).stats;
  const d = driverById(driverId).id;
  return {
    top: c.top * (d === "jaguar" ? 1.06 : 1),
    accel: c.accel,
    handling: c.handling,
    hearts: c.hearts + (d === "oso" ? 1 : 0),
    nitroTime: c.nitro,
    nitroFill: d === "rana" ? 1.35 : 1,
    offroad: c.offroad,
    smashSmall: c.smashSmall,
    puddleProof: d === "chiguiro",
    pickupRange: d === "tucan" ? 1.6 : 1,
    jump: d === "condor" ? 1.3 : 1,
    airBonus: d === "condor" ? 2 : 1,
    comboTime: d === "titi" ? 2 : 0,
    startShield: d === "nexi",
  };
}
export type Loadout = ReturnType<typeof loadout>;
