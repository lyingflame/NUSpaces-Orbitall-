// StudySpot model — database queries for the study_spots table

const { query } = require('../config/database');

const StudySpot = {
  // Get all spots specified from spot scores table
  async getAllWithScores() {
    const result = await query(
      `SELECT s.*,
              sc.quietness_score, sc.avg_noise, sc.avg_crowd,
              sc.report_count, sc.recent_report_count, sc.last_updated
       FROM study_spots s
       LEFT JOIN spot_scores sc ON s.id = sc.spot_id
       ORDER BY sc.quietness_score ASC NULLS LAST`
    );
    return result.rows;
  },

  // Get a single spot by ID with its score
  async findById(id) {
    const result = await query(
      `SELECT s.*,
              sc.quietness_score, sc.avg_noise, sc.avg_crowd,
              sc.report_count, sc.recent_report_count, sc.last_updated
       FROM study_spots s
       LEFT JOIN spot_scores sc ON s.id = sc.spot_id
       WHERE s.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // Get all spot IDs (used by cron to recalculate all scores)
  async getAllIds() {
    const result = await query('SELECT id FROM study_spots');
    return result.rows.map(row => row.id);
  },
};

module.exports = StudySpot;
