function getPeriodStart(date, frequency) {
  const d = String(date).slice(0, 10);
  const [y, m, day] = d.split("-").map(Number);

  switch (frequency) {
    case "daily":
      return d;
    case "weekly": {
      const dt = new Date(Date.UTC(y, m - 1, day));
      const dow = dt.getUTCDay();
      dt.setUTCDate(dt.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
      return dt.toISOString().slice(0, 10);
    }
    case "monthly":
      return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
    case "yearly":
      return `${String(y).padStart(4, "0")}-01-01`;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

function getPeriodKey(date, frequency) {
  const d = new Date(date);
  if (frequency === "daily") return d.toISOString().slice(0, 10);
  if (frequency === "weekly") {
    const diff = (d.getUTCDay() + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - diff);
    return monday.toISOString().slice(0, 10);
  }
  if (frequency === "monthly") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (frequency === "yearly") return `${d.getUTCFullYear()}`;
  throw new Error(`Unknown frequency: ${frequency}`);
}

function areConsecutivePeriods(key1, key2, frequency) {
  if (frequency === "daily") {
    return Math.round((new Date(key2) - new Date(key1)) / 86400000) === 1;
  }
  if (frequency === "weekly") {
    return Math.round((new Date(key2) - new Date(key1)) / (7 * 86400000)) === 1;
  }
  if (frequency === "monthly") {
    const [y1, m1] = key1.split("-").map(Number);
    const [y2, m2] = key2.split("-").map(Number);
    return y2 * 12 + m2 - (y1 * 12 + m1) === 1;
  }
  if (frequency === "yearly") return Number(key2) - Number(key1) === 1;
  throw new Error(`Unknown frequency: ${frequency}`);
}

module.exports = { getPeriodStart, getPeriodKey, areConsecutivePeriods };
