import React from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
): React.FC<P> {
  const WithErrorBoundaryComponent: React.FC<P> = (props: P) => {
    const ErrorBoundary = React.lazy(() => 
      import('../components/ErrorBoundary/ErrorBoundary').then(module => ({ 
        default: module.ErrorBoundary 
      }))
    );
    
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary fallback={fallback}>
          <WrappedComponent {...props} />
        </ErrorBoundary>
      </React.Suspense>
    );
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
}