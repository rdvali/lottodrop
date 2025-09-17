import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@contexts/AuthContext'
import { MainLayout } from '@components/templates'
import { Spinner } from '@components/atoms'
import { SEO } from '@components/SEO'

// Lazy load all pages for code splitting
const RoomList = lazy(() => import('@pages/RoomList/RoomList'))
const GameRoom = lazy(() => import('@pages/GameRoom/GameRoom'))
const Profile = lazy(() => import('@pages/Profile/Profile'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Spinner size="xl" />
  </div>
)

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <SEO />
          <MainLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<RoomList />} />
                <Route path="/rooms" element={<RoomList />} />
                <Route path="/room/:roomId" element={<GameRoom />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </MainLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#2D2D44',
                color: '#F1F1F1',
                border: '1px solid #9D4EDD',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#F1F1F1',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#F1F1F1',
                },
              },
            }}
          />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App