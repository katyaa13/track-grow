const { pool } = require("../config/db");

async function findByUserAndDate(userId, date) {
  const dateOnly = String(date).slice(0, 10);

  const { rows } = await pool.query(
    `SELECT h.*,
            COALESCE(hp.is_completed, FALSE) AS completed_today,
            hp.value AS completed_value,
            hp.value AS progress_value,
            hp.timer_started_at
       FROM habits h
       LEFT JOIN habit_periods hp
         ON hp.habit_id = h.id
         AND hp.period_start = CASE h.frequency
           WHEN 'weekly'  THEN DATE_TRUNC('week',  $2::date)::date
           WHEN 'monthly' THEN DATE_TRUNC('month', $2::date)::date
           WHEN 'yearly'  THEN DATE_TRUNC('year',  $2::date)::date
           ELSE $2::date
         END
      WHERE h.user_id = $1 AND h.created_at::date <= $2::date
      ORDER BY h.created_at ASC`,
    [userId, dateOnly],
  );
  return rows;
}

async function findByIdAndUser(id, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM habits WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return rows[0] || null;
}

async function findByIdAndUserWithPeriod(id, userId, date) {
  const { rows } = await pool.query(
    `SELECT h.id, h.user_id, h.name, h.emoji, h.color, h.frequency,
            h.tracking_type, h.target_value, h.created_at,
            hp.id AS period_id, hp.is_completed, hp.value AS period_value, hp.timer_started_at
       FROM habits h
       LEFT JOIN habit_periods hp ON hp.habit_id = h.id
         AND hp.period_start = CASE h.frequency
           WHEN 'weekly'  THEN DATE_TRUNC('week',  $3::date)::date
           WHEN 'monthly' THEN DATE_TRUNC('month', $3::date)::date
           WHEN 'yearly'  THEN DATE_TRUNC('year',  $3::date)::date
           ELSE $3::date
         END
      WHERE h.id = $1 AND h.user_id = $2`,
    [id, userId, date],
  );
  if (!rows[0]) return null;
  const { period_id, is_completed, period_value, timer_started_at, ...habit } =
    rows[0];
  const existing =
    period_id != null
      ? { id: period_id, is_completed, value: period_value, timer_started_at }
      : null;
  return { habit, existing };
}

async function create(
  userId,
  { name, tracking_type, frequency, target_value, emoji, color, created_at },
  client,
) {
  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO habits (user_id, name, tracking_type, frequency, target_value, emoji, color, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::date + INTERVAL '12 hours', NOW()))
     RETURNING *`,
    [
      userId,
      name,
      tracking_type,
      frequency,
      target_value || null,
      emoji || null,
      color || null,
      created_at || null,
    ],
  );
  return rows[0];
}

async function update(id, { name, emoji, color }) {
  const { rows } = await pool.query(
    `UPDATE habits
        SET name  = COALESCE($1, name),
            emoji = COALESCE($2, emoji),
            color = COALESCE($3, color)
      WHERE id = $4
      RETURNING *`,
    [name, emoji, color, id],
  );
  return rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM habits WHERE id = $1`, [id]);
}

async function findByUser(userId, habitId) {
  const q = habitId
    ? `SELECT id, created_at, frequency, tracking_type, target_value FROM habits WHERE user_id = $1 AND id = $2`
    : `SELECT id, created_at, frequency, tracking_type, target_value FROM habits WHERE user_id = $1`;
  const { rows } = await pool.query(q, habitId ? [userId, habitId] : [userId]);
  return rows;
}

module.exports = {
  findByUserAndDate,
  findByIdAndUser,
  findByIdAndUserWithPeriod,
  findByUser,
  create,
  update,
  remove,
};
