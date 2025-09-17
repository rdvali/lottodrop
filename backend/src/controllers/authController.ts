import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthPayload } from '../types';

export const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

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
      `INSERT INTO users (first_name, last_name, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, first_name, last_name, email, balance, currency, is_admin, created_at`,
      [firstName, lastName, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    } as jwt.SignOptions);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        currency: user.currency,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);

  try {
    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    console.log('Querying database for user...');
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, balance, currency, is_admin, is_active 
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('User found:', result.rows[0].email);

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    } as jwt.SignOptions);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        balance: parseFloat(user.balance),
        currency: user.currency,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', (error as Error).stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, balance, currency, is_admin, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      balance: parseFloat(user.balance),
      currency: user.currency,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  try {
    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const passwordMatch = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserRooms = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  try {
    // Get all rooms where user is currently participating in active rounds
    const result = await pool.query(
      `SELECT DISTINCT r.id, r.name, r.type, r.bet_amount, r.status,
              gr.id as round_id, rp.bet_amount as user_bet, gr.created_at
       FROM rooms r
       JOIN game_rounds gr ON gr.room_id = r.id
       JOIN round_participants rp ON rp.round_id = gr.id
       WHERE rp.user_id = $1 
         AND gr.completed_at IS NULL
         AND r.status IN ('WAITING', 'ACTIVE')
       ORDER BY gr.created_at DESC`,
      [userId]
    );
    
    return res.json({
      rooms: result.rows
    });
  } catch (error) {
    console.error('Get user rooms error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};