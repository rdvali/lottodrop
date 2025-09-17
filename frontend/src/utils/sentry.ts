/**
 * Sentry Configuration for LottoDrop
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';

// Sentry configuration
const SENTRY_CONFIG = {
  dsn: process.env.VITE_SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    // Browser integrations
    Sentry.browserTracingIntegration({
      // Capture interactions
      enableInp: true,
      // Performance monitoring
      enableLongTask: true,
    }),
    // Replay for debugging
    Sentry.replayIntegration()
  ],
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Capture console errors
  captureConsoleIntegration: {
    levels: ['error', 'warn']
  },
  // Release tracking
  release: process.env.VITE_APP_VERSION || '1.0.0',
  // Additional options
  maxBreadcrumbs: 50,
  debug: process.env.NODE_ENV === 'development',
  beforeSend: (event: any, hint: any) => {
    // Filter out sensitive information
    if (event.exception) {
      const error = hint.originalException;
      
      // Don't send authentication errors to Sentry
      if (error && error.toString().includes('authentication')) {
        return null;
      }
      
      // Don't send network timeout errors
      if (error && error.toString().includes('timeout')) {
        return null;
      }
    }
    
    // Sanitize sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
        if (breadcrumb.data) {
          // Remove sensitive fields
          const sanitized = { ...breadcrumb.data };
          delete sanitized.password;
          delete sanitized.token;
          delete sanitized.creditCard;
          delete sanitized.ssn;
          
          // Mask partial data
          if (sanitized.email) {
            sanitized.email = sanitized.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
          }
          
          breadcrumb.data = sanitized;
        }
        return breadcrumb;
      });
    }
    
    return event;
  }
};

// Initialize Sentry
export function initializeSentry(): void {
  if (!SENTRY_CONFIG.dsn) {
    console.warn('Sentry DSN not provided. Error tracking disabled.');
    return;
  }

  Sentry.init(SENTRY_CONFIG);
}

// Error reporting utilities
export class ErrorReporter {
  // Report error with context
  static reportError(error: Error, context?: Record<string, unknown>): void {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        section: 'frontend',
        feature: (context?.feature as string) || 'unknown'
      }
    });
  }

  // Report custom message
  static reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'error'): void {
    Sentry.captureMessage(message, level);
  }

  // Report gaming-specific errors
  static reportGameError(
    error: Error,
    gameType: string,
    gameState: Record<string, unknown>
  ): void {
    Sentry.withScope(scope => {
      scope.setTag('gameType', gameType);
      scope.setContext('gameState', gameState);
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Report bet-related errors
  static reportBetError(
    error: Error,
    betAmount: number,
    balance: number
  ): void {
    Sentry.withScope(scope => {
      scope.setTag('errorType', 'betting');
      scope.setContext('bet', {
        amount: betAmount,
        balance,
        timestamp: Date.now()
      });
      Sentry.captureException(error);
    });
  }

  // Report WebSocket errors
  static reportWebSocketError(
    error: Error,
    connectionState: string,
    lastMessage?: unknown
  ): void {
    Sentry.withScope(scope => {
      scope.setTag('errorType', 'websocket');
      scope.setContext('websocket', {
        state: connectionState,
        lastMessage: lastMessage ? JSON.stringify(lastMessage).slice(0, 500) : null,
        timestamp: Date.now()
      });
      Sentry.captureException(error);
    });
  }

  // Report performance issues
  static reportPerformanceIssue(
    metric: string,
    value: number,
    threshold: number
  ): void {
    if (value > threshold) {
      Sentry.captureMessage(
        `Performance issue: ${metric} (${value}ms) exceeded threshold (${threshold}ms)`,
        'warning'
      );
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {

  // Start performance transaction
  static startTransaction(name: string, op: string): void {
    // Transaction tracking is now handled automatically by Sentry
    console.debug(`Transaction started: ${name} (${op})`);
  }

  // Finish performance transaction
  static finishTransaction(name: string): void {
    // Transaction finishing is now handled automatically by Sentry
    console.debug(`Transaction finished: ${name}`);
  }

  // Add span to current transaction
  static addSpan<T>(name: string, op: string, callback: () => Promise<T>): Promise<T> {
    // Span tracking is now handled automatically by Sentry
    console.debug(`Span added: ${name} (${op})`);
    return callback();
  }

  // Monitor game performance
  static monitorGamePerformance<T>(gameType: string, callback: () => Promise<T>): Promise<T> {
    return this.addSpan(`game_${gameType}`, 'game.play', callback);
  }

  // Monitor API calls
  static monitorAPICall<T>(endpoint: string, callback: () => Promise<T>): Promise<T> {
    return this.addSpan(endpoint, 'http.client', callback);
  }
}

// User context management
export class UserContextManager {
  // Set user context
  static setUser(user: {
    id: string;
    username?: string;
    email?: string;
  }): void {
    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined
    });
  }

  // Clear user context
  static clearUser(): void {
    Sentry.setUser(null);
  }

  // Set game context
  static setGameContext(gameType: string, roomId?: string): void {
    Sentry.setTag('currentGame', gameType);
    if (roomId) {
      Sentry.setTag('roomId', roomId);
    }
  }

  // Add breadcrumb
  static addBreadcrumb(
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, unknown>
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data
    });
  }

  // Gaming-specific breadcrumbs
  static addGameBreadcrumb(
    action: 'bet_placed' | 'game_started' | 'game_ended' | 'win' | 'loss',
    data: Record<string, unknown>
  ): void {
    this.addBreadcrumb(
      `Game action: ${action}`,
      'game',
      'info',
      data
    );
  }
}

// React integration types imported above