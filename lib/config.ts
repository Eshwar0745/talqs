// Application configuration
export const BACKEND_URL = "http://localhost:5000";

// Database configuration
export const DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || "mongodb"; // "mongodb" | "firebase" | "both"

// MongoDB configuration
export const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/talqs";

// Firebase configuration status
export const FIREBASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

// Auth provider configuration
export const AUTH_PROVIDERS = {
  nextauth: true, // NextAuth.js (Google, GitHub OAuth)
  firebase: FIREBASE_ENABLED, // Firebase Auth (Email/Password, Google, GitHub)
};

// Data storage providers
export const DATA_PROVIDERS = {
  mongodb: !!MONGODB_URI,
  firebase: FIREBASE_ENABLED,
  localStorage: true, // Always available as fallback
  inMemory: true, // Always available as fallback
};

// Admin configuration
export const ADMIN_EMAIL = "admin@talqs.com";
export const ADMIN_PASSWORD = "admin123";
