import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthPayload, ChatMessage } from '../types';
import { processRoundWinner } from '../controllers/roomController';
import { seedAuditLogger } from '../utils/seedAuditLogger';
import { winnerProcessingQueue } from '../utils/winnerProcessingQueue';
import { NotificationManager } from '../services/notificationManager';

interface SocketWithAuth extends Socket {
  userId?: string;
  joinedRooms?: Set<string>;  // Track multiple rooms
  participantRooms?: Set<string>;  // Track rooms where user is an active participant
}

export class SocketManager {
  private io: SocketServer;
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private roomProcessingTimers: Map<string, NodeJS.Timeout> = new Map(); // Track server-side processing timers
  private processedRounds: Set<string> = new Set(); // Track which rounds have been processed
  private notificationManager: NotificationManager;

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.notificationManager = new NotificationManager(this.io);
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupQueueEventListeners();
  }

  private setupMiddleware() {
    this.io.use(async (socket: SocketWithAuth, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupQueueEventListeners() {
    // Handle successful winner processing
    winnerProcessingQueue.on('winner-processed', async (data: { roomId: string, result: any }) => {
      const { roomId, result } = data;
      console.log(`[Queue Event] Winner processed for room ${roomId}`);
      
      try {
        // Send winner immediately - animation has already completed
        if ('winners' in result && result.winners && result.winners.length > 0) {
          // Multiple winners result
          const winnerIds = result.winners.map((w: any) => w.userId);
          
          // Get all winner names
          const winnersResult = await pool.query(
            'SELECT id, first_name, last_name FROM users WHERE id = ANY($1::uuid[])',
            [winnerIds]
          );
          
          const winnersWithNames = result.winners.map((winner: any) => {
            const userInfo = winnersResult.rows.find((u: any) => u.id === winner.userId);
            return {
              userId: winner.userId,
              position: winner.position,
              prizeAmount: winner.prizeAmount,
              name: userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : 'Unknown'
            };
          });

          // Get room info and round ID for global notification
          const roomInfoResult = await pool.query(
            `SELECT r.name, gr.id as round_id 
             FROM rooms r 
             JOIN game_rounds gr ON gr.room_id = r.id 
             WHERE r.id = $1 AND gr.completed_at IS NOT NULL 
             ORDER BY gr.completed_at DESC 
             LIMIT 1`,
            [roomId]
          );
          const roomName = roomInfoResult.rows[0]?.name || 'Unknown Room';
          const roundId = roomInfoResult.rows[0]?.round_id;
          
          // Notify all participants, not just those in the socket room
          const gameCompletedData = {
            isMultiWinner: true,
            winners: winnersWithNames,
            totalPrize: (result as any).totalPrize,
            platformFeeAmount: (result as any).platformFeeAmount,
            resultHash: result.resultHash,
            roomId: roomId,
            roomName: roomName,
            roundId: roundId
          };
          
          await this.notifyRoomParticipants(roomId, 'game-completed', gameCompletedData);
          
          // Send global notification to ALL connected users for main page
          this.io.emit('global-game-completed', gameCompletedData);

          // Process multi-round notifications through NotificationManager (non-blocking)
          if (roundId) {
            this.notificationManager.processRoundCompletion(
              roundId,
              winnersWithNames,
              { roomId, roomName }
            ).catch(err => {
              console.error('[SocketManager] Notification processing error:', err);
            });
          }

          // Send persistent winner data that survives room state changes
          await this.notifyRoomParticipants(roomId, 'winners-announced', {
            ...gameCompletedData,
            persistentWinners: true,
            announcementTime: Date.now(),
            displayDuration: 30000 // 30 seconds minimum display
          });
          
          // Broadcast room status update
          this.io.emit('room-status-update', {
            roomId: roomId,
            status: 'COMPLETED',
            roomName: roomName
          });
          
          // Emit balance updates for all winners
          for (const winner of result.winners) {
            const balanceResult = await pool.query(
              'SELECT balance FROM users WHERE id = $1',
              [(winner as any).userId]
            );
            
            if (balanceResult.rows.length > 0) {
              const newBalance = parseFloat(balanceResult.rows[0].balance);
              this.io.emit('balance-updated', {
                userId: (winner as any).userId,
                newBalance: newBalance
              });
            }
          }
        } else {
          // Single winner result (backward compatibility)
          const singleResult = result as any;
          const winnerResult = await pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [singleResult.winnerId]
          );

          // Get room info and round ID for global notification
          const roomInfoResult = await pool.query(
            `SELECT r.name, gr.id as round_id 
             FROM rooms r 
             JOIN game_rounds gr ON gr.room_id = r.id 
             WHERE r.id = $1 AND gr.completed_at IS NOT NULL 
             ORDER BY gr.completed_at DESC 
             LIMIT 1`,
            [roomId]
          );
          const roomName = roomInfoResult.rows[0]?.name || 'Unknown Room';
          const roundId = roomInfoResult.rows[0]?.round_id;
          
          // Notify all participants, not just those in the socket room
          const gameCompletedData = {
            isMultiWinner: false,
            winnerId: singleResult.winnerId,
            winnerName: `${winnerResult.rows[0].first_name} ${winnerResult.rows[0].last_name}`,
            winnerAmount: singleResult.winnerAmount,
            commissionAmount: singleResult.commissionAmount,
            platformFeeAmount: singleResult.commissionAmount, // For consistency with multi-winner
            resultHash: result.resultHash,
            roomId: roomId,
            roomName: roomName,
            roundId: roundId
          };

          await this.notifyRoomParticipants(roomId, 'game-completed', gameCompletedData);

          // Send global notification to ALL connected users for main page
          this.io.emit('global-game-completed', gameCompletedData);

          // Process multi-round notifications through NotificationManager
          if (roundId) {
            await this.notificationManager.processRoundCompletion(
              roundId,
              [{
                userId: singleResult.winnerId,
                position: 1,
                prizeAmount: singleResult.winnerAmount,
                name: `${winnerResult.rows[0].first_name} ${winnerResult.rows[0].last_name}`
              }],
              { roomId, roomName }
            );
          }

          // Send persistent winner data that survives room state changes
          await this.notifyRoomParticipants(roomId, 'winners-announced', {
            ...gameCompletedData,
            persistentWinners: true,
            announcementTime: Date.now(),
            displayDuration: 30000 // 30 seconds minimum display
          });
          
          // Broadcast room status update
          this.io.emit('room-status-update', {
            roomId: roomId,
            status: 'COMPLETED',
            roomName: roomName
          });
          
          // Emit balance update event for the winner
          const balanceResult = await pool.query(
            'SELECT balance FROM users WHERE id = $1',
            [singleResult.winnerId]
          );
          
          if (balanceResult.rows.length > 0) {
            const newBalance = parseFloat(balanceResult.rows[0].balance);
            this.io.emit('balance-updated', {
              userId: singleResult.winnerId,
              newBalance: newBalance
            });
          }
        }
        
        // Reset room after short delay to allow proper winner display
        setTimeout(async () => {
          await this.resetRoomForNextRound(roomId);
        }, 2000); // 2 seconds to display winner - frontend handles persistent display
      } catch (error) {
        console.error('CRITICAL: Error processing winner result:', error);
        // Emit error immediately to prevent hanging
        this.io.to(roomId).emit('error', { message: 'Failed to process winner - please refresh' });
      }
    });
    
    // Handle processing failure
    winnerProcessingQueue.on('processing-failed', (data: { roomId: string, error: any }) => {
      const { roomId, error } = data;
      console.error(`[Queue Event] Failed to process winner for room ${roomId}:`, error);
      
      // Notify room about the failure
      this.io.to(roomId).emit('error', { 
        message: 'Failed to select winner. Please contact support.',
        roomId: roomId 
      });
      
      // Reset room status to allow retry
      pool.query(
        'UPDATE rooms SET status = $1 WHERE id = $2',
        ['WAITING', roomId]
      ).catch(err => console.error('Failed to reset room status:', err));
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket: SocketWithAuth) => {
      console.log(`User ${socket.userId} connected`);

      // Check for pending notifications when user connects
      if (socket.userId) {
        await this.notificationManager.checkPendingNotifications(socket.userId);
      }

      socket.on('join-room', async (roomId: string) => {
        console.log(`Socket: User ${socket.userId} joining room ${roomId}`);
        try {
          // Check if user is a participant of the current active round
          const participantResult = await pool.query(
            `SELECT rp.id 
             FROM round_participants rp
             JOIN game_rounds gr ON rp.round_id = gr.id
             WHERE gr.room_id = $1 AND rp.user_id = $2 AND gr.completed_at IS NULL AND gr.archived_at IS NULL`,
            [roomId, socket.userId]
          );

          // Check if the room exists and is active
          const roomResult = await pool.query(
            'SELECT id, status FROM rooms WHERE id = $1 AND is_active = true',
            [roomId]
          );

          if (roomResult.rows.length === 0) {
            console.log(`Socket: Room ${roomId} not found or inactive`);
            socket.emit('error', { message: 'Room not found or inactive' });
            return;
          }

          // Initialize room tracking sets if not exists
          if (!socket.joinedRooms) {
            socket.joinedRooms = new Set<string>();
          }
          if (!socket.participantRooms) {
            socket.participantRooms = new Set<string>();
          }
          
          // Join the socket room
          socket.join(roomId);
          socket.joinedRooms.add(roomId);
          
          // Track if user is an active participant
          const isParticipant = participantResult.rows.length > 0;
          if (isParticipant) {
            socket.participantRooms.add(roomId);
          }
          
          console.log(`Socket: User ${socket.userId} successfully joined room ${roomId} (participant: ${isParticipant})`);
          console.log(`Socket: User ${socket.userId} is now in rooms: ${Array.from(socket.joinedRooms).join(', ')}`);
          
          // Send room state to new user
          await this.sendRoomState(roomId, socket.id);
          
          // Only notify others if user is a participant
          if (isParticipant) {
            // Get user info to send complete data
            const userResult = await pool.query(
              'SELECT first_name, last_name FROM users WHERE id = $1',
              [socket.userId]
            );

            const username = userResult.rows.length > 0
              ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim()
              : 'Player';

            // CRITICAL FIX: Use broadcast.to() to exclude the joining user from receiving their own join event
            // This prevents ALL other users from incorrectly updating their joinedRooms state
            socket.broadcast.to(roomId).emit('user-joined', {
              userId: socket.userId,
              username: username,
              roomId: roomId
            });
          }
        } catch (error) {
          console.error('Join room error:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        
        // Remove from tracking sets
        if (socket.joinedRooms) {
          socket.joinedRooms.delete(roomId);
        }
        
        // Check if user was a participant in this specific room
        const wasParticipant = socket.participantRooms?.has(roomId);
        
        if (wasParticipant) {
          socket.participantRooms?.delete(roomId);

          // Get user info for complete data
          pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [socket.userId]
          ).then(userResult => {
            const username = userResult.rows.length > 0
              ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim()
              : 'Player';

            // CRITICAL FIX: Use broadcast.to() to exclude the leaving user from receiving their own leave event
            socket.broadcast.to(roomId).emit('user-left', {
              userId: socket.userId,
              username: username,
              roomId: roomId
            });
          }).catch(error => {
            console.error('Error getting user info for user-left:', error);
            // Fallback without username - CRITICAL FIX: Use broadcast.to() here as well
            socket.broadcast.to(roomId).emit('user-left', {
              userId: socket.userId,
              username: 'Player',
              roomId: roomId
            });
          });
        }
        
        console.log(`Socket: User ${socket.userId} left room ${roomId}`);
        console.log(`Socket: User ${socket.userId} remaining rooms: ${socket.joinedRooms ? Array.from(socket.joinedRooms).join(', ') : 'none'}`);
      });

      socket.on('send-message', async (data: { roomId: string; message: string }) => {
        try {
          if (!socket.joinedRooms || !socket.joinedRooms.has(data.roomId)) {
            return socket.emit('error', { message: 'Not in this room' });
          }

          // Only participants can send messages
          if (!socket.participantRooms || !socket.participantRooms.has(data.roomId)) {
            return socket.emit('error', { message: 'You must join the game to send messages' });
          }

          // Save message to database
          const result = await pool.query(
            `INSERT INTO chat_messages (room_id, user_id, message)
             VALUES ($1, $2, $3)
             RETURNING id, created_at`,
            [data.roomId, socket.userId, data.message]
          );

          // Get user info
          const userResult = await pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [socket.userId]
          );

          const chatMessage: ChatMessage = {
            id: result.rows[0].id,
            room_id: data.roomId,
            user_id: socket.userId!,
            message: data.message,
            is_system_message: false,
            created_at: result.rows[0].created_at,
            user: userResult.rows[0]
          };

          // Broadcast to room
          this.io.to(data.roomId).emit('new-message', chatMessage);
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('start-countdown', async (roomId: string) => {
        try {
          // Verify room status and start countdown
          const result = await pool.query(
            'SELECT countdown_seconds FROM rooms WHERE id = $1 AND status = $2',
            [roomId, 'ACTIVE']
          );

          if (result.rows.length > 0) {
            const countdownSeconds = result.rows[0].countdown_seconds;
            this.startGameCountdown(roomId, countdownSeconds);
          }
        } catch (error) {
          console.error('Start countdown error:', error);
        }
      });

      // Handle animation completion - add to queue for processing
      socket.on('animation-complete', async (roomId: string) => {
        const processStartTime = Date.now();
        const userInfo = socket.userId ? `by user ${socket.userId}` : 'by anonymous user';
        console.log(`[Animation] Animation complete for room ${roomId} ${userInfo}, adding to processing queue at:`, new Date().toISOString());
        
        // Clear the server-side fallback timer since frontend completed successfully
        const fallbackTimer = this.roomProcessingTimers.get(roomId);
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          this.roomProcessingTimers.delete(roomId);
          console.log(`[Animation] Cleared fallback timer for room ${roomId} - frontend completed successfully`);
        }
        
        try {
          // Get current round ID to ensure we're tracking by round, not room
          const roundResult = await pool.query(
            'SELECT id FROM game_rounds WHERE room_id = $1 AND completed_at IS NULL AND archived_at IS NULL',
            [roomId]
          );
          
          if (roundResult.rows.length === 0) {
            console.log(`[Animation] No active round found for room ${roomId}, skipping processing`);
            return;
          }
          
          const roundId = roundResult.rows[0].id;
          
          // Check if this specific round was already processed
          if (this.processedRounds.has(roundId)) {
            console.log(`[Animation] Round ${roundId} in room ${roomId} already processed, skipping duplicate processing`);
            // Emit confirmation to user to prevent hanging
            socket.emit('processing-status', {
              roomId,
              roundId,
              status: 'already-processed',
              message: 'This round has already been processed'
            });
            return;
          }
          
          // Mark this specific round as processed
          this.processedRounds.add(roundId);
          console.log(`[Animation] Marked round ${roundId} as processed for room ${roomId}`);
          
          // Add to queue for processing
          await winnerProcessingQueue.add(roomId);
          console.log(`[Animation] Successfully queued round ${roundId} for room ${roomId} for winner processing`);
          
        } catch (error) {
          console.error(`[Animation] Error processing animation-complete for room ${roomId}:`, error);
          // Emit error status to prevent user from waiting indefinitely
          socket.emit('processing-status', {
            roomId,
            status: 'error',
            message: 'Failed to process animation completion'
          });
        }
      });
        

      // Handle manual winner modal control from clients
      socket.on('winner-modal-closed', async (data: { roomId: string }) => {
        console.log(`[Modal Control] User ${socket.userId} closed winner modal for room ${data.roomId}`);
        // Track modal closure for analytics if needed
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        // Notify all rooms where user was a participant
        if (socket.participantRooms && socket.participantRooms.size > 0) {
          // Get user info for complete data on disconnect
          pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [socket.userId]
          ).then(userResult => {
            const username = userResult.rows.length > 0
              ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim()
              : 'Player';

            for (const roomId of socket.participantRooms!) {
              // CRITICAL FIX: Use broadcast.to() for disconnect events as well
              socket.broadcast.to(roomId).emit('user-left', {
                userId: socket.userId,
                username: username,
                roomId: roomId
              });
            }
          }).catch(error => {
            console.error('Error getting user info on disconnect:', error);
            // Fallback without username - CRITICAL FIX: Use broadcast.to() here as well
            for (const roomId of socket.participantRooms!) {
              socket.broadcast.to(roomId).emit('user-left', {
                userId: socket.userId,
                username: 'Player',
                roomId: roomId
              });
            }
          });
        }
      });
    });
  }

  private async sendRoomState(roomId: string, socketId?: string) {
    try {
      // Get room info (exclude archived rounds)
      const roomResult = await pool.query(
        `SELECT r.*, 
                COUNT(DISTINCT rp.user_id) as player_count,
                COALESCE(gr.prize_pool, 0) as prize_pool
         FROM rooms r
         LEFT JOIN game_rounds gr ON gr.room_id = r.id AND gr.completed_at IS NULL AND gr.archived_at IS NULL
         LEFT JOIN round_participants rp ON rp.round_id = gr.id
         WHERE r.id = $1
         GROUP BY r.id, r.number_of_winners, gr.prize_pool`,
        [roomId]
      );

      // Get participants (exclude archived rounds)
      const participantsResult = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, rp.bet_amount
         FROM round_participants rp
         JOIN game_rounds gr ON rp.round_id = gr.id
         JOIN users u ON rp.user_id = u.id
         WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL`,
        [roomId]
      );

      // Get recent chat messages
      const messagesResult = await pool.query(
        `SELECT cm.*, u.first_name, u.last_name
         FROM chat_messages cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.room_id = $1
         ORDER BY cm.created_at DESC
         LIMIT 50`,
        [roomId]
      );

      // Check if room was found
      if (roomResult.rows.length === 0) {
        console.error(`Room ${roomId} not found in sendRoomState`);
        if (socketId) {
          this.io.to(socketId).emit('error', { message: 'Room not found' });
        }
        return;
      }

      const roomState = {
        room: roomResult.rows[0],
        participants: participantsResult.rows,
        messages: messagesResult.rows.reverse().map(msg => ({
          id: msg.id,
          room_id: msg.room_id,
          user_id: msg.user_id,
          message: msg.message,
          is_system_message: msg.is_system_message,
          created_at: msg.created_at,
          user: msg.first_name ? {
            first_name: msg.first_name,
            last_name: msg.last_name
          } : null
        }))
      };

      console.log(`Sending room state for room ${roomId} to ${socketId || 'all room members'}`);
      
      if (socketId) {
        this.io.to(socketId).emit('room-state', roomState);
      } else {
        this.io.to(roomId).emit('room-state', roomState);
      }
    } catch (error) {
      console.error('Send room state error:', error);
    }
  }

  private startGameCountdown(roomId: string, seconds: number) {
    let countdown = seconds; // 5 seconds default

    // Clear existing timer if any
    if (this.roomTimers.has(roomId)) {
      clearInterval(this.roomTimers.get(roomId)!);
    }

    // Emit initial countdown value immediately
    this.io.to(roomId).emit('countdown', { roomId, countdown });

    const timer = setInterval(async () => {
      countdown--;

      if (countdown > 0) {
        // Only emit countdown for values > 0
        this.io.to(roomId).emit('countdown', { roomId, countdown });
      } else if (countdown === 0) {
        // Send 0 to trigger "GO!" display
        this.io.to(roomId).emit('countdown', { roomId, countdown: 0 });

        // Wait 1 second for "GO!" to display before starting animation
        setTimeout(() => {
          clearInterval(timer);
          this.roomTimers.delete(roomId);

          // Signal to frontend to start animation
          console.log(`[Animation] Countdown ended for room ${roomId}, signaling animation start`);
          this.io.to(roomId).emit('animation-start', {
            roomId,
            message: 'Countdown completed, starting winner selection animation'
          });
        }, 1000);
        return; // Exit to prevent further countdown decrements
      }

      if (countdown < 0) {
        // Safety check - should not reach here
        clearInterval(timer);
        this.roomTimers.delete(roomId);
        return;
      }
    }, 1000); // Interval runs every second

    // Store timer reference
    this.roomTimers.set(roomId, timer);

    // Set server-side fallback timer to ensure winner processing
    // This runs after the full countdown + GO! + animation time
    const ANIMATION_DURATION = 7000; // 7 seconds for VRF animation
    const totalWaitTime = (seconds + 1) * 1000 + ANIMATION_DURATION; // countdown + 1s for "GO!" + 7s animation

    const fallbackTimer = setTimeout(async () => {
      try {
        // Get current round for server fallback processing
        const fallbackRoundResult = await pool.query(
          'SELECT id FROM game_rounds WHERE room_id = $1 AND completed_at IS NULL AND archived_at IS NULL',
          [roomId]
        );

        if (fallbackRoundResult.rows.length > 0) {
          const fallbackRoundId = fallbackRoundResult.rows[0].id;

          // Check if this specific round has already been processed
          if (!this.processedRounds.has(fallbackRoundId)) {
            console.log(`[Server-Fallback] Auto-processing round ${fallbackRoundId} for room ${roomId} after animation timeout`);
            this.processedRounds.add(fallbackRoundId);
            await winnerProcessingQueue.add(roomId);

            // Emit fallback processing notification to room
            this.io.to(roomId).emit('processing-status', {
              roomId,
              roundId: fallbackRoundId,
              status: 'fallback-processing',
              message: 'Server is processing winner selection due to client timeout'
            });
          } else {
            console.log(`[Server-Fallback] Round ${fallbackRoundId} in room ${roomId} already processed, skipping fallback`);
          }
        } else {
          console.log(`[Server-Fallback] No active round found for room ${roomId}, skipping fallback`);
        }
      } catch (fallbackError) {
        console.error(`[Server-Fallback] Error in fallback processing for room ${roomId}:`, fallbackError);
        // Emit error to room
        this.io.to(roomId).emit('error', {
          message: 'Server fallback processing failed - please refresh',
          roomId: roomId
        });
      }
      // Clean up the timer reference
      this.roomProcessingTimers.delete(roomId);
    }, totalWaitTime);

    // Store the fallback processing timer
    this.roomProcessingTimers.set(roomId, fallbackTimer);
    console.log(`[Server-Fallback] Set fallback timer for room ${roomId} (will trigger in ${totalWaitTime / 1000} seconds)`);
  }

  /**
   * Notify all participants of a room based on database records
   * This ensures notifications reach all participants even if they're not currently in the socket room
   */
  private async notifyRoomParticipants(roomId: string, event: string, data: any) {
    try {
      // Get all participants from the database
      const participantsResult = await pool.query(
        `SELECT DISTINCT rp.user_id 
         FROM round_participants rp
         JOIN game_rounds gr ON rp.round_id = gr.id
         WHERE gr.room_id = $1 AND gr.completed_at IS NULL`,
        [roomId]
      );
      
      if (participantsResult.rows.length > 0) {
        const participantIds = participantsResult.rows.map((p: any) => p.user_id);
        
        // Find all connected sockets for these participants
        const sockets = await this.io.fetchSockets();
        let notificationsSent = 0;
        let socketsNotified = new Set<string>();
        
        // Group sockets by userId to ensure all sockets for each user receive the notification
        const socketsByUserId = new Map<string, typeof sockets[0][]>();
        for (const socket of sockets) {
          const authSocket = socket as unknown as SocketWithAuth;
          if (authSocket.userId && participantIds.includes(authSocket.userId)) {
            if (!socketsByUserId.has(authSocket.userId)) {
              socketsByUserId.set(authSocket.userId, []);
            }
            socketsByUserId.get(authSocket.userId)!.push(socket);
          }
        }
        
        // Send notification to ALL sockets for each participant
        for (const [userId, userSockets] of socketsByUserId) {
          let socketsForThisRoom = 0;
          for (const socket of userSockets) {
            const authSocket = socket as unknown as SocketWithAuth;
            // Verify this socket is actually tracking this room (for multi-room support)
            const shouldNotify = !authSocket.participantRooms || 
                                authSocket.participantRooms.has(roomId) ||
                                (authSocket.joinedRooms && authSocket.joinedRooms.has(roomId));
            
            if (shouldNotify) {
              // Add room-specific data to help frontend identify which room this notification is for
              const notificationData = {
                ...data,
                roomId: roomId,
                targetUserId: userId
              };
              socket.emit(event, notificationData);
              socketsNotified.add(socket.id);
              notificationsSent++;
              socketsForThisRoom++;
            }
          }
          if (socketsForThisRoom > 0) {
            console.log(`[Notification] User ${userId} notified on ${socketsForThisRoom}/${userSockets.length} socket(s) for room ${roomId}`);
          }
        }
        
        console.log(`[Notification] Sent ${event} to ${participantIds.length} participants (${notificationsSent} sockets) of room ${roomId}`);
      }
      
      // Also send to anyone currently viewing the room (for spectators)
      this.io.to(roomId).emit(event, data);
    } catch (error) {
      console.error(`Failed to notify participants of room ${roomId}:`, error);
    }
  }

  private async resetRoomForNextRound(roomId: string) {
    try {
      console.log(`[Room Reset] Starting reset process for room ${roomId}`);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // 1. Archive completed game round by marking it as archived
        const archiveResult = await client.query(
          `UPDATE game_rounds 
           SET archived_at = NOW() 
           WHERE room_id = $1 AND completed_at IS NOT NULL AND archived_at IS NULL
           RETURNING id, server_seed`,
          [roomId]
        );
        
        if (archiveResult.rows.length > 0) {
          const archivedRound = archiveResult.rows[0];
          console.log(`[Room Reset] Archived completed round ${archivedRound.id}`);
        }
        
        // 2. Clean up any incomplete rounds
        const cleanupResult = await client.query(
          `DELETE FROM game_rounds 
           WHERE room_id = $1 AND completed_at IS NULL AND started_at IS NULL
           RETURNING id`,
          [roomId]
        );
        
        if (cleanupResult.rows.length > 0) {
          console.log(`[Room Reset] Cleaned up ${cleanupResult.rows.length} incomplete rounds`);
        }
        
        // 3. Reset room status to WAITING and fetch room info for broadcast
        const roomResetResult = await client.query(
          'UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, type',
          ['WAITING', roomId]
        );
        const roomInfo = roomResetResult.rows[0];
        
        await client.query('COMMIT');
        console.log(`[Room Reset] Successfully reset room ${roomId} for next round`);
        
        // 4. Clean up any processed rounds for this room from tracking
        const completedRounds = archiveResult.rows;
        for (const round of completedRounds) {
          this.processedRounds.delete(round.id);
          console.log(`[Room Reset] Cleared round ${round.id} from processed tracking`);
        }
        
        // 5. Notify all clients that room is ready for next round
        this.io.to(roomId).emit('room-reset', {
          message: 'Room is ready for the next round! Please rejoin to play again.',
          preserveWinnerModal: true, // Signal frontend to keep winner modal open
          newRoundStarted: true
        });
        
        // 6. Send updated room state
        this.sendRoomState(roomId);

        // 7. Broadcast GLOBAL status update for Room List page (CRITICAL for instant UI updates)
        if (roomInfo) {
          this.io.emit('room-status-update', {
            roomId: roomId,
            status: 'WAITING',
            participantCount: 0,
            roomName: roomInfo.name,
            roomType: roomInfo.type,
            resetForNewRound: true
          });
          console.log(`[Room Reset] Broadcasted global status update: WAITING for room ${roomId} (${roomInfo.name})`);
        }

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`[Room Reset] Error resetting room ${roomId}:`, error);
      this.io.to(roomId).emit('room-reset-error', {
        message: 'Failed to reset room. Please refresh the page.'
      });
    }
  }

  public notifyRoomUpdate(roomId: string) {
    this.sendRoomState(roomId);
  }

  public emitToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }

  public startGameForRoom(roomId: string, countdownSeconds: number) {
    console.log(`[SocketManager] Starting game for room ${roomId} with ${countdownSeconds}s countdown`);
    
    this.io.to(roomId).emit('game-starting', {
      message: 'Minimum players reached! Game starting...',
      countdown: countdownSeconds
    });
    
    // Start countdown after a brief delay
    setTimeout(() => {
      console.log(`[SocketManager] Beginning countdown for room ${roomId}`);
      this.startGameCountdown(roomId, countdownSeconds);
    }, 1000);
  }

  public startTimeDropRoom(roomId: string, startTime: Date) {
    const now = new Date();
    const delay = startTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(async () => {
        try {
          // Update room status to active
          await pool.query(
            'UPDATE rooms SET status = $1 WHERE id = $2',
            ['ACTIVE', roomId]
          );

          // Get countdown seconds
          const result = await pool.query(
            'SELECT countdown_seconds FROM rooms WHERE id = $1',
            [roomId]
          );

          if (result.rows.length > 0) {
            this.io.to(roomId).emit('game-starting', {
              roomId,
              countdown: result.rows[0].countdown_seconds
            });
            this.startGameCountdown(roomId, result.rows[0].countdown_seconds);
          }
        } catch (error) {
          console.error('Start time drop room error:', error);
        }
      }, delay);
    }
  }

  public emitGlobal(event: string, data: any) {
    this.io.emit(event, data);
  }

  /**
   * Update a user's participant status for a room
   * This is called when a user joins a game through the REST API
   */
  public async updateUserParticipantStatus(userId: string, roomId: string, isParticipant: boolean) {
    try {
      const sockets = await this.io.fetchSockets();
      let updatedCount = 0;
      
      for (const socket of sockets) {
        const authSocket = socket as unknown as SocketWithAuth;
        if (authSocket.userId === userId) {
          if (!authSocket.participantRooms) {
            authSocket.participantRooms = new Set<string>();
          }
          
          if (isParticipant) {
            authSocket.participantRooms.add(roomId);
            console.log(`[SocketManager] User ${userId} marked as participant in room ${roomId} on socket ${socket.id}`);
          } else {
            authSocket.participantRooms.delete(roomId);
            console.log(`[SocketManager] User ${userId} removed as participant from room ${roomId} on socket ${socket.id}`);
          }
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        console.log(`[SocketManager] Updated participant status for user ${userId} in room ${roomId} on ${updatedCount} socket(s)`);
      }
    } catch (error) {
      console.error(`Failed to update participant status for user ${userId} in room ${roomId}:`, error);
    }
  }
}