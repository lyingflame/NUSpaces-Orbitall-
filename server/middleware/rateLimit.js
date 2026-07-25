// HTTP request rate limiting
const rateLimit = require('express-rate-limit');

// Auth: 10 attempts per 3 min (increased to 100 for testing)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // cooldown: 3 min
  max: (process.env.NODE_ENV === 'test') ? 100 : 10,
  message: {
    error: 'Too many attempts. Please try again in 3 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General: 100 API requests per minute (increased to 1000 for testing)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // cooldown: 1 min
  max: (process.env.NODE_ENV === 'test') ? 1000 : 100,
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
