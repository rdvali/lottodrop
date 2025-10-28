/**
 * Currency formatting utilities for LottoDrop
 * Consistent USD formatting across the application
 */

// Pre-configured USD formatter for performance (singleton pattern)
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Compact formatter for large amounts (e.g., $1.2K, $1.5M)
const usdCompactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
  notation: 'compact',
});

/**
 * Formats a number as USD currency with two decimal places
 * @param value - The numeric value to format (can be number, string, null, undefined)
 * @param options - Optional configuration
 * @returns Formatted currency string (e.g., "$10.00")
 *
 * @example
 * formatCurrency(10) // "$10.00"
 * formatCurrency(1500.5) // "$1,500.50"
 * formatCurrency(null) // "$0.00"
 * formatCurrency(-50) // "-$50.00"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: { fallback?: string; showZero?: boolean } = {}
): string {
  const { fallback = '$0.00', showZero = true } = options;

  // Handle null/undefined
  if (value == null) {
    return fallback;
  }

  // Parse string to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid numbers (including NaN and Infinity)
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback;
  }

  // Handle zero display preference
  if (numValue === 0 && !showZero) {
    return fallback;
  }

  return usdFormatter.format(numValue);
}

/**
 * Formats currency with explicit +/- sign for transaction deltas
 * @param value - The numeric value to format
 * @param options - Optional configuration
 * @returns Formatted currency with sign (e.g., "+$10.00", "-$5.00")
 *
 * @example
 * formatCurrencyWithSign(10) // "+$10.00"
 * formatCurrencyWithSign(-5) // "-$5.00"
 * formatCurrencyWithSign(0) // "$0.00"
 */
export function formatCurrencyWithSign(
  value: number | string | null | undefined,
  options: { fallback?: string } = {}
): string {
  const { fallback = '$0.00' } = options;

  if (value == null) {
    return fallback;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid numbers (including NaN and Infinity)
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback;
  }

  const formatted = usdFormatter.format(Math.abs(numValue));

  if (numValue > 0) {
    return `+${formatted}`;
  } else if (numValue < 0) {
    return `-${formatted}`;
  }

  return formatted; // Zero case
}

/**
 * Formats large amounts in compact notation (e.g., $1.2K, $1.5M)
 * Useful for dashboard stats, prize pools, leaderboards
 * @param value - The numeric value to format
 * @param options - Optional configuration
 * @returns Compact formatted currency (e.g., "$1.2K")
 *
 * @example
 * formatCurrencyCompact(1500) // "$1.5K"
 * formatCurrencyCompact(1500000) // "$1.5M"
 */
export function formatCurrencyCompact(
  value: number | string | null | undefined,
  options: { fallback?: string } = {}
): string {
  const { fallback = '$0' } = options;

  if (value == null) {
    return fallback;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid numbers (including NaN and Infinity)
  if (isNaN(numValue) || !isFinite(numValue)) {
    return fallback;
  }

  return usdCompactFormatter.format(numValue);
}

/**
 * Parses a currency string to a number
 * Removes currency symbols, commas, and whitespace
 * @param value - The currency string to parse (e.g., "$1,500.00")
 * @returns Parsed number or null if invalid
 *
 * @example
 * parseCurrency("$1,500.00") // 1500
 * parseCurrency("$10") // 10
 * parseCurrency("invalid") // null
 */
export function parseCurrency(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') {
    return null;
  }

  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Validates if a value represents valid currency
 * @param value - The value to validate
 * @returns True if valid currency amount
 */
export function isValidCurrency(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  const numValue = typeof value === 'string' ? parseFloat(value as string) : value;

  return typeof numValue === 'number' && !isNaN(numValue) && isFinite(numValue);
}

// Export formatters object for convenient imports (matches dateUtils pattern)
export const currencyFormatters = {
  format: formatCurrency,
  formatWithSign: formatCurrencyWithSign,
  formatCompact: formatCurrencyCompact,
  parse: parseCurrency,
  isValid: isValidCurrency,
};

// Default export for convenience
export default currencyFormatters;
