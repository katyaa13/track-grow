CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  achievement_type_id INTEGER NOT NULL REFERENCES achievement_types (id),
  unlocked_at TIMESTAMP,
  UNIQUE (user_id, achievement_type_id)
);
