import { useState, useEffect, useRef } from 'react'
import type { ToastNotification } from '../../../types'
import { useNotifications } from '../../../contexts/NotificationContext'
import './NotificationToast.css'

interface NotificationToastProps {
  notification: ToastNotification
  onClose?: () => void
}

export function NotificationToast({ notification, onClose }: NotificationToastProps): React.ReactElement {
  const { hideToast, markAsRead } = useNotifications()
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Progress bar animation
  useEffect(() => {
    if (!notification.autoClose || !notification.showProgress) return

    const duration = notification.duration || 5000
    const interval = 50 // Update every 50ms
    const decrement = (interval / duration) * 100

    const updateProgress = () => {
      setProgress(prev => {
        const newProgress = prev - decrement
        if (newProgress <= 0) {
          handleClose()
          return 0
        }
        return newProgress
      })
    }

    if (!isPaused) {
      progressIntervalRef.current = setInterval(updateProgress, interval)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [notification.autoClose, notification.showProgress, notification.duration, isPaused])

  // Auto-close timer
  useEffect(() => {
    if (!notification.autoClose) return

    const duration = notification.duration || 5000

    if (!isPaused) {
      timeoutRef.current = setTimeout(handleClose, duration)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [notification.autoClose, notification.duration, isPaused])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      hideToast(notification.id)
      onClose?.()
    }, 300) // Match CSS animation duration
  }

  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // Navigate to relevant page if applicable
    if (notification.roomId) {
      window.location.href = `/room/${notification.roomId}`
    }
  }

  const handleMouseEnter = () => {
    if (notification.pauseOnHover) {
      setIsPaused(true)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }

  const handleMouseLeave = () => {
    if (notification.pauseOnHover) {
      setIsPaused(false)
    }
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return notification.isJackpot ? '🎰' : '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'jackpot':
        return '💰'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  const getTypeClass = () => {
    if (notification.isJackpot) return 'notification-toast--jackpot'
    return `notification-toast--${notification.type}`
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return ''
    return `$${(amount / 100).toFixed(2)}`
  }

  const formatPosition = () => {
    if (!notification.position || !notification.totalPlayers) return ''
    return `Position ${notification.position}/${notification.totalPlayers}`
  }

  return (
    <div
      className={`notification-toast ${getTypeClass()} ${isVisible ? 'notification-toast--visible' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {notification.showProgress && notification.autoClose && (
        <div
          className="notification-toast__progress"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}

      <div className="notification-toast__icon" aria-hidden="true">
        {getIcon()}
      </div>

      <div className="notification-toast__content">
        <div className="notification-toast__title">
          {notification.title}
          {notification.amount && notification.amount > 0 && (
            <span className="notification-toast__amount">
              {formatAmount(notification.amount)}
            </span>
          )}
        </div>

        <div className="notification-toast__message">
          {notification.message}
        </div>

        {(notification.position || notification.multiplier) && (
          <div className="notification-toast__meta">
            {notification.position && (
              <span className="notification-toast__position">
                {formatPosition()}
              </span>
            )}
            {notification.multiplier && (
              <span className="notification-toast__multiplier">
                {notification.multiplier}x
              </span>
            )}
          </div>
        )}
      </div>

      <button
        className="notification-toast__close"
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        aria-label="Close notification"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 4.586L10.293.293l1.414 1.414L7.414 6l4.293 4.293-1.414 1.414L6 7.414l-4.293 4.293-1.414-1.414L4.586 6 .293 1.707 1.707.293 6 4.586z"/>
        </svg>
      </button>

      {!notification.isRead && (
        <div className="notification-toast__unread-indicator" aria-hidden="true" />
      )}
    </div>
  )
}

export default NotificationToast