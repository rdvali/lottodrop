// SECURITY FIX (HIGH-006): Mass assignment protection
// Prevents attackers from modifying sensitive fields by whitelisting allowed fields
// Usage: Always filter req.body through this utility before database updates

/**
 * Extracts only whitelisted fields from an object
 * Prevents mass assignment attacks by filtering out sensitive fields
 *
 * @param input - The input object (typically req.body)
 * @param allowedFields - Array of field names that are allowed
 * @returns Object containing only allowed fields
 *
 * @example
 * const safeData = filterAllowedFields(req.body, ['firstName', 'lastName', 'email']);
 * // Even if req.body contains { firstName: 'John', isAdmin: true }, only firstName is returned
 */
export const filterAllowedFields = <T extends Record<string, any>>(
  input: T,
  allowedFields: string[]
): Partial<T> => {
  const filtered: Partial<T> = {};

  for (const field of allowedFields) {
    if (input.hasOwnProperty(field) && input[field] !== undefined) {
      filtered[field as keyof T] = input[field];
    }
  }

  return filtered;
};

/**
 * Common field whitelists for different contexts
 * Use these predefined lists to ensure consistency
 */
export const FieldWhitelists = {
  // User profile update (non-admin)
  USER_PROFILE: [
    'first_name',
    'firstName',
    'last_name',
    'lastName',
    'email'
    // EXPLICITLY EXCLUDED: balance, is_admin, is_active, password_hash
  ],

  // Admin user update
  ADMIN_USER_UPDATE: [
    'first_name',
    'firstName',
    'last_name',
    'lastName',
    'email',
    'balance',
    'is_admin',
    'isAdmin',
    'is_active',
    'isActive'
    // EXPLICITLY EXCLUDED: password_hash (use separate password change endpoint)
  ],

  // Room settings update
  ROOM_UPDATE: [
    'name',
    'type',
    'bet_amount',
    'betAmount',
    'min_participants',
    'minParticipants',
    'max_participants',
    'maxParticipants',
    'countdown_duration',
    'countdownDuration'
    // EXPLICITLY EXCLUDED: status, created_at, updated_at
  ],

  // Transaction filters
  TRANSACTION_FILTERS: [
    'user_id',
    'userId',
    'type',
    'status',
    'start_date',
    'startDate',
    'end_date',
    'endDate',
    'min_amount',
    'minAmount',
    'max_amount',
    'maxAmount'
    // EXPLICITLY EXCLUDED: balance modifications, admin fields
  ]
};

/**
 * Validates that no sensitive fields are present in input
 * Throws error if any blacklisted field is found
 *
 * @param input - The input object to check
 * @param blacklistedFields - Array of field names that are forbidden
 * @throws Error if blacklisted field is found
 *
 * @example
 * validateNoSensitiveFields(req.body, ['is_admin', 'balance']);
 * // Throws if req.body contains is_admin or balance
 */
export const validateNoSensitiveFields = (
  input: Record<string, any>,
  blacklistedFields: string[]
): void => {
  for (const field of blacklistedFields) {
    if (input.hasOwnProperty(field)) {
      throw new Error(
        `Security violation: Attempt to modify restricted field '${field}'`
      );
    }
  }
};

/**
 * Common sensitive field blacklists
 */
export const SensitiveFields = {
  // Never allow users to modify these
  USER_RESTRICTED: [
    'id',
    'password_hash',
    'passwordHash',
    'is_admin',
    'isAdmin',
    'balance',
    'created_at',
    'createdAt',
    'updated_at',
    'updatedAt'
  ],

  // Admin-only fields (prevent in non-admin contexts)
  ADMIN_ONLY: [
    'is_admin',
    'isAdmin',
    'balance',
    'is_active',
    'isActive'
  ],

  // System fields (never allow modification)
  SYSTEM_FIELDS: [
    'id',
    'created_at',
    'createdAt',
    'updated_at',
    'updatedAt'
  ]
};

/**
 * Creates a safe update object for database queries
 * Combines whitelist filtering with type conversion and validation
 *
 * @param input - The input object
 * @param config - Configuration object
 * @returns Safe update data and SQL parts
 *
 * @example
 * const { updates, values } = createSafeUpdateData(req.body, {
 *   allowedFields: FieldWhitelists.USER_PROFILE,
 *   fieldMappings: { firstName: 'first_name', lastName: 'last_name' }
 * });
 */
export const createSafeUpdateData = (
  input: Record<string, any>,
  config: {
    allowedFields: string[];
    fieldMappings?: Record<string, string>; // Map camelCase to snake_case
    validators?: Record<string, (value: any) => boolean>;
  }
): { updates: string[]; values: any[]; fields: string[] } => {
  const filtered = filterAllowedFields(input, config.allowedFields);
  const updates: string[] = [];
  const values: any[] = [];
  const fields: string[] = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(filtered)) {
    // Apply field mapping (camelCase -> snake_case)
    const dbField = config.fieldMappings?.[key] || key;

    // Apply custom validator if provided
    if (config.validators?.[key]) {
      if (!config.validators[key](value)) {
        console.warn(`[MassAssignment] Validation failed for field: ${key}`);
        continue;
      }
    }

    updates.push(`${dbField} = $${paramCount++}`);
    values.push(value);
    fields.push(dbField);
  }

  return { updates, values, fields };
};

/**
 * Logs mass assignment attempts for security monitoring
 * Call this when suspicious input is detected
 */
export const logMassAssignmentAttempt = (
  userId: string | undefined,
  endpoint: string,
  attemptedFields: string[],
  blacklistedFields: string[]
): void => {
  const violatedFields = attemptedFields.filter(f => blacklistedFields.includes(f));

  if (violatedFields.length > 0) {
    console.warn(
      `[SECURITY] Mass assignment attempt detected!\n` +
      `  User: ${userId || 'unauthenticated'}\n` +
      `  Endpoint: ${endpoint}\n` +
      `  Attempted fields: ${attemptedFields.join(', ')}\n` +
      `  Violated fields: ${violatedFields.join(', ')}`
    );
  }
};
