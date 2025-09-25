import React from 'react'
import { useNotifications } from '../../../contexts/NotificationContext'
import './NotificationBell.css'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className = '' }: NotificationBellProps): React.ReactElement {
  const { state, toggleNotificationCenter } = useNotifications()

  const handleClick = () => {
    toggleNotificationCenter()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  const getUnreadCountDisplay = () => {
    if (state.unreadCount === 0) return null
    if (state.unreadCount > 99) return '99+'
    return state.unreadCount.toString()
  }

  return (
    <button
      type="button"
      className={`notification-bell ${className} ${state.isOpen ? 'notification-bell--active' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Notifications${state.unreadCount > 0 ? ` (${state.unreadCount} unread)` : ''}`}
      aria-expanded={state.isOpen}
      aria-haspopup="dialog"
      data-notification-button
    >
      <div className="notification-bell__icon-wrapper">
        <svg
          className="notification-bell__icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.91 32.91 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0016 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z"
            clipRule="evenodd"
          />
        </svg>

        {state.unreadCount > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {getUnreadCountDisplay()}
          </span>
        )}

        {state.unreadCount > 0 && (
          <span className="notification-bell__pulse" aria-hidden="true" />
        )}
      </div>

      {/* Screen reader announcement for unread count */}
      <span className="sr-only">
        {state.unreadCount > 0 && `${state.unreadCount} unread notifications`}
      </span>
    </button>
  )
}

export default NotificationBell