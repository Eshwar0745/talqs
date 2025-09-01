// Firebase Firestore database operations
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  DocumentReference,
  QuerySnapshot,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { firebaseDb, isFirebaseConfigured } from './firebase'

// Type definitions for our data models
export interface FirebaseUser {
  id?: string
  email: string
  name: string
  image?: string
  provider?: string
  isAdmin?: boolean
  createdAt: any
  updatedAt: any
}

export interface FirebaseDocument {
  id?: string
  userId: string
  fingerprint: string
  fileName: string
  fileSize: number
  uploadedAt: any
  lastAccessedAt: any
}

export interface FirebaseChatMessage {
  role: 'user' | 'ai'
  content: string
  timestamp: any
}

export interface FirebaseChatHistory {
  id?: string
  userId: string
  messages: FirebaseChatMessage[]
  documentId?: string
  documentName?: string
  documentFingerprint?: string
  createdAt: any
  updatedAt: any
}

// Check if Firebase is available
const isAvailable = () => {
  if (!isFirebaseConfigured() || !firebaseDb) {
    console.warn('Firebase Firestore is not configured or available')
    return false
  }
  return true
}

// User operations
export const firebaseUserOps = {
  // Create or update user
  async upsertUser(userData: Omit<FirebaseUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirebaseUser | null> {
    if (!isAvailable()) return null

    try {
      const usersRef = collection(firebaseDb!, 'users')
      const userQuery = query(usersRef, where('email', '==', userData.email))
      const querySnapshot = await getDocs(userQuery)

      if (!querySnapshot.empty) {
        // User exists, update
        const userDoc = querySnapshot.docs[0]
        const updateData = {
          ...userData,
          updatedAt: serverTimestamp()
        }
        await updateDoc(userDoc.ref, updateData)
        return { id: userDoc.id, ...userData, createdAt: userDoc.data().createdAt, updatedAt: serverTimestamp() }
      } else {
        // Create new user
        const newUser = {
          ...userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        const docRef = await addDoc(usersRef, newUser)
        return { id: docRef.id, ...newUser }
      }
    } catch (error) {
      console.error('Error upserting user:', error)
      return null
    }
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<FirebaseUser | null> {
    if (!isAvailable()) return null

    try {
      const usersRef = collection(firebaseDb!, 'users')
      const userQuery = query(usersRef, where('email', '==', email))
      const querySnapshot = await getDocs(userQuery)

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        return { id: userDoc.id, ...userDoc.data() } as FirebaseUser
      }
      return null
    } catch (error) {
      console.error('Error getting user by email:', error)
      return null
    }
  },

  // Get all users (admin function)
  async getAllUsers(): Promise<FirebaseUser[]> {
    if (!isAvailable()) return []

    try {
      const usersRef = collection(firebaseDb!, 'users')
      const querySnapshot = await getDocs(usersRef)
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseUser))
    } catch (error) {
      console.error('Error getting all users:', error)
      return []
    }
  },

  // Delete user
  async deleteUser(userId: string): Promise<boolean> {
    if (!isAvailable()) return false

    try {
      await deleteDoc(doc(firebaseDb!, 'users', userId))
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }
}

// Document operations
export const firebaseDocumentOps = {
  // Save document metadata
  async saveDocument(docData: Omit<FirebaseDocument, 'id' | 'uploadedAt' | 'lastAccessedAt'>): Promise<FirebaseDocument | null> {
    if (!isAvailable()) return null

    try {
      // Check if document already exists
      const docsRef = collection(firebaseDb!, 'documents')
      const docQuery = query(
        docsRef,
        where('userId', '==', docData.userId),
        where('fingerprint', '==', docData.fingerprint)
      )
      const querySnapshot = await getDocs(docQuery)

      if (!querySnapshot.empty) {
        // Document exists, update last accessed time
        const docDoc = querySnapshot.docs[0]
        await updateDoc(docDoc.ref, { lastAccessedAt: serverTimestamp() })
        return { id: docDoc.id, ...docDoc.data() } as FirebaseDocument
      } else {
        // Create new document
        const newDoc = {
          ...docData,
          uploadedAt: serverTimestamp(),
          lastAccessedAt: serverTimestamp()
        }
        const docRef = await addDoc(docsRef, newDoc)
        return { id: docRef.id, ...newDoc }
      }
    } catch (error) {
      console.error('Error saving document:', error)
      return null
    }
  },

  // Get user documents
  async getUserDocuments(userId: string): Promise<FirebaseDocument[]> {
    if (!isAvailable()) return []

    try {
      const docsRef = collection(firebaseDb!, 'documents')
      const docQuery = query(
        docsRef,
        where('userId', '==', userId),
        orderBy('lastAccessedAt', 'desc')
      )
      const querySnapshot = await getDocs(docQuery)
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseDocument))
    } catch (error) {
      console.error('Error getting user documents:', error)
      return []
    }
  },

  // Get document by fingerprint
  async getDocumentByFingerprint(userId: string, fingerprint: string): Promise<FirebaseDocument | null> {
    if (!isAvailable()) return null

    try {
      const docsRef = collection(firebaseDb!, 'documents')
      const docQuery = query(
        docsRef,
        where('userId', '==', userId),
        where('fingerprint', '==', fingerprint)
      )
      const querySnapshot = await getDocs(docQuery)

      if (!querySnapshot.empty) {
        const docDoc = querySnapshot.docs[0]
        return { id: docDoc.id, ...docDoc.data() } as FirebaseDocument
      }
      return null
    } catch (error) {
      console.error('Error getting document by fingerprint:', error)
      return null
    }
  }
}

