const { pool } = require("../config/db");
const { POINTS_BY_DIFFICULTY } = require("../config/achievements");

async function fetchConditions(userId, today) {
  if (!today) {
    const _now = new Date();
    today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  }

  const {
    rows: [r],
  } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM habits WHERE user_id = $1)                                                                                   AS habit_count,
       (SELECT COUNT(*)::int FROM habit_periods hp JOIN habits h ON hp.habit_id = h.id WHERE h.user_id = $1 AND hp.is_completed = TRUE)         AS completion_count,
       (SELECT COALESCE(MAX(s.best_streak), 0) FROM streaks s JOIN habits h ON s.habit_id = h.id WHERE h.user_id = $1)                          AS best_streak,
       (SELECT COALESCE(MAX(p.level), 0) FROM plants p JOIN habits h ON p.habit_id = h.id WHERE h.user_id = $1)                         AS plant_max_level,
       (SELECT COALESCE(drops_balance, 0) FROM users WHERE id = $1)                                                                        AS drops_balance,
       (SELECT COUNT(DISTINCT hp.habit_id)::int FROM habit_periods hp JOIN habits h ON hp.habit_id = h.id WHERE h.user_id = $1 AND hp.is_completed = TRUE AND hp.period_start = $2) AS today_done`,
    [userId, today],
  );

  return {
    first_habit: r.habit_count >= 1,
    first_completion: r.completion_count >= 1,
    streak_3: r.best_streak >= 3,
    streak_7: r.best_streak >= 7,
    streak_30: r.best_streak >= 30,
    habits_3: r.habit_count >= 3,
    drops_50: r.drops_balance >= 50,
    completions_50: r.completion_count >= 50,
    completions_100: r.completion_count >= 100,
    productive_day: r.today_done >= 5,
    max_plant: r.plant_max_level >= 6,
  };
}

async function findLocked(userId) {
  const { rows } = await pool.query(
    `SELECT at2.code, at2.title, at2.description, at2.difficulty
       FROM user_achievements ua
       JOIN achievement_types at2 ON ua.achievement_type_id = at2.id
      WHERE ua.user_id = $1 AND ua.unlocked_at IS NULL`,
    [userId],
  );
  return rows;
}

async function findUnlocked(userId) {
  const { rows } = await pool.query(
    `SELECT at2.code, at2.difficulty FROM user_achievements ua
       JOIN achievement_types at2 ON ua.achievement_type_id = at2.id
      WHERE ua.user_id = $1 AND ua.unlocked_at IS NOT NULL`,
    [userId],
  );
  return rows;
}

async function initForUser(userId) {
  await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_type_id)
     SELECT $1, id FROM achievement_types
     ON CONFLICT DO NOTHING`,
    [userId],
  );
}

async function unlock(userId, code) {
  const { rowCount } = await pool.query(
    `UPDATE user_achievements ua
        SET unlocked_at = NOW()
       FROM achievement_types at2
      WHERE ua.achievement_type_id = at2.id
        AND at2.code = $1
        AND ua.user_id = $2
        AND ua.unlocked_at IS NULL`,
    [code, userId],
  );
  return rowCount;
}

async function unlockBatch(userId, codes) {
  if (!codes.length) return [];
  const { rows } = await pool.query(
    `UPDATE user_achievements ua
        SET unlocked_at = NOW()
       FROM achievement_types at2
      WHERE ua.achievement_type_id = at2.id
        AND at2.code = ANY($1)
        AND ua.user_id = $2
        AND ua.unlocked_at IS NULL
      RETURNING at2.code`,
    [codes, userId],
  );
  return rows.map((r) => r.code);
}

async function relock(userId, code) {
  const { rowCount } = await pool.query(
    `UPDATE user_achievements ua
        SET unlocked_at = NULL
       FROM achievement_types at2
      WHERE ua.achievement_type_id = at2.id
        AND at2.code = $1
        AND ua.user_id = $2
        AND ua.unlocked_at IS NOT NULL`,
    [code, userId],
  );
  return rowCount;
}

