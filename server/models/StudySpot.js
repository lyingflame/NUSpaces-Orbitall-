// StudySpot model — database queries for the study_spots table

const { query } = require('../config/database');

const StudySpot = {
  // Get all spots (no filter)
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

  // Get filtered spots
  async getFiltered(filters) {
    const conditions = [];
    const params = [];
    let idx = 1;

    // Filter: Name search
    if (filters.search) {
      conditions.push(
        `(LOWER(s.name) LIKE $${idx} OR LOWER(s.building) LIKE $${idx} 
          OR EXISTS (SELECT 1 FROM unnest(s.faculty) f WHERE LOWER(f) LIKE $${idx}))`
      );
      params.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }

    // Filter: Building
    if (filters.building) {
      conditions.push(`s.building = $${idx++}`);
      params.push(filters.building);
    }

    // Filter: Faculty
    if (filters.faculty) {
      conditions.push(`$${idx++} = ANY(s.faculty)`);
      params.push(filters.faculty);
    }

    // Filter: Spot type
    if (filters.spotType) {
      conditions.push(`s.spot_type = $${idx++}`);
      params.push(filters.spotType);
    }

    // Filter: Amenities (power & aircon)
    if (filters.hasPower === 'true') {
      conditions.push(`s.has_power = true`);
    }
    if (filters.hasAircon === 'true') {
      conditions.push(`s.has_aircon = true`);
    }
    
    // Filter: Noise categories
    if (filters.noise) {
      const noiseRanges = {
        'very quiet': [0, 12.5],
        'quiet': [12.5, 37.5],
        'moderate': [37.5, 62.5],
        'noisy': [62.5, 87.5],
        'very noisy': [87.5, 100],
      };
      const range = noiseRanges[filters.noise.toLowerCase()];
      if (range) {
        conditions.push(`sc.quietness_score >= $${idx++} AND sc.quietness_score < $${idx++}`);
        params.push(range[0], range[1]);
      }
    }
    
    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    let distanceSelect = '';
    let distanceHaving = '';
    let orderClause = 'ORDER BY sc.quietness_score ASC NULLS LAST';

    // Filter: Location distance (if user location provided, else default is sort by quietness)
    if (filters.lat && filters.lng) {
      const lat = parseFloat(filters.lat);
      const lng = parseFloat(filters.lng);

      // Calculate distance (in km) between user and individual spots
      distanceSelect = `,
        (6371 * acos(
          LEAST(1.0, cos(radians(${lat})) * cos(radians(s.latitude))
          * cos(radians(s.longitude) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(s.latitude)))
        )) AS distance_km`;

      // Filter by radius (in km)
      if (filters.radius) {
        distanceHaving = `HAVING (6371 * acos(
          LEAST(1.0, cos(radians(${lat})) * cos(radians(s.latitude))
          * cos(radians(s.longitude) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(s.latitude)))
        )) <= ${parseFloat(filters.radius)}`;
      }
      orderClause = 'ORDER BY distance_km ASC';
    }

    // Sort by categories
    if (filters.sortBy === 'quietness') {
      orderClause = 'ORDER BY sc.quietness_score ASC NULLS LAST';
    } else if (filters.sortBy === 'crowd') {
      orderClause = 'ORDER BY sc.avg_crowd ASC NULLS LAST';
    } else if (filters.sortBy === 'name') {
      orderClause = 'ORDER BY s.name ASC';
    }

    const sql = `
      SELECT s.*,
             sc.quietness_score, sc.avg_noise, sc.avg_crowd,
             sc.report_count, sc.recent_report_count, sc.last_updated
             ${distanceSelect}
      FROM study_spots s
      LEFT JOIN spot_scores sc ON s.id = sc.spot_id
      ${whereClause}
      ${distanceHaving}
      ${orderClause}`;

    const result = await query(sql, params);
    return result.rows;
  },

  // Get a single spot by ID
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
