import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import type {
  Notification,
  ToastNotification,
  NotificationCenterState,
  NotificationFilter,
  NotificationPreferences
} from '../types'
import { socketService } from '../services/socket/socket.service'
import { notificationService } from '../services/notification/notification.service'

// LocalStorage utilities for notification persistence
const STORAGE_KEY = 'lottodrop_notifications'
const STORAGE_VERSION = '1.0.0'

interface StoredNotificationData {
  version: string
  notifications: Notification[]
  timestamp: number
}

class NotificationStorage {
  static save(notifications: Notification[]): void {
    try {
      const data: StoredNotificationData = {
        version: STORAGE_VERSION,
        notifications,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('[NotificationStorage] Failed to save to localStorage:', error)
    }
  }

  static load(): Notification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const data: StoredNotificationData = JSON.parse(stored)

      // Check version compatibility
      if (data.version !== STORAGE_VERSION) {
        console.log('[NotificationStorage] Version mismatch, clearing stored notifications')
        this.clear()
        return []
      }

      // Validate data structure
      if (!Array.isArray(data.notifications)) {
        console.warn('[NotificationStorage] Invalid data structure, clearing')
        this.clear()
        return []
      }

      // Filter out invalid notifications
      const validNotifications = data.notifications.filter(notification => {
        return notification.id && notification.userId && notification.type && notification.subtype
      })

      return validNotifications
    } catch (error) {
      console.warn('[NotificationStorage] Failed to load from localStorage:', error)
      return []
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('[NotificationStorage] Failed to clear localStorage:', error)
    }
  }

  static mergeWithBackend(stored: Notification[], backend: Notification[]): Notification[] {
    // Create a map of backend notifications for O(1) lookup
    const backendMap = new Map(backend.map(n => [n.id, n]))

    // Start with backend notifications (most up-to-date)
    const merged = [...backend]

    // Add stored notifications that aren't in backend
    for (const storedNotification of stored) {
      if (!backendMap.has(storedNotification.id)) {
        merged.push(storedNotification)
      }
    }

    // Sort by timestamp (newest first)
    return merged.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }
}

// Notification state
interface NotificationState extends NotificationCenterState {
  toasts: ToastNotification[]
  preferences: NotificationPreferences[]
  isPlayingSound: boolean
  permissionStatus: NotificationPermission
}

// Notification actions
type NotificationAction =
  | { type: 'ADD_TOAST'; payload: ToastNotification }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_TOAST'; payload: { id: string; updates: Partial<ToastNotification> } }
  | { type: 'CLEAR_ALL_TOASTS' }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_FILTER'; payload: NotificationFilter }
  | { type: 'TOGGLE_CENTER'; payload?: boolean }
  | { type: 'SET_PREFERENCES'; payload: NotificationPreferences[] }
  | { type: 'UPDATE_PREFERENCE'; payload: NotificationPreferences }
  | { type: 'SET_PERMISSION_STATUS'; payload: NotificationPermission }
  | { type: 'SET_PLAYING_SOUND'; payload: boolean }

// Initial state
const initialState: NotificationState = {
  isOpen: false,
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  filter: {},
  toasts: [],
  preferences: [],
  isPlayingSound: false,
  permissionStatus: 'default'
}

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts.slice(-4), action.payload] // Keep max 5 toasts
      }

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map(toast =>
          toast.id === action.payload.id
            ? { ...toast, ...action.payload.updates }
            : toast
        )
      }

    case 'CLEAR_ALL_TOASTS':
      return {
        ...state,
        toasts: []
      }

    case 'CLEAR_ALL_NOTIFICATIONS':
      // Clear localStorage when all notifications are cleared
      NotificationStorage.clear()
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      }

    case 'SET_NOTIFICATIONS':
      // Save to localStorage when notifications are set
      NotificationStorage.save(action.payload)
      return {
        ...state,
        notifications: action.payload
      }

    case 'ADD_NOTIFICATION':
      const newNotifications = [action.payload, ...state.notifications]
      // Save to localStorage when notification is added
      NotificationStorage.save(newNotifications)
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: action.payload.isRead ? state.unreadCount : state.unreadCount + 1
      }

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id ? action.payload : notification
        )
      }

    case 'MARK_AS_READ':
      const updatedNotificationsRead = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, isRead: true, readAt: new Date().toISOString() }
          : notification
      )
      // Save to localStorage when notification is marked as read
      NotificationStorage.save(updatedNotificationsRead)
      return {
        ...state,
        notifications: updatedNotificationsRead,
        unreadCount: Math.max(0, state.unreadCount - 1)
      }

    case 'MARK_ALL_AS_READ':
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        isRead: true,
        readAt: new Date().toISOString()
      }))
      // Save to localStorage when all notifications are marked as read
      NotificationStorage.save(allReadNotifications)
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0
      }

    case 'DELETE_NOTIFICATION':
      const deletedNotification = state.notifications.find(n => n.id === action.payload)
      const filteredNotifications = state.notifications.filter(notification => notification.id !== action.payload)
      // Save to localStorage when notification is deleted
      NotificationStorage.save(filteredNotifications)
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: deletedNotification && !deletedNotification.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount
      }

    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: action.payload
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }

    case 'SET_HAS_MORE':
      return {
        ...state,
        hasMore: action.payload
      }

    case 'SET_FILTER':
      return {
        ...state,
        filter: action.payload
      }

    case 'TOGGLE_CENTER':
      return {
        ...state,
        isOpen: action.payload !== undefined ? action.payload : !state.isOpen
      }

    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: action.payload
      }

    case 'UPDATE_PREFERENCE':
      return {
        ...state,
        preferences: state.preferences.map(pref =>
          pref.categoryName === action.payload.categoryName ? action.payload : pref
        )
      }

    case 'SET_PERMISSION_STATUS':
      return {
        ...state,
        permissionStatus: action.payload
      }

    case 'SET_PLAYING_SOUND':
      return {
        ...state,
        isPlayingSound: action.payload
      }

    default:
      return state
  }
}

