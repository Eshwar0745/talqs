// Firebase Storage service for file uploads
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  UploadResult,
  UploadTask,
  StorageReference
} from 'firebase/storage'
import { firebaseStorage, isFirebaseConfigured } from './firebase'

// Check if Firebase Storage is available
const isStorageAvailable = () => {
  if (!isFirebaseConfigured() || !firebaseStorage) {
    console.warn('Firebase Storage is not configured or available')
    return false
  }
  return true
}

// File upload progress callback
export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
  percentage: number
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error'
}

// Firebase Storage service
export const firebaseStorageService = {
  // Upload file with progress tracking
  async uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ downloadURL: string; metadata: any } | null> {
    if (!isStorageAvailable()) return null

    try {
      const fileRef = ref(firebaseStorage!, path)
      
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(fileRef, file)

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress callback
            if (onProgress) {
              const progress: UploadProgress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                state: snapshot.state as UploadProgress['state']
              }
              onProgress(progress)
            }
          },
          (error) => {
            console.error('❌ Error uploading file:', error)
            reject(error)
          },
          async () => {
            // Upload completed successfully
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
              const metadata = await getMetadata(uploadTask.snapshot.ref)
              
              console.log('✅ File uploaded successfully:', downloadURL)
              resolve({ downloadURL, metadata })
            } catch (error) {
              console.error('❌ Error getting download URL:', error)
              reject(error)
            }
          }
        )
      })
    } catch (error) {
      console.error('❌ Error starting file upload:', error)
      return null
    }
  },

  // Simple file upload without progress tracking
  async uploadFileSimple(file: File, path: string): Promise<string | null> {
    if (!isStorageAvailable()) return null

    try {
      const fileRef = ref(firebaseStorage!, path)
      const uploadResult = await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(uploadResult.ref)
      
      console.log('✅ File uploaded successfully:', downloadURL)
      return downloadURL
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      return null
    }
  },

  // Upload document for a user
  async uploadDocument(
    userId: string,
    file: File,
    documentId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ downloadURL: string; metadata: any } | null> {
    const path = `documents/${userId}/${documentId}/${file.name}`
    return this.uploadFile(file, path, onProgress)
  },

  // Upload user avatar
  async uploadAvatar(userId: string, file: File): Promise<string | null> {
    const path = `avatars/${userId}/avatar.${file.name.split('.').pop()}`
    return this.uploadFileSimple(file, path)
  },

  // Get download URL for a file
  async getDownloadURL(path: string): Promise<string | null> {
    if (!isStorageAvailable()) return null

    try {
      const fileRef = ref(firebaseStorage!, path)
      const downloadURL = await getDownloadURL(fileRef)
      return downloadURL
    } catch (error) {
      console.error('❌ Error getting download URL:', error)
      return null
    }
  },

  // Delete file
  async deleteFile(path: string): Promise<boolean> {
    if (!isStorageAvailable()) return false

    try {
      const fileRef = ref(firebaseStorage!, path)
      await deleteObject(fileRef)
      console.log('✅ File deleted successfully:', path)
      return true
    } catch (error) {
      console.error('❌ Error deleting file:', error)
      return false
    }
  },

  // List files in a directory
  async listFiles(path: string): Promise<{ name: string; fullPath: string; downloadURL: string }[]> {
    if (!isStorageAvailable()) return []

    try {
      const dirRef = ref(firebaseStorage!, path)
      const listResult = await listAll(dirRef)
      
      const files = await Promise.all(
        listResult.items.map(async (itemRef) => {
          const downloadURL = await getDownloadURL(itemRef)
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            downloadURL
          }
        })
      )

      return files
    } catch (error) {
      console.error('❌ Error listing files:', error)
      return []
    }
  },

  // List user documents
  async listUserDocuments(userId: string): Promise<{ name: string; fullPath: string; downloadURL: string }[]> {
    return this.listFiles(`documents/${userId}`)
  },

  // Get file metadata
  async getFileMetadata(path: string): Promise<any | null> {
    if (!isStorageAvailable()) return null

    try {
      const fileRef = ref(firebaseStorage!, path)
      const metadata = await getMetadata(fileRef)
      return metadata
    } catch (error) {
      console.error('❌ Error getting file metadata:', error)
      return null
    }
  },

  // Generate file path for documents
  generateDocumentPath(userId: string, documentId: string, fileName: string): string {
    return `documents/${userId}/${documentId}/${fileName}`
  },

  // Generate file path for avatars
  generateAvatarPath(userId: string, fileName: string): string {
    const extension = fileName.split('.').pop()
    return `avatars/${userId}/avatar.${extension}`
  },

  // Create a storage reference
  createRef(path: string): StorageReference | null {
    if (!isStorageAvailable()) return null
    return ref(firebaseStorage!, path)
  }
}

// Helper function to validate file types
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type)
}

// Helper function to validate file size
export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

// Common file type constants
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
]

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]

// Default export
export default firebaseStorageService