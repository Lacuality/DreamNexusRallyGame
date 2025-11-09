import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type RallyPhase = "menu" | "playing" | "paused" | "gameover";

interface RallyState {
  phase: RallyPhase;
  distance: number;
  speed: number;
  highScore: number;
  currentScore: number;
  startTime: number;
  
  start: () => void;
  pause: () => void;
  resume: () => void;
  gameOver: () => void;
  restart: () => void;
  updateDistance: (distance: number) => void;
  updateSpeed: (speed: number) => void;
  loadHighScore: () => void;
  saveHighScore: () => void;
}

export const useRally = create<RallyState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    distance: 0,
    speed: 0,
    highScore: 0,
    currentScore: 0,
    startTime: 0,
    
    start: () => {
      const now = Date.now();
      set({
        phase: "playing",
        distance: 0,
        speed: 0,
        currentScore: 0,
        startTime: now
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
        const finalScore = Math.floor(state.distance);
        const newHighScore = Math.max(finalScore, state.highScore);
        
        set({ phase: "gameover", currentScore: finalScore, highScore: newHighScore });
        
        if (newHighScore > state.highScore) {
          localStorage.setItem("dreamNexusRallyHighScore", String(newHighScore));
        }
      }
    },
    
    restart: () => {
      set({ phase: "menu", distance: 0, speed: 0, currentScore: 0 });
    },
    
    updateDistance: (distance: number) => {
      set({ distance });
    },
    
    updateSpeed: (speed: number) => {
      set({ speed });
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
    }
  }))
);
