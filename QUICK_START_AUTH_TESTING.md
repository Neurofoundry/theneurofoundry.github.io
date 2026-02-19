# Quick Start: Testing OAuth Authentication

## 🚀 Simple 3-Step Testing

### Step 1: Start Server
```bash
npm start
```
Server runs on: `http://localhost:3000`

### Step 2: Open Test Page
Open `auth-standalone-test.html` in your browser (or serve it with a local web server)

### Step 3: Test the Flow
1. Click **Register** → Creates new user
2. Click **Logout** → Logs out
3. Click **Login** → Logs back in
4. Test profile updates (optional)

## 📁 Test Files

- **`auth-standalone-test.html`** - Complete standalone testing page (no dependencies, works offline)
  - Built-in debug console
  - Comprehensive error logging
  - Works with local file:// protocol
  - Can be downloaded and used anywhere

- **`auth-test.html`** - Original test page (requires auth-client.js)
  - Server control buttons
  - Same functionality as standalone
  - Needs to be served from project directory

- **`AUTH_TESTING_GUIDE.md`** - Detailed testing documentation
  - Complete API reference
  - Troubleshooting guide
  - Configuration instructions

## ⚙️ Environment Setup (Optional)

For OAuth testing, create `.env` file:
```bash
cp .env.example .env
# Edit .env with your OAuth credentials
```

For basic testing, **no configuration needed** - uses in-memory storage.

## 🐛 Debugging

All test pages include:
- ✅ Real-time debug console
- ✅ Request/response logging
- ✅ JSON parse error detection
- ✅ Export debug logs

## 🔧 What's Been Fixed

### JSON Issues
- ✅ Proper content-type detection
- ✅ Safe JSON parsing with error handling
- ✅ Raw response logging when parsing fails
- ✅ Better error messages with context

### CORS Issues
- ✅ Allows localhost and 127.0.0.1 in development
- ✅ Allows file:// protocol for standalone testing
- ✅ Supports all common development ports

### Testing Issues
- ✅ Email verification skipped in development mode
- ✅ Better error messages for troubleshooting
- ✅ Comprehensive debug logging

## 📝 Common Test Scenarios

### Scenario 1: New User Registration
```
1. Register with email: test@example.com
2. Login with same credentials
3. Update profile
```

### Scenario 2: Existing User
```
1. Try to register again → See "User already exists" error
2. Login with existing credentials
3. Test logout
```

### Scenario 3: OAuth (requires setup)
```
1. Click "Test Google OAuth" or "Test GitHub OAuth"
2. Complete OAuth in popup
3. Popup closes automatically on success
```

## ❓ Need Help?

1. Check the debug console in the test page
2. Review `AUTH_TESTING_GUIDE.md` for detailed docs
3. Check browser console (F12) for errors
4. Check server terminal for backend errors

## 📊 Memory Stored

The following has been stored in memory for future sessions:
- ✅ OAuth system architecture and configuration
- ✅ Auth testing page location and usage
- ✅ Server startup commands and requirements
