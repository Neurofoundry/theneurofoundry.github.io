#!/usr/bin/env node

/**
 * Provision a new Cloudflare D1 database and initialize schema.
 *
 * Required env vars:
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_API_TOKEN
 *
 * Optional:
 * - D1_DB_NAME (default: nf_auth_prod)
 */

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const dbName = process.env.D1_DB_NAME || 'nf_auth_prod';

if (!accountId || !apiToken) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  process.exit(1);
}

async function cfRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    const errorMessage = payload?.errors?.[0]?.message || `Cloudflare API request failed (${res.status})`;
    throw new Error(errorMessage);
  }
  return payload;
}

async function createDatabase() {
  const payload = await cfRequest(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`, {
    method: 'POST',
    body: JSON.stringify({ name: dbName })
  });
  return payload.result;
}

async function execSql(databaseId, sql, params = []) {
  await cfRequest(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql, params })
  });
}

async function initSchema(databaseId) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      first_name TEXT,
      last_name TEXT,
      username TEXT,
      avatar TEXT,
      auth_provider TEXT NOT NULL,
      auth_provider_id TEXT,
      password TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'user',
      preferences TEXT NOT NULL DEFAULT '{}',
      metadata TEXT NOT NULL DEFAULT '{}',
      verification_token TEXT,
      verification_token_expires TEXT,
      reset_password_token TEXT,
      reset_password_expires TEXT
    )`,
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
    'CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users (auth_provider, auth_provider_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token)',
    'CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users (reset_password_token)'
  ];

  for (const sql of statements) {
    // eslint-disable-next-line no-await-in-loop
    await execSql(databaseId, sql);
  }
}

(async () => {
  try {
    const db = await createDatabase();
    await initSchema(db.uuid || db.id);
    console.log(JSON.stringify({
      ok: true,
      database: {
        id: db.uuid || db.id,
        name: db.name
      },
      env: {
        CLOUDFLARE_D1_DATABASE_ID: db.uuid || db.id
      }
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
})();
