// Favourite model — saving study spots for user preference

const { query } = require('../config/database');

const Favourite = {
  // Add spot to user's favourites
  async add(userId, spotId) {
    const result = await query(
      `INSERT INTO favourites (user_id, spot_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, spot_id) DO NOTHING
       RETURNING *`,
      [userId, spotId]
    );
    return result.rows[0] || null;
  },

  // Remove spot from user's favourites
  async remove(userId, spotId) {
    const result = await query(
      `DELETE FROM favourites WHERE user_id = $1 AND spot_id = $2 RETURNING *`,
      [userId, spotId]
    );
    return result.rows[0] || null;
  },

  // Get all favourites spot IDs for a user (for priority search)
  async getByUser(userId) {
    const result = await query(
      `SELECT spot_id FROM favourites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(r => r.spot_id);
  },

  // Get full spot data for user's favourites (for the favourites page?)
  async getSpotsForUser(userId) {
    const result = await query(
      `SELECT s.*, sc.quietness_score, sc.avg_noise, sc.avg_crowd,
              sc.report_count, sc.recent_report_count, sc.last_updated,
              f.created_at AS favourited_at
       FROM favourites f
       JOIN study_spots s ON f.spot_id = s.id
       LEFT JOIN spot_scores sc ON s.id = sc.spot_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Check if a specific spot is favoured by a user
  async isFavourited(userId, spotId) {
    const result = await query(
      `SELECT id FROM favourites WHERE user_id = $1 AND spot_id = $2`,
      [userId, spotId]
    );
    return result.rows.length > 0;
  },
};

module.exports = Favourite;
