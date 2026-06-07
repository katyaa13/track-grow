const { pool } = require("../config/db");
const { getPeriodStart } = require("../utils/periods");

async function findByPeriod(habitId, date, frequency, client) {
  const db = client || pool;
  const periodStart = getPeriodStart(
    String(date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    frequency,
  );
  const { rows } = await db.query(
    `SELECT id, value, is_completed, timer_started_at FROM habit_periods WHERE habit_id = $1 AND period_start = $2`,
    [habitId, periodStart],
  );
  return rows[0] || null;
}

async function updateValue(id, value, client) {
  const db = client || pool;
  await db.query(
    `UPDATE habit_periods SET value = $1, timer_started_at = NULL WHERE id = $2`,
    [value, id],
  );
}

async function deleteByPeriod(habitId, date, frequency, client) {
  const db = client || pool;
  const periodStart = getPeriodStart(String(date).slice(0, 10), frequency);
  await db.query(
    `DELETE FROM habit_periods WHERE habit_id = $1 AND period_start = $2`,
    [habitId, periodStart],
  );
}

async function upsertValue(habitId, date, value, frequency, client) {
  const db = client || pool;
  const periodStart = getPeriodStart(
    String(date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    frequency,
  );

  const { rows } = await db.query(
    `INSERT INTO habit_periods (habit_id, period_start, recorded_at, value)
     VALUES ($1, $2, $2::date + INTERVAL '12 hours', $3)
     ON CONFLICT (habit_id, period_start)
     DO UPDATE SET value = EXCLUDED.value, timer_started_at = NULL
     RETURNING id, value, is_completed`,
    [habitId, periodStart, value],
  );
  return rows[0] || null;
}

async function startTimer(habitId, date, frequency, client) {
  const db = client || pool;
  const periodStart = getPeriodStart(
    String(date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    frequency,
  );
  const { rows } = await db.query(
    `INSERT INTO habit_periods (habit_id, period_start, recorded_at, timer_started_at)
     VALUES ($1, $2, $2::date + INTERVAL '12 hours', NOW())
     ON CONFLICT (habit_id, period_start)
     DO UPDATE SET timer_started_at = COALESCE(habit_periods.timer_started_at, NOW())
     RETURNING id, value, timer_started_at`,
    [habitId, periodStart],
  );
  return rows[0] || null;
}

async function findByHabitIds(ids) {
  if (!ids.length) return [];
  const { rows } = await pool.query(
    `SELECT habit_id, recorded_at, value, period_start, is_completed FROM habit_periods WHERE habit_id = ANY($1)`,
    [ids],
  );
  return rows;
}

async function findCurrentCompletionRate(userId) {
  const {
    rows: [row],
  } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM habit_periods hp WHERE hp.habit_id = h.id
         AND hp.period_start = CASE h.frequency
           WHEN 'weekly'  THEN DATE_TRUNC('week',  CURRENT_DATE)::date
           WHEN 'monthly' THEN DATE_TRUNC('month', CURRENT_DATE)::date
           WHEN 'yearly'  THEN DATE_TRUNC('year',  CURRENT_DATE)::date
           ELSE CURRENT_DATE
         END
         AND hp.is_completed = TRUE
       )) AS completed_now,
       COUNT(*) AS total
     FROM habits h WHERE h.user_id = $1`,
    [userId],
  );
  return row;
}

async function findByHabitAndRange(habitId, from, to) {
  const { rows } = await pool.query(
    `SELECT period_start, value FROM habit_periods
     WHERE habit_id = $1 AND period_start >= $2 AND period_start <= $3`,
    [habitId, from, to],
  );
  return rows;
}

async function countCompletedByHabitIds(ids) {
  if (!ids.length) return [];
  const { rows } = await pool.query(
    `SELECT habit_id, COUNT(*)::int AS completed_count
     FROM habit_periods
     WHERE habit_id = ANY($1) AND is_completed = TRUE
     GROUP BY habit_id`,
    [ids],
  );
  return rows;
}

async function findCompletedByHabitIdsAndRange(ids, from, to) {
  if (!ids.length) return [];
  const { rows } = await pool.query(
    `SELECT habit_id, period_start
     FROM habit_periods
     WHERE habit_id = ANY($1) AND is_completed = TRUE
       AND period_start >= $2 AND period_start <= $3`,
    [ids, from, to],
  );
  return rows;
}

module.exports = {
  findByPeriod,
  updateValue,
  deleteByPeriod,
  upsertValue,
  startTimer,
  findByHabitIds,
  countCompletedByHabitIds,
  findCompletedByHabitIdsAndRange,
  findCurrentCompletionRate,
  findByHabitAndRange,
};
