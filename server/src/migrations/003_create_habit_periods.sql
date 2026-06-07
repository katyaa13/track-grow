CREATE TABLE IF NOT EXISTS habit_periods (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits (id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  value INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  timer_started_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (habit_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_habit_periods_completed ON habit_periods (habit_id, period_start DESC)
WHERE
  is_completed = TRUE;
