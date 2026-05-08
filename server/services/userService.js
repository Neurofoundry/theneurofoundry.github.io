/**
 * User Service
 * Handles all user-related database operations
 * Supports Firebase, Supabase, and in-memory storage
 */

const { db, dbType } = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const D1_SELECT_USER = `
  SELECT
    id,
    email,
    name,
    first_name AS firstName,
    last_name AS lastName,
    username,
    avatar,
    auth_provider AS authProvider,
    auth_provider_id AS authProviderId,
    password,
    email_verified AS emailVerified,
    created_at AS createdAt,
    updated_at AS updatedAt,
    last_login_at AS lastLoginAt,
    is_active AS isActive,
    role,
    plan_tier AS planTier,
    account_status AS accountStatus,
    billing_id AS billingId,
    preferences,
    metadata,
    verification_token AS verificationToken,
    verification_token_expires AS verificationTokenExpires,
    reset_password_token AS resetPasswordToken,
    reset_password_expires AS resetPasswordExpires
  FROM users
`;

function parseJsonField(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toD1Bool(value, defaultValue = false) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return defaultValue;
}

function normalizeD1User(row) {
  if (!row) return null;
  return {
    ...row,
    emailVerified: toD1Bool(row.emailVerified, false),
    isActive: toD1Bool(row.isActive, true),
    preferences: parseJsonField(row.preferences, {}),
    metadata: parseJsonField(row.metadata, {})
  };
}

