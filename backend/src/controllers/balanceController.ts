import { Request, Response } from 'express';
import pool from '../config/database';
import { TransactionType, TransactionStatus } from '../types';
import { logAdminAction } from '../utils/auditLogger';

export const getBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      'SELECT balance, currency FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const balanceData = {
      balance: parseFloat(result.rows[0].balance),
      currency: result.rows[0].currency
    };

    return res.json({
      success: true,
      data: balanceData,
      // Keep legacy format for backward compatibility
      ...balanceData
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      page = 1,
      limit = 10,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Convert query params to proper types
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100); // Cap at 100 for performance
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (type && type !== 'all') {
      params.push(type);
      whereClause += ` AND type = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND created_at <= $${params.length}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM transactions ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Build main query with sorting
    const sortColumn = sortBy === 'createdAt' ? 'created_at' : sortBy as string;
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const query = `
      SELECT id, type, amount, currency, status, description, created_at
      FROM transactions
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Transform transactions to match frontend expectations
    const transformedTransactions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      description: row.description,
      createdAt: row.created_at
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: transformedTransactions,
      // Keep legacy format for backward compatibility
      transactions: transformedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin function to adjust user balance
export const adjustBalance = async (req: Request, res: Response) => {
  const { userId, amount, description } = req.body;
  const adminId = req.user!.userId;

  // SECURITY FIX (HIGH-003): Validate UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  // SECURITY FIX (HIGH-003): Prevent admin from adjusting their own balance
  if (userId === adminId) {
    console.warn(`[SECURITY] Admin ${adminId} attempted to adjust their own balance`);
    return res.status(403).json({
      error: 'Cannot adjust your own balance. This action requires another administrator.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user exists and get current balance
    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(userResult.rows[0].balance);
    const adjustmentAmount = parseFloat(amount);
    const newBalance = currentBalance + adjustmentAmount;

    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance for this adjustment' });
    }

    // Update user balance
    await client.query(
      'UPDATE users SET balance = $1 WHERE id = $2',
      [newBalance, userId]
    );

    // Create transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        TransactionType.ADMIN_ADJUSTMENT,
        adjustmentAmount,
        TransactionStatus.SUCCESS,
        description || 'Admin balance adjustment',
        adminId
      ]
    );

    await client.query('COMMIT');

    // Log admin action to audit logs
    await logAdminAction(
      adminId,
      'BALANCE_ADJUSTMENT',
      userId,
      req.ip,
      {
        previousBalance: currentBalance,
        adjustmentAmount,
        newBalance,
        description: description || 'Admin balance adjustment',
        transactionType: TransactionType.ADMIN_ADJUSTMENT
      }
    );

    return res.json({
      message: 'Balance adjusted successfully',
      newBalance,
      adjustment: adjustmentAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Adjust balance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getGameHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { 
      status,
      page = 1,
      limit = 10,
      startDate,
      endDate,
      result: resultFilter,
      sortBy = 'playedAt',
      sortOrder = 'desc',
      minEntryFee,
      maxEntryFee
    } = req.query;

    // Convert query params to proper types
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100); // Cap at 100 for performance
    const offset = (pageNum - 1) * limitNum;

    // Optimized query with complete data mapping
    const gamesQuery = `
      SELECT
        gr.id as round_id,
        rp.id as game_id,
        r.id as room_id,
        r.name as room_name,
        r.type as room_type,
        r.bet_amount as entry_fee,
        r.status as room_status,
        gr.prize_pool,
        rp.bet_amount,
        rp.won_amount as winnings,
        rp.is_winner,
        rp.joined_at,
        gr.started_at,
        gr.completed_at,
        gr.created_at,
        COALESCE(gr.completed_at, gr.created_at) as played_at,
        gr.completed_at IS NOT NULL as is_completed,
        CASE
          WHEN gr.completed_at IS NULL THEN 'pending'
          WHEN rp.is_winner = true THEN 'win'
          ELSE 'loss'
        END as result
      FROM round_participants rp
      JOIN game_rounds gr ON rp.round_id = gr.id
      JOIN rooms r ON gr.room_id = r.id
      WHERE rp.user_id = $1
        AND ($2::TIMESTAMP WITH TIME ZONE IS NULL OR COALESCE(gr.completed_at, gr.created_at) >= $2)
        AND ($3::TIMESTAMP WITH TIME ZONE IS NULL OR COALESCE(gr.completed_at, gr.created_at) <= $3)
        AND ($4::TEXT IS NULL OR
             ($4 = 'win' AND rp.is_winner = true) OR
             ($4 = 'loss' AND rp.is_winner = false AND gr.completed_at IS NOT NULL) OR
             ($4 = 'pending' AND gr.completed_at IS NULL))
        AND ($5::DECIMAL IS NULL OR r.bet_amount >= $5)
        AND ($6::DECIMAL IS NULL OR r.bet_amount <= $6)
      ORDER BY
        CASE WHEN $7 = 'playedAt' AND $8 = 'asc' THEN COALESCE(gr.completed_at, gr.created_at) END ASC,
        CASE WHEN $7 = 'playedAt' AND $8 = 'desc' THEN COALESCE(gr.completed_at, gr.created_at) END DESC,
        CASE WHEN $7 = 'entryFee' AND $8 = 'asc' THEN r.bet_amount END ASC,
        CASE WHEN $7 = 'entryFee' AND $8 = 'desc' THEN r.bet_amount END DESC,
        CASE WHEN $7 = 'winnings' AND $8 = 'asc' THEN rp.won_amount END ASC,
        CASE WHEN $7 = 'winnings' AND $8 = 'desc' THEN rp.won_amount END DESC
      LIMIT $9 OFFSET $10
    `;

    const gameParams = [
      userId,
      startDate || null,
      endDate || null,
      resultFilter || null,
      minEntryFee || null,
      maxEntryFee || null,
      sortBy,
      sortOrder,
      limitNum,
      offset
    ];

    // Execute queries in parallel for better performance
    const [gamesResult, statsResult, countResult] = await Promise.all([
      pool.query(gamesQuery, gameParams),
      
      // Direct calculation of statistics with proper joins
      pool.query(`
        SELECT
          COUNT(*) as total_games,
          COUNT(CASE WHEN rp.is_winner = true THEN 1 END) as total_won,
          COUNT(CASE WHEN rp.is_winner = false AND gr.completed_at IS NOT NULL THEN 1 END) as total_lost,
          COUNT(CASE WHEN gr.completed_at IS NULL THEN 1 END) as total_pending,
          COALESCE(SUM(CASE WHEN rp.is_winner = true THEN rp.won_amount ELSE 0 END), 0) as total_winnings,
          COALESCE(SUM(r.bet_amount), 0) as total_spent,
          CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN rp.is_winner = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2) ELSE 0 END as win_rate,
          COALESCE(AVG(r.bet_amount), 0) as avg_entry_fee,
          COALESCE(MAX(CASE WHEN rp.is_winner = true THEN rp.won_amount ELSE 0 END), 0) as biggest_win
        FROM round_participants rp
        JOIN game_rounds gr ON rp.round_id = gr.id
        JOIN rooms r ON gr.room_id = r.id
        WHERE rp.user_id = $1
      `, [userId]),
      
      // Optimized count query using index with proper filtering
      pool.query(`
        SELECT COUNT(*) as total
        FROM round_participants rp
        JOIN game_rounds gr ON rp.round_id = gr.id
        JOIN rooms r ON gr.room_id = r.id
        WHERE rp.user_id = $1
          AND ($2::TIMESTAMP WITH TIME ZONE IS NULL OR COALESCE(gr.completed_at, gr.created_at) >= $2)
          AND ($3::TIMESTAMP WITH TIME ZONE IS NULL OR COALESCE(gr.completed_at, gr.created_at) <= $3)
          AND ($4::TEXT IS NULL OR
               ($4 = 'win' AND rp.is_winner = true) OR
               ($4 = 'loss' AND rp.is_winner = false AND gr.completed_at IS NOT NULL) OR
               ($4 = 'pending' AND gr.completed_at IS NULL))
          AND ($5::DECIMAL IS NULL OR r.bet_amount >= $5)
          AND ($6::DECIMAL IS NULL OR r.bet_amount <= $6)
      `, [userId, startDate || null, endDate || null, resultFilter || null, minEntryFee || null, maxEntryFee || null])
    ]);

    const totalGames = parseInt(countResult.rows[0]?.total || '0');
    const stats = statsResult.rows[0];
    
    const statistics = {
      totalGames: parseInt(stats.total_games),
      totalWon: parseInt(stats.total_won),
      totalLost: parseInt(stats.total_lost),
      totalPending: parseInt(stats.total_pending),
      totalWinnings: parseFloat(stats.total_winnings),
      totalSpent: parseFloat(stats.total_spent),
      winRate: parseFloat(stats.win_rate || 0),
      averageEntryFee: parseFloat(stats.avg_entry_fee),
      biggestWin: parseFloat(stats.biggest_win)
    };

    // Transform data to match frontend GameHistory interface
    const transformedGames = gamesResult.rows.map((row: any) => {
      // Determine result status
      let resultStatus: 'win' | 'loss' | 'pending' = 'pending';
      if (row.completed_at) {
        resultStatus = row.is_winner ? 'win' : 'loss';
      }

      return {
        // Frontend expected fields
        id: row.round_id,
        roomId: row.room_id,
        roomName: row.room_name,
        userId: userId,
        entryFee: row.entry_fee ? parseFloat(row.entry_fee) : null,
        result: resultStatus,
        prize: row.is_winner && row.winnings ? parseFloat(row.winnings) : undefined,
        position: row.is_winner ? 1 : undefined,
        playedAt: row.completed_at || row.joined_at || row.created_at,

        // Additional fields for backward compatibility
        roomType: row.room_type,
        betAmount: row.entry_fee ? parseFloat(row.entry_fee) : null,
        prizePool: row.prize_pool ? parseFloat(row.prize_pool) : null,
        isWinner: row.is_winner,
        wonAmount: row.winnings ? parseFloat(row.winnings) : 0,
        completedAt: row.completed_at,
        status: row.room_status
      };
    });

    // Add performance headers for monitoring
    res.set('X-Query-Performance', 'optimized');
    res.set('X-Cache-Control', 'private, max-age=300'); // 5 minute cache

    // Return enhanced response with pagination and statistics
    return res.json({
      success: true,
      data: transformedGames,
      games: transformedGames, // backward compatibility
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalGames,
        totalPages: Math.ceil(totalGames / limitNum)
      },
      statistics,
      performance: {
        optimized: true,
        cacheHint: 300 // seconds
      }
    });
  } catch (error) {
    console.error('Get game history error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch game history',
      message: 'Internal server error'
    });
  }
};