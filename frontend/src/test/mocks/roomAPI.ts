import { vi } from 'vitest'
import { createMockRoom, createMockParticipants } from '../utils'

/**
 * Mock Room API for testing
 */
export const mockRoomAPI = {
  getRooms: vi.fn(() =>
    Promise.resolve([
      createMockRoom({ id: 'room-1', name: 'Room 1' }),
      createMockRoom({ id: 'room-2', name: 'Room 2' }),
    ])
  ),

  getRoom: vi.fn((roomId: string) =>
    Promise.resolve(
      createMockRoom({
        id: roomId,
        participants: createMockParticipants(3),
      })
    )
  ),

  joinRoom: vi.fn((roomId: string) =>
    Promise.resolve({
      success: true,
      message: 'Joined room successfully',
      roomId,
    })
  ),

  leaveRoom: vi.fn((roomId: string) =>
    Promise.resolve({
      success: true,
      message: 'Left room successfully',
      roomId,
    })
  ),

  // Reset all mocks (for test cleanup)
  resetMocks: () => {
    mockRoomAPI.getRooms.mockClear()
    mockRoomAPI.getRoom.mockClear()
    mockRoomAPI.joinRoom.mockClear()
    mockRoomAPI.leaveRoom.mockClear()
  },
}
