import pool from '../config/database';
import { Server } from 'socket.io';

interface RoundCompletionData {
  roundId: string;
  roomId: string;
  roomName: string;
  userId: string;
  username: string;
  position?: number;
  prizeAmount?: number;
  betAmount: number;
  isWinner: boolean;
  completedAt: Date;
}

interface UserNotificationData {
  userId: string;
  rounds: RoundCompletionData[];
  totalWinnings: number;
  totalRounds: number;
}

export class NotificationManager {
  private io: Server;
  private pendingNotifications: Map<string, RoundCompletionData[]> = new Map();
  private processedRounds: Set<string> = new Set();
  private processingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Get all active rounds for a specific user across all rooms
   */
  async getUserActiveRounds(userId: string): Promise<any[]> {
    const query = `
      SELECT
        gr.id as round_id,
        gr.room_id,
        r.name as room_name,
        rp.bet_amount,
        gr.prize_pool,
        gr.created_at
      FROM game_rounds gr
      JOIN round_participants rp ON rp.round_id = gr.id
      JOIN rooms r ON r.id = gr.room_id
      WHERE rp.user_id = $1
        AND gr.completed_at IS NULL
        AND gr.archived_at IS NULL
      ORDER BY gr.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get all users participating in a specific round
   */
  async getRoundParticipants(roundId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT user_id
      FROM round_participants
      WHERE round_id = $1
    `;

    const result = await pool.query(query, [roundId]);
    return result.rows.map((row: any) => row.user_id);
  }

  /**
   * Process round completion and queue notifications for all participants
   */
  async processRoundCompletion(roundId: string, winners: any[], roomData: any): Promise<void> {
    try {
      // Check if this round was already processed
      if (this.processedRounds.has(roundId)) {
        console.log(`[NotificationManager] Round ${roundId} already processed, skipping`);
        return;
      }

      // Mark round as processed
      this.processedRounds.add(roundId);

      // Clean up old processed rounds after 5 minutes
      setTimeout(() => {
        this.processedRounds.delete(roundId);
      }, 5 * 60 * 1000);

      // Get round details with all participants and user info in a single query (optimized - no N+1)
      const roundResult = await pool.query(
        `SELECT
          gr.*,
          r.name as room_name,
          r.bet_amount,
          rp.user_id,
          u.first_name,
          u.last_name
        FROM game_rounds gr
        JOIN rooms r ON r.id = gr.room_id
        JOIN round_participants rp ON rp.round_id = gr.id
        JOIN users u ON u.id = rp.user_id
        WHERE gr.id = $1`,
        [roundId]
      );

      if (roundResult.rows.length === 0) {
        console.error(`Round ${roundId} not found or has no participants`);
        return;
      }

      const round = roundResult.rows[0];

      // Process notifications for each participant (all data already fetched)
      for (const participant of roundResult.rows) {
        const userId = participant.user_id;
        const username = `${participant.first_name} ${participant.last_name}`.trim() || 'Player';

        // Check if user is a winner
        const winnerData = winners.find(w => w.userId === userId);
        const isWinner = !!winnerData;

        const notificationData: RoundCompletionData = {
          roundId: roundId,
          roomId: round.room_id,
          roomName: round.room_name,
          userId: userId,
          username: username,
          position: winnerData?.position,
          prizeAmount: winnerData?.prizeAmount || 0,
          betAmount: parseFloat(round.bet_amount),
          isWinner: isWinner,
          completedAt: new Date()
        };

        // Queue the notification
        this.queueNotification(userId, notificationData);
      }

      // Process queued notifications
      await this.processNotificationQueue();

    } catch (error) {
      console.error('Error processing round completion notifications:', error);
    }
  }

  /**
   * Queue a notification for batch processing
   */
  private queueNotification(userId: string, notification: RoundCompletionData): void {
    if (!this.pendingNotifications.has(userId)) {
      this.pendingNotifications.set(userId, []);
    }

    const userNotifications = this.pendingNotifications.get(userId)!;

    // Check if this exact notification already exists
    const isDuplicate = userNotifications.some(n =>
      n.roundId === notification.roundId &&
      n.userId === notification.userId
    );

    if (isDuplicate) {
      console.log(`[NotificationManager] Duplicate notification for round ${notification.roundId}, user ${userId} - skipping`);
      return;
    }

    userNotifications.push(notification);

    // Clear any existing timeout for this user
    if (this.processingTimeouts.has(userId)) {
      clearTimeout(this.processingTimeouts.get(userId)!);
    }

    // Set a new timeout to process notifications after a short delay
    // This allows multiple rounds completing close together to be batched
    const timeout = setTimeout(() => {
      this.processUserNotifications(userId);
      this.processingTimeouts.delete(userId);
    }, 500);

    this.processingTimeouts.set(userId, timeout);
  }

