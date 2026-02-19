# Environment Setup Instructions

## Creating Your .env File

The `.env` file is **not** included in the repository for security reasons. You need to create it yourself.

### Quick Setup (Copy and paste)

Create a file named `.env` in the root directory with this content:

```env
# Copy the entire contents of .env.example
# OR use the command below:

# On Linux/Mac:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

### What's in the .env file?

The `.env.example` file contains all necessary configuration with:
- ✅ Working placeholder values for testing
- ✅ In-memory database (no setup required)
- ✅ Disabled email service (optional)
- ⚠️ Placeholder OAuth credentials (need real ones for OAuth)

### For Testing (No changes needed!)

The default values in `.env.example` work perfectly for:
- Local signup/login
- Profile management
- JWT authentication
- All API endpoints

Just copy `.env.example` to `.env` and start the server!

### For Production

After copying `.env.example` to `.env`, update these values:

1. **JWT Secrets** (REQUIRED)
   ```env
   JWT_SECRET=your-actual-secret-key-here
   JWT_REFRESH_SECRET=your-actual-refresh-secret-here
   SESSION_SECRET=your-actual-session-secret-here
   ```

2. **Database** (Choose one)
   - Firebase: Uncomment and fill Firebase config
   - Supabase: Uncomment and fill Supabase config
   - In-memory: Leave as-is (testing only)

3. **OAuth** (Optional but recommended)
   - Google: Get credentials from console.cloud.google.com
   - GitHub: Get credentials from github.com/settings/developers

4. **Email** (Optional)
   - SMTP settings for verification emails

### Security Note

⚠️ **NEVER commit your .env file to git!**

The `.env` file is already in `.gitignore` to prevent accidental commits.

### Troubleshooting

**Problem**: Server won't start
- **Solution**: Make sure `.env` file exists (copy from `.env.example`)

**Problem**: OAuth not working
- **Solution**: Replace placeholder OAuth credentials with real ones

**Problem**: Database errors
- **Solution**: Leave database config commented out to use in-memory storage

---

**TL;DR**: Copy `.env.example` to `.env` and start coding! Everything works out of the box for testing.
