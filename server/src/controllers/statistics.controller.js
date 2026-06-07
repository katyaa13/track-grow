const statisticsService = require("../services/statistics.service");
const { validateMonth } = require("../utils/validation");

async function getStatistics(req, res, next) {
  try {
    const habitId = req.query.habitId ? Number(req.query.habitId) : null;
    const data = await statisticsService.getStatsSummary(req.user.id, habitId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getCalendar(req, res, next) {
  try {
    const habitId = req.query.habitId ? Number(req.query.habitId) : null;
    const month = req.query.month || null;
    const monthError = month ? validateMonth(month) : null;
    if (monthError) return res.status(400).json({ error: monthError });
    const data = await statisticsService.getCalendar(
      req.user.id,
      habitId,
      month,
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatistics, getCalendar };
