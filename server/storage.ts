import { users, type User, type InsertUser, leaderboard, type Leaderboard, type InsertLeaderboard } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTopLeaderboard(limit: number): Promise<Leaderboard[]>;
  upsertLeaderboardScore(score: InsertLeaderboard): Promise<Leaderboard>;
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

export const storage = new MemStorage();
