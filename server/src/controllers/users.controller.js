const userRepo = require("../repositories/user.repository");

const USERNAME_MIN = 2;
const USERNAME_MAX = 16;
const AVATAR_MAX_B64_LENGTH = Math.ceil(2 * 1024 * 1024 * 1.37) + 100;
const ALLOWED_MIME_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/gif;base64,",
  "data:image/webp;base64,",
];

async function getMe(req, res, next) {
  try {
    const user = await userRepo.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const { username, avatar_data } = req.body;
    const updates = {};

    if (username !== undefined) {
      const trimmed = typeof username === "string" ? username.trim() : "";
      if (!trimmed) {
        return res.status(400).json({ error: "Username is required." });
      }
      if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
        return res.status(400).json({
          error: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
        });
      }
      updates.username = trimmed;
    }

    if (avatar_data !== undefined) {
      if (typeof avatar_data !== "string") {
        return res.status(400).json({ error: "Invalid avatar format." });
      }
      const isAllowedMime = ALLOWED_MIME_PREFIXES.some((p) =>
        avatar_data.startsWith(p),
      );
      if (!isAllowedMime) {
        return res.status(400).json({
          error: "Avatar must be a JPEG, PNG, GIF, or WebP image.",
        });
      }
      if (avatar_data.length > AVATAR_MAX_B64_LENGTH) {
        return res
          .status(400)
          .json({ error: "Avatar image must be smaller than 2MB." });
      }
      updates.avatar_data = avatar_data;
    }

    if (!Object.keys(updates).length) {
      const user = await userRepo.findById(req.user.id);
      return res.json({ data: user });
    }

    const user = await userRepo.update(req.user.id, updates);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe };
