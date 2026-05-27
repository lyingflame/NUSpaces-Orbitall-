// Schedule model — queries for opening hours and date overrides

const { query } = require('../config/database');

const Schedule = {
  // Get all weekly schedules for all spots (one query for listing page)
  async getAllSchedules() {
    const result = await query(
      `SELECT spot_id, day_of_week, opening_time, closing_time, is_24hr, is_closed
       FROM spot_schedules ORDER BY spot_id`
    );

    // Group by spot_id
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.spot_id]) grouped[row.spot_id] = {};
      grouped[row.spot_id][row.day_of_week] = row;
    }
    return grouped;
  },

  // Multiple override resolution: shorter override is prioritised (e.g. 1 day holiday closure > reduced opening time during holiday)
  async getAllOverridesForDate(date) {
    const result = await query(
      `SELECT DISTINCT ON (spot_id)
              spot_id, opening_time, closing_time, is_24hr, is_closed, reason
       FROM spot_schedule_overrides
       WHERE $1 BETWEEN start_date AND end_date
       ORDER BY spot_id, (end_date - start_date) ASC`,
      [date]
    );

    const grouped = {};
    for (const row of result.rows) {
      grouped[row.spot_id] = row;
    }
    return grouped;
  },
};

module.exports = Schedule;
