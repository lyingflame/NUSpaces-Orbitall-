// Auth routes

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../security/authentication');
const { validateRegistration, validateLogin } = require('../security/validation');

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
