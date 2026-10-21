import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HAS_SERVER, addLocalScore, readLocalBoard } from "./env";

/**
 * Where scores and achievements are saved:
 *  - "supabase": the online database (set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at build time)
 *  - "server":   the old Express API (only when running `npm run dev` / `npm start`)
 *  - "local":    this device only (no database configured)
 *
 * The anon key is meant to be public; the database protects itself with
 * row-level security and the submit_score / record_run functions
 * (see supabase/migrations).
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export type DbMode = "supabase" | "server" | "local";
export const dbMode: DbMode = supabase ? "supabase" : HAS_SERVER ? "server" : "local";
export const isOnline = dbMode !== "local";

export interface LeaderRow {
  id: number;
  playerName: string;
  score: number;
  distance: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
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

export interface RunForStats {
  distance: number;
  maxSpeed: number;
  jars: number;
  playtime: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------------- leaderboard ---------------- */

export async function getTopScores(limit = 10): Promise<LeaderRow[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("id, player_name, score, distance, created_at")
      .order("score", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      playerName: r.player_name,
      score: r.score,
      distance: r.distance,
      createdAt: r.created_at,
    }));
  }
  if (HAS_SERVER) return json<LeaderRow[]>(await fetch("/api/leaderboard"));
  return readLocalBoard();
}

/** Saves a finished run. Always keeps a copy on the device too. */
export async function submitScore(playerName: string, score: number, distance: number): Promise<boolean> {
  addLocalScore(playerName, score, distance);
  if (!playerName) return dbMode === "local";
  if (supabase) {
    const { error } = await supabase.rpc("submit_score", { p_name: playerName, p_score: score, p_distance: distance });
    if (error) throw error;
    return true;
  }
  if (HAS_SERVER) {
    await json(
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, score, distance }),
      }),
    );
    return true;
  }
  return true;
}

/* ---------------- achievements ---------------- */

export async function getAchievements(): Promise<Achievement[]> {
  if (supabase) {
    const { data, error } = await supabase.from("achievements").select("*").order("points", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  if (HAS_SERVER) return json<Achievement[]>(await fetch("/api/achievements"));
  return [];
}

export async function getUnlockedIds(playerName: string): Promise<string[]> {
  if (supabase) {
    const { data, error } = await supabase.from("player_achievements").select("achievement_id").eq("player_name", playerName);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.achievement_id);
  }
  if (HAS_SERVER) {
    const rows = await json<any[]>(await fetch(`/api/player-achievements/${encodeURIComponent(playerName)}`));
    return rows.map((r) => r.achievement_id);
  }
  return [];
}

export async function unlockAchievement(playerName: string, achievementId: string, progress: number) {
  if (supabase) {
    const { error } = await supabase
      .from("player_achievements")
      .insert({ player_name: playerName, achievement_id: achievementId, progress });
    // a duplicate means it was already unlocked: fine
    if (error && error.code !== "23505") throw error;
    return;
  }
  if (HAS_SERVER) {
    await fetch("/api/player-achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: playerName, achievement_id: achievementId, progress }),
    });
  }
}

export async function getPlayerStats(playerName: string): Promise<PlayerStats | null> {
  if (supabase) {
    const { data, error } = await supabase.from("player_stats").select("*").eq("player_name", playerName).maybeSingle();
    if (error) throw error;
    return data;
  }
  if (HAS_SERVER) return json<PlayerStats>(await fetch(`/api/player-stats/${encodeURIComponent(playerName)}`));
  return null;
}

/** Adds one finished run to the player's lifetime stats; returns the new totals. */
export async function recordRun(playerName: string, r: RunForStats): Promise<PlayerStats | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc("record_run", {
      p_name: playerName,
      p_distance: r.distance,
      p_max_speed: r.maxSpeed,
      p_collectibles: r.jars,
      p_playtime: r.playtime,
    });
    if (error) throw error;
    return data as PlayerStats;
  }
  if (HAS_SERVER) {
    return json<PlayerStats>(
      await fetch("/api/player-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName,
          total_distance: r.distance,
          max_speed: r.maxSpeed,
          total_collectibles: r.jars,
          total_games: 1,
          total_crashes: 1,
          playtime_seconds: r.playtime,
        }),
      }),
    );
  }
  return null;
}
