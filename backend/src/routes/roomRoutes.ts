import { Router } from 'express';
import {
  createRoom,
  getRooms,
  getRoomById,
  getRoomByShareCode,
  joinRoom,
  unjoinRoom,
  updateRoom,
  deleteRoom,
  getAllRooms,
  getRecentWinners,
  getRoomStats,
  verifyRoundVRF
} from '../controllers/roomController';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

// Public routes
router.get('/rooms', getRooms);
router.get('/rooms/share/:shareCode', getRoomByShareCode);
router.get('/rooms/recent-winners', getRecentWinners);
router.get('/rooms/stats', getRoomStats);
router.get('/rooms/:roomId', getRoomById);

// VRF verification route (public for transparency)
router.get('/rounds/:roundId/verify', verifyRoundVRF);

// User routes - SECURITY FIX (HIGH-007): Idempotency protection for financial operations
router.post('/rooms/:roomId/join', authenticateToken, idempotencyMiddleware, joinRoom);
router.post('/rooms/:roomId/unjoin', authenticateToken, idempotencyMiddleware, unjoinRoom);

// Admin routes
router.get('/admin/rooms', authenticateToken, isAdmin, getAllRooms);
router.post('/admin/rooms', authenticateToken, isAdmin, createRoom);
router.put('/admin/rooms/:roomId', authenticateToken, isAdmin, updateRoom);
router.delete('/admin/rooms/:roomId', authenticateToken, isAdmin, deleteRoom);

export default router;