import pool from '../config/database';

// Centralized logging utility for seed generation and usage audit
export class SeedAuditLogger {
  private static instance: SeedAuditLogger;
  
  public static getInstance(): SeedAuditLogger {
    if (!SeedAuditLogger.instance) {
      SeedAuditLogger.instance = new SeedAuditLogger();
    }
    return SeedAuditLogger.instance;
  }

  // Log when a new server seed is generated
  public async logSeedGeneration(data: {
    roomId: string;
    roundId?: string;
    serverSeed: string;
    entropySource: string;
    context: string;
  }) {
    const timestamp = new Date().toISOString();
    const logMessage = `[SEED_GEN] ${timestamp} | Room: ${data.roomId} | Round: ${data.roundId || 'pending'} | Seed: ${data.serverSeed} | Entropy: ${data.entropySource} | Context: ${data.context}`;
    
    console.log(logMessage);
    
    try {
      // Store in database for audit trail
      await pool.query(`
        INSERT INTO audit_logs (event_type, room_id, round_id, server_seed, details, created_at)
        VALUES ('SEED_GENERATION', $1, $2, $3, $4, NOW())
        ON CONFLICT DO NOTHING`,
        [data.roomId, data.roundId, data.serverSeed, JSON.stringify({
          entropySource: data.entropySource,
          context: data.context,
          timestamp
        })]
      );
    } catch (error) {
      console.error('[AUDIT_LOG] Failed to store seed generation log:', error);
    }
  }

  // Log when a server seed is used for winner selection
  public async logSeedUsage(data: {
    roomId: string;
    roundId: string;
    serverSeed: string;
    clientSeed?: string;
    roundNonce?: string;
    participants: string[];
    winnerIndex: number;
    winnerId: string;
    vrfHash: string;
    vrfProof?: string;
    context: string;
  }) {
    const timestamp = new Date().toISOString();
    const logMessage = `[SEED_USE] ${timestamp} | Room: ${data.roomId} | Round: ${data.roundId} | Server: ${data.serverSeed} | Client: ${data.clientSeed || 'none'} | Nonce: ${data.roundNonce || 'none'} | Participants: ${data.participants.length} | Winner: ${data.winnerId} (index: ${data.winnerIndex}) | VRF Hash: ${data.vrfHash} | Context: ${data.context}`;
    
    console.log(logMessage);
    
    try {
      await pool.query(`
        INSERT INTO audit_logs (event_type, room_id, round_id, server_seed, winner_id, details, created_at)
        VALUES ('SEED_USAGE', $1, $2, $3, $4, $5, NOW())
        ON CONFLICT DO NOTHING`,
        [data.roomId, data.roundId, data.serverSeed, data.winnerId, JSON.stringify({
          participants: data.participants,
          winnerIndex: data.winnerIndex,
          vrfHash: data.vrfHash,
          clientSeed: data.clientSeed,
          roundNonce: data.roundNonce,
          vrfProof: data.vrfProof,
          context: data.context,
          timestamp
        })]
      );
    } catch (error) {
      console.error('[AUDIT_LOG] Failed to store seed usage log:', error);
    }
  }

  // Log when a round is archived
  public async logRoundArchival(data: {
    roomId: string;
    roundId: string;
    serverSeed: string;
    completedAt: Date;
    archivedAt: Date;
    context: string;
  }) {
    const timestamp = new Date().toISOString();
    const logMessage = `[SEED_ARCHIVE] ${timestamp} | Room: ${data.roomId} | Round: ${data.roundId} | Seed: ${data.serverSeed} | Completed: ${data.completedAt.toISOString()} | Archived: ${data.archivedAt.toISOString()} | Context: ${data.context}`;
    
    console.log(logMessage);
    
    try {
      await pool.query(`
        INSERT INTO audit_logs (event_type, room_id, round_id, server_seed, details, created_at)
        VALUES ('ROUND_ARCHIVAL', $1, $2, $3, $4, NOW())
        ON CONFLICT DO NOTHING`,
        [data.roomId, data.roundId, data.serverSeed, JSON.stringify({
          completedAt: data.completedAt.toISOString(),
          archivedAt: data.archivedAt.toISOString(),
          context: data.context,
          timestamp
        })]
      );
    } catch (error) {
      console.error('[AUDIT_LOG] Failed to store archival log:', error);
    }
  }

  // Log potential security events
  public async logSecurityEvent(data: {
    eventType: 'SEED_REUSE_ATTEMPT' | 'INVALID_SEED_FORMAT' | 'CONCURRENT_ROUND_CREATION' | 'SUSPICIOUS_PATTERN';
    roomId: string;
    serverSeed?: string;
    details: any;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }) {
    const timestamp = new Date().toISOString();
    const logMessage = `[SECURITY] ${timestamp} | ${data.severity} | ${data.eventType} | Room: ${data.roomId} | Seed: ${data.serverSeed || 'N/A'} | Details: ${JSON.stringify(data.details)}`;
    
    console.error(logMessage);
    
    try {
      await pool.query(`
        INSERT INTO audit_logs (event_type, room_id, server_seed, details, severity, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT DO NOTHING`,
        [data.eventType, data.roomId, data.serverSeed, JSON.stringify({
          ...data.details,
          severity: data.severity,
          timestamp
        }), data.severity]
      );
    } catch (error) {
      console.error('[AUDIT_LOG] Failed to store security event:', error);
    }
  }

  // Get audit logs for a specific room or round
  public async getAuditLogs(filters: {
    roomId?: string;
    roundId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (filters.roomId) {
        query += ` AND room_id = $${paramCount++}`;
        params.push(filters.roomId);
      }

      if (filters.roundId) {
        query += ` AND round_id = $${paramCount++}`;
        params.push(filters.roundId);
      }

      if (filters.eventType) {
        query += ` AND event_type = $${paramCount++}`;
        params.push(filters.eventType);
      }

      if (filters.startDate) {
        query += ` AND created_at >= $${paramCount++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramCount++}`;
        params.push(filters.endDate);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramCount++}`;
        params.push(filters.limit);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[AUDIT_LOG] Failed to retrieve audit logs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const seedAuditLogger = SeedAuditLogger.getInstance();