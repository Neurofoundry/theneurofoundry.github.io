/**
 * Neurofoundry Authentication Server
 * Main entry point for the Express.js backend
 */

require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
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
const paymentRoutes = require('./routes/payments');
const forgeRoutes = require('./routes/forge');
const { findUserById } = require('./services/userService');
const { getProfileAvatar } = require('./services/r2AvatarClient');
const { getLastSentEmail, getSentEmailLog, sendCrmEmail, sendDevConsoleEmail } = require('./services/emailService');
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
          'script-src': ["'self'", "'unsafe-inline'", 'https://challenges.cloudflare.com'],
          'frame-src': ["'self'", 'https://challenges.cloudflare.com'],
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
app.use('/api/payments/square/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '32mb' }));
app.use(express.urlencoded({ extended: true, limit: '32mb' }));
app.use(cookieParser());

// Serve only the explicit public build artifact.
const publicDirectory = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDirectory, {
  dotfiles: 'deny',
  index: 'index.html',
  fallthrough: true
}));

// Serve uploads directory
app.use('/uploads', express.static('uploads'));

// Session middleware
app.use(session(sessionConfig));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

app.get('/api/profile/avatar/public/:userId', async (req, res, next) => {
  try {
    const user = await findUserById(req.params.userId);
    const preferences = user?.preferences && typeof user.preferences === 'object'
      ? user.preferences
      : {};
    const avatarKey = preferences.r2Avatar?.key;

    if (!avatarKey) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    const avatarResponse = await getProfileAvatar(avatarKey);
    res.set('Content-Type', avatarResponse.headers.get('content-type') || 'image/webp');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    const arrayBuffer = await avatarResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    return next(error);
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/forge', forgeRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/skeleton-key/changelog', (req, res) => {
  const requested = String(req.query.messageId || req.query.version || '').trim();
  const latest = String(skeletonKeyChangelog.latest || '').trim();
  const key = requested || latest;
  const changelog = skeletonKeyChangelog[key] || null;

  if (!changelog) {
    return res.status(404).type('application/json').json({
      error: 'changelog_not_found',
      key
    });
  }

  return res.type('application/json').json({
    messageId: changelog.messageId || key,
    ...changelog
  });
});

function secretsMatch(provided, expected) {
  const providedBuffer = Buffer.from(String(provided || ''));
  const expectedBuffer = Buffer.from(String(expected || ''));
  return providedBuffer.length === expectedBuffer.length
    && providedBuffer.length > 0
    && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

app.post('/api/skeleton-key/download-notification', async (req, res, next) => {
  try {
    const expectedSecret = process.env.SKELETON_KEY_DOWNLOAD_WEBHOOK_SECRET;
    const providedSecret = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!secretsMatch(providedSecret, expectedSecret)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const timestamp = cleanContactField(req.body.timestamp, 64) || new Date().toISOString();
    const country = cleanContactField(req.body.country, 8) || 'unknown';
    const uniqueCount = Number.isFinite(Number(req.body.uniqueCount)) ? Number(req.body.uniqueCount) : 0;
    const count = Number.isFinite(Number(req.body.count)) ? Number(req.body.count) : 0;
    const result = await sendDevConsoleEmail({
      type: 'skeleton_key_unique_download',
      to: process.env.SKELETON_KEY_DOWNLOAD_NOTIFICATION_TO || 'info@theneurofoundry.com',
      subject: 'New unique Skeleton Key download',
      text: [
        'A new unique user downloaded Skeleton Key.',
        '',
        `Time: ${timestamp}`,
        `Country: ${country}`,
        `Unique downloads tracked: ${uniqueCount}`,
        `Total download clicks tracked: ${count}`
      ].join('\n')
    });

    if (!result.sent) {
      return res.status(503).json({
        success: false,
        message: result.reason || 'Email notification was not sent'
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

function cleanContactField(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

async function verifyTurnstileToken(token, remoteIp) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET || '').trim();
  if (!secret) {
    return { success: false, reason: 'turnstile_not_configured' };
  }
  if (!token || token.length > 2048) {
    return { success: false, reason: 'turnstile_token_missing' };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp || undefined
      })
    });
    const result = await response.json();
    return {
      success: response.ok && result.success === true && result.action === 'about_contact',
      reason: result.action !== 'about_contact' ? 'turnstile_action_mismatch' : null,
      errors: result['error-codes'] || []
    };
  } catch (error) {
    console.error('Turnstile verification failed:', error.message);
    return { success: false, reason: 'turnstile_verification_failed' };
  }
}

function getContactClientIp(req) {
  return String(req.headers['fly-client-ip'] || req.ip || '').trim();
}

function getContactRateLimitKey(req) {
  const ip = getContactClientIp(req);
  if (!ip.includes(':')) return ip;

  // Group IPv6 clients by /64 so rotating interface identifiers cannot bypass the limit.
  return ip.split(':').slice(0, 4).join(':');
}

const CONTACT_COOLDOWN_MS = 60 * 60 * 1000;
const contactCooldowns = new Map();
const contactApprovalTokens = new Map();

function getContactCooldownKeys(req, email) {
  return [`email:${email}`, `ip:${getContactRateLimitKey(req)}`];
}

function getActiveContactCooldown(keys) {
  const now = Date.now();
  let active = null;

  for (const key of keys) {
    const entry = contactCooldowns.get(key);
    if (!entry) continue;
    if (entry.expiresAt <= now) {
      contactCooldowns.delete(key);
      contactApprovalTokens.delete(entry.approvalToken);
      continue;
    }
    if (!active || entry.expiresAt > active.expiresAt) active = entry;
  }

  return active;
}

function setContactCooldown(keys, approvalToken) {
  const entry = {
    approvalToken,
    expiresAt: Date.now() + CONTACT_COOLDOWN_MS
  };
  keys.forEach((key) => contactCooldowns.set(key, entry));
  contactApprovalTokens.set(approvalToken, keys);
}

app.get('/api/contact/approve/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  const keys = contactApprovalTokens.get(token);
  if (!keys) {
    return res.status(404).type('text/plain').send('This contact approval link is invalid or has already been used.');
  }

  keys.forEach((key) => contactCooldowns.delete(key));
  contactApprovalTokens.delete(token);
  return res.type('text/plain').send('Contact cooldown cleared. This sender can submit another request.');
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getContactRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a few minutes before trying again.'
  }
});

app.post('/api/contact', contactLimiter, async (req, res, next) => {
  try {
    const name = cleanContactField(req.body.name, 120);
    const email = cleanContactField(req.body.email, 254).toLowerCase();
    const organization = cleanContactField(req.body.organization, 160);
    const timezone = cleanContactField(req.body.timezone, 80);
    const engagement = cleanContactField(req.body.engagement, 80);
    const timeline = cleanContactField(req.body.timeline, 80);
    const budget = cleanContactField(req.body.budget, 120);
    const message = cleanContactField(req.body.message, 5000);
    const privateDetails = req.body.privateDetails === true;
    const turnstileToken = cleanContactField(req.body.turnstileToken, 2048);

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and a description of the work are required.'
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    const cooldownKeys = getContactCooldownKeys(req, email);
    const cooldown = getActiveContactCooldown(cooldownKeys);
    if (cooldown) {
      const retryAfterSeconds = Math.ceil((cooldown.expiresAt - Date.now()) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: 'Your request was already sent. Please wait up to one hour before sending another message.'
      });
    }

    const remoteIp = getContactClientIp(req);
    const turnstile = await verifyTurnstileToken(turnstileToken, remoteIp);
    if (!turnstile.success) {
      return res.status(turnstile.reason === 'turnstile_not_configured' ? 503 : 400).json({
        success: false,
        message: turnstile.reason === 'turnstile_not_configured'
          ? 'Contact verification is not configured yet. Please email info@theneurofoundry.com directly.'
          : 'Please complete the verification check and try again.'
      });
    }

    const recipient = String(process.env.CONTACT_FORM_TO || 'info@theneurofoundry.com').trim();
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const approvalBase = process.env.APP_URL || 'https://nf-auth-clean-20260219.fly.dev';
    const approvalUrl = new URL(`/api/contact/approve/${approvalToken}`, approvalBase).toString();
    const text = [
      'New request from the Neurofoundry About page',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Organization: ${organization || 'Not provided'}`,
      `Time zone: ${timezone || 'Not provided'}`,
      `Type of work: ${engagement || 'Not provided'}`,
      `Timeline: ${timeline || 'Not provided'}`,
      `Budget: ${budget || 'Not provided'}`,
      `Private-details email thread requested: ${privateDetails ? 'Yes' : 'No'}`,
      '',
      'Work description:',
      message,
      '',
      'Allow another submission from this sender before the one-hour cooldown expires:',
      approvalUrl
    ].join('\n');

    const result = await sendCrmEmail({
      to: recipient,
      replyTo: email,
      subject: `New Neurofoundry request from ${name}`,
      text,
      type: 'about_contact'
    });

    if (!result?.sent) {
      return res.status(503).json({
        success: false,
        message: 'The request could not be sent right now. Please email info@theneurofoundry.com directly.'
      });
    }

    setContactCooldown(cooldownKeys, approvalToken);

    return res.json({
      success: true,
      message: 'Request sent. We will reply directly by email.'
    });
  } catch (error) {
    return next(error);
  }
});

function getDevConsoleSendKey(req) {
  const auth = String(req.headers.authorization || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return String(
    req.headers['x-devconsole-send-key']
    || req.headers['x-neuroforge-console-key']
    || ''
  ).trim();
}

app.post('/api/dev/send', async (req, res, next) => {
  try {
    const expectedKey = String(process.env.DEVCONSOLE_SEND_API_KEY || '').trim();
    if (!expectedKey) {
      return res.status(503).json({
        success: false,
        message: 'DevConsole send endpoint is not configured.'
      });
    }

    const providedKey = getDevConsoleSendKey(req);
    if (!providedKey || providedKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const fromAddress = String(req.body.from || '').trim();
    if (fromAddress && !/(^|<)[^<>\s@]+@theneurofoundry\.com(>|$)/i.test(fromAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Sender must be a theneurofoundry.com address.'
      });
    }

    const toAddress = String(req.body.to || '').trim();
    const subject = String(req.body.subject || '').trim();
    const text = String(req.body.text || req.body.body || '').trim();
    const html = String(req.body.html || '').trim();
    if (!toAddress || !toAddress.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required.'
      });
    }
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required.'
      });
    }
    if (!text && !html) {
      return res.status(400).json({
        success: false,
        message: 'Message body is required.'
      });
    }

    const result = await sendDevConsoleEmail({
      to: toAddress,
      from: fromAddress,
      subject,
      text,
      html,
      type: req.body.type || 'devconsole'
    });

    if (!result?.sent) {
      return res.status(503).json({
        success: false,
        message: result?.reason || 'Email was not sent',
        data: result || null
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
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
