import { Request, Response } from 'express';
import pool from '../config/database';
import { RoomType, RoomStatus, TransactionType, TransactionStatus } from '../types';
import { generateShareCode, generateServerSeed, generateHash, selectWinner, generateClientSeed, generateRoundNonce, verifyVRFProof } from '../utils/crypto';
import { seedAuditLogger } from '../utils/seedAuditLogger';
import { socketManager } from '../index';
import { processMultipleRoundWinners } from '../services/multiWinnerService';

export const createRoom = async (req: Request, res: Response) => {
  const { name, type, betAmount, minPlayers, maxPlayers, startTime, numberOfWinners, platformFeeRate, isActive } = req.body;
  const userId = req.user!.userId;

  try {
    // Validate input
    if (!name || !type || !betAmount || !minPlayers || !maxPlayers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (type === RoomType.TIME_DROP && !startTime) {
      return res.status(400).json({ error: 'Start time is required for TIME_DROP rooms' });
    }

    // Validate numberOfWinners if provided
    const validNumberOfWinners = numberOfWinners && numberOfWinners > 0 ? numberOfWinners : 1;
    if (validNumberOfWinners > maxPlayers) {
      return res.status(400).json({ error: 'Number of winners cannot exceed maximum players' });
    }

    // Validate platform fee rate (convert from percentage to decimal)
    const validPlatformFeeRate = platformFeeRate >= 0 && platformFeeRate <= 100 ? platformFeeRate / 100 : 0.05;
    
    // Validate isActive (default to true if not provided)
    const validIsActive = isActive !== undefined ? isActive : true;

    const shareCode = generateShareCode();

    const result = await pool.query(
      `INSERT INTO rooms (name, type, bet_amount, min_players, max_players, start_time, share_code, created_by, number_of_winners, platform_fee_rate, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, type, betAmount, minPlayers, maxPlayers, startTime || null, shareCode, userId, validNumberOfWinners, validPlatformFeeRate, validIsActive]
    );

    return res.status(201).json({
      message: 'Room created successfully',
      room: result.rows[0]
    });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;

    // FIX: Show WAITING, ACTIVE, and COMPLETED rooms
    // COMPLETED rooms are shown during the 10-second reset transition period
    // This prevents rooms from disappearing during the reset, ensuring consistent UX for all users
    let query = `
      SELECT
        r.*,
        COUNT(DISTINCT rp.user_id) as current_players,
        COALESCE(SUM(rp.bet_amount), 0) as current_prize_pool,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', rp.id,
              'userId', rp.user_id,
              'username', COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, 'Player'),
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatarUrl', null,
              'joinedAt', rp.joined_at,
              'status', 'active'
            )
          ) FILTER (WHERE rp.user_id IS NOT NULL),
          '[]'::json
        ) as participants
      FROM rooms r
      LEFT JOIN game_rounds gr ON gr.room_id = r.id AND gr.completed_at IS NULL AND gr.archived_at IS NULL
      LEFT JOIN round_participants rp ON rp.round_id = gr.id
      LEFT JOIN users u ON u.id = rp.user_id
      WHERE r.status IN ('WAITING', 'ACTIVE', 'COMPLETED')
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND r.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ' GROUP BY r.id ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    // Debug logging for Fast Drop #6
    const fastDrop6 = result.rows.find(r => r.name === 'Fast Drop #6');
    if (fastDrop6) {
      console.log('[DEBUG] Fast Drop #6 from DB:', {
        name: fastDrop6.name,
        status: fastDrop6.status,
        current_players: fastDrop6.current_players,
        participants: fastDrop6.participants
      });
    }

    return res.json({
      rooms: result.rows.map(room => ({
        ...room,
        currentPlayers: parseInt(room.current_players),
        currentPrizePool: parseFloat(room.current_prize_pool),
        participants: room.participants || []
      }))
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  const { roomId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        r.*,
        COUNT(DISTINCT rp.user_id) as current_players,
        COALESCE(SUM(rp.bet_amount), 0) as current_prize_pool,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', rp.id,
              'userId', rp.user_id,
              'username', COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, 'Player'),
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatarUrl', null,
              'joinedAt', rp.joined_at,
              'status', 'active'
            )
          ) FILTER (WHERE rp.user_id IS NOT NULL),
          '[]'::json
        ) as participants
      FROM rooms r
      LEFT JOIN game_rounds gr ON gr.room_id = r.id AND gr.completed_at IS NULL AND gr.archived_at IS NULL
      LEFT JOIN round_participants rp ON rp.round_id = gr.id
      LEFT JOIN users u ON u.id = rp.user_id
      WHERE r.id = $1
      GROUP BY r.id`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = result.rows[0];
    return res.json({
      room: {
        ...room,
        currentPlayers: parseInt(room.current_players),
        currentPrizePool: parseFloat(room.current_prize_pool)
      },
      participants: room.participants || []
    });
  } catch (error) {
    console.error('Get room by id error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRoomByShareCode = async (req: Request, res: Response) => {
  const { shareCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE share_code = $1',
      [shareCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json({ room: result.rows[0] });
  } catch (error) {
    console.error('Get room by share code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.userId;
  
  console.log(`User ${userId} attempting to join room ${roomId}`);

  const client = await pool.connect();
  let shouldStartCountdown = false;

  try {
    await client.query('BEGIN');

    // Get room details with lock
    const roomResult = await client.query(
      'SELECT * FROM rooms WHERE id = $1 FOR UPDATE',
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // Get or create current round (exclude archived rounds)
    let roundResult = await client.query(
      'SELECT id, server_seed, created_at FROM game_rounds WHERE room_id = $1 AND completed_at IS NULL AND archived_at IS NULL',
      [roomId]
    );

    // Check if user is already a participant in the current round
    let isAlreadyParticipant = false;
    if (roundResult.rows.length > 0) {
      const participantCheck = await client.query(
        'SELECT id FROM round_participants WHERE round_id = $1 AND user_id = $2',
        [roundResult.rows[0].id, userId]
      );
      isAlreadyParticipant = participantCheck.rows.length > 0;
    }

    // FIX: Block joins during RESETTING status or if not WAITING
    // RESETTING = transition period between rounds (10s countdown on frontend)
    if (room.status === RoomStatus.RESETTING) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Room is preparing for the next round. Please wait.',
        countdown: true // Indicate this is a countdown-related rejection
      });
    }

    // If room is COMPLETED, check if enough time has passed (server-side countdown validation)
    if (room.status === RoomStatus.COMPLETED) {
      // Get the most recent completed round to check timing
      const completedRoundResult = await client.query(
        `SELECT completed_at FROM game_rounds
         WHERE room_id = $1 AND completed_at IS NOT NULL
         ORDER BY completed_at DESC LIMIT 1`,
        [roomId]
      );

      if (completedRoundResult.rows.length > 0) {
        const completedAt = new Date(completedRoundResult.rows[0].completed_at);
        const now = new Date();
        const elapsedSeconds = (now.getTime() - completedAt.getTime()) / 1000;

        // FIX: Enforce 10-second countdown server-side
        const MIN_COUNTDOWN_SECONDS = 10;

        if (elapsedSeconds < MIN_COUNTDOWN_SECONDS) {
          const remainingSeconds = Math.ceil(MIN_COUNTDOWN_SECONDS - elapsedSeconds);
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Please wait ${remainingSeconds} seconds before joining the next round.`,
            countdown: true,
            remainingSeconds: remainingSeconds
          });
        }
      }
    }

    // If room is not WAITING and user is not already a participant, block entry
    if (room.status !== RoomStatus.WAITING && !isAlreadyParticipant) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Room is not accepting new players' });
    }

    // If user is already a participant, allow them to re-enter without paying
    if (isAlreadyParticipant) {
      await client.query('COMMIT');
      
      // Notify via socket that user rejoined
      socketManager.emitToRoom(roomId, 'user-rejoined', {
        userId,
        message: 'User rejoined the room'
      });
      
      return res.json({ 
        message: 'Rejoined room successfully',
        roomId,
        roundId: roundResult.rows[0].id,
        alreadyJoined: true
      });
    }

    let roundId;
    if (roundResult.rows.length === 0) {
      // Create new round with fresh server seed enhanced with room context
      const serverSeed = generateServerSeed(roomId);
      console.log(`[Room Join] Creating new round for room ${roomId} with server seed:`, serverSeed);
      
      try {
        const createRoundResult = await client.query(
          `INSERT INTO game_rounds (room_id, server_seed)
           VALUES ($1, $2)
           RETURNING id`,
          [roomId, serverSeed]
        );
        roundId = createRoundResult.rows[0].id;
        console.log(`[Room Join] New round created with ID: ${roundId} for room ${roomId}`);
        
        // Update audit log with the round ID now that it's created
        seedAuditLogger.logSeedGeneration({
          roomId,
          roundId,
          serverSeed,
          entropySource: 'enhanced_with_room_context',
          context: 'room_join_new_round'
        }).catch(err => console.error('[AUDIT] Failed to update seed generation log with round ID:', err));
        
      } catch (error: any) {
        // Check if this is a unique constraint violation (potential seed reuse)
        if (error.code === '23505' && error.constraint === 'idx_unique_server_seed_per_room_active') {
          console.error(`[SECURITY] Attempted server seed reuse in room ${roomId}:`, serverSeed);
          
          // Log security event
          seedAuditLogger.logSecurityEvent({
            eventType: 'SEED_REUSE_ATTEMPT',
            roomId,
            serverSeed,
            details: {
              error: error.message,
              constraint: error.constraint,
              userId,
              timestamp: new Date().toISOString()
            },
            severity: 'HIGH'
          }).catch(err => console.error('[AUDIT] Failed to log security event:', err));
          
          // Generate a new seed and try again
          const newServerSeed = generateServerSeed(roomId);
          console.log(`[SECURITY] Regenerating server seed for room ${roomId}:`, newServerSeed);
          
          const retryResult = await client.query(
            `INSERT INTO game_rounds (room_id, server_seed)
             VALUES ($1, $2)
             RETURNING id`,
            [roomId, newServerSeed]
          );
          roundId = retryResult.rows[0].id;
          console.log(`[Room Join] New round created with regenerated seed - ID: ${roundId} for room ${roomId}`);
        } else {
          throw error;
        }
      }
    } else {
      roundId = roundResult.rows[0].id;
      console.log(`[Room Join] Using existing round ${roundId} with server seed: ${roundResult.rows[0].server_seed} (created: ${roundResult.rows[0].created_at})`);
    }

    // At this point, we know the user is not already a participant
    // (handled by the re-entry logic above)

    // SECURITY FIX (CRIT-005): Atomic balance check and deduction
    // Previous code had TOCTOU race condition: check and update were separate operations
    // Multiple concurrent requests could pass balance check before any UPDATE executed
    // New approach: Single atomic UPDATE with WHERE clause ensures database-level validation
    const betAmount = parseFloat(room.bet_amount);

    const deductionResult = await client.query(
      `UPDATE users
       SET balance = balance - $1
       WHERE id = $2 AND balance >= $1
       RETURNING balance`,
      [betAmount, userId]
    );

    // If no rows updated, insufficient balance (check and deduction failed atomically)
    if (deductionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Add participant to round
    await client.query(
      'INSERT INTO round_participants (round_id, user_id, bet_amount) VALUES ($1, $2, $3)',
      [roundId, userId, betAmount]
    );

    // Update prize pool
    await client.query(
      'UPDATE game_rounds SET prize_pool = prize_pool + $1 WHERE id = $2',
      [betAmount, roundId]
    );

    // Create transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, TransactionType.BET, -betAmount, TransactionStatus.SUCCESS, roundId, `Bet in room: ${room.name}`]
    );

    // Check if room should start (Fast Drop)
    if (room.type === RoomType.FAST_DROP) {
      const participantCount = await client.query(
        'SELECT COUNT(*) as count FROM round_participants WHERE round_id = $1',
        [roundId]
      );

      const currentParticipants = parseInt(participantCount.rows[0].count);
      
      console.log(`Room ${roomId}: ${currentParticipants}/${room.min_players} players (status: ${room.status})`);
      
      // Start game when minimum players is reached
      if (currentParticipants >= room.min_players && room.status === RoomStatus.WAITING) {
        console.log(`Starting game for room ${roomId}!`);
        // Update room status to ACTIVE
        await client.query(
          'UPDATE rooms SET status = $1 WHERE id = $2',
          [RoomStatus.ACTIVE, roomId]
        );
        
        // Mark game round as started
        await client.query(
          'UPDATE game_rounds SET started_at = NOW() WHERE id = $1',
          [roundId]
        );
        
        // Emit event to start countdown via socket
        // This will be handled after commit
        shouldStartCountdown = true;
      }
    }

    await client.query('COMMIT');

    // Get updated user balance after transaction
    const updatedUserResult = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );
    const newBalance = parseFloat(updatedUserResult.rows[0].balance);
    
    console.log(`[Room Join] User ${userId} new balance after joining room ${roomId}: ${newBalance}`);
    
    // Emit balance update immediately after successful join
    const { socketManager: sm } = await import('../index');
    sm.emitGlobal('balance-updated', {
      userId: userId,
      newBalance: newBalance,
      change: -betAmount,
      reason: `Joined room: ${room.name}`
    });

    // Update socket participant status for multi-room support
    await socketManager.updateUserParticipantStatus(userId, roomId, true);

    // Get current participant count for the room
    const participantCountResult = await pool.query(
      `SELECT COUNT(DISTINCT rp.user_id) as count
       FROM round_participants rp
       JOIN game_rounds gr ON rp.round_id = gr.id
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL`,
      [roomId]
    );
    const currentParticipantCount = parseInt(participantCountResult.rows[0].count);

    // Emit global room status update for Room List page real-time updates
    socketManager.emitGlobal('room-status-update', {
      roomId: roomId,
      status: room.status,
      participantCount: currentParticipantCount,
      roomName: room.name
    });

    // Emit user-joined event for real-time animations (NEW participants only)
    // Get user info for complete event data
    const userInfoResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const username = userInfoResult.rows.length > 0
      ? `${userInfoResult.rows[0].first_name} ${userInfoResult.rows[0].last_name}`.trim()
      : 'Player';

    // Notify users IN the room
    socketManager.broadcastToRoom(roomId, 'user-joined', {
      userId: userId,
      username: username,
      roomId: roomId
    });

    // Notify users NOT in the room (for room list animations)
    socketManager.broadcastExceptRoom(roomId, 'user-joined', {
      userId: userId,
      username: username,
      roomId: roomId
    });

    console.log(`[Room Join] Emitted user-joined events for user ${userId} in room ${roomId}`);

    // Start countdown if needed (after commit)
    if (shouldStartCountdown) {
      const countdownSeconds = roomResult.rows[0].countdown_seconds || 5; // Use room's countdown setting, default 5s
      console.log(`Triggering countdown for room ${roomId} with ${countdownSeconds} seconds`);
      // Use socketManager to start the game
      socketManager.startGameForRoom(roomId, countdownSeconds);

      // Also notify room update so all players see the updated state
      socketManager.notifyRoomUpdate(roomId);
    }

    return res.json({
      message: 'Successfully joined room',
      roundId,
      betAmount,
      gameStarting: shouldStartCountdown
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Join room error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Admin function to update room
export const updateRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { name, type, betAmount, minPlayers, maxPlayers, status, startTime, numberOfWinners, platformFeeRate, isActive } = req.body;

  try {
    // Check if room exists
    const roomCheck = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Validate numberOfWinners if provided
    if (numberOfWinners !== undefined) {
      if (numberOfWinners < 1) {
        return res.status(400).json({ error: 'Number of winners must be at least 1' });
      }
      const currentMaxPlayers = maxPlayers !== undefined ? maxPlayers : roomCheck.rows[0].max_players;
      if (numberOfWinners > currentMaxPlayers) {
        return res.status(400).json({ error: 'Number of winners cannot exceed maximum players' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (betAmount !== undefined) {
      updates.push(`bet_amount = $${paramCount++}`);
      values.push(betAmount);
    }
    if (minPlayers !== undefined) {
      updates.push(`min_players = $${paramCount++}`);
      values.push(minPlayers);
    }
    if (maxPlayers !== undefined) {
      updates.push(`max_players = $${paramCount++}`);
      values.push(maxPlayers);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(startTime);
    }
    if (numberOfWinners !== undefined) {
      updates.push(`number_of_winners = $${paramCount++}`);
      values.push(numberOfWinners);
    }
    if (platformFeeRate !== undefined) {
      // Convert percentage to decimal (e.g., 5 -> 0.05)
      const decimalFeeRate = platformFeeRate / 100;
      updates.push(`platform_fee_rate = $${paramCount++}`);
      values.push(decimalFeeRate);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(roomId);

    const query = `UPDATE rooms SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    return res.json({
      message: 'Room updated successfully',
      room: result.rows[0]
    });
  } catch (error) {
    console.error('Update room error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin function to delete room
export const deleteRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;

  try {
    // Check if room has active games
    const activeCheck = await pool.query(
      'SELECT COUNT(*) FROM game_rounds WHERE room_id = $1 AND completed_at IS NULL AND archived_at IS NULL',
      [roomId]
    );

    if (parseInt(activeCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete room with active games' });
    }

    // Delete room (cascade will handle related records)
    const result = await pool.query(
      'DELETE FROM rooms WHERE id = $1 RETURNING id',
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin function to get all rooms with detailed info
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      type, 
      page = 1, 
      limit = 20,
      search,
      betAmount_min,
      betAmount_max,
      minPlayers_min,
      minPlayers_max,
      maxPlayers_min,
      maxPlayers_max,
      createdDate_start,
      createdDate_end,
      hasActiveGames
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        r.*,
        u.email as creator_email,
        COUNT(DISTINCT gr.id) as total_games,
        COUNT(DISTINCT rp.user_id) as total_players,
        COALESCE(SUM(rp.bet_amount), 0) as total_bets,
        COUNT(DISTINCT CASE WHEN gr.completed_at IS NULL THEN gr.id END) as active_games
      FROM rooms r
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN game_rounds gr ON gr.room_id = r.id
      LEFT JOIN round_participants rp ON rp.round_id = gr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Add search filter
    if (search) {
      query += ` AND (
        LOWER(r.name) LIKE $${paramCount} OR 
        LOWER(r.share_code) LIKE $${paramCount}
      )`;
      params.push(`%${String(search).toLowerCase()}%`);
      paramCount++;
    }

    if (status) {
      query += ` AND r.status = $${paramCount++}`;
      params.push(status);
    }

    if (type) {
      query += ` AND r.type = $${paramCount++}`;
      params.push(type);
    }

    // Add bet amount range filter
    if (betAmount_min) {
      query += ` AND r.bet_amount >= $${paramCount++}`;
      params.push(Number(betAmount_min));
    }
    if (betAmount_max) {
      query += ` AND r.bet_amount <= $${paramCount++}`;
      params.push(Number(betAmount_max));
    }

    // Add min players range filter
    if (minPlayers_min) {
      query += ` AND r.min_players >= $${paramCount++}`;
      params.push(Number(minPlayers_min));
    }
    if (minPlayers_max) {
      query += ` AND r.min_players <= $${paramCount++}`;
      params.push(Number(minPlayers_max));
    }

    // Add max players range filter
    if (maxPlayers_min) {
      query += ` AND r.max_players >= $${paramCount++}`;
      params.push(Number(maxPlayers_min));
    }
    if (maxPlayers_max) {
      query += ` AND r.max_players <= $${paramCount++}`;
      params.push(Number(maxPlayers_max));
    }

    // Add created date filter
    if (createdDate_start) {
      query += ` AND r.created_at >= $${paramCount++}`;
      params.push(createdDate_start);
    }
    if (createdDate_end) {
      query += ` AND r.created_at <= $${paramCount++}`;
      params.push(createdDate_end + ' 23:59:59');
    }

    query += ` GROUP BY r.id, u.email`;
    
    // Add hasActiveGames filter after GROUP BY
    if (hasActiveGames === 'yes') {
      query += ` HAVING COUNT(DISTINCT CASE WHEN gr.completed_at IS NULL THEN gr.id END) > 0`;
    } else if (hasActiveGames === 'no') {
      query += ` HAVING COUNT(DISTINCT CASE WHEN gr.completed_at IS NULL THEN gr.id END) = 0`;
    }

    query += ` ORDER BY r.created_at DESC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM rooms WHERE 1=1';
    const countParams: any[] = [];
    let countParamNum = 1;

    if (status) {
      countQuery += ` AND status = $${countParamNum++}`;
      countParams.push(status);
    }

    if (type) {
      countQuery += ` AND type = $${countParamNum++}`;
      countParams.push(type);
    }

    const countResult = await pool.query(countQuery, countParams);

    return res.json({
      rooms: result.rows.map(room => ({
        ...room,
        totalGames: parseInt(room.total_games),
        totalPlayers: parseInt(room.total_players),
        totalBets: parseFloat(room.total_bets)
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all rooms error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const processRoundWinner = async (roomId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current round and room info with SKIP LOCKED to prevent concurrent processing
    const roundResult = await client.query(
      `SELECT gr.*, r.number_of_winners 
       FROM game_rounds gr
       JOIN rooms r ON gr.room_id = r.id
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL 
       FOR UPDATE SKIP LOCKED`,
      [roomId]
    );

    if (roundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`[ProcessWinner] Room ${roomId}: No round to process or already being processed`);
      return;
    }

    const round = roundResult.rows[0];
    const numberOfWinners = round.number_of_winners || 1;
    
    console.log(`[ProcessWinner] Room ${roomId}: Starting winner processing for round ${round.id}`);
    console.log(`[ProcessWinner] Room ${roomId}: Number of winners: ${numberOfWinners}`);

    // Check if this room supports multiple winners
    if (numberOfWinners > 1) {
      await client.query('ROLLBACK');
      // Use multi-winner service for multiple winners
      return await processMultipleRoundWinners(roomId);
    }

    // Continue with single winner logic for backward compatibility
    // Get all participants
    const participantsResult = await client.query(
      'SELECT user_id FROM round_participants WHERE round_id = $1',
      [round.id]
    );

    if (participantsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    const participants = participantsResult.rows.map(p => p.user_id);

    // Generate client seed and round nonce for provably fair algorithm
    const clientSeed = generateClientSeed();
    const roundNonce = generateRoundNonce(round.id);
    
    console.log('[VRF Debug] Round ID:', round.id);
    console.log('[VRF Debug] Server Seed:', round.server_seed);
    console.log('[VRF Debug] Client Seed:', clientSeed);
    console.log('[VRF Debug] Round Nonce:', roundNonce);
    console.log('[VRF Debug] Participants:', participants);

    // Select winner using enhanced provably fair algorithm
    const { winnerIndex, vrfProof } = selectWinner(participants, round.server_seed, clientSeed, roundNonce);
    const winnerId = participants[winnerIndex];
    console.log('[VRF Debug] Winner Index:', winnerIndex, 'Winner ID:', winnerId);

    // Generate VRF hash for audit
    const vrfHash = generateHash(`${round.server_seed}:${clientSeed}:${roundNonce}:${participants.join(',')}:${winnerIndex}:${winnerId}`);

    // Log seed usage for audit trail
    seedAuditLogger.logSeedUsage({
      roomId,
      roundId: round.id,
      serverSeed: round.server_seed,
      clientSeed,
      roundNonce,
      participants,
      winnerIndex,
      winnerId,
      vrfHash,
      vrfProof: JSON.stringify(vrfProof),
      context: 'processRoundWinner'
    }).catch(err => console.error('[AUDIT] Failed to log seed usage:', err));

    // Calculate commission and winner amount
    const roomResult = await client.query(
      'SELECT platform_fee_rate FROM rooms WHERE id = $1',
      [roomId]
    );
    
    const commissionRate = parseFloat(roomResult.rows[0].platform_fee_rate);
    const prizePool = parseFloat(round.prize_pool);
    const commissionAmount = prizePool * commissionRate;
    const winnerAmount = prizePool - commissionAmount;

    console.log('[Prize Calculation] Room:', roomId);
    console.log('[Prize Calculation] Platform Fee Rate (decimal):', commissionRate);
    console.log('[Prize Calculation] Prize Pool:', prizePool);
    console.log('[Prize Calculation] Commission Amount:', commissionAmount);
    console.log('[Prize Calculation] Winner Amount:', winnerAmount);

    // Update round with winner and VRF proof
    const resultHash = generateHash(`${round.server_seed}:${clientSeed}:${roundNonce}:${winnerId}:${winnerAmount}`);
    await client.query(
      `UPDATE game_rounds 
       SET winner_id = $1, platform_fee_amount = $2, result_hash = $3, client_seed = $4, round_nonce = $5, vrf_proof = $6, completed_at = NOW()
       WHERE id = $7`,
      [winnerId, commissionAmount, resultHash, clientSeed, roundNonce, JSON.stringify(vrfProof), round.id]
    );

    // Update winner participant record
    await client.query(
      `UPDATE round_participants 
       SET is_winner = true, won_amount = $1
       WHERE round_id = $2 AND user_id = $3`,
      [winnerAmount, round.id, winnerId]
    );

    // Add winner amount to user balance
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [winnerAmount, winnerId]
    );

    // Create winner transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [winnerId, TransactionType.WIN, winnerAmount, TransactionStatus.SUCCESS, round.id, 'Game winnings']
    );

    // Update room status
    await client.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      [RoomStatus.COMPLETED, roomId]
    );

    await client.query('COMMIT');

    return {
      winnerId,
      winnerAmount,
      commissionAmount,
      resultHash
    };
    
    console.log(`[ProcessWinner] Room ${roomId}: Successfully completed winner processing`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[ProcessWinner] Room ${roomId}: Error processing winner:`, error);
    throw error;
  } finally {
    client.release();
  }
};

export const getRecentWinners = async (req: Request, res: Response) => {
  try {
    // Only show winners where sufficient time has passed after game completion (30 seconds)
    // This ensures the winner announcement and animation in the game room complete first
    
    // First get single winner games (legacy format)
    const singleWinnerResult = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        gr.id as round_id,
        gr.prize_pool as amount,
        gr.completed_at as timestamp,
        r.name as room_name,
        r.type as room_type,
        1 as position,
        false as is_multi_winner
      FROM game_rounds gr
      JOIN users u ON gr.winner_id = u.id
      JOIN rooms r ON gr.room_id = r.id
      WHERE gr.completed_at IS NOT NULL
        AND gr.winner_id IS NOT NULL
        AND gr.completed_at <= NOW() - INTERVAL '30 seconds'
        AND (r.number_of_winners IS NULL OR r.number_of_winners = 1)
      ORDER BY gr.completed_at DESC
      LIMIT 10
    `);

    // Then get multi-winner games (new format)
    const multiWinnerResult = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        gr.id as round_id,
        rw.prize_amount as amount,
        gr.completed_at as timestamp,
        r.name as room_name,
        r.type as room_type,
        rw.position,
        true as is_multi_winner
      FROM game_rounds gr
      JOIN round_winners rw ON rw.round_id = gr.id
      JOIN users u ON rw.user_id = u.id
      JOIN rooms r ON gr.room_id = r.id
      WHERE gr.completed_at IS NOT NULL
        AND gr.completed_at <= NOW() - INTERVAL '30 seconds'
        AND r.number_of_winners > 1
      ORDER BY gr.completed_at DESC, rw.position ASC
      LIMIT 20
    `);

    // Combine and sort results by timestamp
    const allWinners = [...singleWinnerResult.rows, ...multiWinnerResult.rows]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    return res.json({
      winners: allWinners.map(row => ({
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        round_id: row.round_id,
        amount: parseFloat(row.amount),
        timestamp: row.timestamp,
        room_name: row.room_name,
        room_type: row.room_type,
        position: parseInt(row.position),
        is_multi_winner: row.is_multi_winner
      }))
    });
  } catch (error) {
    console.error('Get recent winners error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent winners' });
  }
};

export const unjoinRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.userId;
  
  console.log(`User ${userId} attempting to unjoin room ${roomId}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get room details with row lock to prevent race conditions
    const roomResult = await client.query(
      'SELECT * FROM rooms WHERE id = $1 FOR UPDATE',
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false,
        error: 'Room not found' 
      });
    }

    const room = roomResult.rows[0];

    // Check if room is in WAITING status (cannot leave if game has started)
    if (room.status !== RoomStatus.WAITING) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'Cannot leave room - game has started' 
      });
    }

    // Get current active round (exclude archived rounds)
    const roundResult = await client.query(
      'SELECT id, prize_pool FROM game_rounds WHERE room_id = $1 AND completed_at IS NULL AND archived_at IS NULL',
      [roomId]
    );

    if (roundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'No active round found for this room' 
      });
    }

    const round = roundResult.rows[0];
    const roundId = round.id;

    // Check if user is a participant in the current round
    const participantResult = await client.query(
      'SELECT id, bet_amount FROM round_participants WHERE round_id = $1 AND user_id = $2',
      [roundId, userId]
    );

    if (participantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        error: 'You are not a participant in this room' 
      });
    }

    const participant = participantResult.rows[0];
    const refundAmount = parseFloat(participant.bet_amount);

    // Check current participant count
    const participantCountResult = await client.query(
      'SELECT COUNT(*) as count FROM round_participants WHERE round_id = $1',
      [roundId]
    );

    const currentParticipants = parseInt(participantCountResult.rows[0].count);
    const participantsAfterLeaving = currentParticipants - 1;
    
    console.log(`Leave room check - Current: ${currentParticipants}, After leaving: ${participantsAfterLeaving}, Min required: ${room.min_players}`);
    
    // Since room is in WAITING status, users should be able to leave with refund
    // The only restriction should be based on game rules or fairness
    // For now, allow leaving anytime during WAITING status
    // The frontend will control when to show/hide the button based on UX decisions

    // Get user's current balance with row lock
    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    const currentBalance = parseFloat(userResult.rows[0].balance);

    // Process refund atomically
    // 1. Remove participant from round
    await client.query(
      'DELETE FROM round_participants WHERE id = $1',
      [participant.id]
    );

    // 2. Update user balance (add refund)
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [refundAmount, userId]
    );

    // 3. Update round prize pool (subtract refund)
    await client.query(
      'UPDATE game_rounds SET prize_pool = prize_pool - $1 WHERE id = $2',
      [refundAmount, roundId]
    );

    // 4. Create refund transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, reference_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, TransactionType.REFUND, refundAmount, TransactionStatus.SUCCESS, roundId, `Refund for leaving room: ${room.name}`]
    );

    await client.query('COMMIT');

    const newBalance = currentBalance + refundAmount;

    // Update socket participant status for multi-room support
    await socketManager.updateUserParticipantStatus(userId, roomId, false);
    
    // Emit socket events for real-time updates
    socketManager.emitToRoom(roomId, 'player-left', {
      userId,
      message: 'Player left the room',
      refundAmount,
      newParticipantCount: currentParticipants - 1
    });

    // Emit balance update to all connected clients
    socketManager.emitGlobal('balance-updated', {
      userId,
      newBalance
    });

    // Get updated participant count for the room
    const updatedParticipantCountResult = await pool.query(
      `SELECT COUNT(DISTINCT rp.user_id) as count
       FROM round_participants rp
       JOIN game_rounds gr ON rp.round_id = gr.id
       WHERE gr.room_id = $1 AND gr.completed_at IS NULL AND gr.archived_at IS NULL`,
      [roomId]
    );
    const updatedParticipantCount = parseInt(updatedParticipantCountResult.rows[0].count);

    // Emit global room status update for Room List page real-time updates
    socketManager.emitGlobal('room-status-update', {
      roomId: roomId,
      status: room.status,
      participantCount: updatedParticipantCount,
      roomName: room.name
    });

    // Emit user-left event for real-time animations (actual participant removal)
    // Get user info for complete event data
    const userInfoResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const username = userInfoResult.rows.length > 0
      ? `${userInfoResult.rows[0].first_name} ${userInfoResult.rows[0].last_name}`.trim()
      : 'Player';

    // Notify users IN the room
    socketManager.broadcastToRoom(roomId, 'user-left', {
      userId: userId,
      username: username,
      roomId: roomId
    });

    // Notify users NOT in the room (for room list animations)
    socketManager.broadcastExceptRoom(roomId, 'user-left', {
      userId: userId,
      username: username,
      roomId: roomId
    });

    console.log(`[Room Unjoin] Emitted user-left events for user ${userId} from room ${roomId}`);

    // Notify room update so all players see the updated state
    socketManager.notifyRoomUpdate(roomId);

    return res.json({
      success: true,
      message: 'Successfully left room',
      refundAmount,
      newBalance
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Unjoin room error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  } finally {
    client.release();
  }
};

