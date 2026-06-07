const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorMiddleware = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const habitsRoutes = require("./routes/habits.routes");
const gardenRoutes = require("./routes/garden.routes");
const statisticsRoutes = require("./routes/statistics.routes");
const achievementsRoutes = require("./routes/achievements.routes");

const app = express();

app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Body parsing
app.use((req, res, next) => {
  const limit =
    req.path === "/api/users/me" && req.method === "PUT" ? "4mb" : "100kb";
  express.json({ limit })(req, res, next);
});

// Rate limiting
if (process.env.NODE_ENV === "production") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });

  app.use("/api/auth", authLimiter);
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) return next();
    apiLimiter(req, res, next);
  });
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/garden", gardenRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/achievements", achievementsRoutes);

// Error handler
app.use(errorMiddleware);

module.exports = app;
