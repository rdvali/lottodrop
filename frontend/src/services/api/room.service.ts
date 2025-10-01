import { apiClient } from './config'
import type { Room } from '../../types'
import { apiRateLimiter } from '../../utils/rateLimiter'

// Backend response interfaces
interface BackendRoom {
  id: string
  name: string
  type: 'FAST_DROP' | 'TIME_DROP'
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  bet_amount: string
  min_players: number
  max_players: number
  current_players: string
  current_prize_pool: string
  platform_fee_rate: string
  participants: Array<{
    id?: string
    userId?: string
    first_name?: string
    last_name?: string
    firstName?: string
    lastName?: string
    username?: string
    avatarUrl?: string
    avatar_url?: string
    avatar?: string
    profileImage?: string
    profile_image?: string
    joinedAt?: string
    joined_at?: string
    status?: string
  }>
  currentPlayers: number
  currentPrizePool: number
  created_at: string
  updated_at: string
  number_of_winners: number
  share_code?: string
}

interface BackendRoomsResponse {
  rooms: BackendRoom[]
}

interface BackendRoomResponse {
  room: BackendRoom
  participants?: Array<{
    id?: string
    userId?: string
    first_name?: string
    last_name?: string
    firstName?: string
    lastName?: string
    username?: string
    avatarUrl?: string
    avatar_url?: string
    avatar?: string
    profileImage?: string
    profile_image?: string
    joinedAt?: string
    joined_at?: string
    status?: string
  }>
}

interface BackendJoinResponse {
  message: string
  roundId?: string
  betAmount?: number
  gameStarting?: boolean
}

interface BackendLeaveResponse {
  success: boolean
  message: string
  refundAmount?: number
  newBalance?: number
}

// Transform backend room data to frontend format
const transformRoom = (backendRoom: BackendRoom): Room => {
  // Parse numeric values from backend (they come as strings) with NaN safety
  const rawEntryFee = parseFloat(backendRoom.bet_amount)
  const entryFee = isNaN(rawEntryFee) ? 0 : rawEntryFee
  
  // Use the numeric values if available, otherwise parse strings
  const rawCurrentParticipants = 
    backendRoom.currentPlayers || 
    parseInt(backendRoom.current_players) || 
    backendRoom.participants?.length || 
    0
  const currentParticipants = isNaN(rawCurrentParticipants) ? 0 : rawCurrentParticipants
  
  // Calculate prize pool - check multiple sources
  let prizePool = 0
  if (backendRoom.currentPrizePool !== undefined && backendRoom.currentPrizePool !== null) {
    prizePool = typeof backendRoom.currentPrizePool === 'number' ? 
      backendRoom.currentPrizePool : parseFloat(backendRoom.currentPrizePool)
  } else if (backendRoom.current_prize_pool) {
    prizePool = parseFloat(backendRoom.current_prize_pool)
  } else if (currentParticipants > 0 && entryFee > 0) {
    // Calculate based on participants if prize pool not provided
    prizePool = currentParticipants * entryFee
  }
  prizePool = isNaN(prizePool) ? 0 : prizePool

  const transformedRoom = {
    id: backendRoom.id,
    name: backendRoom.name,
    type: backendRoom.type.toLowerCase() as 'fast_drop' | 'time_drop',
    status: mapBackendStatus(backendRoom.status),
    entryFee,
    minParticipants: backendRoom.min_players || 3,
    maxParticipants: backendRoom.max_players || 10,
    currentParticipants,
    prizePool,
    platformFeeRate: parseFloat(backendRoom.platform_fee_rate) || 0.1,
    startTime: undefined,
    endTime: undefined,
    winnersCount: backendRoom.number_of_winners || 1,
    participants: backendRoom.participants?.map(p => ({
      id: p.id || `participant-${Date.now()}-${Math.random()}`,
      // CRITICAL: userId must be the actual user ID from backend, not generated
      userId: p.userId || p.user_id || null,
      username: p.username ||
               (p.first_name && p.last_name ? `${p.first_name} ${p.last_name}`.trim() : null) ||
               (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}`.trim() : null) ||
               'Player',
      avatarUrl: p.avatarUrl || p.avatar_url || p.avatar || p.profileImage || p.profile_image,
      joinedAt: p.joinedAt || p.joined_at || new Date().toISOString(),
      status: (p.status || 'active') as 'active'
    })) || [],
    winners: [],
    createdAt: backendRoom.created_at,
    updatedAt: backendRoom.updated_at
  }
  
  return transformedRoom
}

// Map backend status to frontend status
const mapBackendStatus = (backendStatus: string): 'waiting' | 'in_progress' | 'completed' => {
  switch (backendStatus) {
    case 'WAITING': return 'waiting'
    case 'ACTIVE': return 'in_progress'
    case 'COMPLETED': return 'completed'
    default: return 'waiting'
  }
}

export const roomAPI = {
  async getRooms(): Promise<Room[]> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.get<BackendRoomsResponse>('/rooms')
      if (!data.rooms) {
        throw new Error('Failed to get rooms - invalid response format')
      }
      return data.rooms.map(transformRoom)
    })
  },

  async getRoom(roomId: string): Promise<Room> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.get<BackendRoomResponse>(`/rooms/${roomId}`)
      if (!data.room) {
        throw new Error('Failed to get room - invalid response format')
      }
      // Backend returns participants both inside room and separately, use the separate array
      const roomWithParticipants = {
        ...data.room,
        participants: data.participants || data.room.participants || []
      }
      return transformRoom(roomWithParticipants)
    })
  },

  async joinRoom(roomId: string): Promise<void> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.post<BackendJoinResponse>(`/rooms/${roomId}/join`)
      if (!data.message) {
        throw new Error('Failed to join room - invalid response')
      }
      // Backend returns success message instead of success boolean
    })
  },

  async leaveRoom(roomId: string): Promise<void> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.post<BackendLeaveResponse>(`/rooms/${roomId}/unjoin`)
      if (!data.success) {
        throw new Error('Failed to leave room')
      }
    })
  },

  async getRoomByShareCode(shareCode: string): Promise<Room> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.get<BackendRoomResponse>(`/rooms/share/${shareCode}`)
      if (!data.room) {
        throw new Error('Failed to get room by share code - invalid response format')
      }
      // Merge participants into room object for transformation
      const roomWithParticipants = {
        ...data.room,
        participants: data.participants || []
      }
      return transformRoom(roomWithParticipants)
    })
  },

  async getRoomStats(): Promise<{ totalPlayers: number, totalGames: number, totalPayouts: number, biggestWin: number }> {
    return apiRateLimiter.execute(async () => {
      const { data } = await apiClient.get<{ stats: { totalPlayers: number, totalGames: number, totalPayouts: number, biggestWin: number } }>('/rooms/stats')
      if (!data.stats) {
        throw new Error('Failed to get room stats - invalid response format')
      }
      return data.stats
    })
  },
}