INSERT INTO achievement_types (code, title, description, difficulty, target_value) VALUES
  ('first_habit',      'First Step',      'Create your first habit',             'basic',    1),
  ('first_completion', 'First Done',      'Complete a habit for the first time', 'basic',    1),
  ('streak_3',         '3-Day Streak',    'Complete a habit 3 days in a row',    'basic',    3),
  ('habits_3',         'Triple Threat',   'Have 3 active habits',                'basic',    3),
  ('drops_50',         'Water Collector', 'Earn 50 drops',                       'basic',   50),
  ('streak_7',         'Week Warrior',    'Complete a habit 7 days in a row',    'advanced', 7),
  ('completions_50',   'Fifty Strong',    'Complete habits 50 times total',      'advanced',50),
  ('productive_day',   'Productive Day',  'Complete 5 habits in a single day',   'advanced', 5),
  ('streak_30',        'Monthly Master',  'Complete a habit 30 days in a row',   'rare',    30),
  ('max_plant',        'Full Bloom',      'Grow a plant to level 6',             'rare',     6),
  ('completions_100',  'Century Club',    'Complete habits 100 times total',     'rare',   100)
ON CONFLICT (code) DO NOTHING;