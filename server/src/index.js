require("dotenv").config();
const app = require("./app");
const { runMigrations } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
