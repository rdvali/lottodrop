/**
 * Logout Manager - Week 4 Security Enhancement
 *
 * Manages the logout state to differentiate between:
 * - Manual logout (user clicks logout button)
 * - Automatic logout (session expired/invalid token)
 *
 * This prevents the SessionExpiredModal from showing during intentional logout.
 */

class LogoutManager {
  private isManualLogout = false

  /**
   * Mark the next logout as intentional/manual
   * Call this BEFORE initiating logout API call
   */
  markAsManualLogout(): void {
    this.isManualLogout = true
    console.log('[LogoutManager] Marked as manual logout')
  }

  /**
   * Check if current logout is manual/intentional
   */
  isManual(): boolean {
    return this.isManualLogout
  }

  /**
   * Clear the manual logout flag
   * Call this after logout completes
   */
  clear(): void {
    this.isManualLogout = false
    console.log('[LogoutManager] Cleared manual logout flag')
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.isManualLogout = false
  }
}

// Export singleton instance
export const logoutManager = new LogoutManager()
