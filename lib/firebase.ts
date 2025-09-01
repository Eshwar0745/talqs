// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore'
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase only once
let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

// Check if Firebase config is available
const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  )
}

// Initialize Firebase services
const initializeFirebase = () => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase configuration is incomplete. Please check your environment variables.')
    return null
  }

  try {
    // Initialize Firebase app if not already initialized
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
      console.log('✅ Firebase app initialized successfully')
    } else {
      app = getApps()[0]
      console.log('✅ Using existing Firebase app instance')
    }

    // Initialize Auth
    auth = getAuth(app)
    
    // Initialize Firestore
    db = getFirestore(app)
    
    // Initialize Storage
    storage = getStorage(app)

    // Connect to emulators in development if available
    if (process.env.NODE_ENV === 'development') {
      // Connect Auth emulator
      if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL && !auth.config.emulator) {
        try {
          const authEmulatorUrl = new URL(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL)
          connectAuthEmulator(auth, `http://${authEmulatorUrl.host}`)
          console.log('🔧 Connected to Firebase Auth emulator')
        } catch (error) {
          console.warn('Could not connect to Auth emulator:', error)
        }
      }

      // Connect Firestore emulator
      if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST && !db._delegate._settings) {
        try {
          const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST.split(':')
          connectFirestoreEmulator(db, host, parseInt(port))
          console.log('🔧 Connected to Firestore emulator')
        } catch (error) {
          console.warn('Could not connect to Firestore emulator:', error)
        }
      }

      // Connect Storage emulator
      if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST && !storage._host) {
        try {
          const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.split(':')
          connectStorageEmulator(storage, host, parseInt(port))
          console.log('🔧 Connected to Storage emulator')
        } catch (error) {
          console.warn('Could not connect to Storage emulator:', error)
        }
      }
    }

    return { app, auth, db, storage }
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error)
    return null
  }
}

// Initialize Firebase services
const firebase = initializeFirebase()

// Export Firebase services (will be undefined if not configured)
export const firebaseApp = firebase?.app
export const firebaseAuth = firebase?.auth
export const firebaseDb = firebase?.db
export const firebaseStorage = firebase?.storage

// Export utility functions
export { isFirebaseConfigured }

// Default export for the entire Firebase instance
export default firebase