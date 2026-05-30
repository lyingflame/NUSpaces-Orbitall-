// Input validation with zod
const { z } = require('zod');
 
// Register
const registerSchema = z.object({
  // Must be NUS email
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.')
    .transform(val => val.trim().toLowerCase())
    .refine(
    val => val.endsWith('@u.nus.edu') || val.endsWith('@nus.edu.sg'),
    'Must be a valid NUS email address.'),

  // Between 3-50 chars, only alphanumeric + underscores
  username: z
    .string({ required_error: 'Username is required.' })
    .min(3, 'Username must be at least 3 characters.')
    .max(50, 'Username must be at most 50 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.')
    .transform(val => val.trim()),

  // Minimum 8 chars, at least one letter and one number
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

// Login - valid email & password required
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.')
    .transform(val => val.trim().toLowerCase()),
 
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password is required.'),
});

// Feedback - valid ID, valid noise/crowd level, sanitise comment (500 characters limit)
const feedbackSchema = z.object({
  spotId: z
    .number({ required_error: 'A valid spot ID is required.' })
    .int('Spot ID must be an integer.'),
 
  noiseLevel: z
    .number({ required_error: 'Noise level is required.' })
    .int()
    .min(1, 'Noise level must be between 1 and 5.')
    .max(5, 'Noise level must be between 1 and 5.'),
 
  crowdLevel: z
    .number({ required_error: 'Crowd level is required.' })
    .int()
    .min(1, 'Crowd level must be between 1 and 5.')
    .max(5, 'Crowd level must be between 1 and 5.'),
 
  comment: z
    .string()
    .max(500, 'Comment must be 500 characters or less.')
    .transform(val => val.trim())
    .optional()
    .default(''),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
 
    if (!result.success) {
      const errors = result.error.errors.map(err => err.message);
      return res.status(400).json({ errors });
    }
 
    // Sanitise
    req.body = result.data;
    next();
  };
}
 
const validateRegistration = validate(registerSchema);
const validateLogin = validate(loginSchema);
const validateFeedback = validate(feedbackSchema);
 
module.exports = { validateRegistration, validateLogin, validateFeedback };