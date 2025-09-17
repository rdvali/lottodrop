/**
 * Security Hooks for LottoDrop
 */

import { useEffect, useCallback, useRef } from 'react';
import { 
  InputSanitizer, 
  RateLimiter, 
  CSRFProtection, 
  SecurityValidator, 
  SecurityLogger 
} from '../utils/security';

// Hook for input sanitization
export function useInputSanitization() {
  const sanitizeText = useCallback((input: string) => {
    const sanitized = InputSanitizer.sanitizeText(input);
    
    if (SecurityValidator.containsXSS(input)) {
      SecurityLogger.logSecurityEvent('xss_attempt', { 
        input: input.slice(0, 100),
        sanitized: sanitized.slice(0, 100)
      });
    }

    return sanitized;
  }, []);

  const sanitizeNumber = useCallback((input: unknown, min?: number, max?: number) => {
    return InputSanitizer.sanitizeNumber(input, min, max);
  }, []);

  const sanitizeEmail = useCallback((input: string) => {
    return InputSanitizer.sanitizeEmail(input);
  }, []);

  const sanitizeUsername = useCallback((input: string) => {
    return InputSanitizer.sanitizeUsername(input);
  }, []);

  const sanitizeBetAmount = useCallback((input: unknown) => {
    return InputSanitizer.sanitizeBetAmount(input);
  }, []);

  const sanitizeURL = useCallback((input: string) => {
    return InputSanitizer.sanitizeURL(input);
  }, []);

  return {
    sanitizeText,
    sanitizeNumber,
    sanitizeEmail,
    sanitizeUsername,
    sanitizeBetAmount,
    sanitizeURL
  };
}

// Hook for rate limiting
export function useRateLimit(key: string, maxRequests: number, windowMs: number) {
  const attemptRef = useRef(0);

  const isAllowed = useCallback(() => {
    const allowed = RateLimiter.isAllowed(key, maxRequests, windowMs);
    
    if (!allowed) {
      attemptRef.current++;
      SecurityLogger.logSecurityEvent('rate_limit', {
        key,
        attempts: attemptRef.current,
        maxRequests,
        windowMs
      });
    } else {
      attemptRef.current = 0;
    }

    return allowed;
  }, [key, maxRequests, windowMs]);

  const reset = useCallback(() => {
    RateLimiter.reset(key);
    attemptRef.current = 0;
  }, [key]);

  return {
    isAllowed,
    reset,
    attempts: attemptRef.current
  };
}

// Hook for CSRF protection
export function useCSRFProtection() {
  const generateToken = useCallback(() => {
    return CSRFProtection.generateToken();
  }, []);

  const getToken = useCallback(() => {
    return CSRFProtection.getToken();
  }, []);

  const validateToken = useCallback((token: string) => {
    const isValid = CSRFProtection.validateToken(token);
    
    if (!isValid) {
      SecurityLogger.logSecurityEvent('csrf_violation', { token: token.slice(0, 10) });
    }

    return isValid;
  }, []);

  // Generate token on mount
  useEffect(() => {
    generateToken();
  }, [generateToken]);

  return {
    generateToken,
    getToken,
    validateToken
  };
}

