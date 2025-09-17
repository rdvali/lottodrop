import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthPayload } from '../types';
import { RealTimeDataManager } from '../services/RealTimeDataManager';
import { FinancialCalculationEngine } from '../services/FinancialCalculationEngine';
import { EventBatcher } from '../services/EventBatcher';
import { SecurityManager } from '../services/SecurityManager';

interface SocketWithAuth extends Socket {
  userId?: string;
  roomId?: string;
  isParticipant?: boolean;
  lastActivity?: Date;
}

// Enhanced socket event types for real-time financial updates
export interface FinancialUpdateEvent {
  type: 'balance' | 'prize_pool' | 'transaction' | 'player_state';
  userId?: string;
  roomId: string;
  data: any;
  timestamp: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PlayerFinancialState {
  userId: string;
  balance: number;
  betAmount: number;
  potentialWinnings: number;
  transactionHistory: TransactionSummary[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TransactionSummary {
  id: string;
  type: string;
  amount: number;
  status: string;
  timestamp: Date;
}

export class EnhancedSocketManager {
  private io: SocketServer;
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private dataManager: RealTimeDataManager;
  private calculationEngine: FinancialCalculationEngine;
  private eventBatcher: EventBatcher;
  private securityManager: SecurityManager;
  private activeConnections: Map<string, SocketWithAuth> = new Map();

  // Performance monitoring
  private performanceMetrics = {
    eventsSent: 0,
    averageLatency: 0,
    peakConnections: 0,
    errorRate: 0
  };

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      // Enhanced performance settings
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      // Enable compression for large payloads
      compression: true,
      // Connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
      }
    });

