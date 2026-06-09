// Spot controller — list spots with scores and opening hours (more for NUS libraries & study rooms)

const StudySpot = require('../models/StudySpot');
const Feedback = require('../models/Feedback');
const Schedule = require('../models/Schedule');
const scoringService = require('../services/scoringService');

const spotController = {
  // GET /api/spots (all spots data)
  async getAllSpots(req, res, next) {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const today = now.toISOString().slice(0, 10);
      const dayType = getDayType(now);

      // get spots, schedules, overrides
      const [spots, allSchedules, todayOverrides] = await Promise.all([
        StudySpot.getAllWithScores(),
        Schedule.getAllSchedules(),
        Schedule.getAllOverridesForDate(today),
      ]);

      const result = spots.map(spot => {
        const override = todayOverrides[spot.id];
        const schedule = allSchedules[spot.id]?.[dayType];
        const status = getOpeningStatus(override, schedule, currentTime);

        return {
          ...spot,
          noise_status: getNoiseLabel(spot.quietness_score),
          is_open: status.is_open,
          opening_hours: status.opening_hours,
          schedule_reason: status.reason,
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/spots/refresh (recalculate and broadcast with socket.io)
  async refreshScores(req, res, next) {
    try {
      const io = req.app.get('io');
      await scoringService.recalculateAllScores(io);

      // get spots with updated scores
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const today = now.toISOString().slice(0, 10);
      const dayType = getDayType(now);

      const [spots, allSchedules, todayOverrides] = await Promise.all([
        StudySpot.getAllWithScores(),
        Schedule.getAllSchedules(),
        Schedule.getAllOverridesForDate(today),
      ]);

      const result = spots.map(spot => {
        const override = todayOverrides[spot.id];
        const schedule = allSchedules[spot.id]?.[dayType];
        const status = getOpeningStatus(override, schedule, currentTime);

        return {
          ...spot,
          noise_status: getNoiseLabel(spot.quietness_score),
          is_open: status.is_open,
          opening_hours: status.opening_hours,
          schedule_reason: status.reason,
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/spots/:id (for single spots)
  async getSpotById(req, res, next) {
    try {
      const spotId = parseInt(req.params.id);
      const spot = await StudySpot.findById(spotId);

      if (!spot) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const today = now.toISOString().slice(0, 10);
      const dayType = getDayType(now);

      const [recentFeedback, allSchedules, todayOverrides] = await Promise.all([
        Feedback.getRecentForDisplay(spotId),
        Schedule.getAllSchedules(),
        Schedule.getAllOverridesForDate(today),
      ]);

      const override = todayOverrides[spot.id];
      const schedule = allSchedules[spot.id]?.[dayType];
      const status = getOpeningStatus(override, schedule, currentTime);

      // weekly schedule
      const spotSchedules = allSchedules[spot.id] || {};
      const weekly = {
        weekday: formatScheduleRow(spotSchedules.weekday),
        saturday: formatScheduleRow(spotSchedules.saturday),
        sunday: formatScheduleRow(spotSchedules.sunday),
      };

      res.status(200).json({
        ...spot,
        noise_status: getNoiseLabel(spot.quietness_score),
        is_open: status.is_open,
        opening_hours: status.opening_hours,
        schedule_reason: status.reason,
        weekly_schedule: weekly,
        recentFeedback,
      });
    } catch (error) {
      next(error);
    }
  },
};

// Check if spot is open or closed (only applicable for some)
// check override > regular schedule > null (assume always open)
function getOpeningStatus(override, schedule, currentTime) {
  // Override
  if (override) {
    if (override.is_closed) {
      return { is_open: false, opening_hours: 'Closed', reason: override.reason };
    }
    if (override.is_24hr) {
      return { is_open: true, opening_hours: '24H', reason: override.reason };
    }
    if (override.opening_time && override.closing_time) {
      const open = override.opening_time.slice(0, 5);
      const close = override.closing_time.slice(0, 5);
      return {
        is_open: currentTime >= open && currentTime <= close,
        opening_hours: `${formatTime(open)} to ${formatTime(close)}`,
        reason: override.reason,
      };
    }
  }

  // Regular
  if (schedule) {
    if (schedule.is_closed) {
      return { is_open: false, opening_hours: 'Closed', reason: null };
    }
    if (schedule.is_24hr) {
      return { is_open: true, opening_hours: '24H', reason: null };
    }
    if (schedule.opening_time && schedule.closing_time) {
      const open = schedule.opening_time.slice(0, 5);
      const close = schedule.closing_time.slice(0, 5);
      return {
        is_open: currentTime >= open && currentTime <= close,
        opening_hours: `${formatTime(open)} to ${formatTime(close)}`,
        reason: null,
      };
    }
  }

  // Null
  return { is_open: true, opening_hours: 'N/A', reason: null };
}

// Noise categories
function getNoiseLabel(score) {
  if (score == null) return 'No Data';
  if (score <= 12.5) return 'Very Quiet';
  if (score <= 37.5) return 'Quiet';
  if (score <= 62.5) return 'Moderate';
  if (score <= 87.5) return 'Noisy';
  return 'Very Noisy';
}

function formatScheduleRow(row) {
  if (!row) return 'N/A';
  if (row.is_closed) return 'Closed';
  if (row.is_24hr) return '24H';
  if (row.opening_time && row.closing_time) {
    return `${formatTime(row.opening_time.slice(0, 5))} to ${formatTime(row.closing_time.slice(0, 5))}`;
  }
  return 'N/A';
}

function getDayType(date) {
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

// Convert time from 24H to AM/PM
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  if (minutes === 0) return `${displayHour}${period}`;
  return `${displayHour}:${String(minutes).padStart(2, '0')}${period}`;
}

module.exports = spotController;
