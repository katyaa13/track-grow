const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepo = require("../repositories/user.repository");
const achievementRepo = require("../repositories/achievement.repository");

async function register({ username, email, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await userRepo.create({ username, email, password_hash });
  await achievementRepo.initForUser(user.id);
  const token = signToken(user);
  return { token, user: sanitize(user) };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }
  const token = signToken(user);
  return { token, user: sanitize(user) };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function sanitize({ password_hash, ...user }) {
  return user;
}

module.exports = { register, login };
