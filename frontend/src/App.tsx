import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MainLayout } from '@components/templates'
import { AuthModal, NotificationCenter, NotificationToastContainer, NotificationsRoot } from '@components/organisms'
import { AuthProvider, useAuth } from '@contexts/AuthContext'
import { NotificationProvider, useNotifications } from '@contexts/NotificationContext'
import { ModalProvider } from './providers'
import { useModal } from '@hooks/useModal'
import { socketService } from '@services/socket'
import { Spinner } from '@components/atoms'
import { SEO } from '@components/SEO'
import { performanceMonitor } from '@utils/performance'

// Lazy load pages for code splitting
const RoomList = lazy(() => import('@pages/RoomList/RoomList'))
const Profile = lazy(() => import('@pages/Profile/Profile'))
const GameRoom = lazy(() => import('@pages/GameRoom/GameRoom'))
const Results = lazy(() => import('@pages/Results/Results'))
const HowToPlay = lazy(() => import('@pages/HowToPlay/HowToPlay'))

// Page loader component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Spinner size="xl" />
  </div>
)

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/?login=true" replace />
  }
  
  return <>{children}</>
}

// App Content Component (needs to be inside Router)
const AppContent = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { authModalOpen, openAuthModal, closeAuthModal } = useModal()
  const { state: notificationState } = useNotifications()
  
  // Check URL params for login request (for backward compatibility)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('login') === 'true' && !user) {
      openAuthModal()
      // Clean up the URL to remove the login parameter
      window.history.replaceState({}, '', location.pathname)
    }
  }, [location, user, openAuthModal])
  
  // Close modal when user logs in
  useEffect(() => {
    if (user && authModalOpen) {
      closeAuthModal()
    }
  }, [user, authModalOpen, closeAuthModal])
  
  // Setup global socket listeners
  useEffect(() => {
    if (user) {
      const handleGlobalNotification = () => {
        // Global notification received
      }
      
      socketService.onGlobalGameCompleted(handleGlobalNotification)
      
      return () => {
        socketService.offGlobalGameCompleted(handleGlobalNotification)
      }
    }
  }, [user])
  
  // Initialize performance monitoring
  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((metrics) => {
      // Send metrics to analytics or monitoring service
      if (import.meta.env.PROD && metrics.LCP && metrics.FCP && metrics.CLS) {
        // Metrics can be sent to analytics service here
      }
    })
    
    return unsubscribe
  }, [])
  
  const handleLogin = () => {
    openAuthModal()
  }
  
  const handleLogout = () => {
    logout()
  }
  
  return (
    <>
      <SEO />
      <MainLayout
        user={user || undefined}
        onLogin={handleLogin}
        onLogout={handleLogout}
        notificationCount={notificationState?.unreadCount || 0}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RoomList />} />
            <Route path="/results" element={<Results />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/room/:roomId"
              element={
                <ProtectedRoute>
                  <GameRoom />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
      
      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
      />
      
      <NotificationCenter />
      <NotificationToastContainer />
      <NotificationsRoot />
    </>
  )
}

// Main App Component
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <NotificationProvider>
          <ModalProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ModalProvider>
        </NotificationProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App