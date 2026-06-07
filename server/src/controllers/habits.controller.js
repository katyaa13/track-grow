const habitService = require("../services/habit.service");

const { validateDate } = require("../utils/validation");

const VALID_TRACKING_TYPES = ["checkbox", "timer", "counter"];
const VALID_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];
const VALID_COLORS = [
  "#D82323",
  "#FA864C",
  "#F5C542",
  "#3EB655",
  "#38B3E8",
  "#AD4BE6",
  "#FA6EC2",
];
const VALID_EMOJIS = [
  "🌿",
  "🌸",
  "💧",
  "🏋️",
  "🏃",
  "🧘",
  "🧠",
  "📚",
  "✍️",
  "💻",
  "🎨",
  "🛏️",
  "🍎",
  "🥑",
  "💊",
  "🚿",
  "💰",
  "🎉",
  "🎯",
  "⏳",
  "❌",
];
const NAME_MAX = 20;

function parseTargetValue(tracking_type, target_value) {
  if (tracking_type === "checkbox") return { value: null, error: null };
  const n = Number(target_value);
  if (!target_value || !Number.isInteger(n) || n <= 0 || n > 86400) {
    return {
      value: null,
      error:
        "target_value must be a positive integer for timer and counter habits (max 86400)",
    };
  }
  return { value: n, error: null };
}

async function getHabits(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const dateError = validateDate(date, "date");
    if (dateError) return res.status(400).json({ error: dateError });

    const habits = await habitService.getHabitsForDate(req.user.id, date);
    res.json({ data: habits });
  } catch (err) {
    next(err);
  }
}

async function createHabit(req, res, next) {
  try {
    const {
      name,
      tracking_type,
      frequency,
      target_value,
      emoji,
      color,
      created_at,
    } = req.body;

    if (!name || !tracking_type || !frequency) {
      return res
        .status(400)
        .json({ error: "name, tracking_type and frequency are required" });
    }
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    if (name.trim().length > NAME_MAX) {
      return res
        .status(400)
        .json({ error: `name must be at most ${NAME_MAX} characters` });
    }
    if (!VALID_TRACKING_TYPES.includes(tracking_type)) {
      return res.status(400).json({
        error: `tracking_type must be one of: ${VALID_TRACKING_TYPES.join(", ")}`,
      });
    }
    if (!VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({
        error: `frequency must be one of: ${VALID_FREQUENCIES.join(", ")}`,
      });
    }
    if (emoji !== undefined && !VALID_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: "Invalid emoji value." });
    }
    if (color !== undefined && !VALID_COLORS.includes(color)) {
      return res.status(400).json({ error: "Invalid color value." });
    }
    const createdAtError =
      created_at !== undefined ? validateDate(created_at, "created_at") : null;
    if (createdAtError) {
      return res.status(400).json({ error: createdAtError });
    }
    const { value: validated, error: tvError } = parseTargetValue(
      tracking_type,
      target_value,
    );
    if (tvError) return res.status(400).json({ error: tvError });

    const _now = new Date();
    const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
    const effectiveCreatedAt =
      created_at && created_at > today ? today : (created_at ?? null);

    const { habit, total_xp, newly_unlocked } = await habitService.createHabit(
      req.user.id,
      {
        name: name.trim(),
        tracking_type,
        frequency,
        target_value: validated,
        emoji: emoji ?? null,
        color: color ?? null,
        created_at: effectiveCreatedAt,
      },
    );
    res.status(201).json({ data: habit, total_xp, newly_unlocked });
  } catch (err) {
    next(err);
  }
}

async function updateHabit(req, res, next) {
  try {
    const { name, emoji, color } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res
          .status(400)
          .json({ error: "name must be a non-empty string" });
      }
      if (name.trim().length > NAME_MAX) {
        return res
          .status(400)
          .json({ error: `name must be at most ${NAME_MAX} characters` });
      }
      updates.name = name.trim();
    }

    if (emoji !== undefined) {
      if (!VALID_EMOJIS.includes(emoji)) {
        return res.status(400).json({ error: "Invalid emoji value." });
      }
      updates.emoji = emoji;
    }

    if (color !== undefined) {
      if (!VALID_COLORS.includes(color)) {
        return res.status(400).json({ error: "Invalid color value." });
      }
      updates.color = color;
    }

    if (!Object.keys(updates).length) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    const habit = await habitService.updateHabit(
      req.user.id,
      req.params.id,
      updates,
    );
    res.json({ data: habit });
  } catch (err) {
    next(err);
  }
}

async function deleteHabit(req, res, next) {
  try {
    const { total_xp } = await habitService.deleteHabit(
      req.user.id,
      req.params.id,
    );
    res.json({ data: { deleted: true }, total_xp });
  } catch (err) {
    next(err);
  }
}

async function startTimer(req, res, next) {
  try {
    const { date } = req.body;
    if (date !== undefined) {
      const dateError = validateDate(date, "date");
      if (dateError) return res.status(400).json({ error: dateError });
    }
    const result = await habitService.startTimer(
      req.user.id,
      req.params.id,
      date ?? null,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function updateProgress(req, res, next) {
  try {
    const habitId = req.params.id;
    const { value, date } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "value is required" });
    }
    const num = Number(value);
    if (!Number.isInteger(num) || String(value).includes(".")) {
      return res.status(400).json({ error: "value must be an integer" });
    }
    if (num < 0) {
      return res.status(400).json({ error: "value cannot be negative" });
    }

    if (date !== undefined) {
      const dateError = validateDate(date, "date");
      if (dateError) return res.status(400).json({ error: dateError });
    }

    const result = await habitService.updateProgress(
      req.user.id,
      habitId,
      num,
      date,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function deleteProgress(req, res, next) {
  try {
    const habitId = req.params.id;
    const { date } = req.query;
    if (!date)
      return res
        .status(400)
        .json({ error: "date query parameter is required" });

    const dateError = validateDate(date, "date");
    if (dateError) return res.status(400).json({ error: dateError });

    await habitService.deleteProgress(req.user.id, habitId, date);
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  startTimer,
  updateProgress,
  deleteProgress,
};
