/**
 * Error Boundary Component for LottoDrop
 * Catches and handles React errors with Sentry integration
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { ErrorReporter } from '../../utils/sentry';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolated?: boolean; // Whether this boundary is for an isolated component
}

export interface ErrorFallbackProps {
  error: Error;
  errorId?: string;
  resetError: () => void;
  isolated?: boolean;
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorId, 
  resetError, 
  isolated = false 
}) => {
  return (
    <div className={`error-boundary ${isolated ? 'error-boundary-isolated' : 'error-boundary-full'}`}>
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">
          {isolated ? 'Component Error' : 'Something went wrong'}
        </h2>
        <p className="error-message">
          {isolated 
            ? 'This section encountered an error but the rest of the app is still working.'
            : 'We encountered an unexpected error. Please try refreshing the page.'
          }
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Error Details</summary>
            <pre className="error-stack">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
        
        {errorId && (
          <p className="error-id">
            Error ID: <code>{errorId}</code>
          </p>
        )}
        
        <div className="error-actions">
          <button 
            className="btn btn-primary" 
            onClick={resetError}
            aria-label="Try again"
          >
            Try Again
          </button>
          
          {!isolated && (
            <button 
              className="btn btn-secondary" 
              onClick={() => window.location.reload()}
              aria-label="Refresh page"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
      

    </div>
  );
};

// Gaming-specific error fallback
const GamingErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  errorId, 
  resetError 
}) => {
  return (
    <div className="gaming-error-boundary">
      <div className="error-content">
        <div className="error-icon">🎲</div>
        <h2 className="error-title">Game Error</h2>
        <p className="error-message">
          We encountered an error with the game. Your balance is safe, 
          and you can continue playing other games.
        </p>
        
        {errorId && (
          <p className="error-id">
            Reference: <code>{errorId}</code>
          </p>
        )}
        
        <div className="error-actions">
          <button 
            className="btn btn-primary" 
            onClick={resetError}
            aria-label="Try playing again"
          >
            Try Again
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => window.location.href = '/'}
            aria-label="Go to lobby"
          >
            Go to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorId: Math.random().toString(36).substring(7)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to Sentry
    const errorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      },
      extra: {
        errorBoundary: this.props.isolated ? 'isolated' : 'full',
        errorInfo
      }
    });

    // Update state with Sentry error ID
    this.setState({ errorId });

    // Custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to custom error reporter
    ErrorReporter.reportError(error, {
      boundary: this.props.isolated ? 'isolated' : 'full',
      componentStack: errorInfo.componentStack
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId}
          resetError={this.resetError}
          isolated={this.props.isolated}
        />
      );
    }

    return this.props.children;
  }
}

// HOC moved to utils/errorBoundaryUtils.ts to fix fast refresh

// Sentry error boundary (using Sentry's built-in error boundary)
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: ReactNode }) => <>{children}</>,
  {
    fallback: ({ error, resetError }: any) => (
      <DefaultErrorFallback 
        error={error instanceof Error ? error : new Error(String(error))}
        errorId=""
        resetError={resetError}
      />
    ),
    beforeCapture: (scope, _error, errorInfo) => {
      scope.setTag('errorBoundary', 'sentry');
      scope.setContext('errorInfo', errorInfo as any);
    }
  }
);

// Specific error boundaries for different parts of the app
export const GameErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={GamingErrorFallback} isolated>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary isolated>
    {children}
  </ErrorBoundary>
);

// Export error fallback components for reuse
export { DefaultErrorFallback, GamingErrorFallback };

// Export types
export type { ErrorBoundaryProps };

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) => {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback} isolated>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WithErrorBoundary;
};