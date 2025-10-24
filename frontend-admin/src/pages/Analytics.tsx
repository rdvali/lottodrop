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
  AlertCircle
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

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

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
  }, [dateRange]);

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
        </div>
      </div>

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
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
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
  );
};

export default Analytics;
