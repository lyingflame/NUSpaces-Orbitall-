// SpotScore model — stores pre-computed scores for each spot

const { query } = require('../config/database');

const SpotScore = {
  // Insert or update spot score
  async upsert(spotId, avgNoise, avgCrowd, quietnessScore, reportCount, recentReportCount) {
    const result = await query(
      `INSERT INTO spot_scores
       (spot_id, avg_noise, avg_crowd, quietness_score, report_count, recent_report_count, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (spot_id) DO UPDATE SET
         avg_noise = $2,
         avg_crowd = $3,
         quietness_score = $4,
         report_count = $5,
         recent_report_count = $6,
         last_updated = NOW()
       RETURNING *`,
      [spotId, avgNoise, avgCrowd, quietnessScore, reportCount, recentReportCount]
    );
    return result.rows[0];
  },
};

module.exports = SpotScore;
