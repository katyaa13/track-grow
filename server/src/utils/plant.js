function levelFromStreak(streak) {
  return Math.min(6, Math.max(1, 1 + Math.floor(streak / 3)));
}

module.exports = { levelFromStreak };
