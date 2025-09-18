import { Request, Response } from 'express';
import pool from '../config/database';

// Helper function to get relative time
const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
};

// Helper function to mask player name for privacy using industry-standard "First Name + Last Initial" format
const maskPlayerName = (firstName: string, lastName: string, userId: string): string => {
  // Sanitize and format names
  const cleanFirstName = firstName?.trim() || '';
  const cleanLastName = lastName?.trim() || '';

  // Industry-standard format: "First Name + Last Initial"
  if (cleanFirstName && cleanLastName) {
    const lastInitial = cleanLastName[0].toUpperCase();
    return `${cleanFirstName} ${lastInitial}`;
  } else if (cleanFirstName) {
    return cleanFirstName;
  } else if (cleanLastName) {
    const lastInitial = cleanLastName[0].toUpperCase();
    return `User ${lastInitial}`;
  } else {
    return 'Anonymous';
  }
};

export const getResults = async (req: Request, res: Response) => {
  try {
    // Get the last 20 completed game rounds that have actual winners
    const query = `
      SELECT
        gr.id as round_id,
        gr.completed_at,
        r.name as room_name,
        r.type as room_type,
        gr.winner_id as user_id,
        (gr.prize_pool - COALESCE(gr.platform_fee_amount, 0)) as prize_won,
        u.first_name,
        u.last_name
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      WHERE gr.completed_at IS NOT NULL
        AND gr.winner_id IS NOT NULL
      ORDER BY gr.completed_at DESC
      LIMIT 20
    `;

    const result = await pool.query(query);

    // Format results for frontend
    const formattedResults = result.rows.map((row) => ({
      roundId: row.round_id,
      userId: row.user_id,
      playerName: maskPlayerName(row.first_name, row.last_name, row.user_id),
      roomName: row.room_name,
      roomType: row.room_type || 'FAST_DROP',
      prizeWon: parseFloat(row.prize_won),
      completedAt: row.completed_at,
      timeAgo: getRelativeTime(row.completed_at)
    }));

    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch results'
    });
  }
};

export const getResultsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT
        gr.id as round_id,
        gr.completed_at,
        r.name as room_name,
        r.type as room_type,
        gr.winner_id as user_id,
        (gr.prize_pool - COALESCE(gr.platform_fee_amount, 0)) as prize_won,
        u.first_name,
        u.last_name
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      WHERE gr.completed_at IS NOT NULL
        AND gr.winner_id IS NOT NULL
        AND gr.winner_id = $1
      ORDER BY gr.completed_at DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [userId]);

    const formattedResults = result.rows.map((row) => ({
      roundId: row.round_id,
      userId: row.user_id,
      playerName: maskPlayerName(row.first_name, row.last_name, row.user_id),
      roomName: row.room_name,
      roomType: row.room_type || 'FAST_DROP',
      prizeWon: parseFloat(row.prize_won),
      completedAt: row.completed_at,
      timeAgo: getRelativeTime(row.completed_at)
    }));

    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('Error fetching user results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user results'
    });
  }
};

export const getResultsByRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const query = `
      SELECT
        gr.id as round_id,
        gr.completed_at,
        r.name as room_name,
        r.type as room_type,
        gr.winner_id as user_id,
        (gr.prize_pool - COALESCE(gr.platform_fee_amount, 0)) as prize_won,
        u.first_name,
        u.last_name
      FROM game_rounds gr
      LEFT JOIN rooms r ON gr.room_id = r.id
      LEFT JOIN users u ON gr.winner_id = u.id
      WHERE gr.completed_at IS NOT NULL
        AND gr.winner_id IS NOT NULL
        AND gr.room_id = $1
      ORDER BY gr.completed_at DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [roomId]);

    const formattedResults = result.rows.map((row) => ({
      roundId: row.round_id,
      userId: row.user_id,
      playerName: maskPlayerName(row.first_name, row.last_name, row.user_id),
      roomName: row.room_name,
      roomType: row.room_type || 'FAST_DROP',
      prizeWon: parseFloat(row.prize_won),
      completedAt: row.completed_at,
      timeAgo: getRelativeTime(row.completed_at)
    }));

    res.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('Error fetching room results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room results'
    });
  }
};