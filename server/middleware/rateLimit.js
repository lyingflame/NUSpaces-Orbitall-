// HTTP request rate limiting
const rateLimit = require('express-rate-limit');

// Auth: 10 attempts per 5 min (increase leniency for now)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // cooldown: 5 min
  max: 10,
  message: {
    error: 'Too many attempts. Please try again in 5 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General: 100 API requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // cooldown: 1 min
  max: 100,
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
