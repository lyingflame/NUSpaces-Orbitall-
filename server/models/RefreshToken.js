// RefreshToken model — stores and manages refresh tokens in the database (expiry: 7 days)

const { query } = require('../config/database');

const RefreshToken = {
  // Save a new refresh token
  async create(userId, token, expiresAt) {
    const result = await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, token, expiresAt]
    );
    return result.rows[0];
  },

  // Find a refresh token (auth/refresh)
  async findByToken(token) {
    const result = await query(
      `SELECT rt.*, u.id AS uid, u.email, u.username
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  },

  // Delete a specific refresh token (logout)
  async deleteByToken(token) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  },

  // Delete ALL refresh tokens for a user (logout everywhere)
  async deleteAllByUser(userId) {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  },

  // Clean up expired tokens (CRON schedule)
  async deleteExpired() {
    const result = await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    return result.rowCount;
  },
};

module.exports = RefreshToken;
