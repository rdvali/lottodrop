import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Error info:', errorInfo)

    // Log to Sentry in production (already configured in the app)
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      try {
        // Sentry is already configured via @sentry/react in the app
        // It will automatically capture unhandled errors
        // But we can explicitly capture with context:
        const Sentry = (window as any).Sentry
        if (Sentry) {
          Sentry.captureException(error, {
            contexts: {
              react: {
                componentStack: errorInfo.componentStack,
              },
            },
          })
        }
      } catch (sentryError) {
        console.error('[ErrorBoundary] Failed to log to Sentry:', sentryError)
      }
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} reset={this.reset} />
    }

    return this.props.children
  }
}

/**
 * Default Error Fallback UI
 *
 * Shown when an error is caught and no custom fallback is provided
 */
const DefaultErrorFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-dark-bg-primary px-4">
    <div className="text-center max-w-md w-full p-8 bg-dark-bg-secondary rounded-lg border border-dark-border">
      {/* Error Icon */}
      <div className="mb-6">
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Title */}
      <h1 className="text-2xl font-bold text-red-500 mb-4">
        Something went wrong
      </h1>

      {/* Error Description */}
      <p className="text-gray-400 mb-6">
        We encountered an unexpected error. Don't worry, your data is safe.
        Please try refreshing the page or contact support if the problem persists.
      </p>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={reset}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
        >
          Try Again
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full px-6 py-3 bg-dark-bg-tertiary text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Return to Home
        </button>
      </div>

      {/* Error Details (Development Only) */}
      {import.meta.env.DEV && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
            Error Details (Development)
          </summary>
          <pre className="mt-2 p-4 bg-gray-900 rounded text-xs overflow-auto max-h-48 text-red-400">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
)

export default ErrorBoundary
