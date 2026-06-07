const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function validateDate(d, fieldName = "date") {
  if (!DATE_RE.test(d) || isNaN(Date.parse(d))) {
    return `Invalid ${fieldName} format, expected YYYY-MM-DD`;
  }
  return null;
}

function validateMonth(m) {
  if (!MONTH_RE.test(m)) {
    return "Invalid month format, expected YYYY-MM";
  }
  return null;
}

module.exports = { validateDate, validateMonth };
