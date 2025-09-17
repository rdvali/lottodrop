import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User, LoginForm, RegisterForm } from '../types'
import { authAPI } from '@services/api'
import { socketService } from '@services/socket'
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

  // Initialize auth from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      
      if (storedToken) {
        try {
          const profile = await authAPI.getProfile()
          setUser(profile)
          setToken(storedToken)
          socketService.connect(storedToken)
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
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

  const login = async (credentials: LoginForm) => {
    try {
      const { user, token } = await authAPI.login(credentials)
      
      // Ensure balance is a number
      const normalizedUser = {
        ...user,
        balance: typeof user.balance === 'number' ? user.balance : Number(user.balance) || 0
      }
      
      setUser(normalizedUser)
      setToken(token)
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      
      socketService.connect(token)
      
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
      const { user, token } = await authAPI.register(userData)
      
      // Ensure balance is a number
      const normalizedUser = {
        ...user,
        balance: typeof user.balance === 'number' ? user.balance : Number(user.balance) || 0
      }
      
      setUser(normalizedUser)
      setToken(token)
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      
      socketService.connect(token)
      
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
    authAPI.logout()
    setUser(null)
    setToken(null)
    socketService.disconnect()
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