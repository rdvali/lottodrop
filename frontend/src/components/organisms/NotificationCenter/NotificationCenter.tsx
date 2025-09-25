import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../../../contexts/NotificationContext'
import { NotificationItem } from '../../molecules/NotificationItem/NotificationItem'
import { RoundResultModal } from '../../molecules/RoundResultModal/RoundResultModal'
import type { Notification } from '../../../types'
import './NotificationCenter.css'

export function NotificationCenter(): React.ReactElement {
  const {
    state,
    toggleNotificationCenter,
    loadMoreNotifications,
    markAllAsRead,
    markAsRead,
    clearAllNotifications
  } = useNotifications()

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Close notification center when clicking outside
  useEffect(() => {
    if (!state.isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const notificationCenter = document.querySelector('.notification-center')
      const notificationButton = document.querySelector('[data-notification-button]')

      if (
        notificationCenter &&
        !notificationCenter.contains(target) &&
        !notificationButton?.contains(target)
      ) {
        toggleNotificationCenter(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        toggleNotificationCenter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [state.isOpen, toggleNotificationCenter])

  // Handle infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 100 // Load more when 100px from bottom

      if (scrollHeight - scrollTop - clientHeight < threshold && state.hasMore && !state.isLoading) {
        loadMoreNotifications()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [state.hasMore, state.isLoading, loadMoreNotifications])

  // Only show game result notifications
  const gameResultNotifications = state.notifications.filter(
    notification => notification.subtype === 'game_result'
  )

  const handleNotificationClick = async (notification: Notification) => {
    try {
      console.log('💆 [NotificationCenter] Notification clicked:', {
        id: notification.id,
        type: notification.type,
        subtype: notification.subtype,
        isRead: notification.isRead,
        hasData: !!notification.data,
        data: notification.data
      })

      // Mark as read if not already read
      if (!notification.isRead) {
        await markAsRead(notification.id)
      }

      setSelectedNotification(notification)
      setIsModalOpen(true)
    } catch (error) {
      console.error('❌ [NotificationCenter] Error handling notification click:', error)
      // Still show modal even if mark as read fails
      setSelectedNotification(notification)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedNotification(null)
  }

  return (
    <>
      <div
        className={`notification-center ${state.isOpen ? 'notification-center--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
        aria-describedby="notification-center-description"
      >
        {/* Header */}
      <div className="notification-center__header">
        <div className="notification-center__title-section">
          <h2 id="notification-center-title" className="notification-center__title">
            Round Results
          </h2>
          <span className="notification-center__count">
            {state.unreadCount > 0 && (
              <span className="notification-center__unread-count">
                {state.unreadCount > 99 ? '99+' : state.unreadCount} unread
              </span>
            )}
          </span>
        </div>

        <div className="notification-center__header-actions">
          {state.unreadCount > 0 && (
            <button
              type="button"
              className="notification-center__mark-all-read"
              onClick={markAllAsRead}
              aria-label="Mark all as read"
            >
              Mark all read
            </button>
          )}

          {/* Debug clear all button (development only) */}
          {process.env.NODE_ENV === 'development' && gameResultNotifications.length > 0 && (
            <button
              type="button"
              className="notification-center__mark-all-read"
              onClick={clearAllNotifications}
              aria-label="Clear all notifications (dev)"
              style={{ marginRight: '8px', background: '#dc2626' }}
            >
              Clear All (Dev)
            </button>
          )}

          <button
            type="button"
            className="notification-center__close"
            onClick={() => toggleNotificationCenter(false)}
            aria-label="Close round results"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 8.586L15.293 3.293l1.414 1.414L11.414 10l5.293 5.293-1.414 1.414L10 11.414l-5.293 5.293-1.414-1.414L8.586 10 3.293 4.707l1.414-1.414L10 8.586z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="notification-center__content">
        <div
          id="notification-center-description"
          className="sr-only"
        >
          Your round results history
        </div>

        {state.isLoading && gameResultNotifications.length === 0 ? (
          <div className="notification-center__loading">
            <div className="notification-center__loading-spinner" aria-hidden="true" />
            <span>Loading round results...</span>
          </div>
        ) : gameResultNotifications.length === 0 ? (
          <div className="notification-center__empty">
            <div className="notification-center__empty-icon" aria-hidden="true">
              🎲
            </div>
            <h3 className="notification-center__empty-title">
              No round results yet
            </h3>
            <p className="notification-center__empty-message">
              Your game results will appear here after each round completes.
            </p>
          </div>
        ) : (
          <div
            className="notification-center__list"
            ref={scrollContainerRef}
            role="log"
            aria-live="polite"
            aria-label="Round results list"
          >
            {gameResultNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}

            {state.isLoading && (
              <div className="notification-center__loading-more">
                <div className="notification-center__loading-spinner" aria-hidden="true" />
                <span>Loading more...</span>
              </div>
            )}

            {!state.hasMore && gameResultNotifications.length > 0 && (
              <div className="notification-center__end-message">
                You've reached the end of your round results
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Round Result Modal */}
      <RoundResultModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}

export default NotificationCenter