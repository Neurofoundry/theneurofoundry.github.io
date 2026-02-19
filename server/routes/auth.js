/**
 * Authentication Routes
 * Handles login, signup, OAuth callbacks, and token refresh
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { registerUser, findUserByEmail } = require('../services/userService');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ============================================
// LOCAL REGISTRATION
// ============================================
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required')
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, name } = req.body;

      // Register user
      const user = await registerUser(email, password, name);

      // Send verification email
      try {
        await sendVerificationEmail(user);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      // Generate tokens
      const tokens = generateTokens(user);

      // Set cookie
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified
          },
          tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// LOCAL LOGIN
// ============================================
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || 'Authentication failed'
        });
      }

      // Generate tokens
      const tokens = generateTokens(user);

      // Set cookie
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            role: user.role
          },
          tokens
        }
      });
    })(req, res, next);
  }
);

// ============================================
// GOOGLE OAUTH
// ============================================
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
  }),
  (req, res) => {
    // Generate tokens
    const tokens = generateTokens(req.user);

    // Set cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

// ============================================
// GITHUB OAUTH
// ============================================
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_auth_failed`
  }),
  (req, res) => {
    // Generate tokens
    const tokens = generateTokens(req.user);

    // Set cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);

// ============================================
// LOGOUT
// ============================================
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// ============================================
// REFRESH TOKEN
// ============================================
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const { findUserById } = require('../services/userService');
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// VERIFY EMAIL (with token from email)
// ============================================
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Verify email token (implement this in userService)
    const { verifyEmailToken } = require('../services/userService');
    const user = await verifyEmailToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// REQUEST PASSWORD RESET
// ============================================
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;
      const user = await findUserByEmail(email);

      // Don't reveal if user exists
      if (user) {
        try {
          await sendPasswordResetEmail(user);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
        }
      }

      res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// RESET PASSWORD
// ============================================
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, password } = req.body;

      // Verify reset token and update password
      const { resetPassword } = require('../services/userService');
      const user = await resetPassword(token, password);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
