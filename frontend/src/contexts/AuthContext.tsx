import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User, LoginForm, RegisterForm } from '../types'
import { authAPI } from '@services/api'
import { socketService } from '@services/socket'
import { csrfManager } from '../utils/csrfManager'
import { logoutManager } from '../utils/logoutManager'
import toast from 'react-hot-toast'
import { AuthContext } from '../utils/authUtils'

// Hook moved to utils/authUtils.ts to fix fast refresh
export { useAuth } from '../utils/authUtils'

// Extended user type for rollback functionality
interface UserWithRollback extends User {
  _previousBalance?: number
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // SECURITY FIX (Week 4): Initialize auth from HttpOnly cookies
  // Token is no longer stored in localStorage for XSS protection
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get user profile - if cookie exists, this will succeed
        const profile = await authAPI.getProfile()
        setUser(profile)
        setToken('cookie-auth') // Placeholder to indicate authenticated state

        // SECURITY FIX (Week 4): Connect WebSocket with cookie-based authentication
        socketService.connect()

        // SECURITY FIX (Week 4): Initialize CSRF token for state-changing requests
        await csrfManager.initialize()
      } catch {
        // No valid session - clear user data
        localStorage.removeItem('user')
        csrfManager.clear()
      }

      setLoading(false)
    }

    initAuth()
  }, [])

  // Setup socket listeners for balance updates
  useEffect(() => {
    if (user && token) {
      const handleBalanceUpdate = (data: { userId: string, newBalance: number }) => {
        // Only update if this balance update is for the current user
        if (data.userId === user.id) {
          // Removed: console.log(`[AuthContext] Received authoritative balance update: ${data.newBalance}`)
          setUser(prev => prev ? { ...prev, balance: data.newBalance } : null)

          // Update localStorage to persist the new balance
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser)
              userData.balance = data.newBalance
              localStorage.setItem('user', JSON.stringify(userData))
            } catch {
              // Failed to update stored user balance
            }
          }
        }
      }

      socketService.onBalanceUpdated(handleBalanceUpdate)

      return () => {
        socketService.offBalanceUpdated(handleBalanceUpdate)
      }
    }
  }, [user, token])

  // SECURITY FIX (Week 4): Listen for session expiration events
  // When session expires, trigger the regular auth modal to open
  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent
      console.log('[AuthContext] Session expired:', customEvent.detail)

      // Clear auth state
      setUser(null)
      setToken(null)
      socketService.disconnect()
      csrfManager.clear()

      // Dispatch event to open login modal
      // The App component will listen for this and open AuthModal
      window.dispatchEvent(new CustomEvent('auth:open-login-modal', {
        detail: { reason: 'session-expired' }
      }))

      // Show friendly message
      toast.error('Your session has expired. Please sign in again.')
    }

    // Listen for session expiration from API interceptor
    window.addEventListener('auth:session-expired', handleSessionExpired)

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [])

  const login = async (credentials: LoginForm) => {
    try {
      // SECURITY FIX (Week 4): Token is now in HttpOnly cookie
      // Backend sets cookie automatically, no localStorage needed
      const { user } = await authAPI.login(credentials)

      // Ensure balance is a number
      const normalizedUser = {
        ...user,
        balance: typeof user.balance === 'number' ? user.balance : Number(user.balance) || 0
      }

      setUser(normalizedUser)
      setToken('cookie-auth') // Placeholder to indicate authenticated state

      // Keep user data in localStorage for UI convenience (non-sensitive)
      localStorage.setItem('user', JSON.stringify(normalizedUser))

      // SECURITY FIX (Week 4): Connect WebSocket with cookie-based authentication
      socketService.connect()

      // SECURITY FIX (Week 4): Initialize CSRF token for state-changing requests
      await csrfManager.initialize()

      toast.success('Welcome back!')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  }

  const register = async (userData: RegisterForm) => {
    try {
      // SECURITY FIX (Week 4): Token is now in HttpOnly cookie
      // Backend sets cookie automatically, no localStorage needed
      const { user } = await authAPI.register(userData)

      // Ensure balance is a number
      const normalizedUser = {
        ...user,
        balance: typeof user.balance === 'number' ? user.balance : Number(user.balance) || 0
      }

      setUser(normalizedUser)
      setToken('cookie-auth') // Placeholder to indicate authenticated state

      // Keep user data in localStorage for UI convenience (non-sensitive)
      localStorage.setItem('user', JSON.stringify(normalizedUser))

      // SECURITY FIX (Week 4): Connect WebSocket with cookie-based authentication
      socketService.connect()

      // SECURITY FIX (Week 4): Initialize CSRF token for state-changing requests
      await csrfManager.initialize()

      toast.success('Account created successfully!')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Registration failed';
      toast.error(errorMessage);
      throw error;
    }
  }

  const logout = () => {
    // SECURITY FIX (Week 4): Mark this as manual/intentional logout
    // This prevents the SessionExpiredModal from appearing
    logoutManager.markAsManualLogout()

    // Call logout API
    authAPI.logout()

    // Clear auth state
    setUser(null)
    setToken(null)
    socketService.disconnect()

    // SECURITY FIX (Week 4): Clear CSRF token on logout
    csrfManager.clear()

    // Safety: Clear the manual logout flag after a short delay
    // In case the API call fails or there's no 401 response
    setTimeout(() => {
      logoutManager.clear()
    }, 3000) // 3 seconds should be enough for logout API to complete

    toast.success('Logged out successfully')
  }

  const updateBalance = (newBalance: number, source: 'optimistic' | 'socket' | 'manual' = 'manual') => {
    // Validate balance is a valid number
    if (typeof newBalance !== 'number' || isNaN(newBalance) || newBalance < 0) {
      // Removed: console.error(`[AuthContext] Invalid balance update attempted: ${newBalance}`)
      return
    }
    
    // Removed: console.log(`[AuthContext] Updating balance to ${newBalance} (source: ${source})`)
    setUser(prev => {
      if (!prev) return null
      
      // For optimistic updates, store the previous balance for potential rollback
      const updatedUser = { 
        ...prev, 
        balance: newBalance,
        ...(source === 'optimistic' && { _previousBalance: prev.balance })
      }
      
      // Update localStorage to persist balance change
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          userData.balance = newBalance
          localStorage.setItem('user', JSON.stringify(userData))
        } catch {
          // Failed to update stored balance
        }
      }
      
      return updatedUser
    })
  }

  const rollbackBalance = () => {
    setUser(prev => {
      if (!prev || !('_previousBalance' in prev)) {
        return prev
      }

      const userWithRollback = prev as UserWithRollback
      const previousBalance = userWithRollback._previousBalance

      if (previousBalance === undefined) {
        return prev
      }

      // Remove the rollback data and restore previous balance
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _previousBalance: _, ...userWithoutRollback } = userWithRollback
      return {
        ...userWithoutRollback,
        balance: previousBalance
      }
    })
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateBalance,
      rollbackBalance,
    }}>
      {children}
    </AuthContext.Provider>
  )
}