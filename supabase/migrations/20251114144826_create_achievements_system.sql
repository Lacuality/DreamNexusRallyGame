/*
  # Achievements System

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `name` (text) - Achievement name
      - `description` (text) - Achievement description
      - `icon` (text) - Icon identifier
      - `requirement_type` (text) - Type of requirement (distance, speed, collectibles, etc.)
      - `requirement_value` (integer) - Value needed to unlock
      - `points` (integer) - Points awarded
      - `created_at` (timestamptz)
    
    - `player_achievements`
      - `id` (uuid, primary key)
      - `player_name` (text) - Player identifier
      - `achievement_id` (uuid) - Foreign key to achievements
      - `unlocked_at` (timestamptz)
      - `progress` (integer) - Current progress toward achievement
    
    - `player_stats`
      - `player_name` (text, primary key) - Player identifier
      - `total_distance` (integer) - Lifetime distance traveled
      - `max_speed` (integer) - Maximum speed achieved
      - `total_collectibles` (integer) - Total collectibles gathered
      - `total_games` (integer) - Number of games played
      - `total_crashes` (integer) - Number of crashes
      - `playtime_seconds` (integer) - Total playtime
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for achievements table
    - Players can read their own achievement progress
    - Players can update their own stats and achievements

  3. Important Notes
    - This system tracks player progress without requiring authentication
    - Player names are used as identifiers (stored in localStorage)
    - Achievements are predefined and can be unlocked by any player
*/

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  points integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  progress integer DEFAULT 0,
  UNIQUE(player_name, achievement_id)
);

CREATE TABLE IF NOT EXISTS player_stats (
  player_name text PRIMARY KEY,
  total_distance integer DEFAULT 0,
  max_speed integer DEFAULT 0,
  total_collectibles integer DEFAULT 0,
  total_games integer DEFAULT 0,
  total_crashes integer DEFAULT 0,
  playtime_seconds integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements"
  ON achievements FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can read player achievements"
  ON player_achievements FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert their achievements"
  ON player_achievements FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update their achievements"
  ON player_achievements FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read player stats"
  ON player_stats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert their stats"
  ON player_stats FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update their stats"
  ON player_stats FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, points) VALUES
  ('Speed Demon', 'Reach 180 km/h', '⚡', 'max_speed', 180, 15),
  ('Marathon Runner', 'Travel 5000 meters in one run', '🏃', 'distance', 5000, 20),
  ('Collector', 'Collect 20 arequipe jars in one run', '🍯', 'collectibles', 20, 15),
  ('Survivor', 'Travel 2000 meters without crashing', '🛡️', 'distance_no_crash', 2000, 25),
  ('Nitro Master', 'Use nitro boost 10 times in one run', '🔥', 'nitro_uses', 10, 10),
  ('First Steps', 'Complete your first game', '👣', 'games_played', 1, 5),
  ('Dedicated Racer', 'Play 10 games', '🎮', 'games_played', 10, 15),
  ('Long Hauler', 'Travel 10000 meters in one run', '🌟', 'distance', 10000, 30),
  ('Jar Collector', 'Collect 100 arequipe jars total', '🏆', 'total_collectibles', 100, 25),
  ('Veteran Driver', 'Play for 30 minutes total', '⏱️', 'playtime', 1800, 20)
ON CONFLICT DO NOTHING;
