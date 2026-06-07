const authService = require("../services/auth.service");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MIN = 2;
const USERNAME_MAX = 16;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email and password are required." });
    }
    if (
      username.trim().length < USERNAME_MIN ||
      username.trim().length > USERNAME_MAX
    ) {
      return res.status(400).json({
        error: `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`,
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address." });
    }
    if (email.length > 254) {
      return res.status(400).json({ error: "Email address is too long." });
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return res.status(400).json({
        error: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`,
      });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: "Password must include at least one letter and one number.",
      });
    }

    const data = await authService.register({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }
    if (!EMAIL_RE.test(email)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address." });
    }

    const data = await authService.login({
      email: email.trim().toLowerCase(),
      password,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