// Context
interface NotificationContextType {
  state: NotificationState
  addNotification: (notification: Notification) => void
  showToast: (notification: Omit<ToastNotification, 'id' | 'timestamp' | 'userId'>) => void
  hideToast: (id: string) => void
  clearAllToasts: () => void
  clearAllNotifications: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  loadNotifications: (filter?: NotificationFilter) => Promise<void>
  loadMoreNotifications: () => Promise<void>
  toggleNotificationCenter: (open?: boolean) => void
  updateFilter: (filter: NotificationFilter) => void
  loadPreferences: () => Promise<void>
  updatePreference: (preference: Partial<NotificationPreferences>) => Promise<void>
  requestDesktopPermission: () => Promise<NotificationPermission>
  testNotification: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Sound manager
class SoundManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()

  async init(): Promise<void> {
    if (this.audioContext) return

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Preload sounds
    await this.loadSound('win', '/sounds/win.mp3')
    await this.loadSound('jackpot', '/sounds/jackpot.mp3')
    await this.loadSound('notification', '/sounds/notification.mp3')
  }

  private async loadSound(name: string, url: string): Promise<void> {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
      this.sounds.set(name, audioBuffer)
    } catch (error) {
      console.warn(`Failed to load sound ${name}:`, error)
    }
  }

  async playSound(name: string, volume = 0.5): Promise<void> {
    if (!this.audioContext || !this.sounds.has(name)) return

    const audioBuffer = this.sounds.get(name)!
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()

    source.buffer = audioBuffer
    gainNode.gain.value = volume

    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    source.start()
  }
}

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(notificationReducer, initialState)
  const soundManager = useRef<SoundManager | null>(null)
  const isInitialized = useRef(false)

  // Initialize sound manager
  useEffect(() => {
    soundManager.current = new SoundManager()
    soundManager.current.init().catch(console.warn)
  }, [])

  // Initialize notification system
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Check desktop notification permission
    if ('Notification' in window) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: Notification.permission })
    }

    console.log('🚀 [NotificationContext] Initializing notification system...')

    // Load stored notifications from localStorage immediately
    const storedNotifications = NotificationStorage.load()
    if (storedNotifications.length > 0) {
      console.log('📱 [NotificationContext] Loaded from localStorage:', {
        count: storedNotifications.length,
        unread: storedNotifications.filter(n => !n.isRead).length
      })
      dispatch({ type: 'SET_NOTIFICATIONS', payload: storedNotifications })
      dispatch({ type: 'SET_UNREAD_COUNT', payload: storedNotifications.filter(n => !n.isRead).length })
    }

    // Load initial notifications and preferences with game_result filter
    loadNotifications({ subtype: 'game_result' }) // This will merge with localStorage
    loadPreferences()

    // Setup socket listeners
    const handleNewNotification = (notification: Notification) => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })

      // Show toast for high priority notifications
      if (notification.priority <= 2) {
        showToast({
          ...notification,
          autoClose: true,
          duration: notification.priority === 1 ? 10000 : 6000,
          showProgress: true,
          pauseOnHover: true
        })
      }

      // Play sound if enabled
      playNotificationSound(notification)

      // Show desktop notification if enabled
      showDesktopNotification(notification)
    }

    const handleNotificationUpdate = (notification: Notification) => {
      dispatch({ type: 'UPDATE_NOTIFICATION', payload: notification })
    }

    const handleNotificationBatch = (notifications: Notification[]) => {
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications })
    }

    const handleMarkRead = ({ notificationId }: { notificationId: string }) => {
      dispatch({ type: 'MARK_AS_READ', payload: notificationId })
    }

    // Register socket listeners
    socketService.onNotificationNew(handleNewNotification)
    socketService.onNotificationUpdate(handleNotificationUpdate)
    socketService.onNotificationBatch(handleNotificationBatch)
    socketService.onNotificationMarkRead(handleMarkRead)

    // Cleanup
    return () => {
      socketService.offNotificationNew(handleNewNotification)
      socketService.offNotificationUpdate(handleNotificationUpdate)
      socketService.offNotificationBatch(handleNotificationBatch)
      socketService.offNotificationMarkRead(handleMarkRead)
    }
  }, [])

  // Helper functions
  const playNotificationSound = useCallback(async (notification: Notification) => {
    if (state.isPlayingSound) return

    const preference = state.preferences.find(p =>
      p.categoryName === notification.subtype || p.categoryName === 'all'
    )

    if (!preference?.soundEnabled) return

    dispatch({ type: 'SET_PLAYING_SOUND', payload: true })

    try {
      let soundName = 'notification'

      if (notification.subtype === 'game_result' && notification.amount) {
        if (notification.isJackpot || notification.amount >= 100000) {
          soundName = 'jackpot'
        } else if (notification.amount > 0) {
          soundName = 'win'
        }
      }

      await soundManager.current?.playSound(soundName)
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    } finally {
      setTimeout(() => {
        dispatch({ type: 'SET_PLAYING_SOUND', payload: false })
      }, 1000)
    }
  }, [state.preferences, state.isPlayingSound])

  const showDesktopNotification = useCallback(async (notification: Notification) => {
    const preference = state.preferences.find(p =>
      p.categoryName === notification.subtype || p.categoryName === 'all'
    )

    if (!preference?.desktopEnabled) return

    try {
      await notificationService.showDesktopNotification(notification)
    } catch (error) {
      console.warn('Failed to show desktop notification:', error)
    }
  }, [state.preferences])

  // Context methods
  const addNotification = useCallback((notification: Notification) => {
    console.log('🔔 [NotificationContext] Adding notification:', {
      id: notification.id,
      type: notification.type,
      subtype: notification.subtype,
      title: notification.title,
      hasData: !!notification.data,
      dataKeys: notification.data ? Object.keys(notification.data) : []
    })

    // Add notification to state (localStorage save happens in reducer)
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })

    // Show toast for high priority notifications
    if (notification.priority <= 2) {
      const toastNotification: ToastNotification = {
        ...notification,
        id: notification.id || crypto.randomUUID(),
        userId: notification.userId || '',
        timestamp: notification.timestamp || new Date().toISOString(),
        isRead: false,
        autoClose: true,
        duration: notification.priority === 1 ? 10000 : 6000,
        showProgress: true,
        pauseOnHover: true
      }
      dispatch({ type: 'ADD_TOAST', payload: toastNotification })

      // Auto-remove toast
      if (toastNotification.autoClose) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: toastNotification.id })
        }, toastNotification.duration)
      }
    }

    // Play sound if enabled
    playNotificationSound(notification)

    // Show desktop notification if enabled
    showDesktopNotification(notification)
  }, [playNotificationSound, showDesktopNotification])

  const showToast = useCallback((toast: Omit<ToastNotification, 'id' | 'timestamp' | 'userId'>) => {
    const toastNotification: ToastNotification = {
      ...toast,
      id: crypto.randomUUID(),
      userId: '', // Will be set by the system
      timestamp: new Date().toISOString(),
      isRead: false,
      autoClose: toast.autoClose ?? true,
      duration: toast.duration ?? 5000,
      showProgress: toast.showProgress ?? false,
      pauseOnHover: toast.pauseOnHover ?? true
    }

    dispatch({ type: 'ADD_TOAST', payload: toastNotification })

    // Auto-remove toast
    if (toastNotification.autoClose) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: toastNotification.id })
      }, toastNotification.duration)
    }
  }, [])

  const hideToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])

  const clearAllToasts = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_TOASTS' })
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      socketService.markNotificationAsRead(id)
      dispatch({ type: 'MARK_AS_READ', payload: id })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead()
      socketService.markAllNotificationsAsRead()
      dispatch({ type: 'MARK_ALL_AS_READ' })
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id)
      dispatch({ type: 'DELETE_NOTIFICATION', payload: id })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [])

  const loadNotifications = useCallback(async (filter: NotificationFilter = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await notificationService.getNotifications(filter)

      // Get stored notifications from localStorage
      const storedNotifications = NotificationStorage.load()

      if (response.success && response.data) {
        console.log('📥 [NotificationContext] Loaded notifications from backend:', {
          count: response.data.notifications.length,
          unread: response.data.unreadCount,
          hasMore: response.data.hasMore,
          filter
        })

        // Filter out any potentially invalid notifications
        const validBackendNotifications = response.data.notifications.filter(notification => {
          const isValid = notification.id && notification.userId && notification.type && notification.subtype
          if (!isValid) {
            console.warn('🚫 [NotificationContext] Invalid notification filtered out:', notification)
          }
          return isValid
        })

        // Merge localStorage notifications with backend notifications
        const mergedNotifications = NotificationStorage.mergeWithBackend(storedNotifications, validBackendNotifications)

        console.log('🔄 [NotificationContext] Merged notifications:', {
          stored: storedNotifications.length,
          backend: validBackendNotifications.length,
          merged: mergedNotifications.length
        })

        dispatch({ type: 'SET_NOTIFICATIONS', payload: mergedNotifications })
        dispatch({ type: 'SET_UNREAD_COUNT', payload: mergedNotifications.filter(n => !n.isRead).length })
        dispatch({ type: 'SET_HAS_MORE', payload: response.data.hasMore })
      } else {
        console.log('📭 [NotificationContext] No backend notifications, using localStorage only')
        // If backend fails or returns no data, use localStorage notifications
        if (storedNotifications.length > 0) {
          dispatch({ type: 'SET_NOTIFICATIONS', payload: storedNotifications })
          dispatch({ type: 'SET_UNREAD_COUNT', payload: storedNotifications.filter(n => !n.isRead).length })
        } else {
          dispatch({ type: 'SET_NOTIFICATIONS', payload: [] })
          dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 })
        }
        dispatch({ type: 'SET_HAS_MORE', payload: false })
      }
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to load notifications:', error)
      // On error, fall back to localStorage
      const storedNotifications = NotificationStorage.load()
      if (storedNotifications.length > 0) {
        console.log('💾 [NotificationContext] Falling back to localStorage notifications')
        dispatch({ type: 'SET_NOTIFICATIONS', payload: storedNotifications })
        dispatch({ type: 'SET_UNREAD_COUNT', payload: storedNotifications.filter(n => !n.isRead).length })
      } else {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: [] })
        dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 })
      }
      dispatch({ type: 'SET_HAS_MORE', payload: false })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const loadMoreNotifications = useCallback(async () => {
    if (!state.hasMore || state.isLoading) return

    try {
      const filter: NotificationFilter = {
        ...state.filter,
        offset: state.notifications.length,
        limit: 20
      }

      const response = await notificationService.getNotifications(filter)

      if (response.success && response.data) {
        dispatch({
          type: 'SET_NOTIFICATIONS',
          payload: [...state.notifications, ...response.data.notifications]
        })
        dispatch({ type: 'SET_HAS_MORE', payload: response.data.hasMore })
      }
    } catch (error) {
      console.error('Failed to load more notifications:', error)
    }
  }, [state.hasMore, state.isLoading, state.filter, state.notifications])

  const toggleNotificationCenter = useCallback((open?: boolean) => {
    dispatch({ type: 'TOGGLE_CENTER', payload: open })
  }, [])

  const updateFilter = useCallback((filter: NotificationFilter) => {
    dispatch({ type: 'SET_FILTER', payload: filter })
    loadNotifications(filter)
  }, [loadNotifications])

  const loadPreferences = useCallback(async () => {
    try {
      const response = await notificationService.getPreferences()

      if (response.success && response.data) {
        dispatch({ type: 'SET_PREFERENCES', payload: response.data })
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }, [])

  const updatePreference = useCallback(async (preference: Partial<NotificationPreferences>) => {
    try {
      const response = await notificationService.updatePreferences(preference)

      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_PREFERENCE', payload: response.data })
      }
    } catch (error) {
      console.error('Failed to update notification preference:', error)
    }
  }, [])

  const requestDesktopPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const permission = await notificationService.requestDesktopPermission()
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission })
      return permission
    } catch (error) {
      console.error('Failed to request desktop permission:', error)
      return 'denied'
    }
  }, [])

  const clearAllNotifications = useCallback(() => {
    console.log('🧽 [NotificationContext] Clearing all notifications')
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' })
  }, [])

  const testNotification = useCallback(async () => {
    try {
      await notificationService.sendTestNotification()
      showToast({
        type: 'info',
        subtype: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification to verify your settings.',
        priority: 3,
        isRead: false
      })
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }, [showToast])

  const contextValue: NotificationContextType = {
    state,
    addNotification,
    showToast,
    hideToast,
    clearAllToasts,
    clearAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
    loadMoreNotifications,
    toggleNotificationCenter,
    updateFilter,
    loadPreferences,
    updatePreference,
    requestDesktopPermission,
    testNotification
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook to use notification context
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationContext