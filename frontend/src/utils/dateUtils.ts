import { format, isValid, parseISO, formatDistanceToNow } from 'date-fns'

/**
 * Type guard to check if a value can be converted to a valid date
 */
export const isValidDateValue = (value: unknown): boolean => {
  if (!value) return false
  
  if (typeof value === 'string') {
    const parsed = parseISO(value)
    return isValid(parsed)
  }
  
  if (value instanceof Date) {
    return isValid(value)
  }
  
  if (typeof value === 'number') {
    return isValid(new Date(value))
  }
  
  return false
}

/**
 * Safely parse a date value with validation
 */
export const safeParseDate = (value: unknown): Date | null => {
  if (!value) return null
  
  try {
    let date: Date
    
    if (typeof value === 'string') {
      // Try ISO string first
      date = parseISO(value)
      if (!isValid(date)) {
        // Fallback to Date constructor
        date = new Date(value)
      }
    } else if (value instanceof Date) {
      date = value
    } else if (typeof value === 'number') {
      date = new Date(value)
    } else {
      return null
    }
    
    // Check if date is valid and within reasonable bounds
    if (!isValid(date)) return null
    
    // Check for unreasonable dates (before 1970 or after 2100)
    const year = date.getFullYear()
    if (year < 1970 || year > 2100) return null
    
    return date
  } catch {
    return null
  }
}

/**
 * Safely format a date with fallback for invalid values
 */
export const safeFormatDate = (
  value: unknown,
  formatString: string,
  fallback: string = 'Invalid date'
): string => {
  const date = safeParseDate(value)
  
  if (!date) {
    return fallback
  }
  
  try {
    return format(date, formatString)
  } catch (error) {
    console.warn('Date formatting error:', error, 'Value:', value)
    return fallback
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (
  value: unknown,
  fallback: string = 'Unknown time'
): string => {
  const date = safeParseDate(value)
  
  if (!date) {
    return fallback
  }
  
  try {
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    console.warn('Relative time formatting error:', error, 'Value:', value)
    return fallback
  }
}

/**
 * Pre-configured date formatters for common use cases
 */
export const dateFormatters = {
  /**
   * Format for member since display (e.g., "January 2023")
   */
  memberSince: (value: unknown) => 
    safeFormatDate(value, 'MMMM yyyy', 'Unknown'),
  
  /**
   * Format for transaction/game history (e.g., "Jan 15, 2023 2:30 PM")
   */
  historyTimestamp: (value: unknown) => 
    safeFormatDate(value, 'MMM d, yyyy h:mm a', 'Date unavailable'),
  
  /**
   * Short date format (e.g., "01/15/23")
   */
  shortDate: (value: unknown) => 
    safeFormatDate(value, 'MM/dd/yy', 'N/A'),
  
  /**
   * Relative timestamp (e.g., "2 hours ago")
   */
  relativeTimestamp: (value: unknown) => 
    formatRelativeTime(value, 'Unknown'),
  
  /**
   * Time only (e.g., "2:30 PM")
   */
  timeOnly: (value: unknown) => 
    safeFormatDate(value, 'h:mm a', '--:--'),
  
  /**
   * ISO date for exports/APIs
   */
  isoDate: (value: unknown) => {
    const date = safeParseDate(value)
    return date ? date.toISOString() : ''
  }
}

/**
 * Check if a date is today
 */
export const isToday = (value: unknown): boolean => {
  const date = safeParseDate(value)
  if (!date) return false
  
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the past
 */
export const isPast = (value: unknown): boolean => {
  const date = safeParseDate(value)
  if (!date) return false
  
  return date < new Date()
}

/**
 * Check if a date is in the future
 */
export const isFuture = (value: unknown): boolean => {
  const date = safeParseDate(value)
  if (!date) return false
  
  return date > new Date()
}

