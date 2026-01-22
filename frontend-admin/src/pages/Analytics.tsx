import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Gamepad2,
  DollarSign,
  Target,
  Download,
  RefreshCw,
  Calendar,
  AlertCircle,
  BarChart3,
  User,
  ArrowUpDown,
  X,
  Search,
  Filter
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import './Analytics.css';
import './FinancialAnalytics.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface KPIData {
  totalRevenue: number;
  revenueChange: number;
  activeUsers: number;
  usersChange: number;
  gamesPlayed: number;
  gamesChange: number;
  conversionRate: number;
  conversionChange: number;
}

interface RevenueData {
  date: string;
  fastDrop: number;
  timeDrop: number;
  total: number;
}

interface UserGrowthData {
  date: string;
  new: number;
  returning: number;
}

interface TopRoom {
  id: string;
  name: string;
  plays: number;
  revenue: number;
  fillRate: number;
  type: string;
}

interface UserFinancialData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  netDeposits: number;
  totalBet: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  totalGames: number;
  winRate: number | null;
  lastActivityDate: string | null;
  registrationDate: string;
  isActive: boolean;
}

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  // Financial analytics state
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [financialUsers, setFinancialUsers] = useState<UserFinancialData[]>([]);
  const [financialPage, setFinancialPage] = useState(1);
  const [financialTotalPages, setFinancialTotalPages] = useState(1);
  const [financialTotal, setFinancialTotal] = useState(0);
  const [financialFilters, setFinancialFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'totalDeposited',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [topRooms, setTopRooms] = useState<TopRoom[]>([]);
  const [gameTypeData, setGameTypeData] = useState<{ name: string; value: number; color: string }[]>([]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        Authorization: `Bearer ${token}`
      };

      // Fetch KPIs
      const kpiResponse = await axios.get(
        `${API_URL}/admin/analytics/kpis?days=${dateRange}`,
        { headers }
      );
      setKpiData(kpiResponse.data);

      // Fetch Revenue Trends
      const revenueResponse = await axios.get(
        `${API_URL}/admin/analytics/revenue?days=${dateRange}`,
        { headers }
      );
      setRevenueData(revenueResponse.data.trends || []);

      // Set game type distribution from revenue data
      if (revenueResponse.data.byGameType) {
        const gameTypes = [
          {
            name: 'Fast Drop',
            value: revenueResponse.data.byGameType.FAST_DROP || 0,
            color: '#EC4899'
          },
          {
            name: 'Time Drop',
            value: revenueResponse.data.byGameType.TIME_DROP || 0,
            color: '#A78BFA'
          }
        ];
        setGameTypeData(gameTypes);
      }

      // Fetch User Growth
      const userResponse = await axios.get(
        `${API_URL}/admin/analytics/users?days=${dateRange}`,
        { headers }
      );
      setUserGrowthData(userResponse.data.growth || []);

      // Fetch Top Rooms
      const roomsResponse = await axios.get(
        `${API_URL}/admin/analytics/top-rooms?limit=5`,
        { headers }
      );
      setTopRooms(roomsResponse.data.rooms || []);

    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Fetch financial analytics when Users tab is active
  useEffect(() => {
    if (activeTab === 'users') {
      fetchFinancialAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, financialPage, financialFilters]);

  const fetchFinancialAnalytics = async () => {
    setFinancialLoading(true);
    setFinancialError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const params = new URLSearchParams({
        page: financialPage.toString(),
        limit: '50',
        ...(financialFilters.search && { search: financialFilters.search }),
        ...(financialFilters.dateFrom && { dateFrom: financialFilters.dateFrom }),
        ...(financialFilters.dateTo && { dateTo: financialFilters.dateTo }),
        sortBy: financialFilters.sortBy,
        sortOrder: financialFilters.sortOrder
      });

      const response = await axios.get(
        `${API_URL}/admin/analytics/users-financial?${params.toString()}`,
        { headers }
      );

      setFinancialUsers(response.data.users);
      setFinancialTotalPages(response.data.pagination.totalPages);
      setFinancialTotal(response.data.pagination.total);
    } catch (err: any) {
      console.error('Error fetching financial analytics:', err);
      setFinancialError(err.response?.data?.message || 'Failed to load financial data');
    } finally {
      setFinancialLoading(false);
    }
  };

  const handleFinancialSort = (column: string) => {
    setFinancialFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleFinancialExport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        ...(financialFilters.search && { search: financialFilters.search }),
        ...(financialFilters.dateFrom && { dateFrom: financialFilters.dateFrom }),
        ...(financialFilters.dateTo && { dateTo: financialFilters.dateTo })
      });

      const response = await axios.get(
        `${API_URL}/admin/analytics/users-financial/export?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-financial-analytics-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting financial data:', err);
      alert('Failed to export data');
    }
  };

  const clearFinancialFilters = () => {
    setFinancialFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'totalDeposited',
      sortOrder: 'desc'
    });
    setFinancialPage(1);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_URL}/admin/analytics/export?days=${dateRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${dateRange}days-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data');
    }
  };

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="error-container">
          <AlertCircle size={48} color="#EF4444" />
          <h2>Failed to Load Analytics</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={handleRefresh}>
            <RefreshCw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>📊 Analytics</h1>
          <p>Comprehensive platform performance insights</p>
        </div>
        <div className="header-actions">
          {activeTab === 'general' && (
            <>
              <button className="btn-secondary" onClick={handleRefresh}>
                <RefreshCw size={18} />
                Refresh
              </button>
              <button className="btn-secondary" onClick={handleExport}>
                <Download size={18} />
                Export
              </button>
              <div className="date-range-selector">
                <Calendar size={18} />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90')}
                  className="date-select"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="analytics-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'general'}
          aria-controls="general-tab-panel"
          id="general-tab"
          className={`analytics-tab ${activeTab === 'general' ? 'analytics-tab-active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <BarChart3 className="analytics-tab-icon" />
          <span>General</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'users'}
          aria-controls="users-tab-panel"
          id="users-tab"
          className={`analytics-tab ${activeTab === 'users' ? 'analytics-tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="analytics-tab-icon" />
          <span>Users</span>
        </button>
      </div>

      {/* General Tab Content */}
      {activeTab === 'general' && (
        <div
          role="tabpanel"
          id="general-tab-panel"
          aria-labelledby="general-tab"
          className="analytics-tab-content"
        >
          {/* KPI Cards */}
          {kpiData && (
            <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(157, 78, 221, 0.1)' }}>
              <DollarSign size={24} color="#9D4EDD" />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Total Revenue</div>
              <div className="kpi-value">{formatCurrency(kpiData.totalRevenue)}</div>
              <div className={`kpi-change ${kpiData.revenueChange >= 0 ? 'positive' : 'negative'}`}>
                {kpiData.revenueChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(kpiData.revenueChange)}% vs last period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <Users size={24} color="#10B981" />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Active Users</div>
              <div className="kpi-value">{formatNumber(kpiData.activeUsers)}</div>
              <div className={`kpi-change ${kpiData.usersChange >= 0 ? 'positive' : 'negative'}`}>
                {kpiData.usersChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(kpiData.usersChange)}% vs last period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>
              <Gamepad2 size={24} color="#FBBF24" />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Games Played</div>
              <div className="kpi-value">{formatNumber(kpiData.gamesPlayed)}</div>
              <div className={`kpi-change ${kpiData.gamesChange >= 0 ? 'positive' : 'negative'}`}>
                {kpiData.gamesChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(kpiData.gamesChange)}% vs last period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'rgba(96, 165, 250, 0.1)' }}>
              <Target size={24} color="#60A5FA" />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Conversion Rate</div>
              <div className="kpi-value">{kpiData.conversionRate.toFixed(1)}%</div>
              <div className={`kpi-change ${kpiData.conversionChange >= 0 ? 'positive' : 'negative'}`}>
                {kpiData.conversionChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(kpiData.conversionChange).toFixed(1)}% vs last period</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Revenue Chart */}
        {revenueData.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3>Revenue Trends</h3>
              <span className="chart-subtitle">Revenue breakdown by game type</span>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{
                      background: '#2D2D44',
                      border: '1px solid rgba(157, 78, 221, 0.2)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="fastDrop"
                    stroke="#EC4899"
                    strokeWidth={2}
                    name="Fast Drop"
                    dot={{ fill: '#EC4899' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="timeDrop"
                    stroke="#A78BFA"
                    strokeWidth={2}
                    name="Time Drop"
                    dot={{ fill: '#A78BFA' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Game Type Distribution */}
        {gameTypeData.length > 0 && gameTypeData.some(item => item.value > 0) && (
          <div className="chart-card">
            <div className="chart-header">
              <h3>Revenue by Game Type</h3>
              <span className="chart-subtitle">Distribution across game modes</span>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gameTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gameTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-stats">
                {gameTypeData.map((item) => (
                  <div key={item.name} className="pie-stat-item">
                    <div className="pie-stat-dot" style={{ background: item.color }}></div>
                    <span className="pie-stat-name">{item.name}</span>
                    <span className="pie-stat-value">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Growth Chart */}
      {userGrowthData.length > 0 && (
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>User Growth Trends</h3>
            <span className="chart-subtitle">New vs returning users over time</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    background: '#2D2D44',
                    border: '1px solid rgba(157, 78, 221, 0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="new" fill="#9D4EDD" name="New Users" />
                <Bar dataKey="returning" fill="#10B981" name="Returning Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Performing Rooms */}
      {topRooms.length > 0 && (
        <div className="analytics-table-card">
          <div className="table-header">
            <h3>Top Performing Rooms</h3>
            <span className="table-subtitle">Ranked by total revenue</span>
          </div>
          <div className="table-container">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Room Name</th>
                  <th>Type</th>
                  <th>Plays</th>
                  <th>Revenue</th>
                  <th>Fill Rate</th>
                </tr>
              </thead>
              <tbody>
                {topRooms.map((room, index) => (
                  <tr key={room.id}>
                    <td className="rank-cell">#{index + 1}</td>
                    <td className="room-name">{room.name}</td>
                    <td>
                      <span className={`room-type-badge ${room.type.toLowerCase()}`}>
                        {room.type === 'FAST_DROP' ? 'Fast Drop' : 'Time Drop'}
                      </span>
                    </td>
                    <td>{formatNumber(room.plays)}</td>
                    <td className="revenue-cell">{formatCurrency(room.revenue)}</td>
                    <td>
                      <div className="fill-rate">
                        <div className="fill-rate-bar">
                          <div
                            className="fill-rate-progress"
                            style={{ width: `${room.fillRate}%` }}
                          ></div>
                        </div>
                        <span>{room.fillRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

          {/* Empty State */}
          {!kpiData && !loading && (
            <div className="empty-state">
              <AlertCircle size={48} color="#64748B" />
              <h3>No Analytics Data Available</h3>
              <p>There is no data available for the selected time period.</p>
            </div>
          )}
        </div>
      )}

      {/* Users Financial Tab Content */}
      {activeTab === 'users' && (
        <div
          role="tabpanel"
          id="users-tab-panel"
          aria-labelledby="users-tab"
          className="analytics-tab-content"
        >
          {/* Filters */}
          <div className="financial-filters">
            <div className="financial-filters-header">
              <h3 className="financial-filters-title">
                <Filter className="analytics-tab-icon" />
                Filter Users
              </h3>
              <button className="filter-clear-btn" onClick={clearFinancialFilters}>
                <X style={{ width: 14, height: 14 }} />
                Clear All
              </button>
            </div>

            <div className="financial-filters-grid">
              {/* Username Search */}
              <div className="filter-group">
                <label className="filter-label" htmlFor="username-search">
                  Username / Email
                </label>
                <input
                  id="username-search"
                  type="text"
                  className="filter-input"
                  placeholder="Search username or email..."
                  value={financialFilters.search}
                  onChange={(e) => setFinancialFilters({...financialFilters, search: e.target.value})}
                />
              </div>

              {/* Date Range */}
              <div className="filter-group">
                <label className="filter-label">Date Range</label>
                <div className="filter-date-range">
                  <input
                    type="date"
                    className="filter-input"
                    value={financialFilters.dateFrom}
                    onChange={(e) => setFinancialFilters({...financialFilters, dateFrom: e.target.value})}
                  />
                  <span className="filter-date-separator">to</span>
                  <input
                    type="date"
                    className="filter-input"
                    value={financialFilters.dateTo}
                    onChange={(e) => setFinancialFilters({...financialFilters, dateTo: e.target.value})}
                  />
                </div>
              </div>

              {/* Sort By */}
              <div className="filter-group">
                <label className="filter-label" htmlFor="sort-by">
                  Sort By
                </label>
                <select
                  id="sort-by"
                  className="filter-select"
                  value={financialFilters.sortBy}
                  onChange={(e) => setFinancialFilters({...financialFilters, sortBy: e.target.value})}
                >
                  <option value="totalDeposited">Total Deposited</option>
                  <option value="totalWithdrawn">Total Withdrawn</option>
                  <option value="totalBet">Total Bet</option>
                  <option value="totalWon">Total Won</option>
                  <option value="netProfit">Net Profit/Loss</option>
                  <option value="currentBalance">Current Balance</option>
                </select>
              </div>
            </div>

            <div className="financial-filters-actions">
              <button className="btn btn-secondary btn-sm" onClick={clearFinancialFilters}>
                Reset
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => fetchFinancialAnalytics()}>
                <Search style={{ width: 16, height: 16 }} />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Financial Table */}
          {financialLoading ? (
            <div className="financial-table-loading">
              <div className="financial-loading-spinner" />
              <p className="financial-loading-text">Loading financial data...</p>
            </div>
          ) : financialError ? (
            <div className="error-container">
              <AlertCircle size={48} color="#EF4444" />
              <h2>Failed to Load Financial Data</h2>
              <p>{financialError}</p>
              <button className="btn-primary" onClick={fetchFinancialAnalytics}>
                <RefreshCw size={18} />
                Retry
              </button>
            </div>
          ) : financialUsers.length === 0 ? (
            <div className="financial-empty-state">
              <User className="financial-empty-icon" />
              <h4 className="financial-empty-title">No Financial Data Found</h4>
              <p className="financial-empty-description">
                No users match your current filter criteria. Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="financial-table-card">
              {/* Header */}
              <div className="financial-table-header">
                <div className="financial-table-title">
                  <h3>User Financial Analytics</h3>
                  <span className="financial-table-subtitle">
                    Showing {financialUsers.length} of {financialTotal} users
                  </span>
                </div>
                <div className="financial-table-actions">
                  <button className="export-btn" onClick={handleFinancialExport}>
                    <Download style={{ width: 16, height: 16 }} />
                    Export CSV
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={fetchFinancialAnalytics}>
                    <RefreshCw style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="financial-table-container">
                <table className="financial-table" role="table">
                  <thead>
                    <tr>
                      <th className="financial-table-th-sortable" onClick={() => handleFinancialSort('user')}>
                        <div className="financial-table-th-content">
                          <span>User</span>
                          <ArrowUpDown className="sort-arrow" />
                        </div>
                      </th>
                      <th className="financial-table-th-sortable" onClick={() => handleFinancialSort('totalDeposited')}>
                        <div className="financial-table-th-content">
                          <span>Total Deposited</span>
                          <ArrowUpDown className="sort-arrow" />
                        </div>
                      </th>
                      <th className="financial-table-th-sortable" onClick={() => handleFinancialSort('totalWithdrawn')}>
                        <div className="financial-table-th-content">
                          <span>Total Withdrawn</span>
                          <ArrowUpDown className="sort-arrow" />
                        </div>
                      </th>
                      <th className="financial-table-th-sortable" onClick={() => handleFinancialSort('totalBet')}>
                        <div className="financial-table-th-content">
                          <span>Total Bet</span>
                          <ArrowUpDown className="sort-arrow" />
                        </div>
                      </th>
                      <th className="financial-table-th-sortable" onClick={() => handleFinancialSort('totalWon')}>
                        <div className="financial-table-th-content">
                          <span>Total Won</span>
                          <ArrowUpDown className="sort-arrow" />
                        </div>
                      </th>
                      <th>
                        <span>Total Lost</span>
                      </th>
                      <th className="financial-table-th-sortable" onClick={() => handleFinancialSort('netProfit')}>
                        <div className="financial-table-th-content">
                          <span>Net Profit/Loss</span>
                          <ArrowUpDown className="sort-arrow" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="financial-user-cell">
                            <div className="financial-user-avatar">
                              <User className="financial-user-avatar-icon" />
                            </div>
                            <div className="financial-user-info">
                              <span className="financial-user-name">
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="financial-user-email">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="financial-value financial-value-neutral">
                            {formatCurrency(user.totalDeposited)}
                          </span>
                        </td>
                        <td>
                          <span className="financial-value financial-value-neutral">
                            {formatCurrency(user.totalWithdrawn)}
                          </span>
                        </td>
                        <td>
                          <span className="financial-value financial-value-neutral">
                            {formatCurrency(user.totalBet)}
                          </span>
                        </td>
                        <td>
                          <span className="financial-value financial-value-positive">
                            {formatCurrency(user.totalWon)}
                          </span>
                        </td>
                        <td>
                          <span className="financial-value financial-value-negative">
                            {formatCurrency(user.totalLost)}
                          </span>
                        </td>
                        <td>
                          <div className="financial-net-cell">
                            <div
                              className={`financial-net-indicator ${
                                user.netProfit > 0
                                  ? 'financial-net-indicator-positive'
                                  : user.netProfit < 0
                                  ? 'financial-net-indicator-negative'
                                  : 'financial-net-indicator-neutral'
                              }`}
                            />
                            <span
                              className={`financial-value ${
                                user.netProfit > 0
                                  ? 'financial-value-positive'
                                  : user.netProfit < 0
                                  ? 'financial-value-negative'
                                  : 'financial-value-neutral'
                              }`}
                            >
                              {user.netProfit >= 0 ? '+' : ''}{formatCurrency(user.netProfit)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer - Pagination */}
              <div className="financial-table-footer">
                <div className="financial-pagination-info">
                  Showing {(financialPage - 1) * 50 + 1} to{' '}
                  {Math.min(financialPage * 50, financialTotal)} of {financialTotal} users
                </div>
                <div className="financial-pagination">
                  <div className="financial-pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={() => setFinancialPage(1)}
                      disabled={financialPage === 1}
                    >
                      First
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => setFinancialPage(financialPage - 1)}
                      disabled={financialPage === 1}
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(5, financialTotalPages))].map((_, i) => {
                      const page = financialPage > 3 ? financialPage - 2 + i : i + 1;
                      if (page > financialTotalPages) return null;
                      return (
                        <button
                          key={page}
                          className={`pagination-btn ${page === financialPage ? 'pagination-btn-active' : ''}`}
                          onClick={() => setFinancialPage(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      className="pagination-btn"
                      onClick={() => setFinancialPage(financialPage + 1)}
                      disabled={financialPage === financialTotalPages}
                    >
                      Next
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => setFinancialPage(financialTotalPages)}
                      disabled={financialPage === financialTotalPages}
                    >
                      Last
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
