/**
 * Passport Authentication Configuration
 * Supports Google OAuth, GitHub OAuth, and Local Strategy
 */

const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcrypt');
const { findUserById, findUserByEmail, createUser, findOrCreateOAuthUser } = require('../services/userService');

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

          // Check if email is verified
          if (!user.emailVerified) {
            return done(null, false, { message: 'Please verify your email first' });
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
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
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

  // ============================================
  // GITHUB OAUTH STRATEGY
  // ============================================
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
          scope: ['user:email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // GitHub might not provide email in profile
            const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;

            const userData = {
              authProvider: 'github',
              authProviderId: profile.id,
              email: email,
              name: profile.displayName || profile.username,
              username: profile.username,
              avatar: profile.photos?.[0]?.value || profile.avatar_url,
              emailVerified: profile.emails?.[0]?.verified || false
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
