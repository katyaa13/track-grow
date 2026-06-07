const plantService = require("../services/plant.service");

async function getGarden(req, res, next) {
  try {
    const today =
      typeof req.query.date === "string" ? req.query.date.slice(0, 10) : null;
    const garden = await plantService.getGardenForUser(req.user.id, today);
    res.json({ data: garden });
  } catch (err) {
    next(err);
  }
}

async function restorePlant(req, res, next) {
  try {
    const today =
      typeof req.body?.date === "string" ? req.body.date.slice(0, 10) : null;
    const result = await plantService.restorePlant(
      req.user.id,
      req.params.id,
      today,
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGarden, restorePlant };
