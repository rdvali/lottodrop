import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Gamepad2, 
  DollarSign, 
  TrendingUp,
  UserPlus,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingDown
} from 'lucide-react';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Stats {
  totalUsers: number;
  activeGames: number;
  totalRevenue: number;
  todayRevenue: number;
  userGrowth: number;
  gameGrowth: number;
  revenueGrowth: number;
}

interface ChartData {
  name: string;
  revenue: number;
  games: number;
}

interface GameDistribution {
  type: string;
  count: number;
  percentage: number;
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
  amount?: number;
}

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeGames: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    userGrowth: 0,
    gameGrowth: 0,
    revenueGrowth: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [gameDistribution, setGameDistribution] = useState<GameDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('No authentication token found');
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      setStats(data.stats);
      setChartData(data.chartData || []);
      setGameDistribution(data.gameDistribution || []);
      setRecentActivity(data.recentActivity || []);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data');
      // Use demo data as fallback
      setStats({
        totalUsers: 1248,
        activeGames: 12,
        totalRevenue: 45678.90,
        todayRevenue: 2345.60,
        userGrowth: 12.5,
        gameGrowth: 8.3,
        revenueGrowth: 15.2
      });
      setChartData([
        { name: 'Mon', revenue: 3400, games: 120 },
        { name: 'Tue', revenue: 4200, games: 132 },
        { name: 'Wed', revenue: 3800, games: 145 },
        { name: 'Thu', revenue: 5100, games: 165 },
        { name: 'Fri', revenue: 6200, games: 180 },
        { name: 'Sat', revenue: 7500, games: 195 },
        { name: 'Sun', revenue: 8900, games: 210 },
      ]);
      setGameDistribution([
        { type: 'FAST_DROP', count: 650, percentage: 65 },
        { type: 'TIME_DROP', count: 350, percentage: 35 }
      ]);
      setRecentActivity([
        { type: 'user_joined', message: 'New user registered: john.doe@email.com', time: '2 min ago' },
        { type: 'game_completed', message: 'Game #1234 completed. Winner: Alice', time: '5 min ago' },
        { type: 'deposit', message: 'User Bob deposited', time: '10 min ago', amount: 100 },
        { type: 'withdrawal', message: 'User Charlie withdrew', time: '15 min ago', amount: 50 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: amount < 100 ? 2 : 0,
      maximumFractionDigits: amount < 100 ? 2 : 0,
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined':
        return <UserPlus className="activity-icon-svg" />;
      case 'game_completed':
        return <Trophy className="activity-icon-svg" />;
      case 'deposit':
        return <ArrowDownRight className="activity-icon-svg" />;
      case 'withdrawal':
        return <ArrowUpRight className="activity-icon-svg" />;
      default:
        return <Activity className="activity-icon-svg" />;
    }
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="stat-trend-icon" />;
    } else if (growth < 0) {
      return <TrendingDown className="stat-trend-icon" />;
    }
    return null;
  };

  const getGrowthClass = (growth: number) => {
    if (growth > 0) return 'stat-change-positive';
    if (growth < 0) return 'stat-change-negative';
    return 'stat-change-neutral';
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-content">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading dashboard data...</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="skeleton-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-circle skeleton"></div>
                <div className="skeleton-content">
                  <div className="skeleton" style={{ width: '60%', height: '12px' }}></div>
                  <div className="skeleton" style={{ width: '80%', height: '24px' }}></div>
                  <div className="skeleton" style={{ width: '40%', height: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {error ? 'Using demo data - ' + error : 'Real-time platform statistics'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="card-body">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-users">
                <Users className="stat-icon-svg" />
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
              <div className={`stat-change ${getGrowthClass(stats.userGrowth)}`}>
                {getGrowthIcon(stats.userGrowth)}
                <span>
                  {stats.userGrowth > 0 ? '+' : ''}{stats.userGrowth}% from last month
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-body">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-games">
                <Gamepad2 className="stat-icon-svg" />
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-label">Active Games</div>
              <div className="stat-value">{stats.activeGames}</div>
              <div className={`stat-change ${getGrowthClass(stats.gameGrowth)}`}>
                {getGrowthIcon(stats.gameGrowth)}
                <span>
                  {stats.gameGrowth > 0 ? '+' : ''}{stats.gameGrowth}% from yesterday
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-body">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-revenue">
                <DollarSign className="stat-icon-svg" />
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
              <div className="stat-change stat-change-neutral">
                <span>All time earnings</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-body">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-today">
                <TrendingUp className="stat-icon-svg" />
              </div>
            </div>
            <div className="stat-content">
              <div className="stat-label">Today's Revenue</div>
              <div className="stat-value">{formatCurrency(stats.todayRevenue)}</div>
              <div className={`stat-change ${getGrowthClass(stats.revenueGrowth)}`}>
                {getGrowthIcon(stats.revenueGrowth)}
                <span>
                  {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}% from yesterday
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="chart-title">Weekly Revenue</h3>
            <div className="chart-actions">
              <button className="btn btn-sm btn-ghost" onClick={fetchDashboardData}>
                Refresh
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <div className="simple-chart">
                {chartData.map((day, index) => {
                  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
                  const percentage = (day.revenue / maxRevenue) * 100;
                  return (
                    <div key={index} className="chart-bar-container">
                      <div 
                        className="chart-bar"
                        style={{ height: `${Math.max(percentage, 5)}%` }}
                      >
                        <div className="bar-tooltip">
                          {formatCurrency(day.revenue)}
                          <br />
                          <small>{day.games} games</small>
                        </div>
                      </div>
                      <span className="bar-label">{day.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h3 className="chart-title">Game Distribution</h3>
            <div className="chart-actions">
              <button className="btn btn-sm btn-ghost">View All</button>
            </div>
          </div>
          <div className="card-body">
            <div className="distribution-chart">
              <div className="distribution-items">
                {gameDistribution.map((item, index) => (
                  <div key={index} className="distribution-item">
                    <div className="distribution-info">
                      <span className="distribution-label">
                        {item.type.replace('_', ' ')}
                      </span>
                      <span className="distribution-value">
                        {item.percentage}% ({item.count} games)
                      </span>
                    </div>
                    <div className="distribution-bar">
                      <div 
                        className={`distribution-fill ${
                          index === 0 ? 'distribution-fill-primary' : 'distribution-fill-secondary'
                        }`}
                        style={{ '--width': `${item.percentage}%` } as React.CSSProperties}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
        </div>
        <div className="card-body">
          {recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className={`activity-icon activity-icon-${activity.type}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <div className="activity-main">
                      <p className="activity-message">
                        {activity.message}
                        {activity.amount && (
                          <span className="activity-amount"> • {formatCurrency(activity.amount)}</span>
                        )}
                      </p>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Activity className="empty-state-icon" />
              <p className="empty-state-text">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;