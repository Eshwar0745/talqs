// Firebase Storage React Hook
import { useState, useCallback } from 'react'
import { firebaseStorageService, UploadProgress, ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES } from '../lib/firebase-storage'
import { DATA_PROVIDERS } from '../lib/config'

export interface UseFirebaseStorageState {
  uploading: boolean
  progress: UploadProgress | null
  error: string | null
  downloadURL: string | null
}

export interface UseFirebaseStorageActions {
  uploadFile: (file: File, path: string) => Promise<string | null>
  uploadDocument: (userId: string, file: File, documentId: string) => Promise<string | null>
  uploadAvatar: (userId: string, file: File) => Promise<string | null>
  deleteFile: (path: string) => Promise<boolean>
  clearError: () => void
  reset: () => void
}

export const useFirebaseStorage = (): UseFirebaseStorageState & UseFirebaseStorageActions => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadURL, setDownloadURL] = useState<string | null>(null)

  const handleError = (error: any) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    setError(message)
    console.error('Firebase Storage Error:', error)
  }

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setUploading(false)
    setProgress(null)
    setError(null)
    setDownloadURL(null)
  }, [])

  const uploadFile = useCallback(async (file: File, path: string): Promise<string | null> => {
    if (!DATA_PROVIDERS.firebase) {
      setError('Firebase Storage is not configured')
      return null
    }

    try {
      setUploading(true)
      setError(null)
      setProgress(null)
      setDownloadURL(null)

      const result = await firebaseStorageService.uploadFile(file, path, (progress) => {
        setProgress(progress)
      })

      if (result) {
        setDownloadURL(result.downloadURL)
        return result.downloadURL
      }

      return null
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const uploadDocument = useCallback(async (userId: string, file: File, documentId: string): Promise<string | null> => {
    if (!DATA_PROVIDERS.firebase) {
      setError('Firebase Storage is not configured')
      return null
    }

    // Validate file type
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF, Word document, or text file.')
      return null
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError('File size must be less than 50MB')
      return null
    }

    try {
      setUploading(true)
      setError(null)
      setProgress(null)
      setDownloadURL(null)

      const result = await firebaseStorageService.uploadDocument(userId, file, documentId, (progress) => {
        setProgress(progress)
      })

      if (result) {
        setDownloadURL(result.downloadURL)
        return result.downloadURL
      }

      return null
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const uploadAvatar = useCallback(async (userId: string, file: File): Promise<string | null> => {
    if (!DATA_PROVIDERS.firebase) {
      setError('Firebase Storage is not configured')
      return null
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.')
      return null
    }

    // Validate file size (5MB limit for avatars)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB')
      return null
    }

    try {
      setUploading(true)
      setError(null)
      setProgress(null)
      setDownloadURL(null)

      const result = await firebaseStorageService.uploadAvatar(userId, file)

      if (result) {
        setDownloadURL(result)
        return result
      }

      return null
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const deleteFile = useCallback(async (path: string): Promise<boolean> => {
    if (!DATA_PROVIDERS.firebase) {
      setError('Firebase Storage is not configured')
      return false
    }

    try {
      setError(null)
      return await firebaseStorageService.deleteFile(path)
    } catch (error) {
      handleError(error)
      return false
    }
  }, [])

  return {
    uploading,
    progress,
    error,
    downloadURL,
    uploadFile,
    uploadDocument,
    uploadAvatar,
    deleteFile,
    clearError,
    reset
  }
}

// Hook for listing files
export const useFirebaseFileList = () => {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<{ name: string; fullPath: string; downloadURL: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const listFiles = useCallback(async (path: string) => {
    if (!DATA_PROVIDERS.firebase) {
      setError('Firebase Storage is not configured')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const fileList = await firebaseStorageService.listFiles(path)
      setFiles(fileList)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(message)
      console.error('Firebase Storage List Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const listUserDocuments = useCallback(async (userId: string) => {
    if (!DATA_PROVIDERS.firebase) {
      setError('Firebase Storage is not configured')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const fileList = await firebaseStorageService.listUserDocuments(userId)
      setFiles(fileList)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(message)
      console.error('Firebase Storage List Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    files,
    error,
    listFiles,
    listUserDocuments
  }
}

export default useFirebaseStorage