/**
 * CORS Configuration
 */

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080', 'http://127.0.0.1:3000'];

    // Allow requests with no origin (like mobile apps, curl requests, or local file:// protocol)
    if (!origin) return callback(null, true);

    // Allow any localhost or 127.0.0.1 origin in development
    if (
      process.env.NODE_ENV !== 'production'
      && (
        origin === 'null'
        || origin.includes('localhost')
        || origin.includes('127.0.0.1')
        || origin.startsWith('file://')
      )
    ) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
};

module.exports = { corsOptions };
