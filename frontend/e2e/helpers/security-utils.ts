import { Page, BrowserContext, Cookie } from '@playwright/test'

/**
 * Security Testing Utilities (Week 4)
 *
 * Helper functions for testing HttpOnly cookie authentication
 * and CSRF protection in E2E tests.
 */

export interface SecurityCookies {
  accessToken?: Cookie
  refreshToken?: Cookie
  csrfToken?: Cookie
}

/**
 * Get all authentication-related cookies
 */
export async function getAuthCookies(context: BrowserContext): Promise<SecurityCookies> {
  const cookies = await context.cookies()

  return {
    accessToken: cookies.find((c) => c.name === 'accessToken'),
    refreshToken: cookies.find((c) => c.name === 'refreshToken'),
    csrfToken: cookies.find((c) => c.name === 'csrfToken'),
  }
}

/**
 * Verify that a cookie is properly secured with HttpOnly flag
 */
export function verifyCookieSecurity(cookie: Cookie | undefined): {
  exists: boolean
  httpOnly: boolean
  secure: boolean
  sameSite: string
  hasExpiry: boolean
} {
  if (!cookie) {
    return {
      exists: false,
      httpOnly: false,
      secure: false,
      sameSite: 'None',
      hasExpiry: false,
    }
  }

  return {
    exists: true,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite || 'None',
    hasExpiry: (cookie.expires || 0) > Date.now() / 1000,
  }
}

/**
 * Try to access cookies via JavaScript (should fail for HttpOnly cookies)
 */
export async function attemptCookieAccessViaJS(page: Page): Promise<{
  documentCookie: string
  localStorageToken: string | null
  sessionStorageToken: string | null
  windowToken: any
}> {
  return await page.evaluate(() => {
    return {
      documentCookie: document.cookie,
      localStorageToken: localStorage.getItem('token'),
      sessionStorageToken: sessionStorage.getItem('token'),
      windowToken: (window as any).token || (window as any).accessToken,
    }
  })
}

/**
 * Wait for and capture CSRF token request
 */
export async function captureCSRFTokenRequest(page: Page): Promise<{
  method: string
  url: string
  headers: Record<string, string>
} | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000)

    page.on('request', (request) => {
      if (request.url().includes('/auth/csrf-token')) {
        clearTimeout(timeout)
        resolve({
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
        })
      }
    })
  })
}

/**
 * Wait for and capture API request with CSRF header
 */
export async function captureRequestWithCSRF(page: Page): Promise<{
  method: string
  url: string
  csrfToken: string | undefined
  hasCookies: boolean
} | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10000)

    page.on('request', (request) => {
      const method = request.method()
      const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      if (request.url().includes('/api/') && isStateChanging) {
        clearTimeout(timeout)
        const headers = request.headers()
        resolve({
          method,
          url: request.url(),
          csrfToken: headers['x-csrf-token'],
          hasCookies: headers.cookie !== undefined,
        })
      }
    })
  })
}

/**
 * Simulate expired cookie by modifying it
 */
export async function expireCookie(
  context: BrowserContext,
  cookieName: string
): Promise<boolean> {
  const cookies = await context.cookies()
  const targetCookie = cookies.find((c) => c.name === cookieName)

  if (!targetCookie) {
    return false
  }

  await context.addCookies([
    {
      ...targetCookie,
      expires: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    },
  ])

  return true
}

/**
 * Tamper with cookie value (for security testing)
 */
export async function tamperCookieValue(
  context: BrowserContext,
  cookieName: string,
  newValue: string
): Promise<boolean> {
  const cookies = await context.cookies()
  const targetCookie = cookies.find((c) => c.name === cookieName)

  if (!targetCookie) {
    return false
  }

  await context.addCookies([
    {
      ...targetCookie,
      value: newValue,
    },
  ])

  return true
}

/**
 * Monitor WebSocket connection and authentication
 */
export async function monitorWebSocketAuth(page: Page): Promise<{
  connected: boolean
  authenticated: boolean
  error: string | null
}> {
  return new Promise((resolve) => {
    let wsConnected = false
    let wsAuthenticated = false
    let wsError: string | null = null

    const timeout = setTimeout(() => {
      resolve({
        connected: wsConnected,
        authenticated: wsAuthenticated,
        error: wsError || 'Timeout waiting for WebSocket',
      })
    }, 10000)

    page.on('websocket', (ws) => {
      wsConnected = true

      ws.on('framereceived', (event) => {
        const payload = event.payload
        // Check if authentication succeeded
        if (payload && payload.toString().includes('authenticated')) {
          wsAuthenticated = true
          clearTimeout(timeout)
          resolve({
            connected: true,
            authenticated: true,
            error: null,
          })
        }
      })

      ws.on('close', () => {
        if (!wsAuthenticated) {
          wsError = 'WebSocket closed before authentication'
          clearTimeout(timeout)
          resolve({
            connected: wsConnected,
            authenticated: false,
            error: wsError,
          })
        }
      })

      ws.on('socketerror', (error) => {
        wsError = error
        clearTimeout(timeout)
        resolve({
          connected: wsConnected,
          authenticated: false,
          error: wsError,
        })
      })
    })
  })
}

/**
 * Verify no tokens in browser storage (XSS protection)
 */
export async function verifyNoTokensInStorage(page: Page): Promise<{
  localStorageClean: boolean
  sessionStorageClean: boolean
  cookieClean: boolean
  windowClean: boolean
}> {
  const result = await page.evaluate(() => {
    // Check localStorage
    const localStorageKeys = Object.keys(localStorage)
    const hasTokenInLocalStorage = localStorageKeys.some((key) =>
      key.toLowerCase().includes('token')
    )

    // Check sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage)
    const hasTokenInSessionStorage = sessionStorageKeys.some((key) =>
      key.toLowerCase().includes('token')
    )

    // Check document.cookie (should not contain HttpOnly cookies)
    const hasSensitiveCookie =
      document.cookie.includes('accessToken') || document.cookie.includes('refreshToken')

    // Check window object
    const hasTokenOnWindow = !!(window as any).token || !!(window as any).accessToken

    return {
      localStorageClean: !hasTokenInLocalStorage,
      sessionStorageClean: !hasTokenInSessionStorage,
      cookieClean: !hasSensitiveCookie,
      windowClean: !hasTokenOnWindow,
    }
  })

  return result
}

/**
 * Count API requests with proper authentication
 */
export async function monitorAuthenticatedRequests(
  page: Page,
  duration: number = 5000
): Promise<{
  totalRequests: number
  authenticatedRequests: number
  csrfProtectedRequests: number
}> {
  let totalRequests = 0
  let authenticatedRequests = 0
  let csrfProtectedRequests = 0

  const requestHandler = (request: any) => {
    if (request.url().includes('/api/')) {
      totalRequests++

      const headers = request.headers()

      // Check for cookie authentication
      if (headers.cookie && headers.cookie.includes('accessToken')) {
        authenticatedRequests++
      }

      // Check for CSRF token on state-changing requests
      const method = request.method()
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && headers['x-csrf-token']) {
        csrfProtectedRequests++
      }
    }
  }

  page.on('request', requestHandler)

  // Wait for specified duration
  await page.waitForTimeout(duration)

  page.off('request', requestHandler)

  return {
    totalRequests,
    authenticatedRequests,
    csrfProtectedRequests,
  }
}
