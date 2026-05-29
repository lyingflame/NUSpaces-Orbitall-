// HTTP request rate limiting
const rateLimit = require('express-rate-limit');

// Auth: 5 attempts per 10 min
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // cooldown: 10 min
  max: 5,
  message: {
    error: 'Too many authentication attempts. Please try again in 10 minutes.',
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
