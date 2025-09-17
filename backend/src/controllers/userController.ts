import { Request, Response } from 'express';
import pool from '../config/database';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(`
      SELECT 
        id,
        email,
        first_name,
        last_name,
        balance,
        is_active,
        is_admin,
        created_at,
        last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [Number(limit), offset]);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      users: result.rows,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's transaction history
    const transactionsResult = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    // Get user's game history
    const gamesResult = await pool.query(
      `SELECT 
        gr.id as round_id,
        r.name as room_name,
        rp.bet_amount,
        gr.completed_at,
        CASE WHEN gr.winner_id = $1 THEN true ELSE false END as won
       FROM round_participants rp
       JOIN game_rounds gr ON rp.round_id = gr.id
       JOIN rooms r ON gr.room_id = r.id
       WHERE rp.user_id = $1
       ORDER BY gr.created_at DESC
       LIMIT 10`,
      [userId]
    );

    return res.json({
      user: userResult.rows[0],
      transactions: transactionsResult.rows,
      games: gamesResult.rows
    });
  } catch (error) {
    console.error('Get user details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'User status updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserBalance = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { amount, type, description } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update user balance
    const userResult = await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING *',
      [amount, userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    // Create transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, status, description)
       VALUES ($1, $2, $3, 'COMPLETED', $4)`,
      [userId, type || 'ADJUSTMENT', Math.abs(amount), description || 'Admin adjustment']
    );

    await client.query('COMMIT');

    return res.json({
      message: 'User balance updated successfully',
      user: userResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user balance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};