async function relockBatch(userId, codes) {
  if (!codes.length) return [];
  const { rows } = await pool.query(
    `UPDATE user_achievements ua
        SET unlocked_at = NULL
       FROM achievement_types at2
      WHERE ua.achievement_type_id = at2.id
        AND at2.code = ANY($1)
        AND ua.user_id = $2
        AND ua.unlocked_at IS NOT NULL
      RETURNING at2.code`,
    [codes, userId],
  );
  return rows.map((r) => r.code);
}

async function findAllForUser(userId) {
  const { rows } = await pool.query(
    `SELECT
       at2.id, at2.code, at2.title, at2.description,
       at2.difficulty, at2.target_value,
       ua.unlocked_at IS NOT NULL AS unlocked,
       CASE at2.code
         WHEN 'first_habit' THEN LEAST((SELECT COUNT(*) FROM habits WHERE user_id = $1), at2.target_value)
         WHEN 'first_completion' THEN LEAST((SELECT COUNT(*) FROM habit_periods hp JOIN habits h ON hp.habit_id = h.id WHERE h.user_id = $1 AND hp.is_completed = TRUE), 1)
         WHEN 'streak_3' THEN LEAST((SELECT COALESCE(MAX(best_streak), 0) FROM streaks s JOIN habits h ON s.habit_id = h.id WHERE h.user_id = $1), at2.target_value)
         WHEN 'streak_7' THEN LEAST((SELECT COALESCE(MAX(best_streak), 0) FROM streaks s JOIN habits h ON s.habit_id = h.id WHERE h.user_id = $1), at2.target_value)
         WHEN 'streak_30' THEN LEAST((SELECT COALESCE(MAX(best_streak), 0) FROM streaks s JOIN habits h ON s.habit_id = h.id WHERE h.user_id = $1), at2.target_value)
         WHEN 'habits_3' THEN LEAST((SELECT COUNT(*) FROM habits WHERE user_id = $1), at2.target_value)
         WHEN 'drops_50' THEN LEAST((SELECT COALESCE(drops_balance, 0) FROM users WHERE id = $1), at2.target_value)
         WHEN 'completions_50' THEN LEAST((SELECT COUNT(*) FROM habit_periods hp JOIN habits h ON hp.habit_id = h.id WHERE h.user_id = $1 AND hp.is_completed = TRUE), at2.target_value)
         WHEN 'completions_100' THEN LEAST((SELECT COUNT(*) FROM habit_periods hp JOIN habits h ON hp.habit_id = h.id WHERE h.user_id = $1 AND hp.is_completed = TRUE), at2.target_value)
         WHEN 'productive_day' THEN LEAST(
           (
             SELECT COUNT(DISTINCT hp.habit_id)
             FROM habit_periods hp
             JOIN habits h ON hp.habit_id = h.id
             WHERE h.user_id = $1
               AND hp.is_completed = TRUE
               AND DATE(hp.recorded_at) = CURRENT_DATE
           ),
           at2.target_value
         )
         WHEN 'max_plant' THEN LEAST((SELECT COALESCE(MAX(level), 0) FROM plants p JOIN habits h ON p.habit_id = h.id WHERE h.user_id = $1), at2.target_value)
         ELSE 0
       END AS progress_current
     FROM achievement_types at2
     JOIN user_achievements ua ON ua.achievement_type_id = at2.id
     WHERE ua.user_id = $1
     ORDER BY at2.difficulty, at2.id`,
    [userId],
  );

  return rows.map((r) => ({
    ...r,
    points: POINTS_BY_DIFFICULTY[r.difficulty] ?? 100,
    progress_current: Number(r.progress_current),
  }));
}

module.exports = {
  initForUser,
  unlock,
  unlockBatch,
  relock,
  relockBatch,
  findAllForUser,
  fetchConditions,
  findLocked,
  findUnlocked,
};
