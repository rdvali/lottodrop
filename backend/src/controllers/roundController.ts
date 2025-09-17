import { Request, Response } from 'express';
import pool from '../config/database';

// Get all rounds with pagination and filters (Admin only)
export const getAllRounds = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all', 
      search = '',
      roomType,
      prizePool_min,
      prizePool_max,
      participants_min,
      participants_max,
      completedDate_start,
      completedDate_end
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        gr.id,
        gr.room_id,
        r.name as room_name,
        r.type as room_type,
        r.bet_amount,
        gr.server_seed,
        gr.prize_pool,
        gr.winner_id,
        gr.platform_fee_amount as commission_amount,
        gr.result_hash,
        gr.completed_at,
        gr.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as winner_name,
        COUNT(DISTINCT rp.user_id) as participant_count
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      LEFT JOIN round_participants rp ON rp.round_id = gr.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Add status filter
    if (status === 'completed') {
      query += ` AND gr.completed_at IS NOT NULL`;
    } else if (status === 'active') {
      query += ` AND gr.completed_at IS NULL AND gr.archived_at IS NULL`;
    }

    // Add search filter
    if (search) {
      query += ` AND (r.name ILIKE $${paramCount} OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Add room type filter
    if (roomType) {
      query += ` AND r.type = $${paramCount}`;
      params.push(roomType);
      paramCount++;
    }

    // Add prize pool range filter
    if (prizePool_min) {
      query += ` AND gr.prize_pool >= $${paramCount}`;
      params.push(Number(prizePool_min));
      paramCount++;
    }
    if (prizePool_max) {
      query += ` AND gr.prize_pool <= $${paramCount}`;
      params.push(Number(prizePool_max));
      paramCount++;
    }

    // Add completed date filter
    if (completedDate_start) {
      query += ` AND gr.completed_at >= $${paramCount}`;
      params.push(completedDate_start);
      paramCount++;
    }
    if (completedDate_end) {
      query += ` AND gr.completed_at <= $${paramCount}`;
      params.push(completedDate_end + ' 23:59:59');
      paramCount++;
    }

    query += ` GROUP BY gr.id, r.name, r.type, r.bet_amount, u.first_name, u.last_name`;
    
    // Add participants filter after GROUP BY
    if (participants_min || participants_max) {
      query += ` HAVING 1=1`;
      if (participants_min) {
        query += ` AND COUNT(DISTINCT rp.user_id) >= ${Number(participants_min)}`;
      }
      if (participants_max) {
        query += ` AND COUNT(DISTINCT rp.user_id) <= ${Number(participants_max)}`;
      }
    }
    
    query += ` ORDER BY gr.created_at DESC`;
    
    // Build count query with same filters
    let countQuery = `
      SELECT COUNT(DISTINCT gr.id) as total
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      LEFT JOIN round_participants rp ON rp.round_id = gr.id
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    let countParamNum = 1;
    
    if (status === 'completed') {
      countQuery += ` AND gr.completed_at IS NOT NULL`;
    } else if (status === 'active') {
      countQuery += ` AND gr.completed_at IS NULL AND gr.archived_at IS NULL`;
    }
    
    if (search) {
      countQuery += ` AND (r.name ILIKE $${countParamNum} OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${countParamNum})`;
      countParams.push(`%${search}%`);
      countParamNum++;
    }
    
    if (roomType) {
      countQuery += ` AND r.type = $${countParamNum}`;
      countParams.push(roomType);
      countParamNum++;
    }
    
    if (prizePool_min) {
      countQuery += ` AND gr.prize_pool >= $${countParamNum}`;
      countParams.push(Number(prizePool_min));
      countParamNum++;
    }
    if (prizePool_max) {
      countQuery += ` AND gr.prize_pool <= $${countParamNum}`;
      countParams.push(Number(prizePool_max));
      countParamNum++;
    }
    
    if (completedDate_start) {
      countQuery += ` AND gr.completed_at >= $${countParamNum}`;
      countParams.push(completedDate_start);
      countParamNum++;
    }
    if (completedDate_end) {
      countQuery += ` AND gr.completed_at <= $${countParamNum}`;
      countParams.push(completedDate_end + ' 23:59:59');
      countParamNum++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalRounds = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRounds / Number(limit));

    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);

    return res.json({
      rounds: result.rows,
      currentPage: Number(page),
      totalPages,
      totalRounds,
    });
  } catch (error) {
    console.error('Get all rounds error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single round details with participants (Admin only)
export const getRoundDetails = async (req: Request, res: Response) => {
  const { roundId } = req.params;

  try {
    // Get round details
    const roundQuery = `
      SELECT 
        gr.*,
        r.name as room_name,
        r.type as room_type,
        r.bet_amount,
        CONCAT(u.first_name, ' ', u.last_name) as winner_name
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      WHERE gr.id = $1
    `;

    const roundResult = await pool.query(roundQuery, [roundId]);

    if (roundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const round = roundResult.rows[0];

    // Get participants
    const participantsQuery = `
      SELECT 
        rp.user_id,
        rp.bet_amount,
        u.first_name,
        u.last_name,
        u.email,
        CASE WHEN rp.user_id = $1 THEN true ELSE false END as is_winner
      FROM round_participants rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.round_id = $2
      ORDER BY is_winner DESC, u.first_name ASC
    `;

    const participantsResult = await pool.query(participantsQuery, [round.winner_id, roundId]);

    return res.json({
      round: {
        ...round,
        participants: participantsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get round details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get rounds statistics (Admin only)
export const getRoundsStatistics = async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_rounds,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_rounds,
        COUNT(CASE WHEN completed_at IS NULL THEN 1 END) as active_rounds,
        COALESCE(SUM(prize_pool), 0) as total_prize_pool,
        COALESCE(SUM(platform_fee_amount), 0) as total_commission,
        COALESCE(AVG(prize_pool), 0) as avg_prize_pool
      FROM game_rounds
    `;

    const statsResult = await pool.query(statsQuery);

    // Get top winners
    const topWinnersQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(gr.id) as wins,
        COALESCE(SUM(gr.prize_pool - COALESCE(gr.platform_fee_amount, 0)), 0) as total_winnings
      FROM users u
      JOIN game_rounds gr ON gr.winner_id = u.id
      WHERE gr.completed_at IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY wins DESC, total_winnings DESC
      LIMIT 5
    `;

    const topWinnersResult = await pool.query(topWinnersQuery);

    // Get recent rounds
    const recentRoundsQuery = `
      SELECT 
        gr.id,
        r.name as room_name,
        gr.prize_pool,
        gr.completed_at,
        CONCAT(u.first_name, ' ', u.last_name) as winner_name
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      WHERE gr.completed_at IS NOT NULL
      ORDER BY gr.completed_at DESC
      LIMIT 5
    `;

    const recentRoundsResult = await pool.query(recentRoundsQuery);

    return res.json({
      statistics: statsResult.rows[0],
      topWinners: topWinnersResult.rows,
      recentRounds: recentRoundsResult.rows,
    });
  } catch (error) {
    console.error('Get rounds statistics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel active round (Admin only)
export const cancelRound = async (req: Request, res: Response) => {
  const { roundId } = req.params;
  const { reason } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if round exists and is active
    const roundResult = await client.query(
      'SELECT * FROM game_rounds WHERE id = $1 AND completed_at IS NULL AND archived_at IS NULL FOR UPDATE',
      [roundId]
    );

    if (roundResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active round not found' });
    }

    const round = roundResult.rows[0];

    // Get all participants for refund
    const participantsResult = await client.query(
      'SELECT user_id, bet_amount FROM round_participants WHERE round_id = $1',
      [roundId]
    );

    // Refund all participants
    for (const participant of participantsResult.rows) {
      // Update user balance
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [participant.bet_amount, participant.user_id]
      );

      // Create refund transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, description)
         VALUES ($1, 'REFUND', $2, 'COMPLETED', $3)`,
        [participant.user_id, participant.bet_amount, `Round cancelled: ${reason || 'Admin action'}`]
      );
    }

    // Mark round as cancelled
    await client.query(
      `UPDATE game_rounds 
       SET completed_at = NOW(), 
           result_hash = 'CANCELLED',
           platform_fee_amount = 0
       WHERE id = $1`,
      [roundId]
    );

    // Update room status
    await client.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      ['WAITING', round.room_id]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Round cancelled successfully',
      refundedUsers: participantsResult.rows.length,
      totalRefunded: participantsResult.rows.reduce((sum, p) => sum + parseFloat(p.bet_amount), 0),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel round error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};