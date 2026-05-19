/**
 * Authentication Routes
 * Handles login, signup, OAuth callbacks, and token refresh
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, query, validationResult } = require('express-validator');
const {
  registerUser,
  findUserByEmail,
  findOrCreateOAuthUser,
  updateUser,
  createSkeletonKeyAuthCode,
  redeemSkeletonKeyAuthCode,
  getSkeletonKeyAuthCodeStatus
} = require('../services/userService');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { sendPasswordResetEmail, sendSkeletonKeyPinResetEmail, sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');
const { enqueueUserRegisteredEmail } = require('../services/emailOrchestrator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

function isPlaceholderValue(value) {
  if (!value) return true;
  const lower = String(value).toLowerCase();
  return (
    lower.includes('your-') ||
    lower.includes('xxxxx') ||
    lower.includes('example') ||
    lower.includes('change-this')
  );
}

function isProviderConfigured(provider) {
  if (provider === 'google') {
    return !isPlaceholderValue(process.env.GOOGLE_CLIENT_ID)
      && !isPlaceholderValue(process.env.GOOGLE_CLIENT_SECRET);
  }
  return false;
}

function isDevOAuthMockEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_OAUTH_MOCK !== 'false';
}

function sanitizeRedirectPath(redirect) {
  if (!redirect || typeof redirect !== 'string') return '/members/profile/';
  if (!redirect.startsWith('/')) return '/members/profile/';
  if (redirect.startsWith('//')) return '/members/profile/';
  return redirect;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function encodeOAuthState({ redirectPath, expectedEmail }) {
  return Buffer.from(JSON.stringify({
    redirectPath: sanitizeRedirectPath(redirectPath),
    expectedEmail: normalizeEmail(expectedEmail)
  }), 'utf8').toString('base64url');
}

function decodeOAuthState(rawState) {
  if (!rawState) return { redirectPath: '/members/profile/', expectedEmail: '' };
  const decoded = decodeURIComponent(String(rawState));
  try {
    const parsed = JSON.parse(Buffer.from(decoded, 'base64url').toString('utf8'));
    return {
      redirectPath: sanitizeRedirectPath(parsed.redirectPath),
      expectedEmail: normalizeEmail(parsed.expectedEmail)
    };
  } catch {
    return {
      redirectPath: sanitizeRedirectPath(decoded),
      expectedEmail: ''
    };
  }
}

function buildFrontendUrl(pathname, query = {}) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  const url = new URL(pathname, frontendBase);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function buildApiUrl(req, pathname, query = {}) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const apiBase = process.env.PUBLIC_API_URL || (host ? `${proto}://${host}` : 'https://api.theneurofoundry.com');
  const url = new URL(pathname, apiBase);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function setAuthCookie(res, accessToken) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDisplayDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${month}/${day}/${year} | ${hour}:${minute} ${suffix}`;
}

function hasSkeletonKeyAccess(user) {
  const metadata = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  return !!(
    metadata.skeletonKeyAccessCompleted ||
    metadata.skeleton_key_access_completed ||
    metadata.skeletonKeyAccess?.completed
  );
}

function isEmailVerified(user) {
  return user?.emailVerified === true || user?.emailVerified === 1 || user?.emailVerified === '1';
}

function isActiveUser(user) {
  return !(user?.isActive === false || user?.isActive === 0 || user?.isActive === '0');
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    emailVerified: isEmailVerified(user),
    authProvider: user.authProvider,
    role: user.role,
    planTier: user.planTier,
    accountStatus: user.accountStatus,
    skeletonKeyAccessCompleted: hasSkeletonKeyAccess(user)
  };
}

async function markSkeletonKeyAccessComplete(user) {
  if (hasSkeletonKeyAccess(user)) return user;
  const metadata = user?.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  return await updateUser(user.id, {
    metadata: {
      ...metadata,
      skeletonKeyAccessCompleted: true,
      skeletonKeyAccess: {
        ...(metadata.skeletonKeyAccess && typeof metadata.skeletonKeyAccess === 'object' ? metadata.skeletonKeyAccess : {}),
        completed: true,
        completedAt: new Date().toISOString()
      }
    }
  });
}

function issueOAuthSuccessRedirect(res, user, provider, redirectPath, mock = false) {
  const tokens = generateTokens(user);
  setAuthCookie(res, tokens.accessToken);

  if (redirectPath === '/skeleton-key/desktop') {
    if (hasSkeletonKeyAccess(user)) {
      return issueSkeletonKeyStatusPage(
        res,
        'Access Complete',
        'Skeleton Key access is already complete for this account. Return to the Skeleton Key app to continue.'
      );
    }
    return createSkeletonKeyAuthCode(user.id, 'desktop_login', 10, 4)
      .then(({ code, expiresAt }) => {
        const safeEmail = escapeHtml(user.email);
        const safeCode = escapeHtml(code);
        const safeExpiresAt = formatDisplayDateTime(expiresAt);
        return res.send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aegis: Skeleton Key Verification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: #e0473c;
      --primary-soft: #ffb5ad;
      --primary-border: rgba(224, 71, 60, 0.28);
      --surface: rgba(12, 8, 8, 0.9);
      --surface-strong: rgba(8, 6, 6, 0.95);
      --line-soft: #221c1c;
      --light-text: #e7ebef;
      --muted-text: #9aa3ad;
      --square-size: 300px;
      --square-left: calc(50vw - 150px);
      --square-top: calc(50vh - 150px);
      --hero-center-x: 50vw;
      --hero-top: calc(50vh - 260px);
      --hero-width: 560px;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
      color: var(--light-text);
      font-family: Inter, sans-serif;
    }
    body { position: relative; }
    .bg-layer, .image-layer, .shade-layer, .hero-block, .square-shell {
      position: fixed;
      inset: 0;
    }
    .bg-layer, .image-layer, .shade-layer { pointer-events: none; }
    .bg-layer {
      z-index: 0;
      background: url('/assets/email/browser_verified/bgcover_1.png') center center / cover no-repeat;
    }
    .image-layer {
      z-index: 1;
      background: url('/assets/email/browser_verified/aegreskey_desktop.png') center center / cover no-repeat;
      mix-blend-mode: screen;
      opacity: 0.94;
    }
    .shade-layer {
      z-index: 2;
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.52) 0%, rgba(0, 0, 0, 0.12) 18%, rgba(0, 0, 0, 0.08) 54%, rgba(0, 0, 0, 0.26) 100%);
    }
    .hero-block {
      z-index: 3;
      inset: auto auto auto auto;
      top: var(--hero-top);
      left: calc(var(--hero-center-x) - (var(--hero-width) / 2));
      width: var(--hero-width);
      text-align: center;
      pointer-events: none;
    }
    .brand-label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 10px;
      color: #d9dde2;
      font-size: clamp(10px, 1.1vw, 12px);
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      text-shadow:
        0 1px 0 rgba(0, 0, 0, 0.98),
        0 2px 0 rgba(0, 0, 0, 0.96),
        0 3px 0 rgba(0, 0, 0, 0.92),
        0 5px 10px rgba(0, 0, 0, 0.98),
        0 9px 22px rgba(0, 0, 0, 0.96);
    }
    .brand-label img {
      width: clamp(18px, 1.45vw, 22px);
      height: clamp(18px, 1.45vw, 22px);
      object-fit: contain;
      filter:
        drop-shadow(0 1px 0 rgba(0, 0, 0, 0.98))
        drop-shadow(0 2px 0 rgba(0, 0, 0, 0.94))
        drop-shadow(0 4px 10px rgba(0, 0, 0, 0.98))
        drop-shadow(0 10px 22px rgba(0, 0, 0, 0.96));
    }
    h1 {
      margin: 0 0 12px;
      font-size: clamp(30px, 3.6vw, 54px);
      line-height: 0.92;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: linear-gradient(135deg, #ffffff 0%, #e5ebf1 40%, var(--primary-soft) 74%, var(--primary-color) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter:
        drop-shadow(0 1px 0 rgba(0, 0, 0, 0.98))
        drop-shadow(0 2px 0 rgba(0, 0, 0, 0.96))
        drop-shadow(0 3px 0 rgba(0, 0, 0, 0.94))
        drop-shadow(0 4px 0 rgba(0, 0, 0, 0.9))
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.98))
        drop-shadow(0 14px 28px rgba(0, 0, 0, 0.96));
    }
    .handoff-subtitle {
      margin: 0;
      color: #ffffff;
      font-size: clamp(12px, 1.25vw, 16px);
      line-height: 1.3;
      text-shadow:
        0 2px 0 rgba(0, 0, 0, 0.94),
        0 4px 10px rgba(0, 0, 0, 0.98),
        0 8px 18px rgba(0, 0, 0, 0.96);
    }
    .square-shell {
      z-index: 4;
      inset: auto auto auto auto;
      top: var(--square-top);
      left: var(--square-left);
      width: var(--square-size);
      height: var(--square-size);
      border: 2px solid rgba(12, 8, 8, 0.82);
      box-shadow:
        0 28px 68px rgba(0, 0, 0, 0.72),
        0 0 34px rgba(224, 71, 60, 0.18),
        inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: clamp(16px, 1.4vw, 20px) clamp(16px, 1.45vw, 22px) clamp(18px, 1.6vw, 24px);
    }
    .handoff-desc {
      margin: 0 0 10px;
      color: var(--light-text);
      font-size: clamp(13px, 1.08vw, 15px);
      line-height: 1.5;
      text-align: center;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    }
    .account {
      margin: 0 0 14px;
      color: #d5dbe2;
      font-size: clamp(10px, 0.86vw, 12px);
      line-height: 1.5;
      text-align: center;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      overflow-wrap: anywhere;
    }
    .account strong { color: #ffffff; font-weight: 700; }
    .pin-block-label {
      display: block;
      margin-bottom: 10px;
      color: #ffcabf;
      font-size: clamp(10px, 0.82vw, 11px);
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
    }
    .code-block {
      display: flex;
      align-items: center;
      justify-content: center;
      width: min(100%, 252px);
      margin-left: auto;
      margin-right: auto;
      min-height: clamp(72px, 7.4vw, 102px);
      padding: 10px 12px;
      border: 1px solid var(--primary-border);
      border-radius: 8px;
      background: var(--surface-strong);
      margin-bottom: 12px;
      box-shadow:
        inset 0 0 28px rgba(0, 0, 0, 0.78),
        0 10px 30px rgba(0, 0, 0, 0.42);
    }
    .code-value {
      font-size: clamp(38px, 4vw, 56px);
      line-height: 1;
      font-weight: 900;
      letter-spacing: clamp(7px, 0.95vw, 14px);
      color: var(--primary-soft);
      text-shadow:
        0 1px 0 rgba(0, 0, 0, 0.42),
        0 2px 8px rgba(0, 0, 0, 0.55);
      font-variant-numeric: tabular-nums;
      padding-left: clamp(6px, 0.8vw, 12px);
    }
    .meta-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
      color: var(--muted-text);
      font-size: clamp(9px, 0.82vw, 11px);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-align: center;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    }
    .divider {
      height: 1px;
      background: var(--line-soft);
      margin: 0 0 14px;
    }
    .warning-box {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 11px 12px;
      border: 1px solid rgba(224, 71, 60, 0.2);
      border-left: 3px solid var(--primary-color);
      border-radius: 8px;
      background: rgba(224, 71, 60, 0.07);
      text-align: left;
      margin-bottom: auto;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
    }
    .warning-box svg {
      flex: 0 0 auto;
      align-self: center;
      color: var(--primary-color);
    }
    .warning-box p {
      margin: 0;
      color: #c9d0d8;
      font-size: clamp(10px, 0.88vw, 12px);
      line-height: 1.42;
    }
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid var(--line-soft);
      color: var(--muted-text);
      font-size: clamp(9px, 0.8vw, 11px);
    }
    .panel-main {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .panel-spacer {
      height: 14px;
      flex: 0 0 auto;
    }
    footer a {
      color: var(--primary-color);
      font-weight: 600;
      text-decoration: none;
      word-break: break-word;
    }
    @media (max-width: 640px) {
      .image-layer {
        background-image: url('/assets/email/browser_verified/aegreskey_mobile.png');
      }
      .hero-block {
        width: min(calc(100vw - 28px), 380px);
      }
      h1 {
        font-size: clamp(23px, 9.2vw, 38px);
        letter-spacing: 0.04em;
      }
      .square-shell {
        justify-content: flex-start;
        padding: 14px;
      }
      .panel-spacer {
        height: 0;
      }
      footer {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
        gap: 10px;
        margin-top: 14px;
      }
      footer a {
        margin-left: auto;
        text-align: right;
      }
    }
  </style>
</head>
<body>
  <div class="bg-layer"></div>
  <div class="image-layer"></div>
  <div class="shade-layer"></div>

  <div class="hero-block">
    <span class="brand-label"><img src="/assets/ui/anvil.png" alt="">Neurofoundry</span>
    <h1>Aegis: Skeleton Key</h1>
  </div>

  <section class="square-shell" aria-label="Verification code">
    <div class="panel-main">
      <div class="panel-spacer"></div>
      <p class="handoff-desc">An Access Code was requested for your Aegis: Skeleton Key account. This is a one-time verification code, and required for your desktop application access.</p>
      <p class="handoff-subtitle"> </p>

      <span class="pin-block-label">Access Code</span>

      <div class="code-block">
        <span class="code-value">${safeCode}</span>
      </div>

      <div class="meta-row">
        <span>This code will expire in 10 minutes</span>
      </div>

      <div class="divider"></div>

      <div class="warning-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <p>Only enter this code in the Skeleton Key desktop app. This page never asks for vault secrets, passwords, PINs, or stored key values.</p>
      </div>
    </div>

    <footer>
      <span>Copyright Neurofoundry 2025</span>
      <a href="https://www.theneurofoundry.com">www.theneurofoundry.com</a>
    </footer>
  </section>

  <script>
    (function () {
      const SOURCE_WIDTH = 1024;
      const SOURCE_HEIGHT = 516;
      const SQUARE_X = 373;
      const SQUARE_Y = 148;
      const SQUARE_SIZE = 280;
      const root = document.documentElement;
      const accessCode = ${JSON.stringify(code)};

      function layoutToArtwork() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scale = Math.max(vw / SOURCE_WIDTH, vh / SOURCE_HEIGHT);
        const renderWidth = SOURCE_WIDTH * scale;
        const renderHeight = SOURCE_HEIGHT * scale;
        const offsetX = (vw - renderWidth) / 2;
        const offsetY = (vh - renderHeight) / 2;

        const artworkSquareLeft = offsetX + (SQUARE_X * scale);
        const artworkSquareTop = offsetY + (SQUARE_Y * scale);
        const artworkSquareSize = SQUARE_SIZE * scale;
        const isMobile = vw <= 640;

        let squareSize = artworkSquareSize;
        let squareLeft = artworkSquareLeft;
        let squareTop = artworkSquareTop;

        if (isMobile) {
          squareSize = Math.min(artworkSquareSize * 0.82, vw - 44);
          squareLeft = ((artworkSquareLeft + (artworkSquareSize / 2)) - (squareSize / 2));
          squareTop = artworkSquareTop + Math.max(26, artworkSquareSize * 0.11);
        } else {
          squareLeft = artworkSquareLeft - 3;
          squareTop = artworkSquareTop + Math.max(4, artworkSquareSize * 0.02);
        }

        const heroCenterX = squareLeft + (squareSize / 2);
        const heroTop = isMobile
          ? Math.max(16, squareTop - Math.min(squareSize * 0.68, 202))
          : Math.max(12, squareTop - Math.min(squareSize * 0.54, 192));
        const heroWidth = isMobile
          ? Math.min(vw - 28, 380)
          : Math.min(squareSize * 2.1, vw - 24);

        root.style.setProperty('--square-left', squareLeft + 'px');
        root.style.setProperty('--square-top', squareTop + 'px');
        root.style.setProperty('--square-size', squareSize + 'px');
        root.style.setProperty('--hero-center-x', heroCenterX + 'px');
        root.style.setProperty('--hero-top', heroTop + 'px');
        root.style.setProperty('--hero-width', heroWidth + 'px');
      }

      window.addEventListener('resize', layoutToArtwork, { passive: true });
      window.addEventListener('load', layoutToArtwork);
      layoutToArtwork();

      async function closeWhenRedeemed() {
        try {
          const response = await fetch('/api/auth/skeleton-key/code-status?code=' + encodeURIComponent(accessCode), {
            headers: { Accept: 'application/json' },
            cache: 'no-store'
          });
          if (!response.ok) return;
          const payload = await response.json();
          if (payload && payload.data && payload.data.used) {
            document.body.innerHTML = '<main style="display:grid;place-items:center;min-height:100vh;background:#050505;color:#e7ebef;font-family:Inter,Arial,sans-serif;text-align:center;padding:24px;"><div><h1 style="color:#ffb5ad;letter-spacing:.08em;text-transform:uppercase;">Access Code Accepted</h1><p>You can return to Skeleton Key.</p></div></main>';
            window.close();
          }
        } catch (_) {}
      }

      setInterval(closeWhenRedeemed, 1500);
    }());
  </script>
</body>
</html>
      `);
      })
      .catch(() => issueOAuthFailureRedirect(res, 'skeleton_key_code_failed'));
  }

  return res.redirect(
    buildFrontendUrl('/auth/callback.html', {
      token: tokens.accessToken,
      redirect: sanitizeRedirectPath(redirectPath),
      provider,
      mock: mock ? '1' : undefined
    })
  );
}

function issueOAuthFailureRedirect(res, errorCode) {
  return res.redirect(
    buildFrontendUrl('/members/login/', {
      error: errorCode || 'oauth_failed'
    })
  );
}

function issueSkeletonKeyStatusPage(res, title, message) {
  return res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aegis: Skeleton Key</title>
  <style>
    html, body { margin: 0; min-height: 100%; background: #050505; color: #e7ebef; font-family: Inter, Arial, sans-serif; }
    body { display: grid; place-items: center; padding: 24px; }
    main { width: min(420px, 100%); border: 1px solid rgba(224, 71, 60, 0.28); background: rgba(12, 8, 8, 0.92); padding: 24px; text-align: center; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5); }
    h1 { margin: 0 0 12px; color: #ffb5ad; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; }
    p { margin: 0; color: #c9d0d8; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </main>
  <script>
    setTimeout(function () { window.close(); }, 1200);
  </script>
</body>
</html>`);
}

function getPasswordResetRequestLocation(req) {
  const country = req.headers['cf-ipcountry'];
  if (typeof country === 'string' && country.trim()) {
    return country.trim();
  }
  return '';
}

async function createDevOAuthAuthData(provider) {
  const id = `dev-${provider}-user`;
  const userData = {
    authProvider: provider,
    authProviderId: id,
    email: `${id}@neurofoundry.local`,
    name: `Dev ${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
    emailVerified: true
  };
  const user = await findOrCreateOAuthUser(userData);
  const tokens = generateTokens(user);
  return { user, tokens };
}

async function handleDevOAuth(provider, req, res, next) {
  try {
    const redirectPath = sanitizeRedirectPath(req.query.redirect);
    const { user } = await createDevOAuthAuthData(provider);
    return issueOAuthSuccessRedirect(res, user, provider, redirectPath, true);
  } catch (error) {
    return next(error);
  }
}

// ============================================
// LOCAL REGISTRATION
// ============================================
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 10 }).withMessage('Password must be at least 10 characters')
      .matches(/[A-Z]/).withMessage('Password must include at least one capital letter')
      .matches(/[0-9]/).withMessage('Password must include at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must include at least one special character'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('firstName').optional().trim().isLength({ max: 50 }),
    body('lastName').optional().trim().isLength({ max: 50 }),
    body('howHeardAboutNeurofoundry').optional().trim().isLength({ max: 50 }),
    body('dataRetentionAcknowledged').optional().isBoolean(),
    body('marketingOptOut').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, name, firstName, lastName } = req.body;

      // Register user
      let user = await registerUser(email, password, name, firstName, lastName);

      const metadataUpdates = {};
      const preferencesUpdates = {};
      if (typeof req.body.howHeardAboutNeurofoundry === 'string' && req.body.howHeardAboutNeurofoundry.trim()) {
        preferencesUpdates.howHeardAboutNeurofoundry = req.body.howHeardAboutNeurofoundry.trim();
      }
      if (req.body.dataRetentionAcknowledged === true) {
        metadataUpdates.dataRetentionAcknowledged = true;
        metadataUpdates.dataRetentionAcknowledgedAt = new Date().toISOString();
      }
      if (req.body.marketingOptOut === true) {
        preferencesUpdates.marketingOptOut = true;
      }
      if (Object.keys(metadataUpdates).length || Object.keys(preferencesUpdates).length) {
        user = await updateUser(user.id, {
          ...(Object.keys(preferencesUpdates).length ? {
            preferences: {
              ...(user.preferences || {}),
              ...preferencesUpdates
            }
          } : {}),
          ...(Object.keys(metadataUpdates).length ? {
            metadata: {
              ...(user.metadata || {}),
              signup: {
                ...((user.metadata || {}).signup || {}),
                ...metadataUpdates
              }
            }
          } : {})
        });
      }

      // Emit user.registered event for email pipeline
      let emailStatus = null;
      try {
        emailStatus = enqueueUserRegisteredEmail(user, {
          requestId: req.headers['x-request-id'] || null
        });
      } catch (emailError) {
        console.error('Failed to enqueue verification email:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: publicUser(user),
          ...(process.env.NODE_ENV !== 'production' && emailStatus ? { email: emailStatus } : {})
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// LOCAL LOGIN
// ============================================
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || 'Authentication failed'
        });
      }

      if (!isEmailVerified(user)) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email address'
        });
      }

      // Generate tokens
      const tokens = generateTokens(user);

      // Set cookie
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: publicUser(user),
          tokens
        }
      });
    })(req, res, next);
  }
);

router.post(
  '/resend-verification',
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const user = await findUserByEmail(req.body.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No Neurofoundry account was found for that email'
        });
      }

      if (isEmailVerified(user)) {
        return res.json({
          success: true,
          message: 'Email address is already verified.'
        });
      }

      const emailResult = await sendVerificationEmail(user);
      if (!emailResult?.sent) {
        return res.status(503).json({
          success: false,
          message: 'Verification email could not be sent right now'
        });
      }

      return res.json({
        success: true,
        message: 'Verification email resent. Please check your inbox.'
      });
    } catch (error) {
      return next(error);
    }
  }
);

// ============================================
// GOOGLE OAUTH
// ============================================
router.get(
  '/google',
  (req, res, next) => {
    if (!isProviderConfigured('google')) {
      if (isDevOAuthMockEnabled()) {
        return handleDevOAuth('google', req, res, next);
      }
      return res.status(503).json({
        success: false,
        message: 'Google OAuth is not configured'
      });
    }

    const redirectPath = sanitizeRedirectPath(req.query.redirect);
    const expectedEmail = normalizeEmail(req.query.email);
    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: encodeOAuthState({ redirectPath, expectedEmail })
    })(req, res, next);
  }
);

router.post('/dev-oauth/:provider', async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    if (provider !== 'google') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported OAuth provider'
      });
    }

    if (!isDevOAuthMockEnabled()) {
      return res.status(403).json({
        success: false,
        message: 'Development OAuth mock is disabled'
      });
    }

    if (isProviderConfigured(provider)) {
      return res.status(409).json({
        success: false,
        message: `${provider} OAuth is configured. Use the real OAuth flow.`
      });
    }

    const { user, tokens } = await createDevOAuthAuthData(provider);
    setAuthCookie(res, tokens.accessToken);

    return res.json({
      success: true,
      message: `Development ${provider} OAuth successful`,
      data: {
        provider,
        mock: true,
        user: publicUser(user),
        tokens
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isProviderConfigured('google')) {
      if (isDevOAuthMockEnabled()) {
        return handleDevOAuth('google', req, res, next);
      }
      return issueOAuthFailureRedirect(res, 'google_auth_not_configured');
    }

    return passport.authenticate('google', { session: false }, (err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return issueOAuthFailureRedirect(res, 'google_auth_failed');
      }

      const { redirectPath, expectedEmail } = decodeOAuthState(req.query.state);
      if (redirectPath === '/skeleton-key/desktop') {
        if (!expectedEmail) {
          return issueSkeletonKeyStatusPage(
            res,
            'Email Required',
            'Return to Skeleton Key and enter the Neurofoundry email before choosing Google.'
          );
        }
        if (normalizeEmail(user.email) !== expectedEmail) {
          return issueSkeletonKeyStatusPage(
            res,
            'Email Mismatch',
            'The Google account selected does not match the email entered in Skeleton Key. Return to Skeleton Key and use the matching email.'
          );
        }
      }

      return issueOAuthSuccessRedirect(res, user, 'google', redirectPath);
    })(req, res, next);
  }
);

// ============================================
// SKELETON KEY DESKTOP AUTH
// ============================================
router.get(
  '/skeleton-key/access-code/browser',
  [query('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return issueSkeletonKeyStatusPage(
          res,
          'Email Required',
          'Return to Skeleton Key and enter a valid Neurofoundry account email.'
        );
      }

      const user = await findUserByEmail(req.query.email);
      if (!user || !isEmailVerified(user) || !isActiveUser(user)) {
        return issueSkeletonKeyStatusPage(
          res,
          'Verified Account Required',
          'Verify your Neurofoundry account first, then return to Skeleton Key.'
        );
      }

      return issueOAuthSuccessRedirect(res, user, 'local', '/skeleton-key/desktop');
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/skeleton-key/access-code/request',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'A valid email is required',
          errors: errors.array()
        });
      }

      const accessUrl = buildApiUrl(req, '/api/auth/skeleton-key/access-code/browser', {
        email: req.body.email
      });

      return res.json({
        success: true,
        message: 'Open the Skeleton Key access-code page in your browser.',
        data: {
          accessUrl
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/skeleton-key/account-status',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'A valid email is required',
          errors: errors.array()
        });
      }

      const user = await findUserByEmail(req.body.email);
      if (!user || !isEmailVerified(user) || !isActiveUser(user)) {
        return res.status(404).json({
          success: false,
          message: 'A verified Neurofoundry account is required'
        });
      }

      return res.json({
        success: true,
        data: {
          user: publicUser(user)
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/skeleton-key/code-status',
  [query('code').isLength({ min: 4, max: 4 }).isNumeric()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'A valid 4-digit code is required',
          errors: errors.array()
        });
      }

      const status = await getSkeletonKeyAuthCodeStatus(req.query.code, 'desktop_login');
      return res.json({
        success: true,
        data: {
          found: !!status,
          used: !!status?.used,
          expired: !!status?.expired
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/skeleton-key/redeem-code',
  [
    body('code').isLength({ min: 4, max: 4 }).isNumeric(),
    body('email').optional().isEmail().normalizeEmail()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'A valid 4-digit code is required',
          errors: errors.array()
        });
      }

      const user = await redeemSkeletonKeyAuthCode(req.body.code, 'desktop_login');
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired Skeleton Key login code'
        });
      }

      if (req.body.email && user.email.toLowerCase() !== req.body.email.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Skeleton Key verification did not match the requested account'
        });
      }

      if (!isEmailVerified(user)) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email address'
        });
      }

      const updatedUser = await markSkeletonKeyAccessComplete(user);
      const tokens = generateTokens(updatedUser);
      setAuthCookie(res, tokens.accessToken);

      return res.json({
        success: true,
        message: 'Skeleton Key login code accepted',
        data: {
          user: publicUser(updatedUser),
          tokens
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/skeleton-key/pin-reset/request',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'A valid email is required',
          errors: errors.array()
        });
      }

      const user = await findUserByEmail(req.body.email);
      let emailStatus = null;

      if (user) {
        const { code } = await createSkeletonKeyAuthCode(user.id, 'pin_reset', 10, 4);
        try {
          emailStatus = await sendSkeletonKeyPinResetEmail(user, code, {
            appName: 'Skeleton Key',
            requestLocation: getPasswordResetRequestLocation(req)
          });
        } catch (emailError) {
          console.error('Failed to send Skeleton Key PIN reset email:', emailError);
        }
      }

      return res.json({
        success: true,
        message: 'If an account exists with that email, a Skeleton Key PIN reset code has been sent.',
        ...(process.env.NODE_ENV !== 'production' && emailStatus ? { email: emailStatus } : {})
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/skeleton-key/pin-reset/verify',
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 4, max: 4 }).isNumeric()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'A valid email and 4-digit code are required',
          errors: errors.array()
        });
      }

      const user = await redeemSkeletonKeyAuthCode(req.body.code, 'pin_reset');
      if (!user || user.email !== req.body.email) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired Skeleton Key PIN reset code'
        });
      }

      return res.json({
        success: true,
        message: 'Skeleton Key PIN reset verified',
        data: {
          user: publicUser(user)
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

// ============================================
// LOGOUT
// ============================================
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// ============================================
// REFRESH TOKEN
// ============================================
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const { findUserById } = require('../services/userService');
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// VERIFY EMAIL (with token from email)
// ============================================
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Verify email token (implement this in userService)
    const { verifyEmailToken } = require('../services/userService');
    const user = await verifyEmailToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// REQUEST PASSWORD RESET
// ============================================
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;
      const user = await findUserByEmail(email);

      // Don't reveal if user exists
      if (user && isEmailVerified(user)) {
        try {
          await sendPasswordResetEmail(user, {
            requestLocation: getPasswordResetRequestLocation(req)
          });
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
        }
      }

      res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// RESET PASSWORD
// ============================================
router.get('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { findUserByResetPasswordToken } = require('../services/userService');
    const user = await findUserByResetPasswordToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          email: user.email
        }
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password')
      .isLength({ min: 10 }).withMessage('Password must be at least 10 characters')
      .matches(/[A-Z]/).withMessage('Password must include at least one capital letter')
      .matches(/[0-9]/).withMessage('Password must include at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must include at least one special character')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, password } = req.body;

      // Verify reset token and update password
      const { resetPassword } = require('../services/userService');
      const user = await resetPassword(token, password);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
