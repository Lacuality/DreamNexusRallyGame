/**
 * Hosting helpers.
 * - On GitHub Pages the game lives under /DreamNexusRallyGame/, so file paths
 *   must start from Vite's BASE_URL.
 * - GitHub Pages only serves files (no server), so the online leaderboard and
 *   achievements are switched off there and a local top-10 is used instead.
 */
export const HAS_SERVER = import.meta.env.VITE_STATIC !== "1";

export function asset(path: string) {
  return import.meta.env.BASE_URL + path.replace(/^\//, "");
}

export interface LocalScore {
  id: number;
  playerName: string;
  score: number;
  distance: number;
  createdAt: string;
}

const KEY = "dreamNexusRallyLocalBoard";

export function readLocalBoard(): LocalScore[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addLocalScore(playerName: string, score: number, distance: number) {
  try {
    const list = readLocalBoard();
    list.push({ id: Date.now(), playerName: playerName || "Racer", score, distance, createdAt: new Date().toISOString() });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* ignore */
  }
}

/* Best single-run numbers on this device (for achievement progress bars). */
export interface RunBests {
  distance: number;
  jars: number;
  nitroUses: number;
  cleanDistance: number;
  maxSpeed: number;
}
const BEST_KEY = "dreamNexusRallyBests";

export function readBests(): RunBests {
  try {
    return { distance: 0, jars: 0, nitroUses: 0, cleanDistance: 0, maxSpeed: 0, ...JSON.parse(localStorage.getItem(BEST_KEY) || "{}") };
  } catch {
    return { distance: 0, jars: 0, nitroUses: 0, cleanDistance: 0, maxSpeed: 0 };
  }
}

export function saveBests(r: RunBests) {
  try {
    const b = readBests();
    (Object.keys(b) as (keyof RunBests)[]).forEach((k) => (b[k] = Math.max(b[k], r[k] || 0)));
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}
