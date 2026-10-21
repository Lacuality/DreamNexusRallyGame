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
