/**
 * Authentication Routes
 * Handles login, signup, OAuth callbacks, and token refresh
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { registerUser, findUserByEmail, findOrCreateOAuthUser } = require('../services/userService');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../services/emailService');
const { enqueueUserRegisteredEmail } = require('../services/emailOrchestrator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

function isPlaceholderValue(value) {
  if (!value) return true;
  const lower = String(value).toLowerCase();
  return (
    lower.includes('your-') ||
    lower.includes('xxxxx') ||
    lower.includes('example') ||
    lower.includes('change-this')
  );
}

function isProviderConfigured(provider) {
  if (provider === 'google') {
    return !isPlaceholderValue(process.env.GOOGLE_CLIENT_ID)
      && !isPlaceholderValue(process.env.GOOGLE_CLIENT_SECRET);
  }
  if (provider === 'github') {
    return !isPlaceholderValue(process.env.GITHUB_CLIENT_ID)
      && !isPlaceholderValue(process.env.GITHUB_CLIENT_SECRET);
  }
  return false;
}

function isDevOAuthMockEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_OAUTH_MOCK !== 'false';
}

function sanitizeRedirectPath(redirect) {
  if (!redirect || typeof redirect !== 'string') return '/profile.html';
  if (!redirect.startsWith('/')) return '/profile.html';
  if (redirect.startsWith('//')) return '/profile.html';
  return redirect;
}

function buildFrontendUrl(pathname, query = {}) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  const url = new URL(pathname, frontendBase);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function setAuthCookie(res, accessToken) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function issueOAuthSuccessRedirect(res, user, provider, redirectPath, mock = false) {
  const tokens = generateTokens(user);
  setAuthCookie(res, tokens.accessToken);
  return res.redirect(
    buildFrontendUrl('/auth/callback.html', {
      token: tokens.accessToken,
      redirect: sanitizeRedirectPath(redirectPath),
      provider,
      mock: mock ? '1' : undefined
    })
  );
}

function issueOAuthFailureRedirect(res, errorCode) {
  return res.redirect(
    buildFrontendUrl('/login.html', {
      error: errorCode || 'oauth_failed'
    })
  );
}

async function createDevOAuthAuthData(provider) {
  const id = `dev-${provider}-user`;
  const userData = {
    authProvider: provider,
    authProviderId: id,
    email: `${id}@neurofoundry.local`,
    name: `Dev ${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
    emailVerified: true
  };
  const user = await findOrCreateOAuthUser(userData);
  const tokens = generateTokens(user);
  return { user, tokens };
}

async function handleDevOAuth(provider, req, res, next) {
  try {
    const redirectPath = sanitizeRedirectPath(req.query.redirect);
    const { user } = await createDevOAuthAuthData(provider);
    return issueOAuthSuccessRedirect(res, user, provider, redirectPath, true);
  } catch (error) {
    return next(error);
  }
}

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

      // Emit user.registered event for email pipeline
      let emailStatus = null;
      try {
        emailStatus = enqueueUserRegisteredEmail(user, {
          requestId: req.headers['x-request-id'] || null
        });
      } catch (emailError) {
        console.error('Failed to enqueue verification email:', emailError);
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
          tokens,
          ...(process.env.NODE_ENV !== 'production' && emailStatus ? { email: emailStatus } : {})
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
  (req, res, next) => {
    if (!isProviderConfigured('google')) {
      if (isDevOAuthMockEnabled()) {
        return handleDevOAuth('google', req, res, next);
      }
      return res.status(503).json({
        success: false,
        message: 'Google OAuth is not configured'
      });
    }

    const redirectPath = sanitizeRedirectPath(req.query.redirect);
    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: encodeURIComponent(redirectPath)
    })(req, res, next);
  }
);

router.post('/dev-oauth/:provider', async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider'
      });
    }

    if (!isDevOAuthMockEnabled()) {
      return res.status(403).json({
        success: false,
        message: 'Development OAuth mock is disabled'
      });
    }

    if (isProviderConfigured(provider)) {
      return res.status(409).json({
        success: false,
        message: `${provider} OAuth is configured. Use the real OAuth flow.`
      });
    }

    const { user, tokens } = await createDevOAuthAuthData(provider);
    setAuthCookie(res, tokens.accessToken);

    return res.json({
      success: true,
      message: `Development ${provider} OAuth successful`,
      data: {
        provider,
        mock: true,
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
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isProviderConfigured('google')) {
      if (isDevOAuthMockEnabled()) {
        return handleDevOAuth('google', req, res, next);
      }
      return issueOAuthFailureRedirect(res, 'google_auth_not_configured');
    }

    return passport.authenticate('google', { session: false }, (err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return issueOAuthFailureRedirect(res, 'google_auth_failed');
      }

      let redirectPath = '/profile.html';
      if (req.query.state) {
        try {
          redirectPath = sanitizeRedirectPath(decodeURIComponent(req.query.state));
        } catch (_) {
          redirectPath = '/profile.html';
        }
      }

      return issueOAuthSuccessRedirect(res, user, 'google', redirectPath);
    })(req, res, next);
  }
);

// ============================================
// GITHUB OAUTH
// ============================================
router.get(
  '/github',
  (req, res, next) => {
    if (!isProviderConfigured('github')) {
      if (isDevOAuthMockEnabled()) {
        return handleDevOAuth('github', req, res, next);
      }
      return res.status(503).json({
        success: false,
        message: 'GitHub OAuth is not configured'
      });
    }

    const redirectPath = sanitizeRedirectPath(req.query.redirect);
    return passport.authenticate('github', {
      scope: ['user:email'],
      session: false,
      state: encodeURIComponent(redirectPath)
    })(req, res, next);
  }
);

router.get(
  '/github/callback',
  (req, res, next) => {
    if (!isProviderConfigured('github')) {
      if (isDevOAuthMockEnabled()) {
        return handleDevOAuth('github', req, res, next);
      }
      return issueOAuthFailureRedirect(res, 'github_auth_not_configured');
    }

    return passport.authenticate('github', { session: false }, (err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return issueOAuthFailureRedirect(res, 'github_auth_failed');
      }

      let redirectPath = '/profile.html';
      if (req.query.state) {
        try {
          redirectPath = sanitizeRedirectPath(decodeURIComponent(req.query.state));
        } catch (_) {
          redirectPath = '/profile.html';
        }
      }

      return issueOAuthSuccessRedirect(res, user, 'github', redirectPath);
    })(req, res, next);
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
