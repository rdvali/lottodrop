export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash?: string;
  balance: number;
  currency: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export enum RoomType {
  FAST_DROP = 'FAST_DROP',
  TIME_DROP = 'TIME_DROP'
}

export enum RoomStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  // FIX: Add RESETTING status to prevent joins during round transition
  RESETTING = 'RESETTING'
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  bet_amount: number;
  min_players: number;
  max_players: number;
  platform_fee_rate: number;
  start_time?: Date;
  countdown_seconds: number;
  status: RoomStatus;
  share_code?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface GameRound {
  id: string;
  room_id: string;
  prize_pool: number;
  commission_amount: number;
  winner_id?: string;
  server_seed: string;
  client_seed?: string;
  result_hash?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface RoundParticipant {
  id: string;
  round_id: string;
  user_id: string;
  bet_amount: number;
  won_amount: number;
  is_winner: boolean;
  joined_at: Date;
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BET = 'BET',
  WIN = 'WIN',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
  COMMISSION = 'COMMISSION',
  REFUND = 'REFUND'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  reference_id?: string;
  description?: string;
  metadata?: any;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  is_system_message: boolean;
  created_at: Date;
  user?: {
    first_name: string;
    last_name: string;
  };
}