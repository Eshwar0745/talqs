// Unified data service that supports both MongoDB and Firebase
import { DATABASE_PROVIDER, DATA_PROVIDERS } from './config'
import { firebaseOps } from './firebase-db'
import { inMemoryDocumentStore, inMemoryChatStore } from './in-memory-store'

// Common interfaces for data operations
export interface UnifiedUser {
  id?: string
  email: string
  name: string
  image?: string
  provider?: string
  isAdmin?: boolean
  createdAt?: any
  updatedAt?: any
}

export interface UnifiedDocument {
  id?: string
  userId: string
  fingerprint: string
  fileName: string
  fileSize: number
  uploadedAt?: any
  lastAccessedAt?: any
}

export interface UnifiedChatMessage {
  role: 'user' | 'ai'
  content: string
  timestamp: any
}

export interface UnifiedChatHistory {
  id?: string
  userId: string
  messages: UnifiedChatMessage[]
  documentId?: string
  documentName?: string
  documentFingerprint?: string
  createdAt?: any
  updatedAt?: any
}

// MongoDB operations (placeholder - these would import from existing MongoDB models)
const mongoOps = {
  users: {
    async upsertUser(userData: Omit<UnifiedUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnifiedUser | null> {
      // This would use the existing MongoDB User model
      console.log('MongoDB user upsert not implemented yet')
      return null
    },
    async getUserByEmail(email: string): Promise<UnifiedUser | null> {
      console.log('MongoDB getUserByEmail not implemented yet')
      return null
    },
    async getAllUsers(): Promise<UnifiedUser[]> {
      console.log('MongoDB getAllUsers not implemented yet')
      return []
    },
    async deleteUser(userId: string): Promise<boolean> {
      console.log('MongoDB deleteUser not implemented yet')
      return false
    }
  },
  documents: {
    async saveDocument(docData: Omit<UnifiedDocument, 'id' | 'uploadedAt' | 'lastAccessedAt'>): Promise<UnifiedDocument | null> {
      return inMemoryDocumentStore.saveDocument(
        docData.userId,
        docData.fingerprint,
        docData.fileName,
        docData.fileSize
      )
    },
    async getUserDocuments(userId: string): Promise<UnifiedDocument[]> {
      return inMemoryDocumentStore.getUserDocuments(userId)
    },
    async getDocumentByFingerprint(userId: string, fingerprint: string): Promise<UnifiedDocument | null> {
      return inMemoryDocumentStore.getDocumentByFingerprint(userId, fingerprint)
    }
  },
  chats: {
    async saveChatHistory(chatData: Omit<UnifiedChatHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnifiedChatHistory | null> {
      console.log('MongoDB saveChatHistory not implemented yet')
      return null
    },
    async updateChatHistory(chatId: string, messages: UnifiedChatMessage[]): Promise<boolean> {
      console.log('MongoDB updateChatHistory not implemented yet')
      return false
    },
    async getUserChatHistory(userId: string): Promise<UnifiedChatHistory[]> {
      console.log('MongoDB getUserChatHistory not implemented yet')
      return []
    },
    async deleteChatHistory(chatId: string): Promise<boolean> {
      console.log('MongoDB deleteChatHistory not implemented yet')
      return false
    }
  }
}

// Unified data service
export const dataService = {
  // User operations
  users: {
    async upsert(userData: Omit<UnifiedUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnifiedUser | null> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.users.upsertUser(userData)
        if (result || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.users.upsertUser(userData)
        if (result) return result
      }
      
      console.warn('No database provider available for user upsert, using fallback')
      return null
    },

    async getByEmail(email: string): Promise<UnifiedUser | null> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.users.getUserByEmail(email)
        if (result || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.users.getUserByEmail(email)
        if (result) return result
      }
      
      console.warn('No database provider available for user getByEmail')
      return null
    },

    async getAll(): Promise<UnifiedUser[]> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.users.getAllUsers()
        if (result.length > 0 || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.users.getAllUsers()
        if (result.length > 0) return result
      }
      
      console.warn('No database provider available for user getAll')
      return []
    },

    async delete(userId: string): Promise<boolean> {
      let success = false
      
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        success = await firebaseOps.users.deleteUser(userId) || success
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        success = await mongoOps.users.deleteUser(userId) || success
      }
      
      return success
    }
  },

  // Document operations
  documents: {
    async save(docData: Omit<UnifiedDocument, 'id' | 'uploadedAt' | 'lastAccessedAt'>): Promise<UnifiedDocument | null> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.documents.saveDocument(docData)
        if (result || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.documents.saveDocument(docData)
        if (result) return result
      }
      
      // Fallback to in-memory store
      console.warn('Using in-memory fallback for document save')
      return inMemoryDocumentStore.saveDocument(
        docData.userId,
        docData.fingerprint,
        docData.fileName,
        docData.fileSize
      )
    },

    async getUserDocuments(userId: string): Promise<UnifiedDocument[]> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.documents.getUserDocuments(userId)
        if (result.length > 0 || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.documents.getUserDocuments(userId)
        if (result.length > 0) return result
      }
      
      // Fallback to in-memory store
      return inMemoryDocumentStore.getUserDocuments(userId)
    },

    async getByFingerprint(userId: string, fingerprint: string): Promise<UnifiedDocument | null> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.documents.getDocumentByFingerprint(userId, fingerprint)
        if (result || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.documents.getDocumentByFingerprint(userId, fingerprint)
        if (result) return result
      }
      
      // Fallback to in-memory store
      return inMemoryDocumentStore.getDocumentByFingerprint(userId, fingerprint)
    }
  },

  // Chat operations
  chats: {
    async save(chatData: Omit<UnifiedChatHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnifiedChatHistory | null> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.chats.saveChatHistory(chatData)
        if (result || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.chats.saveChatHistory(chatData)
        if (result) return result
      }
      
      console.warn('No database provider available for chat save, using fallback')
      return null
    },

    async update(chatId: string, messages: UnifiedChatMessage[]): Promise<boolean> {
      let success = false
      
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        success = await firebaseOps.chats.updateChatHistory(chatId, messages) || success
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        success = await mongoOps.chats.updateChatHistory(chatId, messages) || success
      }
      
      return success
    },

    async getUserHistory(userId: string): Promise<UnifiedChatHistory[]> {
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        const result = await firebaseOps.chats.getUserChatHistory(userId)
        if (result.length > 0 || DATABASE_PROVIDER === 'firebase') return result
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        const result = await mongoOps.chats.getUserChatHistory(userId)
        if (result.length > 0) return result
      }
      
      console.warn('No database provider available for chat getUserHistory')
      return []
    },

    async delete(chatId: string): Promise<boolean> {
      let success = false
      
      if (DATA_PROVIDERS.firebase && (DATABASE_PROVIDER === 'firebase' || DATABASE_PROVIDER === 'both')) {
        success = await firebaseOps.chats.deleteChatHistory(chatId) || success
      }
      
      if (DATA_PROVIDERS.mongodb && (DATABASE_PROVIDER === 'mongodb' || DATABASE_PROVIDER === 'both')) {
        success = await mongoOps.chats.deleteChatHistory(chatId) || success
      }
      
      return success
    },

    // Real-time subscriptions (only available with Firebase)
    subscribeToUserHistory(userId: string, callback: (chats: UnifiedChatHistory[]) => void): (() => void) | null {
      if (DATA_PROVIDERS.firebase) {
        const unsubscribe = firebaseOps.chats.subscribeToUserChatHistory(userId, callback)
        return unsubscribe || (() => {})
      }
      
      console.warn('Real-time chat subscriptions are only available with Firebase')
      return null
    }
  },

  // Utility methods
  getActiveProviders(): string[] {
    const providers: string[] = []
    if (DATA_PROVIDERS.firebase) providers.push('firebase')
    if (DATA_PROVIDERS.mongodb) providers.push('mongodb')
    if (!providers.length) providers.push('fallback')
    return providers
  },

  isFirebaseEnabled(): boolean {
    return DATA_PROVIDERS.firebase
  },

  isMongoEnabled(): boolean {
    return DATA_PROVIDERS.mongodb
  }
}

export default dataService