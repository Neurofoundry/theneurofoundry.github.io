# OAuth Authentication Testing Guide

This guide provides step-by-step instructions for testing the complete OAuth authentication system.

## Quick Start

### 1. Start the Backend Server

```bash
# Make sure you're in the project root
cd /path/to/theneurofoundry.github.io

# Install dependencies if not already done
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### 2. Open the Standalone Test Page

Open `auth-standalone-test.html` in your browser:

**Option A: Using a local web server (recommended)**
```bash
# Using Python 3
python3 -m http.server 8080

# Then open: http://localhost:8080/auth-standalone-test.html
```

**Option B: Direct file access**
```bash
# Open directly in browser (may have CORS limitations)
open auth-standalone-test.html  # macOS
start auth-standalone-test.html # Windows
xdg-open auth-standalone-test.html # Linux
```

**Option C: Download and run locally**
1. Download `auth-standalone-test.html` to your local machine
2. Open it in any browser
3. It's fully self-contained with no external dependencies

## Testing Flow

### Step 1: Configure API URL
1. The default API URL is `http://localhost:3000/api`
2. If your server is running on a different port, update the API URL in the configuration section
3. Click "Test Connection" to verify the server is reachable

### Step 2: Test Registration
1. Fill in the registration form (default values provided):
   - Email: `test@neurofoundry.com`
   - Password: `password123`
   - Name: `Test User`
2. Click "Register"
3. Check the debug console for detailed logs
4. You should see "✓ Registration successful!"
5. The authentication status will update automatically

### Step 3: Test Logout
1. After successful registration, click "Logout"
2. Verify the authentication status shows "⚠ Not authenticated"

### Step 4: Test Login
1. Use the same credentials from registration:
   - Email: `test@neurofoundry.com`
   - Password: `password123`
2. Click "Login"
3. You should see "✓ Login successful!"
4. The authentication status will update to show user details

### Step 5: Test Profile Operations (Optional)
1. Once logged in, the profile section will appear
2. Update the name or bio fields
3. Click "Update Profile" to test profile updates
4. Click "Get Profile" to fetch current profile data

### Step 6: Test OAuth (Optional - Requires Configuration)
1. OAuth requires valid Google/GitHub credentials in the `.env` file
2. Click "Test Google OAuth" or "Test GitHub OAuth"
3. A popup window will open for OAuth authentication
4. Complete the OAuth flow in the popup
5. The popup will close automatically on success

## Debugging

### Debug Console
The standalone test page includes a comprehensive debug console that logs:
- All HTTP requests with headers and body
- All HTTP responses with status and headers
- Raw response text before JSON parsing
- JSON parsing errors with problematic text
- Authentication state changes
- All errors with stack traces

### Exporting Debug Logs
1. Click "Export Log" to download all debug information
2. Share the log file when reporting issues

### Common Issues

**Issue: Connection Failed**
- ✅ Verify the backend server is running (`npm start`)
- ✅ Check the API URL configuration
- ✅ Look for CORS errors in browser console

**Issue: Registration Failed - User Already Exists**
- ✅ Use a different email address
- ✅ Or delete the existing user from the database

**Issue: Login Failed - Invalid Credentials**
- ✅ Make sure you registered with the same email/password
- ✅ Password is case-sensitive
- ✅ In development mode, email verification is skipped

**Issue: JSON Parse Error**
- ✅ Check the debug console for the raw response
- ✅ The server may be returning HTML instead of JSON (check for 404 errors)
- ✅ Verify all required server files are present

**Issue: CORS Error**
- ✅ The CORS configuration now allows localhost and file:// protocol in development
- ✅ If still having issues, use a local web server instead of opening the file directly

## Server Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Required for basic functionality
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this

# Optional: OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Database (optional - uses in-memory storage if not configured)
# For Firebase
FIREBASE_PROJECT_ID=your-project-id

# For Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Database Options

The auth system supports three storage options:

1. **In-Memory (Default)** - No configuration needed, data lost on restart
2. **Firebase Firestore** - Set `FIREBASE_PROJECT_ID` and credentials
3. **Supabase** - Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

For testing purposes, in-memory storage is sufficient.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback

### User
- `GET /api/user/me` - Get current user profile
- `PATCH /api/profile` - Update user profile

### Health
- `GET /api/health` - Check server health

## Files Changed

### New Files
- `auth-standalone-test.html` - Standalone testing page with embedded auth client
- `AUTH_TESTING_GUIDE.md` - This file

### Modified Files
- `server/config/cors.js` - Enhanced CORS to support local file access and all localhost origins
- `server/config/passport.js` - Skip email verification in development mode

## JSON Handling Improvements

The standalone test page includes robust JSON handling:

1. **Content-Type Detection** - Checks response headers for JSON content type
2. **Raw Text Capture** - Reads raw response text before parsing
3. **Safe JSON Parsing** - Uses try-catch with detailed error logging
4. **Error Context** - Shows the actual response text when JSON parsing fails
5. **Debug Logging** - All requests, responses, and errors are logged with timestamps

## Next Steps

After successful testing:

1. ✅ Store the working credentials for future use
2. ✅ Test OAuth with real Google/GitHub credentials if needed
3. ✅ Review debug logs for any warnings or issues
4. ✅ Consider setting up a proper database (Firebase or Supabase) for production

## Support

If you encounter issues:

1. Check the debug console in the test page
2. Export the debug log for detailed analysis
3. Review the browser console (F12) for additional errors
4. Check server logs in the terminal where `npm start` is running
5. Verify all environment variables are set correctly in `.env`

## Security Notes

⚠️ **Development Mode**:
- CORS is permissive (allows localhost and file://)
- Email verification is skipped
- In-memory storage loses data on restart
- Default JWT secrets are used

🔒 **Production Mode**:
- Configure strict CORS origins
- Enable email verification
- Use proper database (Firebase/Supabase)
- Set strong JWT secrets
- Use HTTPS for all connections
