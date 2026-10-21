import { submitScore } from "@/lib/db";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { audioManager } from "@/lib/audio";
import { useAchievements } from "./useAchievements";
import { run, resetRun, multiplierFor, MAX_HEARTS } from "@/lib/game/run";
import type { BiomeType } from "@/lib/track";

export type RallyPhase = "menu" | "countdown" | "playing" | "paused" | "gameover";

export interface Popup {
  id: number;
  text: string;
  color: string;
  big?: boolean;
}

export interface HudSnapshot {
  distance: number;
  speed: number;
  score: number;
  jars: number;
  hearts: number;
  combo: number;
  multiplier: number;
  nitro: number;
  nitroActive: boolean;
  shield: boolean;
  offroad: boolean;
}

export interface RunSummary {
  score: number;
  distance: number;
  jars: number;
  nearMisses: number;
  smashes: number;
  jumps: number;
  bestCombo: number;
  maxSpeed: number;
  airTime: number;
}

const emptyHud: HudSnapshot = {
  distance: 0,
  speed: 0,
  score: 0,
  jars: 0,
  hearts: MAX_HEARTS,
  combo: 0,
  multiplier: 1,
  nitro: 0.5,
  nitroActive: false,
  shield: false,
  offroad: false,
};

interface RallyState {
  phase: RallyPhase;
  runId: number;
  countdown: number;
  hud: HudSnapshot;
  popups: Popup[];
  banner: { id: number; title: string; subtitle?: string } | null;
  summary: RunSummary | null;
  highScore: number;
  isNewBest: boolean;
  playerName: string;
  scoreSubmitted: boolean;

  // kept for older components
  distance: number;
  speed: number;
  currentScore: number;
  collectiblesCount: number;

  start: () => void;
  beginRace: () => void;
  setCountdown: (n: number) => void;
  pause: () => void;
  resume: () => void;
  gameOver: () => void;
  restart: () => void;
  syncHud: () => void;
  popup: (text: string, color?: string, big?: boolean) => void;
  showBanner: (title: string, subtitle?: string) => void;
  loadHighScore: () => void;
  setPlayerName: (name: string) => void;
  loadPlayerName: () => void;
}

let popupId = 0;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const useRally = create<RallyState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    runId: 0,
    countdown: 3,
    hud: emptyHud,
    popups: [],
    banner: null,
    summary: null,
    highScore: 0,
    isNewBest: false,
    playerName: "",
    scoreSubmitted: false,
    distance: 0,
    speed: 0,
    currentScore: 0,
    collectiblesCount: 0,

    start: () => {
      resetRun();
      audioManager.playBackgroundMusic();
      audioManager.duckMusic(1);
      set((s) => ({
        phase: "countdown",
        runId: s.runId + 1,
        countdown: 3,
        hud: emptyHud,
        popups: [],
        banner: null,
        summary: null,
        isNewBest: false,
        scoreSubmitted: false,
        distance: 0,
        speed: 0,
        currentScore: 0,
        collectiblesCount: 0,
      }));
    },

    beginRace: () => {
      if (get().phase === "countdown") set({ phase: "playing" });
    },

    setCountdown: (n) => set({ countdown: n }),

    pause: () => {
      const p = get().phase;
      if (p === "playing" || p === "countdown") {
        audioManager.duckMusic(0.4);
        audioManager.stopEngineSound();
        set({ phase: "paused" });
      }
    },

    resume: () => {
      if (get().phase === "paused") {
        audioManager.duckMusic(1);
        // resume into a short countdown so nobody crashes instantly
        set({ phase: "countdown", countdown: 3 });
      }
    },

    gameOver: () => {
      const state = get();
      if (state.phase !== "playing") return;

      const finalScore = Math.floor(run.score);
      const isNewBest = finalScore > state.highScore;
      const highScore = Math.max(finalScore, state.highScore);
      if (isNewBest) safeSet("dreamNexusRallyHighScore", String(highScore));

      audioManager.stopEngineSound();
      audioManager.playGameOver();
      audioManager.duckMusic(0.5);

      const summary: RunSummary = {
        score: finalScore,
        distance: Math.floor(run.z),
        jars: run.jars,
        nearMisses: run.nearMisses,
        smashes: run.smashes,
        jumps: run.jumps,
        bestCombo: run.bestCombo,
        maxSpeed: Math.floor(run.maxSpeedKmh),
        airTime: Math.round(run.totalAir * 10) / 10,
      };

      set({
        phase: "gameover",
        summary,
        currentScore: finalScore,
        highScore,
        isNewBest,
        scoreSubmitted: false,
      });

      if (finalScore > 0) {
        submitScore(state.playerName, finalScore, Math.floor(run.z))
          .then((ok) => ok && set({ scoreSubmitted: true }))
          .catch((err) => console.warn("Could not save score:", err));
      }

      if (state.playerName) {
        useAchievements.getState().finishRun(state.playerName, {
          distance: Math.floor(run.z),
          maxSpeed: Math.floor(run.maxSpeedKmh),
          jars: run.jars,
          nitroUses: run.nitroUses,
          cleanDistance: Math.floor(run.firstHitZ >= 0 ? run.firstHitZ : run.z),
          playtime: Math.floor(run.time),
        });
      }
    },

    restart: () => {
      audioManager.stopEngineSound();
      audioManager.duckMusic(1);
      audioManager.playBackgroundMusic();
      set({ phase: "menu", popups: [], banner: null });
    },

    syncHud: () => {
      const hud: HudSnapshot = {
        distance: Math.floor(run.z),
        speed: Math.floor(run.speed * 3.6),
        score: Math.floor(run.score),
        jars: run.jars,
        hearts: run.hearts,
        combo: run.combo,
        multiplier: multiplierFor(run.combo),
        nitro: run.nitro,
        nitroActive: run.nitroTime > 0,
        shield: run.shield,
        offroad: run.offroad,
      };
      set({
        hud,
        distance: hud.distance,
        speed: hud.speed,
        currentScore: hud.score,
        collectiblesCount: hud.jars,
      });
    },

    popup: (text, color = "#FFFFFF", big = false) => {
      const id = ++popupId;
      set((s) => ({ popups: [...s.popups.slice(-5), { id, text, color, big }] }));
      setTimeout(() => {
        set((s) => ({ popups: s.popups.filter((p) => p.id !== id) }));
      }, 1100);
    },

    showBanner: (title, subtitle) => {
      const id = ++popupId;
      set({ banner: { id, title, subtitle } });
      setTimeout(() => {
        if (get().banner?.id === id) set({ banner: null });
      }, 2600);
    },

    loadHighScore: () => {
      const saved = safeGet("dreamNexusRallyHighScore");
      set({ highScore: saved ? parseInt(saved, 10) || 0 : 0 });
    },

    setPlayerName: (name: string) => {
      set({ playerName: name });
      safeSet("dreamNexusRallyPlayerName", name);
    },

    loadPlayerName: () => {
      const saved = safeGet("dreamNexusRallyPlayerName");
      if (saved) set({ playerName: saved });
    },
  })),
);

export type { BiomeType };