    this.dataManager = new RealTimeDataManager();
    this.calculationEngine = new FinancialCalculationEngine();
    this.eventBatcher = new EventBatcher(this.io);
    this.securityManager = new SecurityManager();

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupHeartbeat();
    this.setupPerformanceMonitoring();
  }

  private setupMiddleware() {
    this.io.use(async (socket: SocketWithAuth, next) => {
      const startTime = Date.now();
      
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        
        // Security checks
        const securityResult = await this.securityManager.validateConnection(decoded.userId, socket.handshake.address);
        if (!securityResult.isValid) {
          return next(new Error(`Security violation: ${securityResult.reason}`));
        }

        socket.userId = decoded.userId;
        socket.lastActivity = new Date();
        this.activeConnections.set(socket.id, socket);

        // Track connection metrics
        this.performanceMetrics.peakConnections = Math.max(
          this.performanceMetrics.peakConnections, 
          this.activeConnections.size
        );

        const latency = Date.now() - startTime;
        this.updateAverageLatency(latency);

        next();
      } catch (err) {
        console.error('Socket authentication error:', err);
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: SocketWithAuth) => {
      console.log(`Enhanced Socket: User ${socket.userId} connected`);

      // Real-time financial data subscription
      socket.on('subscribe-financial-updates', async (roomId: string) => {
        try {
          await this.subscribeToFinancialUpdates(socket, roomId);
        } catch (error) {
          this.handleSocketError(socket, 'subscription-error', error);
        }
      });

      // Enhanced room joining with financial state
      socket.on('join-room-enhanced', async (data: { roomId: string, preferences?: any }) => {
        try {
          await this.handleEnhancedRoomJoin(socket, data.roomId, data.preferences);
        } catch (error) {
          this.handleSocketError(socket, 'join-room-error', error);
        }
      });

      // Real-time balance inquiries
      socket.on('request-balance-update', async () => {
        try {
          const balance = await this.dataManager.getUserBalance(socket.userId!);
          socket.emit('balance-update', {
            userId: socket.userId,
            balance,
            timestamp: new Date(),
            source: 'realtime_request'
          });
        } catch (error) {
          this.handleSocketError(socket, 'balance-error', error);
        }
      });

      // Financial state monitoring
      socket.on('request-financial-state', async (roomId: string) => {
        try {
          const financialState = await this.getPlayerFinancialState(socket.userId!, roomId);
          socket.emit('financial-state-update', financialState);
        } catch (error) {
          this.handleSocketError(socket, 'financial-state-error', error);
        }
      });

      // Transaction status tracking
      socket.on('track-transaction', async (transactionId: string) => {
        try {
          await this.trackTransaction(socket, transactionId);
        } catch (error) {
          this.handleSocketError(socket, 'transaction-tracking-error', error);
        }
      });

      // Heartbeat for connection health
      socket.on('heartbeat', () => {
        socket.lastActivity = new Date();
        socket.emit('heartbeat-ack', { timestamp: new Date() });
      });

      // Enhanced disconnect handling
      socket.on('disconnect', (reason) => {
        console.log(`Enhanced Socket: User ${socket.userId} disconnected - ${reason}`);
        this.activeConnections.delete(socket.id);
        this.cleanupUserSubscriptions(socket.userId!);
      });
    });
  }

  private async subscribeToFinancialUpdates(socket: SocketWithAuth, roomId: string) {
    // Join room for updates
    socket.join(roomId);
    socket.roomId = roomId;

    // Send initial financial snapshot
    const snapshot = await this.getFinancialSnapshot(roomId);
    socket.emit('financial-snapshot', snapshot);

    // Subscribe to real-time updates
    await this.dataManager.subscribeToRoomUpdates(roomId, socket.userId!);
  }

  private async handleEnhancedRoomJoin(socket: SocketWithAuth, roomId: string, preferences?: any) {
    // Validate room and user permissions
    const roomValidation = await this.securityManager.validateRoomAccess(socket.userId!, roomId);
    if (!roomValidation.hasAccess) {
      throw new Error(roomValidation.reason);
    }

    socket.join(roomId);
    socket.roomId = roomId;

    // Get comprehensive room state including financial data
    const roomState = await this.getEnhancedRoomState(roomId, socket.userId!);
    socket.emit('enhanced-room-state', roomState);

    // Start real-time updates
    this.startFinancialUpdatesForUser(socket.userId!, roomId);
  }

  private async getPlayerFinancialState(userId: string, roomId: string): Promise<PlayerFinancialState> {
    const [balance, betAmount, potentialWinnings, transactions, riskLevel] = await Promise.all([
      this.dataManager.getUserBalance(userId),
      this.dataManager.getUserBetAmount(userId, roomId),
      this.calculationEngine.calculatePotentialWinnings(userId, roomId),
      this.dataManager.getRecentTransactions(userId, 10),
      this.calculationEngine.assessRiskLevel(userId, roomId)
    ]);

    return {
      userId,
      balance,
      betAmount,
      potentialWinnings,
      transactionHistory: transactions,
      riskLevel
    };
  }

  private async getFinancialSnapshot(roomId: string) {
    return {
      prizePool: await this.dataManager.getCurrentPrizePool(roomId),
      participantCount: await this.dataManager.getParticipantCount(roomId),
      averageBet: await this.calculationEngine.getAverageBetAmount(roomId),
      estimatedWinnings: await this.calculationEngine.getEstimatedWinnings(roomId),
      platformFee: await this.calculationEngine.getPlatformFeeAmount(roomId),
      timestamp: new Date()
    };
  }

  private async getEnhancedRoomState(roomId: string, userId: string) {
    const [roomInfo, financialState, participants, recentActivity] = await Promise.all([
      this.dataManager.getRoomInfo(roomId),
      this.getPlayerFinancialState(userId, roomId),
      this.dataManager.getRoomParticipants(roomId),
      this.dataManager.getRecentRoomActivity(roomId, 20)
    ]);

    return {
      room: roomInfo,
      financialState,
      participants,
      recentActivity,
      timestamp: new Date()
    };
  }

  // Enhanced prize pool broadcasting with batching
  public async broadcastPrizePoolUpdate(roomId: string, update: any) {
    const enhancedUpdate = {
      ...update,
      timestamp: new Date(),
      calculations: await this.calculationEngine.getPrizePoolBreakdown(roomId)
    };

    // Use event batcher for performance
    this.eventBatcher.queueEvent(roomId, 'prize-pool-update', enhancedUpdate, 'HIGH');
  }

  // Enhanced balance update with real-time validation
  public async broadcastBalanceUpdate(userId: string, update: any) {
    // Validate balance change for security
    const validation = await this.securityManager.validateBalanceChange(userId, update);
    if (!validation.isValid) {
      console.error(`Invalid balance update for user ${userId}:`, validation.reason);
      return;
    }

    const enhancedUpdate = {
      ...update,
      timestamp: new Date(),
      validated: true,
      source: 'system'
    };

    // Broadcast to user's active sockets
    this.io.emit('balance-updated', enhancedUpdate);
    
    // Update cached data
    await this.dataManager.updateUserBalanceCache(userId, update.newBalance);
  }

  // Financial calculation updates
  public async broadcastFinancialCalculations(roomId: string) {
    const calculations = await this.calculationEngine.getComprehensiveCalculations(roomId);
    
    this.eventBatcher.queueEvent(roomId, 'financial-calculations', {
      roomId,
      calculations,
      timestamp: new Date()
    }, 'MEDIUM');
  }

  // Transaction status updates
  private async trackTransaction(socket: SocketWithAuth, transactionId: string) {
    const subscription = await this.dataManager.subscribeToTransactionUpdates(transactionId);
    
    subscription.on('status-change', (status) => {
      socket.emit('transaction-status-update', {
        transactionId,
        status,
        timestamp: new Date()
      });
    });
  }

  // Performance and health monitoring
  private setupPerformanceMonitoring() {
    setInterval(() => {
      const metrics = {
        ...this.performanceMetrics,
        activeConnections: this.activeConnections.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date()
      };

      // Emit to admin dashboard if needed
      this.io.emit('performance-metrics', metrics);

      // Log performance data
      console.log('[Performance]', {
        connections: metrics.activeConnections,
        events: metrics.eventsSent,
        avgLatency: `${metrics.averageLatency}ms`,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`
      });
    }, 30000); // Every 30 seconds
  }

  private setupHeartbeat() {
    setInterval(() => {
      const staleThreshold = new Date(Date.now() - 60000); // 1 minute
      
      this.activeConnections.forEach((socket, socketId) => {
        if (socket.lastActivity && socket.lastActivity < staleThreshold) {
          console.log(`Cleaning up stale connection for user ${socket.userId}`);
          socket.disconnect();
          this.activeConnections.delete(socketId);
        }
      });
    }, 30000);
  }

  private startFinancialUpdatesForUser(userId: string, roomId: string) {
    // Subscribe to all relevant financial data streams
    const subscriptions = [
      `balance:${userId}`,
      `room:${roomId}:prize_pool`,
      `room:${roomId}:participants`,
      `room:${roomId}:calculations`
    ];

    subscriptions.forEach(channel => {
      this.dataManager.subscribe(channel, (data) => {
        this.io.to(userId).emit('financial-update', {
          channel,
          data,
          timestamp: new Date()
        });
      });
    });
  }

  private cleanupUserSubscriptions(userId: string) {
    this.dataManager.cleanupSubscriptions(userId);
  }

  private handleSocketError(socket: SocketWithAuth, eventType: string, error: any) {
    console.error(`Socket error [${eventType}] for user ${socket.userId}:`, error);
    
    this.performanceMetrics.errorRate = 
      (this.performanceMetrics.errorRate * 0.9) + (0.1 * 1); // Exponential moving average

    socket.emit('error', {
      type: eventType,
      message: 'An error occurred processing your request',
      timestamp: new Date()
    });
  }

  private updateAverageLatency(latency: number) {
    this.performanceMetrics.averageLatency = 
      (this.performanceMetrics.averageLatency * 0.9) + (latency * 0.1);
  }

  // Public interface methods
  public getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      activeConnections: this.activeConnections.size
    };
  }

  public async getHealthStatus() {
    return {
      status: 'healthy',
      connections: this.activeConnections.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    };
  }
}