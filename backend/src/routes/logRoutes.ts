import { Router } from 'express';
import { getAuthLogs, getAuditLogs, getSecurityLogs, getLogStats } from '../controllers/logController';

const router = Router();

// All log routes require admin authentication (applied in adminRoutes.ts)

// Authentication logs (all users)
router.get('/auth', getAuthLogs);

// Audit logs (system-wide seed events, security events)
router.get('/audit', getAuditLogs);

// Security events only (HIGH/CRITICAL severity)
router.get('/security', getSecurityLogs);

// Log statistics for dashboard
router.get('/stats', getLogStats);

export default router;
