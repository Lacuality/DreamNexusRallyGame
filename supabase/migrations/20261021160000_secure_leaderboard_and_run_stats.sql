/*
  # Secure leaderboard + run stats (for the GitHub Pages version)

  The game now talks to Supabase straight from the browser using the public
  "anon" key. The old policies let anyone overwrite ANY row, so:

  1. Leaderboard
    - Remove direct insert/update for anon users.
    - Add `submit_score(...)`: the only way to write a score. It keeps each
      player's BEST score (never lowers it) and rejects silly values.

  2. Player stats
    - Remove direct insert/update for anon users.
    - Add `record_run(...)`: adds one finished run to a player's lifetime
      stats (only ever increases them).

  3. Achievements
    - Player achievements stay insert-only (no more updating/stealing rows).

  Safe to run more than once.
*/

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
