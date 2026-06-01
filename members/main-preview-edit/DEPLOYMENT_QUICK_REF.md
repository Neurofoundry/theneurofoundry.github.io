# 🎯 Quick Deployment Reference Card

**Use this as a quick reference. See PRODUCTION_DEPLOYMENT.md for full details.**

---

## 🚀 Fastest Path to Production (70 minutes)

### Step 1: Choose Platform (5 min)
- **Easiest**: Railway → Auto-deploy from GitHub
- **Cheapest**: Render → Free tier available
- **Best Scale**: DigitalOcean → Professional infrastructure

### Step 2: Database (15 min)
1. Sign up: [supabase.com](https://supabase.com)
2. Create project
3. Run SQL (provided in full guide)
4. Copy URL + Service Key
5. Add to environment variables

### Step 3: Deploy Backend (10 min)
1. Connect GitHub repo to platform
2. Set environment variables (copy from template)
3. Deploy
4. Get your API URL: `https://your-app.up.railway.app`

### Step 4: OAuth Setup (30 min)
**Google (15 min):**
- [console.cloud.google.com](https://console.cloud.google.com)
- Create OAuth Client
- Add redirect: `https://your-api-url/api/auth/google/callback`
- Copy Client ID + Secret

**GitHub (15 min):**
- [github.com/settings/developers](https://github.com/settings/developers)
- New OAuth App
- Add callback: `https://your-api-url/api/auth/github/callback`
- Copy Client ID + Secret

### Step 5: Update Frontend (5 min)
Change API URL in `auth-client.js`:
```javascript
apiUrl: 'https://your-api-url/api'
```

### Step 6: Test (5 min)
- Visit your app
- Test signup
- Test login
- Test OAuth
- ✅ Live!

---

## 📋 Environment Variables Template

```bash
# Copy these to your hosting platform

NODE_ENV=production
PORT=3000
APP_URL=https://your-api-url
FRONTEND_URL=https://yourdomain.com

JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate-with: openssl rand -base64 32>
SESSION_SECRET=<generate-with: openssl rand -base64 32>

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=https://your-api-url/api/auth/google/callback

GITHUB_CLIENT_ID=Iv1.xxxxx
GITHUB_CLIENT_SECRET=xxxxx
GITHUB_CALLBACK_URL=https://your-api-url/api/auth/github/callback

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🔧 Common Commands

```bash
# Generate secrets
openssl rand -base64 32

# Test health check
curl https://your-api-url/api/health

# View logs (Railway)
railway logs

# View logs (Render)
# Dashboard → Logs tab

# Restart server
# Platform dashboard → Restart/Redeploy
```

---

## ⚠️ Pre-Deployment Checklist

- [ ] Pushed latest code to GitHub
- [ ] Generated new JWT secrets (don't use defaults!)
- [ ] Created database (Supabase)
- [ ] Set up OAuth apps (Google + GitHub)
- [ ] Updated CORS_ORIGIN to your domain
- [ ] Tested locally first

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| OAuth not working | Check callback URLs match exactly |
| CORS errors | Add domain to CORS_ORIGIN |
| Database errors | Verify credentials, check table exists |
| 500 errors | Check logs in platform dashboard |
| Can't connect | Verify health endpoint: `/api/health` |

---

## 📊 Platform Quick Comparison

| Platform | Best For | Monthly Cost | Deploy Time |
|----------|----------|--------------|-------------|
| Railway | Quick start | $5-20 | 10 min |
| Render | Budget | Free-$15 | 15 min |
| DigitalOcean | Production | $5-50 | 30 min |
| Heroku | Established | $7-50 | 15 min |

---

## 🔗 Essential Links

**Hosting:**
- Railway: [railway.app](https://railway.app)
- Render: [render.com](https://render.com)
- DigitalOcean: [digitalocean.com](https://digitalocean.com)

**Database:**
- Supabase: [supabase.com](https://supabase.com)
- Firebase: [console.firebase.google.com](https://console.firebase.google.com)

**OAuth:**
- Google: [console.cloud.google.com](https://console.cloud.google.com)
- GitHub: [github.com/settings/developers](https://github.com/settings/developers)

**Monitoring:**
- Sentry: [sentry.io](https://sentry.io)
- UptimeRobot: [uptimerobot.com](https://uptimerobot.com)

---

## 🎓 Need More Details?

See **PRODUCTION_DEPLOYMENT.md** for:
- Complete step-by-step guides for each platform
- Database schema and setup
- Security hardening
- Performance optimization
- Scaling strategies
- Backup procedures
- Complete troubleshooting guide

---

**Ready to deploy?** Start with Railway + Supabase for the fastest path to production! 🚀
