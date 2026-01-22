// Pulse2Pay API Types
// Based on official Pulse2Pay Merchant API v1 documentation

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

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  UNDERPAID = 'underpaid',
  OVERPAID = 'overpaid',
  EXPIRED = 'expired',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

export enum AddressMode {
  PER_PAYMENT = 'PER_PAYMENT',
  USER_REUSABLE = 'USER_REUSABLE'
}

// ============ Network Configuration ============

export interface NetworkConfig {
  network: CryptoNetwork;
  currency: string;
  tokenStandard: TokenStandard;
  displayName: string;
  minAmount: number;
  maxAmount: number;
  confirmationsRequired: number;
}

export const SUPPORTED_NETWORKS: NetworkConfig[] = [
  {
    network: CryptoNetwork.TRON,
    currency: 'USDT',
    tokenStandard: TokenStandard.TRC20,
    displayName: 'USDT (TRC-20)',
    minAmount: 10,
    maxAmount: 100000,
    confirmationsRequired: 19
  },
  {
    network: CryptoNetwork.Ethereum,
    currency: 'USDT',
    tokenStandard: TokenStandard.ERC20,
    displayName: 'USDT (ERC-20)',
    minAmount: 50,
    maxAmount: 100000,
    confirmationsRequired: 12
  },
  {
    network: CryptoNetwork.Solana,
    currency: 'USDT',
    tokenStandard: TokenStandard.SPL,
    displayName: 'USDT (Solana)',
    minAmount: 10,
    maxAmount: 100000,
    confirmationsRequired: 32
  }
];

// ============ API Request Types ============

export interface CreatePaymentRequest {
  amount: string;
  currency: string;
  network: CryptoNetwork;
  tokenStandard: TokenStandard;
  addressMode?: AddressMode;
  merchantUserId?: string;
  callbackUrl: string;
  expiresInMinutes?: number;
  metadata?: Record<string, any>;
}

export interface CancelPaymentRequest {
  paymentId: string;
}

// ============ API Response Types ============

// Raw API response from Pulse2Pay (uses different field names)
export interface Pulse2PayRawResponse {
  paymentId: string;
  status: PaymentStatus;
  network: CryptoNetwork;
  currency: string;
  amount: string;
  generatedAddress: string;
  expiresAt: string;
  merchantId?: string;
  tokenStandard?: TokenStandard;
  addressMode?: AddressMode;
  merchantUserId?: string;
  receivedAmount?: string;
  feeAmount?: string;
  netAmount?: string;
  txHash?: string;
  confirmations?: number;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

// Normalized payment object for internal use
export interface Pulse2PayPayment {
  id: string;
  merchantId?: string;
  amount: string;
  currency: string;
  network: CryptoNetwork;
  tokenStandard?: TokenStandard;
  depositAddress: string;
  addressMode?: AddressMode;
  merchantUserId?: string;
  status: PaymentStatus;
  receivedAmount?: string;
  feeAmount?: string;
  netAmount?: string;
  txHash?: string;
  confirmations?: number;
  expiresAt: string;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentResponse {
  success: boolean;
  data: Pulse2PayPayment;
}

export interface GetPaymentResponse {
  success: boolean;
  data: Pulse2PayPayment;
}

export interface CancelPaymentResponse {
  success: boolean;
  data: {
    paymentId: string;
    status: PaymentStatus;
  };
}

export interface Pulse2PayError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============ Webhook Types ============

export enum WebhookEventType {
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_UNDERPAID = 'payment.underpaid',
  PAYMENT_OVERPAID = 'payment.overpaid',
  PAYMENT_EXPIRED = 'payment.expired',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELED = 'payment.canceled'
}

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: {
    paymentId: string;
    merchantId: string;
    status: PaymentStatus;
    amount: string;
    currency: string;
    network: CryptoNetwork;
    tokenStandard: TokenStandard;
    depositAddress: string;
    receivedAmount?: string;
    feeAmount?: string;
    netAmount?: string;
    txHash?: string;
    confirmations?: number;
    confirmedAt?: string;
    merchantUserId?: string;
    metadata?: Record<string, any>;
  };
}

// ============ Internal Types ============

export interface CryptoDeposit {
  id: string;
  userId: string;
  transactionId?: string;
  paymentId: string;
  network: string;
  currency: string;
  tokenStandard?: string;
  depositAddress: string;
  expectedAmount: number;
  receivedAmount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  txHash?: string;
  confirmations: number;
  expiresAt: Date;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  addressMode: string;
  metadata?: Record<string, any>;
  webhookData: WebhookPayload[];
  errorMessage?: string;
}

export interface CreateDepositInput {
  userId: string;
  amount: number;
  network: CryptoNetwork;
  tokenStandard: TokenStandard;
}

export interface DepositHistoryFilters {
  userId: string;
  status?: PaymentStatus;
  network?: CryptoNetwork;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

// ============ Admin Types ============

export interface AdminDepositFilters {
  status?: PaymentStatus;
  network?: CryptoNetwork;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface DepositStats {
  total: number;
  totalAmount: number;
  pending: number;
  pendingAmount: number;
  confirmed: number;
  confirmedAmount: number;
  failed: number;
  failedAmount: number;
  expired: number;
  expiredAmount: number;
}
