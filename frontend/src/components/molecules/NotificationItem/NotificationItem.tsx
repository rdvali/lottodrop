import React, { useState } from 'react'
import type { Notification } from '../../../types'
import { useNotifications } from '../../../contexts/NotificationContext'
import './NotificationItem.css'

interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps): React.ReactElement {
  const { markAsRead, deleteNotification } = useNotifications()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // Call the onClick prop if provided
    if (onClick) {
      onClick(notification)
    } else if (notification.roomId) {
      // Navigate to relevant page if applicable and no onClick provided
      window.location.href = `/room/${notification.roomId}`
    }
  }

  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation()
    setIsDeleting(true)

    try {
      await deleteNotification(notification.id)
    } catch (error) {
      setIsDeleting(false)
      console.error('Failed to delete notification:', error)
    }
  }

  const handleMarkAsRead = async (event: React.MouseEvent) => {
    event.stopPropagation()
    await markAsRead(notification.id)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        if (notification.isJackpot) return '🏆'
        if (notification.amount && notification.amount >= 10000) return '💎' // $100+ wins
        if (notification.amount && notification.amount >= 5000) return '👑' // $50+ wins
        if (notification.amount && notification.amount >= 1000) return '💰' // $10+ wins
        return '🎉' // Any win
      case 'error':
        return '💸' // Money lost
      case 'warning':
        return '⚠️'
      case 'jackpot':
        return '🎰'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  const getTypeClass = () => {
    if (notification.isJackpot) return 'notification-item--jackpot'
    return `notification-item--${notification.type}`
  }

  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null || amount <= 0) return ''
    return `$${(amount / 100).toFixed(2)}`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  const getPriorityLabel = () => {
    // For winning notifications, show WIN instead of Critical
    if (notification.type === 'success' && notification.priority === 1) {
      return 'WIN'
    }

    switch (notification.priority) {
      case 1: return 'WIN'
      case 2: return 'High'
      case 3: return 'Medium'
      case 4: return 'Low'
      default: return ''
    }
  }

  const getSubtypeLabel = () => {
    switch (notification.subtype) {
      case 'game_result':
        if (notification.type === 'success') return 'GAME RESULT'
        if (notification.type === 'error') return 'GAME RESULT'
        return 'GAME RESULT'
      case 'balance_update': return 'Balance'
      case 'global_win': return 'Big Win'
      case 'round_start': return 'New Round'
      case 'system_alert': return 'Alert'
      case 'bonus': return 'Bonus'
      case 'achievement': return 'Achievement'
      default: return notification.subtype
    }
  }

  const getEnhancedMessage = () => {
    // If it's a game result, provide more context
    if (notification.subtype === 'game_result' && notification.roomId) {
      if (notification.type === 'success') {
        const baseMessage = notification.amount
          ? `You won ${formatAmount(notification.amount)} in this lottery round!`
          : 'Congratulations! You won this round!'

        if (notification.position === 1) {
          return '🏆 ' + baseMessage + ' You finished in 1st place!'
        } else if (notification.position && notification.position <= 3) {
          return '🏅 ' + baseMessage + ` You finished in ${notification.position}${getOrdinalSuffix(notification.position)} place!`
        }
        return baseMessage
      } else if (notification.type === 'error') {
        return 'Better luck next time! The round has finished.'
      }
    }

    return notification.message
  }

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  if (isDeleting) {
    return (
      <div className="notification-item notification-item--deleting">
        <div className="notification-item__deleting-spinner" />
        <span>Deleting...</span>
      </div>
    )
  }

  return (
    <div
      className={`notification-item ${getTypeClass()} ${!notification.isRead ? 'notification-item--unread' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${notification.title}. ${notification.message}. ${formatTimestamp(notification.timestamp)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="notification-item__icon">
        {getIcon()}
      </div>

      <div className="notification-item__content">
        <div className="notification-item__header">
          <div className="notification-item__title">
            {notification.title}
            {notification.amount !== undefined && notification.amount > 0 && (
              <span className="notification-item__amount">
                {formatAmount(notification.amount)}
              </span>
            )}
          </div>
          <div className="notification-item__meta">
            <span className="notification-item__timestamp">
              {formatTimestamp(notification.timestamp)}
            </span>
            {(notification.priority <= 2 || notification.type === 'error') && (
              <span className={`notification-item__priority notification-item__priority--${
                notification.type === 'success' || notification.priority === 1 ? 'win' :
                notification.type === 'error' ? 'lost' :
                'high'
              }`}>
                {notification.type === 'error' && notification.subtype === 'game_result' ? 'LOST' : getPriorityLabel()}
              </span>
            )}
          </div>
        </div>

        <div className="notification-item__message">
          {getEnhancedMessage()}
        </div>

        <div className="notification-item__details">
          <span className="notification-item__subtype">
            {getSubtypeLabel()}
          </span>

          {/* Only show position for wins */}
          {notification.type === 'success' && notification.position && notification.totalPlayers && (
            <span className="notification-item__position">
              #{notification.position} of {notification.totalPlayers}
            </span>
          )}

          {notification.multiplier && notification.multiplier > 1 && (
            <span className="notification-item__multiplier">
              {notification.multiplier}x
            </span>
          )}
        </div>
      </div>

      <div className="notification-item__actions">
        {!notification.isRead && (
          <button
            type="button"
            className="notification-item__mark-read"
            onClick={handleMarkAsRead}
            aria-label="Mark as read"
            title="Mark as read"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
        )}

        <button
          type="button"
          className="notification-item__delete"
          onClick={handleDelete}
          aria-label="Delete notification"
          title="Delete notification"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>

      {!notification.isRead && (
        <div className="notification-item__unread-indicator" aria-hidden="true" />
      )}
    </div>
  )
}

export default NotificationItem