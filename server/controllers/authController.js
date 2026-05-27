// Auth controller — handles registration, login, and current user

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, username, password } = req.body;

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create(email, username, passwordHash);

      const token = generateToken(user.id);

      res.status(201).json({
        user: { id: user.id, email: user.email, username: user.username },
        token,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(user.id);

      res.status(200).json({
        user: { id: user.id, email: user.email, username: user.username },
        token,
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/auth/me, protected by auth
  async getMe(req, res) {
    res.status(200).json({ user: req.user });
  },
};

// need to change JWT_SECRET later
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

module.exports = authController;
