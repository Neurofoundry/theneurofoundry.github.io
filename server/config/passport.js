/**
 * Passport Authentication Configuration
 * Supports Google OAuth and Local Strategy
 */

const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const { findUserById, findUserByEmail, findOrCreateOAuthUser } = require('../services/userService');

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

module.exports = function(passport) {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await findUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // ============================================
  // LOCAL STRATEGY (Email/Password)
  // ============================================
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await findUserByEmail(email);

          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if user signed up with OAuth
          if (user.authProvider !== 'local') {
            return done(null, false, {
              message: `Please sign in with ${user.authProvider}`
            });
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if email is verified (skip in development for testing)
          if (!user.emailVerified && process.env.NODE_ENV === 'production') {
            return done(null, false, { message: 'Please verify your email address' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // ============================================
  // GOOGLE OAUTH STRATEGY
  // ============================================
  if (!isPlaceholderValue(process.env.GOOGLE_CLIENT_ID) && !isPlaceholderValue(process.env.GOOGLE_CLIENT_SECRET)) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const userData = {
              authProvider: 'google',
              authProviderId: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              avatar: profile.photos[0]?.value,
              emailVerified: true // Google emails are pre-verified
            };

            const user = await findOrCreateOAuthUser(userData);
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }
};
