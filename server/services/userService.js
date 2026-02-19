/**
 * User Service
 * Handles all user-related database operations
 * Supports Firebase, Supabase, and in-memory storage
 */

const { db, dbType } = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/**
 * Find user by ID
 */
async function findUserById(userId) {
  try {
    if (dbType === 'firebase') {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return null;
      return { id: userDoc.id, ...userDoc.data() };
    } else if (dbType === 'supabase') {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    } else {
      // In-memory
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
    if (dbType === 'firebase') {
      const snapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } else if (dbType === 'supabase') {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    } else {
      // In-memory
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
    if (dbType === 'firebase') {
      const snapshot = await db.collection('users')
        .where('authProvider', '==', provider)
        .where('authProviderId', '==', providerId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } else if (dbType === 'supabase') {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('auth_provider', provider)
        .eq('auth_provider_id', providerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } else {
      // In-memory
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
      preferences: {},
      metadata: {}
    };

    if (dbType === 'firebase') {
      await db.collection('users').doc(userId).set(user);
    } else if (dbType === 'supabase') {
      const { error } = await db.from('users').insert([{
        id: user.id,
        email: user.email,
        name: user.name,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
        avatar: user.avatar,
        auth_provider: user.authProvider,
        auth_provider_id: user.authProviderId,
        password: user.password,
        email_verified: user.emailVerified,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        last_login_at: user.lastLoginAt,
        is_active: user.isActive,
        role: user.role
      }]);

      if (error) throw error;
    } else {
      // In-memory
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
        lastLoginAt: new Date().toISOString()
      });
      return { ...user, authProvider: userData.authProvider };
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

    if (dbType === 'firebase') {
      await db.collection('users').doc(userId).update(updates);
    } else if (dbType === 'supabase') {
      const supabaseUpdates = {};
      Object.keys(updates).forEach(key => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        supabaseUpdates[snakeKey] = updates[key];
      });

      const { error } = await db
        .from('users')
        .update(supabaseUpdates)
        .eq('id', userId);

      if (error) throw error;
    } else {
      // In-memory
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
      emailVerified: false
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
    if (dbType === 'firebase') {
      await db.collection('users').doc(userId).delete();
    } else if (dbType === 'supabase') {
      const { error } = await db
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } else {
      // In-memory
      db.delete(userId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
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
  deleteUser
};
