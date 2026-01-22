// SECURITY FIX (Week 4): HttpOnly Cookie Authentication
// Replaces localStorage JWT with secure HttpOnly cookies

import { Response } from 'express';

/**
 * Cookie names for authentication tokens
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  CSRF_TOKEN: 'csrfToken',
} as const;

/**
 * Cookie options for production security
 */
interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
}

/**
 * Gets secure cookie options based on environment
 */
const getSecureCookieOptions = (maxAge?: number): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: maxAge || 900000, // 15 minutes default (in milliseconds)
    path: '/', // Cookie available on all paths
    // domain: isProduction ? process.env.COOKIE_DOMAIN : undefined, // Set in production
  };
};

/**
 * Sets the access token as an HttpOnly cookie
 *
 * @param res - Express response object
 * @param accessToken - JWT access token
 * @param expiresInSeconds - Token expiration time in seconds (default: 900 = 15 min)
 */
export const setAccessTokenCookie = (
  res: Response,
  accessToken: string,
  expiresInSeconds: number = 900
): void => {
  const maxAge = expiresInSeconds * 1000; // Convert to milliseconds

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...getSecureCookieOptions(maxAge),
    httpOnly: true, // Critical: Prevents XSS attacks
  });
};

/**
 * Sets the refresh token as an HttpOnly cookie
 *
 * @param res - Express response object
 * @param refreshToken - Refresh token
 * @param expiresInSeconds - Token expiration time in seconds (default: 604800 = 7 days)
 */
export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
  expiresInSeconds: number = 604800
): void => {
  const maxAge = expiresInSeconds * 1000; // Convert to milliseconds

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    ...getSecureCookieOptions(maxAge),
    httpOnly: true, // Critical: Prevents XSS attacks
  });
};

/**
 * Sets the CSRF token as a readable cookie (not HttpOnly)
 * Frontend needs to read this to include in request headers
 *
 * @param res - Express response object
 * @param csrfToken - CSRF token
 * @param expiresInSeconds - Token expiration time in seconds (default: 3600 = 1 hour)
 */
export const setCsrfTokenCookie = (
  res: Response,
  csrfToken: string,
  expiresInSeconds: number = 3600
): void => {
  const maxAge = expiresInSeconds * 1000; // Convert to milliseconds
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
    httpOnly: false, // Frontend must read this
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge,
    path: '/',
  });
};

/**
 * Clears the access token cookie
 *
 * @param res - Express response object
 */
export const clearAccessTokenCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};

/**
 * Clears the refresh token cookie
 *
 * @param res - Express response object
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};

/**
 * Clears the CSRF token cookie
 *
 * @param res - Express response object
 */
export const clearCsrfTokenCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
};

/**
 * Clears all authentication cookies
 *
 * @param res - Express response object
 */
export const clearAllAuthCookies = (res: Response): void => {
  clearAccessTokenCookie(res);
  clearRefreshTokenCookie(res);
  clearCsrfTokenCookie(res);
};

/**
 * Sets all authentication cookies at once
 *
 * @param res - Express response object
 * @param accessToken - JWT access token
 * @param refreshToken - Refresh token
 * @param csrfToken - CSRF token (optional)
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken?: string
): void => {
  setAccessTokenCookie(res, accessToken, 900); // 15 minutes
  setRefreshTokenCookie(res, refreshToken, 604800); // 7 days

  if (csrfToken) {
    setCsrfTokenCookie(res, csrfToken, 3600); // 1 hour
  }
};

/**
 * Extracts access token from cookies or Authorization header (fallback)
 *
 * @param req - Express request object
 * @returns Access token or undefined
 */
export const extractAccessToken = (req: any): string | undefined => {
  // Priority 1: HttpOnly cookie (secure)
  if (req.cookies && req.cookies[COOKIE_NAMES.ACCESS_TOKEN]) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }

  // Priority 2: Authorization header (fallback for API compatibility)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
};

/**
 * Extracts refresh token from cookies or request body (fallback)
 *
 * @param req - Express request object
 * @returns Refresh token or undefined
 */
export const extractRefreshToken = (req: any): string | undefined => {
  // Priority 1: HttpOnly cookie (secure)
  if (req.cookies && req.cookies[COOKIE_NAMES.REFRESH_TOKEN]) {
    return req.cookies[COOKIE_NAMES.REFRESH_TOKEN];
  }

  // Priority 2: Request body (fallback for API compatibility)
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  return undefined;
};

/**
 * Extracts CSRF token from cookies
 *
 * @param req - Express request object
 * @returns CSRF token or undefined
 */
export const extractCsrfToken = (req: any): string | undefined => {
  if (req.cookies && req.cookies[COOKIE_NAMES.CSRF_TOKEN]) {
    return req.cookies[COOKIE_NAMES.CSRF_TOKEN];
  }

  return undefined;
};
