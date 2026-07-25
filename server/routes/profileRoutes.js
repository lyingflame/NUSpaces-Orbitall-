// Profile routes — require user auth

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authentication');
const { validateChangePassword, validateUpdateUsername } = require('../middleware/validation');

router.put('/password', authenticate, validateChangePassword, profileController.changePassword);
router.put('/username', authenticate, validateUpdateUsername, profileController.updateUsername);
router.get('/feedback', authenticate, profileController.getFeedbackHistory);

module.exports = router;
