import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeaderboardSchema } from "../shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

  app.get("/api/achievements", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("points", { ascending: true });

      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.get("/api/player-achievements/:playerName", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const { playerName } = req.params;
      const { data, error } = await supabase
        .from("player_achievements")
        .select("*")
        .eq("player_name", playerName);

      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error("Error fetching player achievements:", error);
      res.status(500).json({ error: "Failed to fetch player achievements" });
    }
  });

  app.post("/api/player-achievements", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const { player_name, achievement_id, progress } = req.body;
      const { data, error } = await supabase
        .from("player_achievements")
        .upsert({ player_name, achievement_id, progress, unlocked_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error unlocking achievement:", error);
      res.status(500).json({ error: "Failed to unlock achievement" });
    }
  });

  app.get("/api/player-stats/:playerName", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const { playerName } = req.params;
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_name", playerName)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const newStats = {
          player_name: playerName,
          total_distance: 0,
          max_speed: 0,
          total_collectibles: 0,
          total_games: 0,
          total_crashes: 0,
          playtime_seconds: 0
        };
        res.json(newStats);
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error("Error fetching player stats:", error);
      res.status(500).json({ error: "Failed to fetch player stats" });
    }
  });

  app.post("/api/player-stats", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const stats = req.body;
      const { data: existing } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_name", stats.player_name)
        .maybeSingle();

      let result;
      if (existing) {
        const updated = {
          total_distance: Math.max(existing.total_distance + (stats.total_distance || 0), existing.total_distance),
          max_speed: Math.max(existing.max_speed, stats.max_speed || 0),
          total_collectibles: existing.total_collectibles + (stats.total_collectibles || 0),
          total_games: existing.total_games + (stats.total_games || 0),
          total_crashes: existing.total_crashes + (stats.total_crashes || 0),
          playtime_seconds: existing.playtime_seconds + (stats.playtime_seconds || 0),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from("player_stats")
          .update(updated)
          .eq("player_name", stats.player_name)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("player_stats")
          .insert(stats)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating player stats:", error);
      res.status(500).json({ error: "Failed to update player stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
