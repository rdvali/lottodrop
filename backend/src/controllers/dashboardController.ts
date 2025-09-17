import { Request, Response } from 'express';
import pool from '../config/database';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get total users count
    const usersResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month
      FROM users
    `);

    // Get active games count (rooms with status ACTIVE)
    const activeGamesResult = await pool.query(`
      SELECT COUNT(*) as active_games 
      FROM rooms 
      WHERE status = 'ACTIVE'
    `);

    // Get total revenue (sum of all commission amounts from completed games)
    const revenueResult = await pool.query(`
      SELECT 
        COALESCE(SUM(platform_fee_amount), 0) as total_revenue
      FROM game_rounds 
      WHERE completed_at IS NOT NULL
    `);

    // Get today's revenue
    const todayRevenueResult = await pool.query(`
      SELECT 
        COALESCE(SUM(platform_fee_amount), 0) as today_revenue
      FROM game_rounds 
      WHERE completed_at IS NOT NULL 
        AND DATE(completed_at) = CURRENT_DATE
    `);

    // Get weekly revenue data for chart
    const weeklyRevenueResult = await pool.query(`
      SELECT 
        TO_CHAR(DATE(completed_at), 'Dy') as day_name,
        DATE(completed_at) as date,
        COALESCE(SUM(platform_fee_amount), 0) as revenue,
        COUNT(*) as games_count
      FROM game_rounds
      WHERE completed_at IS NOT NULL
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(completed_at), TO_CHAR(DATE(completed_at), 'Dy')
      ORDER BY DATE(completed_at)
    `);

    // Calculate growth percentages
    const lastMonthUsersResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '60 days' 
        AND created_at < NOW() - INTERVAL '30 days'
    `);

    const yesterdayRevenueResult = await pool.query(`
      SELECT COALESCE(SUM(platform_fee_amount), 0) as yesterday_revenue
      FROM game_rounds
      WHERE DATE(completed_at) = CURRENT_DATE - INTERVAL '1 day'
    `);

    const yesterdayGamesResult = await pool.query(`
      SELECT COUNT(*) as yesterday_games
      FROM game_rounds
      WHERE DATE(completed_at) = CURRENT_DATE - INTERVAL '1 day'
    `);

    const todayGamesResult = await pool.query(`
      SELECT COUNT(*) as today_games
      FROM game_rounds
      WHERE DATE(completed_at) = CURRENT_DATE
    `);

    // Get recent activity
    const recentActivityResult = await pool.query(`
      (
        SELECT 
          'user_joined' as type,
          CONCAT('New user registered: ', email) as message,
          created_at as time,
          NULL as amount
        FROM users
        ORDER BY created_at DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 
          'game_completed' as type,
          CONCAT('Game #', SUBSTRING(gr.id::text, 1, 8), ' completed. Winner: ', 
                 COALESCE(u.first_name || ' ' || u.last_name, 'Unknown')) as message,
          gr.completed_at as time,
          gr.prize_pool as amount
        FROM game_rounds gr
        LEFT JOIN users u ON gr.winner_id = u.id
        WHERE gr.completed_at IS NOT NULL
        ORDER BY gr.completed_at DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 
          'deposit' as type,
          CONCAT('User ', COALESCE(u.first_name, 'Unknown'), ' deposited funds') as message,
          t.created_at as time,
          t.amount
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.type = 'DEPOSIT' AND t.status = 'SUCCESS'
        ORDER BY t.created_at DESC
        LIMIT 2
      )
      ORDER BY time DESC
      LIMIT 10
    `);

    // Get game distribution (Fast Drop vs Time Drop)
    const gameDistributionResult = await pool.query(`
      SELECT 
        r.type as room_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER(), 0), 2) as percentage
      FROM game_rounds gr
      JOIN rooms r ON gr.room_id = r.id
      WHERE gr.completed_at IS NOT NULL
      GROUP BY r.type
    `);

    // Calculate growth rates
    const totalUsers = parseInt(usersResult.rows[0].total_users);
    const newUsersMonth = parseInt(usersResult.rows[0].new_users_month);
    const lastMonthUsers = parseInt(lastMonthUsersResult.rows[0].count);
    const userGrowth = lastMonthUsers > 0 
      ? ((newUsersMonth - lastMonthUsers) / lastMonthUsers * 100).toFixed(1)
      : '0';

    const todayRevenue = parseFloat(todayRevenueResult.rows[0].today_revenue);
    const yesterdayRevenue = parseFloat(yesterdayRevenueResult.rows[0].yesterday_revenue);
    const revenueGrowth = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : '0';

    const todayGames = parseInt(todayGamesResult.rows[0].today_games);
    const yesterdayGames = parseInt(yesterdayGamesResult.rows[0].yesterday_games);
    const gameGrowth = yesterdayGames > 0
      ? ((todayGames - yesterdayGames) / yesterdayGames * 100).toFixed(1)
      : '0';

    // Format recent activity with relative time
    const formatRelativeTime = (timestamp: Date) => {
      const now = new Date();
      const time = new Date(timestamp);
      const diffMs = now.getTime() - time.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return time.toLocaleDateString();
    };

    const recentActivity = recentActivityResult.rows.map((activity: any) => ({
      type: activity.type,
      message: activity.message,
      time: formatRelativeTime(activity.time),
      amount: activity.amount ? parseFloat(activity.amount) : null
    }));

    // Prepare weekly chart data
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData = daysOfWeek.map(day => {
      const found = weeklyRevenueResult.rows.find((row: any) => 
        row.day_name.startsWith(day)
      );
      return {
        name: day,
        revenue: found ? parseFloat(found.revenue) : 0,
        games: found ? parseInt(found.games_count) : 0
      };
    });

    // Prepare game distribution data
    const gameDistribution = gameDistributionResult.rows.map((row: any) => ({
      type: row.room_type,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage)
    }));

    res.json({
      stats: {
        totalUsers,
        activeGames: parseInt(activeGamesResult.rows[0].active_games),
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
        todayRevenue,
        userGrowth: parseFloat(userGrowth),
        gameGrowth: parseFloat(gameGrowth),
        revenueGrowth: parseFloat(revenueGrowth)
      },
      chartData: weeklyData,
      gameDistribution,
      recentActivity
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const getWeeklyRevenue = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date
      )
      SELECT 
        TO_CHAR(ds.date, 'Dy') as day_name,
        ds.date,
        COALESCE(SUM(gr.platform_fee_amount), 0) as revenue,
        COALESCE(COUNT(gr.id), 0) as games_count,
        COALESCE(COUNT(DISTINCT gr.winner_id), 0) as unique_winners
      FROM date_series ds
      LEFT JOIN game_rounds gr ON DATE(gr.completed_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date
    `);

    const chartData = result.rows.map((row: any) => ({
      name: row.day_name,
      date: row.date,
      revenue: parseFloat(row.revenue),
      games: parseInt(row.games_count),
      winners: parseInt(row.unique_winners)
    }));

    res.json({ chartData });
  } catch (error) {
    console.error('Weekly revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly revenue data' });
  }
};