const { pool } = require("../config/db");
const habitRepo = require("../repositories/habit.repository");
const plantRepo = require("../repositories/plant.repository");
const streakRepo = require("../repositories/streak.repository");
const periodRepo = require("../repositories/period.repository");
const achievementService = require("./achievement.service");
const userRepo = require("../repositories/user.repository");

async function getHabitsForDate(userId, date) {
  return habitRepo.findByUserAndDate(userId, date);
}

async function createHabit(userId, data) {
  const client = await pool.connect();
  let habit;
  try {
    await client.query("BEGIN");
    habit = await habitRepo.create(userId, data, client);
    await plantRepo.create(habit.id, client);
    await streakRepo.create(habit.id, client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { newly_unlocked, total_xp: achieveXp } = await achievementService
    .checkAndUnlock(userId)
    .catch((err) => {
      console.error("checkAndUnlock failed:", err);
      return { newly_unlocked: [], total_xp: null };
    });
  const total_xp = achieveXp !== null
    ? achieveXp
    : ((await userRepo.findById(userId))?.total_xp ?? 0);
  return { habit, total_xp, newly_unlocked };
}

async function updateHabit(userId, habitId, data) {
  const habit = await habitRepo.findByIdAndUser(habitId, userId);
  if (!habit) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }
  return habitRepo.update(habitId, data);
}

async function deleteHabit(userId, habitId) {
  const habit = await habitRepo.findByIdAndUser(habitId, userId);
  if (!habit) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }
  await habitRepo.remove(habitId);
  const { total_xp: relockXp } = await achievementService
    .recheckAndRelock(userId)
    .catch((err) => { console.error("recheckAndRelock failed:", err); return { total_xp: null }; });
  const total_xp = relockXp !== null
    ? relockXp
    : ((await userRepo.findById(userId))?.total_xp ?? 0);
  return { total_xp };
}

async function updateProgress(userId, habitId, value, date) {
  const habit = await habitRepo.findByIdAndUser(habitId, userId);
  if (!habit) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }

  const d = date || new Date().toISOString().slice(0, 10);
  const habitCreatedAt = new Date(habit.created_at).toISOString().slice(0, 10);
  if (d < habitCreatedAt) {
    const e = new Error("Cannot record progress before habit creation date");
    e.status = 400;
    throw e;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (d > today) {
    const e = new Error("Cannot record progress for a future date");
    e.status = 400;
    throw e;
  }

  const existing = await periodRepo.findByPeriod(habitId, d, habit.frequency);
  if (existing?.is_completed && (habit.target_value == null || value < habit.target_value)) {
    return existing;
  }

  const updated = await periodRepo.upsertValue(
    habitId,
    d,
    value,
    habit.frequency,
  );
  return updated || { value };
}

async function startTimer(userId, habitId, date) {
  const habit = await habitRepo.findByIdAndUser(habitId, userId);
  if (!habit) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }
  if (habit.tracking_type !== "timer") {
    const e = new Error("Habit is not a timer habit");
    e.status = 400;
    throw e;
  }

  const d = date || new Date().toISOString().slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (d > today) {
    const e = new Error("Cannot start timer for a future date");
    e.status = 400;
    throw e;
  }

  const row = await periodRepo.startTimer(habitId, d, habit.frequency);
  return {
    timer_started_at: row.timer_started_at,
    progress_value: row.value ?? 0,
  };
}

async function deleteProgress(userId, habitId, date) {
  const habit = await habitRepo.findByIdAndUser(habitId, userId);
  if (!habit) {
    const e = new Error("Habit not found");
    e.status = 404;
    throw e;
  }

  await periodRepo.deleteByPeriod(habitId, date, habit.frequency);
}

module.exports = {
  getHabitsForDate,
  createHabit,
  updateHabit,
  deleteHabit,
  updateProgress,
  startTimer,
  deleteProgress,
};
