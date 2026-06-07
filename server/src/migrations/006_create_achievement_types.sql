CREATE TABLE IF NOT EXISTS achievement_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('basic', 'advanced', 'rare')),
  target_value INTEGER NOT NULL DEFAULT 1
);
