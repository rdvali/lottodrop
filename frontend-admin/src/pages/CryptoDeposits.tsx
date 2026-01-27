import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import FilterSection, { FilterField } from '../components/FilterSection';
import './CryptoDeposits.css';

// Types
interface CryptoDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  paymentId: string;
  network: string;
  currency: string;
  tokenStandard: string;
  depositAddress: string;
  expectedAmount: number;
  receivedAmount: number;
  feeAmount: number;
  netAmount: number;
  status: 'pending' | 'confirmed' | 'underpaid' | 'overpaid' | 'expired' | 'failed' | 'canceled';
  txHash?: string;
  confirmations: number;
  expiresAt: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

interface DepositStats {
  overview: {
    total: number;
    totalExpectedAmount: number;
    pending: number;
    pendingAmount: number;
    confirmed: number;
    confirmedAmount: number;
    overpaid: number;
    overpaidAmount: number;
    underpaid: number;
    underpaidAmount: number;
    expired: number;
    failed: number;
    canceled: number;
  };
  period: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  byNetwork: {
    network: string;
    count: number;
    totalReceived: number;
  }[];
}

// Icon Components
const CryptoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4"/>
  </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <path d="M12 9v4M12 17h.01"/>
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

// Network Icons
const TronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#EF0027"
    />
    <path
      d="M21.932 9.913L7.5 7.257l7.595 19.112 10.583-12.894-3.746-3.562zm-.232 1.17l2.208 2.099-6.038 1.093 3.83-3.192zm-5.142 2.058l-6.886 5.94 3.796-9.545 3.09 3.605zm.987.439l6.436-1.165-8.25 10.055 1.814-8.89zm-7.615 4.512l8.878-3.319-1.78 8.727-7.098-5.408z"
      fill="#fff"
    />
  </svg>
);

const EthereumIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#627EEA"
    />
    <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity={0.602} />
    <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff" />
    <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity={0.602} />
    <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="#fff" />
    <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="#fff" fillOpacity={0.2} />
    <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="#fff" fillOpacity={0.602} />
  </svg>
);

const SolanaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#000"
    />
    <path
      d="M9.925 19.687a.64.64 0 01.453-.188h14.86a.32.32 0 01.227.547l-2.89 2.89a.64.64 0 01-.454.188H7.262a.32.32 0 01-.227-.547l2.89-2.89z"
      fill="url(#solana-gradient-1)"
    />
    <path
      d="M9.925 9.188a.658.658 0 01.453-.188h14.86a.32.32 0 01.227.547l-2.89 2.89a.64.64 0 01-.454.188H7.262a.32.32 0 01-.227-.547l2.89-2.89z"
      fill="url(#solana-gradient-2)"
    />
    <path
      d="M22.121 14.406a.64.64 0 00-.454-.188H6.807a.32.32 0 00-.227.547l2.89 2.89a.64.64 0 00.454.188h14.859a.32.32 0 00.227-.547l-2.89-2.89z"
      fill="url(#solana-gradient-3)"
    />
    <defs>
      <linearGradient id="solana-gradient-1" x1="7.035" y1="23.124" x2="25.465" y2="19.499" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="solana-gradient-2" x1="7.035" y1="12.624" x2="25.465" y2="9" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="solana-gradient-3" x1="7.035" y1="17.843" x2="25.465" y2="14.218" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
  </svg>
);

