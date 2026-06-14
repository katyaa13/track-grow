const completionService = require("../services/completion.service");
const { validateDate } = require("../utils/validation");

async function complete(req, res, next) {
  try {
    const { value, date, today } = req.body;

    if (date !== undefined && date !== null) {
      const dateError = validateDate(date);
      if (dateError) return res.status(400).json({ error: dateError });
    }

    if (date && today && date > today) {
      return res.status(400).json({ error: "Cannot complete a habit for a future date" });
    }

    const result = await completionService.complete(
      req.user.id,
      req.params.id,
      value ?? null,
      date ?? null,
      today ?? null,
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function undo(req, res, next) {
  try {
    const date = req.query.date ?? null;
    const dateError = validateDate(date);
    if (date !== null && dateError) {
      return res.status(400).json({ error: dateError });
    }
    const rawValue = req.query.value;
    const newValue = rawValue !== undefined ? Number(rawValue) : null;
    const today = req.query.today ?? null;
    const result = await completionService.undo(
      req.user.id,
      req.params.id,
      date,
      newValue,
      today,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { complete, undo };
