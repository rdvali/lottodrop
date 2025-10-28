import { vi } from 'vitest'

/**
 * Mock Socket Service for testing
 * Allows tests to simulate socket events and verify event handlers
 */
class MockSocketService {
  private eventHandlers: Map<string, Function[]> = new Map()
  public connected = false

  // Mock socket methods
  connect = vi.fn(() => {
    this.connected = true
  })

  disconnect = vi.fn(() => {
    this.connected = false
  })

  joinRoom = vi.fn((roomId: string) => {
    console.log('[MockSocket] Joining room:', roomId)
  })

  leaveRoom = vi.fn((roomId: string) => {
    console.log('[MockSocket] Leaving room:', roomId)
  })

  // Event subscription methods
  on = vi.fn((event: string, handler: Function) => {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  })

  off = vi.fn((event: string, handler: Function) => {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  })

  // Event emitter methods (for tests to trigger events)
  emit = (event: string, data: any) => {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  // Specific event handlers
  onRoomState = vi.fn((handler: Function) => this.on('room-state', handler))
  offRoomState = vi.fn((handler: Function) => this.off('room-state', handler))

  onUserJoined = vi.fn((handler: Function) => this.on('user-joined', handler))
  offUserJoined = vi.fn((handler: Function) => this.off('user-joined', handler))

  onUserLeft = vi.fn((handler: Function) => this.on('user-left', handler))
  offUserLeft = vi.fn((handler: Function) => this.off('user-left', handler))

  onGameStarting = vi.fn((handler: Function) => this.on('game-starting', handler))
  offGameStarting = vi.fn((handler: Function) => this.off('game-starting', handler))

  onCountdownUpdate = vi.fn((handler: Function) => this.on('countdown-update', handler))
  offCountdownUpdate = vi.fn((handler: Function) => this.off('countdown-update', handler))

  onAnimationStart = vi.fn((handler: Function) => this.on('animation-start', handler))
  offAnimationStart = vi.fn((handler: Function) => this.off('animation-start', handler))

  onGameCompleted = vi.fn((handler: Function) => this.on('game-completed', handler))
  offGameCompleted = vi.fn((handler: Function) => this.off('game-completed', handler))

  onBalanceUpdated = vi.fn((handler: Function) => this.on('balance-updated', handler))
  offBalanceUpdated = vi.fn((handler: Function) => this.off('balance-updated', handler))

  onGlobalGameCompleted = vi.fn((handler: Function) => this.on('global:game-completed', handler))
  offGlobalGameCompleted = vi.fn((handler: Function) => this.off('global:game-completed', handler))

  // Clear all handlers (for test cleanup)
  clearAllHandlers = () => {
    this.eventHandlers.clear()
  }

  // Get handler count for testing
  getHandlerCount = (event: string) => {
    return this.eventHandlers.get(event)?.length || 0
  }
}

export const mockSocketService = new MockSocketService()
