// Feedback controller — submit feedback and view your own submissions

const Feedback = require('../models/Feedback');
const StudySpot = require('../models/StudySpot');
const scoringService = require('../services/scoringService');

const COOLDOWN_MINUTES = 30;

const feedbackController = {
  // POST /api/feedback, protected by auth
  async submitFeedback(req, res, next) {
    try {
      const userId = req.user.id;
      const { spotId, noiseLevel, crowdLevel, comment } = req.body;

      // Check spot exists
      const spot = await StudySpot.findById(spotId);
      if (!spot) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      // Spam protection
      const recent = await Feedback.findRecentByUserAndSpot(userId, spotId, COOLDOWN_MINUTES);
      if (recent) {
        return res.status(429).json({
          error: `Please wait at least ${COOLDOWN_MINUTES} minutes before submitting again for this spot.`,
        });
      }

      const feedback = await Feedback.create(userId, spotId, noiseLevel, crowdLevel, comment);

      // Recalculate score and broadcast via socket.io
      const currentTime = new Date().toTimeString().slice(0, 5);
      const io = req.app.get('io');
      const updatedScore = await scoringService.computeScore(spotId, currentTime, io);

      res.status(201).json({ feedback, updatedScore });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/feedback/mine, protected by auth
  async getMyFeedback(req, res, next) {
    try {
      const feedback = await Feedback.getByUser(req.user.id);
      res.status(200).json(feedback);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = feedbackController;
