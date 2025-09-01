"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Database, 
  Cloud, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  Info
} from 'lucide-react'
import { DATA_PROVIDERS, AUTH_PROVIDERS, FIREBASE_ENABLED } from '@/lib/config'
import { dataService } from '@/lib/unified-data-service'
import { isFirebaseConfigured } from '@/lib/firebase'
import useFirebaseAuth from '@/hooks/useFirebaseAuth'

interface DatabaseStatus {
  provider: string
  enabled: boolean
  connected: boolean
  status: 'healthy' | 'warning' | 'error'
  details?: string
}

export default function FirebaseAdminPanel() {
  const [databaseStatuses, setDatabaseStatuses] = useState<DatabaseStatus[]>([])
  const [loading, setLoading] = useState(true)
  const firebaseAuth = useFirebaseAuth()

  useEffect(() => {
    checkDatabaseStatuses()
  }, [])

  const checkDatabaseStatuses = async () => {
    setLoading(true)
    
    const statuses: DatabaseStatus[] = []

    // Check Firebase status
    const firebaseConfigured = isFirebaseConfigured()
    statuses.push({
      provider: 'Firebase',
      enabled: FIREBASE_ENABLED,
      connected: firebaseConfigured && DATA_PROVIDERS.firebase,
      status: firebaseConfigured ? 'healthy' : 'warning',
      details: firebaseConfigured 
        ? 'Firebase is properly configured and ready'
        : 'Firebase configuration is missing or incomplete'
    })

    // Check MongoDB status
    statuses.push({
      provider: 'MongoDB',
      enabled: DATA_PROVIDERS.mongodb,
      connected: DATA_PROVIDERS.mongodb,
      status: DATA_PROVIDERS.mongodb ? 'healthy' : 'warning',
      details: DATA_PROVIDERS.mongodb 
        ? 'MongoDB connection is available'
        : 'MongoDB is not configured or connection failed'
    })

    // Check In-Memory/LocalStorage status
    statuses.push({
      provider: 'Local Storage',
      enabled: true,
      connected: true,
      status: 'healthy',
      details: 'Local storage fallback is always available'
    })

    setDatabaseStatuses(statuses)
    setLoading(false)
  }

  const getStatusIcon = (status: DatabaseStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: DatabaseStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Cloud className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Firebase Integration</h2>
          <p className="text-muted-foreground">Manage Firebase and database connections</p>
        </div>
      </div>

      {/* Configuration Status */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Firebase integration is {FIREBASE_ENABLED ? 'enabled' : 'disabled'}. 
          {!FIREBASE_ENABLED && ' Configure your Firebase environment variables to enable Firebase features.'}
        </AlertDescription>
      </Alert>

      {/* Database Providers Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Providers
          </CardTitle>
          <CardDescription>
            Current status of all database providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {databaseStatuses.map((status) => (
                <div key={status.provider} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.status)}
                    <div>
                      <h4 className="font-medium">{status.provider}</h4>
                      <p className="text-sm text-muted-foreground">{status.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(status.status)}
                    <Badge variant={status.enabled ? 'default' : 'secondary'}>
                      {status.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Active Data Providers</CardTitle>
          <CardDescription>
            Currently active database providers for the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dataService.getActiveProviders().map((provider) => (
              <Badge key={provider} variant="default">
                {provider}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Authentication Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Providers</CardTitle>
          <CardDescription>
            Available authentication methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">NextAuth.js</h4>
                <p className="text-sm text-muted-foreground">OAuth with Google and GitHub</p>
              </div>
              <Badge variant={AUTH_PROVIDERS.nextauth ? 'default' : 'secondary'}>
                {AUTH_PROVIDERS.nextauth ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Firebase Auth</h4>
                <p className="text-sm text-muted-foreground">Email/Password, Google, GitHub via Firebase</p>
              </div>
              <Badge variant={AUTH_PROVIDERS.firebase ? 'default' : 'secondary'}>
                {AUTH_PROVIDERS.firebase ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Firebase Auth Status */}
      {FIREBASE_ENABLED && (
        <Card>
          <CardHeader>
            <CardTitle>Firebase Authentication Status</CardTitle>
            <CardDescription>
              Current Firebase authentication state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>User Status:</span>
                <Badge variant={firebaseAuth.user ? 'default' : 'secondary'}>
                  {firebaseAuth.user ? 'Signed In' : 'Not Signed In'}
                </Badge>
              </div>
              {firebaseAuth.user && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-sm">{firebaseAuth.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Display Name:</span>
                    <span className="text-sm">{firebaseAuth.user.displayName || 'Not set'}</span>
                  </div>
                </div>
              )}
              {firebaseAuth.loading && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
              {firebaseAuth.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{firebaseAuth.error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
          <CardDescription>
            Environment variables and setup instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Check the <code className="text-sm bg-muted px-1 py-0.5 rounded">.env.example</code> file 
                for all required Firebase environment variables.
              </AlertDescription>
            </Alert>
            
            <div className="text-sm space-y-2">
              <h4 className="font-medium">Required Firebase Environment Variables:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code>NEXT_PUBLIC_FIREBASE_API_KEY</code></li>
                <li><code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code></li>
                <li><code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code></li>
                <li><code>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code></li>
                <li><code>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</code></li>
                <li><code>NEXT_PUBLIC_FIREBASE_APP_ID</code></li>
              </ul>
            </div>

            <Button 
              variant="outline" 
              onClick={checkDatabaseStatuses}
              className="w-full"
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}