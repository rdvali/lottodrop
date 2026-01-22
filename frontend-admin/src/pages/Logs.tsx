import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import FilterSection from '../components/FilterSection';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Logs.css';

interface LogEntry {
  id: string;
  timestamp: string;
  description: string;
  [key: string]: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Statistics {
  [key: string]: any;
}

interface LogStats {
  authStats: any;
  auditStats: any;
  activityTrend: Array<{ date: string; auth_log_count: number }>;
  recentAlerts: any[];
}

type TabType = 'auth' | 'audit' | 'security';

const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('auth');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Fetch log statistics for dashboard
  const fetchLogStats = useCallback(async () => {
    try {
      const response = await adminAPI.getLogStats();
      setLogStats(response.data);
    } catch (error) {
      console.error('Failed to fetch log statistics:', error);
    }
  }, []);

  // Fetch auth logs
  const fetchAuthLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAuthLogs({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
      });

      if (response.data.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch auth logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, sortBy, sortOrder]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAuditLogs({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
      });

      if (response.data.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, sortBy, sortOrder]);

  // Fetch security logs
  const fetchSecurityLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSecurityLogs({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
      });

      if (response.data.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
        setStatistics(null); // Security logs don't have statistics
      }
    } catch (error) {
      console.error('Failed to fetch security logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, sortBy, sortOrder]);

  // Fetch logs based on active tab
  useEffect(() => {
    if (activeTab === 'auth') {
      fetchAuthLogs();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'security') {
      fetchSecurityLogs();
    }
  }, [activeTab, fetchAuthLogs, fetchAuditLogs, fetchSecurityLogs]);

  // Fetch statistics on mount
  useEffect(() => {
    fetchLogStats();
  }, [fetchLogStats]);

  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setFilters({});
    setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
  };

  // Filter fields for Auth Logs
  const authFilterFields = [
    {
      type: 'text' as const,
      key: 'search',
      label: 'Search',
      placeholder: 'Search by user email or name...'
    },
    {
      type: 'select' as const,
      key: 'action',
      label: 'Action',
      placeholder: 'All Actions',
      options: [
        { value: 'all', label: 'All Actions' },
        { value: 'LOGIN', label: 'Login' },
        { value: 'LOGOUT', label: 'Logout' },
        { value: 'REGISTER', label: 'Register' },
        { value: 'PASSWORD_CHANGE', label: 'Password Change' },
        { value: 'TOKEN_REFRESH', label: 'Token Refresh' },
        { value: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized Access' },
        { value: 'SESSION_EXPIRED', label: 'Session Expired' }
      ]
    },
    {
      type: 'select' as const,
      key: 'status',
      label: 'Status',
      placeholder: 'All Statuses',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'SUCCESS', label: 'Success' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'TIMEOUT', label: 'Timeout' }
      ]
    },
    {
      type: 'dateRange' as const,
      key: 'dateRange',
      label: 'Date Range',
      placeholder: 'Select date range...'
    },
    {
      type: 'text' as const,
      key: 'ipAddress',
      label: 'IP Address',
      placeholder: 'Filter by IP address...'
    }
  ];

  // Filter fields for Audit Logs
  const auditFilterFields = [
    {
      type: 'text' as const,
      key: 'search',
      label: 'Search',
      placeholder: 'Search by user or room name...'
    },
    {
      type: 'select' as const,
      key: 'eventType',
      label: 'Event Type',
      placeholder: 'All Events',
      options: [
        { value: 'all', label: 'All Events' },
        { value: 'SEED_GENERATION', label: 'Seed Generation' },
        { value: 'SEED_USAGE', label: 'Seed Usage' },
        { value: 'ROUND_ARCHIVAL', label: 'Round Archival' },
        { value: 'SEED_REUSE_ATTEMPT', label: 'Seed Reuse Attempt' },
        { value: 'INVALID_SEED_FORMAT', label: 'Invalid Seed Format' },
        { value: 'CONCURRENT_ROUND_CREATION', label: 'Concurrent Round Creation' },
        { value: 'SUSPICIOUS_PATTERN', label: 'Suspicious Pattern' }
      ]
    },
    {
      type: 'select' as const,
      key: 'severity',
      label: 'Severity',
      placeholder: 'All Severities',
      options: [
        { value: 'all', label: 'All Severities' },
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'CRITICAL', label: 'Critical' }
      ]
    },
    {
      type: 'dateRange' as const,
      key: 'dateRange',
      label: 'Date Range',
      placeholder: 'Select date range...'
    }
  ];

  // Filter fields for Security Logs
  const securityFilterFields = [
    {
      type: 'select' as const,
      key: 'severity',
      label: 'Severity',
      placeholder: 'All Severities',
      options: [
        { value: 'all', label: 'All Severities' },
        { value: 'HIGH', label: 'High' },
        { value: 'CRITICAL', label: 'Critical' }
      ]
    },
    {
      type: 'select' as const,
      key: 'eventType',
      label: 'Event Type',
      placeholder: 'All Events',
      options: [
        { value: 'all', label: 'All Events' },
        { value: 'SEED_REUSE_ATTEMPT', label: 'Seed Reuse Attempt' },
        { value: 'INVALID_SEED_FORMAT', label: 'Invalid Seed Format' },
        { value: 'CONCURRENT_ROUND_CREATION', label: 'Concurrent Round Creation' },
        { value: 'SUSPICIOUS_PATTERN', label: 'Suspicious Pattern' }
      ]
    },
    {
      type: 'dateRange' as const,
      key: 'dateRange',
      label: 'Date Range',
      placeholder: 'Select date range...'
    }
  ];

  // Get current filter fields based on active tab
  const getCurrentFilterFields = () => {
    if (activeTab === 'auth') return authFilterFields;
    if (activeTab === 'audit') return auditFilterFields;
    return securityFilterFields;
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Record<string, any>) => {
    const processedFilters = { ...newFilters };

    // Handle date range
    if (processedFilters.dateRange?.start) {
      processedFilters.startDate = processedFilters.dateRange.start;
    }
    if (processedFilters.dateRange?.end) {
      processedFilters.endDate = processedFilters.dateRange.end;
    }
    delete processedFilters.dateRange;

    setFilters(processedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'status-badge-success';
      case 'FAILED': return 'status-badge-error';
      case 'TIMEOUT': return 'status-badge-warning';
      default: return 'status-badge-info';
    }
  };

  // Get severity badge class
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'severity-badge-low';
      case 'MEDIUM': return 'severity-badge-medium';
      case 'HIGH': return 'severity-badge-high';
      case 'CRITICAL': return 'severity-badge-critical';
      default: return 'severity-badge-low';
    }
  };

  // Render statistics cards
  const renderStatisticsCards = () => {
    if (activeTab === 'auth' && statistics) {
      return (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_logs || 0}</div>
              <div className="stat-label">Total Logs</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.failed_logins || 0}</div>
              <div className="stat-label">Failed Logins</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_failures || 0}</div>
              <div className="stat-label">Total Failures</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.unique_users || 0}</div>
              <div className="stat-label">Unique Users</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'audit' && statistics) {
      return (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total_logs || 0}</div>
              <div className="stat-label">Total Events</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.critical_severity || 0}</div>
              <div className="stat-label">Critical</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🟠</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.high_severity || 0}</div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏠</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.unique_rooms || 0}</div>
              <div className="stat-label">Unique Rooms</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'security' && logStats) {
      return (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-value">{logStats.auditStats.critical_count || 0}</div>
              <div className="stat-label">Critical Alerts</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{logStats.auditStats.security_events || 0}</div>
              <div className="stat-label">Security Events (24h)</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-content">
              <div className="stat-value">{logStats.recentAlerts.length}</div>
              <div className="stat-label">Recent Alerts</div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render activity chart
  const renderActivityChart = () => {
    if (!logStats || !logStats.activityTrend || logStats.activityTrend.length === 0) {
      return null;
    }

    const chartData = logStats.activityTrend.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      logs: parseInt(item.auth_log_count.toString())
    }));

    return (
      <div className="chart-container">
        <h3 className="chart-title">7-Day Activity Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(157, 78, 221, 0.1)" />
            <XAxis
              dataKey="date"
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--dark-bg-secondary)',
                border: '1px solid var(--dark-border)',
                borderRadius: '8px',
                color: 'var(--dark-text-primary)'
              }}
            />
            <Legend
              wrapperStyle={{
                color: '#E2E8F0'
              }}
            />
            <Line
              type="monotone"
              dataKey="logs"
              stroke="#9D4EDD"
              strokeWidth={2}
              dot={{ fill: '#9D4EDD', r: 4 }}
              activeDot={{ r: 6 }}
              name="Auth Logs"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="logs-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-description">Monitor and analyze all system activity in real-time</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'auth' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('auth')}
        >
          Authentication Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'audit' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('audit')}
        >
          Audit Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'security' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('security')}
        >
          Security Events
        </button>
      </div>

      {/* Statistics Dashboard */}
      {renderStatisticsCards()}

      {/* Activity Chart */}
      {activeTab === 'auth' && renderActivityChart()}

      {/* Filters */}
      <FilterSection
        fields={getCurrentFilterFields()}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={Object.keys(filters).length}
      />

      {/* Logs Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <p>No logs found matching your filters.</p>
          </div>
        ) : (
          <>
            <table className="table logs-table">
              <thead>
                <tr className="header">
                  <th className="cell">Time</th>
                  <th className="cell">Description</th>
                  {activeTab === 'auth' && <th className="cell">Status</th>}
                  {activeTab !== 'auth' && <th className="cell">Severity</th>}
                  {activeTab === 'auth' && <th className="cell">IP Address</th>}
                  <th className="cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="row">
                    <td className="cell timestamp-cell">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="cell description-cell">
                      {log.description}
                    </td>
                    {activeTab === 'auth' && (
                      <td className="cell">
                        <span className={`status-badge ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                    )}
                    {activeTab !== 'auth' && (
                      <td className="cell">
                        <span className={`severity-badge ${getSeverityBadgeClass(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                    )}
                    {activeTab === 'auth' && (
                      <td className="cell">{log.ipAddress || 'N/A'}</td>
                    )}
                    <td className="cell">
                      <button
                        className="action-button view-button"
                        onClick={() => setSelectedLog(log)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="pagination-button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log Details</h2>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedLog.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span className="detail-value">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{selectedLog.description}</span>
              </div>
              {selectedLog.metadata && (
                <div className="detail-row">
                  <span className="detail-label">Metadata:</span>
                  <pre className="detail-json">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              )}
              {selectedLog.details && (
                <div className="detail-row">
                  <span className="detail-label">Details:</span>
                  <pre className="detail-json">{JSON.stringify(selectedLog.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
