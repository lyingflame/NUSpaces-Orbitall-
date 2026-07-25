// Favourites controller — bookmark and unbookmark study spots (auth needed)

const Favourite = require('../models/Favourite');
const StudySpot = require('../models/StudySpot');

const favouriteController = {
  // POST /api/spots/:id/favourite — save a spot
  async addFavourite(req, res, next) {
    try {
      const userId = req.user.id;
      const spotId = parseInt(req.params.id);

      // Verify spot exists
      const spot = await StudySpot.findById(spotId);
      if (!spot) {
        return res.status(404).json({ error: 'Study spot not found.' });
      }

      const result = await Favourite.add(userId, spotId);

      if (!result) {
        return res.status(200).json({ message: 'Already in favourites.' });
      }

      res.status(201).json({ message: 'Added to favourites.', favourite: result });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/spots/:id/favourite — remove favourite
  async removeFavourite(req, res, next) {
    try {
      const userId = req.user.id;
      const spotId = parseInt(req.params.id);

      const result = await Favourite.remove(userId, spotId);

      if (!result) {
        return res.status(404).json({ error: 'Spot was not in favourites.' });
      }

      res.status(200).json({ message: 'Removed from favourites.' });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/spots/favourites — list user's favourite spots with scores
  async getFavourites(req, res, next) {
    try {
      const userId = req.user.id;
      const spots = await Favourite.getSpotsForUser(userId);
      res.status(200).json(spots);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/spots/favourites/ids — obtain IDs for priority listing
  async getFavouriteIds(req, res, next) {
    try {
      const userId = req.user.id;
      const ids = await Favourite.getByUser(userId);
      res.status(200).json(ids);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = favouriteController;
