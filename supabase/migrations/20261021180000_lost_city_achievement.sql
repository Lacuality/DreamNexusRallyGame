-- New achievement for the 4th region (Ciudad Perdida starts at 2400 m). Safe to run again.
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value, points)
SELECT 'Lost City Explorer', 'Reach Ciudad Perdida in one run (2400 m)', '🗿', 'distance', 2400, 25
WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE name = 'Lost City Explorer');
