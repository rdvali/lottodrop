import { useNavigate } from 'react-router-dom'
import { Button } from '@components/atoms'

interface GameRoomErrorFallbackProps {
  error: Error
  reset: () => void
}

/**
 * Specialized Error Fallback for GameRoom
 *
 * Provides game-specific error handling and recovery options
 */
export const GameRoomErrorFallback = ({ error, reset }: GameRoomErrorFallbackProps) => {
  const navigate = useNavigate()

  const handleReturnToRooms = () => {
    navigate('/')
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg-primary px-4">
      <div className="text-center max-w-lg w-full p-8 bg-dark-bg-secondary rounded-lg border border-dark-border">
        {/* Game Icon with Error */}
        <div className="mb-6">
          <div className="relative inline-block">
            <svg
              className="h-20 w-20 text-purple-500 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <svg
              className="absolute -top-2 -right-2 h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Game Room Error
        </h1>

        <h2 className="text-lg text-gray-400 mb-6">
          We couldn't load this game room
        </h2>

        {/* Error Message */}
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>

        {/* Helpful Information */}
        <div className="mb-6 text-left space-y-2">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-300">Don't worry!</strong> Your balance and progress are safe.
          </p>
          <p className="text-sm text-gray-400">
            You can try one of the following options:
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={reset}
            variant="primary"
            className="w-full"
          >
            Try Loading Room Again
          </Button>

          <Button
            onClick={handleRefresh}
            variant="secondary"
            className="w-full"
          >
            Refresh Page
          </Button>

          <Button
            onClick={handleReturnToRooms}
            variant="secondary"
            className="w-full"
          >
            Return to Room List
          </Button>
        </div>

        {/* Support Information */}
        <div className="mt-6 p-4 bg-dark-bg-tertiary rounded-lg">
          <p className="text-xs text-gray-500">
            If this problem persists, please contact support with error code:
          </p>
          <p className="mt-1 font-mono text-xs text-gray-400">
            {Date.now().toString(36).toUpperCase()}
          </p>
        </div>

        {/* Error Stack (Development Only) */}
        {import.meta.env.DEV && error.stack && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400 mb-2">
              Technical Details (Development)
            </summary>
            <pre className="p-4 bg-gray-900 rounded text-xs overflow-auto max-h-48 text-red-400">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default GameRoomErrorFallback
