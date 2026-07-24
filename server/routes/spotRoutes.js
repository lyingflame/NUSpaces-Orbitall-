// Spot routes (no auth needed)

const express = require('express');
const router = express.Router();
const spotController = require('../controllers/spotController');
const { authenticate } = require('../middleware/authentication');
const { authorise } = require('../middleware/authorisation');

router.get('/', spotController.getAllSpots);
router.post('/refresh', authenticate, authorise('admin'), spotController.refreshScores); // admin only function
router.get('/filters', spotController.getFilterOptions);
router.get('/:id', spotController.getSpotById);

module.exports = router;
