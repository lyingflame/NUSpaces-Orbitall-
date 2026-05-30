// Feedback routes (requires auth)

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/authentication');
const { validateFeedback } = require('../middleware/validation');

router.post('/', authenticate, validateFeedback, feedbackController.submitFeedback);
router.get('/mine', authenticate, feedbackController.getMyFeedback);

module.exports = router;
