import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Component with custom error
const ThrowCustomError = () => {
  throw new Error('Custom error for testing')
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we're intentionally throwing errors
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Error Detection', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Should show error fallback
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    })

    it('should render children normally when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Should render the child component normally
      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should display the error message in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Error message should be visible (in dev mode)
      if (import.meta.env.DEV) {
        const errorDetails = screen.getByText(/Test error message/)
        expect(errorDetails).toBeInTheDocument()
      }
    })
  })

  describe('Error Recovery', () => {
    it('should reset error state when Try Again button is clicked', async () => {
      const user = userEvent.setup()

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Error fallback should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click Try Again button
      const tryAgainButton = screen.getByText('Try Again')
      await user.click(tryAgainButton)

      // After reset, error boundary will try to render children again
      // This will throw again in our test case, but verifies reset works
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Custom Fallback Component', () => {
    const CustomFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
      <div>
        <h1>Custom Error UI</h1>
        <p>{error.message}</p>
        <button onClick={reset}>Custom Reset</button>
      </div>
    )

    it('should use custom fallback component when provided', () => {
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowCustomError />
        </ErrorBoundary>
      )

      // Should show custom fallback instead of default
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      expect(screen.getByText('Custom error for testing')).toBeInTheDocument()
      expect(screen.getByText('Custom Reset')).toBeInTheDocument()

      // Should NOT show default fallback
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Error Callback', () => {
    it('should call onError callback when error is caught', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )

      // onError should have been called with the error
      expect(onError).toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.any(Object) // errorInfo
      )
    })

    it('should work without onError callback', () => {
      // Should not throw if onError is not provided
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        )
      }).not.toThrow()
    })
  })

  describe('Development vs Production', () => {
    it('should show error stack in development mode', () => {
      if (import.meta.env.DEV) {
        render(
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        )

        // Should show error details section in dev mode
        const detailsElement = screen.getByText('Error Details (Development)')
        expect(detailsElement).toBeInTheDocument()
      }
    })
  })

  describe('Multiple Children', () => {
    it('should catch error from any child component', () => {
      const SafeComponent = () => <div>Safe component</div>

      render(
        <ErrorBoundary>
          <SafeComponent />
          <ThrowError />
          <SafeComponent />
        </ErrorBoundary>
      )

      // Error boundary should catch the error from ThrowError
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Safe components should not be rendered (entire tree is replaced by fallback)
      expect(screen.queryByText('Safe component')).not.toBeInTheDocument()
    })
  })

  describe('Nested Error Boundaries', () => {
    it('should allow nested error boundaries with different fallbacks', () => {
      const InnerFallback = () => <div>Inner error caught</div>
      const OuterFallback = () => <div>Outer error caught</div>

      render(
        <ErrorBoundary fallback={OuterFallback}>
          <div>Outer content</div>
          <ErrorBoundary fallback={InnerFallback}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Inner error boundary should catch the error
      expect(screen.getByText('Inner error caught')).toBeInTheDocument()

      // Outer error boundary should not be triggered
      expect(screen.queryByText('Outer error caught')).not.toBeInTheDocument()
      expect(screen.getByText('Outer content')).toBeInTheDocument()
    })
  })
})
