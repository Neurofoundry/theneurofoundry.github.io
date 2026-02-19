# 🚀 Production Deployment Guide

Complete guide to deploying your Neurofoundry authentication system to production for real users.

---

## Table of Contents

1. [Hosting Platform Options](#hosting-platform-options)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Database Setup](#database-setup)
5. [OAuth Configuration](#oauth-configuration)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [Environment Variables](#environment-variables)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Hardening](#security-hardening)
10. [Scaling & Performance](#scaling--performance)
11. [Backup & Disaster Recovery](#backup--disaster-recovery)
12. [Troubleshooting](#troubleshooting)

---

## Hosting Platform Options

### 🏆 Recommended Platforms

#### 1. **Railway** (⭐ Best for Beginners)
- **Cost**: $5-20/month
- **Pros**:
  - Automatic deployments from GitHub
  - Built-in PostgreSQL database
  - SSL certificates included
  - Easy environment variable management
  - 1-click deployment
- **Cons**:
  - Limited free tier
  - Pay-as-you-go can get expensive with high traffic
- **Best For**: Quick deployment, Node.js apps, early-stage projects
- **Deployment Time**: 10 minutes

#### 2. **Render** (⭐ Best Value)
- **Cost**: Free tier available, paid from $7/month
- **Pros**:
  - Free tier with 750 hours/month
  - Auto-deploy from GitHub
  - SSL certificates included
  - PostgreSQL hosting included
  - Good documentation
- **Cons**:
  - Free tier services spin down after inactivity
  - Slower cold starts
- **Best For**: Side projects, MVPs, cost-conscious deployments
- **Deployment Time**: 15 minutes

#### 3. **DigitalOcean App Platform** (⭐ Best for Scale)
- **Cost**: $5-12/month (droplets), $12+/month (App Platform)
- **Pros**:
  - Professional infrastructure
  - Managed databases available
  - Good performance
  - Extensive documentation
  - Droplet access for full control
- **Cons**:
  - More complex setup
  - Requires more DevOps knowledge
- **Best For**: Production applications, scalable solutions
- **Deployment Time**: 30 minutes

#### 4. **Heroku** (⭐ Most Established)
- **Cost**: $5-25/month (Eco Dynos), $25-50/month (Basic)
- **Pros**:
  - Very mature platform
  - Extensive add-on marketplace
  - Great documentation
  - Easy database management
- **Cons**:
  - More expensive than alternatives
  - Free tier removed
- **Best For**: Established businesses, apps needing add-ons
- **Deployment Time**: 15 minutes

#### 5. **AWS (EC2/Elastic Beanstalk)** (For Enterprise)
- **Cost**: $10-50+/month (varies greatly)
- **Pros**:
  - Maximum flexibility
  - Best scalability
  - Enterprise features
  - Global infrastructure
- **Cons**:
  - Complex setup
  - Steep learning curve
  - Can get expensive
- **Best For**: Enterprise applications, high-traffic sites
- **Deployment Time**: 1-2 hours

#### 6. **Vercel** (For Serverless)
- **Cost**: Free tier, Pro at $20/month
- **Pros**:
  - Excellent for Next.js/React
  - Great performance
  - Simple deployment
- **Cons**:
  - Not ideal for traditional Node.js servers
  - Serverless limitations
- **Best For**: Frontend-first apps, JAMstack sites
- **Deployment Time**: 10 minutes

### 💡 Platform Comparison Table

| Platform | Monthly Cost | Setup Difficulty | Best For | Free Tier |
|----------|-------------|------------------|----------|-----------|
| Railway | $5-20 | ⭐ Easy | Quick start | Limited |
| Render | $0-15 | ⭐ Easy | Budget-conscious | Yes (750h) |
| DigitalOcean | $5-50 | ⭐⭐ Medium | Scale & control | No |
| Heroku | $5-50 | ⭐ Easy | Established apps | No |
| AWS | $10-100+ | ⭐⭐⭐ Hard | Enterprise | Yes (limited) |
| Vercel | $0-20 | ⭐ Easy | Frontend apps | Yes |

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

### ✅ Required Items

- [ ] **Domain name** purchased (from Namecheap, Google Domains, Cloudflare)
- [ ] **Database** chosen and account created (Firebase or Supabase)
- [ ] **OAuth credentials** obtained (Google and/or GitHub)
- [ ] **Email service** configured (Gmail app password or SendGrid account)
- [ ] **Payment method** for hosting platform
- [ ] **Git repository** with latest code

### ✅ Security Items

- [ ] Generated strong JWT secrets (at least 32 characters)
- [ ] Created unique session secrets
- [ ] Reviewed all environment variables
- [ ] Enabled CORS for production domain only
- [ ] Configured rate limiting appropriately

### ✅ Testing Items

- [ ] Tested signup/login locally
- [ ] Verified OAuth flows work
- [ ] Tested profile updates
- [ ] Checked email sending
- [ ] Reviewed error handling

---

## Step-by-Step Deployment

### Option 1: Railway Deployment (Recommended for Beginners)

#### Step 1: Prepare Your Repository

1. Make sure your code is pushed to GitHub
2. Ensure `package.json` has a start script:
   ```json
   "scripts": {
     "start": "node server/index.js"
   }
   ```

#### Step 2: Create Railway Account

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

#### Step 3: Deploy from GitHub

1. Select "Deploy from GitHub repo"
2. Choose your repository
3. Railway will auto-detect Node.js
4. Click "Deploy"

#### Step 4: Configure Environment Variables

1. Go to your project → Variables tab
2. Add all environment variables from `.env`:

```bash
NODE_ENV=production
PORT=3000
APP_URL=https://your-app.up.railway.app
FRONTEND_URL=https://yourdomain.com

# JWT (Generate new secrets!)
JWT_SECRET=<generate-strong-32-char-secret>
JWT_REFRESH_SECRET=<generate-strong-32-char-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-secret>
GOOGLE_CALLBACK_URL=https://your-app.up.railway.app/api/auth/google/callback

GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-secret>
GITHUB_CALLBACK_URL=https://your-app.up.railway.app/api/auth/github/callback

# Database (Supabase or Firebase)
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-key>

# Session
SESSION_SECRET=<generate-strong-32-char-secret>
SESSION_MAX_AGE=604800000

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASSWORD=<your-app-password>
EMAIL_FROM=noreply@yourdomain.com

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

#### Step 5: Generate Domain

1. Go to Settings → Networking
2. Click "Generate Domain"
3. Your app will be available at `https://your-app.up.railway.app`

#### Step 6: Add Custom Domain (Optional)

1. Go to Settings → Networking → Custom Domains
2. Add your domain: `api.yourdomain.com`
3. Add the CNAME record to your DNS:
   - Type: CNAME
   - Name: api
   - Value: `your-app.up.railway.app`

#### Step 7: Verify Deployment

1. Visit `https://your-app.up.railway.app/api/health`
2. Should return: `{"status":"ok","timestamp":"..."}`

---

### Option 2: Render Deployment (Best Free Option)

#### Step 1: Create Render Account

1. Go to [Render.com](https://render.com)
2. Sign up with GitHub

#### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: neurofoundry-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter ($7/month)

#### Step 3: Add Environment Variables

Go to Environment tab and add all variables (same as Railway above)

#### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Your app will be at `https://neurofoundry-api.onrender.com`

#### Step 5: Keep Free Tier Awake (Optional)

Render free tier spins down after 15 minutes of inactivity. To keep it warm:

1. Use [UptimeRobot](https://uptimerobot.com) (free)
2. Add HTTP monitor for `https://neurofoundry-api.onrender.com/api/health`
3. Set check interval to 5 minutes

---

### Option 3: DigitalOcean Deployment (Best for Production)

#### Step 1: Create DigitalOcean Account

1. Go to [DigitalOcean.com](https://digitalocean.com)
2. Sign up and add payment method
3. Get $200 credit with referral links

#### Step 2: Create App Platform Project

1. Click "Create" → "Apps"
2. Connect GitHub repository
3. Configure app:
   - **Name**: neurofoundry-api
   - **Type**: Web Service
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000

#### Step 3: Add Database (Recommended)

1. In same project, click "Add Resource" → "Database"
2. Choose PostgreSQL
3. Select plan (Dev Database is $7/month)
4. DigitalOcean will auto-inject DATABASE_URL

#### Step 4: Configure Environment

Add environment variables in Environment section

#### Step 5: Deploy

1. Click "Next" → "Create Resources"
2. Wait 5-10 minutes for deployment
3. App available at `https://neurofoundry-api-xxxxx.ondigitalocean.app`

---

## Database Setup

### Option 1: Supabase (Recommended - Easier)

#### Why Supabase?
- ✅ Free tier: 500MB database, 2GB bandwidth
- ✅ PostgreSQL with full SQL access
- ✅ Built-in auth (can integrate with yours)
- ✅ Auto-generated APIs
- ✅ Realtime subscriptions

#### Setup Steps

1. **Create Account**
   - Go to [Supabase.com](https://supabase.com)
   - Sign up with GitHub
   - Create new project

2. **Create Users Table**
   ```sql
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255),
     first_name VARCHAR(100),
     last_name VARCHAR(100),
     username VARCHAR(100) UNIQUE,
     avatar TEXT,
     auth_provider VARCHAR(50) DEFAULT 'local',
     auth_provider_id VARCHAR(255),
     password TEXT,
     email_verified BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     last_login_at TIMESTAMPTZ,
     is_active BOOLEAN DEFAULT TRUE,
     role VARCHAR(50) DEFAULT 'user',
     bio TEXT,
     location VARCHAR(255),
     website TEXT,
     company VARCHAR(255),
     verification_token TEXT,
     verification_token_expires TIMESTAMPTZ,
     reset_password_token TEXT,
     reset_password_expires TIMESTAMPTZ
   );

   -- Create indexes for better performance
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_username ON users(username);
   CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
   ```

3. **Get Credentials**
   - Go to Settings → API
   - Copy:
     - Project URL: `SUPABASE_URL`
     - Service role key: `SUPABASE_SERVICE_ROLE_KEY`

4. **Add to Environment Variables**
   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```

5. **Test Connection**
   - Start your server
   - Check logs for "✅ Connected to Supabase"

---

### Option 2: Firebase (Alternative)

#### Why Firebase?
- ✅ Google infrastructure
- ✅ Free tier: 1GB storage, 50K reads/day
- ✅ Real-time database
- ✅ Built-in auth (optional)

#### Setup Steps

1. **Create Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project
   - Enable Firestore Database

2. **Get Credentials**
   - Project Settings → Service Accounts
   - Generate new private key
   - Download JSON file

3. **Set Environment Variables**
   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   ```

4. **Deploy Service Account**
   - For hosting platforms, use the JSON content as environment variable
   - Or use Application Default Credentials

5. **Firestore Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null && request.auth.uid == userId;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

---

## OAuth Configuration

### Google OAuth Setup

#### Step 1: Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Google+ API":
   - APIs & Services → Library
   - Search "Google+ API"
   - Click Enable

4. Create OAuth Credentials:
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: Neurofoundry Auth

5. Configure OAuth Consent Screen:
   - User Type: External
   - App name: Neurofoundry
   - User support email: your-email
   - Developer email: your-email
   - Add scopes: email, profile
   - Add test users (for testing)

6. Add Authorized URLs:
   **Authorized JavaScript origins:**
   ```
   https://yourdomain.com
   https://api.yourdomain.com
   ```

   **Authorized redirect URIs:**
   ```
   https://api.yourdomain.com/api/auth/google/callback
   https://yourdomain.com/auth/callback
   ```

7. Copy credentials:
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

#### Step 2: Update Environment Variables

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback
```

#### Step 3: Test OAuth Flow

1. Navigate to your login page
2. Click "Sign in with Google"
3. Verify redirect works
4. Check user is created in database

---

### GitHub OAuth Setup

#### Step 1: Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in details:
   - **Application name**: Neurofoundry
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://api.yourdomain.com/api/auth/github/callback`
   - **Description**: OAuth authentication for Neurofoundry

4. Click "Register application"

5. Generate client secret:
   - Click "Generate a new client secret"
   - Copy and save immediately (won't be shown again)

#### Step 2: Update Environment Variables

```bash
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/auth/github/callback
```

#### Step 3: Test GitHub OAuth

1. Navigate to login page
2. Click "Sign in with GitHub"
3. Authorize application
4. Verify callback and user creation

---

## Domain & SSL Setup

### Step 1: Purchase Domain

**Recommended Registrars:**
- [Namecheap](https://namecheap.com) - Good value, easy to use
- [Google Domains](https://domains.google.com) - Clean interface
- [Cloudflare](https://cloudflare.com) - Free privacy protection

**Cost**: $10-15/year for .com domains

### Step 2: Configure DNS

For a typical setup with separate API and frontend:

```
# DNS Records for yourdomain.com

# Frontend (GitHub Pages, Vercel, Netlify)
Type: A
Name: @
Value: <your-frontend-ip>

Type: A
Name: www
Value: <your-frontend-ip>

# API Backend (Railway, Render, DigitalOcean)
Type: CNAME
Name: api
Value: your-app.up.railway.app (or your hosting provider's domain)

# Email (if using custom email)
Type: MX
Name: @
Value: <your-email-provider-mx-records>
```

### Step 3: SSL Certificates

**Option 1: Automatic (Recommended)**
Most hosting platforms provide automatic SSL:
- Railway: Automatic via Let's Encrypt
- Render: Automatic via Let's Encrypt
- Vercel: Automatic via Let's Encrypt
- Heroku: Automatic via Let's Encrypt

**Option 2: Cloudflare (Free SSL + CDN)**
1. Sign up at [Cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers at your registrar
4. Enable "Full (strict)" SSL mode
5. Enable "Always Use HTTPS"

**Option 3: Manual (Advanced)**
For custom servers (DigitalOcean Droplets, AWS EC2):
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 4: Verify HTTPS

1. Visit `https://yourdomain.com`
2. Check for padlock icon in browser
3. Test with [SSL Labs](https://www.ssllabs.com/ssltest/)
4. Should get A+ rating

---

## Environment Variables

### Complete Production .env Template

```bash
# ============================================
# APPLICATION SETTINGS
# ============================================
NODE_ENV=production
PORT=3000
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# ============================================
# JWT CONFIGURATION
# CRITICAL: Generate new secrets for production!
# Use: openssl rand -base64 32
# ============================================
JWT_SECRET=<GENERATE-32-CHAR-SECRET>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<GENERATE-32-CHAR-SECRET>
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# GOOGLE OAUTH
# Get from: https://console.cloud.google.com
# ============================================
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback

# ============================================
# GITHUB OAUTH
# Get from: https://github.com/settings/developers
# ============================================
GITHUB_CLIENT_ID=Iv1.xxxxx
GITHUB_CLIENT_SECRET=xxxxx
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/auth/github/callback

# ============================================
# DATABASE - SUPABASE (Recommended)
# Get from: https://supabase.com
# ============================================
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ============================================
# DATABASE - FIREBASE (Alternative)
# Get from: https://console.firebase.google.com
# ============================================
# FIREBASE_PROJECT_ID=your-project-id

# ============================================
# SESSION CONFIGURATION
# ============================================
SESSION_SECRET=<GENERATE-32-CHAR-SECRET>
SESSION_MAX_AGE=604800000

# ============================================
# EMAIL SERVICE (Optional but Recommended)
# Option 1: Gmail with App Password
# Get from: https://myaccount.google.com/apppasswords
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@yourdomain.com

# ============================================
# EMAIL SERVICE (Alternative)
# Option 2: SendGrid
# Get from: https://sendgrid.com
# ============================================
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=your-sendgrid-api-key
# EMAIL_FROM=noreply@yourdomain.com

# ============================================
# SECURITY SETTINGS
# ============================================
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# CORS (Critical for Production)
# ============================================
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# ============================================
# REDIS (Optional - for session storage)
# Get from: Upstash.com (free tier) or hosting provider
# ============================================
# REDIS_URL=redis://default:password@host:port
```

### How to Generate Secure Secrets

```bash
# Generate 32-character random secrets (run 3 times)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or online (not recommended for production)
# Visit: https://randomkeygen.com/
```

---

## Monitoring & Logging

### Application Monitoring

#### Option 1: Built-in Platform Monitoring

**Railway:**
- Logs: Project → Deployments → View Logs
- Metrics: Project → Metrics
- Shows CPU, memory, network usage

**Render:**
- Logs: Service → Logs tab
- Metrics: Service → Metrics tab
- Real-time log streaming

**DigitalOcean:**
- Logs: App → Runtime Logs
- Metrics: App → Insights
- Historical data available

#### Option 2: External Monitoring (Recommended)

**1. Sentry (Error Tracking)**
- Free tier: 5,000 errors/month
- Sign up: [Sentry.io](https://sentry.io)

Installation:
```bash
npm install @sentry/node
```

Add to server/index.js:
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add before routes
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Add before error handler
app.use(Sentry.Handlers.errorHandler());
```

**2. LogTail (Log Management)**
- Free tier: 1GB/month
- Sign up: [Logtail.com](https://logtail.com)

Installation:
```bash
npm install @logtail/node
```

**3. UptimeRobot (Uptime Monitoring)**
- Free tier: 50 monitors
- Sign up: [UptimeRobot.com](https://uptimerobot.com)

Setup:
1. Add HTTP(s) monitor
2. URL: `https://api.yourdomain.com/api/health`
3. Monitoring interval: 5 minutes
4. Alert contacts: your email

**4. New Relic (APM - Advanced)**
- Free tier available
- Sign up: [NewRelic.com](https://newrelic.com)
- Comprehensive performance monitoring

### Health Check Endpoint

Already implemented at `/api/health`:
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### Custom Logging

Add structured logging with Winston (already installed):

```javascript
// server/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;
```

---

## Security Hardening

### 1. Environment Variables Security

**Never commit secrets:**
```bash
# .gitignore (already configured)
.env
.env.local
.env.*.local
```

**Use different secrets for each environment:**
- Development: Simple secrets for testing
- Staging: Different secrets
- Production: Strong, unique secrets

### 2. Rate Limiting

Already configured in server/index.js. Adjust for your needs:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Apply to all /api routes
app.use('/api/', limiter);

// Stricter limits for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 attempts per 15 minutes
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### 3. CORS Configuration

Strict CORS for production:

```javascript
// server/config/cors.js
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://www.yourdomain.com'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

### 4. Security Headers

Already configured with Helmet. Review settings:

```javascript
// server/index.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 5. Input Validation

Already using express-validator. Ensure all inputs are validated:

```javascript
// Example: server/routes/auth.js
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... registration logic
  }
);
```

### 6. SQL Injection Prevention

Using Supabase/Firebase with parameterized queries automatically prevents SQL injection.

For raw SQL queries, always use parameterized queries:
```javascript
// ❌ NEVER DO THIS
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ ALWAYS DO THIS
const { data } = await db
  .from('users')
  .select('*')
  .eq('email', email);
```

### 7. XSS Prevention

- Already configured with Helmet's XSS filter
- Express automatically escapes HTML in JSON responses
- Sanitize user input on display

### 8. Password Security

Already implemented:
- bcrypt hashing with 12 rounds
- Passwords never stored in plain text
- Minimum 8 characters enforced

### 9. JWT Security

Best practices already implemented:
- Short-lived access tokens (7 days)
- Refresh tokens for renewal
- Tokens stored in HTTP-only cookies
- HTTPS required in production

### 10. Dependency Security

Regular security updates:
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update all dependencies
npm update

# Check for outdated packages
npm outdated
```

---

## Scaling & Performance

### 1. Database Optimization

**Indexes** (Already implemented in Supabase setup):
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
```

**Connection Pooling:**
- Supabase: Automatic with pgBouncer
- Firebase: Automatic connection management

### 2. Caching with Redis

For high-traffic applications, add Redis caching:

**Setup Redis:**
1. Sign up for [Upstash](https://upstash.com) (free tier)
2. Create Redis database
3. Copy connection URL

**Add to .env:**
```bash
REDIS_URL=redis://default:password@host:port
```

**Implement Caching:**
```javascript
// server/utils/cache.js
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

async function cacheUser(userId, userData, ttl = 3600) {
  await client.set(`user:${userId}`, JSON.stringify(userData), {
    EX: ttl
  });
}

async function getCachedUser(userId) {
  const cached = await client.get(`user:${userId}`);
  return cached ? JSON.parse(cached) : null;
}
```

### 3. CDN for Static Assets

Use CDN for frontend files:
- Cloudflare (Free)
- AWS CloudFront
- Fastly

### 4. Load Balancing

For high traffic, use multiple instances:

**Railway/Render:** Automatically scale with plan upgrades

**DigitalOcean:** Use App Platform auto-scaling:
```yaml
# .do/app.yaml
services:
- name: api
  instance_count: 2
  instance_size_slug: basic-xxs
```

**AWS:** Use Elastic Load Balancer with Auto Scaling Groups

### 5. Database Scaling

**Supabase:**
- Free: 500MB, good for 10K users
- Pro ($25/mo): 8GB, ~500K users
- Team ($599/mo): 32GB, ~2M users

**Firebase:**
- Flame ($25/mo): Unlimited operations
- Blaze (pay-as-you-go): Scales automatically

### 6. Performance Monitoring

Monitor these metrics:
- Response time (< 200ms ideal)
- Error rate (< 1% acceptable)
- CPU usage (< 70% sustained)
- Memory usage (< 80%)
- Database queries/sec

### 7. Compression

Enable gzip compression (add to server/index.js):
```javascript
const compression = require('compression');
app.use(compression());
```

Install:
```bash
npm install compression
```

---

## Backup & Disaster Recovery

### 1. Database Backups

**Supabase:**
- Automatic daily backups (Pro plan)
- Point-in-time recovery available
- Manual backups: Project Settings → Backups

**Firebase:**
- Automatic backups
- Export data regularly:
```bash
firebase firestore:export gs://bucket-name
```

### 2. Application Code Backup

- Code in Git (automatic)
- Tag releases:
```bash
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

### 3. Environment Variables Backup

Store safely:
1. Use password manager (1Password, LastPass)
2. Encrypted backup file
3. Secure document in Google Drive/Dropbox

### 4. Disaster Recovery Plan

**Scenario 1: Database Failure**
1. Check Supabase status page
2. Restore from latest backup
3. Verify data integrity
4. Update connection string if needed

**Scenario 2: Hosting Platform Down**
1. Check platform status page
2. Deploy to backup platform if extended outage
3. Update DNS records
4. Notify users

**Scenario 3: Security Breach**
1. Revoke all JWT tokens
2. Force password resets
3. Regenerate all secrets
4. Audit all access logs
5. Notify affected users

### 5. Monitoring & Alerts

Set up alerts for:
- Server downtime (UptimeRobot)
- High error rates (Sentry)
- Database connection failures
- Disk space low (> 80%)

---

## Troubleshooting

### Common Issues & Solutions

#### 1. OAuth Not Working

**Symptoms:**
- "Redirect URI mismatch" error
- OAuth popup shows error

**Solutions:**
- Verify callback URLs match exactly in OAuth provider settings
- Check HTTPS is enabled (OAuth requires HTTPS in production)
- Ensure domain matches (no www vs www issues)
- Wait 5-10 minutes after updating OAuth settings

#### 2. CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" error in browser console
- Requests blocked from frontend

**Solutions:**
- Add frontend domain to CORS_ORIGIN environment variable
- Include both www and non-www versions
- Verify protocol (http vs https) matches
- Clear browser cache

```bash
# Correct format
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

#### 3. Database Connection Failed

**Symptoms:**
- "Connection timeout" errors
- "Authentication failed" messages

**Solutions:**
- Verify credentials are correct
- Check database is not paused (Supabase)
- Verify IP allowlist (some providers restrict IPs)
- Test connection locally first
- Check firewall rules

#### 4. Email Not Sending

**Symptoms:**
- Verification emails not received
- "Invalid credentials" errors

**Solutions:**
- Verify SMTP settings are correct
- Use app-specific password for Gmail
- Check spam folder
- Verify sender email is verified
- Test with simple email service (SendGrid)

#### 5. JWT Token Errors

**Symptoms:**
- "Invalid token" errors
- User logged out unexpectedly

**Solutions:**
- Verify JWT_SECRET matches across all instances
- Check token expiration settings
- Ensure cookies are enabled
- Verify HTTPS in production (required for secure cookies)

#### 6. Performance Issues

**Symptoms:**
- Slow response times
- Timeouts
- High CPU usage

**Solutions:**
- Add database indexes
- Enable Redis caching
- Optimize database queries
- Scale up server resources
- Add CDN for static assets

#### 7. Port Already in Use

**Symptoms:**
- "Port 3000 already in use" error

**Solutions:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

#### 8. Module Not Found Errors

**Symptoms:**
- "Cannot find module" errors after deployment

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify package.json is correct
# Ensure all dependencies are in "dependencies" not "devDependencies"
```

---

## Quick Reference: Deployment Checklist

### Pre-Flight Checklist

- [ ] Code pushed to GitHub
- [ ] Tests passing locally
- [ ] Environment variables prepared
- [ ] Domain purchased (if using custom domain)
- [ ] Database created and configured
- [ ] OAuth apps created (Google/GitHub)
- [ ] Email service configured
- [ ] SSL certificate ready (usually automatic)

### Deployment Steps

- [ ] 1. Create account on hosting platform
- [ ] 2. Connect GitHub repository
- [ ] 3. Configure build settings
- [ ] 4. Add all environment variables
- [ ] 5. Deploy application
- [ ] 6. Verify health check endpoint
- [ ] 7. Test signup flow
- [ ] 8. Test login flow
- [ ] 9. Test OAuth (Google & GitHub)
- [ ] 10. Test email sending
- [ ] 11. Set up monitoring
- [ ] 12. Configure backups
- [ ] 13. Add custom domain (optional)
- [ ] 14. Verify SSL certificate
- [ ] 15. Set up alerts
- [ ] 16. Document deployment
- [ ] 17. Notify team/users

### Post-Deployment

- [ ] Monitor errors for 24 hours
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Test from different locations
- [ ] Set up backup monitoring
- [ ] Create runbook for common issues
- [ ] Schedule security audit

---

## Getting Help

### Documentation Resources

- **Neurofoundry Auth**: See `AUTH_README.md` in this repository
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)
- **DigitalOcean**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Firebase**: [firebase.google.com/docs](https://firebase.google.com/docs)

### Community Support

- **Stack Overflow**: Tag your questions with [node.js], [express], [oauth]
- **GitHub Issues**: For code-specific issues
- **Discord Communities**: Node.js, Railway, Render, Supabase all have active Discords

### Professional Support

For production deployments, consider:
- DevOps consultant for complex setups
- Platform-specific support plans
- Security audit services

---

## Summary

You now have everything you need to deploy your authentication system to production:

✅ **Hosting Options**: Multiple platforms compared and explained
✅ **Step-by-Step Guides**: Detailed instructions for Railway, Render, and DigitalOcean
✅ **Database Setup**: Complete guides for Supabase and Firebase
✅ **OAuth Configuration**: Full setup for Google and GitHub OAuth
✅ **Security**: Hardening checklist and best practices
✅ **Monitoring**: Error tracking and uptime monitoring
✅ **Scaling**: Performance optimization strategies
✅ **Troubleshooting**: Common issues and solutions

**Recommended Quick Start Path:**
1. Deploy to Railway (10 minutes)
2. Set up Supabase database (15 minutes)
3. Configure OAuth (20 minutes)
4. Add custom domain (15 minutes)
5. Set up monitoring (10 minutes)

**Total time to production: ~70 minutes**

Your authentication system is production-ready. Follow this guide step-by-step, and you'll have users signing up within an hour! 🚀

---

**Questions?** Check the troubleshooting section or refer back to `AUTH_README.md` for testing and development guidance.
