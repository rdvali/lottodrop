/**
 * Simple frontend logger utility
 * SECURITY FIX (Week 3): Suppress logs in production
 */

const isDevelopment = import.meta.env.MODE === 'development'

export const logger = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args)
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args)
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args)
    }
  },
}