// Map network to icon component
const getNetworkIcon = (network: string) => {
  const networkLower = network.toLowerCase();
  if (networkLower === 'tron' || networkLower === 'trc20' || networkLower === 'trc-20') {
    return <TronIcon className="network-icon" />;
  }
  if (networkLower === 'ethereum' || networkLower === 'erc20' || networkLower === 'erc-20') {
    return <EthereumIcon className="network-icon" />;
  }
  if (networkLower === 'solana' || networkLower === 'spl') {
    return <SolanaIcon className="network-icon" />;
  }
  // Fallback
  return <span className="network-badge">{network}</span>;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const CryptoDeposits: React.FC = () => {
  const [deposits, setDeposits] = useState<CryptoDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<DepositStats | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<CryptoDeposit | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [webhookHistory, setWebhookHistory] = useState<any[]>([]);

  // Filter configuration
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Email, payment ID, or tx hash...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'overpaid', label: 'Overpaid' },
        { value: 'underpaid', label: 'Underpaid' },
        { value: 'expired', label: 'Expired' },
        { value: 'failed', label: 'Failed' },
        { value: 'canceled', label: 'Canceled' },
      ],
    },
    {
      key: 'network',
      label: 'Network',
      type: 'select',
      options: [
        { value: '', label: 'All Networks' },
        { value: 'TRON', label: 'TRON (TRC-20)' },
        { value: 'Ethereum', label: 'Ethereum (ERC-20)' },
        { value: 'Solana', label: 'Solana (SPL)' },
      ],
    },
    {
      key: 'createdAt',
      label: 'Date Range',
      type: 'dateRange',
    },
    {
      key: 'amount',
      label: 'Amount Range',
      type: 'numericRange',
      placeholder: 'Min / Max USDT',
    },
  ];

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_URL}/admin/deposits/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');

      const transformedFilters: Record<string, any> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (typeof value === 'object') {
            if ('min' in value && value.min) transformedFilters['minAmount'] = value.min;
            if ('max' in value && value.max) transformedFilters['maxAmount'] = value.max;
            if ('startDate' in value && value.startDate) transformedFilters['startDate'] = value.startDate;
            if ('endDate' in value && value.endDate) transformedFilters['endDate'] = value.endDate;
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
        `${API_URL}/admin/deposits?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDeposits(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalDeposits(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Fetch deposits error:', error);
      toast.error('Failed to load deposits');
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchDeposits();
    fetchStats();
  }, [fetchDeposits, fetchStats]);

  const fetchDepositDetails = async (depositId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `${API_URL}/admin/deposits/${depositId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedDeposit(response.data.data);
      setWebhookHistory(response.data.data.webhookHistory || []);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load deposit details');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'badge-warning',
      confirmed: 'badge-success',
      overpaid: 'badge-info',
      underpaid: 'badge-warning',
      expired: 'badge-secondary',
      failed: 'badge-danger',
      canceled: 'badge-secondary',
    };
    return statusClasses[status] || 'badge-secondary';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateAddress = (address: string) => {
    if (!address) return '-';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const truncateTxHash = (hash: string) => {
    if (!hash) return '-';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="crypto-deposits-page">
      <div className="page-header">
        <h1>Crypto Deposits</h1>
        <p className="subtitle">Monitor and manage USDT cryptocurrency deposits</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon pending">
              <ClockIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.pending}</span>
              <span className="stat-label">Pending</span>
              <span className="stat-amount">{formatAmount(stats.overview.pendingAmount)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircleIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.confirmed}</span>
              <span className="stat-label">Confirmed</span>
              <span className="stat-amount">{formatAmount(stats.overview.confirmedAmount)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <AlertIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.expired + stats.overview.failed}</span>
              <span className="stat-label">Expired/Failed</span>
              <span className="stat-amount">-</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon total">
              <CryptoIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.overview.total}</span>
              <span className="stat-label">Total Deposits</span>
              <span className="stat-amount">{formatAmount(stats.overview.confirmedAmount + stats.overview.overpaidAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterSection
        fields={filterFields}
        onFilterChange={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        onClearFilters={() => {
          setFilters({});
          setCurrentPage(1);
        }}
        activeFilterCount={Object.keys(filters).filter(k => filters[k] !== '' && filters[k] !== null && filters[k] !== undefined).length}
      />

      {/* Results count */}
      <div className="results-info">
        Showing {deposits.length} of {totalDeposits} deposits
      </div>

      {/* Deposits Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Network</th>
              <th>Expected</th>
              <th>Received</th>
              <th>Status</th>
              <th>Confirmations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="loading-cell">
                  <div className="loading-spinner"></div>
                  Loading deposits...
                </td>
              </tr>
            ) : deposits.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No deposits found
                </td>
              </tr>
            ) : (
              deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td className="date-cell">
                    {formatDate(deposit.createdAt)}
                  </td>
                  <td className="user-cell">
                    <span className="user-email">{deposit.userEmail}</span>
                  </td>
                  <td className="network-cell">
                    {getNetworkIcon(deposit.network)}
                  </td>
                  <td className="amount-cell">
                    {formatAmount(deposit.expectedAmount)}
                  </td>
                  <td className="amount-cell">
                    {deposit.receivedAmount > 0 ? formatAmount(deposit.receivedAmount) : '-'}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(deposit.status)}`}>
                      {deposit.status}
                    </span>
                  </td>
                  <td className="confirmations-cell">
                    {deposit.confirmations || '-'}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="action-btn view"
                      onClick={() => fetchDepositDetails(deposit.id)}
                      title="View Details"
                    >
                      <EyeIcon />
                    </button>
                    {deposit.txHash && (
                      <button
                        className="action-btn copy"
                        onClick={() => copyToClipboard(deposit.txHash!)}
                        title="Copy TX Hash"
                      >
                        <CopyIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedDeposit && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Deposit Details</h2>
              <button
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <XIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h3>Payment Information</h3>
                  <div className="detail-row">
                    <span className="label">Payment ID:</span>
                    <span className="value copyable" onClick={() => copyToClipboard(selectedDeposit.paymentId)}>
                      {selectedDeposit.paymentId}
                      <CopyIcon className="copy-icon" />
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Network:</span>
                    <span className="value">{selectedDeposit.network} ({selectedDeposit.tokenStandard})</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${getStatusBadge(selectedDeposit.status)}`}>
                      {selectedDeposit.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Deposit Address:</span>
                    <span className="value copyable address" onClick={() => copyToClipboard(selectedDeposit.depositAddress)}>
                      {truncateAddress(selectedDeposit.depositAddress)}
                      <CopyIcon className="copy-icon" />
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Amount Information</h3>
                  <div className="detail-row">
                    <span className="label">Expected:</span>
                    <span className="value">{formatAmount(selectedDeposit.expectedAmount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Received:</span>
                    <span className="value">{formatAmount(selectedDeposit.receivedAmount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Fee:</span>
                    <span className="value">{formatAmount(selectedDeposit.feeAmount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Net Amount:</span>
                    <span className="value highlight">{formatAmount(selectedDeposit.netAmount)}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>User Information</h3>
                  <div className="detail-row">
                    <span className="label">Name:</span>
                    <span className="value">{selectedDeposit.userName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{selectedDeposit.userEmail}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">User ID:</span>
                    <span className="value copyable" onClick={() => copyToClipboard(selectedDeposit.userId)}>
                      {selectedDeposit.userId.slice(0, 8)}...
                      <CopyIcon className="copy-icon" />
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Transaction Details</h3>
                  <div className="detail-row">
                    <span className="label">TX Hash:</span>
                    <span className="value copyable" onClick={() => selectedDeposit.txHash && copyToClipboard(selectedDeposit.txHash)}>
                      {selectedDeposit.txHash ? truncateTxHash(selectedDeposit.txHash) : '-'}
                      {selectedDeposit.txHash && <CopyIcon className="copy-icon" />}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Confirmations:</span>
                    <span className="value">{selectedDeposit.confirmations}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(selectedDeposit.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expires:</span>
                    <span className="value">{formatDate(selectedDeposit.expiresAt)}</span>
                  </div>
                  {selectedDeposit.confirmedAt && (
                    <div className="detail-row">
                      <span className="label">Confirmed:</span>
                      <span className="value">{formatDate(selectedDeposit.confirmedAt)}</span>
                    </div>
                  )}
                </div>

                {selectedDeposit.errorMessage && (
                  <div className="detail-section error-section">
                    <h3>Error</h3>
                    <p className="error-message">{selectedDeposit.errorMessage}</p>
                  </div>
                )}

                {webhookHistory.length > 0 && (
                  <div className="detail-section webhook-section">
                    <h3>Webhook History</h3>
                    <div className="webhook-list">
                      {webhookHistory.map((event, index) => (
                        <div key={index} className="webhook-event">
                          <div className="webhook-header">
                            <span className="webhook-type">{event.type}</span>
                            <span className="webhook-time">
                              {formatDate(event.processedAt || event.createdAt)}
                            </span>
                          </div>
                          <pre className="webhook-data">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
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

export default CryptoDeposits;