  /**
   * Process all queued notifications
   */
  private async processNotificationQueue(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [userId, notifications] of this.pendingNotifications.entries()) {
      if (notifications.length > 0) {
        promises.push(this.sendUserNotifications(userId, notifications));
      }
    }

    await Promise.all(promises);
    this.pendingNotifications.clear();
  }

  /**
   * Process notifications for a specific user
   */
  private async processUserNotifications(userId: string): Promise<void> {
    const notifications = this.pendingNotifications.get(userId);
    if (!notifications || notifications.length === 0) {
      return;
    }

    // Remove from pending and send
    this.pendingNotifications.delete(userId);
    await this.sendUserNotifications(userId, notifications);
  }

  /**
   * Send notifications to a user (supports multiple rounds)
   */
  private async sendUserNotifications(userId: string, notifications: RoundCompletionData[]): Promise<void> {
    try {
      // Calculate totals
      const totalWinnings = notifications.reduce((sum, n) => sum + (n.prizeAmount || 0), 0);
      const winningRounds = notifications.filter(n => n.isWinner);

      // Create notification payload
      const payload: UserNotificationData = {
        userId: userId,
        rounds: notifications,
        totalWinnings: totalWinnings,
        totalRounds: notifications.length
      };

      // Send multi-round notification to the specific user
      const userSockets = await this.getUserSockets(userId);

      // Only send multi-round if there are multiple rounds, otherwise send individual
      if (notifications.length > 1) {
        for (const socketId of userSockets) {
          this.io.to(socketId).emit('multi-round-completed', payload);
        }
      } else if (notifications.length === 1) {
        // For single round, only send personal-round-completed
        const notification = notifications[0];
        const individualPayload = {
          roomId: notification.roomId,
          roomName: notification.roomName,
          roundId: notification.roundId,
          userId: notification.userId,
          username: notification.username,
          isWinner: notification.isWinner,
          prizeAmount: notification.prizeAmount,
          betAmount: notification.betAmount,
          position: notification.position
        };

        for (const socketId of userSockets) {
          this.io.to(socketId).emit('personal-round-completed', individualPayload);
        }
      }

      // Note: global-game-completed is already sent by socketManager.ts, no need to duplicate

      // Store notifications in database for persistence
      await this.storeNotifications(userId, notifications);

    } catch (error) {
      console.error(`Error sending notifications to user ${userId}:`, error);
    }
  }

  /**
   * Get all socket IDs for a specific user
   */
  private async getUserSockets(userId: string): Promise<string[]> {
    const sockets = await this.io.fetchSockets();
    return sockets
      .filter((socket: any) => socket.userId === userId)
      .map((socket: any) => socket.id);
  }

  /**
   * Store notifications in database for persistence
   */
  private async storeNotifications(userId: string, notifications: RoundCompletionData[]): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const notification of notifications) {
        await client.query(
          `INSERT INTO notifications (
            user_id,
            type,
            subtype,
            title,
            message,
            room_id,
            round_id,
            amount,
            priority,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            userId,
            'game',
            notification.isWinner ? 'game_win' : 'game_result',
            notification.isWinner
              ? `You won in ${notification.roomName}!`
              : `Round completed in ${notification.roomName}`,
            notification.isWinner
              ? `Congratulations! You won $${notification.prizeAmount} in position ${notification.position}`
              : `The round has ended. Better luck next time!`,
            notification.roomId,
            notification.roundId,
            notification.prizeAmount || 0,
            notification.isWinner ? 1 : 3, // Priority: 1=Critical for wins, 3=Normal for losses
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing notifications:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check and send pending notifications for a user when they come online
   */
  async checkPendingNotifications(userId: string): Promise<void> {
    try {
      const query = `
        SELECT * FROM notifications
        WHERE user_id = $1
          AND is_read = false
          AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length > 0) {
        // Send pending notifications to the user
        const userSockets = await this.getUserSockets(userId);
        for (const socketId of userSockets) {
          this.io.to(socketId).emit('pending-notifications', {
            notifications: result.rows,
            count: result.rows.length
          });
        }
      }
    } catch (error) {
      console.error(`Error checking pending notifications for user ${userId}:`, error);
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
    try {
      await pool.query(
        `UPDATE notifications
         SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, notificationIds]
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string): Promise<any> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
          COUNT(CASE WHEN subtype = 'game_win' THEN 1 END) as win_notifications,
          COALESCE(SUM(amount), 0) as total_winnings
        FROM notifications
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '7 days'
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return null;
    }
  }
}