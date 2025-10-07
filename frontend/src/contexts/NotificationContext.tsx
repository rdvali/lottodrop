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
  permissionStatus: NotificationPermission
  processedNotificationIds: Set<string>
  lastProcessedTimestamp: number
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
  | { type: 'ADD_PROCESSED_ID'; payload: string }
  | { type: 'CLEAR_OLD_PROCESSED_IDS' }

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
  permissionStatus: 'default',
  processedNotificationIds: new Set<string>(),
  lastProcessedTimestamp: 0
}

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_TOAST': {
      // Check for duplicate toast by ID
      const isDuplicateToast = state.toasts.some(t => t.id === action.payload.id)
      if (isDuplicateToast) {
        return state
      }

      return {
        ...state,
        toasts: [...state.toasts.slice(-4), action.payload] // Keep max 5 toasts
      }
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

    case 'ADD_NOTIFICATION': {
      // Check for duplicate notification by ID
      const isDuplicate = state.notifications.some(n => n.id === action.payload.id)
      if (isDuplicate) {
        return state
      }

      const newNotifications = [action.payload, ...state.notifications]
      // Save to localStorage when notification is added
      NotificationStorage.save(newNotifications)

      // Only increment unread count for game result and game win notifications
      const shouldIncrementUnread = !action.payload.isRead &&
        (action.payload.subtype === 'game_result' || action.payload.subtype === 'game_win')

      return {
        ...state,
        notifications: newNotifications,
        unreadCount: shouldIncrementUnread ? state.unreadCount + 1 : state.unreadCount
      }
    }

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id ? action.payload : notification
        )
      }

    case 'MARK_AS_READ': {
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
    }

    case 'MARK_ALL_AS_READ': {
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
    }

    case 'DELETE_NOTIFICATION': {
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

    case 'ADD_PROCESSED_ID': {
      const newProcessedIds = new Set(state.processedNotificationIds)
      newProcessedIds.add(action.payload)
      return {
        ...state,
        processedNotificationIds: newProcessedIds,
        lastProcessedTimestamp: Date.now()
      }
    }

    case 'CLEAR_OLD_PROCESSED_IDS': {
      // Keep only recent processed IDs (last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return {
        ...state,
        processedNotificationIds: new Set<string>(),
        lastProcessedTimestamp: fiveMinutesAgo
      }
    }

    default:
      return state
  }
}

// Context
interface NotificationContextType {
  state: NotificationState
  addNotification: (notification: Notification) => void
  showToast: (notification: Omit<ToastNotification, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'isRead'> & { isRead?: boolean }) => void
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

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(notificationReducer, initialState)
  const isInitialized = useRef(false)
  const notificationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const processingNotifications = useRef<Set<string>>(new Set())

