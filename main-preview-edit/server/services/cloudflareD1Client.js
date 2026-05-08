/**
 * Cloudflare D1 API client for external runtimes (Fly/Node).
 */

class CloudflareD1Client {
  constructor({ accountId, databaseId, apiToken }) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
    this.schemaReady = false;
  }

  async request(path, body) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const errorMessage = payload?.errors?.[0]?.message
        || payload?.messages?.[0]?.message
        || `D1 request failed (${response.status})`;
      throw new Error(errorMessage);
    }

    return payload;
  }

  async query(sql, params = []) {
    const payload = await this.request('/query', { sql, params });
    const statement = Array.isArray(payload.result) ? payload.result[0] : null;
    return statement?.results || [];
  }

  async exec(sql, params = []) {
    const payload = await this.request('/query', { sql, params });
    return Array.isArray(payload.result) ? payload.result[0] : payload.result;
  }

  async ensureSchema() {
    if (this.schemaReady) return;

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
      await this.exec(sql);
    }

    this.schemaReady = true;
  }
}

module.exports = { CloudflareD1Client };
