import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import FilterSection, { FilterField } from '../components/FilterSection';
import './Transactions.css';

// Types
interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'WIN' | 'ADMIN_ADJUSTMENT' | 'COMMISSION' | 'REFUND';
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'PENDING' | 'PROCESSING' | 'FAILED';
  referenceId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  adminName?: string;
  adminEmail?: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionStatistics {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  pendingCount: number;
  failedCount: number;
}

// Icon Components
const DepositIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M17 7l-5-5-5 5"/>
  </svg>
);

const WithdrawIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M17 17l-5 5-5-5"/>
  </svg>
);

const BetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 9h6M9 15h6"/>
  </svg>
);

const WinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
  </svg>
);

const AdjustmentIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const CommissionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);

const RefundIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

const ChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 20V10M12 20V4M6 20v-6"/>
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const API_URL = 'http://localhost:3001/api';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [statistics, setStatistics] = useState<TransactionStatistics | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [relatedTransactions, setRelatedTransactions] = useState<any[]>([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // Transform filters to match backend expectations
      const transformedFilters: Record<string, any> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (typeof value === 'object') {
            // Handle range filters
            if ('min' in value && value.min) transformedFilters[`${key}_min`] = value.min;
            if ('max' in value && value.max) transformedFilters[`${key}_max`] = value.max;
            if ('startDate' in value && value.startDate) transformedFilters[`${key}_start`] = value.startDate;
            if ('endDate' in value && value.endDate) transformedFilters[`${key}_end`] = value.endDate;
          } else {
            transformedFilters[key] = value;
          }
        }
      });
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...transformedFilters
      });

      const response = await axios.get(
        `${API_URL}/admin/transactions?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTransactions(response.data.transactions || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalTransactions(response.data.pagination?.total || 0);
      setStatistics(response.data.statistics || null);
    } catch (error: any) {
      console.error('Fetch transactions error:', error);
      toast.error('Failed to load transactions');
      // Use mock data if API fails
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const fetchTransactionDetails = async (transactionId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_URL}/admin/transactions/${transactionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedTransaction(response.data.transaction);
      setRelatedTransactions(response.data.relatedTransactions || []);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load transaction details');
    }
  };

  const exportTransactions = async (format: 'csv' | 'pdf') => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ ...filters, format });
      
      const response = await axios.get(
        `${API_URL}/admin/transactions/export?${params}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString()}.${format}`;
      a.click();
      
      toast.success(`Transactions exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export transactions');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <DepositIcon className="transaction-icon" />;
      case 'WITHDRAWAL': return <WithdrawIcon className="transaction-icon" />;
      case 'BET': return <BetIcon className="transaction-icon" />;
      case 'WIN': return <WinIcon className="transaction-icon" />;
      case 'ADMIN_ADJUSTMENT': return <AdjustmentIcon className="transaction-icon" />;
      case 'COMMISSION': return <CommissionIcon className="transaction-icon" />;
      case 'REFUND': return <RefundIcon className="transaction-icon" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    const upperType = type?.toUpperCase();
    switch (upperType) {
      case 'DEPOSIT': return 'type-deposit';
      case 'WITHDRAWAL': return 'type-withdrawal';
      case 'BET': return 'type-bet';
      case 'WIN': return 'type-win';
      case 'ADJUSTMENT':
      case 'ADMIN_ADJUSTMENT': return 'type-adjustment';
      case 'COMMISSION': return 'type-commission';
      case 'REFUND': return 'type-refund';
      default: return 'type-default';
    }
  };

  const getStatusColor = (status: string) => {
    const upperStatus = status?.toUpperCase();
    switch (upperStatus) {
      case 'COMPLETED':
      case 'SUCCESS': return 'status-success';
      case 'PENDING': return 'status-pending';
      case 'PROCESSING': return 'status-processing';
      case 'FAILED': return 'status-failed';
      default: return 'status-default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'text',
      key: 'search',
      label: 'Search',
      placeholder: 'Transaction ID, user name, email...'
    },
    {
      type: 'select',
      key: 'type',
      label: 'Transaction Type',
      options: [
        { value: 'DEPOSIT', label: 'Deposit' },
        { value: 'WITHDRAWAL', label: 'Withdrawal' },
        { value: 'BET', label: 'Bet' },
        { value: 'WIN', label: 'Win' },
        { value: 'ADMIN_ADJUSTMENT', label: 'Admin Adjustment' },
        { value: 'COMMISSION', label: 'Commission' },
        { value: 'REFUND', label: 'Refund' }
      ]
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: 'SUCCESS', label: 'Success' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'PROCESSING', label: 'Processing' },
        { value: 'FAILED', label: 'Failed' }
      ]
    },
    {
      type: 'dateRange',
      key: 'dateRange',
      label: 'Date Range'
    },
    {
      type: 'numericRange',
      key: 'amountRange',
      label: 'Amount Range ($)'
    }
  ], []);

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    const processedFilters: Record<string, any> = {};
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (key === 'dateRange' && value) {
        if (value.startDate) processedFilters.startDate = value.startDate;
        if (value.endDate) processedFilters.endDate = value.endDate;
      } else if (key === 'amountRange' && value) {
        if (value.min) processedFilters.minAmount = value.min;
        if (value.max) processedFilters.maxAmount = value.max;
      } else if (value) {
        processedFilters[key] = value;
      }
    });
    
    setFilters(processedFilters);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => filters[key]).length;
  }, [filters]);

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div className="header-content">
          <h1>💰 Transactions</h1>
          <p>Monitor all financial transactions across the platform</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <ChartIcon className="btn-icon" />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
          <div className="export-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => exportTransactions('csv')}
            >
              <DownloadIcon className="btn-icon" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && statistics && (
        <div className="analytics-dashboard">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">📊</div>
              <div className="stat-content">
                <p className="stat-label">Total Transactions</p>
                <p className="stat-value">{statistics.totalTransactions.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon credits">💵</div>
              <div className="stat-content">
                <p className="stat-label">Total Credits</p>
                <p className="stat-value text-success">+${statistics.totalCredits.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon debits">💸</div>
              <div className="stat-content">
                <p className="stat-label">Total Debits</p>
                <p className="stat-value text-danger">-${statistics.totalDebits.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon net">💰</div>
              <div className="stat-content">
                <p className="stat-label">Net Amount</p>
                <p className={`stat-value ${statistics.netAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${statistics.netAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon pending">⏳</div>
              <div className="stat-content">
                <p className="stat-label">Pending</p>
                <p className="stat-value text-warning">{statistics.pendingCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon failed">❌</div>
              <div className="stat-content">
                <p className="stat-label">Failed</p>
                <p className="stat-value text-danger">{statistics.failedCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <FilterSection
        fields={filterFields}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />

      <div className="content-section">
        <div className="table-container">
          <div className="table-wrapper">
            <table className="transactions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date & Time</th>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="loading-cell">
                    <div className="loading-spinner"></div>
                    <p>Loading transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td>
                      <code className="transaction-id">{transaction.id.slice(0, 8)}...</code>
                    </td>
                    <td>
                      <span className="date-time">{formatDate(transaction.createdAt)}</span>
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {transaction.userName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                          <p className="user-name">{transaction.userName}</p>
                          <p className="user-email">{transaction.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={`transaction-type ${getTypeColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                        <span>{transaction.type}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`amount ${transaction.amount >= 0 ? 'amount-credit' : 'amount-debit'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{transaction.currency === 'USD' ? '$' : ''}
                        {Math.abs(transaction.amount).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>
                      <span className="description" title={transaction.description}>
                        {transaction.description || '-'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => fetchTransactionDetails(transaction.id)}
                        title="View Details"
                      >
                        <EyeIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages} ({totalTransactions} total)
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="detail-modal">
              <div className="detail-header">
                <h3 className="detail-title">Transaction Details</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <XIcon />
                </button>
              </div>
              <div className="detail-content">
                <div className="detail-section">
                  <h4 className="section-title">Transaction Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Transaction ID</label>
                      <code>{selectedTransaction.id}</code>
                    </div>
                    <div className="detail-item">
                      <label>Type</label>
                      <div className={`transaction-type ${getTypeColor(selectedTransaction.type)}`}>
                        {getTransactionIcon(selectedTransaction.type)}
                        <span>{selectedTransaction.type}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <label>Amount</label>
                      <span className={`amount ${selectedTransaction.amount >= 0 ? 'amount-credit' : 'amount-debit'}`}>
                        {selectedTransaction.amount >= 0 ? '+' : ''}{selectedTransaction.currency === 'USD' ? '$' : ''}
                        {Math.abs(selectedTransaction.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Status</label>
                      <span className={`status-badge ${getStatusColor(selectedTransaction.status)}`}>
                        {selectedTransaction.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Created</label>
                      <span>{formatDate(selectedTransaction.createdAt)}</span>
                    </div>
                    {selectedTransaction.referenceId && (
                      <div className="detail-item">
                        <label>Reference ID</label>
                        <code>{selectedTransaction.referenceId}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="section-title">User Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>User ID</label>
                      <code>{selectedTransaction.userId}</code>
                    </div>
                    <div className="detail-item">
                      <label>Name</label>
                      <span>{selectedTransaction.userName}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email</label>
                      <span>{selectedTransaction.userEmail}</span>
                    </div>
                  </div>
                </div>

                {selectedTransaction.adminName && (
                  <div className="detail-section">
                    <h4 className="section-title">Admin Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Admin</label>
                        <span>{selectedTransaction.adminName}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email</label>
                        <span>{selectedTransaction.adminEmail}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div className="detail-section">
                    <h4 className="section-title">Metadata</h4>
                    <div className="metadata-content">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </div>
                  </div>
                )}

                {relatedTransactions.length > 0 && (
                  <div className="detail-section">
                    <h4 className="section-title">Related Transactions</h4>
                    <div className="related-transactions">
                      {relatedTransactions.map(rt => (
                        <div key={rt.id} className="related-transaction">
                          <span className="rt-user">{rt.userName}</span>
                          <div className={`transaction-type rt-type ${getTypeColor(rt.type)}`}>
                            {getTransactionIcon(rt.type)}
                            <span>{rt.type}</span>
                          </div>
                          <span className={`amount rt-amount ${rt.amount >= 0 ? 'amount-credit' : 'amount-debit'}`}>
                            {rt.amount >= 0 ? '+' : ''}${Math.abs(rt.amount).toLocaleString()}
                          </span>
                          <span className={`status-badge rt-status ${getStatusColor(rt.status)}`}>{rt.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;