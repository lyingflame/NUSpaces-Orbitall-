// Feedback routes (requires auth)

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate } = require('../security/authentication');
const { validateFeedback } = require('../security/validation');

router.post('/', authenticate, validateFeedback, feedbackController.submitFeedback);
router.get('/mine', authenticate, feedbackController.getMyFeedback);

module.exports = router;
