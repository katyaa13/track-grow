const { pool } = require("../config/db");

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.username, u.avatar_data, u.drops_balance, u.created_at,
            u.total_xp
       FROM users u
      WHERE u.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);
  return rows[0] || null;
}

async function create({ username, email, password_hash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *`,
    [username, email, password_hash],
  );
  return rows[0];
}

async function update(id, { username, avatar_data }) {
  const fields = [];
  const values = [];
  let i = 1;
  if (username !== undefined) {
    fields.push(`username = $${i++}`);
    values.push(username);
  }
  if (avatar_data !== undefined) {
    fields.push(`avatar_data = $${i++}`);
    values.push(avatar_data);
  }
  if (!fields.length) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING id, email, username, avatar_data, drops_balance, total_xp, created_at`,
    values,
  );
  return rows[0];
}

async function addXp(userId, points) {
  const { rows } = await pool.query(
    `UPDATE users SET total_xp = total_xp + $1 WHERE id = $2 RETURNING total_xp`,
    [points, userId],
  );
  return Number(rows[0].total_xp);
}

async function subtractXp(userId, points) {
  const { rows } = await pool.query(
    `UPDATE users SET total_xp = GREATEST(0, total_xp - $1) WHERE id = $2 RETURNING total_xp`,
    [points, userId],
  );
  return Number(rows[0].total_xp);
}

module.exports = { findById, findByEmail, create, update, addXp, subtractXp };
