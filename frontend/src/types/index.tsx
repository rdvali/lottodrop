// User types
export interface User {
  id: string
  username: string
  email: string
  balance: number
  currency?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

// Room types
export interface Room {
  id: string
  name: string
  type: 'fast_drop' | 'time_drop' | 'special'
  status: 'waiting' | 'in_progress' | 'completed'
  entryFee: number
  maxParticipants: number
  minParticipants: number
  currentParticipants: number
  prizePool: number
  platformFeeRate?: number
  startTime?: string
  endTime?: string
  winnersCount: number
  participants?: Participant[]
  winners?: Winner[]
  createdAt: string
  updatedAt: string
}

export interface Participant {
  id: string
  userId: string
  username: string
  avatarUrl?: string
  joinedAt: string
  status: 'active' | 'eliminated' | 'winner'
}

export interface Winner {
  userId: string
  username: string
  name?: string
  prize: number
  prizeAmount?: number
  position: number
}

// Transaction types
export interface Transaction {
  id: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'winnings' | 'refund'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  description: string
  createdAt: string
}

// Game history types
export interface GameHistory {
  id: string
  roomId: string
  roomName: string
  userId: string
  entryFee: number
  result: 'win' | 'loss' | 'pending'
  prize?: number // Legacy field for backward compatibility
  position?: number
  playedAt: string
  roomType?: string
  betAmount: number
  prizePool: number
  isWinner: boolean
  wonAmount: number
}

// Game statistics
export interface GameStatistics {
  totalGames: number
  totalWon: number
  totalLost: number
  totalPending: number
  totalWinnings: number
  totalSpent: number
  winRate: number
  averageEntryFee: number
  biggestWin: number
}

// Pagination
export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Game history filters
export interface GameHistoryFilters {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  result?: 'all' | 'win' | 'loss' | 'pending'
  sortBy?: 'playedAt' | 'entryFee' | 'prize' | 'roomName'
  sortOrder?: 'asc' | 'desc'
  minEntryFee?: number
  maxEntryFee?: number
}

// Enhanced game history response
export interface GameHistoryResponse {
  success: boolean
  data: GameHistory[]
  games: GameHistory[] // backward compatibility
  pagination: PaginationData
  statistics: GameStatistics
  error?: string // For error handling
}

// Notification types
export interface Notification {
  id: string
  type: 'win' | 'loss' | 'game_start' | 'game_end' | 'info' | 'warning' | 'error'
  title: string
  message: string
  roomId?: string
  roundId?: string
  timestamp: string
  isRead: boolean
  data?: Record<string, unknown>
}

// WebSocket event types
export interface SocketEvents {
  // Incoming events
  roomState: (data: RoomStateData) => void
  userJoined: (data: UserJoinedData) => void
  userLeft: (data: UserLeftData) => void
  gameStarting: (data: GameStartingData) => void
  countdown: (data: CountdownData) => void
  animationStart: (data: AnimationStartData) => void
  gameCompleted: (data: GameCompletedData) => void
  roomReset: (data: RoomResetData) => void
  globalGameCompleted: (data: GlobalGameCompletedData) => void
  balanceUpdated: (data: BalanceUpdatedData) => void
  roomStatusUpdate: (data: RoomStatusUpdateData) => void
  error: (data: ErrorData) => void
}

// WebSocket data types
export interface RoomStateData {
  room: Room
  participants: Participant[]
}

export interface UserJoinedData {
  userId: string
  username: string
  roomId: string
}

export interface UserLeftData {
  userId: string
  username: string
  roomId: string
}

export interface GameStartingData {
  roomId: string
  startTime: string
  countdown: number
}

export interface CountdownData {
  roomId: string
  countdown: number
}

export interface AnimationStartData {
  roomId: string
  duration: number
  seed: string
}

export interface GameCompletedData {
  roomId: string
  winners: Winner[]
  nextRoundIn: number
  isMultiWinner?: boolean
  winnerId?: string
  winnerAmount?: number
}

export interface RoomResetData {
  roomId: string
  newRoundId: string
}

export interface GlobalGameCompletedData {
  roomId: string
  roomName: string
  winners: Winner[]
  totalPrize: number
}

export interface BalanceUpdatedData {
  userId: string
  newBalance: number
  change: number
  reason: string
}

export interface RoomStatusUpdateData {
  roomId: string
  status: Room['status']
  participantCount: number
}

export interface ErrorData {
  message: string
  code?: string
  details?: unknown
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}