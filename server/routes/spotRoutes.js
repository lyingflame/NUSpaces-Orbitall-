// Spot routes (no auth needed)

const express = require('express');
const router = express.Router();
const spotController = require('../controllers/spotController');
const { authenticate, optionalAuth } = require('../middleware/authentication');
const favouriteController = require('../controllers/favouriteController');

router.get('/', spotController.getAllSpots);
router.post('/refresh', spotController.refreshScores);
router.get('/filters', spotController.getFilterOptions);

// Favourites (require auth)
router.get('/favourites', authenticate, favouriteController.getFavourites);
router.get('/favourites/ids', authenticate, favouriteController.getFavouriteIds);
router.post('/:id/favourite', authenticate, favouriteController.addFavourite);
router.delete('/:id/favourite', authenticate, favouriteController.removeFavourite);

router.get('/:id', optionalAuth, spotController.getSpotById);

module.exports = router;
