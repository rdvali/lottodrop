import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'

const router = Router()

// Store read notification IDs in memory (in production, this would be in database)
const readNotificationIds = new Set<string>()

// Get notifications for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Return empty notifications array - real notifications will be created from actual game events
    // In production, this would fetch from database
    const notifications: any[] = []

    // Filter for only game_result notifications if needed
    const { subtype } = req.query
    const filteredNotifications = subtype === 'game_result'
      ? notifications.filter(n => n.subtype === 'game_result')
      : notifications

    const unreadCount = filteredNotifications.filter(n => !n.isRead).length

    res.json({
      success: true,
      data: {
        notifications: filteredNotifications,
        total: filteredNotifications.length,
        unreadCount,
        hasMore: false
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    })
  }
})

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    // Return default preferences
    res.json({
      success: true,
      data: [{
        userId: req.user?.userId,
        categoryName: 'Game Results',
        isEnabled: true,
        soundEnabled: true,
        desktopEnabled: true,
        emailEnabled: false
      }]
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences'
    })
  }
})

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Add the notification ID to the read set
    readNotificationIds.add(id)

    // In production, this would update the database
    res.json({
      success: true,
      message: 'Notification marked as read',
      notificationId: id
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    })
  }
})

// Mark all notifications as read
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    // In production, this would mark all notifications as read in database

    // In production, this would update all notifications in database
    res.json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    })
  }
})

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // In production, this would delete from database
    res.json({
      success: true,
      message: 'Notification deleted'
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    })
  }
})

// Update notification preferences
router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = req.body

    // In production, this would update preferences in database
    res.json({
      success: true,
      data: {
        ...preferences,
        userId: req.user?.userId
      }
    })
  } catch (error) {
    console.error('Error updating preferences:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    })
  }
})

// Send test notification
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // In production, this would trigger a test notification
    res.json({
      success: true,
      message: 'Test notification sent'
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    })
  }
})

export default router