-- Dream Nexus Rally: complete database setup.
-- Paste ALL of this into Supabase → SQL Editor → New query → Run.
-- Safe to run again (it won't duplicate anything).

-- ===== 1. Leaderboard =====
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 0,
  distance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard;
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert scores" ON leaderboard;
CREATE POLICY "Anyone can insert scores"
  ON leaderboard
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their own score" ON leaderboard;
CREATE POLICY "Anyone can update their own score"
  ON leaderboard
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);;

-- ===== 2. Achievements + player stats =====
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

DROP POLICY IF EXISTS "Anyone can read achievements" ON achievements;
CREATE POLICY "Anyone can read achievements"
  ON achievements FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can read player achievements" ON player_achievements;
CREATE POLICY "Anyone can read player achievements"
  ON player_achievements FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert their achievements" ON player_achievements;
CREATE POLICY "Anyone can insert their achievements"
  ON player_achievements FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their achievements" ON player_achievements;
CREATE POLICY "Anyone can update their achievements"
  ON player_achievements FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read player stats" ON player_stats;
CREATE POLICY "Anyone can read player stats"
  ON player_stats FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert their stats" ON player_stats;
CREATE POLICY "Anyone can insert their stats"
  ON player_stats FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their stats" ON player_stats;
CREATE POLICY "Anyone can update their stats"
  ON player_stats FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, points)
SELECT * FROM (VALUES
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
) AS v(name, description, icon, requirement_type, requirement_value, points)
WHERE NOT EXISTS (SELECT 1 FROM achievements a WHERE a.name = v.name);

-- ===== 3. Security: only safe functions can write scores/stats =====
-- ---------- leaderboard ----------
DROP POLICY IF EXISTS "Anyone can insert scores" ON leaderboard;
DROP POLICY IF EXISTS "Anyone can update their own score" ON leaderboard;

CREATE OR REPLACE FUNCTION submit_score(p_name text, p_score integer, p_distance integer)
RETURNS leaderboard
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text := left(btrim(p_name), 20);
  result leaderboard;
BEGIN
  IF clean_name IS NULL OR length(clean_name) = 0 THEN
    RAISE EXCEPTION 'name required';
  END IF;
  IF p_score < 0 OR p_score > 5000000 OR p_distance < 0 OR p_distance > 1000000 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;

  INSERT INTO leaderboard (player_name, score, distance)
  VALUES (clean_name, p_score, p_distance)
  ON CONFLICT (player_name) DO UPDATE
    SET score = GREATEST(leaderboard.score, EXCLUDED.score),
        distance = CASE WHEN EXCLUDED.score > leaderboard.score THEN EXCLUDED.distance ELSE leaderboard.distance END,
        created_at = CASE WHEN EXCLUDED.score > leaderboard.score THEN now() ELSE leaderboard.created_at END
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_score(text, integer, integer) TO anon, authenticated;

-- ---------- player stats ----------
DROP POLICY IF EXISTS "Anyone can insert their stats" ON player_stats;
DROP POLICY IF EXISTS "Anyone can update their stats" ON player_stats;

CREATE OR REPLACE FUNCTION record_run(
  p_name text,
  p_distance integer,
  p_max_speed integer,
  p_collectibles integer,
  p_playtime integer
)
RETURNS player_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_name text := left(btrim(p_name), 20);
  result player_stats;
BEGIN
  IF clean_name IS NULL OR length(clean_name) = 0 THEN
    RAISE EXCEPTION 'name required';
  END IF;

  INSERT INTO player_stats (player_name, total_distance, max_speed, total_collectibles, total_games, total_crashes, playtime_seconds)
  VALUES (
    clean_name,
    LEAST(GREATEST(p_distance, 0), 1000000),
    LEAST(GREATEST(p_max_speed, 0), 400),
    LEAST(GREATEST(p_collectibles, 0), 10000),
    1,
    1,
    LEAST(GREATEST(p_playtime, 0), 36000)
  )
  ON CONFLICT (player_name) DO UPDATE SET
    total_distance = player_stats.total_distance + EXCLUDED.total_distance,
    max_speed = GREATEST(player_stats.max_speed, EXCLUDED.max_speed),
    total_collectibles = player_stats.total_collectibles + EXCLUDED.total_collectibles,
    total_games = player_stats.total_games + 1,
    total_crashes = player_stats.total_crashes + 1,
    playtime_seconds = player_stats.playtime_seconds + EXCLUDED.playtime_seconds,
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION record_run(text, integer, integer, integer, integer) TO anon, authenticated;

-- ---------- achievements ----------
DROP POLICY IF EXISTS "Anyone can update their achievements" ON player_achievements;

-- ===== 4. Ciudad Perdida achievement =====
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, points)
SELECT 'Lost City Explorer', 'Reach Ciudad Perdida in one run (2400 m)', '🗿', 'distance', 2400, 25
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE name = 'Lost City Explorer');

-- ===== 5. Achievements for circuits, tunjos and exploring =====
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, points)
SELECT * FROM (VALUES
  ('El Dorado', 'Find a golden Tunjo', '🗿', 'tunjos', 1, 20),
  ('Campeón', 'Win a circuit race', '🏆', 'circuit_wins', 1, 25),
  ('Explorador de Colombia', 'Visit all 7 regions of Colombia', '🇨🇴', 'regions', 7, 40)
) AS v(name, description, icon, requirement_type, requirement_value, points)
WHERE NOT EXISTS (SELECT 1 FROM achievements a WHERE a.name = v.name);
