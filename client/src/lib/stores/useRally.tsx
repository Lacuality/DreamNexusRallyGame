import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

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
    
    start: () => {
      const now = Date.now();
      set({
        phase: "playing",
        distance: 0,
        speed: 0,
        currentScore: 0,
        collectiblesCount: 0,
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
        const finalScore = Math.floor(state.distance) + (state.collectiblesCount * 50);
        const newHighScore = Math.max(finalScore, state.highScore);
        
        if (newHighScore > state.highScore) {
          localStorage.setItem("dreamNexusRallyHighScore", String(newHighScore));
        }
        
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
        }
      }
    },
    
    restart: () => {
      set({ phase: "menu", distance: 0, speed: 0, currentScore: 0, collectiblesCount: 0, scoreSubmitted: false });
    },
    
    updateDistance: (distance: number) => {
      set({ distance });
    },
    
    updateSpeed: (speed: number) => {
      set({ speed });
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