export const getRoomStats = async (req: Request, res: Response) => {
  try {
    // Get total active players (users in active game rounds)
    const activePlayersResult = await pool.query(`
      SELECT COUNT(DISTINCT rp.user_id) as total_players
      FROM round_participants rp
      JOIN game_rounds gr ON rp.round_id = gr.id
      WHERE gr.completed_at IS NULL
    `);

    // Get total games completed (all time)
    const totalGamesResult = await pool.query(`
      SELECT COUNT(*) as total_games
      FROM game_rounds
      WHERE completed_at IS NOT NULL
    `);

    // Get total payouts (sum of all prize money distributed to winners minus platform fees)
    const totalPayoutsResult = await pool.query(`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN rw.prize_amount IS NOT NULL THEN rw.prize_amount
            ELSE gr.prize_pool - (gr.prize_pool * COALESCE(r.platform_fee_rate, 0.1))
          END
        ), 0) as total_payouts
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN round_winners rw ON rw.round_id = gr.id
      WHERE gr.completed_at IS NOT NULL
    `);

    // Get biggest win ever
    const biggestWinResult = await pool.query(`
      SELECT COALESCE(MAX(
        CASE
          WHEN rw.prize_amount IS NOT NULL THEN rw.prize_amount
          ELSE gr.prize_pool - (gr.prize_pool * COALESCE(r.platform_fee_rate, 0.1))
        END
      ), 0) as biggest_win
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN round_winners rw ON rw.round_id = gr.id
      WHERE gr.completed_at IS NOT NULL
    `);

    return res.json({
      stats: {
        totalPlayers: parseInt(activePlayersResult.rows[0].total_players),
        totalGames: parseInt(totalGamesResult.rows[0].total_games),
        totalPayouts: parseFloat(totalPayoutsResult.rows[0].total_payouts),
        biggestWin: parseFloat(biggestWinResult.rows[0].biggest_win)
      }
    });
  } catch (error) {
    console.error('Get room stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch room statistics' });
  }
};

