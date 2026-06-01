/**
 * Session Configuration
 */

const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'neurofoundry-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
};

// Use Redis for session storage if configured
if (process.env.REDIS_URL) {
  const redisClient = createClient({
    url: process.env.REDIS_URL,
    legacyMode: false
  });

  redisClient.connect().catch(console.error);

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Connected to Redis for session storage');
  });

  sessionConfig.store = new RedisStore({ client: redisClient });
}

module.exports = { sessionConfig };
