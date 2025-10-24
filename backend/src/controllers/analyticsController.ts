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

// Get KPIs for Analytics page
export const getKPIs = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const previousDays = days * 2;

    // Get current period revenue
    const currentRevenue = await pool.query(`
      SELECT COALESCE(SUM(platform_fee_amount), 0) as total
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${days} days'
    `);

    // Get previous period revenue for comparison
    const previousRevenue = await pool.query(`
      SELECT COALESCE(SUM(platform_fee_amount), 0) as total
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${previousDays} days'
        AND completed_at <= NOW() - INTERVAL '${days} days'
    `);

    // Calculate revenue change percentage
    const currentRev = parseFloat(currentRevenue.rows[0].total) || 0;
    const previousRev = parseFloat(previousRevenue.rows[0].total) || 0;
    const revenueChange = previousRev > 0
      ? ((currentRev - previousRev) / previousRev) * 100
      : 0;

    // Get active users (users who played in current period)
    const currentUsers = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM round_participants rp
      JOIN game_rounds gr ON gr.id = rp.round_id
      WHERE gr.completed_at > NOW() - INTERVAL '${days} days'
    `);

    // Get previous period active users
    const previousUsers = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM round_participants rp
      JOIN game_rounds gr ON gr.id = rp.round_id
      WHERE gr.completed_at > NOW() - INTERVAL '${previousDays} days'
        AND gr.completed_at <= NOW() - INTERVAL '${days} days'
    `);

    const currentUserCount = parseInt(currentUsers.rows[0].count) || 0;
    const previousUserCount = parseInt(previousUsers.rows[0].count) || 0;
    const usersChange = previousUserCount > 0
      ? ((currentUserCount - previousUserCount) / previousUserCount) * 100
      : 0;

    // Get games played
    const currentGames = await pool.query(`
      SELECT COUNT(*) as count
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${days} days'
    `);

    const previousGames = await pool.query(`
      SELECT COUNT(*) as count
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${previousDays} days'
        AND completed_at <= NOW() - INTERVAL '${days} days'
    `);

    const currentGameCount = parseInt(currentGames.rows[0].count) || 0;
    const previousGameCount = parseInt(previousGames.rows[0].count) || 0;
    const gamesChange = previousGameCount > 0
      ? ((currentGameCount - previousGameCount) / previousGameCount) * 100
      : 0;

    // Calculate conversion rate (users who won / active users)
    const winners = await pool.query(`
      SELECT COUNT(DISTINCT winner_id) as count
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${days} days'
        AND winner_id IS NOT NULL
    `);

    const winnerCount = parseInt(winners.rows[0].count) || 0;
    const conversionRate = currentUserCount > 0
      ? (winnerCount / currentUserCount) * 100
      : 0;

    // Previous period conversion rate
    const previousWinners = await pool.query(`
      SELECT COUNT(DISTINCT winner_id) as count
      FROM game_rounds
      WHERE completed_at > NOW() - INTERVAL '${previousDays} days'
        AND completed_at <= NOW() - INTERVAL '${days} days'
        AND winner_id IS NOT NULL
    `);

    const previousWinnerCount = parseInt(previousWinners.rows[0].count) || 0;
    const previousConversionRate = previousUserCount > 0
      ? (previousWinnerCount / previousUserCount) * 100
      : 0;

    const conversionChange = previousConversionRate > 0
      ? conversionRate - previousConversionRate
      : 0;

    return res.json({
      totalRevenue: currentRev,
      revenueChange: Math.round(revenueChange * 10) / 10,
      activeUsers: currentUserCount,
      usersChange: Math.round(usersChange * 10) / 10,
      gamesPlayed: currentGameCount,
      gamesChange: Math.round(gamesChange * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      conversionChange: Math.round(conversionChange * 10) / 10
    });
  } catch (error) {
    console.error('Get KPIs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Get revenue trends by date and game type
    const trends = await pool.query(`
      SELECT
        TO_CHAR(DATE(completed_at), 'Mon DD') as date,
        SUM(CASE WHEN r.type = 'FAST_DROP' THEN platform_fee_amount ELSE 0 END) as "fastDrop",
        SUM(CASE WHEN r.type = 'TIME_DROP' THEN platform_fee_amount ELSE 0 END) as "timeDrop",
        SUM(platform_fee_amount) as total
      FROM game_rounds gr
      JOIN rooms r ON r.id = gr.room_id
      WHERE gr.completed_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(completed_at)
      ORDER BY DATE(completed_at) ASC
    `);

    // Get total revenue by game type
    const byGameType = await pool.query(`
      SELECT
        r.type,
        SUM(platform_fee_amount) as total
      FROM game_rounds gr
      JOIN rooms r ON r.id = gr.room_id
      WHERE gr.completed_at > NOW() - INTERVAL '${days} days'
      GROUP BY r.type
    `);

    const gameTypeRevenue: { [key: string]: number } = {};
    byGameType.rows.forEach(row => {
      gameTypeRevenue[row.type] = parseFloat(row.total) || 0;
    });

    return res.json({
      trends: trends.rows,
      byGameType: gameTypeRevenue
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user analytics
export const getUserAnalytics = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Get user growth (new vs returning)
    const growth = await pool.query(`
      SELECT
        TO_CHAR(DATE(gr.completed_at), 'Mon DD') as date,
        COUNT(DISTINCT CASE
          WHEN u.created_at > gr.completed_at - INTERVAL '7 days'
          THEN rp.user_id
        END) as new,
        COUNT(DISTINCT CASE
          WHEN u.created_at <= gr.completed_at - INTERVAL '7 days'
          THEN rp.user_id
        END) as returning
      FROM game_rounds gr
      JOIN round_participants rp ON rp.round_id = gr.id
      JOIN users u ON u.id = rp.user_id
      WHERE gr.completed_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(gr.completed_at)
      ORDER BY DATE(gr.completed_at) ASC
    `);

    return res.json({
      growth: growth.rows
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get top performing rooms
export const getTopRooms = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const topRooms = await pool.query(`
      SELECT
        r.id,
        r.name,
        r.type,
        COUNT(gr.id) as plays,
        COALESCE(SUM(gr.platform_fee_amount), 0) as revenue,
        ROUND(AVG(
          CASE
            WHEN r.max_players > 0
            THEN (participant_count::float / r.max_players * 100)
            ELSE 0
          END
        )) as "fillRate"
      FROM rooms r
      LEFT JOIN game_rounds gr ON gr.room_id = r.id
      LEFT JOIN (
        SELECT round_id, COUNT(*) as participant_count
        FROM round_participants
        GROUP BY round_id
      ) pc ON pc.round_id = gr.id
      WHERE gr.completed_at IS NOT NULL
      GROUP BY r.id, r.name, r.type, r.max_players
      ORDER BY revenue DESC
      LIMIT $1
    `, [limit]);

    const rooms = topRooms.rows.map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      plays: parseInt(room.plays) || 0,
      revenue: parseFloat(room.revenue) || 0,
      fillRate: parseInt(room.fillRate) || 0
    }));

    return res.json({ rooms });
  } catch (error) {
    console.error('Get top rooms error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Export analytics data as CSV
export const exportAnalytics = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    // Get comprehensive analytics data
    const analyticsData = await pool.query(`
      SELECT
        TO_CHAR(gr.completed_at, 'YYYY-MM-DD HH24:MI:SS') as "Completed At",
        r.name as "Room Name",
        r.type as "Game Type",
        gr.prize_pool as "Prize Pool",
        gr.platform_fee_amount as "Platform Fee",
        u.email as "Winner Email",
        (
          SELECT COUNT(*) FROM round_participants
          WHERE round_id = gr.id
        ) as "Participants"
      FROM game_rounds gr
      JOIN rooms r ON r.id = gr.room_id
      LEFT JOIN users u ON u.id = gr.winner_id
      WHERE gr.completed_at > NOW() - INTERVAL '${days} days'
      ORDER BY gr.completed_at DESC
    `);

    // Convert to CSV
    if (analyticsData.rows.length === 0) {
      return res.status(404).json({ error: 'No data available for export' });
    }

    const headers = Object.keys(analyticsData.rows[0]);
    const csvHeader = headers.join(',');
    const csvRows = analyticsData.rows.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = value !== null ? String(value) : '';
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    );

    const csv = [csvHeader, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${days}days-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Export analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};