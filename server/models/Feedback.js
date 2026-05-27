// Feedback model — database queries for the feedback table

const { query } = require('../config/database');

const Feedback = {
  // Add new feedback
  async create(userId, spotId, noiseLevel, crowdLevel, comment) {
    const result = await query(
      `INSERT INTO feedback (user_id, spot_id, noise_level, crowd_level, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, spotId, noiseLevel, crowdLevel, comment || '']
    );
    return result.rows[0];
  },

  // Get all feedback for a spot within a time-of-day window (+-1h)
  async getBySpotAndTimeWindow(spotId, currentTime, windowHours = 1) {
    const windowSeconds = windowHours * 3600;
    const result = await query(
      `SELECT noise_level, crowd_level, created_at
       FROM feedback
       WHERE spot_id = $1
         AND LEAST(
           ABS(EXTRACT(EPOCH FROM (created_at::time - $2::time))),
           86400 - ABS(EXTRACT(EPOCH FROM (created_at::time - $2::time)))
         ) <= $3
       ORDER BY created_at DESC`,
      [spotId, currentTime, windowSeconds]
    );
    return result.rows;
  },

  // Get all feedback for ALL spots
  async getAllByTimeWindow(currentTime, windowHours = 1) {
    const windowSeconds = windowHours * 3600;
    const result = await query(
      `SELECT spot_id, noise_level, crowd_level, created_at
       FROM feedback
       WHERE LEAST(
           ABS(EXTRACT(EPOCH FROM (created_at::time - $1::time))),
           86400 - ABS(EXTRACT(EPOCH FROM (created_at::time - $1::time)))
         ) <= $2
       ORDER BY spot_id, created_at DESC`,
      [currentTime, windowSeconds]
    );
    return result.rows;
  },

  // Spam prevention
  async findRecentByUserAndSpot(userId, spotId, cooldownMinutes = 30) {
    const result = await query(
      `SELECT id FROM feedback
       WHERE user_id = $1 AND spot_id = $2
         AND created_at > NOW() - INTERVAL '${cooldownMinutes} minutes'
       LIMIT 1`,
      [userId, spotId]
    );
    return result.rows[0] || null;
  },

  // Get all feedback submitted by a user
  async getByUser(userId) {
    const result = await query(
      `SELECT f.*, s.name AS spot_name, s.building
       FROM feedback f
       JOIN study_spots s ON f.spot_id = s.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get recent feedback for spot detail page (might change implementation later idk)
  async getRecentForDisplay(spotId, limit = 10) {
    const result = await query(
      `SELECT f.noise_level, f.crowd_level, f.comment, f.created_at,
              u.username
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       WHERE f.spot_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [spotId, limit]
    );
    return result.rows;
  },
};

module.exports = Feedback;
