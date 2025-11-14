import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
  unlocked?: boolean;
  progress?: number;
}

export interface PlayerStats {
  player_name: string;
  total_distance: number;
  max_speed: number;
  total_collectibles: number;
  total_games: number;
  total_crashes: number;
  playtime_seconds: number;
}

interface AchievementsState {
  achievements: Achievement[];
  playerStats: PlayerStats | null;
  unlockedAchievements: Set<string>;
  recentUnlock: Achievement | null;

  loadAchievements: () => Promise<void>;
  loadPlayerStats: (playerName: string) => Promise<void>;
  checkAndUnlockAchievements: (playerName: string) => Promise<void>;
  updatePlayerStats: (playerName: string, stats: Partial<PlayerStats>) => Promise<void>;
  clearRecentUnlock: () => void;
}

export const useAchievements = create<AchievementsState>()(
  subscribeWithSelector((set, get) => ({
    achievements: [],
    playerStats: null,
    unlockedAchievements: new Set(),
    recentUnlock: null,

    loadAchievements: async () => {
      try {
        const response = await fetch("/api/achievements");
        if (!response.ok) throw new Error("Failed to load achievements");
        const data = await response.json();
        set({ achievements: data });
      } catch (error) {
        console.error("Error loading achievements:", error);
      }
    },

    loadPlayerStats: async (playerName: string) => {
      if (!playerName) return;

      try {
        const response = await fetch(`/api/player-stats/${encodeURIComponent(playerName)}`);
        if (!response.ok) throw new Error("Failed to load player stats");
        const data = await response.json();
        set({ playerStats: data });

        const achievementsResponse = await fetch(`/api/player-achievements/${encodeURIComponent(playerName)}`);
        if (achievementsResponse.ok) {
          const unlockedData = await achievementsResponse.json();
          set({ unlockedAchievements: new Set(unlockedData.map((a: any) => a.achievement_id)) });
        }
      } catch (error) {
        console.error("Error loading player stats:", error);
      }
    },

    checkAndUnlockAchievements: async (playerName: string) => {
      if (!playerName) return;

      const { achievements, unlockedAchievements, playerStats } = get();
      if (!playerStats) return;

      for (const achievement of achievements) {
        if (unlockedAchievements.has(achievement.id)) continue;

        let shouldUnlock = false;

        switch (achievement.requirement_type) {
          case 'max_speed':
            shouldUnlock = playerStats.max_speed >= achievement.requirement_value;
            break;
          case 'total_distance':
            shouldUnlock = playerStats.total_distance >= achievement.requirement_value;
            break;
          case 'total_collectibles':
            shouldUnlock = playerStats.total_collectibles >= achievement.requirement_value;
            break;
          case 'games_played':
            shouldUnlock = playerStats.total_games >= achievement.requirement_value;
            break;
          case 'playtime':
            shouldUnlock = playerStats.playtime_seconds >= achievement.requirement_value;
            break;
        }

        if (shouldUnlock) {
          try {
            await fetch("/api/player-achievements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                player_name: playerName,
                achievement_id: achievement.id,
                progress: achievement.requirement_value
              })
            });

            const newUnlocked = new Set(unlockedAchievements);
            newUnlocked.add(achievement.id);
            set({
              unlockedAchievements: newUnlocked,
              recentUnlock: achievement
            });

            console.log(`Achievement unlocked: ${achievement.name}`);

            setTimeout(() => {
              set({ recentUnlock: null });
            }, 5000);
          } catch (error) {
            console.error("Error unlocking achievement:", error);
          }
        }
      }
    },

    updatePlayerStats: async (playerName: string, stats: Partial<PlayerStats>) => {
      if (!playerName) return;

      try {
        const response = await fetch("/api/player-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player_name: playerName,
            ...stats
          })
        });

        if (!response.ok) throw new Error("Failed to update player stats");

        const updatedStats = await response.json();
        set({ playerStats: updatedStats });

        get().checkAndUnlockAchievements(playerName);
      } catch (error) {
        console.error("Error updating player stats:", error);
      }
    },

    clearRecentUnlock: () => {
      set({ recentUnlock: null });
    }
  }))
);
