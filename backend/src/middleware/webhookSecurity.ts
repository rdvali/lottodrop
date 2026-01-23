// Webhook Security Middleware
// IP whitelisting and security validation for webhook endpoints

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ============ Configuration ============

/**
 * Parse IP whitelist from environment variable
 * Format: comma-separated list of IPs or CIDR ranges
 * Example: PULSE2PAY_WEBHOOK_IPS=1.2.3.4,5.6.7.8,10.0.0.0/8
 */
function getWhitelistedIPs(): string[] {
  const ipsEnv = process.env.PULSE2PAY_WEBHOOK_IPS;
  if (!ipsEnv) {
    return [];
  }
  return ipsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

/**
 * Normalize IP address (handle IPv6-mapped IPv4 addresses)
 */
function normalizeIP(ip: string): string {
  if (!ip) return '';

  // Handle IPv6-mapped IPv4 addresses (::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  return ip;
}

/**
 * Check if an IP matches a CIDR range
 */
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    // Exact IP match
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  if (isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }

  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);

  if (ipLong === null || rangeLong === null) {
    return false;
  }

  const maskLong = ~((1 << (32 - mask)) - 1);
  return (ipLong & maskLong) === (rangeLong & maskLong);
}

/**
 * Convert IPv4 to long integer for CIDR comparison
 */
function ipToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const nums = parts.map(p => parseInt(p, 10));
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) {
    return null;
  }

  return (nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}

/**
 * Check if an IP is in the whitelist
 */
function isAllowedIP(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return true; // No whitelist configured = allow all
  }

  const normalizedIP = normalizeIP(ip);

  for (const allowed of whitelist) {
    if (ipMatchesCIDR(normalizedIP, allowed)) {
      return true;
    }
  }

  return false;
}

// ============ Middleware ============

/**
 * IP Whitelist Middleware for webhook endpoints
 *
 * Blocks requests from IPs not in the whitelist.
 * In development, logs warning but allows through.
 * In production with whitelist configured, blocks unauthorized IPs.
 */
export const webhookIPWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket?.remoteAddress || '';
  const normalizedIP = normalizeIP(clientIP);
  const whitelist = getWhitelistedIPs();
  const isProduction = process.env.NODE_ENV === 'production';

  // If no whitelist configured
  if (whitelist.length === 0) {
    if (isProduction) {
      logger.warn('Webhook IP whitelist not configured in production - allowing request', {
        ip: normalizedIP,
        recommendation: 'Configure PULSE2PAY_WEBHOOK_IPS environment variable'
      });
    }
    return next();
  }

  // Check if IP is allowed
  if (!isAllowedIP(normalizedIP, whitelist)) {
    logger.warn('Webhook blocked: unauthorized IP', {
      ip: normalizedIP,
      whitelistCount: whitelist.length
    });

    if (isProduction) {
      // In production, block unauthorized IPs
      return res.status(403).json({ error: 'Forbidden' });
    } else {
      // In development, log warning but allow
      logger.warn('DEV MODE: Allowing webhook from non-whitelisted IP', {
        ip: normalizedIP
      });
    }
  }

  next();
};

/**
 * Webhook Headers Validation Middleware
 *
 * Validates that required Pulse2Pay headers are present.
 * Returns 400 for missing headers instead of silently proceeding.
 */
export const webhookHeadersValidation = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'];

  // Validate Content-Type
  if (!contentType || !contentType.includes('application/json')) {
    logger.warn('Webhook received with invalid Content-Type', {
      contentType,
      ip: req.ip
    });
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }

  // Validate body exists
  if (!req.body || typeof req.body !== 'object') {
    logger.warn('Webhook received with empty or invalid body', {
      ip: req.ip
    });
    return res.status(400).json({ error: 'Request body is required' });
  }

  next();
};

/**
 * Combined webhook security middleware
 * Applies IP whitelist and header validation
 */
export const webhookSecurityMiddleware = [
  webhookIPWhitelist,
  webhookHeadersValidation
];

// ============ Exports ============

export default {
  webhookIPWhitelist,
  webhookHeadersValidation,
  webhookSecurityMiddleware,
  // Export utilities for testing
  __testing: {
    normalizeIP,
    isAllowedIP,
    ipMatchesCIDR,
    getWhitelistedIPs
  }
};
