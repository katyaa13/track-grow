const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const ctrl = require("../controllers/achievements.controller");

router.get("/", auth, ctrl.getAchievements);

module.exports = router;