// Chat history operations
export const firebaseChatOps = {
  // Save chat history
  async saveChatHistory(chatData: Omit<FirebaseChatHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirebaseChatHistory | null> {
    if (!isAvailable()) return null

    try {
      const newChat = {
        ...chatData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      const chatRef = await addDoc(collection(firebaseDb!, 'chatHistory'), newChat)
      return { id: chatRef.id, ...newChat }
    } catch (error) {
      console.error('Error saving chat history:', error)
      return null
    }
  },

  // Update chat history
  async updateChatHistory(chatId: string, messages: FirebaseChatMessage[]): Promise<boolean> {
    if (!isAvailable()) return false

    try {
      const chatRef = doc(firebaseDb!, 'chatHistory', chatId)
      await updateDoc(chatRef, {
        messages,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (error) {
      console.error('Error updating chat history:', error)
      return false
    }
  },

  // Get user chat history
  async getUserChatHistory(userId: string): Promise<FirebaseChatHistory[]> {
    if (!isAvailable()) return []

    try {
      const chatRef = collection(firebaseDb!, 'chatHistory')
      const chatQuery = query(
        chatRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      )
      const querySnapshot = await getDocs(chatQuery)
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseChatHistory))
    } catch (error) {
      console.error('Error getting user chat history:', error)
      return []
    }
  },

  // Delete chat history
  async deleteChatHistory(chatId: string): Promise<boolean> {
    if (!isAvailable()) return false

    try {
      await deleteDoc(doc(firebaseDb!, 'chatHistory', chatId))
      return true
    } catch (error) {
      console.error('Error deleting chat history:', error)
      return false
    }
  },

  // Listen to chat history changes (real-time)
  subscribeToUserChatHistory(userId: string, callback: (chats: FirebaseChatHistory[]) => void): Unsubscribe | null {
    if (!isAvailable()) return null

    try {
      const chatRef = collection(firebaseDb!, 'chatHistory')
      const chatQuery = query(
        chatRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      )

      return onSnapshot(chatQuery, (querySnapshot) => {
        const chats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseChatHistory))
        callback(chats)
      })
    } catch (error) {
      console.error('Error subscribing to chat history:', error)
      return null
    }
  }
}

// Export all operations
export const firebaseOps = {
  users: firebaseUserOps,
  documents: firebaseDocumentOps,
  chats: firebaseChatOps,
  isAvailable
}