// Spot routes (no auth needed)

const express = require('express');
const router = express.Router();
const spotController = require('../controllers/spotController');

router.get('/', spotController.getAllSpots);
router.post('/refresh', spotController.refreshScores);
router.get('/filters', spotController.getFilterOptions);
router.get('/:id', spotController.getSpotById);

module.exports = router;
