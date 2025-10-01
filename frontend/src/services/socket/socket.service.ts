import { io, Socket } from 'socket.io-client'
import type {
  RoomStateData,
  UserJoinedData,
  UserLeftData,
  GameStartingData,
  CountdownData,
  AnimationStartData,
  GameCompletedData,
  RoomResetData,
  GlobalGameCompletedData,
  BalanceUpdatedData,
  RoomStatusUpdateData,
  Notification,
  NotificationPreferences
} from '../../types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

// Socket event callback types
type RoomStateCallback = (data: RoomStateData) => void
type UserJoinedCallback = (data: UserJoinedData) => void
type UserLeftCallback = (data: UserLeftData) => void
type GameStartingCallback = (data: GameStartingData) => void
type CountdownCallback = (data: CountdownData) => void
type AnimationStartCallback = (data: AnimationStartData) => void
type GameCompletedCallback = (data: GameCompletedData) => void
type RoomResetCallback = (data: RoomResetData) => void
type GlobalGameCompletedCallback = (data: GlobalGameCompletedData) => void
type BalanceUpdatedCallback = (data: BalanceUpdatedData) => void
type RoomStatusUpdateCallback = (data: RoomStatusUpdateData) => void
// type ErrorCallback = (data: ErrorData) => void

// Notification callback types
type NotificationNewCallback = (data: Notification) => void
type NotificationUpdateCallback = (data: Notification) => void
type NotificationBatchCallback = (data: Notification[]) => void
type NotificationMarkReadCallback = (data: { notificationId: string }) => void
type NotificationPreferencesUpdateCallback = (data: NotificationPreferences) => void

