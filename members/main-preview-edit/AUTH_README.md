# Neurofoundry Authentication System

Complete user authentication system with local signup/login and OAuth integration (Google, GitHub).

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

The `.env` file has been created with placeholder values for sandbox testing. The system will work with in-memory storage (no database required for testing).

**For production**, you'll need to configure:
- Database (Firebase or Supabase)
- OAuth credentials (Google and/or GitHub)
- Email service (optional, for verification emails)

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# OR production mode
npm start
```

The server will start on `http://localhost:3000`

### 4. Test the Auth System

Open the test page in your browser:
```
http://localhost:8080/auth-test.html
```

Or use the existing pages:
- Signup: `http://localhost:8080/signup.html`
- Login: `http://localhost:8080/login.html`
- Profile: `http://localhost:8080/profile.html`

## 📁 Project Structure

```
.
├── server/
│   ├── index.js                 # Express server entry point
│   ├── config/
│   │   ├── database.js          # Multi-database support (Firebase/Supabase/Memory)
│   │   ├── passport.js          # OAuth strategies configuration
│   │   ├── cors.js              # CORS settings
│   │   └── session.js           # Session configuration
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── user.js              # User data routes
│   │   └── profile.js           # Profile management routes
│   ├── services/
│   │   ├── userService.js       # User database operations
│   │   └── emailService.js      # Email verification/reset
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication middleware
│   │   └── errorHandler.js     # Global error handler
│   └── utils/
│       └── jwt.js               # JWT token utilities
├── auth-client.js               # Frontend authentication library
├── auth-test.html               # Test page for all auth flows
├── signup.html                  # User registration page
├── login.html                   # User login page
├── profile.html                 # User profile management
├── auth/
│   └── callback.html            # OAuth callback handler
└── uploads/
    └── avatars/                 # Avatar uploads directory
```

## 🔥 Features

### ✅ Implemented

- **Local Authentication**
  - User registration with email/password
  - Secure login with bcrypt hashing
  - JWT token generation and validation
  - Refresh token support
  - Protected routes with middleware

- **OAuth Integration**
  - Google OAuth 2.0
  - GitHub OAuth 2.0
  - Popup-based OAuth flow
  - Automatic account linking

- **User Management**
  - Get current user profile
  - Update profile information
  - Avatar upload
  - Email verification flow
  - Password reset flow
  - Account deactivation

- **Security**
  - JWT-based authentication
  - HTTP-only cookies
  - CORS configuration
  - Rate limiting
  - Helmet security headers
  - Input validation

- **Database Support**
  - In-memory storage (development/testing)
  - Firebase Firestore
  - Supabase (PostgreSQL)

## 🧪 Testing

### Using the Test Page

1. Start the server: `npm run dev`
2. Open `http://localhost:8080/auth-test.html`
3. Test each feature:
   - **Register**: Create a new test user
   - **Login**: Sign in with the test user
   - **Profile**: Update user information
   - **OAuth**: Test Google/GitHub (requires valid credentials)
   - **Logout**: Clear authentication

### Manual API Testing

#### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Get current user (with JWT token)
```bash
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔧 Configuration

### OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Update `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Update `.env`:
   ```
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

### Database Setup

#### Option 1: In-Memory (Default - No setup required)
Perfect for testing and development. Data is lost on server restart.

#### Option 2: Firebase
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Get your project credentials
3. Update `.env` with Firebase config
4. The system will automatically use Firebase

#### Option 3: Supabase
1. Create a project at [Supabase](https://supabase.com)
2. Create a `users` table with the schema:
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255),
     first_name VARCHAR(100),
     last_name VARCHAR(100),
     username VARCHAR(100) UNIQUE,
     avatar TEXT,
     auth_provider VARCHAR(50),
     auth_provider_id VARCHAR(255),
     password TEXT,
     email_verified BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     last_login_at TIMESTAMP,
     is_active BOOLEAN DEFAULT TRUE,
     role VARCHAR(50) DEFAULT 'user',
     bio TEXT,
     location VARCHAR(255),
     website TEXT,
     company VARCHAR(255),
     verification_token TEXT,
     verification_token_expires TIMESTAMP,
     reset_password_token TEXT,
     reset_password_expires TIMESTAMP
   );
   ```
3. Update `.env` with Supabase URL and keys

### Email Service (Optional)
For email verification and password reset emails:

1. Use Gmail with app-specific password:
   - Enable 2FA on your Google account
   - Create app password at [App Passwords](https://myaccount.google.com/apppasswords)

2. Update `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-specific-password
   EMAIL_FROM=noreply@theneurofoundry.com
   ```

## 🔒 Security Notes

### Current Setup (Development/Testing)
- Uses placeholder JWT secrets
- In-memory storage
- Placeholder OAuth credentials
- Email service disabled

### For Production
**⚠️ IMPORTANT: Before deploying to production:**

1. **Change all secrets** in `.env`:
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SESSION_SECRET`

2. **Configure a real database** (Firebase or Supabase)

3. **Set up real OAuth credentials**:
   - Google OAuth
   - GitHub OAuth
   - Update redirect URLs for production domain

4. **Enable HTTPS**:
   - Set `NODE_ENV=production`
   - Use SSL certificates
   - Update `secure` cookie settings

5. **Configure email service** for verification

6. **Set up Redis** for session storage (optional but recommended)

7. **Review rate limits** and adjust as needed

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/verify-email/:token` - Verify email with token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### User (Protected)
- `GET /api/user/me` - Get current user
- `PATCH /api/user/preferences` - Update user preferences
- `POST /api/user/deactivate` - Deactivate account

### Profile (Protected)
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update profile
- `POST /api/profile/avatar` - Upload avatar
- `DELETE /api/profile/avatar` - Delete avatar

### Health Check
- `GET /api/health` - Server health status

## 🐛 Troubleshooting

### Server won't start
- Check that port 3000 is not in use: `lsof -i :3000`
- Verify all dependencies are installed: `npm install`
- Check `.env` file exists

### OAuth not working
- Verify OAuth credentials in `.env`
- Check redirect URLs match OAuth app settings
- Ensure frontend URL is correct in `CORS_ORIGIN`

### CORS errors
- Add your frontend URL to `CORS_ORIGIN` in `.env`
- Format: `http://localhost:8080,https://yourdomain.com`

### Database connection errors
- Check database credentials in `.env`
- Verify network connectivity
- For in-memory mode, just remove database config from `.env`

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Documentation](https://jwt.io/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## 🤝 Support

For issues or questions:
1. Check this README
2. Review the test page at `/auth-test.html`
3. Check server logs for detailed error messages
4. Verify `.env` configuration

---

**Status**: ✅ Fully functional with in-memory storage for testing
**Production Ready**: ⚠️ Requires configuration (database, OAuth, secrets)
