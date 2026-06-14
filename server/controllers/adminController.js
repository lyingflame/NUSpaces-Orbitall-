// Admin controller — manage study spots, schedules, and overrides on frontend

const { query } = require('../config/database');

const adminController = {

  // POST /api/admin/spots - add new spot
  async addSpot(req, res, next) {
    try {
      const io = req.app.get('io');
      const { name, building, faculty, spotType, latitude, longitude,
              capacity, hasPower, hasAircon, description } = req.body;

      const result = await query(
        `INSERT INTO study_spots
         (name, building, faculty, spot_type, latitude, longitude,
          capacity, has_power, has_aircon, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [name, building || null, faculty || null, spotType || null,
         latitude || null, longitude || null, capacity || null,
         hasPower, hasAircon, description]
      );

      const spot = result.rows[0];
      
      // Default score
      await query(
        `INSERT INTO spot_scores
         (spot_id, avg_noise, avg_crowd, quietness_score, report_count, recent_report_count)
         VALUES ($1, 0, 0, 0, 0, 0)`,
        [spot.id]
      );

      res.status(201).json(spot);
      io.emit('spots-changed', { action: 'added', spotId: spot.id });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/spots/:id — update spot (only fields that are changed will be updated)
  async updateSpot(req, res, next) {
    try {
      const io = req.app.get('io');
      const spotId = parseInt(req.params.id);
      const fields = req.body;

      const fieldMap = {
        name: 'name', building: 'building', faculty: 'faculty',
        spotType: 'spot_type', latitude: 'latitude', longitude: 'longitude',
        capacity: 'capacity', hasPower: 'has_power', hasAircon: 'has_aircon',
        description: 'description',
      };

      const updates = [];
      const params = [];
      let idx = 1;

      for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
        if (fields[jsKey] !== undefined) {
          updates.push(`${dbKey} = $${idx++}`);
          params.push(fields[jsKey]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
      }

      params.push(spotId);
      const result = await query(
        `UPDATE study_spots SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      res.status(200).json(result.rows[0]);
      io.emit('spots-changed', { action: 'updated', spotId: spotId });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/admin/spots/:id — will also delete associated schedules, overrides, score and feedbacks
  async deleteSpot(req, res, next) {
    try {
      const io = req.app.get('io');
      const spotId = parseInt(req.params.id);
      const result = await query(
        'DELETE FROM study_spots WHERE id = $1 RETURNING id, name',
        [spotId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      res.status(200).json({ message: `Deleted: ${result.rows[0].name}` });
      io.emit('spots-changed', { action: 'deleted', spotId: spotId });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/schedules?spotId=[num] (to view existing schedules)
  async getSchedules(req, res, next) {
    try {
      let sql = `SELECT ss.*, s.name AS spot_name
                 FROM spot_schedules ss
                 JOIN study_spots s ON ss.spot_id = s.id`;
      const params = [];

      if (req.query.spotId) {
        sql += ` WHERE ss.spot_id = $1`;
        params.push(parseInt(req.query.spotId));
      }

      sql += ` ORDER BY ss.spot_id, ss.day_of_week`;
      const result = await query(sql, params);
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/schedules — insert/update schedules
  async changeSchedule(req, res, next) {
    try {
      const io = req.app.get('io');
      const { spotId, dayOfWeek, openingTime, closingTime, is24hr, isClosed } = req.body;

      // Check if spot exists
      const spotCheck = await query('SELECT id FROM study_spots WHERE id = $1', [spotId]);
      if (spotCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      const result = await query(
        `INSERT INTO spot_schedules (spot_id, day_of_week, opening_time, closing_time, is_24hr, is_closed)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (spot_id, day_of_week) DO UPDATE SET
           opening_time = $3,
           closing_time = $4,
           is_24hr = $5,
           is_closed = $6
         RETURNING *`,
        [spotId, dayOfWeek, openingTime || null, closingTime || null,
         is24hr || false, isClosed || false]
      );

      res.status(200).json(result.rows[0]);
      io.emit('spots-changed', { action: 'schedule-updated', spotId: req.body.spotId });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/admin/schedules/:id
  async deleteSchedule(req, res, next) {
    try {
      const io = req.app.get('io');
      const result = await query(
        'DELETE FROM spot_schedules WHERE id = $1 RETURNING *',
        [parseInt(req.params.id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found.' });
      }

      res.status(200).json({ message: 'Schedule removed.' });
      io.emit('spots-changed', { action: 'schedule-removed' });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/admin/overrides?spotId=[num] (to view existing overrides)
  async getOverrides(req, res, next) {
    try {
      let sql = `SELECT o.*, s.name AS spot_name
                 FROM spot_schedule_overrides o
                 JOIN study_spots s ON o.spot_id = s.id`;
      const params = [];

      if (req.query.spotId) {
        sql += ` WHERE o.spot_id = $1`;
        params.push(parseInt(req.query.spotId));
      }

      sql += ` ORDER BY o.start_date DESC`;
      const result = await query(sql, params);
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/admin/overrides
  async addOverride(req, res, next) {
    try {
      const io = req.app.get('io');
      const { spotId, startDate, endDate, openingTime, closingTime,
              is24hr, isClosed, reason } = req.body;

      const spotCheck = await query('SELECT id FROM study_spots WHERE id = $1', [spotId]);
      if (spotCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      const result = await query(
        `INSERT INTO spot_schedule_overrides
         (spot_id, start_date, end_date, opening_time, closing_time, is_24hr, is_closed, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [spotId, startDate, endDate, openingTime || null, closingTime || null,
         is24hr || false, isClosed || false, reason || null]
      );

      res.status(201).json(result.rows[0]);
      io.emit('spots-changed', { action: 'override-changed' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/admin/overrides/:id (only fields that are filled will be updated)
  async updateOverride(req, res, next) {
    try {
      const io = req.app.get('io');
      const overrideId = parseInt(req.params.id);

      const fieldMap = {
        spotId: 'spot_id', startDate: 'start_date', endDate: 'end_date',
        openingTime: 'opening_time', closingTime: 'closing_time',
        is24hr: 'is_24hr', isClosed: 'is_closed', reason: 'reason',
      };

      const updates = [];
      const params = [];
      let idx = 1;

      for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
        if (req.body[jsKey] !== undefined) {
          updates.push(`${dbKey} = $${idx++}`);
          params.push(req.body[jsKey]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
      }

      params.push(overrideId);
      const result = await query(
        `UPDATE spot_schedule_overrides SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Override not found.' });
      }

      res.status(200).json(result.rows[0]);
      io.emit('spots-changed', { action: 'override-changed' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/admin/overrides/:id
  async deleteOverride(req, res, next) {
    try {
      const io = req.app.get('io');
      const result = await query(
        'DELETE FROM spot_schedule_overrides WHERE id = $1 RETURNING *',
        [parseInt(req.params.id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Override not found.' });
      }

      res.status(200).json({ message: 'Override deleted.' });
      io.emit('spots-changed', { action: 'override-changed' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminController;
