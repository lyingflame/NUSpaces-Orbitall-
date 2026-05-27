// Input validation — checks request data before it reaches controllers to prevent xss/sql injection

function validateRegistration(req, res, next) {
  const { email, username, password } = req.body;
  const errors = [];

  // NUS email domain, might enforce stuff like e1234567 later for @u.nus.edu
  if (!email || !email.endsWith('@u.nus.edu') || !email.endsWith('@nus.edu.sg')) {
    errors.push('Email must be a valid NUS email address.');
  }

  // user: 3-50 characters, alphabets, numbers and underscore only
  if (!username || username.length < 3 || username.length > 50) {
    errors.push('Username must be between 3 and 50 characters.');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores.');
  }

  // pass: at least 8 characters, must have an alphabet and a number (May try to add lower + uppercase character restriction later?)
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one letter and one number.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  // Login sanitisation
  req.body.email = email.trim().toLowerCase();
  req.body.username = username.trim();
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

function validateFeedback(req, res, next) {
  const { spotId, noiseLevel, crowdLevel } = req.body;
  const errors = [];

  if (!spotId || !Number.isInteger(spotId)) {
    errors.push('A valid spot ID is required.');
  }
  if (!noiseLevel || !Number.isInteger(noiseLevel) || noiseLevel < 1 || noiseLevel > 5) {
    errors.push('Noise level must be an integer between 1 and 5.');
  }
  if (!crowdLevel || !Number.isInteger(crowdLevel) || crowdLevel < 1 || crowdLevel > 5) {
    errors.push('Crowd level must be an integer between 1 and 5.');
  }

  // Sanitize comment
  if (req.body.comment) {
    req.body.comment = req.body.comment.trim().slice(0, 500);
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
}

module.exports = { validateRegistration, validateLogin, validateFeedback };
