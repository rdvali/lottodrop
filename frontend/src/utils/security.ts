/**
 * Security Utilities for LottoDrop
 * XSS protection, input sanitization, and security headers
 */

// Content Security Policy configuration
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for inline scripts (minimize usage)
    'https://cdn.jsdelivr.net', // For CDN libraries
    'https://unpkg.com' // For CDN libraries
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:', // For base64 images
    'blob:', // For generated images
    'https:' // Allow HTTPS images
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:'
  ],
  'connect-src': [
    "'self'",
    'wss:', // WebSocket connections
    'ws:', // WebSocket connections (dev)
    process.env.NODE_ENV === 'development' 
      ? ['http://localhost:*', 'ws://localhost:*'] 
      : ['https://api.lottodrop.com', 'wss://api.lottodrop.com']
  ].flat(),
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

// Generate CSP header value
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Security headers configuration
export const SECURITY_HEADERS = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin'
};

// Input sanitization utilities
export class InputSanitizer {
  // Sanitize text input to prevent XSS
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 1000); // Limit length
  }

  // Sanitize HTML content (very basic)
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Very restrictive HTML sanitization
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }

  // Sanitize URL
  static sanitizeURL(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    try {
      const url = new URL(input);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }

      return url.toString();
    } catch {
      return '';
    }
  }

  // Sanitize number input
  static sanitizeNumber(input: unknown, min?: number, max?: number): number {
    const num = parseFloat(String(input));
    
    if (isNaN(num) || !isFinite(num)) {
      return 0;
    }

    let sanitized = num;
    
    if (min !== undefined && sanitized < min) {
      sanitized = min;
    }
    
    if (max !== undefined && sanitized > max) {
      sanitized = max;
    }

    return sanitized;
  }

  // Sanitize email
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = input.trim().toLowerCase();
    
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  // Sanitize username
  static sanitizeUsername(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50)
      .trim();
  }

  // Sanitize bet amount for gaming
  static sanitizeBetAmount(input: unknown): number {
    const amount = this.sanitizeNumber(input, 0.01, 10000);
    return Math.round(amount * 100) / 100; // Round to 2 decimal places
  }
}

// Rate limiting utilities (client-side)
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map();

  static isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if we're under the limit
    if (recentRequests.length >= maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }

  static reset(key: string): void {
    this.requests.delete(key);
  }
}

// CSRF protection utilities
export class CSRFProtection {
  private static token: string | null = null;

  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return this.token;
  }

  static getToken(): string | null {
    return this.token;
  }

  static validateToken(token: string): boolean {
    return this.token !== null && this.token === token;
  }
}

// Secure storage utilities
export class SecureStorage {
  // Secure localStorage wrapper
  static setItem(key: string, value: unknown): void {
    try {
      const encrypted = btoa(JSON.stringify(value));
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('Failed to store item securely:', error);
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = atob(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.warn('Failed to retrieve item securely:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  // Secure sessionStorage wrapper
  static setSessionItem(key: string, value: unknown): void {
    try {
      const encrypted = btoa(JSON.stringify(value));
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('Failed to store session item securely:', error);
    }
  }

  static getSessionItem<T>(key: string): T | null {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      
      const decrypted = atob(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.warn('Failed to retrieve session item securely:', error);
      return null;
    }
  }
}

// Validation utilities
export class SecurityValidator {
  // Validate JWT token format (client-side validation only)
  static isValidJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Check for common XSS patterns
  static containsXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Check for SQL injection patterns
  static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/gi,
      /(--|#|\/\*)/g,
      /'\s*(or|and)\s*'[^']*'/gi,
      /'\s*(or|and)\s*\d+\s*=\s*\d+/gi
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Validate origin for CORS
  static isValidOrigin(origin: string): boolean {
    const allowedOrigins = [
      'https://lottodrop.com',
      'https://www.lottodrop.com',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
    ];

    return allowedOrigins.includes(origin);
  }
}

// Security event logging
export class SecurityLogger {
  static logSecurityEvent(
    event: 'xss_attempt' | 'sql_injection' | 'rate_limit' | 'csrf_violation' | 'invalid_origin',
    details: Record<string, unknown>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to security monitoring endpoint
      fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.warn('Failed to log security event:', error);
      });
    } else {
      console.warn('Security event:', logEntry);
    }
  }
}