// Verify VRF proof for transparency (GET endpoint)
export const verifyRoundVRF = async (req: Request, res: Response) => {
  try {
    const { roundId } = req.params;

    if (!roundId) {
      return res.status(400).json({ error: 'Round ID is required' });
    }

    // Fetch round data with VRF proof
    const roundResult = await pool.query(
      `SELECT 
        r.id,
        r.server_seed,
        r.client_seed,
        r.round_nonce,
        r.vrf_proof,
        r.result_hash,
        r.winner_id,
        array_agg(rp.user_id ORDER BY rp.joined_at) as participants
      FROM game_rounds r
      LEFT JOIN round_participants rp ON r.id = rp.round_id
      WHERE r.id = $1
        AND r.completed_at IS NOT NULL
      GROUP BY r.id`,
      [roundId]
    );

    if (roundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found or not completed' });
    }

    const round = roundResult.rows[0];

    if (!round.vrf_proof) {
      return res.status(400).json({ 
        error: 'VRF proof not available for this round',
        message: 'This round may have been completed before VRF enhancement was implemented'
      });
    }

    // Parse VRF proof
    let vrfProof;
    try {
      vrfProof = JSON.parse(round.vrf_proof);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid VRF proof format' });
    }

    // Verify the proof
    const isValid = verifyVRFProof(vrfProof);

    // Additional verification: check if recorded winner matches proof
    const proofWinnerId = vrfProof.winnerId;
    const recordedWinnerId = round.winner_id;
    const winnerMatches = proofWinnerId === recordedWinnerId;

    return res.json({
      roundId,
      verification: {
        isValid,
        winnerMatches,
        timestamp: Date.now()
      },
      vrfProof: {
        serverSeed: vrfProof.serverSeed,
        clientSeed: vrfProof.clientSeed,
        roundNonce: vrfProof.roundNonce,
        participants: vrfProof.participants,
        participantsFingerprint: vrfProof.participantsFingerprint,
        entropyString: vrfProof.entropyString,
        primaryHash: vrfProof.primaryHash,
        secondaryHash: vrfProof.secondaryHash,
        combinedValue: vrfProof.combinedValue,
        winnerIndex: vrfProof.winnerIndex,
        winnerId: vrfProof.winnerId,
        timestamp: vrfProof.timestamp
      },
      roundData: {
        resultHash: round.result_hash,
        recordedWinner: round.winner_id,
        participants: round.participants
      }
    });

  } catch (error) {
    console.error('VRF verification error:', error);
    return res.status(500).json({ error: 'Failed to verify VRF proof' });
  }
};