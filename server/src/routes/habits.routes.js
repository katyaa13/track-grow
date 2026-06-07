const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth.middleware");
const habitsCtrl = require("../controllers/habits.controller");
const completionsCtrl = require("../controllers/completions.controller");

const completionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You are sending requests too frequently. Please wait a moment.",
  },
});

router.get("/", auth, habitsCtrl.getHabits);
router.post("/", auth, habitsCtrl.createHabit);
router.put("/:id", auth, habitsCtrl.updateHabit);
router.delete("/:id", auth, habitsCtrl.deleteHabit);
router.post("/:id/timer/start", auth, habitsCtrl.startTimer);
router.patch("/:id/progress", auth, habitsCtrl.updateProgress);
router.delete("/:id/progress", auth, habitsCtrl.deleteProgress);
router.post("/:id/complete", auth, completionLimiter, completionsCtrl.complete);
router.delete("/:id/complete", auth, completionLimiter, completionsCtrl.undo);

module.exports = router;
