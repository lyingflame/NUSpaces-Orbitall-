// Auth controller — handles registration, login, and current user

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_TOKEN_EXPIRY = '15m'; 
const REFRESH_TOKEN_EXPIRY = '7d'; 
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = (isRefresh = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'lax', 
  maxAge: isRefresh ? REFRESH_TOKEN_EXPIRY_MS : 15 * 60 * 1000,
  path: isRefresh ? '/api/auth' : '/', // Refresh cookie only sent to /auth
});

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

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
      await RefreshToken.create(user.id, refreshToken, expiresAt);

      // Set httpOnly cookies
      res.cookie('accessToken', accessToken, cookieOptions(false));
      res.cookie('refreshToken', refreshToken, cookieOptions(true));

      res.status(201).json({
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
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

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
      await RefreshToken.create(user.id, refreshToken, expiresAt);

      // Set httpOnly cookies
      res.cookie('accessToken', accessToken, cookieOptions(false));
      res.cookie('refreshToken', refreshToken, cookieOptions(true));

      res.status(200).json({
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/refresh
  async refresh(req, res, next) {
    try {
      const oldRefreshToken = req.cookies.refreshToken;
      if (!oldRefreshToken) {
        return res.status(401).json({ error: 'No refresh token.' });
      }

      // Verify refresh token signature
      let decoded;
      try {
        decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      // Check if tokens exist in DB
      const storedToken = await RefreshToken.findByToken(oldRefreshToken);
      if (!storedToken) {
        return res.status(401).json({ error: 'Refresh token revoked or expired.' });
      }

      // Delete and generate new tokens
      await RefreshToken.deleteByToken(oldRefreshToken);

      const newAccessToken = generateAccessToken(decoded.userId);
      const newRefreshToken = generateRefreshToken(decoded.userId);

      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
      await RefreshToken.create(decoded.userId, newRefreshToken, expiresAt);

      // Set cookies
      res.cookie('accessToken', newAccessToken, cookieOptions(false));
      res.cookie('refreshToken', newRefreshToken, cookieOptions(true));

      res.status(200).json({ message: 'Tokens refreshed.' });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    const refreshToken = req.cookies.refreshToken;

    // Revoke refresh token
    if (refreshToken) {
      await RefreshToken.deleteByToken(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken', cookieOptions(false));
    res.clearCookie('refreshToken', cookieOptions(true));

    res.status(200).json({ message: 'Logged out.' });
  },

  // GET /api/auth/me (requires auth)
  async getMe(req, res) {
    res.status(200).json({ user: req.user });
  },
};

// Token generation

function generateAccessToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

module.exports = authController;
