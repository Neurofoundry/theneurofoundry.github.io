# Authentication System - Quick Start Guide

This guide will help you get the Neurofoundry authentication system up and running in under 10 minutes.

## Prerequisites

- Node.js 16+ and npm installed
- A text editor
- (Optional) Firebase or Supabase account for production use

## Quick Start (Development Mode)

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

### 3. Edit .env File

Open `.env` and set these minimum required variables:

```env
# Server
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080

# JWT Secrets (CHANGE THESE!)
JWT_SECRET=change-this-to-something-secure
JWT_REFRESH_SECRET=change-this-to-something-else-secure
SESSION_SECRET=change-this-session-secret

# OAuth (Optional for now - can add later)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

> **Note:** In development mode, the system will automatically use in-memory storage if no database is configured. This is perfect for testing but data will be lost on restart.

### 4. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 Neurofoundry Auth Server running on port 3000
📊 Database: In-Memory Storage (Development Mode)
```

### 5. Start Your Frontend

In a separate terminal, serve your frontend files. If you have Python installed:

```bash
# From the root directory
python -m http.server 8080
```

Or use any other static file server.

### 6. Test the System

1. Open `http://localhost:8080/signup.html`
2. Create an account with email and password
3. You should be redirected to the login page
4. Log in with your credentials
5. You'll be redirected to your profile page

## What Works Now

✅ Email/password registration and login
✅ User profiles with avatar upload
✅ Session management with JWT tokens
✅ Protected routes and pages
✅ Basic security (bcrypt, rate limiting)

## What You Need to Add for Full Functionality

### To Enable OAuth Login:

1. **Google OAuth:**
   - Get credentials from https://console.cloud.google.com
   - Add them to `.env`:
     ```env
     GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=your-secret
     GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
     ```

2. **GitHub OAuth:**
   - Get credentials from https://github.com/settings/developers
   - Add them to `.env`:
     ```env
     GITHUB_CLIENT_ID=your-client-id
     GITHUB_CLIENT_SECRET=your-client-secret
     GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
     ```

### To Enable Email Verification & Password Reset:

Add SMTP configuration to `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@neurofoundry.io
```

### To Use a Real Database:

Choose Firebase or Supabase and follow the setup in `server/README.md`.

## File Structure

```
├── auth-client.js           # Frontend authentication library
├── login.html               # Login page
├── signup.html              # Signup page
├── profile.html             # User profile management
├── auth/
│   └── callback.html        # OAuth callback handler
└── server/
    ├── index.js             # Main server file
    ├── config/              # Configuration files
    ├── middleware/          # Authentication middleware
    ├── routes/              # API routes
    ├── services/            # Business logic
    └── utils/               # Utilities
```

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Copy the `accessToken` from the response, then:

### Get Profile
```bash
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common Issues

**Port already in use:**
```bash
# Change PORT in .env to something else like 3001
PORT=3001
```

**CORS errors:**
- Make sure FRONTEND_URL in .env matches where you're serving your frontend
- Default is http://localhost:8080

**Can't log in after registration:**
- Check the server console for error messages
- Verify your JWT secrets are set in .env

## Next Steps

1. **Set up OAuth providers** for social login (see `server/README.md`)
2. **Configure a real database** for production use
3. **Set up email service** for verification and password reset
4. **Customize the UI** to match your branding
5. **Add more features** like 2FA, role-based access, etc.

## Full Documentation

For complete documentation including:
- Database setup (Firebase, Supabase)
- OAuth provider configuration
- API reference
- Security features
- Production deployment

See `server/README.md`.

## Support

If you run into issues:
1. Check the server console for error messages
2. Verify all required environment variables are set
3. Ensure dependencies are installed (`npm install`)
4. Review the full README in the server directory

## Architecture Overview

```
Browser                          Server                      Database
┌──────────┐                  ┌──────────┐                ┌──────────┐
│          │                  │          │                │          │
│ Frontend │ ←── REST API ──→ │ Express  │ ←── Adapter ─→│ Firebase │
│  Pages   │                  │ + JWT    │                │    or    │
│          │                  │          │                │ Supabase │
└──────────┘                  └──────────┘                └──────────┘
     ↓                             ↓
auth-client.js              passport-strategies
     ↓                             ↓
- Local storage             - Local auth
- Token management          - Google OAuth
- API calls                 - GitHub OAuth
```

That's it! You now have a fully functional authentication system. Happy building! 🔥
