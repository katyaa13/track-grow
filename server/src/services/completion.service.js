const { pool } = require("../config/db");
const habitRepo = require("../repositories/habit.repository");
const periodRepo = require("../repositories/period.repository");
const streakRepo = require("../repositories/streak.repository");
const userRepo = require("../repositories/user.repository");
const {
  getPeriodKey,
  areConsecutivePeriods,
  getPeriodStart,
} = require("../utils/periods");
const achievementService = require("./achievement.service");
const { levelFromStreak } = require("../utils/plant");

async function complete(userId, habitId, value, date, today) {
  const d = date || new Date().toISOString().slice(0, 10);
  const found = await habitRepo.findByIdAndUserWithPeriod(habitId, userId, d);
  if (!found) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }
  const { habit, existing } = found;

  const habitCreatedAt = new Date(habit.created_at).toISOString().slice(0, 10);
  if (d < habitCreatedAt) {
    const e = new Error("Cannot complete habit before its creation date");
    e.status = 400;
    throw e;
  }

  const alreadyDone = existing?.is_completed === true;

  if (alreadyDone) {
    if (habit.tracking_type === "checkbox") {
      const e = new Error("Already completed for this period");
      e.status = 409;
      throw e;
    }
    await periodRepo.updateValue(existing.id, value);
    const user = await userRepo.findById(userId);
    return {
      drops_balance: user.drops_balance,
      total_xp: Number(user.total_xp),
    };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Write period record (update existing partial-progress row or insert fresh)
    const effectiveDateParam = date ?? null;
    if (existing) {
      await client.query(
        `UPDATE habit_periods
            SET value = $1, recorded_at = COALESCE($3::date + INTERVAL '12 hours', NOW()),
                is_completed = TRUE, timer_started_at = NULL
          WHERE id = $2`,
        [value, existing.id, effectiveDateParam],
      );
    } else {
      const periodStart = getPeriodStart(d, habit.frequency);
      await client.query(
        `INSERT INTO habit_periods (habit_id, period_start, recorded_at, value, is_completed)
         VALUES ($1, $2, COALESCE($3::date + INTERVAL '12 hours', NOW()), $4, TRUE)`,
        [habitId, periodStart, effectiveDateParam, value],
      );
    }

    // 2. +10 drops
    const {
      rows: [user],
    } = await client.query(
      `UPDATE users SET drops_balance = drops_balance + 10 WHERE id = $1 RETURNING drops_balance, total_xp`,
      [userId],
    );

    // 3. Update streaks
    const completionPeriodKey = getPeriodKey(
      date || new Date(),
      habit.frequency,
    );
    const currentPeriodKey = getPeriodKey(today || new Date(), habit.frequency);
    const streak = await streakRepo.recalculateBothStreaks(
      habitId,
      habit.frequency,
      client,
      effectiveDateParam,
    );

    // 4. Set plant level from current streak
    const {
      rows: [plant],
    } = await client.query(
      `SELECT id, level, status FROM plants WHERE habit_id = $1`,
      [habitId],
    );
    if (plant) {
      const newLevel = levelFromStreak(streak.current_streak);

      const isActive =
        completionPeriodKey === currentPeriodKey ||
        areConsecutivePeriods(
          completionPeriodKey,
          currentPeriodKey,
          habit.frequency,
        );

      let newStatus;
      if (plant.status === "dead") {
        newStatus = isActive ? "active" : "dead";
      } else if (plant.status === "wilted") {
        newStatus = isActive ? "active" : "wilted";
      } else {
        newStatus = "active";
      }

      await client.query(
        `UPDATE plants
            SET level      = $1,
                status     = $2,
                updated_at = COALESCE($4::date + INTERVAL '12 hours', NOW())
          WHERE id = $3`,
        [newLevel, newStatus, plant.id, effectiveDateParam],
      );
    }

    await client.query("COMMIT");

    const achieveResult = await achievementService
      .checkAndUnlock(userId, today)
      .catch(() => ({ newly_unlocked: [], total_xp: null }));

    return {
      drops_balance: user.drops_balance,
      streak,
      total_xp:
        achieveResult.total_xp !== null
          ? achieveResult.total_xp
          : Number(user.total_xp),
      newly_unlocked: achieveResult.newly_unlocked,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function undo(userId, habitId, date, newValue, today) {
  const d = date || new Date().toISOString().slice(0, 10);
  const found = await habitRepo.findByIdAndUserWithPeriod(habitId, userId, d);
  if (!found) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }
  const { habit, existing: period } = found;

  if (!period?.is_completed) {
    const e = new Error("No completion found for this period");
    e.status = 404;
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      rows: [plant],
    } = await client.query(
      `SELECT id, level, status FROM plants WHERE habit_id = $1`,
      [habitId],
    );

    // 1. Remove formal completion.
    if (habit.tracking_type === "counter") {
      const keepValue =
        newValue !== null && newValue !== undefined
          ? newValue
          : (period.value ?? 0);
      if (keepValue > 0) {
        await client.query(
          `UPDATE habit_periods SET is_completed = FALSE, value = $2, timer_started_at = NULL WHERE id = $1`,
          [period.id, keepValue],
        );
      } else {
        await client.query(`DELETE FROM habit_periods WHERE id = $1`, [
          period.id,
        ]);
      }
    } else {
      await client.query(`DELETE FROM habit_periods WHERE id = $1`, [
        period.id,
      ]);
    }

    // 2. Subtract 10 drops
    const {
      rows: [user],
    } = await client.query(
      `UPDATE users SET drops_balance = GREATEST(0, drops_balance - 10) WHERE id = $1 RETURNING drops_balance, total_xp`,
      [userId],
    );

    // 3. Recalculate streaks
    const updatedStreak = await streakRepo.recalculateBothStreaks(
      habitId,
      habit.frequency,
      client,
    );

    // 4. Recalculate plant level and status
    if (plant) {
      const newLevel = levelFromStreak(updatedStreak.current_streak);

      let newStatus;
      if (updatedStreak.current_streak === 0) {
        newStatus = plant.status === "dead" ? "dead" : "wilted";
      } else {
        const { rows: latest } = await client.query(
          `SELECT period_start FROM habit_periods WHERE habit_id = $1 AND is_completed = TRUE ORDER BY period_start DESC LIMIT 1`,
          [habitId],
        );
        const lastKey = getPeriodKey(latest[0].period_start, habit.frequency);
        const curKey = getPeriodKey(today || new Date(), habit.frequency);
        const active =
          lastKey === curKey ||
          areConsecutivePeriods(lastKey, curKey, habit.frequency);
        newStatus = active ? "active" : plant.status;
      }

      await client.query(
        `UPDATE plants SET level = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newLevel, newStatus, plant.id],
      );
    }

    await client.query("COMMIT");

    const relockResult = await achievementService
      .recheckAndRelock(userId, today)
      .catch((err) => {
        console.error("recheckAndRelock failed:", err);
        return { total_xp: null };
      });

    return {
      drops_balance: user.drops_balance,
      streak: updatedStreak,
      total_xp:
        relockResult.total_xp !== null
          ? relockResult.total_xp
          : Number(user.total_xp),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { complete, undo };
