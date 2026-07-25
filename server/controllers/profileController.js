// Profile controller — user account management (auth needed)

const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const User = require('../models/User');
const Feedback = require('../models/Feedback');

const profileController = {
  // PUT /api/profile/password — change password
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get user record
      const user = await query('SELECT * FROM users WHERE id = $1', [userId]);
      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Verify current password
      const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      // Hash and save new password
      const newHash = await bcrypt.hash(newPassword, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

      // Revoke all refresh tokens (end sessions on other devices)
      await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

      res.status(200).json({ message: 'Password changed. Please log in again.' });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/profile/username — update username
  async updateUsername(req, res, next) {
    try {
      const userId = req.user.id;
      const { username } = req.body;

      // Check if username is taken
      const existing = await query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }

      const result = await query(
        'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, email, username, role',
        [username, userId]
      );

      res.status(200).json({ user: result.rows[0] });
    } catch (error) {
      next(error);
    }
  },

  /* 
  // DELETE /api/profile/account
  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      // Require password confirmation for account deletion
      const user = await query('SELECT * FROM users WHERE id = $1', [userId]);
      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const valid = await bcrypt.compare(password, user.rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Password is incorrect.' });
      }

      // Delete user — cascades to feedback, refresh_tokens, favourites
      await query('DELETE FROM users WHERE id = $1', [userId]);

      // Clear auth cookies
      res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax', path: '/' });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/api/auth' });

      res.status(200).json({ message: 'Account deleted.' });
    } catch (error) {
      next(error);
    }
  }, 
  */

  // GET /api/profile/feedback — view user feedback history (by pages)
  async getFeedbackHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const countResult = await query(
        'SELECT COUNT(*)::int AS total FROM feedback WHERE user_id = $1',
        [userId]
      );

      const dataResult = await query(
        `SELECT f.id, f.noise_level, f.crowd_level, f.comment, f.created_at,
                s.name AS spot_name, s.building
         FROM feedback f
         JOIN study_spots s ON f.spot_id = s.id
         WHERE f.user_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const total = countResult.rows[0].total;

      res.status(200).json({
        data: dataResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = profileController;
