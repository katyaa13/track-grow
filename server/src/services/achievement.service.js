const achievementRepo = require("../repositories/achievement.repository");
const userRepo = require("../repositories/user.repository");
const { POINTS_BY_DIFFICULTY } = require("../config/achievements");

async function checkAndUnlock(userId, today) {
  const locked = await achievementRepo.findLocked(userId);
  if (!locked.length) return { newly_unlocked: [], total_xp: null };

  const conditions = await achievementRepo.fetchConditions(userId, today);

  const toUnlock = locked.filter((a) => conditions[a.code]);
  if (!toUnlock.length) return { newly_unlocked: [], total_xp: null };

  const unlockedCodes = await achievementRepo.unlockBatch(
    userId,
    toUnlock.map((a) => a.code),
  );
  if (!unlockedCodes.length) return { newly_unlocked: [], total_xp: null };

  const unlockedSet = new Set(unlockedCodes);
  const newly_unlocked = [];
  let totalPoints = 0;

  for (const { code, title, description, difficulty } of toUnlock) {
    if (!unlockedSet.has(code)) continue;
    const points = POINTS_BY_DIFFICULTY[difficulty] ?? 100;
    totalPoints += points;
    newly_unlocked.push({ code, title, description, difficulty, points });
  }

  const total_xp =
    totalPoints > 0 ? await userRepo.addXp(userId, totalPoints) : null;
  return { newly_unlocked, total_xp };
}

async function recheckAndRelock(userId, today) {
  const unlocked = await achievementRepo.findUnlocked(userId);
  if (!unlocked.length) return { total_xp: null };

  const conditions = await achievementRepo.fetchConditions(userId, today);

  const toRelock = unlocked.filter(
    (u) => u.code in conditions && !conditions[u.code],
  );
  if (!toRelock.length) return { total_xp: null };

  const relockedCodes = await achievementRepo.relockBatch(
    userId,
    toRelock.map((u) => u.code),
  );
  if (!relockedCodes.length) return { total_xp: null };

  const relockedSet = new Set(relockedCodes);
  const totalPoints = toRelock
    .filter((u) => relockedSet.has(u.code))
    .reduce((sum, u) => sum + (POINTS_BY_DIFFICULTY[u.difficulty] ?? 100), 0);

  const total_xp =
    totalPoints > 0 ? await userRepo.subtractXp(userId, totalPoints) : null;
  return { total_xp };
}

async function getForUser(userId) {
  return achievementRepo.findAllForUser(userId);
}

module.exports = { checkAndUnlock, recheckAndRelock, getForUser };
