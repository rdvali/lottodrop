/**
 * App Audio Initialization Example
 *
 * How to properly initialize the audio service in your root App component
 */

import { useEffect, useState } from 'react'
import { audioService } from '../services/audio'
import type { AudioManifest } from '../types/audio.types'

// Import the audio manifest
// Note: You can also fetch this dynamically if needed
import audioManifest from '../../public/audio/manifest.json'

/**
 * Example 1: Simple initialization in App.tsx
 */
export function AppSimpleInit() {
  const [audioInitialized, setAudioInitialized] = useState(false)

  useEffect(() => {
    // Initialize audio service on mount
    const initAudio = async () => {
      try {
        await audioService.init(audioManifest as AudioManifest)
        console.log('[App] Audio service initialized')
        setAudioInitialized(true)
      } catch (error) {
        console.error('[App] Failed to initialize audio:', error)
        // Continue without audio - graceful degradation
        setAudioInitialized(false)
      }
    }

    initAudio()

    // Cleanup on unmount
    return () => {
      audioService.dispose()
    }
  }, [])

  return (
    <div className="app">
      {!audioInitialized && (
        <div className="audio-loading">
          Loading audio assets...
        </div>
      )}
      {/* Your app content */}
    </div>
  )
}

/**
 * Example 2: With loading state and error handling
 */
export function AppAdvancedInit() {
  const [audioStatus, setAudioStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [audioError, setAudioError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initAudio = async () => {
      try {
        setAudioStatus('loading')
        setAudioError(null)

        // Initialize audio service
        await audioService.init(audioManifest as AudioManifest)

        if (mounted) {
          setAudioStatus('ready')
          console.log('[App] Audio service ready')

          // Log status for debugging
          const status = audioService.getStatus()
          console.log('[App] Audio status:', {
            api: status.activeAudioAPI,
            loaded: status.loadedAssets.length,
            failed: status.failedAssets.length,
          })

          // Warn about failed assets
          if (status.failedAssets.length > 0) {
            console.warn('[App] Failed to load audio assets:', status.failedAssets)
          }
        }
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setAudioStatus('error')
          setAudioError(errorMessage)
          console.error('[App] Audio initialization failed:', error)
        }
      }
    }

    initAudio()

    return () => {
      mounted = false
      // Don't dispose immediately - let other components finish using audio
      setTimeout(() => {
        audioService.dispose()
      }, 1000)
    }
  }, [])

  // Optional: Show loading UI
  if (audioStatus === 'loading') {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Initializing audio system...</p>
      </div>
    )
  }

  // Optional: Show error UI (but don't block app)
  if (audioStatus === 'error') {
    console.warn('[App] Running without audio:', audioError)
    // Continue rendering app - audio is optional
  }

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  )
}

/**
 * Example 3: With context provider pattern
 */
import { createContext, useContext, ReactNode } from 'react'

interface AudioContextValue {
  isReady: boolean
  isEnabled: boolean
  error: string | null
}

const AudioContext = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioService.init(audioManifest as AudioManifest)
        setIsReady(true)
        setIsEnabled(audioService.isAudioEnabled())

        // Listen for enable/disable events
        audioService.addEventListener('enabled', () => setIsEnabled(true))
        audioService.addEventListener('disabled', () => setIsEnabled(false))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize audio')
      }
    }

    initAudio()

    return () => {
      audioService.dispose()
    }
  }, [])

  return (
    <AudioContext.Provider value={{ isReady, isEnabled, error }}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudioContext() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudioContext must be used within AudioProvider')
  }
  return context
}

/**
 * Example 4: Actual App.tsx integration
 */
export function App() {
  const [audioReady, setAudioReady] = useState(false)

  useEffect(() => {
    // Initialize audio service
    audioService
      .init(audioManifest as AudioManifest)
      .then(() => {
        setAudioReady(true)
        console.log('[App] Audio initialized successfully')
      })
      .catch((error) => {
        console.error('[App] Audio initialization error:', error)
        // Continue without audio - non-blocking
        setAudioReady(false)
      })

    // Cleanup
    return () => {
      audioService.dispose()
    }
  }, [])

  return (
    <div className="app">
      {/* Audio status indicator (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-audio-status">
          Audio: {audioReady ? '✓' : '⨯'}
        </div>
      )}

      {/* Rest of your app */}
      <YourAppContent />
    </div>
  )
}

