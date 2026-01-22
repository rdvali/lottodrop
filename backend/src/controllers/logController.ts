import { Request, Response } from 'express';
import pool from '../config/database';

// Helper function to parse user agent into readable device/browser string
function parseUserAgent(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';

  const ua = userAgent.toLowerCase();

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('mac os x') || ua.includes('macintosh')) os = 'MacOS';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  // Detect Browser
  let browser = 'Unknown Browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

  // Detect API clients
  if (ua.includes('curl')) return 'cURL';
  if (ua.includes('postman')) return 'Postman';
  if (ua.includes('insomnia')) return 'Insomnia';
  if (ua.includes('httpie')) return 'HTTPie';

  return `${os} ${browser}`;
}

// Helper function to normalize IP address (remove IPv6 prefix)
function normalizeIpAddress(ip: string | null | undefined): string {
  if (!ip) return 'Unknown IP';

  // Remove IPv6-mapped IPv4 prefix (::ffff:)
  return ip.replace(/^::ffff:/i, '');
}

// Helper function to format authentication logs for user-friendly display
function formatAuthLogDescription(log: any): string {
  // Handle user name - if null or missing, use generic text for session expired
  let userName: string;
  if (log.user_name && log.user_name.trim() !== '') {
    userName = `${log.user_name} (${log.user_email})`;
  } else if (log.user_email && log.user_email.trim() !== '') {
    userName = log.user_email;
  } else if (log.action === 'SESSION_EXPIRED') {
    userName = 'User';  // Generic "User" for session expired without user info
  } else {
    userName = 'Unknown user';
  }

  const device = parseUserAgent(log.user_agent);
  const ip = normalizeIpAddress(log.ip_address);

  const actionMap: Record<string, string> = {
    'LOGIN': log.status === 'SUCCESS' ? 'logged in successfully' : 'failed to log in',
    'LOGOUT': 'logged out',
    'REGISTER': 'registered a new account',
    'PASSWORD_CHANGE': log.status === 'SUCCESS' ? 'changed their password' : 'failed to change password',
    'TOKEN_REFRESH': 'refreshed their session token',
    'UNAUTHORIZED_ACCESS': 'attempted unauthorized access',
    'SESSION_EXPIRED': 'session expired',
    'AUTH_FAILURE': 'authentication failed'
  };

  const actionText = actionMap[log.action] || log.action.toLowerCase().replace(/_/g, ' ');

  if (log.action === 'UNAUTHORIZED_ACCESS' && !log.user_id) {
    return `Unauthorized access attempt from ${ip} using ${device}`;
  }

  return `${userName} ${actionText} from ${ip} using ${device}`;
}

