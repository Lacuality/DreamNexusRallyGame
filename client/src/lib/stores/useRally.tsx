import { submitScore } from "@/lib/db";
import { saveBests } from "@/lib/env";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { audioManager } from "@/lib/audio";
import { useAchievements } from "./useAchievements";
import { run, resetRun, multiplierFor, MAX_HEARTS } from "@/lib/game/run";
import type { BiomeType } from "@/lib/track";
import { lapLength } from "@/lib/track";
import { applySession, car as carLoadout, session, sessionCircuit, type Session } from "@/lib/game/session";
import { race, resetRace, endRaceState, playerPosition, standings, type Standing } from "@/lib/game/race";
import { chapterById, CHAPTERS } from "@/lib/game/story";
import { useProfile } from "./useProfile";
import { DRIVERS, PAINTS, isUnlocked } from "@/lib/game/garage";

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
  maxHearts: number;
  mode: Session["mode"];
  item: string | null;
  // circuits
  lap: number;
  laps: number;
  position: number;
  racers: number;
  raceTime: number;
  lapTime: number;
  // story goal
  goalLabel: string;
  goalProgress: number;
  goalValue: number;
  limit: number;
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
  hits: number;
  mode: Session["mode"];
  success?: boolean; // story: goal reached
  title?: string;
  position?: number;
  standings?: Standing[];
  lapTimes?: number[];
  bestLap?: number;
  newBestLap?: boolean;
  raceTime?: number;
  stars?: number;
  chapterId?: string;
  reward: number; // jars added to the wallet
  newUnlocks: string[]; // drivers / paint jobs unlocked by this race
}

// what was unlocked when the race started (to show "new driver!" at the end)
let unlockedAtStart = new Set<string>();
function unlockedNow() {
  const p = useProfile.getState().progressNow();
  const ids: string[] = [];
  DRIVERS.forEach((d) => isUnlocked(d.unlock, p) && ids.push(`${d.emoji} ${d.name}`));
  PAINTS.forEach((x) => isUnlocked(x.unlock, p) && ids.push(`🎨 ${x.name} paint`));
  return ids;
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
  maxHearts: MAX_HEARTS,
  mode: "endless",
  item: null,
  lap: 1,
  laps: 0,
  position: 1,
  racers: 1,
  raceTime: 0,
  lapTime: 0,
  goalLabel: "",
  goalProgress: 0,
  goalValue: 0,
  limit: 0,
};

/** Progress toward the current story goal. */
export function goalProgress(): number {
  if (session.mode !== "story") return 0;
  const g = chapterById(session.chapterId).goal;
  switch (g.type) {
    case "jars":
      return run.jars;
    case "distance":
      return Math.floor(run.z);
    case "cleanDistance":
      return Math.floor(run.firstHitZ >= 0 ? run.firstHitZ : run.z);
    case "smashes":
      return run.smashes;
    case "jumps":
      return run.jumps;
    case "nearMisses":
      return run.nearMisses;
    case "combo":
      return run.bestCombo;
    default:
      return 0;
  }
}

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

  session: Session;
  start: (s?: Session) => void;
  finishRace: () => void;
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

/**
 * Everything that happens when a race ends (crash-out, circuit finish or story stage end).
 * `completed` = the player reached the finish / goal rather than losing all hearts.
 */