/**
 * Example 5: With React Router and lazy loading
 *
 * Best Practice: Import components directly to avoid barrel export issues
 * Note: React.lazy() requires default exports, so we import the actual component file
 */
import { lazy, Suspense, ComponentType } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Direct component imports for lazy loading (bypasses barrel exports)
const GameRoom: React.LazyExoticComponent<ComponentType<any>> = lazy(() =>
  import('../pages/GameRoom/GameRoom')
)
const RoomList: React.LazyExoticComponent<ComponentType<any>> = lazy(() =>
  import('../pages/RoomList/RoomList')
)

export function AppWithRouter() {
  useEffect(() => {
    // Initialize audio early, don't wait for route loading
    audioService
      .init(audioManifest as AudioManifest)
      .then(() => console.log('[App] Audio ready'))
      .catch((error) => console.error('[App] Audio error:', error))

    return () => audioService.dispose()
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<RoomList />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

/**
 * Example 6: Environment-aware initialization
 */
export function AppWithEnvConfig() {
  useEffect(() => {
    const initAudio = async () => {
      // Skip audio initialization in test environment
      if (process.env.NODE_ENV === 'test') {
        console.log('[App] Skipping audio in test environment')
        return
      }

      // Load manifest based on environment
      const manifest: AudioManifest =
        process.env.NODE_ENV === 'production'
          ? audioManifest // Production uses compiled manifest
          : await fetch('/audio/manifest.json').then(r => r.json()) // Dev uses dynamic manifest

      try {
        await audioService.init(manifest)
        console.log('[App] Audio initialized for', process.env.NODE_ENV)
      } catch (error) {
        console.error('[App] Audio initialization failed:', error)
      }
    }

    initAudio()

    return () => audioService.dispose()
  }, [])

  return <YourApp />
}

// Placeholder components
function YourAppContent() {
  return <div>Your app content here</div>
}

function YourApp() {
  return <div>Your app here</div>
}

function LoadingSpinner() {
  return <div className="spinner">Loading...</div>
}

/**
 * RECOMMENDED: Final App.tsx structure
 */
export function RecommendedApp() {
  const [audioInitialized, setAudioInitialized] = useState(false)

  useEffect(() => {
    // Initialize audio service on mount
    const initializeAudio = async () => {
      try {
        // Fetch and initialize manifest
        await audioService.init(audioManifest as AudioManifest)

        // Get initialization status
        const status = audioService.getStatus()

        if (status.isInitialized) {
          setAudioInitialized(true)
          console.log('[App] Audio service ready:', {
            api: status.activeAudioAPI,
            loadedAssets: status.loadedAssets.length,
            failedAssets: status.failedAssets.length,
          })
        }
      } catch (error) {
        console.error('[App] Audio initialization failed:', error)
        // App continues to work without audio
        setAudioInitialized(false)
      }
    }

    initializeAudio()

    // Cleanup on unmount
    return () => {
      console.log('[App] Disposing audio service')
      audioService.dispose()
    }
  }, [])

  // Optional: Add audio event logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logAudioEvent = (event: string, data?: any) => {
        console.log(`[Audio Event] ${event}`, data)
      }

      audioService.addEventListener('play', logAudioEvent)
      audioService.addEventListener('error', logAudioEvent)

      return () => {
        audioService.removeEventListener('play', logAudioEvent)
        audioService.removeEventListener('error', logAudioEvent)
      }
    }
  }, [])

  return (
    <div className="lottodrop-app">
      {/* Your application components */}
      <YourAppContent />

      {/* Optional: Global audio status indicator */}
      {!audioInitialized && process.env.NODE_ENV === 'development' && (
        <div className="dev-warning">
          ⚠️ Audio service not initialized
        </div>
      )}
    </div>
  )
}

export default RecommendedApp
