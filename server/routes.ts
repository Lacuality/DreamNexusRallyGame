import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeaderboardSchema } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const topScores = await storage.getTopLeaderboard(10);
      res.json(topScores);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.post("/api/leaderboard", async (req, res) => {
    try {
      const validatedData = insertLeaderboardSchema.parse(req.body);
      const result = await storage.upsertLeaderboardScore(validatedData);
      res.json(result);
    } catch (error) {
      console.error("Error submitting score:", error);
      if (error instanceof Error && 'issues' in error) {
        res.status(422).json({ error: "Invalid score data", details: error });
      } else {
        res.status(500).json({ error: "Failed to save score" });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
