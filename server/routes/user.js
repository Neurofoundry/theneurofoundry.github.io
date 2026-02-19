/**
 * User Routes
 * Protected routes for user operations
 */

const express = require('express');
const router = express.Router();
const { updateUser } = require('../services/userService');

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          username: req.user.username,
          avatar: req.user.avatar,
          emailVerified: req.user.emailVerified,
          role: req.user.role,
          authProvider: req.user.authProvider,
          createdAt: req.user.createdAt,
          preferences: req.user.preferences
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// UPDATE USER PREFERENCES
// ============================================
router.patch('/preferences', async (req, res, next) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences data'
      });
    }

    // Merge preferences
    const updatedUser = await updateUser(req.user.id, {
      preferences: {
        ...req.user.preferences,
        ...preferences
      }
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: updatedUser.preferences
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DEACTIVATE ACCOUNT
// ============================================
router.post('/deactivate', async (req, res, next) => {
  try {
    await updateUser(req.user.id, {
      isActive: false
    });

    // Clear auth cookie
    res.clearCookie('accessToken');

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
