import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@contexts/AuthContext'
import clsx from 'clsx'

interface BalanceDisplayProps {
  className?: string
  showChange?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const BalanceDisplay = ({ 
  className, 
  showChange = true, 
  size = 'md' 
}: BalanceDisplayProps) => {
  const { user } = useAuth()
  const [previousBalance, setPreviousBalance] = useState<number | null>(null)
  const [balanceChange, setBalanceChange] = useState<number>(0)
  const [showChangeAnimation, setShowChangeAnimation] = useState(false)

  useEffect(() => {
    if (user?.balance !== undefined) {
      if (previousBalance !== null && previousBalance !== user.balance) {
        const change = user.balance - previousBalance
        setBalanceChange(change)
        setShowChangeAnimation(true)
        
        // Hide change animation after 3 seconds
        const timer = setTimeout(() => {
          setShowChangeAnimation(false)
        }, 3000)
        
        return () => clearTimeout(timer)
      }
      setPreviousBalance(user.balance)
    }
  }, [user?.balance, previousBalance])

  if (!user) {
    return null
  }

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const changeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* Main Balance */}
      <motion.div
        key={user.balance} // Key change triggers animation
        initial={{ scale: 1 }}
        animate={{ 
          scale: [1, 1.05, 1],
          color: balanceChange > 0 ? '#10B981' : balanceChange < 0 ? '#F59E0B' : undefined
        }}
        transition={{ 
          duration: 0.3,
          color: { duration: 0.5 }
        }}
        className={clsx(
          'font-bold text-text-primary transition-colors',
          sizeClasses[size]
        )}
      >
        ${user.balance.toLocaleString()}
      </motion.div>

      {/* Balance Change Indicator */}
      <AnimatePresence>
        {showChange && showChangeAnimation && balanceChange !== 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 25
            }}
            className={clsx(
              'font-semibold px-2 py-1 rounded-full border',
              changeClasses[size],
              balanceChange > 0 
                ? 'text-success bg-success/10 border-success/20' 
                : 'text-warning bg-warning/10 border-warning/20'
            )}
          >
            {balanceChange > 0 ? '+' : ''}${Math.abs(balanceChange).toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimistic Update Indicator */}
      {user && '_previousBalance' in user && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-2 h-2 bg-primary rounded-full"
          title="Balance updating..."
        />
      )}
    </div>
  )
}

export default BalanceDisplay