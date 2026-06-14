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
      const errors = result.error.issues.map(err => err.message);
      return res.status(400).json({ errors });
    }
 
    // Sanitise
    req.body = result.data;
    next();
  };
}

// Admin: add new study spot
const addSpotSchema = z.object({
  name: z.string({ required_error: 'Name is required.' }).min(1).max(255),
  building: z.string().max(255).optional(),
  faculty: z.array(z.string()).optional(),
  spotType: z.enum(['library', 'study_room', 'outdoor', 'lounge', 'lab']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().positive().optional(),
  hasPower: z.boolean().optional().default(false),
  hasAircon: z.boolean().optional().default(true),
  description: z.string().max(1000).optional().default(''),
});

// Admin: update study spot (all fields optional)
const updateSpotSchema = addSpotSchema.partial();

// Admin: Change study spot schedule (can be null)
const scheduleSchema = z.object({
  spotId: z.number({ required_error: 'Spot ID required.' }).int(),
  dayOfWeek: z.enum(['weekday', 'saturday', 'sunday'], {
    required_error: 'Day of week required.',
  }),
  // set as 24h, closed or change in open/close time
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM.').optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM.').optional(),
  is24hr: z.boolean().optional().default(false),
  isClosed: z.boolean().optional().default(false),
});

// Admin: Add new study spot override
const addOverrideSchema = z.object({
  spotId: z.number({ required_error: 'Spot ID is required.' }).int(),
  startDate: z.string({ required_error: 'Start date is required.' })
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be YYYY-MM-DD.'),
  endDate: z.string({ required_error: 'End date is required.' })
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be YYYY-MM-DD.'),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM.').optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM.').optional(),
  is24hr: z.boolean().optional().default(false),
  isClosed: z.boolean().optional().default(false),
  reason: z.string().max(500).optional(),
}).refine(
  data => data.endDate >= data.startDate,
  { message: 'End date must be on or after start date.' }
);

// Admin: Update existing override
const updateOverrideSchema = z.object({
  spotId: z.number().int().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.').optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM.').optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM.').optional(),
  is24hr: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

// 8 exports
const validateRegistration = validate(registerSchema);
const validateLogin = validate(loginSchema);
const validateFeedback = validate(feedbackSchema);
const validateAddSpot = validate(addSpotSchema);
const validateUpdateSpot = validate(updateSpotSchema);
const validateSchedule = validate(scheduleSchema);
const validateAddOverride = validate(addOverrideSchema);
const validateUpdateOverride = validate(updateOverrideSchema);
 
module.exports = { 
  validateRegistration, validateLogin, validateFeedback, validateAddSpot, validateUpdateSpot, validateSchedule, validateAddOverride, validateUpdateOverride,
};