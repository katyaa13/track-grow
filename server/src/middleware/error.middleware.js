module.exports = function errorMiddleware(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const message = status < 500 ? err.message : "Internal server error";
  res.status(status).json({ error: message });
};
