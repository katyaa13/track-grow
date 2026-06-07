const { pool } = require("../config/db");
const { getPeriodKey, areConsecutivePeriods } = require("../utils/periods");

async function recalculateBothStreaks(
  habitId,
  frequency,
  client,
  effectiveDate = null,
) {
  const db = client || pool;
  const { rows: completions } = await db.query(
    `SELECT period_start FROM habit_periods WHERE habit_id = $1 AND is_completed = TRUE ORDER BY period_start DESC`,
    [habitId],
  );

  let current = 0;
  let best = 0;

  if (completions.length > 0) {
    const keys = completions.map((c) =>
      getPeriodKey(c.period_start, frequency),
    );

    // Current streak: walk backward from most recent until a gap
    current = 1;
    for (let i = 0; i < keys.length - 1; i++) {
      if (areConsecutivePeriods(keys[i + 1], keys[i], frequency)) {
        current++;
      } else {
        break;
      }
    }

    // Best streak: scan all periods
    const keysAsc = keys.slice().reverse();
    let run = 1;
    best = 1;
    for (let i = 1; i < keysAsc.length; i++) {
      if (areConsecutivePeriods(keysAsc[i - 1], keysAsc[i], frequency)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 1;
      }
    }
  }

  await db.query(
    `UPDATE streaks
        SET current_streak = $1,
            best_streak    = $2,
            updated_at     = COALESCE($4::date + INTERVAL '12 hours', NOW())
      WHERE habit_id = $3`,
    [current, best, habitId, effectiveDate],
  );
  return { current_streak: current, best_streak: best };
}

async function create(habitId, client) {
  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO streaks (habit_id) VALUES ($1) RETURNING *`,
    [habitId],
  );
  return rows[0];
}

const activeWindowExpr = `
  CASE h.frequency
    WHEN 'daily'   THEN DATE(lc.last_recorded_at) >= CURRENT_DATE - 1
    WHEN 'weekly'  THEN DATE_TRUNC('week',  lc.last_recorded_at) >= DATE_TRUNC('week',  NOW()) - INTERVAL '7 days'
    WHEN 'monthly' THEN DATE_TRUNC('month', lc.last_recorded_at) >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    WHEN 'yearly'  THEN DATE_TRUNC('year',  lc.last_recorded_at) >= DATE_TRUNC('year',  NOW()) - INTERVAL '1 year'
    ELSE DATE(lc.last_recorded_at) >= CURRENT_DATE - 1
  END`;

const lastCompletedExpr = `SELECT MAX(period_start) AS last_recorded_at FROM habit_periods WHERE habit_id = h.id AND is_completed = TRUE`;

async function fetchStats(userId, habitId) {
  const params = habitId ? [userId, habitId] : [userId];

  const currentQ = habitId
    ? `SELECT CASE WHEN lc.last_recorded_at IS NOT NULL AND (${activeWindowExpr})
              THEN s.current_streak ELSE 0 END AS current_streak,
              h.name, h.emoji, h.color
       FROM streaks s
       JOIN habits h ON s.habit_id = h.id
       JOIN LATERAL (${lastCompletedExpr}) lc ON TRUE
       WHERE h.user_id = $1 AND h.id = $2 ORDER BY current_streak DESC LIMIT 1`
    : `SELECT s.current_streak, h.name, h.emoji, h.color
       FROM streaks s
       JOIN habits h ON s.habit_id = h.id
       JOIN LATERAL (${lastCompletedExpr}) lc ON TRUE
       WHERE h.user_id = $1 AND s.current_streak > 0
         AND lc.last_recorded_at IS NOT NULL AND (${activeWindowExpr})
       ORDER BY s.current_streak DESC LIMIT 1`;

  const bestQ = habitId
    ? `SELECT s.best_streak, h.name, h.emoji, h.color
       FROM streaks s JOIN habits h ON s.habit_id = h.id
       WHERE h.user_id = $1 AND h.id = $2 ORDER BY s.best_streak DESC LIMIT 1`
    : `SELECT s.best_streak, h.name, h.emoji, h.color
       FROM streaks s JOIN habits h ON s.habit_id = h.id
       WHERE h.user_id = $1 ORDER BY s.best_streak DESC LIMIT 1`;

  const currentStreaksQ = `
    SELECT s.habit_id, s.current_streak, s.best_streak,
           h.name AS habit_name, h.emoji AS habit_emoji, h.color AS habit_color, p.level
    FROM streaks s
    JOIN habits h ON s.habit_id = h.id
    JOIN plants p ON p.habit_id = h.id
    JOIN LATERAL (${lastCompletedExpr}) lc ON TRUE
    WHERE h.user_id = $1 AND s.current_streak > 0 AND p.status = 'active'
      AND lc.last_recorded_at IS NOT NULL AND (${activeWindowExpr})
      ${habitId ? "AND h.id = $2" : ""}
    ORDER BY s.current_streak DESC`;

  const [
    {
      rows: [currentBest],
    },
    {
      rows: [bestEver],
    },
    { rows: currentStreaks },
  ] = await Promise.all([
    pool.query(currentQ, params),
    pool.query(bestQ, params),
    pool.query(currentStreaksQ, params),
  ]);

  return { currentBest, bestEver, currentStreaks };
}

module.exports = {
  create,
  recalculateBothStreaks,
  fetchStats,
};
