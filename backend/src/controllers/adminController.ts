import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database';
import { logAdminAction } from '../utils/auditLogger';

// Get all users with pagination and filters
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = 'all',
      role,
      balance_min,
      balance_max,
      registrationDate_start,
      registrationDate_end,
      lastActivity_start,
      lastActivity_end,
      hasPlayedGames
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.balance,
        u.currency,
        u.is_admin,
        u.is_active,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT rp.id) as total_games,
        COALESCE(SUM(DISTINCT t.amount), 0) as total_deposits,
        MAX(rp.joined_at) as last_game_at
      FROM users u
      LEFT JOIN round_participants rp ON rp.user_id = u.id
      LEFT JOIN transactions t ON t.user_id = u.id AND t.type = 'DEPOSIT' AND t.status = 'SUCCESS'
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Add search filter
    if (search) {
      query += ` AND (
        LOWER(u.first_name) LIKE $${paramCount} OR 
        LOWER(u.last_name) LIKE $${paramCount} OR 
        LOWER(u.email) LIKE $${paramCount}
      )`;
      params.push(`%${String(search).toLowerCase()}%`);
      paramCount++;
    }

    // Add status filter
    if (status === 'active') {
      query += ` AND u.is_active = true`;
    } else if (status === 'suspended') {
      query += ` AND u.is_active = false`;
    }

    // Add role filter
    if (role === 'admin') {
      query += ` AND u.is_admin = true`;
    } else if (role === 'player') {
      query += ` AND u.is_admin = false`;
    }

    // Add balance range filter
    if (balance_min) {
      query += ` AND u.balance >= $${paramCount}`;
      params.push(Number(balance_min));
      paramCount++;
    }
    if (balance_max) {
      query += ` AND u.balance <= $${paramCount}`;
      params.push(Number(balance_max));
      paramCount++;
    }

    // Add registration date filter
    if (registrationDate_start) {
      query += ` AND u.created_at >= $${paramCount}`;
      params.push(registrationDate_start);
      paramCount++;
    }
    if (registrationDate_end) {
      query += ` AND u.created_at <= $${paramCount}`;
      params.push(registrationDate_end + ' 23:59:59');
      paramCount++;
    }

    // Add last activity filter (based on last game played)
    if (lastActivity_start || lastActivity_end) {
      query += ` GROUP BY u.id`;
      if (lastActivity_start) {
        query += ` HAVING MAX(rp.joined_at) >= $${paramCount}`;
        params.push(lastActivity_start);
        paramCount++;
      }
      if (lastActivity_end) {
        query += ` ${lastActivity_start ? 'AND' : 'HAVING'} MAX(rp.joined_at) <= $${paramCount}`;
        params.push(lastActivity_end + ' 23:59:59');
        paramCount++;
      }
    } else {
      query += ` GROUP BY u.id`;
    }

    // Add hasPlayedGames filter after GROUP BY
    if (hasPlayedGames === 'yes') {
      query += ` HAVING COUNT(DISTINCT rp.id) > 0`;
    } else if (hasPlayedGames === 'no') {
      query += ` HAVING COUNT(DISTINCT rp.id) = 0`;
    }

    query += ` ORDER BY u.created_at DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination with all filters
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) FROM users u
      LEFT JOIN round_participants rp ON rp.user_id = u.id
      LEFT JOIN transactions t ON t.user_id = u.id AND t.type = 'DEPOSIT' AND t.status = 'SUCCESS'
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamNum = 1;

    if (search) {
      countQuery += ` AND (
        LOWER(u.first_name) LIKE $${countParamNum} OR 
        LOWER(u.last_name) LIKE $${countParamNum} OR 
        LOWER(u.email) LIKE $${countParamNum}
      )`;
      countParams.push(`%${String(search).toLowerCase()}%`);
      countParamNum++;
    }

    if (status === 'active') {
      countQuery += ` AND u.is_active = true`;
    } else if (status === 'suspended') {
      countQuery += ` AND u.is_active = false`;
    }

    if (role === 'admin') {
      countQuery += ` AND u.is_admin = true`;
    } else if (role === 'player') {
      countQuery += ` AND u.is_admin = false`;
    }

    if (balance_min) {
      countQuery += ` AND u.balance >= $${countParamNum}`;
      countParams.push(Number(balance_min));
      countParamNum++;
    }
    if (balance_max) {
      countQuery += ` AND u.balance <= $${countParamNum}`;
      countParams.push(Number(balance_max));
      countParamNum++;
    }

    if (registrationDate_start) {
      countQuery += ` AND u.created_at >= $${countParamNum}`;
      countParams.push(registrationDate_start);
      countParamNum++;
    }
    if (registrationDate_end) {
      countQuery += ` AND u.created_at <= $${countParamNum}`;
      countParams.push(registrationDate_end + ' 23:59:59');
      countParamNum++;
    }

    const countResult = await pool.query(countQuery, countParams);

    return res.json({
      users: result.rows.map(user => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        currency: user.currency,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        totalGames: parseInt(user.total_games),
        totalDeposits: parseFloat(user.total_deposits),
        lastGameAt: user.last_game_at
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single user details
export const getUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT 
        u.*,
        COUNT(DISTINCT rp.id) as total_games,
        COUNT(DISTINCT gr.id) as total_wins,
        COALESCE(SUM(DISTINCT td.amount), 0) as total_deposits,
        COALESCE(SUM(DISTINCT tw.amount), 0) as total_withdrawals
      FROM users u
      LEFT JOIN round_participants rp ON rp.user_id = u.id
      LEFT JOIN game_rounds gr ON gr.winner_id = u.id
      LEFT JOIN transactions td ON td.user_id = u.id AND td.type = 'DEPOSIT' AND td.status = 'SUCCESS'
      LEFT JOIN transactions tw ON tw.user_id = u.id AND tw.type = 'WITHDRAWAL' AND tw.status = 'SUCCESS'
      WHERE u.id = $1
      GROUP BY u.id`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get recent transactions
    const transactionsResult = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    // Get recent games
    const gamesResult = await pool.query(
      `SELECT 
        gr.id,
        gr.prize_pool,
        gr.platform_fee_amount,
        gr.started_at,
        gr.completed_at,
        r.name as room_name,
        CASE WHEN gr.winner_id = $1 THEN true ELSE false END as won
      FROM round_participants rp
      JOIN game_rounds gr ON gr.id = rp.round_id
      JOIN rooms r ON r.id = gr.room_id
      WHERE rp.user_id = $1
      ORDER BY gr.created_at DESC
      LIMIT 10`,
      [userId]
    );

    return res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        currency: user.currency,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        stats: {
          totalGames: parseInt(user.total_games),
          totalWins: parseInt(user.total_wins),
          totalDeposits: parseFloat(user.total_deposits),
          totalWithdrawals: parseFloat(user.total_withdrawals)
        }
      },
      recentTransactions: transactionsResult.rows.map(t => ({
        ...t,
        amount: parseFloat(t.amount)
      })),
      recentGames: gamesResult.rows.map(g => ({
        ...g,
        prizePool: parseFloat(g.prize_pool),
        winnerAmount: parseFloat(g.prize_pool) - parseFloat(g.platform_fee_amount || '0')
      }))
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new user
export const createUser = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, balance = 0, isAdmin = false } = req.body;

  try {
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, balance, is_admin) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, first_name, last_name, email, balance, is_admin, created_at`,
      [firstName, lastName, email, passwordHash, balance, isAdmin]
    );

    const user = result.rows[0];

    // Log admin action to audit logs
    await logAdminAction(
      req.user!.userId,
      'USER_CREATED',
      user.id,
      req.ip,
      {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        initialBalance: parseFloat(user.balance),
        isAdmin: user.is_admin
      }
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { firstName, lastName, email, balance, isAdmin, isActive, password } = req.body;

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (balance !== undefined) {
      updates.push(`balance = $${paramCount++}`);
      values.push(balance);
    }
    if (isAdmin !== undefined) {
      updates.push(`is_admin = $${paramCount++}`);
      values.push(isAdmin);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    if (password !== undefined && password !== '') {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    const user = result.rows[0];
    const oldUser = userCheck.rows[0];

    // Determine what changed
    const changedFields = [];
    if (firstName !== undefined && firstName !== oldUser.first_name) changedFields.push('firstName');
    if (lastName !== undefined && lastName !== oldUser.last_name) changedFields.push('lastName');
    if (email !== undefined && email !== oldUser.email) changedFields.push('email');
    if (balance !== undefined && balance !== oldUser.balance) changedFields.push('balance');
    if (isAdmin !== undefined && isAdmin !== oldUser.is_admin) changedFields.push('isAdmin');
    if (isActive !== undefined && isActive !== oldUser.is_active) changedFields.push('isActive');
    if (password !== undefined && password !== '') changedFields.push('password');

    // Log admin action to audit logs
    await logAdminAction(
      req.user!.userId,
      'USER_UPDATED',
      userId,
      req.ip,
      {
        changedFields,
        email: user.email,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        balanceChange: balance !== undefined ? parseFloat(balance) - parseFloat(oldUser.balance) : 0
      }
    );

    return res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        isAdmin: user.is_admin,
        isActive: user.is_active,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle user status (activate/suspend)
export const toggleUserStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Don't allow suspending admin's own account
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET is_active = NOT is_active, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, is_active`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.json({
      message: `User ${user.is_active ? 'activated' : 'suspended'} successfully`,
      isActive: user.is_active
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (soft delete by deactivating)
export const deleteUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Don't allow deleting admin's own account
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user has active games
    const activeGamesCheck = await pool.query(
      `SELECT COUNT(*) FROM round_participants rp
       JOIN game_rounds gr ON gr.id = rp.round_id
       WHERE rp.user_id = $1 AND gr.completed_at IS NULL`,
      [userId]
    );

    if (parseInt(activeGamesCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete user with active games' });
    }

    // Get user info before deletion
    const userInfo = await pool.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    if (userInfo.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by deactivating
    const result = await pool.query(
      `UPDATE users
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [userId]
    );

    // Log admin action to audit logs
    await logAdminAction(
      req.user!.userId,
      'USER_DELETED',
      userId,
      req.ip,
      {
        email: userInfo.rows[0].email,
        firstName: userInfo.rows[0].first_name,
        lastName: userInfo.rows[0].last_name,
        deletionType: 'soft_delete'
      }
    );

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as suspended_users,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month,
        COALESCE(SUM(balance), 0) as total_balance
      FROM users
    `);

    return res.json({
      totalUsers: parseInt(stats.rows[0].total_users),
      activeUsers: parseInt(stats.rows[0].active_users),
      suspendedUsers: parseInt(stats.rows[0].suspended_users),
      adminUsers: parseInt(stats.rows[0].admin_users),
      newUsersWeek: parseInt(stats.rows[0].new_users_week),
      newUsersMonth: parseInt(stats.rows[0].new_users_month),
      totalBalance: parseFloat(stats.rows[0].total_balance)
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Deposit money to user account (Admin action)
export const depositToUser = async (req: Request & { user?: any }, res: Response) => {
  const { userId } = req.params;
  const { amount, description } = req.body;
  const adminId = req.user?.id;

  const client = await pool.connect();
  
  try {
    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if user exists
    const userResult = await client.query(
      'SELECT id, balance, first_name, last_name, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Update user balance
    const updateResult = await client.query(
      'UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, userId]
    );

    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO transactions 
       (user_id, type, amount, status, description, metadata, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        userId,
        'ADMIN_ADJUSTMENT',
        amount,
        'SUCCESS',
        description || `Admin deposit by ${req.user?.email}`,
        JSON.stringify({
          action: 'DEPOSIT',
          admin_id: adminId,
          admin_email: req.user?.email,
          previous_balance: parseFloat(user.balance),
          new_balance: parseFloat(updateResult.rows[0].balance)
        }),
        adminId
      ]
    );

    // Commit transaction
    await client.query('COMMIT');

    return res.json({
      message: 'Deposit successful',
      transaction: transactionResult.rows[0],
      newBalance: parseFloat(updateResult.rows[0].balance)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deposit error:', error);
    return res.status(500).json({ error: 'Failed to process deposit' });
  } finally {
    client.release();
  }
};

// Withdraw money from user account (Admin action)
export const withdrawFromUser = async (req: Request & { user?: any }, res: Response) => {
  const { userId } = req.params;
  const { amount, description } = req.body;
  const adminId = req.user?.id;

  const client = await pool.connect();
  
  try {
    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if user exists and has sufficient balance
    const userResult = await client.query(
      'SELECT id, balance, first_name, last_name, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    if (parseFloat(user.balance) < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient balance',
        currentBalance: parseFloat(user.balance),
        requestedAmount: amount
      });
    }

    // Update user balance
    const updateResult = await client.query(
      'UPDATE users SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING balance',
      [amount, userId]
    );

    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO transactions 
       (user_id, type, amount, status, description, metadata, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        userId,
        'ADMIN_ADJUSTMENT',
        -amount, // Negative amount for withdrawal
        'SUCCESS',
        description || `Admin withdrawal by ${req.user?.email}`,
        JSON.stringify({
          action: 'WITHDRAWAL',
          admin_id: adminId,
          admin_email: req.user?.email,
          previous_balance: parseFloat(user.balance),
          new_balance: parseFloat(updateResult.rows[0].balance)
        }),
        adminId
      ]
    );

    // Commit transaction
    await client.query('COMMIT');

    return res.json({
      message: 'Withdrawal successful',
      transaction: transactionResult.rows[0],
      newBalance: parseFloat(updateResult.rows[0].balance)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', error);
    return res.status(500).json({ error: 'Failed to process withdrawal' });
  } finally {
    client.release();
  }
};

// ============ Crypto Deposit Admin Endpoints ============

/**
 * GET /api/admin/deposits
 * Get all crypto deposits with filters
 */
export const getCryptoDeposits = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      network,
      userId,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      params.push(status);
      whereClause += ` AND cd.status = $${paramCount++}`;
    }

    if (network) {
      params.push(network);
      whereClause += ` AND cd.network = $${paramCount++}`;
    }

    if (userId) {
      params.push(userId);
      whereClause += ` AND cd.user_id = $${paramCount++}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(u.email) LIKE $${paramCount} OR
        LOWER(u.first_name) LIKE $${paramCount} OR
        LOWER(u.last_name) LIKE $${paramCount} OR
        LOWER(cd.payment_id) LIKE $${paramCount} OR
        LOWER(cd.tx_hash) LIKE $${paramCount}
      )`;
      paramCount++;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND cd.created_at >= $${paramCount++}`;
    }

    if (endDate) {
      params.push(endDate + ' 23:59:59');
      whereClause += ` AND cd.created_at <= $${paramCount++}`;
    }

    if (minAmount) {
      params.push(parseFloat(minAmount as string));
      whereClause += ` AND cd.expected_amount >= $${paramCount++}`;
    }

    if (maxAmount) {
      params.push(parseFloat(maxAmount as string));
      whereClause += ` AND cd.expected_amount <= $${paramCount++}`;
    }

    // Get deposits with user info
    const depositsResult = await pool.query(
      `SELECT
        cd.*,
        u.email as user_email,
        u.first_name,
        u.last_name
       FROM crypto_deposits cd
       JOIN users u ON cd.user_id = u.id
       ${whereClause}
       ORDER BY cd.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM crypto_deposits cd
       JOIN users u ON cd.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const deposits = depositsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: `${row.first_name} ${row.last_name}`,
      paymentId: row.payment_id,
      network: row.network,
      currency: row.currency,
      tokenStandard: row.token_standard,
      depositAddress: row.deposit_address,
      expectedAmount: parseFloat(row.expected_amount),
      receivedAmount: parseFloat(row.received_amount || 0),
      feeAmount: parseFloat(row.fee_amount || 0),
      netAmount: parseFloat(row.net_amount || 0),
      status: row.status,
      txHash: row.tx_hash,
      confirmations: row.confirmations,
      expiresAt: row.expires_at,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      errorMessage: row.error_message
    }));

    return res.json({
      success: true,
      data: deposits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get crypto deposits error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/admin/deposits/:id
 * Get single deposit with full details including webhook history
 */
export const getCryptoDepositById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid deposit ID' });
  }

  try {
    const result = await pool.query(
      `SELECT
        cd.*,
        u.email as user_email,
        u.first_name,
        u.last_name,
        t.id as linked_transaction_id,
        t.amount as transaction_amount,
        t.status as transaction_status,
        t.created_at as transaction_created_at
       FROM crypto_deposits cd
       JOIN users u ON cd.user_id = u.id
       LEFT JOIN transactions t ON cd.transaction_id = t.id
       WHERE cd.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      data: {
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: `${row.first_name} ${row.last_name}`,
        paymentId: row.payment_id,
        network: row.network,
        currency: row.currency,
        tokenStandard: row.token_standard,
        depositAddress: row.deposit_address,
        expectedAmount: parseFloat(row.expected_amount),
        receivedAmount: parseFloat(row.received_amount || 0),
        feeAmount: parseFloat(row.fee_amount || 0),
        netAmount: parseFloat(row.net_amount || 0),
        status: row.status,
        txHash: row.tx_hash,
        confirmations: row.confirmations,
        expiresAt: row.expires_at,
        confirmedAt: row.confirmed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        addressMode: row.address_mode,
        metadata: row.metadata,
        webhookHistory: row.webhook_data || [],
        errorMessage: row.error_message,
        linkedTransaction: row.linked_transaction_id ? {
          id: row.linked_transaction_id,
          amount: parseFloat(row.transaction_amount),
          status: row.transaction_status,
          createdAt: row.transaction_created_at
        } : null
      }
    });
  } catch (error) {
    console.error('Get crypto deposit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/admin/deposits/stats
 * Get crypto deposit statistics
 */
export const getCryptoDepositStats = async (_req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(expected_amount), 0) as total_expected_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN expected_amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN net_amount ELSE 0 END), 0) as confirmed_amount,
        COUNT(CASE WHEN status = 'overpaid' THEN 1 END) as overpaid,
        COALESCE(SUM(CASE WHEN status = 'overpaid' THEN net_amount ELSE 0 END), 0) as overpaid_amount,
        COUNT(CASE WHEN status = 'underpaid' THEN 1 END) as underpaid,
        COALESCE(SUM(CASE WHEN status = 'underpaid' THEN received_amount ELSE 0 END), 0) as underpaid_amount,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
      FROM crypto_deposits
    `);

    const networkStats = await pool.query(`
      SELECT
        network,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN status IN ('confirmed', 'overpaid') THEN net_amount ELSE 0 END), 0) as total_received
      FROM crypto_deposits
      GROUP BY network
      ORDER BY total_received DESC
    `);

    const row = stats.rows[0];

    return res.json({
      success: true,
      data: {
        overview: {
          total: parseInt(row.total),
          totalExpectedAmount: parseFloat(row.total_expected_amount),
          pending: parseInt(row.pending),
          pendingAmount: parseFloat(row.pending_amount),
          confirmed: parseInt(row.confirmed),
          confirmedAmount: parseFloat(row.confirmed_amount),
          overpaid: parseInt(row.overpaid),
          overpaidAmount: parseFloat(row.overpaid_amount),
          underpaid: parseInt(row.underpaid),
          underpaidAmount: parseFloat(row.underpaid_amount),
          expired: parseInt(row.expired),
          failed: parseInt(row.failed),
          canceled: parseInt(row.canceled)
        },
        period: {
          last24h: parseInt(row.last_24h),
          last7d: parseInt(row.last_7d),
          last30d: parseInt(row.last_30d)
        },
        byNetwork: networkStats.rows.map(n => ({
          network: n.network,
          count: parseInt(n.count),
          totalReceived: parseFloat(n.total_received)
        }))
      }
    });
  } catch (error) {
    console.error('Get crypto deposit stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};