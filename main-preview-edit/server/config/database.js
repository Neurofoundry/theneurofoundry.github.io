/**
 * Database Configuration
 * Supports Firebase Firestore and Supabase
 */

let db = null;
let dbType = null;
const { LocalFileStore } = require('../services/localFileStore');
const { CloudflareD1Client } = require('../services/cloudflareD1Client');

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

// Initialize Firebase if configured
if (
  !db
  && !isPlaceholderValue(process.env.CLOUDFLARE_ACCOUNT_ID)
  && !isPlaceholderValue(process.env.CLOUDFLARE_D1_DATABASE_ID)
  && !isPlaceholderValue(process.env.CLOUDFLARE_API_TOKEN)
) {
  try {
    db = new CloudflareD1Client({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN
    });
    dbType = 'cloudflare_d1';
    db.ensureSchema()
      .then(() => console.log('✅ Connected to Cloudflare D1'))
      .catch((error) => console.error('❌ Cloudflare D1 schema/init error:', error.message));
  } catch (error) {
    console.error('❌ Cloudflare D1 initialization error:', error.message);
  }
}

// Initialize Firebase if configured
if (!db && !isPlaceholderValue(process.env.FIREBASE_PROJECT_ID)) {
  const admin = require('firebase-admin');

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    db = admin.firestore();
    dbType = 'firebase';
    console.log('✅ Connected to Firebase Firestore');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
}

// Initialize Supabase if configured and Firebase is not
if (!db && !isPlaceholderValue(process.env.SUPABASE_URL) && !isPlaceholderValue(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  const { createClient } = require('@supabase/supabase-js');

  try {
    db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    dbType = 'supabase';
    console.log('✅ Connected to Supabase');
  } catch (error) {
    console.error('❌ Supabase initialization error:', error.message);
  }
}

// Fallback to in-memory storage (development only)
if (!db) {
  const defaultPath = process.env.NODE_ENV === 'production'
    ? '/data/auth-users.json'
    : './data/auth-users.json';
  const filePath = process.env.LOCAL_DB_FILE || defaultPath;

  try {
    db = new LocalFileStore(filePath);
    dbType = 'localfile';
    console.warn(`⚠️  No external database configured. Using local file store: ${filePath}`);
  } catch (error) {
    console.warn('⚠️  Local file store unavailable. Falling back to in-memory storage.');
    db = new Map(); // Last-resort fallback
    dbType = 'memory';
  }
}

module.exports = { db, dbType };
