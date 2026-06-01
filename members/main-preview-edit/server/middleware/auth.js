/**
 * Authentication Middleware
 * Protects routes and verifies JWT tokens
 */

const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { findUserById } = require('../services/userService');

/**
 * Middleware to verify JWT token and authenticate user
 */
async function authMiddleware(req, res, next) {
  try {
    // Extract token from Authorization header or cookie
    let token = extractTokenFromHeader(req.headers.authorization);

    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    let token = extractTokenFromHeader(req.headers.authorization);

    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await findUserById(decoded.id);

      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
}

/**
 * Role-based authorization middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Check if email is verified
 */
function requireEmailVerification(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required'
    });
  }

  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireEmailVerification
};
