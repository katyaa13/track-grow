CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  tracking_type VARCHAR(20) NOT NULL CHECK (tracking_type IN ('checkbox', 'timer', 'counter')),
  frequency VARCHAR(50) NOT NULL CHECK (
    frequency IN ('daily', 'weekly', 'monthly', 'yearly')
  ),
  target_value INTEGER,
  emoji VARCHAR(10),
  color VARCHAR(7),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits (user_id);