type GenericCallback = (...args: unknown[]) => void

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<GenericCallback>> = new Map()

  connect(token: string): void {
    if (this.socket?.connected) return

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.setupDefaultListeners()
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  private setupDefaultListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      // Removed: console.log('Socket connected')
    })

    this.socket.on('disconnect', () => {
      // Removed: console.log('Socket disconnected')
    })

    this.socket.on('error', (error: unknown) => {
      // Removed: console.error('Socket error:', error)
      if (error && typeof error === 'object' && 'message' in error) {
        // Removed: console.error('Error message:', error.message)
      }
    })
  }

  // Room events
  joinRoom(roomId: string): void {
    // Removed: console.log('[SocketService] Joining room:', roomId)
    this.socket?.emit('join-room', roomId)
  }

  leaveRoom(roomId: string): void {
    // Removed: console.log('[SocketService] Leaving room:', roomId)
    this.socket?.emit('leave-room', roomId)
  }

  // Generic emit method for custom events
  emit(eventName: string, data?: any): void {
    this.socket?.emit(eventName, data)
  }

  // Event listeners
  onRoomState(callback: (data: RoomStateData) => void): void {
    this.socket?.on('room-state', callback)
  }

  onUserJoined(callback: (data: UserJoinedData) => void): void {
    this.socket?.on('user-joined', callback)
  }

  onUserLeft(callback: (data: UserLeftData) => void): void {
    this.socket?.on('user-left', callback)
  }

  onGameStarting(callback: (data: GameStartingData) => void): void {
    // Removed: console.log('[SocketService] Registering game-starting listener')
    this.socket?.on('game-starting', (data) => {
      // Removed: console.log('[SocketService] Received game-starting event:', data)
      callback(data)
    })
  }

  onCountdown(callback: (data: CountdownData) => void): void {
    // Removed: console.log('[SocketService] Registering countdown listener')
    this.socket?.on('countdown', (data) => {
      // Removed: console.log('[SocketService] Received countdown event:', data)
      callback(data)
    })
  }

  onAnimationStart(callback: (data: AnimationStartData) => void): void {
    // Removed: console.log('[SocketService] Registering animation-start listener')
    this.socket?.on('animation-start', (data) => {
      // Removed: console.log('[SocketService] Received animation-start event:', data)
      callback(data)
    })
  }

  onGameCompleted(callback: (data: GameCompletedData) => void): void {
    // Removed: console.log('[SocketService] Registering game-completed listener')
    this.socket?.on('game-completed', (data) => {
      // Removed: console.log('[SocketService] Received game-completed event:', data)
      callback(data)
    })
  }

  onRoomReset(callback: (data: RoomResetData) => void): void {
    this.socket?.on('roomReset', callback)
  }

  onGlobalGameCompleted(callback: (data: GlobalGameCompletedData) => void): void {
    this.socket?.on('global-game-completed', callback)
  }

  onMultiRoundCompleted(callback: (data: any) => void): void {
    this.socket?.on('multi-round-completed', callback)
  }

  onPersonalRoundCompleted(callback: (data: any) => void): void {
    this.socket?.on('personal-round-completed', callback)
  }

  onPendingNotifications(callback: (data: any) => void): void {
    this.socket?.on('pending-notifications', callback)
  }

  onBalanceUpdated(callback: (data: BalanceUpdatedData) => void): void {
    this.socket?.on('balance-updated', callback)
  }

  onRoomStatusUpdate(callback: (data: RoomStatusUpdateData) => void): void {
    this.socket?.on('room-status-update', callback)
  }

  // Notification event listeners
  onNotificationNew(callback: NotificationNewCallback): void {
    this.socket?.on('notification:new', callback)
  }

  onNotificationUpdate(callback: NotificationUpdateCallback): void {
    this.socket?.on('notification:update', callback)
  }

  onNotificationBatch(callback: NotificationBatchCallback): void {
    this.socket?.on('notification:batch', callback)
  }

  onNotificationMarkRead(callback: NotificationMarkReadCallback): void {
    this.socket?.on('notification:mark-read', callback)
  }

  onNotificationPreferencesUpdate(callback: NotificationPreferencesUpdateCallback): void {
    this.socket?.on('notification:preferences-update', callback)
  }

  // Remove listeners
  offRoomState(callback?: RoomStateCallback): void {
    if (callback) {
      this.socket?.off('room-state', callback)
    } else {
      this.socket?.off('room-state')
    }
  }

  offUserJoined(callback?: UserJoinedCallback): void {
    if (callback) {
      this.socket?.off('user-joined', callback)
    } else {
      this.socket?.off('user-joined')
    }
  }

  offUserLeft(callback?: UserLeftCallback): void {
    if (callback) {
      this.socket?.off('user-left', callback)
    } else {
      this.socket?.off('user-left')
    }
  }

  offGameStarting(callback?: GameStartingCallback): void {
    if (callback) {
      this.socket?.off('game-starting', callback)
    } else {
      this.socket?.off('game-starting')
    }
  }

  offCountdown(callback?: CountdownCallback): void {
    if (callback) {
      this.socket?.off('countdown', callback)
    } else {
      this.socket?.off('countdown')
    }
  }

  offAnimationStart(callback?: AnimationStartCallback): void {
    if (callback) {
      this.socket?.off('animation-start', callback)
    } else {
      this.socket?.off('animation-start')
    }
  }

  offGameCompleted(callback?: GameCompletedCallback): void {
    if (callback) {
      this.socket?.off('game-completed', callback)
    } else {
      this.socket?.off('game-completed')
    }
  }

  offRoomReset(callback?: RoomResetCallback): void {
    if (callback) {
      this.socket?.off('roomReset', callback)
    } else {
      this.socket?.off('roomReset')
    }
  }

  offGlobalGameCompleted(callback?: GlobalGameCompletedCallback): void {
    if (callback) {
      this.socket?.off('global-game-completed', callback)
    } else {
      this.socket?.off('global-game-completed')
    }
  }

  offMultiRoundCompleted(callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off('multi-round-completed', callback)
    } else {
      this.socket?.off('multi-round-completed')
    }
  }

  offPersonalRoundCompleted(callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off('personal-round-completed', callback)
    } else {
      this.socket?.off('personal-round-completed')
    }
  }

  offPendingNotifications(callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off('pending-notifications', callback)
    } else {
      this.socket?.off('pending-notifications')
    }
  }

  offBalanceUpdated(callback?: BalanceUpdatedCallback): void {
    if (callback) {
      this.socket?.off('balance-updated', callback)
    } else {
      this.socket?.off('balance-updated')
    }
  }

  offRoomStatusUpdate(callback?: RoomStatusUpdateCallback): void {
    if (callback) {
      this.socket?.off('room-status-update', callback)
    } else {
      this.socket?.off('room-status-update')
    }
  }

  // Remove notification listeners
  offNotificationNew(callback?: NotificationNewCallback): void {
    if (callback) {
      this.socket?.off('notification:new', callback)
    } else {
      this.socket?.off('notification:new')
    }
  }

  offNotificationUpdate(callback?: NotificationUpdateCallback): void {
    if (callback) {
      this.socket?.off('notification:update', callback)
    } else {
      this.socket?.off('notification:update')
    }
  }

  offNotificationBatch(callback?: NotificationBatchCallback): void {
    if (callback) {
      this.socket?.off('notification:batch', callback)
    } else {
      this.socket?.off('notification:batch')
    }
  }

  offNotificationMarkRead(callback?: NotificationMarkReadCallback): void {
    if (callback) {
      this.socket?.off('notification:mark-read', callback)
    } else {
      this.socket?.off('notification:mark-read')
    }
  }

  offNotificationPreferencesUpdate(callback?: NotificationPreferencesUpdateCallback): void {
    if (callback) {
      this.socket?.off('notification:preferences-update', callback)
    } else {
      this.socket?.off('notification:preferences-update')
    }
  }

  // Notification emit methods
  markNotificationAsRead(notificationId: string): void {
    this.socket?.emit('notification:mark-read', { notificationId })
  }

  markAllNotificationsAsRead(): void {
    this.socket?.emit('notification:mark-all-read')
  }

  get isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const socketService = new SocketService()
export default socketService