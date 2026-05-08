# Fly.io Auth Rollout (Methodical)

This is the fastest safe path to go live with API + OAuth + email and verify each piece immediately.

## 1. Preflight

1. Install Fly CLI and login:
```powershell
fly auth login
```
2. From repo root:
```powershell
cd D:\0___TESTZONE\_theneurofoundry
```
3. Set your app name in `fly.toml` (`app = "..."`).

## 2. Create/Attach Fly App

1. If app does not exist:
```powershell
fly apps create <your-app-name>
```
2. First deploy:
```powershell
fly deploy
```
3. Verify health:
```powershell
curl https://<your-app-name>.fly.dev/api/health
```

Gate: must return `{"status":"ok"...}`.

## 3. Configure Production Secrets

Use `.env.fly.example` as source of required keys.

```powershell
fly secrets set `
NODE_ENV=production `
APP_URL=https://<your-app-name>.fly.dev `
FRONTEND_URL=https://<your-frontend-domain-or-fly-domain> `
JWT_SECRET=<secret> `
JWT_REFRESH_SECRET=<secret> `
SESSION_SECRET=<secret> `
CORS_ORIGIN=https://<your-frontend-domain>
```

Add OAuth and SMTP when ready:
```powershell
fly secrets set `
GOOGLE_CLIENT_ID=<...> `
GOOGLE_CLIENT_SECRET=<...> `
GOOGLE_CALLBACK_URL=https://<your-app-name>.fly.dev/api/auth/google/callback `
GITHUB_CLIENT_ID=<...> `
GITHUB_CLIENT_SECRET=<...> `
GITHUB_CALLBACK_URL=https://<your-app-name>.fly.dev/api/auth/github/callback `
SMTP_HOST=<...> `
SMTP_PORT=587 `
SMTP_USER=<...> `
SMTP_PASSWORD=<...> `
EMAIL_FROM=no-reply@<your-domain>
```

Gate: run `fly secrets list` and confirm all required keys exist.

## 4. OAuth Provider Console Setup

Set callback URLs exactly:

1. Google:
- `https://<your-app-name>.fly.dev/api/auth/google/callback`
2. GitHub:
- `https://<your-app-name>.fly.dev/api/auth/github/callback`

Gate: provider dashboards save without mismatch errors.

## 5. Live Smoke Test (Immediate)

Run:
```powershell
npm run smoke:auth -- --base-url https://<your-app-name>.fly.dev
```

Expected pass checks:
- health
- standalone page
- register
- login
- profile
- oauth init redirect

## 6. Browser Test

Open:
- `https://<your-app-name>.fly.dev/auth-standalone-test.html`

Run in order:
1. Test Connection
2. Register
3. Login
4. Test Google OAuth

Gate: all show success.

## 7. Email Verification Check

1. Register a real inbox user.
2. Confirm verification email arrives.
3. Open verification link.

Gate: `/api/auth/verify-email/:token` succeeds and user is verified.

## 8. Cutover

When all gates pass:
1. Set `FRONTEND_URL` and `CORS_ORIGIN` to production domain only.
2. (Optional) add custom Fly cert/domain.
3. Redeploy.

```powershell
fly deploy
```

Or run the helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\fly-cutover-prod.ps1 -AppName <your-app-name> -FrontendUrl https://<your-frontend-domain> -GoogleClientId <...> -GoogleClientSecret <...> -GithubClientId <...> -GithubClientSecret <...> -SmtpHost <...> -SmtpUser <...> -SmtpPassword <...>
```
