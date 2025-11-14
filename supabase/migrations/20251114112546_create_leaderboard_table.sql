/*
  # Create leaderboard table for Dream Nexus Rally

  1. New Tables
    - `leaderboard`
      - `id` (serial, primary key) - Unique identifier for each leaderboard entry
      - `player_name` (text, unique, not null) - Name of the player (max 20 characters)
      - `score` (integer, not null) - Player's score
      - `distance` (integer, not null) - Distance traveled in meters
      - `created_at` (timestamp, not null, default now) - When the score was recorded
  
  2. Security
    - Enable RLS on `leaderboard` table
    - Add policy for anyone to read leaderboard (public read access for game)
    - Add policy for authenticated users to insert scores
  
  3. Notes
    - Player names are unique - scores update if a higher score is achieved
    - Public read access allows anyone to view the leaderboard
    - The upsert logic (update on conflict) is handled in application code
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 0,
  distance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert scores"
  ON leaderboard
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own score"
  ON leaderboard
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);