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
}

interface AchievementsState {
  achievements: Achievement[];
  playerStats: PlayerStats | null;
  unlockedAchievements: Set<string>;
  recentUnlock: Achievement | null;
  queue: Achievement[];

  loadAchievements: () => Promise<void>;
  loadPlayerStats: (playerName: string) => Promise<void>;
  finishRun: (playerName: string, run: RunFacts) => Promise<void>;
  clearRecentUnlock: () => void;
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
    default:
      return 0;
  }
}

export const useAchievements = create<AchievementsState>()(
  subscribeWithSelector((set, get) => ({
    achievements: [],
    playerStats: null,
    unlockedAchievements: new Set(),
    recentUnlock: null,
    queue: [],

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
        set({ playerStats: stats, unlockedAchievements: new Set(unlocked) });
      } catch (error) {
        console.warn("Player stats unavailable:", error);
      }
    },

    finishRun: async (playerName: string, run: RunFacts) => {
      if (!playerName || !isOnline) return;
      try {
        const stats = await recordRun(playerName, {
          distance: run.distance,
          maxSpeed: run.maxSpeed,
          jars: run.jars,
          playtime: run.playtime,
        });
        if (stats) set({ playerStats: stats });

        const { achievements, unlockedAchievements } = get();
        const newly: Achievement[] = [];
        for (const a of achievements) {
          if (unlockedAchievements.has(a.id)) continue;
          const p = progressFor(a, stats, run);
          if (p >= a.requirement_value) {
            await unlockAchievement(playerName, a.id, a.requirement_value);
            newly.push(a);
          }
        }
        if (newly.length) {
          const all = new Set(get().unlockedAchievements);
          newly.forEach((a) => all.add(a.id));
          set({ unlockedAchievements: all, queue: [...get().queue, ...newly] });
          if (!get().recentUnlock) get().clearRecentUnlock();
        }
      } catch (error) {
        console.warn("Could not save run stats:", error);
      }
    },

    /** Shows the next unlocked achievement (one at a time). */
    clearRecentUnlock: () => {
      const [next, ...rest] = get().queue;
      set({ recentUnlock: next ?? null, queue: rest });
    },
  })),
);
