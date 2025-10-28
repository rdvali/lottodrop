import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface BalanceVisibilityContextType {
  isVisible: boolean
  toggleVisibility: () => void
}

const BalanceVisibilityContext = createContext<BalanceVisibilityContextType | undefined>(undefined)

interface BalanceVisibilityProviderProps {
  children: ReactNode
}

export const BalanceVisibilityProvider: React.FC<BalanceVisibilityProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const stored = localStorage.getItem('lottodrop_balance_visibility')
      return stored !== '0' // Default true if not set
    } catch {
      return true // Fallback if localStorage unavailable (private browsing)
    }
  })

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => {
      const newValue = !prev
      try {
        localStorage.setItem('lottodrop_balance_visibility', newValue ? '1' : '0')
      } catch {
        // Silently fail if localStorage is unavailable
      }
      return newValue
    })
  }, [])

  return (
    <BalanceVisibilityContext.Provider value={{ isVisible, toggleVisibility }}>
      {children}
    </BalanceVisibilityContext.Provider>
  )
}

export const useBalanceVisibility = () => {
  const context = useContext(BalanceVisibilityContext)
  if (context === undefined) {
    throw new Error('useBalanceVisibility must be used within a BalanceVisibilityProvider')
  }
  return context
}
