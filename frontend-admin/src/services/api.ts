import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin API endpoints
export const adminAPI = {
  // Dashboard
  getStats: () => api.get('/admin/stats'),
  getRecentActivity: () => api.get('/admin/activity'),
  
  // Users
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  toggleUserStatus: (id: string) => api.post(`/admin/users/${id}/toggle-status`),
  
  // Rooms & Games
  getRooms: (params?: any) => api.get('/admin/rooms', { params }),
  getRoom: (id: string) => api.get(`/admin/rooms/${id}`),
  createRoom: (data: any) => api.post('/admin/rooms', data),
  updateRoom: (id: string, data: any) => api.put(`/admin/rooms/${id}`, data),
  deleteRoom: (id: string) => api.delete(`/admin/rooms/${id}`),
  getGameHistory: (params?: any) => api.get('/admin/games', { params }),
  
  // Transactions
  getTransactions: (params?: any) => api.get('/admin/transactions', { params }),
  getTransaction: (id: string) => api.get(`/admin/transactions/${id}`),
  
  // Analytics
  getAnalytics: (params?: any) => api.get('/admin/analytics', { params }),
  getRevenue: (params?: any) => api.get('/admin/analytics/revenue', { params }),
  getUserGrowth: (params?: any) => api.get('/admin/analytics/users', { params }),
  
  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),

  // Logs
  getAuthLogs: (params?: any) => api.get('/admin/logs/auth', { params }),
  getAuditLogs: (params?: any) => api.get('/admin/logs/audit', { params }),
  getSecurityLogs: (params?: any) => api.get('/admin/logs/security', { params }),
  getLogStats: () => api.get('/admin/logs/stats'),
};

export default api;