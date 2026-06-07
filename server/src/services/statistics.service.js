const periodRepo = require("../repositories/period.repository");
const streakRepo = require("../repositories/streak.repository");
const habitRepo = require("../repositories/habit.repository");
const { getPeriodKey, getPeriodStart } = require("../utils/periods");
const pad = (n) => String(n).padStart(2, "0");

function elapsedPeriods(createdAt, frequency, now = new Date()) {
  const created = new Date(createdAt);
  switch (frequency) {
    case "daily": {
      const msPerDay = 86400000;
      const createdDay = new Date(
        created.getFullYear(),
        created.getMonth(),
        created.getDate(),
      );
      const todayDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      return Math.max(1, Math.floor((todayDay - createdDay) / msPerDay) + 1);
    }
    case "weekly": {
      const msPerWeek = 7 * 86400000;
      const createdMonday = startOfISOWeek(created);
      const todayMonday = startOfISOWeek(now);
      return Math.max(
        1,
        Math.floor((todayMonday - createdMonday) / msPerWeek) + 1,
      );
    }
    case "monthly": {
      const months =
        (now.getFullYear() - created.getFullYear()) * 12 +
        (now.getMonth() - created.getMonth());
      return Math.max(1, months + 1);
    }
    case "yearly":
      return Math.max(1, now.getFullYear() - created.getFullYear() + 1);
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

function startOfISOWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcSuccessStats(habitsList, completedCountByHabitId, now) {
  let successfulPeriods = 0;
  let expectedPeriods = 0;

  for (const h of habitsList) {
    successfulPeriods += completedCountByHabitId[h.id] ?? 0;
    expectedPeriods += elapsedPeriods(h.created_at, h.frequency, now);
  }

  const failedPeriods = Math.max(0, expectedPeriods - successfulPeriods);
  const overallSuccessRate =
    expectedPeriods > 0
      ? Math.min(100, Math.round((successfulPeriods / expectedPeriods) * 100))
      : 0;

  return { successfulPeriods, failedPeriods, overallSuccessRate };
}

async function calcCurrentRate(userId, habitId, habitsList, today) {
  if (habitId) {
    const habit = habitsList[0];
    if (!habit) return 0;
    const period = await periodRepo.findByPeriod(
      habitId,
      today,
      habit.frequency,
    );
    if (habit.tracking_type === "checkbox") return period ? 100 : 0;
    const target = habit.target_value || 1;
    return period ? Math.round(((period.value ?? 0) / target) * 100) : 0;
  }

  const row = await periodRepo.findCurrentCompletionRate(userId);
  const total = Number(row.total);
  return total > 0 ? Math.round((Number(row.completed_now) / total) * 100) : 0;
}

function calendarRangeFrom(habitsList, y, m) {
  for (const h of habitsList) {
    if (h.frequency === "yearly") return `${y}-01-01`;
  }
  if (habitsList.some((h) => h.frequency === "weekly")) {
    const d = new Date(Date.UTC(y, m, 1));
    const dow = d.getUTCDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    return new Date(Date.UTC(y, m, 1 + toMonday)).toISOString().slice(0, 10);
  }
  return `${y}-${pad(m + 1)}-01`;
}

async function buildCalendar(
  habitId,
  habitsList,
  y,
  m,
  startOfMonth,
  endOfMonth,
) {
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const calendar = {};
  const rangeFrom = calendarRangeFrom(habitsList, y, m);

  if (habitId) {
    const habit = habitsList[0];
    if (!habit) return calendar;

    if (habit.tracking_type === "checkbox") {
      const periods = await periodRepo.findCompletedByHabitIdsAndRange(
        [habitId],
        calendarRangeFrom([habit], y, m),
        endOfMonth,
      );
      const completedStarts = new Set(periods.map((p) => p.period_start));
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
        if (completedStarts.has(getPeriodStart(dayStr, habit.frequency))) {
          calendar[dayStr] = 100;
        }
      }
    } else {
      const target = Number(habit.target_value) || 1;
      const periodOfMonthStart = getPeriodStart(startOfMonth, habit.frequency);
      const periodRows = await periodRepo.findByHabitAndRange(
        habitId,
        periodOfMonthStart,
        endOfMonth,
      );
      const periodValueMap = {};
      for (const row of periodRows) {
        if (row.value != null) {
          periodValueMap[row.period_start] = Math.min(
            100,
            Math.round((row.value / target) * 100),
          );
        }
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
        const ps = getPeriodStart(dayStr, habit.frequency);
        if (ps in periodValueMap) calendar[dayStr] = periodValueMap[ps];
      }
    }
  } else {
    const habitMap = Object.fromEntries(habitsList.map((h) => [h.id, h]));
    const periods = await periodRepo.findCompletedByHabitIdsAndRange(
      habitsList.map((h) => h.id),
      rangeFrom,
      endOfMonth,
    );
    const completedByHabit = {};
    for (const p of periods) {
      const h = habitMap[p.habit_id];
      if (!h) continue;
      if (!completedByHabit[p.habit_id])
        completedByHabit[p.habit_id] = new Set();
      completedByHabit[p.habit_id].add(
        getPeriodKey(p.period_start, h.frequency),
      );
    }

    const habitCreatedDays = habitsList.map((h) => {
      const c = new Date(h.created_at);
      return new Date(
        Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()),
      );
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
      const dayDate = new Date(Date.UTC(y, m, d));
      let applicable = 0;
      let completed = 0;

      for (let i = 0; i < habitsList.length; i++) {
        if (dayDate < habitCreatedDays[i]) continue;
        applicable++;
        if (
          completedByHabit[habitsList[i].id]?.has(
            getPeriodKey(dayDate, habitsList[i].frequency),
          )
        ) {
          completed++;
        }
      }

      if (applicable > 0)
        calendar[dayStr] = Math.round((completed / applicable) * 100);
    }
  }

  return calendar;
}

async function getStatsSummary(userId, habitId) {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const [{ currentBest, bestEver, currentStreaks }, habitsList] =
    await Promise.all([
      streakRepo.fetchStats(userId, habitId),
      habitRepo.findByUser(userId, habitId),
    ]);

  const ids = habitsList.map((h) => h.id);
  const completedCounts = await periodRepo.countCompletedByHabitIds(ids);
  const completedCountByHabitId = Object.fromEntries(
    completedCounts.map((r) => [r.habit_id, r.completed_count]),
  );

  const { successfulPeriods, failedPeriods, overallSuccessRate } =
    calcSuccessStats(habitsList, completedCountByHabitId, now);

  const currentCompletionRate = await calcCurrentRate(
    userId,
    habitId,
    habitsList,
    today,
  );

  return {
    streaks: {
      current: currentBest?.current_streak || 0,
      current_habit_name: currentBest?.name || null,
      current_habit_emoji: currentBest?.emoji || null,
      current_habit_color: currentBest?.color || null,
      best: bestEver?.best_streak || 0,
      best_habit_name: bestEver?.name || null,
      best_habit_emoji: bestEver?.emoji || null,
      best_habit_color: bestEver?.color || null,
    },
    stats: {
      successful_periods: successfulPeriods,
      failed_periods: failedPeriods,
      overall_success_rate: overallSuccessRate,
      current_completion_rate: currentCompletionRate,
    },
    current_streaks: currentStreaks,
  };
}

async function getCalendar(userId, habitId, month) {
  const now = new Date();
  const y = month ? Number(month.split("-")[0]) : now.getFullYear();
  const m = month ? Number(month.split("-")[1]) - 1 : now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startOfMonth = `${y}-${pad(m + 1)}-01`;
  const endOfMonth = `${y}-${pad(m + 1)}-${pad(daysInMonth)}`;

  const habitsList = await habitRepo.findByUser(userId, habitId);
  const calendar = await buildCalendar(
    habitId,
    habitsList,
    y,
    m,
    startOfMonth,
    endOfMonth,
  );
  return { calendar };
}

module.exports = { getStatsSummary, getCalendar };
