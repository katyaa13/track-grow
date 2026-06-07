const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const ctrl = require("../controllers/statistics.controller");

router.get("/calendar", auth, ctrl.getCalendar);
router.get("/", auth, ctrl.getStatistics);

module.exports = router;
