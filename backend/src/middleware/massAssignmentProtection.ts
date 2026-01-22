// SECURITY FIX (HIGH-006): Mass Assignment Protection Middleware
// Automatically validates requests against mass assignment attacks
// Prevents users from modifying sensitive fields

import { Request, Response, NextFunction } from 'express';
import { validateNoSensitiveFields, logMassAssignmentAttempt, SensitiveFields } from '../utils/fieldWhitelist';
import { AuthPayload } from '../types';

/**
 * Middleware that prevents mass assignment of sensitive fields
 * Checks req.body for blacklisted fields and blocks the request
 *
 * @param blacklistedFields - Array of field names to block
 * @param options - Additional options
 */
export const preventMassAssignment = (
  blacklistedFields: string[],
  options?: {
    logAttempts?: boolean;
    strict?: boolean; // If true, throw error. If false, just remove fields
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user as AuthPayload | undefined;

      // Check if any blacklisted fields are in req.body
      const attemptedFields = Object.keys(req.body);
      const violatedFields = attemptedFields.filter(f => blacklistedFields.includes(f));

      if (violatedFields.length > 0) {
        // Log the attempt
        if (options?.logAttempts !== false) {
          logMassAssignmentAttempt(
            user?.userId,
            `${req.method} ${req.path}`,
            attemptedFields,
            blacklistedFields
          );
        }

        // Handle based on strict mode
        if (options?.strict !== false) {
          // Strict mode: Block the request
          res.status(403).json({
            error: 'Invalid request: Attempt to modify restricted fields',
            code: 'MASS_ASSIGNMENT_BLOCKED',
            restrictedFields: violatedFields
          });
          return;
        } else {
          // Non-strict mode: Remove the fields and continue
          for (const field of violatedFields) {
            delete req.body[field];
          }
          console.warn(`[MassAssignment] Removed restricted fields: ${violatedFields.join(', ')}`);
        }
      }

      next();
    } catch (error) {
      console.error('[MassAssignment] Middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  };
};

/**
 * Pre-configured middleware for common scenarios
 */
export const MassAssignmentProtection = {
  /**
   * Prevents regular users from modifying admin/system fields
   * Use this on user-facing profile update endpoints
   */
  userProfile: preventMassAssignment(SensitiveFields.USER_RESTRICTED, {
    logAttempts: true,
    strict: true
  }),

  /**
   * Prevents modification of system-managed fields
   * Use this on admin endpoints that shouldn't modify certain fields
   */
  systemFields: preventMassAssignment(SensitiveFields.SYSTEM_FIELDS, {
    logAttempts: true,
    strict: true
  }),

  /**
   * Prevents non-admin users from elevating privileges
   * Use this on general user update endpoints
   */
  privilegeEscalation: preventMassAssignment(SensitiveFields.ADMIN_ONLY, {
    logAttempts: true,
    strict: true
  }),

  /**
   * Flexible mode - removes forbidden fields without blocking
   * Use this when you want to be permissive but still protect sensitive data
   */
  flexible: (blacklistedFields: string[]) => preventMassAssignment(blacklistedFields, {
    logAttempts: true,
    strict: false
  })
};

/**
 * Role-based mass assignment protection
 * Applies different restrictions based on user role
 *
 * @param config - Role-based configuration
 */
export const roleBasedMassAssignmentProtection = (config: {
  admin?: string[]; // Blacklisted fields for admin
  user?: string[];  // Blacklisted fields for regular users
  guest?: string[]; // Blacklisted fields for unauthenticated users
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthPayload | undefined;

    let blacklistedFields: string[] = [];

    if (!user) {
      // Guest/unauthenticated
      blacklistedFields = config.guest || SensitiveFields.USER_RESTRICTED;
    } else if (user.isAdmin) {
      // Admin user
      blacklistedFields = config.admin || SensitiveFields.SYSTEM_FIELDS;
    } else {
      // Regular user
      blacklistedFields = config.user || SensitiveFields.USER_RESTRICTED;
    }

    // Apply the appropriate protection
    preventMassAssignment(blacklistedFields, {
      logAttempts: true,
      strict: true
    })(req, res, next);
  };
};
