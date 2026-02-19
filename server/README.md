# Neurofoundry Authentication System

Complete OAuth and user authentication system for the Neurofoundry platform.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Setup Guide](#setup-guide)
- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [OAuth Provider Setup](#oauth-provider-setup)
- [API Documentation](#api-documentation)
- [Security Features](#security-features)
- [Testing](#testing)

## Features

✅ **Complete Authentication System**
- Local email/password authentication with bcrypt hashing
- OAuth 2.0 integration (Google and GitHub)
- JWT-based session management with refresh tokens
- Email verification with token-based confirmation
- Password reset with secure tokens
- User profile management with avatar upload

✅ **Multi-Database Support**
- Firebase Admin SDK
- Supabase
- In-memory storage (development/testing)
- Automatic adapter selection based on configuration

✅ **Security Features**
- bcrypt password hashing (12 rounds)
- JWT access and refresh tokens
- HTTP-only cookies for token storage
- Rate limiting on authentication endpoints
- CORS protection
- Helmet security headers
- Input validation with express-validator
- CSRF protection ready

✅ **Frontend Integration**
- Client-side authentication library (`auth-client.js`)
- OAuth popup and redirect flow support
- Automatic token refresh
- LocalStorage state management
- Complete UI pages (login, signup, profile, callback)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  login.html  │  │ signup.html  │  │ profile.html │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └──────────────────┴──────────────────┘             │
│                    auth-client.js                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS/REST API
┌─────────────────────────┴───────────────────────────────────┐
│                  Backend (Express.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Routes & Middleware                     │   │
│  │  • /api/auth (register, login, OAuth)                │   │
│  │  • /api/user (profile, preferences)                  │   │
│  │  • /api/profile (avatar, details)                    │   │
│  └────────────────┬─────────────────────────────────────┘   │
│  ┌────────────────┴─────────────────────────────────────┐   │
│  │           Passport.js Strategies                     │   │
│  │  • Local (email/password)                            │   │
│  │  • Google OAuth 2.0                                  │   │
│  │  • GitHub OAuth                                      │   │
│  └────────────────┬─────────────────────────────────────┘   │
│  ┌────────────────┴─────────────────────────────────────┐   │
│  │           Services & Database Adapter                │   │
│  │  • userService (CRUD operations)                     │   │
│  │  • emailService (verification, reset)                │   │
│  │  • Database abstraction layer                        │   │
│  └────────────────┬─────────────────────────────────────┘   │
└───────────────────┼─────────────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────────────┐
│               Database (Choose One)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │   Supabase   │  │  In-Memory   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Setup Guide

### 1. Install Dependencies

```bash
# Navigate to server directory
cd server

# Install all dependencies
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration. See [Environment Variables](#environment-variables) section for details.

### 3. Set Up Database

Choose one of the following database options:

**Option A: Firebase (Recommended for production)**
1. Create a Firebase project at https://console.firebase.google.com
2. Generate a service account key
3. Save it as `server/config/firebase-credentials.json`
4. Set `FIREBASE_PROJECT_ID` in `.env`

**Option B: Supabase**
1. Create a project at https://supabase.com
2. Get your project URL and anon key
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`

**Option C: In-Memory (Development only)**
- No configuration needed
- Data is lost on server restart

### 4. Configure OAuth Providers

See [OAuth Provider Setup](#oauth-provider-setup) section for detailed instructions.

### 5. Configure Email Service (Optional)

For email verification and password reset:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@neurofoundry.io
```

### 6. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or your configured `PORT`).

## Environment Variables

### Required Variables

```env
# Server Configuration
NODE_ENV=development                    # 'development' or 'production'
PORT=3000                               # Server port
BASE_URL=http://localhost:3000          # Your backend URL
FRONTEND_URL=http://localhost:8080      # Your frontend URL

# JWT Configuration (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-this-too
JWT_EXPIRES_IN=15m                      # Access token expiry
JWT_REFRESH_EXPIRES_IN=7d               # Refresh token expiry

# Session Configuration
SESSION_SECRET=your-session-secret-change-this
```

### OAuth Configuration

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
```

### Database Configuration (Choose One)

```env
# Option A: Firebase
FIREBASE_PROJECT_ID=your-project-id
# Place firebase-credentials.json in server/config/

# Option B: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Option C: In-Memory (automatic if no other DB configured)
# No configuration needed
```

### Optional Configuration

```env
# Email Service (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@neurofoundry.io

# Security
BCRYPT_ROUNDS=12                        # Password hashing rounds
RATE_LIMIT_WINDOW_MS=900000            # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100            # Max requests per window

# File Upload
MAX_FILE_SIZE=5242880                  # 5MB in bytes
UPLOAD_DIR=uploads/avatars             # Avatar upload directory
```

## Database Configuration

### Firebase Setup

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Click "Add Project"
   - Follow the setup wizard

2. **Enable Authentication**
   - In Firebase Console, go to Authentication
   - Enable Email/Password sign-in method
   - Enable Google and GitHub providers

3. **Generate Service Account Key**
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `server/config/firebase-credentials.json`

4. **Set Up Firestore**
   - Go to Firestore Database
   - Create database in production mode (or test mode for development)
   - Create collection: `users`

5. **Update .env**
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   ```

### Supabase Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Wait for setup to complete

2. **Create Users Table**
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     email TEXT UNIQUE NOT NULL,
     password TEXT,
     name TEXT,
     username TEXT UNIQUE,
     avatar TEXT,
     email_verified BOOLEAN DEFAULT false,
     auth_provider TEXT DEFAULT 'local',
     role TEXT DEFAULT 'user',
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT NOW(),
     preferences JSONB DEFAULT '{}'::jsonb
   );

   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_username ON users(username);
   ```

3. **Update .env**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

### In-Memory Storage (Development)

- Automatically used if no other database is configured
- No setup required
- Data is lost on server restart
- Not suitable for production

## OAuth Provider Setup

### Google OAuth 2.0

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com
   - Create a new project or select existing

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"

4. **Configure OAuth Consent Screen**
   - Set application name: "Neurofoundry"
   - Add your domain
   - Add scopes: email, profile, openid

5. **Set Authorized Redirect URIs**
   ```
   http://localhost:3000/api/auth/google/callback
   https://yourdomain.com/api/auth/google/callback
   ```

6. **Add Authorized JavaScript Origins**
   ```
   http://localhost:3000
   http://localhost:8080
   https://yourdomain.com
   ```

7. **Copy Credentials to .env**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
   ```

### GitHub OAuth

1. **Go to GitHub Settings**
   - Visit https://github.com/settings/developers
   - Click "New OAuth App"

2. **Configure OAuth App**
   - Application name: "Neurofoundry"
   - Homepage URL: `http://localhost:8080` (or your domain)
   - Authorization callback URL: `http://localhost:3000/api/auth/github/callback`

3. **Generate Client Secret**
   - After creating, click "Generate a new client secret"
   - Copy the secret immediately (shown only once)

4. **Copy Credentials to .env**
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
   ```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": "15m"
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### OAuth Login (Google)
```http
GET /api/auth/google
```
Redirects to Google OAuth consent screen.

#### OAuth Callback (Google)
```http
GET /api/auth/google/callback?code=AUTH_CODE
```
Handles OAuth callback and returns tokens.

#### OAuth Login (GitHub)
```http
GET /api/auth/github
```

#### OAuth Callback (GitHub)
```http
GET /api/auth/github/callback?code=AUTH_CODE
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Verify Email
```http
GET /api/auth/verify-email/:token
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "password": "newSecurePassword123"
}
```

### User Endpoints (Protected)

All user endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <access-token>
```

#### Get Current User
```http
GET /api/user/me
```

#### Update Preferences
```http
PATCH /api/user/preferences
Content-Type: application/json

{
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

#### Deactivate Account
```http
POST /api/user/deactivate
```

### Profile Endpoints (Protected)

#### Get Profile
```http
GET /api/profile
```

#### Update Profile
```http
PATCH /api/profile
Content-Type: application/json

{
  "name": "Jane Doe",
  "username": "janedoe",
  "bio": "Software engineer and AI enthusiast",
  "location": "San Francisco, CA",
  "company": "Tech Corp",
  "website": "https://example.com"
}
```

#### Upload Avatar
```http
POST /api/profile/avatar
Content-Type: multipart/form-data

avatar: <file>
```

#### Delete Avatar
```http
DELETE /api/profile/avatar
```

## Security Features

### Password Security
- **bcrypt hashing** with 12 rounds (configurable)
- Minimum password length enforced (8 characters)
- Passwords never stored in plain text
- Passwords never returned in API responses

### Token Security
- **JWT tokens** with configurable expiration
- Separate access tokens (short-lived) and refresh tokens (long-lived)
- HTTP-only cookies for token storage (prevents XSS)
- Token signature verification on every request

### Rate Limiting
- Configurable rate limits on authentication endpoints
- Prevents brute force attacks
- Default: 100 requests per 15 minutes

### Input Validation
- All inputs validated with express-validator
- Email format validation
- Password strength requirements
- SQL injection prevention
- XSS protection

### CORS Protection
- Configurable allowed origins
- Credentials support
- Preflight request handling

### Headers Security (Helmet)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (HTTPS)
- Content-Security-Policy ready

### Session Security
- Secure session secrets
- Session fixation prevention
- Cookie security flags (httpOnly, secure in production)

## Testing

### Manual Testing

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Test Registration**
   - Open `http://localhost:8080/signup.html`
   - Fill in the form and submit
   - Check for success message

3. **Test Login**
   - Open `http://localhost:8080/login.html`
   - Enter credentials
   - Should redirect to profile

4. **Test OAuth**
   - Click "Sign in with Google" on login page
   - Complete OAuth flow
   - Should redirect to profile

5. **Test Profile**
   - Navigate to `http://localhost:8080/profile.html`
   - Update profile information
   - Upload avatar
   - Check for success messages

### API Testing with cURL

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Profile (with token):**
```bash
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Testing with Postman

1. Import the API endpoints into Postman
2. Set up environment variables for BASE_URL and tokens
3. Test each endpoint sequentially
4. Verify responses match expected format

## Troubleshooting

### Common Issues

**"Cannot find module" errors**
```bash
npm install
```

**Database connection errors**
- Verify your database credentials in `.env`
- Check Firebase credentials file path
- Ensure Supabase URL and key are correct

**OAuth errors**
- Verify redirect URIs match exactly in OAuth provider console
- Check that client ID and secret are correct
- Ensure OAuth provider APIs are enabled

**Email not sending**
- Verify SMTP credentials
- Check that less secure app access is enabled (Gmail)
- Use app-specific password instead of regular password

**Token errors**
- Ensure JWT_SECRET is set and hasn't changed
- Check token expiration times
- Verify token is being sent in Authorization header

**CORS errors**
- Add your frontend URL to FRONTEND_URL in `.env`
- Check CORS configuration in `server/index.js`

## Production Deployment

### Pre-Deployment Checklist

- [ ] Change all secret keys in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database (Firebase or Supabase)
- [ ] Set up production OAuth redirect URIs
- [ ] Enable HTTPS
- [ ] Configure secure cookies
- [ ] Set up email service with production SMTP
- [ ] Test all authentication flows
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Environment Variables for Production

```env
NODE_ENV=production
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-secret>
SESSION_SECRET=<another-strong-secret>
```

### Security Recommendations

1. Use HTTPS in production (SSL/TLS certificates)
2. Enable secure cookies: `COOKIE_SECURE=true`
3. Use environment-specific secrets
4. Enable helmet security headers
5. Set up database backups
6. Monitor authentication attempts
7. Implement IP-based rate limiting
8. Regular security audits
9. Keep dependencies updated
10. Use a process manager (PM2, systemd)

## License

Copyright © 2025 The Neurofoundry. All rights reserved.
