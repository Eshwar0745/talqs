// Firebase Auth React Hook
import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { firebaseAuthService } from '../lib/firebase-auth'
import { AUTH_PROVIDERS } from '../lib/config'

export interface FirebaseAuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface FirebaseAuthActions {
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useFirebaseAuth = (): FirebaseAuthState & FirebaseAuthActions => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!AUTH_PROVIDERS.firebase) {
      setLoading(false)
      return
    }

    // Listen to authentication state changes
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleError = (error: any) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    setError(message)
    console.error('Firebase Auth Error:', error)
  }

  const clearError = () => {
    setError(null)
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true)
      setError(null)
      await firebaseAuthService.signUp(email, password, displayName)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      await firebaseAuthService.signIn(email, password)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      await firebaseAuthService.signInWithGoogle()
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGitHub = async () => {
    try {
      setLoading(true)
      setError(null)
      await firebaseAuthService.signInWithGitHub()
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      await firebaseAuthService.signOut()
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    clearError
  }
}

export default useFirebaseAuth