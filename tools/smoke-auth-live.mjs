#!/usr/bin/env node

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function asJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const baseUrl = getArg('--base-url', 'http://localhost:3000').replace(/\/$/, '');
const skipOAuth = hasFlag('--skip-oauth');

const now = Date.now();
const email = `smoke.${now}@neurofoundry.com`;
const password = 'password123';

const report = [];

try {
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthBody = await asJson(healthRes);
  assert(healthRes.ok, `Health failed: ${healthRes.status}`);
  report.push({ check: 'health', status: healthRes.status, body: healthBody });

  const standaloneRes = await fetch(`${baseUrl}/auth-standalone-test.html`);
  assert(standaloneRes.ok, `Standalone page failed: ${standaloneRes.status}`);
  report.push({ check: 'standalone_page', status: standaloneRes.status });

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Smoke User' })
  });
  const regBody = await asJson(regRes);
  assert(regRes.status === 201 && regBody.success, `Register failed: ${regRes.status}`);
  report.push({
    check: 'register',
    status: regRes.status,
    success: !!regBody.success,
    emailSent: regBody?.data?.email?.sent ?? null
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginBody = await asJson(loginRes);
  const accessToken = loginBody?.data?.tokens?.accessToken;
  assert(loginRes.ok && accessToken, `Login failed: ${loginRes.status}`);
  report.push({ check: 'login', status: loginRes.status, success: !!loginBody.success });

  const meRes = await fetch(`${baseUrl}/api/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meBody = await asJson(meRes);
  assert(meRes.ok && meBody?.data?.user?.email === email, `Profile failed: ${meRes.status}`);
  report.push({ check: 'profile', status: meRes.status, success: !!meBody.success });

  if (!skipOAuth) {
    const oauthInit = await fetch(`${baseUrl}/api/auth/google?redirect=/profile.html`, {
      redirect: 'manual'
    });
    const location = oauthInit.headers.get('location');
    assert(
      oauthInit.status === 302 && !!location,
      `OAuth init did not redirect: ${oauthInit.status}`
    );
    report.push({
      check: 'oauth_init_google',
      status: oauthInit.status,
      location
    });
  }

  console.log(JSON.stringify({ ok: true, baseUrl, email, report }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, baseUrl, email, error: error.message, report }, null, 2));
  process.exit(1);
}