  // Get current location for context-aware notifications
  const getCurrentLocation = useCallback(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      return {
        path,
        isInRoom: path.startsWith('/room/') && path !== '/room/',
        roomId: path.startsWith('/room/') ? path.split('/room/')[1] : null
      }
    }
    return { path: '/', isInRoom: false, roomId: null }
  }, [])

  // Initialize notification system
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Check desktop notification permission
    if ('Notification' in window) {
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: Notification.permission })
    }

    // Load stored notifications from localStorage immediately
    const storedNotifications = NotificationStorage.load()
    if (storedNotifications.length > 0) {
      const unreadCount = storedNotifications.filter(n =>
        !n.isRead && (n.subtype === 'game_result' || n.subtype === 'game_win')
      ).length
      dispatch({ type: 'SET_NOTIFICATIONS', payload: storedNotifications })
      dispatch({ type: 'SET_UNREAD_COUNT', payload: unreadCount })
    }

    // Load initial notifications and preferences with game_result filter
    loadNotifications({ subtype: 'game_result' }) // This will merge with localStorage
    loadPreferences()

    // Multi-round completion handler - NOW HANDLED BY NotificationsRoot
    const handleMultiRoundCompleted = (_data: any) => {
      // Disabled - NotificationsRoot handles round results
    }

    // Personal round completion handler - NOW HANDLED BY NotificationsRoot
    const handlePersonalRoundCompleted = (_data: any) => {
      // Disabled - NotificationsRoot handles round results
    }

    // Global game completed handler - NOW HANDLED BY NotificationsRoot
    const handleGlobalGameCompleted = (_data: any) => {
      // Disabled - NotificationsRoot handles round results and winner announcements
    }

    // Debounced notification handler to prevent duplicates
    const handleNewNotification = (notification: Notification) => {
      // Check if we're already processing this notification
      if (processingNotifications.current.has(notification.id)) {
        return
      }

      // Check if notification was recently processed
      if (state.processedNotificationIds.has(notification.id)) {
        return
      }

      // Mark as being processed
      processingNotifications.current.add(notification.id)

      // Clear any existing timeout for this notification ID
      const existingTimeout = notificationTimeouts.current.get(notification.id)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Debounce notification processing by 100ms
      const timeout = setTimeout(() => {
        const location = getCurrentLocation()

        // Add to notification center (persistent storage)
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
        dispatch({ type: 'ADD_PROCESSED_ID', payload: notification.id })

        // Context-aware toast display logic
        const shouldShowToast =
          // Always show winner announcements to everyone
          notification.subtype === 'winner_announcement' ||
          // Always show personal wins
          (notification.subtype === 'game_win' && notification.userId !== 'global') ||
          // Show high priority notifications (priority 1)
          notification.priority === 1 ||
          // Show game results only when NOT in a room
          (!location.isInRoom && notification.subtype === 'game_result')

        if (shouldShowToast) {
          const toastDuration =
            notification.subtype === 'game_win' ? 10000 : // 10 seconds for personal wins
            notification.subtype === 'winner_announcement' ? 8000 : // 8 seconds for winner announcements
            notification.priority === 1 ? 8000 : // 8 seconds for high priority
            5000 // 5 seconds for others

          // Prevent duplicate toasts
          const toastId = `toast-${notification.id}`
          const existingToast = state.toasts.find(t => t.id === toastId)
          if (!existingToast) {
            showToast({
              ...notification,
              id: toastId,
              autoClose: true,
              duration: toastDuration,
              showProgress: true,
              pauseOnHover: true
            })
          }
        }

        // Show desktop notification if enabled
        showDesktopNotification(notification)

        // Remove from processing set
        processingNotifications.current.delete(notification.id)
        notificationTimeouts.current.delete(notification.id)
      }, 100)

      notificationTimeouts.current.set(notification.id, timeout)
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

    const handlePendingNotifications = (data: any) => {
      if (data.notifications && data.notifications.length > 0) {
        // Process pending notifications without showing toasts (to prevent spam)
        data.notifications.forEach((notification: any) => {
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
        })
      }
    }

    // Register all socket listeners
    socketService.onNotificationNew(handleNewNotification)
    socketService.onNotificationUpdate(handleNotificationUpdate)
    socketService.onNotificationBatch(handleNotificationBatch)
    socketService.onNotificationMarkRead(handleMarkRead)

    // Register game event listeners
    socketService.onMultiRoundCompleted(handleMultiRoundCompleted)
    socketService.onPersonalRoundCompleted(handlePersonalRoundCompleted)
    socketService.onGlobalGameCompleted(handleGlobalGameCompleted)
    socketService.onPendingNotifications(handlePendingNotifications)

    // Cleanup old processed IDs periodically
    const cleanupInterval = setInterval(() => {
      dispatch({ type: 'CLEAR_OLD_PROCESSED_IDS' })
    }, 5 * 60 * 1000) // Every 5 minutes

    // Cleanup
    return () => {
      socketService.offNotificationNew(handleNewNotification)
      socketService.offNotificationUpdate(handleNotificationUpdate)
      socketService.offNotificationBatch(handleNotificationBatch)
      socketService.offNotificationMarkRead(handleMarkRead)

      // Remove game event listeners
      socketService.offMultiRoundCompleted(handleMultiRoundCompleted)
      socketService.offPersonalRoundCompleted(handlePersonalRoundCompleted)
      socketService.offGlobalGameCompleted(handleGlobalGameCompleted)
      socketService.offPendingNotifications(handlePendingNotifications)

      // Clear timeouts and intervals
      clearInterval(cleanupInterval)
      notificationTimeouts.current.forEach(timeout => clearTimeout(timeout))
      notificationTimeouts.current.clear()
      processingNotifications.current.clear()
    }
  }, [])

  // Helper functions
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
    // Check for duplicate notification
    if (state.processedNotificationIds.has(notification.id)) {
      return
    }

    // Check if notification already exists in state
    const existingNotification = state.notifications.find(n => n.id === notification.id)
    if (existingNotification) {
      return
    }

    // Add notification to state (localStorage save happens in reducer)
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
    dispatch({ type: 'ADD_PROCESSED_ID', payload: notification.id })

    // Show toast for high priority notifications
    if (notification.priority <= 2) {
      const toastId = `toast-${notification.id}-${Date.now()}`
      const toastNotification: ToastNotification = {
        ...notification,
        id: toastId,
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
          dispatch({ type: 'REMOVE_TOAST', payload: toastId })
        }, toastNotification.duration)
      }
    }

    // Show desktop notification if enabled
    showDesktopNotification(notification)
  }, [showDesktopNotification, state.processedNotificationIds, state.notifications])

  const showToast = useCallback((toast: Omit<ToastNotification, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'isRead'> & { id?: string; isRead?: boolean }) => {
    // Use provided ID or generate unique ID for toast
    const toastId = toast.id || `manual-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toastNotification: ToastNotification = {
      ...toast,
      id: toastId,
      userId: '', // Will be set by the system
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: toast.isRead ?? false,
      autoClose: toast.autoClose ?? true,
      duration: toast.duration ?? 5000,
      showProgress: toast.showProgress ?? false,
      pauseOnHover: toast.pauseOnHover ?? true
    }

    dispatch({ type: 'ADD_TOAST', payload: toastNotification })

    // Auto-remove toast
    if (toastNotification.autoClose) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: toastId })
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

        // Only count game result and game win notifications as unread (exclude winner announcements)
        const unreadCount = mergedNotifications.filter(n =>
          !n.isRead && (n.subtype === 'game_result' || n.subtype === 'game_win')
        ).length

        dispatch({ type: 'SET_NOTIFICATIONS', payload: mergedNotifications })
        dispatch({ type: 'SET_UNREAD_COUNT', payload: unreadCount })
        dispatch({ type: 'SET_HAS_MORE', payload: response.data.hasMore })
      } else {
        // If backend fails or returns no data, use localStorage notifications
        if (storedNotifications.length > 0) {
          const unreadCount = storedNotifications.filter(n =>
            !n.isRead && (n.subtype === 'game_result' || n.subtype === 'game_win')
          ).length
          dispatch({ type: 'SET_NOTIFICATIONS', payload: storedNotifications })
          dispatch({ type: 'SET_UNREAD_COUNT', payload: unreadCount })
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
        const unreadCount = storedNotifications.filter(n =>
          !n.isRead && (n.subtype === 'game_result' || n.subtype === 'game_win')
        ).length
        dispatch({ type: 'SET_NOTIFICATIONS', payload: storedNotifications })
        dispatch({ type: 'SET_UNREAD_COUNT', payload: unreadCount })
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
        priority: 3
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