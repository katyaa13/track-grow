const achievementService = require("../services/achievement.service");

async function getAchievements(req, res, next) {
  try {
    await achievementService
      .checkAndUnlock(req.user.id)
      .catch((err) => console.error("checkAndUnlock failed:", err));
    const data = await achievementService.getForUser(req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAchievements };
