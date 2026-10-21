-- Achievements for the new modes and regions. Safe to run again.
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, points)
SELECT * FROM (VALUES
  ('El Dorado', 'Find a golden Tunjo', '🗿', 'tunjos', 1, 20),
  ('Campeón', 'Win a circuit race', '🏆', 'circuit_wins', 1, 25),
  ('Explorador de Colombia', 'Visit all 7 regions of Colombia', '🇨🇴', 'regions', 7, 40)
) AS v(name, description, icon, requirement_type, requirement_value, points)
WHERE NOT EXISTS (SELECT 1 FROM achievements a WHERE a.name = v.name);
