import type {
  Notification,
  NotificationPreferences,
  NotificationFilter,
  ApiResponse
} from '../../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

class NotificationService {
  private baseUrl = `${API_BASE_URL}/notifications`

  // Get user's notifications with filtering and pagination
  async getNotifications(filter: NotificationFilter = {}): Promise<ApiResponse<{
    notifications: Notification[]
    total: number
    unreadCount: number
    hasMore: boolean
  }>> {
    const params = new URLSearchParams()

    if (filter.type) params.append('type', filter.type)
    if (filter.subtype) params.append('subtype', filter.subtype)
    if (filter.priority) params.append('priority', filter.priority.toString())
    if (filter.isRead !== undefined) params.append('isRead', filter.isRead.toString())
    if (filter.startDate) params.append('startDate', filter.startDate)
    if (filter.endDate) params.append('endDate', filter.endDate)
    if (filter.limit) params.append('limit', filter.limit.toString())
    if (filter.offset) params.append('offset', filter.offset.toString())

    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      throw error
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<ApiResponse<void>> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      throw error
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to delete notification:', error)
      throw error
    }
  }

  // Get user notification preferences
  async getPreferences(): Promise<ApiResponse<NotificationPreferences[]>> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
      throw error
    }
  }

  // Update notification preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
      throw error
    }
  }

  // Request desktop notification permission
  async requestDesktopPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Desktop notifications not supported')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    // Request permission
    const permission = await Notification.requestPermission()
    return permission
  }

  // Show desktop notification
  async showDesktopNotification(notification: Notification): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon-32x32.png',
      tag: notification.id,
      requireInteraction: notification.priority <= 2, // High/Critical priority
      silent: false,
    }

    // Add action buttons for game results (if supported)
    try {
      if (notification.subtype === 'game_result' && notification.amount && 'actions' in Notification.prototype) {
        (options as any).actions = [
          {
            action: 'view-game',
            title: 'View Game',
          }
        ]
      }
    } catch (e) {
      // Actions not supported in this browser
    }

    const desktopNotification = new Notification(notification.title, options)

    // Auto-close after 5 seconds for non-critical notifications
    if (notification.priority > 2) {
      setTimeout(() => {
        desktopNotification.close()
      }, 5000)
    }

    // Handle notification clicks
    desktopNotification.onclick = () => {
      window.focus()
      desktopNotification.close()

      // Navigate to relevant page if needed
      if (notification.roomId) {
        window.location.href = `/room/${notification.roomId}`
      }
    }
  }

  // Test notification (for user preferences)
  async sendTestNotification(): Promise<ApiResponse<void>> {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Authentication token not found')
    }

    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to send test notification:', error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService