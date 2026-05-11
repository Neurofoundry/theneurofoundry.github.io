/**
 * Neurofoundry Authentication Server
 * Main entry point for the Express.js backend
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

// Import configurations
const { corsOptions } = require('./config/cors');
const { sessionConfig } = require('./config/session');
const passportConfig = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const { getLastSentEmail, getSentEmailLog } = require('./services/emailService');
const { getEmailDeliveryLog, getEmailQueueSnapshot } = require('./services/emailOrchestrator');
const skeletonKeyChangelog = require('./data/skeleton-key-changelog.json');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
let serverInstance;
let isShuttingDown = false;

// Security middleware
app.use(helmet({
  // Auth/member pages are static HTML with inline scripts.
  // Keep Helmet protections, but allow those page scripts on Fly-hosted previews.
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:']
        }
      }
    : false
}));
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from root directory
app.use(express.static('.'));

// Serve uploads directory
app.use('/uploads', express.static('uploads'));

// Session middleware
app.use(session(sessionConfig));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/skeleton-key/changelog', (req, res) => {
  const version = String(req.query.version || '').trim();
  const changelog = skeletonKeyChangelog[version] || null;

  if (!changelog) {
    return res.status(404).type('application/json').json({
      error: 'changelog_not_found',
      version
    });
  }

  return res.type('application/json').json(changelog);
});

// Dev-only server controls
app.post('/api/dev/server/start', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Server control is disabled in production.' });
  }

  return res.json({
    success: true,
    message: `Server already running on port ${PORT}`
  });
});

app.post('/api/dev/server/stop', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Server control is disabled in production.' });
  }

  if (isShuttingDown) {
    return res.status(409).json({ message: 'Shutdown already in progress.' });
  }

  isShuttingDown = true;
  res.json({ success: true, message: 'Shutting down server...' });

  setTimeout(() => {
    if (serverInstance) {
      serverInstance.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  }, 100);
});

app.get('/api/dev/email/last', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Email debug endpoints are disabled in production.' });
  }

  return res.json({
    success: true,
    data: getLastSentEmail()
  });
});

app.get('/api/dev/email/log', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Email debug endpoints are disabled in production.' });
  }

  return res.json({
    success: true,
    data: getSentEmailLog()
  });
});

app.get('/api/dev/email/events', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Email debug endpoints are disabled in production.' });
  }

  return res.json({
    success: true,
    data: {
      queue: getEmailQueueSnapshot(),
      log: getEmailDeliveryLog()
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
serverInstance = app.listen(PORT, () => {
  console.log(`🚀 Neurofoundry Auth Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS enabled for: ${process.env.CORS_ORIGIN}`);
});

module.exports = app;
