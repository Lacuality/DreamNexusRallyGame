import { create } from "zustand";
import type { BiomeType } from "../track";
import {
  CARS,
  DRIVERS,
  PAINTS,
  carById,
  isUnlocked,
  type CarId,
  type DriverId,
  type PaintId,
  type Progress,
} from "../game/garage";

/**
 * The player's garage and progress, saved on this device.
 * (Scores/achievements also go to the online database; this is the rest.)
 */
export interface ProfileData {
  wallet: number; // arequipe jars to spend
  totalJarsEver: number;
  ownedCars: CarId[];
  car: CarId;
  driver: DriverId;
  paint: PaintId;
  progress: Omit<Progress, "onlineAchievements">;
  story: Record<string, number>; // chapter id -> stars (0..3)
  bestLaps: Record<string, number>; // circuit id -> seconds
  circuitWins: Record<string, number>;
}

const KEY = "dreamNexusRallyProfile";

const fresh = (): ProfileData => ({
  wallet: 0,
  totalJarsEver: 0,
  ownedCars: ["rally7"],
  car: "rally7",
  driver: "pixel",
  paint: "dn",
  progress: {
    games: 0,
    bestRunJars: 0,
    maxSpeed: 0,
    bestCleanDistance: 0,
    bestDistance: 0,
    bestNitroUses: 0,
    storyComplete: false,
    regions: ["coffee_hills"],
  },
  story: {},
  bestLaps: {},
  circuitWins: {},
});

function load(): ProfileData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const base = fresh();
      return { ...base, ...d, progress: { ...base.progress, ...(d.progress || {}) } };
    }
  } catch {
    /* ignore */
  }
  return fresh();
}

export interface RunResult {
  jars: number;
  distance: number;
  maxSpeed: number;
  cleanDistance: number;
  nitroUses: number;
  bonusJars?: number; // rewards (circuit placing, story)
}

interface ProfileState extends ProfileData {
  onlineAchievements: string[];
  setOnlineAchievements: (names: string[]) => void;
  progressNow: () => Progress;
  recordRun: (r: RunResult) => number; // returns jars added to wallet
  visitRegion: (b: BiomeType) => boolean; // true if new
  buyCar: (id: CarId) => boolean;
  select: (p: Partial<Pick<ProfileData, "car" | "driver" | "paint">>) => void;
  setStoryStars: (chapter: string, stars: number, isFinal: boolean) => void;
  recordLap: (circuit: string, seconds: number) => boolean; // true if new best
  recordWin: (circuit: string) => void;
}

export const useProfile = create<ProfileState>((set, get) => {
  const save = () => {
    const s = get();
    const data: ProfileData = {
      wallet: s.wallet,
      totalJarsEver: s.totalJarsEver,
      ownedCars: s.ownedCars,
      car: s.car,
      driver: s.driver,
      paint: s.paint,
      progress: s.progress,
      story: s.story,
      bestLaps: s.bestLaps,
      circuitWins: s.circuitWins,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  };

  return {
    ...load(),
    onlineAchievements: [],

    setOnlineAchievements: (names) => set({ onlineAchievements: names }),

    progressNow: () => ({ ...get().progress, onlineAchievements: get().onlineAchievements }),

    recordRun: (r) => {
      const s = get();
      const p = s.progress;
      const added = r.jars + (r.bonusJars || 0);
      set({
        wallet: s.wallet + added,
        totalJarsEver: s.totalJarsEver + r.jars,
        progress: {
          ...p,
          games: p.games + 1,
          bestRunJars: Math.max(p.bestRunJars, r.jars),
          maxSpeed: Math.max(p.maxSpeed, r.maxSpeed),
          bestCleanDistance: Math.max(p.bestCleanDistance, r.cleanDistance),
          bestDistance: Math.max(p.bestDistance, r.distance),
          bestNitroUses: Math.max(p.bestNitroUses, r.nitroUses),
        },
      });
      save();
      return added;
    },

    visitRegion: (b) => {
      const p = get().progress;
      if (p.regions.includes(b)) return false;
      set({ progress: { ...p, regions: [...p.regions, b] } });
      save();
      return true;
    },

    buyCar: (id) => {
      const s = get();
      const car = carById(id);
      if (s.ownedCars.includes(id) || s.wallet < car.price) return false;
      set({ wallet: s.wallet - car.price, ownedCars: [...s.ownedCars, id], car: id });
      save();
      return true;
    },

    select: (p) => {
      const s = get();
      const prog = s.progressNow();
      const next: Partial<ProfileData> = {};
      if (p.car && s.ownedCars.includes(p.car)) next.car = p.car;
      if (p.driver) {
        const d = DRIVERS.find((x) => x.id === p.driver);
        if (d && isUnlocked(d.unlock, prog)) next.driver = p.driver;
      }
      if (p.paint) {
        const pt = PAINTS.find((x) => x.id === p.paint);
        if (pt && isUnlocked(pt.unlock, prog)) next.paint = p.paint;
      }
      set(next);
      save();
    },

    setStoryStars: (chapter, stars, isFinal) => {
      const s = get();
      const best = Math.max(s.story[chapter] || 0, stars);
      set({
        story: { ...s.story, [chapter]: best },
        progress: isFinal && stars > 0 ? { ...s.progress, storyComplete: true } : s.progress,
      });
      save();
    },

    recordLap: (circuit, seconds) => {
      const s = get();
      const prev = s.bestLaps[circuit];
      if (prev && prev <= seconds) return false;
      set({ bestLaps: { ...s.bestLaps, [circuit]: seconds } });
      save();
      return true;
    },

    recordWin: (circuit) => {
      const s = get();
      set({ circuitWins: { ...s.circuitWins, [circuit]: (s.circuitWins[circuit] || 0) + 1 } });
      save();
    },
  };
});

export const ALL_CARS = CARS;
