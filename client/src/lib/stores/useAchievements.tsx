import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  getAchievements,
  getUnlockedIds,
  unlockAchievement,
  getPlayerStats,
  recordRun,
  isOnline,
  type Achievement as DbAchievement,
  type PlayerStats,
} from "@/lib/db";

export type { PlayerStats };
export interface Achievement extends DbAchievement {
  unlocked?: boolean;
  progress?: number;
}

/** What happened in the run that just ended (for "in one run" achievements). */
export interface RunFacts {
  distance: number;
  maxSpeed: number;
  jars: number;
  nitroUses: number;
  cleanDistance: number; // metres driven before the first crash
  playtime: number;
  tunjos?: number;
  circuitWins?: number; // lifetime, from this device
  regions?: number; // regions visited, from this device
}

interface AchievementsState {
  achievements: Achievement[];
  playerStats: PlayerStats | null;
  unlockedAchievements: Set<string>;
  loadedFor: string;
  /** Unlocked in the race that just ended; shown on the race-over screen. */
  lastRunUnlocks: Achievement[];

  loadAchievements: () => Promise<void>;
  loadPlayerStats: (playerName: string) => Promise<void>;
  finishRun: (playerName: string, run: RunFacts) => Promise<void>;
  clearLastRun: () => void;
}

// remembers what this device already celebrated, so nothing is announced twice
const SEEN_KEY = "dreamNexusRallySeenAchievements";
function seenSet(player: string): Set<string> {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    return new Set(all[player] || []);
  } catch {
    return new Set();
  }
}
function markSeen(player: string, ids: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    all[player] = Array.from(new Set([...(all[player] || []), ...ids]));
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function progressFor(a: Achievement, stats: PlayerStats | null, run: RunFacts | null): number {
  switch (a.requirement_type) {
    // lifetime
    case "max_speed":
      return Math.max(stats?.max_speed ?? 0, run?.maxSpeed ?? 0);
    case "total_distance":
      return stats?.total_distance ?? 0;
    case "total_collectibles":
      return stats?.total_collectibles ?? 0;
    case "games_played":
      return stats?.total_games ?? 0;
    case "playtime":
      return stats?.playtime_seconds ?? 0;
    // one run
    case "distance":
      return run?.distance ?? 0;
    case "collectibles":
      return run?.jars ?? 0;
    case "distance_no_crash":
      return run?.cleanDistance ?? 0;
    case "nitro_uses":
      return run?.nitroUses ?? 0;
    case "tunjos":
      return run?.tunjos ?? 0;
    case "circuit_wins":
      return run?.circuitWins ?? 0;
    case "regions":
      return run?.regions ?? 0;
    default:
      return 0;
  }
}

export const useAchievements = create<AchievementsState>()(
  subscribeWithSelector((set, get) => ({
    achievements: [],
    playerStats: null,
    unlockedAchievements: new Set(),
    loadedFor: "",
    lastRunUnlocks: [],

    loadAchievements: async () => {
      if (!isOnline) return;
      try {
        set({ achievements: await getAchievements() });
      } catch (error) {
        console.warn("Achievements unavailable:", error);
      }
    },

    loadPlayerStats: async (playerName: string) => {
      if (!playerName || !isOnline) return;
      try {
        const [stats, unlocked] = await Promise.all([getPlayerStats(playerName), getUnlockedIds(playerName)]);
        set({ playerStats: stats, unlockedAchievements: new Set(unlocked), loadedFor: playerName });
      } catch (error) {
        console.warn("Player stats unavailable:", error);
      }
    },

    finishRun: async (playerName: string, run: RunFacts) => {
      set({ lastRunUnlocks: [] });
      if (!playerName || !isOnline) return;
      try {
        if (!get().achievements.length) await get().loadAchievements();
        if (get().loadedFor !== playerName) await get().loadPlayerStats(playerName);

        const stats = await recordRun(playerName, {
          distance: run.distance,
          maxSpeed: run.maxSpeed,
          jars: run.jars,
          playtime: run.playtime,
        });
        if (stats) set({ playerStats: stats });

        const { achievements } = get();
        const unlocked = new Set(get().unlockedAchievements);
        const seen = seenSet(playerName);
        const fresh: Achievement[] = [];
        for (const a of achievements) {
          if (unlocked.has(a.id)) continue;
          if (progressFor(a, stats, run) < a.requirement_value) continue;
          const isNew = await unlockAchievement(playerName, a.id, a.requirement_value);
          unlocked.add(a.id);
          if (isNew && !seen.has(a.id)) fresh.push(a);
        }
        markSeen(playerName, Array.from(unlocked));
        set({ unlockedAchievements: unlocked, lastRunUnlocks: fresh });
      } catch (error) {
        console.warn("Could not save run stats:", error);
      }
    },

    clearLastRun: () => set({ lastRunUnlocks: [] }),
  })),
);
