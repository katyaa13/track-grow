const { pool } = require("../config/db");

async function create(habitId, client) {
  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO plants (habit_id, level) VALUES ($1, 1) RETURNING *`,
    [habitId],
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT p.*,
            h.name AS habit_name,
            h.emoji AS habit_emoji,
            h.color AS habit_color,
            h.frequency,
            h.created_at AS habit_created_at,
            (SELECT MAX(hp.period_start) FROM habit_periods hp
               WHERE hp.habit_id = h.id AND hp.is_completed = TRUE
            ) AS last_completion_at,
            s.current_streak,
            CASE
              WHEN p.status = 'dead' THEN NULL
              WHEN p.level >= 6 THEN NULL
              ELSE 3 - (COALESCE(s.current_streak, 0) % 3)
            END AS completions_to_next_level
       FROM plants p
       JOIN habits h ON p.habit_id = h.id
       LEFT JOIN streaks s ON s.habit_id = h.id
      WHERE h.user_id = $1
      ORDER BY h.created_at ASC`,
    [userId],
  );
  return rows;
}

async function findByIdAndUser(plantId, userId) {
  const { rows } = await pool.query(
    `SELECT p.*, h.name AS habit_name, h.emoji AS habit_emoji,
            h.color AS habit_color, h.frequency, h.created_at AS habit_created_at,
            h.target_value,
            (SELECT MAX(hp.period_start) FROM habit_periods hp
               WHERE hp.habit_id = h.id AND hp.is_completed = TRUE
            ) AS last_completion_at,
            s.current_streak
       FROM plants p
       JOIN habits h ON p.habit_id = h.id
       LEFT JOIN streaks s ON s.habit_id = h.id
      WHERE p.id = $1 AND h.user_id = $2`,
    [plantId, userId],
  );
  return rows[0] || null;
}

async function batchUpdate(updates) {
  if (!updates.length) return;
  const ids = updates.map((u) => u.id);
  const statuses = updates.map((u) => u.status);
  const levels = updates.map((u) => u.level);

  await pool.query(
    `UPDATE plants SET
       status     = v.status,
       level      = v.level,
       updated_at = NOW()
     FROM (
       SELECT UNNEST($1::int[]) AS id,
              UNNEST($2::text[]) AS status,
              UNNEST($3::int[]) AS level
     ) AS v
     WHERE plants.id = v.id`,
    [ids, statuses, levels],
  );
}

module.exports = { create, findByUserId, findByIdAndUser, batchUpdate };