function toD1Column(key) {
  const explicit = {
    firstName: 'first_name',
    lastName: 'last_name',
    authProvider: 'auth_provider',
    authProviderId: 'auth_provider_id',
    emailVerified: 'email_verified',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    lastLoginAt: 'last_login_at',
    isActive: 'is_active',
    verificationToken: 'verification_token',
    verificationTokenExpires: 'verification_token_expires',
    resetPasswordToken: 'reset_password_token',
    resetPasswordExpires: 'reset_password_expires'
  };
  if (explicit[key]) return explicit[key];
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function hashSkeletonKeyCode(code) {
  const secret = process.env.SKELETON_KEY_CODE_SECRET || process.env.JWT_SECRET || 'skeleton-key-dev-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(String(code).trim())
    .digest('hex');
}

function makeNumericCode(length = 4) {
  const min = 10 ** (length - 1);
  const max = (10 ** length) - 1;
  return String(crypto.randomInt(min, max + 1));
}

async function createSkeletonKeyAuthCode(userId, purpose, ttlMinutes = 10, codeLength = 4) {
  const code = makeNumericCode(codeLength);
  const codeHash = hashSkeletonKeyCode(code);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  if (dbType === 'cloudflare_d1') {
    await db.exec(
      `INSERT INTO skeleton_key_auth_codes (
        code_hash, user_id, purpose, expires_at, used_at, created_at
      ) VALUES (?, ?, ?, ?, NULL, ?)`,
      [codeHash, userId, purpose, expiresAt, now]
    );
  } else {
    db.set(`skeleton_key_auth_code:${codeHash}`, {
      codeHash,
      userId,
      purpose,
      expiresAt,
      usedAt: null,
      createdAt: now
    });
  }

  return { code, expiresAt, purpose };
}

async function redeemSkeletonKeyAuthCode(code, purpose) {
  const codeHash = hashSkeletonKeyCode(code);
  const now = new Date();
  let record = null;

  if (dbType === 'cloudflare_d1') {
    const rows = await db.query(
      `SELECT code_hash AS codeHash, user_id AS userId, purpose, expires_at AS expiresAt,
        used_at AS usedAt, created_at AS createdAt
       FROM skeleton_key_auth_codes
       WHERE code_hash = ? AND purpose = ? LIMIT 1`,
      [codeHash, purpose]
    );
    record = rows[0] || null;
  } else {
    record = db.get(`skeleton_key_auth_code:${codeHash}`) || null;
  }

  if (!record || record.usedAt || new Date(record.expiresAt) < now) {
    return null;
  }

  if (dbType === 'cloudflare_d1') {
    await db.exec(
      'UPDATE skeleton_key_auth_codes SET used_at = ? WHERE code_hash = ?',
      [now.toISOString(), codeHash]
    );
  } else {
    db.set(`skeleton_key_auth_code:${codeHash}`, {
      ...record,
      usedAt: now.toISOString()
    });
  }

  return await findUserById(record.userId);
}

async function getSkeletonKeyAuthCodeStatus(code, purpose) {
  const codeHash = hashSkeletonKeyCode(code);
  let record = null;

  if (dbType === 'cloudflare_d1') {
    const rows = await db.query(
      `SELECT code_hash AS codeHash, user_id AS userId, purpose, expires_at AS expiresAt,
        used_at AS usedAt, created_at AS createdAt
       FROM skeleton_key_auth_codes
       WHERE code_hash = ? AND purpose = ? LIMIT 1`,
      [codeHash, purpose]
    );
    record = rows[0] || null;
  } else {
    record = db.get(`skeleton_key_auth_code:${codeHash}`) || null;
  }

  if (!record) return null;

  return {
    purpose: record.purpose,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt || null,
    expired: new Date(record.expiresAt) < new Date(),
    used: !!record.usedAt
  };
}

/**
 * Find user by ID
 */
async function findUserById(userId) {
  try {
    if (dbType === 'cloudflare_d1') {
      const rows = await db.query(`${D1_SELECT_USER} WHERE id = ? LIMIT 1`, [userId]);
      return normalizeD1User(rows[0] || null);
    } else {
      return db.get(userId) || null;
    }
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

/**
 * Find user by email
 */
async function findUserByEmail(email) {
  try {
    if (dbType === 'cloudflare_d1') {
      const rows = await db.query(`${D1_SELECT_USER} WHERE email = ? LIMIT 1`, [email]);
      return normalizeD1User(rows[0] || null);
    } else {
      for (const [id, user] of db.entries()) {
        if (user.email === email) return user;
      }
      return null;
    }
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

/**
 * Find user by OAuth provider ID
 */
async function findUserByAuthProvider(provider, providerId) {
  try {
    if (dbType === 'cloudflare_d1') {
      const rows = await db.query(
        `${D1_SELECT_USER} WHERE auth_provider = ? AND auth_provider_id = ? LIMIT 1`,
        [provider, providerId]
      );
      return normalizeD1User(rows[0] || null);
    } else {
      for (const [id, user] of db.entries()) {
        if (user.authProvider === provider && user.authProviderId === providerId) {
          return user;
        }
      }
      return null;
    }
  } catch (error) {
    console.error('Error finding user by auth provider:', error);
    throw error;
  }
}

/**
 * Create new user
 */
async function createUser(userData) {
  try {
    const userId = uuidv4();
    const now = new Date().toISOString();

    const user = {
      id: userId,
      email: userData.email,
      name: userData.name || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      username: userData.username || null,
      avatar: userData.avatar || null,
      authProvider: userData.authProvider || 'local',
      authProviderId: userData.authProviderId || null,
      password: userData.password || null, // Already hashed if local
      emailVerified: userData.emailVerified || false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isActive: true,
      role: 'user',
      planTier: userData.planTier || 'free',
      accountStatus: userData.accountStatus || (userData.emailVerified ? 'active' : 'pending_verification'),
      billingId: userData.billingId || null,
      preferences: {},
      metadata: {}
    };

    if (dbType === 'cloudflare_d1') {
      await db.exec(
        `INSERT INTO users (
          id, email, name, first_name, last_name, username, avatar,
          auth_provider, auth_provider_id, password, email_verified,
          created_at, updated_at, last_login_at, is_active, role, plan_tier,
          account_status, billing_id,
          preferences, metadata, verification_token, verification_token_expires,
          reset_password_token, reset_password_expires
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          user.name,
          user.firstName,
          user.lastName,
          user.username,
          user.avatar,
          user.authProvider,
          user.authProviderId,
          user.password,
          user.emailVerified ? 1 : 0,
          user.createdAt,
          user.updatedAt,
          user.lastLoginAt,
          user.isActive ? 1 : 0,
          user.role,
          user.planTier,
          user.accountStatus,
          user.billingId,
          JSON.stringify(user.preferences || {}),
          JSON.stringify(user.metadata || {}),
          user.verificationToken || null,
          user.verificationTokenExpires || null,
          user.resetPasswordToken || null,
          user.resetPasswordExpires || null
        ]
      );
    } else {
      db.set(userId, user);
    }

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Find or create OAuth user
 */
async function findOrCreateOAuthUser(userData) {
  try {
    // Try to find existing user by provider ID
    let user = await findUserByAuthProvider(userData.authProvider, userData.authProviderId);

    if (user) {
      // Update last login
      await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
      return user;
    }

    // Try to find by email
    user = await findUserByEmail(userData.email);

    if (user) {
      // Link OAuth account to existing user
      await updateUser(user.id, {
        authProvider: userData.authProvider,
        authProviderId: userData.authProviderId,
        emailVerified: true,
        accountStatus: 'active',
        lastLoginAt: new Date().toISOString()
      });
      return { ...user, authProvider: userData.authProvider, emailVerified: true, accountStatus: 'active' };
    }

    // Create new user
    return await createUser(userData);
  } catch (error) {
    console.error('Error in findOrCreateOAuthUser:', error);
    throw error;
  }
}

/**
 * Update user
 */
async function updateUser(userId, updates) {
  try {
    updates.updatedAt = new Date().toISOString();

    if (dbType === 'cloudflare_d1') {
      const assignments = [];
      const values = [];

      Object.keys(updates).forEach((key) => {
        const column = toD1Column(key);
        let value = updates[key];

        if (key === 'preferences' || key === 'metadata') {
          value = JSON.stringify(value || {});
        } else if (key === 'emailVerified' || key === 'isActive') {
          value = value ? 1 : 0;
        }

        assignments.push(`${column} = ?`);
        values.push(value);
      });

      if (assignments.length === 0) {
        return await findUserById(userId);
      }

      values.push(userId);
      await db.exec(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
        values
      );
    } else {
      const user = db.get(userId);
      if (user) {
        db.set(userId, { ...user, ...updates });
      }
    }

    return await findUserById(userId);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Register new local user
 */
async function registerUser(email, password, name) {
  try {
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      name,
      authProvider: 'local',
      emailVerified: false,
      role: 'user',
      planTier: 'free',
      accountStatus: 'pending_verification',
      billingId: null
    };

    return await createUser(userData);
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(userId) {
  try {
    if (dbType === 'cloudflare_d1') {
      await db.exec('DELETE FROM users WHERE id = ?', [userId]);
    } else {
      db.delete(userId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Verify email token
 */
async function verifyEmailToken(token) {
  try {
    let user = null;

    if (dbType === 'cloudflare_d1') {
      const rows = await db.query(
        `${D1_SELECT_USER} WHERE verification_token = ? LIMIT 1`,
        [token]
      );
      user = normalizeD1User(rows[0] || null);
    } else {
      for (const [id, u] of db.entries()) {
        if (u.verificationToken === token) {
          user = u;
          break;
        }
      }
    }

    if (!user) return null;

    // Check if token is expired
    if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < new Date()) {
      return null;
    }

    // Mark email as verified
    await updateUser(user.id, {
      emailVerified: true,
      accountStatus: 'active',
      verificationToken: null,
      verificationTokenExpires: null
    });

    return await findUserById(user.id);
  } catch (error) {
    console.error('Error verifying email token:', error);
    throw error;
  }
}

/**
 * Reset password with token
 */
async function resetPassword(token, newPassword) {
  try {
    let user = null;

    if (dbType === 'cloudflare_d1') {
      const rows = await db.query(
        `${D1_SELECT_USER} WHERE reset_password_token = ? LIMIT 1`,
        [token]
      );
      user = normalizeD1User(rows[0] || null);
    } else {
      for (const [id, u] of db.entries()) {
        if (u.resetPasswordToken === token) {
          user = u;
          break;
        }
      }
    }

    if (!user) return null;

    // Check if token is expired
    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires) < new Date()) {
      return null;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );

    // Update password and clear reset token
    await updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    return await findUserById(user.id);
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

/**
 * Find user by active password reset token
 */
async function findUserByResetPasswordToken(token) {
  try {
    let user = null;

    if (dbType === 'cloudflare_d1') {
      const rows = await db.query(
        `${D1_SELECT_USER} WHERE reset_password_token = ? LIMIT 1`,
        [token]
      );
      user = normalizeD1User(rows[0] || null);
    } else {
      for (const [, u] of db.entries()) {
        if (u.resetPasswordToken === token) {
          user = u;
          break;
        }
      }
    }

    if (!user) return null;

    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires) < new Date()) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error finding reset password token:', error);
    throw error;
  }
}

module.exports = {
  findUserById,
  findUserByEmail,
  findUserByAuthProvider,
  createUser,
  findOrCreateOAuthUser,
  updateUser,
  registerUser,
  deleteUser,
  verifyEmailToken,
  findUserByResetPasswordToken,
  resetPassword,
  createSkeletonKeyAuthCode,
  redeemSkeletonKeyAuthCode,
  getSkeletonKeyAuthCodeStatus
};
