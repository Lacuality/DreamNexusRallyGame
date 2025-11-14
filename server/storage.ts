import { users, type User, type InsertUser, leaderboard, type Leaderboard, type InsertLeaderboard } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTopLeaderboard(limit: number): Promise<Leaderboard[]>;
  upsertLeaderboardScore(score: InsertLeaderboard): Promise<Leaderboard>;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

class SupabaseStorage implements IStorage {
  private supabase;

  constructor() {
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase credentials not found, using fallback storage");
      throw new Error("Supabase not configured");
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user:", error);
      return undefined;
    }
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user by username:", error);
      return undefined;
    }
    return data || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from("users")
      .insert(insertUser)
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }
    return data;
  }

  async getTopLeaderboard(limit: number): Promise<Leaderboard[]> {
    const { data, error } = await this.supabase
      .from("leaderboard")
      .select("*")
      .order("score", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
    return data.map(row => ({
      id: row.id,
      playerName: row.player_name,
      score: row.score,
      distance: row.distance,
      createdAt: new Date(row.created_at),
    }));
  }

  async upsertLeaderboardScore(scoreData: InsertLeaderboard): Promise<Leaderboard> {
    const { data: existing } = await this.supabase
      .from("leaderboard")
      .select("*")
      .eq("player_name", scoreData.playerName)
      .maybeSingle();

    if (existing && existing.score >= scoreData.score) {
      return {
        id: existing.id,
        playerName: existing.player_name,
        score: existing.score,
        distance: existing.distance,
        createdAt: new Date(existing.created_at),
      };
    }

    const { data, error } = await this.supabase
      .from("leaderboard")
      .upsert({
        player_name: scoreData.playerName,
        score: scoreData.score,
        distance: scoreData.distance,
      }, {
        onConflict: "player_name",
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting leaderboard score:", error);
      throw error;
    }

    return {
      id: data.id,
      playerName: data.player_name,
      score: data.score,
      distance: data.distance,
      createdAt: new Date(data.created_at),
    };
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private leaderboardScores: Map<string, Leaderboard>;
  currentId: number;
  currentLeaderboardId: number;

  constructor() {
    this.users = new Map();
    this.leaderboardScores = new Map();
    this.currentId = 1;
    this.currentLeaderboardId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTopLeaderboard(limit: number): Promise<Leaderboard[]> {
    const scores = Array.from(this.leaderboardScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scores;
  }

  async upsertLeaderboardScore(scoreData: InsertLeaderboard): Promise<Leaderboard> {
    const existing = this.leaderboardScores.get(scoreData.playerName);

    if (existing && existing.score >= scoreData.score) {
      return existing;
    }

    const newScore: Leaderboard = {
      id: existing?.id || this.currentLeaderboardId++,
      playerName: scoreData.playerName,
      score: scoreData.score,
      distance: scoreData.distance,
      createdAt: new Date(),
    };

    this.leaderboardScores.set(scoreData.playerName, newScore);
    return newScore;
  }
}

let storage: IStorage;

try {
  storage = new SupabaseStorage();
  console.log("Using Supabase storage");
} catch (error) {
  console.log("Falling back to in-memory storage");
  storage = new MemStorage();
}

export { storage };
