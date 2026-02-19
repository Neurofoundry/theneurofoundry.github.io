/**
 * Database Configuration
 * Supports Firebase Firestore and Supabase
 */

let db = null;
let dbType = null;

// Initialize Firebase if configured
if (process.env.FIREBASE_PROJECT_ID) {
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
if (!db && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
  console.warn('⚠️  No database configured. Using in-memory storage (dev only)');
  db = new Map(); // Simple in-memory store for development
  dbType = 'memory';
}

module.exports = { db, dbType };