function endRun(completed: boolean) {
  const state = useRally.getState();
  const set = useRally.setState;
  const sess = session;
  const finalScore = Math.floor(run.score);
  const profile = useProfile.getState();

  audioManager.stopEngineSound();
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
    hits: run.hitsLanded,
    mode: sess.mode,
    reward: 0,
    newUnlocks: [],
  };
  let bonus = run.tunjos * 25;

  // circuit results
  const c = sessionCircuit();
  if (c) {
    const pos = completed ? playerPosition(run.z, run.time) : race.racers.length + 1;
    summary.position = pos;
    summary.raceTime = run.time;
    summary.lapTimes = [...race.lapTimes];
    summary.standings = standings(state.playerName, profile.driver, run.time, run.time);
    if (race.lapTimes.length) {
      const best = Math.min(...race.lapTimes);
      summary.bestLap = best;
      summary.newBestLap = profile.recordLap(c.id, best);
    }
    if (completed && sess.mode !== "online") {
      bonus += [0, 150, 100, 70, 50, 40, 30][Math.min(pos, 6)] ?? 30;
      if (pos === 1) profile.recordWin(c.id);
    }
  }

  // story results
  if (sess.mode === "story") {
    const ch = chapterById(sess.chapterId);
    summary.chapterId = ch.id;
    summary.title = ch.title;
    let success = false;
    let stars = 0;
    if (ch.stage.kind === "circuit") {
      success = completed && (summary.position ?? 99) <= ch.goal.value;
      stars = !success ? 0 : summary.position === 1 ? 3 : summary.position === 2 ? 2 : 1;
    } else {
      success = completed && goalProgress() >= ch.goal.value;
      stars = !success ? 0 : finalScore >= ch.stars[1] ? 3 : finalScore >= ch.stars[0] ? 2 : 1;
    }
    summary.success = success;
    summary.stars = stars;
    if (success) {
      const first = !(profile.story[ch.id] > 0);
      if (first) bonus += ch.reward;
      profile.setStoryStars(ch.id, stars, ch.id === CHAPTERS[CHAPTERS.length - 1].id);
    }
  }

  summary.reward = profile.recordRun({
    jars: run.jars,
    distance: Math.floor(run.z),
    maxSpeed: Math.floor(run.maxSpeedKmh),
    cleanDistance: Math.floor(run.firstHitZ >= 0 ? run.firstHitZ : run.z),
    nitroUses: run.nitroUses,
    bonusJars: bonus,
  });

  summary.newUnlocks = unlockedNow().filter((x) => !unlockedAtStart.has(x));

  // only the endless rally counts for the high score + online leaderboard
  let isNewBest = false;
  let highScore = state.highScore;
  if (sess.mode === "endless") {
    isNewBest = finalScore > state.highScore;
    highScore = Math.max(finalScore, state.highScore);
    if (isNewBest) safeSet("dreamNexusRallyHighScore", String(highScore));
    if (finalScore > 0) {
      submitScore(state.playerName, finalScore, Math.floor(run.z))
        .then((ok) => ok && set({ scoreSubmitted: true }))
        .catch((err) => console.warn("Could not save score:", err));
    }
  }

  const good = sess.mode === "story" ? summary.success : c ? (summary.position ?? 9) <= 3 : isNewBest;
  if (good) audioManager.playMilestone();
  else audioManager.playGameOver();

  set({
    phase: "gameover",
    summary,
    currentScore: finalScore,
    highScore,
    isNewBest,
    scoreSubmitted: false,
  });

  saveBests({
    distance: Math.floor(run.z),
    jars: run.jars,
    nitroUses: run.nitroUses,
    cleanDistance: Math.floor(run.firstHitZ >= 0 ? run.firstHitZ : run.z),
    maxSpeed: Math.floor(run.maxSpeedKmh),
  });

  if (state.playerName) {
    useAchievements.getState().finishRun(state.playerName, {
      distance: Math.floor(run.z),
      maxSpeed: Math.floor(run.maxSpeedKmh),
      jars: run.jars,
      nitroUses: run.nitroUses,
      cleanDistance: Math.floor(run.firstHitZ >= 0 ? run.firstHitZ : run.z),
      playtime: Math.floor(run.time),
      tunjos: run.tunjos,
      circuitWins: Object.values(useProfile.getState().circuitWins).reduce((a, b) => a + b, 0),
      regions: useProfile.getState().progress.regions.length,
    });
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
    session: { mode: "endless" },

    start: (s?: Session) => {
      const next = s ?? get().session;
      applySession(next);
      unlockedAtStart = new Set(unlockedNow());
      resetRun(carLoadout.hearts, carLoadout.startShield);
      const c = sessionCircuit();
      if (c) resetRace(c.laps, lapLength());
      else endRaceState();
      audioManager.setMusicTheme("default");
      useAchievements.getState().clearLastRun();
      audioManager.playBackgroundMusic();
      audioManager.duckMusic(1);
      set((st) => ({
        session: next,
        phase: "countdown",
        runId: st.runId + 1,
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
      if (get().phase !== "playing") return;
      endRun(false);
    },

    finishRace: () => {
      if (get().phase !== "playing") return;
      endRun(true);
    },

    restart: () => {
      endRaceState();
      audioManager.setMusicTheme("default");
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
        maxHearts: run.maxHearts,
        mode: session.mode,
        item: run.item,
        lap: Math.min(race.laps, race.lap + 1),
        laps: race.active ? race.laps : 0,
        position: race.active ? playerPosition(run.z, null) : 1,
        racers: race.active ? race.racers.length + 1 : 1,
        raceTime: run.time,
        lapTime: run.time - race.lapStart,
        goalLabel: session.mode === "story" ? chapterById(session.chapterId).goal.label : "",
        goalProgress: goalProgress(),
        goalValue: session.mode === "story" ? chapterById(session.chapterId).goal.value : 0,
        limit: session.mode === "story" && chapterById(session.chapterId).stage.kind === "endless" ? (chapterById(session.chapterId).stage as any).limit : 0,
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
      }, 1000);
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
