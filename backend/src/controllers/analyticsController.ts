import { Request, Response } from 'express';
import pool from '../config/database';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get user statistics
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week
      FROM users
    `);

    // Get room statistics
    const roomStats = await pool.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_rooms,
        COUNT(CASE WHEN type = 'FAST_DROP' THEN 1 END) as fast_drop_rooms,
        COUNT(CASE WHEN type = 'TIME_DROP' THEN 1 END) as time_drop_rooms
      FROM rooms
    `);

    // Get financial statistics
    const financialStats = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'DEPOSIT' AND status = 'SUCCESS') as total_deposits,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'WITHDRAWAL' AND status = 'SUCCESS') as total_withdrawals,
        (SELECT COALESCE(SUM(platform_fee_amount), 0) FROM game_rounds WHERE completed_at IS NOT NULL) as total_commission
    `);

    // Get recent activity
    const recentActivity = await pool.query(`
      SELECT 
        'game_completed' as type,
        gr.completed_at as timestamp,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        r.name as room_name,
        gr.prize_pool as amount
      FROM game_rounds gr
      JOIN users u ON gr.winner_id = u.id
      JOIN rooms r ON gr.room_id = r.id
      WHERE gr.completed_at IS NOT NULL
      ORDER BY gr.completed_at DESC
      LIMIT 10
    `);

    return res.json({
      users: userStats.rows[0],
      rooms: roomStats.rows[0],
      financials: financialStats.rows[0],
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;
    
    let interval = '7 days';
    if (period === '30d') interval = '30 days';
    if (period === '90d') interval = '90 days';

    // Get revenue over time
    const revenueData = await pool.query(`
      SELECT 
        DATE(completed_at) as date,
        SUM(platform_fee_amount) as revenue,
        COUNT(*) as games_played
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `);

    // Get user growth
    const userGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get popular rooms
    const popularRooms = await pool.query(`
      SELECT 
        r.name,
        r.type,
        COUNT(gr.id) as games_played,
        SUM(gr.prize_pool) as total_volume,
        AVG(participant_count) as avg_players
      FROM rooms r
      LEFT JOIN game_rounds gr ON gr.room_id = r.id
      LEFT JOIN (
        SELECT round_id, COUNT(*) as participant_count
        FROM round_participants
        GROUP BY round_id
      ) pc ON pc.round_id = gr.id
      WHERE gr.completed_at > NOW() - INTERVAL '${interval}'
      GROUP BY r.id, r.name, r.type
      ORDER BY games_played DESC
      LIMIT 10
    `);

    // Get top players
    const topPlayers = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COUNT(CASE WHEN gr.winner_id = u.id THEN 1 END) as wins,
        COUNT(DISTINCT rp.round_id) as games_played,
        COALESCE(SUM(CASE WHEN gr.winner_id = u.id THEN gr.prize_pool - gr.platform_fee_amount END), 0) as total_winnings
      FROM users u
      JOIN round_participants rp ON rp.user_id = u.id
      JOIN game_rounds gr ON gr.id = rp.round_id
      WHERE gr.completed_at > NOW() - INTERVAL '${interval}'
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_winnings DESC
      LIMIT 10
    `);

    return res.json({
      revenueData: revenueData.rows,
      userGrowth: userGrowth.rows,
      popularRooms: popularRooms.rows,
      topPlayers: topPlayers.rows
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};