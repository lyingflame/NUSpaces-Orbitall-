// Admin routes — require authorise('admin') permission to access

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authentication');
const { authorise } = require('../middleware/authorisation');
const { validateAddSpot, validateUpdateSpot, validateSchedule, validateAddOverride, validateUpdateOverride } = require('../middleware/validation');

// Spots
router.post('/spots', authenticate, authorise('admin'), validateAddSpot, adminController.addSpot);
router.put('/spots/:id', authenticate, authorise('admin'), validateUpdateSpot, adminController.updateSpot);
router.delete('/spots/:id', authenticate, authorise('admin'), adminController.deleteSpot);

// Schedules
router.get('/schedules', authenticate, authorise('admin'), adminController.getSchedules);
router.put('/schedules', authenticate, authorise('admin'), validateSchedule, adminController.changeSchedule);
router.delete('/schedules/:id', authenticate, authorise('admin'), adminController.deleteSchedule);

// Overrides
router.get('/overrides', authenticate, authorise('admin'), adminController.getOverrides);
router.post('/overrides', authenticate, authorise('admin'), validateAddOverride, adminController.addOverride);
router.put('/overrides/:id', authenticate, authorise('admin'), validateUpdateOverride, adminController.updateOverride);
router.delete('/overrides/:id', authenticate, authorise('admin'), adminController.deleteOverride);

module.exports = router;
