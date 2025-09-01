// Firebase Authentication service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthProvider,
  updateProfile
} from 'firebase/auth'
import { firebaseAuth, isFirebaseConfigured } from './firebase'
import { firebaseUserOps } from './firebase-db'

// Check if Firebase Auth is available
const isAuthAvailable = () => {
  if (!isFirebaseConfigured() || !firebaseAuth) {
    console.warn('Firebase Auth is not configured or available')
    return false
  }
  return true
}

// Firebase Auth service
export const firebaseAuthService = {
  // Sign up with email and password
  async signUp(email: string, password: string, displayName?: string): Promise<UserCredential | null> {
    if (!isAuthAvailable()) return null

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth!, email, password)
      
      // Update user profile with display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName })
      }

      // Save user to Firestore
      if (userCredential.user) {
        await firebaseUserOps.upsertUser({
          email: userCredential.user.email!,
          name: displayName || userCredential.user.displayName || 'User',
          image: userCredential.user.photoURL || undefined,
          provider: 'email'
        })
      }

      console.log('✅ User signed up successfully with Firebase Auth')
      return userCredential
    } catch (error: any) {
      console.error('❌ Error signing up:', error)
      throw new Error(getAuthErrorMessage(error.code))
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<UserCredential | null> {
    if (!isAuthAvailable()) return null

    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth!, email, password)
      console.log('✅ User signed in successfully with Firebase Auth')
      return userCredential
    } catch (error: any) {
      console.error('❌ Error signing in:', error)
      throw new Error(getAuthErrorMessage(error.code))
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<UserCredential | null> {
    if (!isAuthAvailable()) return null

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      const userCredential = await signInWithPopup(firebaseAuth!, provider)
      
      // Save user to Firestore
      if (userCredential.user) {
        await firebaseUserOps.upsertUser({
          email: userCredential.user.email!,
          name: userCredential.user.displayName || 'Google User',
          image: userCredential.user.photoURL || undefined,
          provider: 'google'
        })
      }

      console.log('✅ User signed in with Google via Firebase Auth')
      return userCredential
    } catch (error: any) {
      console.error('❌ Error signing in with Google:', error)
      throw new Error(getAuthErrorMessage(error.code))
    }
  },

  // Sign in with GitHub
  async signInWithGitHub(): Promise<UserCredential | null> {
    if (!isAuthAvailable()) return null

    try {
      const provider = new GithubAuthProvider()
      provider.addScope('user:email')
      
      const userCredential = await signInWithPopup(firebaseAuth!, provider)
      
      // Save user to Firestore
      if (userCredential.user) {
        await firebaseUserOps.upsertUser({
          email: userCredential.user.email!,
          name: userCredential.user.displayName || 'GitHub User',
          image: userCredential.user.photoURL || undefined,
          provider: 'github'
        })
      }

      console.log('✅ User signed in with GitHub via Firebase Auth')
      return userCredential
    } catch (error: any) {
      console.error('❌ Error signing in with GitHub:', error)
      throw new Error(getAuthErrorMessage(error.code))
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    if (!isAuthAvailable()) return

    try {
      await signOut(firebaseAuth!)
      console.log('✅ User signed out successfully')
    } catch (error) {
      console.error('❌ Error signing out:', error)
      throw error
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    if (!isAuthAvailable()) return null
    return firebaseAuth!.currentUser
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!isAuthAvailable()) return () => {}

    return onAuthStateChanged(firebaseAuth!, callback)
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (!isAuthAvailable()) return false
    return !!firebaseAuth!.currentUser
  }
}

// Helper function to convert Firebase Auth error codes to user-friendly messages
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No user found with this email address.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.'
    case 'auth/invalid-email':
      return 'Invalid email address format.'
    case 'auth/user-disabled':
      return 'This user account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completion.'
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was cancelled.'
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by the browser.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email but different sign-in credentials.'
    case 'auth/auth-domain-config-required':
      return 'Firebase Auth domain configuration is required.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please contact support.'
    case 'auth/invalid-action-code':
      return 'Invalid or expired action code.'
    case 'auth/expired-action-code':
      return 'The action code has expired.'
    case 'auth/invalid-continue-uri':
      return 'Invalid continue URL.'
    case 'auth/missing-continue-uri':
      return 'Missing continue URL.'
    case 'auth/unauthorized-continue-uri':
      return 'Unauthorized continue URL.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// Default export
export default firebaseAuthService