// Helper function to format audit logs for user-friendly display
function formatAuditLogDescription(log: any): string {
  const userName = log.user_name ? `${log.user_name}` : log.user_email || 'System';
  const roomName = log.room_name ? `'${log.room_name}'` : 'Unknown Room';
  const winnerName = log.winner_name || 'Unknown Winner';

  const eventMap: Record<string, string> = {
    'SEED_GENERATION': `New seed generated for room ${roomName}${log.round_id ? ` (Round #${log.round_id.substring(0, 8)})` : ''}`,
    'SEED_USAGE': `Winner selected in ${roomName}: ${winnerName}${log.details?.prizeAmount ? ` won $${log.details.prizeAmount}` : ''}`,
    'ROUND_ARCHIVAL': `Round ${log.round_id ? `#${log.round_id.substring(0, 8)}` : ''} archived after completion`,
    'SEED_REUSE_ATTEMPT': `⚠️ Seed reuse attempt detected in ${roomName}`,
    'INVALID_SEED_FORMAT': `⚠️ Invalid seed format submitted${log.user_id ? ` by ${userName}` : ''}`,
    'CONCURRENT_ROUND_CREATION': `⚠️ Concurrent round creation detected in ${roomName}`,
    'SUSPICIOUS_PATTERN': `⚠️ Suspicious activity detected${log.user_id ? ` by ${userName}` : ''}`
  };

  return eventMap[log.event_type] || `${log.event_type}: ${log.details?.description || 'No description'}`;
}

/**
 * GET /api/admin/logs/auth
 * Get authentication logs (all users) with filters
 */
export const getAuthLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      userId,
      action,
      status,
      startDate,
      endDate,
      ipAddress,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search // Search by user email/name
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause dynamically
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`al.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (action && action !== 'all') {
      conditions.push(`al.action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (status && status !== 'all') {
      conditions.push(`al.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (ipAddress) {
      conditions.push(`al.ip_address ILIKE $${paramIndex}`);
      params.push(`%${ipAddress}%`);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Validate sort column
    const validSortColumns = ['created_at', 'action', 'status'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Query logs with user join
    const logsQuery = `
      SELECT
        al.id,
        al.user_id,
        al.action,
        al.ip_address,
        al.user_agent,
        al.status,
        al.metadata,
        al.created_at,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM auth_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${whereClause}
      ORDER BY al.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNum, offset);

    const logsResult = await pool.query(logsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM auth_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // Format logs for user-friendly display
    const formattedLogs = logsResult.rows.map(log => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      userEmail: log.user_email,
      action: log.action,
      actionDisplay: log.action.replace(/_/g, ' '),
      ipAddress: normalizeIpAddress(log.ip_address),
      device: parseUserAgent(log.user_agent),
      status: log.status,
      metadata: log.metadata,
      timestamp: log.created_at,
      description: formatAuthLogDescription(log)
    }));

    // Get statistics for the current filter
    const statsQuery = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'TIMEOUT' THEN 1 END) as timeout_count,
        COUNT(CASE WHEN status IN ('FAILED', 'TIMEOUT') THEN 1 END) as total_failures,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN action = 'LOGIN' AND status = 'FAILED' THEN 1 END) as failed_logins
      FROM auth_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${whereClause}
    `;

    const statsResult = await pool.query(statsQuery, params.slice(0, -2));

    return res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      statistics: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Get auth logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve authentication logs'
    });
  }
};

/**
 * GET /api/admin/logs/audit
 * Get audit logs (system-wide) with filters
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      eventType,
      severity,
      userId,
      roomId,
      roundId,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search // Search by user email/room name
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause dynamically
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (eventType && eventType !== 'all') {
      conditions.push(`al.event_type = $${paramIndex}`);
      params.push(eventType);
      paramIndex++;
    }

    if (severity && severity !== 'all') {
      conditions.push(`al.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`al.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (roomId) {
      conditions.push(`al.room_id = $${paramIndex}`);
      params.push(roomId);
      paramIndex++;
    }

    if (roundId) {
      conditions.push(`al.round_id = $${paramIndex}`);
      params.push(roundId);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR r.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Validate sort column
    const validSortColumns = ['created_at', 'event_type', 'severity'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Query logs with joins
    const logsQuery = `
      SELECT
        al.id,
        al.event_type,
        al.room_id,
        al.round_id,
        al.user_id,
        al.server_seed,
        al.winner_id,
        al.details,
        al.severity,
        al.created_at,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        r.name as room_name,
        w.email as winner_email,
        CONCAT(w.first_name, ' ', w.last_name) as winner_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN users w ON w.id = al.winner_id
      LEFT JOIN rooms r ON r.id = al.room_id
      WHERE ${whereClause}
      ORDER BY al.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNum, offset);

    const logsResult = await pool.query(logsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN rooms r ON r.id = al.room_id
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // Format logs for user-friendly display
    const formattedLogs = logsResult.rows.map(log => ({
      id: log.id,
      eventType: log.event_type,
      eventTypeDisplay: log.event_type.replace(/_/g, ' '),
      roomId: log.room_id,
      roomName: log.room_name,
      roundId: log.round_id,
      userId: log.user_id,
      userName: log.user_name,
      userEmail: log.user_email,
      winnerId: log.winner_id,
      winnerName: log.winner_name,
      winnerEmail: log.winner_email,
      serverSeed: log.server_seed,
      details: log.details,
      severity: log.severity,
      timestamp: log.created_at,
      description: formatAuditLogDescription(log)
    }));

    // Get statistics for the current filter
    const statsQuery = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_severity,
        COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_severity,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_severity,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_severity,
        COUNT(DISTINCT room_id) as unique_rooms,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN rooms r ON r.id = al.room_id
      WHERE ${whereClause}
    `;

    const statsResult = await pool.query(statsQuery, params.slice(0, -2));

    return res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      statistics: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    });
  }
};

/**
 * GET /api/admin/logs/security
 * Get security events only (HIGH/CRITICAL severity)
 */
export const getSecurityLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      severity,
      eventType,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause (only HIGH and CRITICAL)
    const conditions: string[] = ["al.severity IN ('HIGH', 'CRITICAL')"];
    const params: any[] = [];
    let paramIndex = 1;

    if (severity && (severity === 'HIGH' || severity === 'CRITICAL')) {
      conditions.push(`al.severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (eventType && eventType !== 'all') {
      conditions.push(`al.event_type = $${paramIndex}`);
      params.push(eventType);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Validate sort column
    const validSortColumns = ['created_at', 'event_type', 'severity'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Query security logs
    const logsQuery = `
      SELECT
        al.id,
        al.event_type,
        al.room_id,
        al.round_id,
        al.user_id,
        al.server_seed,
        al.details,
        al.severity,
        al.created_at,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        r.name as room_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN rooms r ON r.id = al.room_id
      WHERE ${whereClause}
      ORDER BY al.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNum, offset);

    const logsResult = await pool.query(logsQuery, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // Format logs
    const formattedLogs = logsResult.rows.map(log => ({
      id: log.id,
      eventType: log.event_type,
      eventTypeDisplay: log.event_type.replace(/_/g, ' '),
      roomId: log.room_id,
      roomName: log.room_name,
      roundId: log.round_id,
      userId: log.user_id,
      userName: log.user_name,
      userEmail: log.user_email,
      serverSeed: log.server_seed,
      details: log.details,
      severity: log.severity,
      timestamp: log.created_at,
      description: formatAuditLogDescription(log)
    }));

    return res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Get security logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve security logs'
    });
  }
};

/**
 * GET /api/admin/logs/stats
 * Get log statistics for dashboard
 */
export const getLogStats = async (req: Request, res: Response) => {
  try {
    // Get auth log statistics (last 24 hours)
    const authStatsQuery = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN action = 'LOGIN' AND status = 'SUCCESS' THEN 1 END) as successful_logins,
        COUNT(CASE WHEN action = 'LOGIN' AND status = 'FAILED' THEN 1 END) as failed_logins,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as total_failures
      FROM auth_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const authStatsResult = await pool.query(authStatsQuery);

    // Get audit log statistics (last 24 hours)
    const auditStatsQuery = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_count,
        COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_count,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_count,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
        COUNT(CASE WHEN event_type IN ('SEED_REUSE_ATTEMPT', 'INVALID_SEED_FORMAT', 'CONCURRENT_ROUND_CREATION', 'SUSPICIOUS_PATTERN') THEN 1 END) as security_events
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const auditStatsResult = await pool.query(auditStatsQuery);

    // Get 7-day activity trend for charts
    const activityTrendQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as auth_log_count
      FROM auth_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const activityTrendResult = await pool.query(activityTrendQuery);

    // Get recent critical security alerts (last 10)
    const recentAlertsQuery = `
      SELECT
        al.id,
        al.event_type,
        al.severity,
        al.created_at,
        r.name as room_name
      FROM audit_logs al
      LEFT JOIN rooms r ON r.id = al.room_id
      WHERE al.severity = 'CRITICAL'
      ORDER BY al.created_at DESC
      LIMIT 10
    `;

    const recentAlertsResult = await pool.query(recentAlertsQuery);

    return res.json({
      success: true,
      authStats: authStatsResult.rows[0],
      auditStats: auditStatsResult.rows[0],
      activityTrend: activityTrendResult.rows,
      recentAlerts: recentAlertsResult.rows.map(alert => ({
        id: alert.id,
        eventType: alert.event_type,
        eventTypeDisplay: alert.event_type.replace(/_/g, ' '),
        severity: alert.severity,
        roomName: alert.room_name,
        timestamp: alert.created_at
      }))
    });

  } catch (error) {
    console.error('Get log stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve log statistics'
    });
  }
};
