const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const ctrl = require("../controllers/garden.controller");

router.get("/", auth, ctrl.getGarden);
router.post("/:id/restore", auth, ctrl.restorePlant);

module.exports = router;
