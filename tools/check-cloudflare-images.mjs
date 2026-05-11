#!/usr/bin/env node

import 'dotenv/config';

const accountId = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

if (!accountId || !apiToken) {
  fail('Missing Cloudflare Images configuration', {
    hasAccountId: !!accountId,
    hasApiToken: !!apiToken
  });
}

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1?per_page=1`,
  {
    headers: {
      Authorization: `Bearer ${apiToken}`
    }
  }
);

const payload = await res.json().catch(() => ({}));
if (!res.ok || payload.success === false) {
  fail('Cloudflare Images API check failed', {
    status: res.status,
    error: payload?.errors?.[0]?.message || null
  });
}

console.log(JSON.stringify({
  ok: true,
  status: res.status,
  resultCount: Array.isArray(payload.result?.images) ? payload.result.images.length : null
}, null, 2));
