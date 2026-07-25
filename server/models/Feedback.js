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

  // Get spot statistics (total feedback count, last 7d count, last 24h count, averages)
  // Might only use averages for spot details
  async getStats(spotId) {
    const result = await query(
      `SELECT
         COUNT(*)::int AS total_feedback,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS feedback_last_7d,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS feedback_last_24h,
         ROUND(AVG(noise_level)::numeric, 1) AS avg_noise_raw,
         ROUND(AVG(crowd_level)::numeric, 1) AS avg_crowd_raw,
         ROUND(AVG(noise_level) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::numeric, 1) AS avg_noise_7d,
         ROUND(AVG(crowd_level) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::numeric, 1) AS avg_crowd_7d
       FROM feedback
       WHERE spot_id = $1`,
      [spotId]
    );
    return result.rows[0];
  },

  // Peak hours: which hours have most reports and highest noise
  async getPeakHours(spotId) {
    const result = await query(
      `SELECT
         EXTRACT(HOUR FROM created_at)::int AS hour,
         COUNT(*)::int AS report_count,
         ROUND(AVG(noise_level)::numeric, 1) AS avg_noise,
         ROUND(AVG(crowd_level)::numeric, 1) AS avg_crowd
       FROM feedback
       WHERE spot_id = $1
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [spotId]
    );
    return result.rows;
  },

  // Daily noise trend over the last 14 days
  async getDailyTrend(spotId) {
    const result = await query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*)::int AS report_count,
         ROUND(AVG(noise_level)::numeric, 1) AS avg_noise,
         ROUND(AVG(crowd_level)::numeric, 1) AS avg_crowd
       FROM feedback
       WHERE spot_id = $1 AND created_at > NOW() - INTERVAL '14 days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [spotId]
    );
    return result.rows;
  },

  // Feedback Moderation (admin)

  // Get all feedback by pages (with filtering options)
  async getAllPaginated({ page = 1, limit = 20, spotId = null, userId = null }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (spotId) {
      conditions.push(`f.spot_id = $${idx++}`);
      params.push(parseInt(spotId));
    }
    if (userId) {
      conditions.push(`f.user_id = $${idx++}`);
      params.push(parseInt(userId));
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM feedback f ${whereClause}`,
      params
    );

    const dataResult = await query(
      `SELECT f.*, u.username, u.email, s.name AS spot_name, s.building
       FROM feedback f
       JOIN users u ON f.user_id = u.id
       JOIN study_spots s ON f.spot_id = s.id
       ${whereClause}
       ORDER BY f.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      data: dataResult.rows,
      total: countResult.rows[0].total,
      page,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    };
  },

  // Delete feedback entry (admin)
  async deleteById(feedbackId) {
    const result = await query(
      'DELETE FROM feedback WHERE id = $1 RETURNING *',
      [feedbackId]
    );
    return result.rows[0] || null;
  },
};

module.exports = Feedback;
