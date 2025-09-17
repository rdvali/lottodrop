import { Request, Response } from 'express';
import pool from '../config/database';

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      search = '',
      type = '',
      status = '',
      startDate = '',
      endDate = '',
      minAmount = '',
      maxAmount = '',
      userId = ''
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = [];
    let params: any[] = [];
    let paramCount = 1;

    // Search filter (transaction ID, user name, email, description)
    if (search) {
      whereConditions.push(`(
        t.id::text ILIKE $${paramCount} OR
        t.description ILIKE $${paramCount} OR
        u.first_name ILIKE $${paramCount} OR
        u.last_name ILIKE $${paramCount} OR
        u.email ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Type filter
    if (type && type !== 'all') {
      const types = String(type).split(',').filter(Boolean);
      if (types.length > 0) {
        whereConditions.push(`t.type = ANY($${paramCount})`);
        params.push(types);
        paramCount++;
      }
    }

    // Status filter
    if (status && status !== 'all') {
      whereConditions.push(`t.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Date range filter
    if (startDate) {
      whereConditions.push(`t.created_at >= $${paramCount}`);
      params.push(startDate);
      paramCount++;
    }
    if (endDate) {
      whereConditions.push(`t.created_at <= $${paramCount}`);
      params.push(endDate);
      paramCount++;
    }

    // Amount range filter
    if (minAmount) {
      whereConditions.push(`ABS(t.amount) >= $${paramCount}`);
      params.push(Number(minAmount));
      paramCount++;
    }
    if (maxAmount) {
      whereConditions.push(`ABS(t.amount) <= $${paramCount}`);
      params.push(Number(maxAmount));
      paramCount++;
    }

    // User ID filter
    if (userId) {
      whereConditions.push(`t.user_id = $${paramCount}`);
      params.push(userId);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get transactions with user info and admin info for adjustments
    const result = await pool.query(`
      SELECT 
        t.*,
        u.first_name,
        u.last_name,
        u.email,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name,
        admin.email as admin_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users admin ON t.created_by = admin.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...params, Number(limit), offset]);

    // Get total count with filters
    const countResult = await pool.query(`
      SELECT COUNT(*) 
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].count);

    // Get statistics for the filtered results
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_debits,
        SUM(t.amount) as net_amount,
        COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN t.status = 'FAILED' THEN 1 END) as failed_count
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
    `, params);

    const stats = statsResult.rows[0];

    return res.json({
      transactions: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: `${row.first_name} ${row.last_name}`,
        userEmail: row.email,
        type: row.type,
        amount: parseFloat(row.amount),
        currency: row.currency || 'USD',
        status: row.status,
        referenceId: row.reference_id,
        description: row.description,
        metadata: row.metadata,
        createdBy: row.created_by,
        adminName: row.admin_first_name ? `${row.admin_first_name} ${row.admin_last_name}` : null,
        adminEmail: row.admin_email,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      statistics: {
        totalTransactions: parseInt(stats.total_transactions),
        totalCredits: parseFloat(stats.total_credits || 0),
        totalDebits: parseFloat(stats.total_debits || 0),
        netAmount: parseFloat(stats.net_amount || 0),
        pendingCount: parseInt(stats.pending_count),
        failedCount: parseInt(stats.failed_count)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactionDetails = async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        u.first_name,
        u.last_name,
        u.email,
        u.balance as current_user_balance,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name,
        admin.email as admin_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users admin ON t.created_by = admin.id
      WHERE t.id = $1
    `, [transactionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    // Get related transactions if this is a game transaction
    let relatedTransactions = [];
    if (transaction.reference_id && (transaction.type === 'BET' || transaction.type === 'WIN')) {
      const relatedResult = await pool.query(`
        SELECT 
          t.*,
          u.first_name,
          u.last_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.reference_id = $1 AND t.id != $2
        ORDER BY t.created_at DESC
      `, [transaction.reference_id, transactionId]);
      relatedTransactions = relatedResult.rows;
    }

    return res.json({ 
      transaction: {
        id: transaction.id,
        userId: transaction.user_id,
        userName: `${transaction.first_name} ${transaction.last_name}`,
        userEmail: transaction.email,
        currentUserBalance: parseFloat(transaction.current_user_balance),
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency || 'USD',
        status: transaction.status,
        referenceId: transaction.reference_id,
        description: transaction.description,
        metadata: transaction.metadata,
        createdBy: transaction.created_by,
        adminName: transaction.admin_first_name ? `${transaction.admin_first_name} ${transaction.admin_last_name}` : null,
        adminEmail: transaction.admin_email,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at
      },
      relatedTransactions: relatedTransactions.map(t => ({
        id: t.id,
        userName: `${t.first_name} ${t.last_name}`,
        type: t.type,
        amount: parseFloat(t.amount),
        status: t.status,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveTransaction = async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  
  try {
    const result = await pool.query(
      `UPDATE transactions 
       SET status = 'COMPLETED', updated_at = NOW() 
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or already processed' });
    }

    return res.json({ 
      message: 'Transaction approved successfully',
      transaction: result.rows[0] 
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectTransaction = async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const { reason } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE transactions 
       SET status = 'FAILED', updated_at = NOW(), description = $2
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [transactionId, reason || 'Rejected by admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found or already processed' });
    }

    return res.json({ 
      message: 'Transaction rejected successfully',
      transaction: result.rows[0] 
    });
  } catch (error) {
    console.error('Reject transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};