const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { getMe, updateMe } = require("../controllers/users.controller");

router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);

module.exports = router;