// Hook for secure form handling
export function useSecureForm<T extends Record<string, unknown>>(
  validationRules?: Partial<Record<keyof T, (value: unknown) => string | null>>
) {
  const { sanitizeText, sanitizeNumber, sanitizeEmail, sanitizeBetAmount } = useInputSanitization();
  const { getToken } = useCSRFProtection();

  const sanitizeFormData = useCallback((data: T): T => {
    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key as keyof T];

      if (typeof value === 'string') {
        // Apply appropriate sanitization based on field name
        if (key.toLowerCase().includes('email')) {
          sanitized[key as keyof T] = sanitizeEmail(value) as T[keyof T];
        } else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('bet')) {
          sanitized[key as keyof T] = sanitizeBetAmount(value) as T[keyof T];
        } else {
          sanitized[key as keyof T] = sanitizeText(value) as T[keyof T];
        }
      } else if (typeof value === 'number') {
        sanitized[key as keyof T] = sanitizeNumber(value) as T[keyof T];
      }
    });

    return sanitized;
  }, [sanitizeText, sanitizeNumber, sanitizeEmail, sanitizeBetAmount]);

  const validateForm = useCallback((data: T): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (validationRules) {
      Object.keys(validationRules).forEach(key => {
        const rule = validationRules[key as keyof T];
        if (rule) {
          const error = rule(data[key as keyof T]);
          if (error) {
            errors[key] = error;
          }
        }
      });
    }

    return errors;
  }, [validationRules]);

  const prepareSubmission = useCallback((data: T) => {
    const sanitized = sanitizeFormData(data);
    const errors = validateForm(sanitized);
    const csrfToken = getToken();

    return {
      data: sanitized,
      errors,
      isValid: Object.keys(errors).length === 0,
      csrfToken
    };
  }, [sanitizeFormData, validateForm, getToken]);

  return {
    sanitizeFormData,
    validateForm,
    prepareSubmission
  };
}

// Hook for secure API calls
export function useSecureAPI() {
  const { getToken } = useCSRFProtection();
  const rateLimitAPI = useRateLimit('api-calls', 100, 60000); // 100 calls per minute

  const secureRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Check rate limit
    if (!rateLimitAPI.isAllowed()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Add security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers
    };

    // Add CSRF token for non-GET requests
    if (options.method && options.method !== 'GET') {
      const csrfToken = getToken();
      if (csrfToken) {
        (headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
      }
    }

    // Validate URL
    try {
      new URL(url, window.location.origin);
    } catch {
      SecurityLogger.logSecurityEvent('invalid_origin', { url });
      throw new Error('Invalid URL');
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin' // Prevent CSRF
    });
  }, [getToken, rateLimitAPI]);

  return {
    secureRequest,
    rateLimitStatus: {
      attempts: rateLimitAPI.attempts,
      reset: rateLimitAPI.reset
    }
  };
}

// Hook for content security policy
export function useContentSecurityPolicy() {
  useEffect(() => {
    // Add CSP meta tag if not present
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    if (!existingCSP) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: blob: https:;
        font-src 'self' https://fonts.gstatic.com data:;
        connect-src 'self' ws: wss:;
        media-src 'self';
        object-src 'none';
        frame-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim();
      
      document.head.appendChild(meta);
    }
  }, []);
}

// Hook for detecting security violations
export function useSecurityMonitoring() {
  useEffect(() => {
    // Monitor for console manipulation attempts
    const originalConsole = { ...console };
    
    // Detect devtools opening (basic detection)
    const devtools = { open: false };
    const threshold = 160;

    const detectDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          SecurityLogger.logSecurityEvent('xss_attempt', { 
            type: 'devtools_opened',
            timestamp: Date.now()
          });
        }
      } else {
        devtools.open = false;
      }
    };

    // Monitor window resize for devtools detection
    window.addEventListener('resize', detectDevTools);

    // Monitor for suspicious DOM manipulation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for suspicious script injections
              if (element.tagName === 'SCRIPT') {
                const src = element.getAttribute('src');
                const content = element.textContent;
                
                if (src && !SecurityValidator.isValidOrigin(new URL(src).origin)) {
                  SecurityLogger.logSecurityEvent('xss_attempt', {
                    type: 'suspicious_script',
                    src
                  });
                  element.remove();
                } else if (content && SecurityValidator.containsXSS(content)) {
                  SecurityLogger.logSecurityEvent('xss_attempt', {
                    type: 'malicious_script_content',
                    content: content.slice(0, 100)
                  });
                  element.remove();
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      window.removeEventListener('resize', detectDevTools);
      observer.disconnect();
      
      // Restore console
      Object.assign(console, originalConsole);
    };
  }, []);
}