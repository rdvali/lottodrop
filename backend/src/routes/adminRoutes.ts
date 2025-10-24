import { Router } from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserStats,
  depositToUser,
  withdrawFromUser
} from '../controllers/adminController';
import {
  getAllRounds,
  getRoundDetails,
  getRoundsStatistics,
  cancelRound
} from '../controllers/roundController';
import {
  getDashboardStats,
  getWeeklyRevenue
} from '../controllers/dashboardController';
import {
  getAllTransactions,
  getTransactionDetails
} from '../controllers/transactionController';
import {
  getKPIs,
  getRevenueAnalytics,
  getUserAnalytics,
  getTopRooms,
  exportAnalytics
} from '../controllers/analyticsController';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(isAdmin);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/weekly-revenue', getWeeklyRevenue);

// User management routes
router.get('/users', getUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:userId', getUser);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.patch('/users/:userId/toggle-status', toggleUserStatus);
router.delete('/users/:userId', deleteUser);

// User balance management routes
router.post('/users/:userId/deposit', depositToUser);
router.post('/users/:userId/withdraw', withdrawFromUser);

// Round management routes
router.get('/rounds', getAllRounds);
router.get('/rounds/statistics', getRoundsStatistics);
router.get('/rounds/:roundId', getRoundDetails);
router.post('/rounds/:roundId/cancel', cancelRound);

// Transaction management routes
router.get('/transactions', getAllTransactions);
router.get('/transactions/:transactionId', getTransactionDetails);

// Analytics routes
router.get('/analytics/kpis', getKPIs);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/top-rooms', getTopRooms);
router.get('/analytics/export', exportAnalytics);

export default router;