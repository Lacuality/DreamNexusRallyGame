import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { audioManager } from "@/lib/audio";
import { useAchievements } from "./useAchievements";

export type RallyPhase = "menu" | "playing" | "paused" | "gameover";

interface RallyState {
  phase: RallyPhase;
  distance: number;
  speed: number;
  highScore: number;
  currentScore: number;
  collectiblesCount: number;
  startTime: number;
  playerName: string;
  scoreSubmitted: boolean;
  maxSpeedThisRun: number;
  nitroUsesThisRun: number;
  
  start: () => void;
  pause: () => void;
  resume: () => void;
  gameOver: () => void;
  restart: () => void;
  updateDistance: (distance: number) => void;
  updateSpeed: (speed: number) => void;
  addCollectible: () => void;
  loadHighScore: () => void;
  saveHighScore: () => void;
  setPlayerName: (name: string) => void;
  loadPlayerName: () => void;
}

export const useRally = create<RallyState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    distance: 0,
    speed: 0,
    highScore: 0,
    currentScore: 0,
    collectiblesCount: 0,
    startTime: 0,
    playerName: "",
    scoreSubmitted: false,
    maxSpeedThisRun: 0,
    nitroUsesThisRun: 0,
    
    start: () => {
      const now = Date.now();
      audioManager.stopBackgroundMusic();
      set({
        phase: "playing",
        distance: 0,
        speed: 0,
        currentScore: 0,
        collectiblesCount: 0,
        startTime: now,
        maxSpeedThisRun: 0,
        nitroUsesThisRun: 0
      });
    },
    
    pause: () => {
      set((state) => state.phase === "playing" ? { phase: "paused" } : {});
    },
    
    resume: () => {
      set((state) => state.phase === "paused" ? { phase: "playing" } : {});
    },
    
    gameOver: () => {
      const state = get();
      if (state.phase === "playing") {
        const finalScore = Math.floor(state.distance) + (state.collectiblesCount * 50);
        const newHighScore = Math.max(finalScore, state.highScore);

        if (newHighScore > state.highScore) {
          localStorage.setItem("dreamNexusRallyHighScore", String(newHighScore));
        }

        audioManager.stopEngineSound();

        const playtimeSeconds = Math.floor((Date.now() - state.startTime) / 1000);

        set({ phase: "gameover", currentScore: finalScore, highScore: newHighScore, scoreSubmitted: false });

        if (state.playerName && finalScore > 0) {
          fetch("/api/leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerName: state.playerName,
              score: finalScore,
              distance: Math.floor(state.distance),
            }),
          })
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            })
            .then(data => {
              console.log("Score submitted:", data);
              set({ scoreSubmitted: true });
            })
            .catch(err => {
              console.error("Failed to submit score:", err);
            });

          useAchievements.getState().updatePlayerStats(state.playerName, {
            player_name: state.playerName,
            total_distance: Math.floor(state.distance),
            max_speed: state.maxSpeedThisRun,
            total_collectibles: state.collectiblesCount,
            total_games: 1,
            total_crashes: 1,
            playtime_seconds: playtimeSeconds
          });
        }
      }
    },
    
    restart: () => {
      audioManager.playBackgroundMusic();
      set({ phase: "menu", distance: 0, speed: 0, currentScore: 0, collectiblesCount: 0, scoreSubmitted: false, maxSpeedThisRun: 0, nitroUsesThisRun: 0 });
    },
    
    updateDistance: (distance: number) => {
      set({ distance });
    },
    
    updateSpeed: (speed: number) => {
      set((state) => ({
        speed,
        maxSpeedThisRun: Math.max(state.maxSpeedThisRun, Math.floor(speed))
      }));
    },
    
    addCollectible: () => {
      set((state) => ({
        collectiblesCount: state.collectiblesCount + 1,
        currentScore: state.currentScore + 50
      }));
    },
    
    loadHighScore: () => {
      const saved = localStorage.getItem("dreamNexusRallyHighScore");
      const highScore = saved ? parseInt(saved, 10) : 0;
      set({ highScore });
    },
    
    saveHighScore: () => {
      const { currentScore, highScore } = get();
      const newHighScore = Math.max(currentScore, highScore);
      localStorage.setItem("dreamNexusRallyHighScore", String(newHighScore));
      set({ highScore: newHighScore });
    },
    
    setPlayerName: (name: string) => {
      set({ playerName: name });
      localStorage.setItem("dreamNexusRallyPlayerName", name);
    },
    
    loadPlayerName: () => {
      const saved = localStorage.getItem("dreamNexusRallyPlayerName");
      if (saved) {
        set({ playerName: saved });
      }
    }
  }))
);
