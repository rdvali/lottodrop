import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import FilterSection, { FilterField } from '../components/FilterSection';
import './Users.css';

// SVG Icon Components
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"/>
    <path d="M5 12h14"/>
  </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18"/>
    <path d="M6 6l12 12"/>
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5"/>
    <path d="M5 12l7-7 7 7"/>
  </svg>
);

const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"/>
    <path d="M19 12l-7 7-7-7"/>
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  currency: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalGames: number;
  totalDeposits: number;
  lastGameAt: string | null;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  balance: number;
  isAdmin: boolean;
  isActive: boolean;
}

// const API_URL = 'http://localhost:3001/api';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    balance: 0,
    isAdmin: false,
    isActive: true
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Transform filters to match backend expectations
      const transformedFilters: Record<string, any> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'balance' && value && typeof value === 'object') {
          // Transform balance range
          if (value.min) transformedFilters.balance_min = value.min;
          if (value.max) transformedFilters.balance_max = value.max;
        } else if (key === 'registrationDate' && value && typeof value === 'object') {
          // Transform registration date range
          if (value.startDate) transformedFilters.registrationDate_start = value.startDate;
          if (value.endDate) transformedFilters.registrationDate_end = value.endDate;
        } else if (key === 'lastActivity' && value && typeof value === 'object') {
          // Transform last activity date range
          if (value.startDate) transformedFilters.lastActivity_start = value.startDate;
          if (value.endDate) transformedFilters.lastActivity_end = value.endDate;
        } else if (value) {
          // Pass through other filters as-is
          transformedFilters[key] = value;
        }
      });
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: 10,
          search: searchTerm,
          status: statusFilter,
          ...transformedFilters
        }
      });

      setUsers(response.data.users);
      setTotalPages(response.data.pagination.totalPages);
      setTotalUsers(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, filters]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User created successfully');
      setShowCreateModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        balance: 0,
        isAdmin: false,
        isActive: true
      });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        balance: formData.balance,
        isAdmin: formData.isAdmin,
        isActive: formData.isActive
      };

      // Only include password if it's been changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users/${selectedUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users/${userId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle user status');
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure numeric fields have default values
      const userData = {
        ...response.data.user,
        balance: response.data.user.balance ?? 0,
        totalGames: response.data.user.totalGames ?? 0,
        totalDeposits: response.data.user.totalDeposits ?? 0
      };
      
      setSelectedUser(userData);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to fetch user details');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      balance: user.balance,
      isAdmin: user.isAdmin,
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastActive = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  // Filter configuration - stable reference, no dependencies
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'text' as const,
      key: 'search',
      label: 'Search Users',
      placeholder: 'Search by name, email...'
    },
    {
      type: 'select' as const,
      key: 'status',
      label: 'Account Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' }
      ]
    },
    {
      type: 'select' as const,
      key: 'role',
      label: 'User Role',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'player', label: 'Player' }
      ]
    },
    {
      type: 'numericRange' as const,
      key: 'balance',
      label: 'Balance Range ($)'
    },
    {
      type: 'dateRange' as const,
      key: 'registrationDate',
      label: 'Registration Date'
    },
    {
      type: 'dateRange' as const,
      key: 'lastActivity',
      label: 'Last Activity'
    },
    {
      type: 'boolean' as const,
      key: 'hasPlayedGames',
      label: 'Has Played Games',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    }
  ], []); // Empty dependency array - creates stable reference

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    // Handle special filters
    if (newFilters.search !== undefined) {
      setSearchTerm(newFilters.search);
      delete newFilters.search;
    }
    if (newFilters.status !== undefined) {
      setStatusFilter(newFilters.status || 'all');
      delete newFilters.status;
    }
    
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setFilters({});
    setCurrentPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== 'all') count++;
    count += Object.keys(filters).length;
    return count;
  }, [searchTerm, statusFilter, filters]);

  const handleDeposit = async () => {
    if (!selectedUser || !transactionAmount) return;
    
    setTransactionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users/${selectedUser.id}/deposit`,
        {
          amount: parseFloat(transactionAmount),
          description: transactionDescription || `Admin deposit to ${selectedUser.firstName} ${selectedUser.lastName}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Successfully deposited $${transactionAmount} to ${selectedUser.firstName}'s account`);
      setShowTransactionModal(false);
      setTransactionAmount('');
      setTransactionDescription('');
      fetchUsers(); // Refresh user list
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process deposit');
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedUser || !transactionAmount) return;
    
    setTransactionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/admin/users/${selectedUser.id}/withdraw`,
        {
          amount: parseFloat(transactionAmount),
          description: transactionDescription || `Admin withdrawal from ${selectedUser.firstName} ${selectedUser.lastName}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Successfully withdrew $${transactionAmount} from ${selectedUser.firstName}'s account`);
      setShowTransactionModal(false);
      setTransactionAmount('');
      setTransactionDescription('');
      fetchUsers(); // Refresh user list
    } catch (error: any) {
      if (error.response?.data?.error === 'Insufficient balance') {
        toast.error(`Insufficient balance. Current balance: $${error.response.data.currentBalance}`);
      } else {
        toast.error(error.response?.data?.error || 'Failed to process withdrawal');
      }
    } finally {
      setTransactionLoading(false);
    }
  };

  const openTransactionModal = (user: User, type: 'deposit' | 'withdraw') => {
    setSelectedUser(user);
    setTransactionType(type);
    setTransactionAmount('');
    setTransactionDescription('');
    setShowTransactionModal(true);
  };

  if (loading && users.length === 0) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-circle"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line" style={{ width: '70%' }}></div>
                  <div className="skeleton-line" style={{ width: '50%' }}></div>
                  <div className="skeleton-line" style={{ width: '60%' }}></div>
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
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage user accounts, permissions, and account status</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="btn-icon" />
            Add User
          </button>
        </div>
      </div>

      <div className="content-section">
        <FilterSection
          fields={filterFields}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          activeFilterCount={activeFilterCount}
        />
        
        <div className="section-header">
          <div className="filter-tabs">
            <button 
              className={`btn btn-ghost btn-sm ${statusFilter === 'all' ? 'btn-active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({totalUsers})
            </button>
            <button 
              className={`btn btn-ghost btn-sm ${statusFilter === 'active' ? 'btn-active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button 
              className={`btn btn-ghost btn-sm ${statusFilter === 'suspended' ? 'btn-active' : ''}`}
              onClick={() => setStatusFilter('suspended')}
            >
              Suspended
            </button>
          </div>
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Games</th>
                  <th>Total Deposits</th>
                  <th>Join Date</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info-cell">
                        <div className="user-avatar">
                          <UserIcon className="avatar-icon" />
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.firstName} {user.lastName}</div>
                          {user.isAdmin && <span className="badge badge-gold badge-sm">Admin</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-secondary">{user.email}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-primary">${(user.balance || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary">{(user.totalGames || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-primary">${(user.totalDeposits || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="text-tertiary">{formatDate(user.createdAt)}</span>
                    </td>
                    <td>
                      <span className="text-tertiary">{formatLastActive(user.lastGameAt)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-ghost btn-sm text-success" 
                          title="Deposit Money"
                          onClick={() => openTransactionModal(user, 'deposit')}
                        >
                          <ArrowUpIcon />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm text-danger" 
                          title="Withdraw Money"
                          onClick={() => openTransactionModal(user, 'withdraw')}
                        >
                          <ArrowDownIcon />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          title="Edit User"
                          onClick={() => openEditModal(user)}
                        >
                          <EditIcon />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          title="View Details"
                          onClick={() => handleViewUser(user.id)}
                        >
                          <EyeIcon />
                        </button>
                        <button 
                          className={`btn btn-ghost btn-sm ${user.isActive ? 'text-danger' : 'text-success'}`}
                          title={user.isActive ? 'Suspend User' : 'Activate User'}
                          onClick={() => handleToggleStatus(user.id)}
                        >
                          {user.isActive ? <XIcon /> : <CheckIcon />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="table-footer">
              <div className="pagination">
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New User</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
              >
                <XIcon />
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleCreateUser} className="form form-compact">
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="input"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Initial Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.balance}
                      onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <select
                      className="form-select"
                      value={formData.isAdmin ? 'admin' : 'user'}
                      onChange={(e) => setFormData({...formData, isAdmin: e.target.value === 'admin'})}
                    >
                      <option value="user">Regular User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Status</label>
                    <select
                      className="form-select"
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
                aria-label="Close modal"
              >
                <XIcon />
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleUpdateUser} className="form form-compact">
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Leave blank to keep current"
                    />
                  </div>
                </div>

                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Account Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.balance}
                      onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <select
                      className="form-select"
                      value={formData.isAdmin ? 'admin' : 'user'}
                      onChange={(e) => setFormData({...formData, isAdmin: e.target.value === 'admin'})}
                    >
                      <option value="user">Regular User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Status</label>
                    <select
                      className="form-select"
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal modal-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowViewModal(false)}
                aria-label="Close modal"
              >
                <XIcon />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-profile-header">
                <div className="user-avatar user-avatar-large">
                  <UserIcon className="avatar-icon" />
                </div>
                <div className="user-profile-info">
                  <h4 className="user-profile-name">{selectedUser.firstName} {selectedUser.lastName}</h4>
                  <p className="user-profile-email">{selectedUser.email}</p>
                  <div className="user-profile-badges">
                    <span className={`badge ${selectedUser.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {selectedUser.isActive ? 'Active' : 'Suspended'}
                    </span>
                    {selectedUser.isAdmin && <span className="badge badge-gold">Administrator</span>}
                  </div>
                </div>
              </div>
              
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Account Balance</span>
                  <span className="detail-value font-semibold">${(selectedUser.balance || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Games Played</span>
                  <span className="detail-value">{(selectedUser.totalGames || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Deposits</span>
                  <span className="detail-value font-semibold">${(selectedUser.totalDeposits || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Member Since</span>
                  <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Activity</span>
                  <span className="detail-value">{formatLastActive(selectedUser.lastGameAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Type</span>
                  <span className="detail-value">{selectedUser.isAdmin ? 'Administrator' : 'Player'}</span>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button 
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedUser);
                }}
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal (Deposit/Withdraw) */}
      {showTransactionModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal modal-compact" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {transactionType === 'deposit' ? 'Deposit Money' : 'Withdraw Money'}
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowTransactionModal(false)}
                aria-label="Close modal"
              >
                <XIcon />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-profile-summary">
                <div className="user-avatar">
                  <UserIcon className="avatar-icon" />
                </div>
                <div className="user-summary-info">
                  <h4>{selectedUser.firstName} {selectedUser.lastName}</h4>
                  <p className="text-secondary">{selectedUser.email}</p>
                  <p className="font-semibold">
                    Current Balance: <span className="text-primary">${(selectedUser.balance || 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Enter amount"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  autoFocus
                />
                {transactionType === 'withdraw' && parseFloat(transactionAmount) > (selectedUser.balance || 0) && (
                  <p className="text-danger text-sm mt-1">
                    Amount exceeds current balance (${(selectedUser.balance || 0).toLocaleString()})
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input"
                  placeholder="Enter transaction description"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="transaction-summary">
                <div className={`transaction-preview ${transactionType === 'deposit' ? 'deposit' : 'withdraw'}`}>
                  <div className="preview-icon">
                    {transactionType === 'deposit' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  </div>
                  <div className="preview-details">
                    <p className="preview-label">
                      {transactionType === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}
                    </p>
                    <p className="preview-amount">
                      {transactionType === 'deposit' ? '+' : '-'}${parseFloat(transactionAmount || '0').toLocaleString()}
                    </p>
                    <div className="preview-result">
                      <span className="result-label">New Balance</span>
                      <span className="result-value">
                        ${((selectedUser.balance || 0) + (transactionType === 'deposit' ? parseFloat(transactionAmount || '0') : -parseFloat(transactionAmount || '0'))).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowTransactionModal(false)}
                disabled={transactionLoading}
              >
                Cancel
              </button>
              <button 
                className={`btn ${transactionType === 'deposit' ? 'btn-success' : 'btn-danger'}`}
                onClick={transactionType === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={
                  transactionLoading ||
                  !transactionAmount ||
                  parseFloat(transactionAmount) <= 0 ||
                  (transactionType === 'withdraw' && parseFloat(transactionAmount) > (selectedUser.balance || 0))
                }
              >
                {transactionLoading ? 'Processing...' : 
                  transactionType === 'deposit' ? 'Deposit Money' : 'Withdraw Money'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;