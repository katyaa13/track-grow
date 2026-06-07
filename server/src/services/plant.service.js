const { pool } = require("../config/db");
const plantRepo = require("../repositories/plant.repository");
const userRepo = require("../repositories/user.repository");
const streakRepo = require("../repositories/streak.repository");
const achievementService = require("./achievement.service");
const { getPeriodKey, getPeriodStart } = require("../utils/periods");
const { levelFromStreak } = require("../utils/plant");

function getPreviousPeriodDate(frequency, today) {
  const now = today ? new Date(today + "T12:00:00Z") : new Date();

  switch (frequency) {
    case "daily": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 1);
      return d;
    }
    case "weekly": {
      const dow = now.getUTCDay();
      const daysToMonday = dow === 0 ? 6 : dow - 1;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - daysToMonday);
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() - 3);
      return d;
    }
    case "monthly": {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15),
      );
      return d;
    }
    case "yearly": {
      const d = new Date(Date.UTC(now.getUTCFullYear() - 1, 6, 1));
      return d;
    }
    default: {
      throw new Error(`Unknown frequency: ${frequency}`);
    }
  }
}

function missedPeriods(lastCompletionAt, createdAt, frequency, today) {
  const nowDate = today ? new Date(today + "T12:00:00Z") : new Date();
  const currentKey = getPeriodKey(nowDate, frequency);

  if (lastCompletionAt) {
    const lastKey = getPeriodKey(new Date(lastCompletionAt), frequency);
    if (lastKey === currentKey) return 0;
    return periodsGap(lastKey, currentKey, frequency) - 1;
  } else {
    const createdKey = getPeriodKey(new Date(createdAt), frequency);
    if (createdKey === currentKey) return 0;
    return periodsGap(createdKey, currentKey, frequency);
  }
}

function periodsGap(fromKey, toKey, frequency) {
  if (frequency === "daily") {
    return Math.round((new Date(toKey) - new Date(fromKey)) / 86400000);
  } else if (frequency === "weekly") {
    return Math.round((new Date(toKey) - new Date(fromKey)) / (7 * 86400000));
  } else if (frequency === "monthly") {
    const [y1, m1] = fromKey.split("-").map(Number);
    const [y2, m2] = toKey.split("-").map(Number);
    return y2 * 12 + m2 - (y1 * 12 + m1);
  } else if (frequency === "yearly") {
    return Number(toKey) - Number(fromKey);
  }
  throw new Error(`Unknown frequency: ${frequency}`);
}

async function getGardenForUser(userId, today) {
  const plants = await plantRepo.findByUserId(userId);

  const updates = [];
  for (const plant of plants) {
    const missed = missedPeriods(
      plant.last_completion_at || null,
      plant.habit_created_at,
      plant.frequency,
      today,
    );

    let newStatus = plant.status;
    let newLevel = plant.level;

    if (missed >= 2) {
      newStatus = "dead";
    } else if (missed === 1) {
      newStatus = "wilted";
    } else {
      newStatus = "active";
    }

    if (newStatus === "active" && plant.status !== "active") {
      const streak = plant.current_streak || 0;
      if (streak > 0) {
        newLevel = levelFromStreak(streak);
      }
    }

    if (newStatus !== plant.status || newLevel !== plant.level) {
      updates.push({ id: plant.id, status: newStatus, level: newLevel });
    }
  }

  if (updates.length > 0) {
    await plantRepo.batchUpdate(updates);
    return plantRepo.findByUserId(userId);
  }
  return plants;
}

async function restorePlant(userId, plantId, today) {
  const plant = await plantRepo.findByIdAndUser(plantId, userId);
  if (!plant) {
    const e = new Error("Plant not found");
    e.status = 404;
    throw e;
  }
  if (plant.status !== "wilted") {
    const e = new Error("Only wilted plants can be restored");
    e.status = 400;
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. atomically deduct drops
    const { rowCount } = await client.query(
      `UPDATE users SET drops_balance = drops_balance - 150 WHERE id = $1 AND drops_balance >= 150`,
      [userId],
    );
    if (rowCount === 0) {
      const e = new Error("Not enough drops (need 150)");
      e.status = 400;
      throw e;
    }

    // 2. verify the plant is still wilted
    const {
      rows: [freshPlant],
    } = await client.query(
      `SELECT id, status FROM plants WHERE id = $1 FOR UPDATE`,
      [plant.id],
    );
    if (freshPlant?.status !== "wilted") {
      const e = new Error("Only wilted plants can be restored");
      e.status = 400;
      throw e;
    }

    // 3. restore last missed period for the plant's habit
    const missedDate = getPreviousPeriodDate(plant.frequency, today);

    const missedDateStr = missedDate.toISOString().slice(0, 10);
    const periodStart = getPeriodStart(missedDateStr, plant.frequency);

    const restoredValue = plant.target_value ?? 1;
    await client.query(
      `INSERT INTO habit_periods (habit_id, period_start, recorded_at, value, is_completed)
       VALUES ($1, $2, $3::date + INTERVAL '12 hours', $4, TRUE)
       ON CONFLICT (habit_id, period_start)
       DO UPDATE SET recorded_at = $3::date + INTERVAL '12 hours',
                     value = $4,
                     is_completed = TRUE`,
      [plant.habit_id, periodStart, missedDateStr, restoredValue],
    );

    // 3. recalculate streaks and use result
    const streakRow = await streakRepo.recalculateBothStreaks(
      plant.habit_id,
      plant.frequency,
      client,
      null,
    );
    const currentStreak = streakRow.current_streak;
    const correctLevel = currentStreak > 0 ? levelFromStreak(currentStreak) : 1;

    await client.query(
      `UPDATE plants
          SET status          = 'active',
              level           = $2,
              updated_at      = NOW()
        WHERE id = $1`,
      [plant.id, correctLevel],
    );

    await client.query("COMMIT");

    // 5. check for achievements and return updated plant + user info
    const newly_unlocked = await achievementService
      .checkAndUnlock(userId)
      .catch(() => []);
    const updatedUser = await userRepo.findById(userId);
    const updatedPlant = await plantRepo.findByIdAndUser(plant.id, userId);
    return {
      plant: updatedPlant,
      drops_balance: updatedUser.drops_balance,
      total_xp: updatedUser.total_xp,
      newly_unlocked,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getGardenForUser, restorePlant };
