// Crypto Deposit Types for Frontend

// ============ Enums ============

export enum CryptoNetwork {
  TRON = 'TRON',
  Ethereum = 'Ethereum',
  Solana = 'Solana',
  Bitcoin = 'Bitcoin',
  Litecoin = 'Litecoin'
}

export enum TokenStandard {
  TRC20 = 'TRC20',
  ERC20 = 'ERC20',
  SPL = 'SPL',
  NATIVE = 'native'
}

export enum DepositStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  UNDERPAID = 'underpaid',
  OVERPAID = 'overpaid',
  EXPIRED = 'expired',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

// ============ Network Types ============

export interface NetworkConfig {
  network: CryptoNetwork;
  currency: string;
  tokenStandard: TokenStandard;
  displayName: string;
  minAmount: number;
  maxAmount: number;
}

// ============ API Response Types ============

export interface CreateDepositRequest {
  amount: number;
  network: CryptoNetwork;
  tokenStandard: TokenStandard;
}

export interface CreateDepositResponse {
  id: string;
  paymentId: string;
  network: string;
  currency: string;
  tokenStandard: string;
  depositAddress: string;
  expectedAmount: number;
  status: DepositStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CryptoDeposit {
  id: string;
  paymentId: string;
  network: string;
  currency: string;
  tokenStandard: string;
  depositAddress: string;
  expectedAmount: number;
  receivedAmount: number;
  feeAmount: number;
  netAmount: number;
  status: DepositStatus;
  txHash?: string;
  confirmations: number;
  expiresAt: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface DepositHistoryResponse {
  success: boolean;
  data: CryptoDeposit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ Socket Event Types ============

export interface DepositStatusUpdate {
  paymentId: string;
  status: DepositStatus;
  receivedAmount?: string;
  confirmations?: number;
  txHash?: string;
}

// ============ Component Types ============

export type DepositStep = 'select' | 'address' | 'status';

export interface DepositModalState {
  step: DepositStep;
  selectedNetwork: NetworkConfig | null;
  amount: number;
  deposit: CreateDepositResponse | null;
  isLoading: boolean;
  error: string | null;
}

// ============ Utility Types ============

export const NETWORK_ICONS: Record<CryptoNetwork, string> = {
  [CryptoNetwork.TRON]: 'TRX',
  [CryptoNetwork.Ethereum]: 'ETH',
  [CryptoNetwork.Solana]: 'SOL',
  [CryptoNetwork.Bitcoin]: 'BTC',
  [CryptoNetwork.Litecoin]: 'LTC'
};

export const STATUS_LABELS: Record<DepositStatus, string> = {
  [DepositStatus.PENDING]: 'Pending',
  [DepositStatus.CONFIRMED]: 'Confirmed',
  [DepositStatus.UNDERPAID]: 'Underpaid',
  [DepositStatus.OVERPAID]: 'Overpaid',
  [DepositStatus.EXPIRED]: 'Expired',
  [DepositStatus.FAILED]: 'Failed',
  [DepositStatus.CANCELED]: 'Canceled'
};

export const STATUS_COLORS: Record<DepositStatus, string> = {
  [DepositStatus.PENDING]: 'text-yellow-400',
  [DepositStatus.CONFIRMED]: 'text-green-400',
  [DepositStatus.UNDERPAID]: 'text-orange-400',
  [DepositStatus.OVERPAID]: 'text-blue-400',
  [DepositStatus.EXPIRED]: 'text-gray-400',
  [DepositStatus.FAILED]: 'text-red-400',
  [DepositStatus.CANCELED]: 'text-gray-400'
};
