import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, Button, Input, Spinner } from '@components/atoms';
import { useAuth } from '@contexts/AuthContext';
import { authAPI, balanceAPI } from '@services/api';
import { useMemoryOptimizedGameHistory } from '../../hooks/useMemoryOptimizedGameHistory';
import { 
  VirtualizedGameHistoryLazy, 
  GameHistoryStatsLazy,
  GameHistoryFiltersLazy,
  GameHistoryExportLazy,
  ProgressiveLoad,
  preloadGameHistoryComponents
} from '../../components/profile/LazyGameHistoryComponents';
import type { 
  Transaction, 
  GameHistoryFilters,
  ChangePasswordForm 
} from '../../types';
import toast from 'react-hot-toast';
import { dateFormatters } from '../../utils/dateUtils';

// Lazy load transaction components (less frequently used)
const LazyTransactionHistory = lazy(() => 
  import('../../components/profile/TransactionHistory').then(module => ({
    default: module.default || module
  })).catch(() => ({
    // Fallback inline component if module doesn't exist
    default: ({ transactions }: { transactions: Transaction[] }) => (
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-text-primary">
                {transaction.description}
              </h3>
              <p className="text-sm text-gray-400">
                {dateFormatters.historyTimestamp(transaction.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className={`font-bold text-lg ${
                transaction.type === 'deposit' || transaction.type === 'winnings'
                  ? 'text-success' : 'text-error'
              }`}>
                {transaction.type === 'deposit' || transaction.type === 'winnings' ? '+' : '-'}
                ${Math.abs(transaction.amount || 0).toLocaleString()}
              </p>
            </div>
          </Card>
        ))}
      </div>
    )
  }))
);

type TabType = 'games' | 'transactions' | 'settings';

const OptimizedProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [filters, setFilters] = useState<GameHistoryFilters>({
    page: 1,
    limit: 25, // Increased from 10 for better virtual scrolling
    sortBy: 'playedAt',
    sortOrder: 'desc'
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Use memory-optimized game history hook
  const {
    games,
    statistics,
    loading: gamesLoading,
    error: gamesError,
    hasNextPage,
    memoryUsage,
    loadMore,
    refresh: _refreshGames, // eslint-disable-line @typescript-eslint/no-unused-vars
    clearCache
  } = useMemoryOptimizedGameHistory(filters);

  // Preload components on mount for better UX
  useEffect(() => {
    preloadGameHistoryComponents();
    console.log('Game history components preloaded');
  }, []);

  // Load transactions only when tab is accessed
  const loadTransactions = async () => {
    if (transactions.length > 0) return; // Already loaded
    
    setTransactionsLoading(true);
    try {
      const trans = await balanceAPI.getTransactions();
      setTransactions(trans);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handle tab change with lazy loading
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    
    if (tab === 'transactions') {
      loadTransactions();
    }
  };

  const handleFiltersChange = (newFilters: GameHistoryFilters) => {
    setFilters(newFilters);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to change password'
      toast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  // Performance monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Profile Performance Stats:', {
        gamesCount: games.length,
        memoryUsage: memoryUsage.estimatedSize,
        hasNextPage,
        loading: gamesLoading
      });
    }
  }, [games.length, memoryUsage, hasNextPage, gamesLoading]);

  // Handle errors
  if (gamesError) {
    toast.error(gamesError);
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <p className="text-gray-400">Please login to view your profile</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Info Header */}
      <Card className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {user.username}
            </h1>
            <p className="text-gray-400">{user.email}</p>
            <p className="text-sm text-gray-500 mt-2">
              Member since {dateFormatters.memberSince(user.createdAt)}
            </p>
            {/* Memory usage indicator in development */}
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-blue-500 mt-1">
                Memory: {memoryUsage.estimatedSize} ({memoryUsage.gamesCount} games)
                {memoryUsage.lastCleanup && (
                  <span className="ml-2">
                    Last cleanup: {dateFormatters.timeOnly(memoryUsage.lastCleanup)}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400 mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-success">
              ${(user.balance || 0).toLocaleString()}
            </p>
            {/* Memory cleanup button in development */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={clearCache}
                size="sm"
                variant="secondary"
                className="mt-2"
              >
                Clear Cache
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-primary/20">
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'games'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
          onClick={() => handleTabChange('games')}
        >
          Game History
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
          onClick={() => handleTabChange('transactions')}
        >
          Transactions
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
          onClick={() => handleTabChange('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <>
        {/* Game History Tab */}
        {activeTab === 'games' && (
          <div className="space-y-6">
            {/* Statistics Summary */}
            <ProgressiveLoad threshold={0.1} height="150px">
              {statistics && (
                <GameHistoryStatsLazy 
                  statistics={statistics} 
                  loading={gamesLoading}
                />
              )}
            </ProgressiveLoad>
            
            {/* Filters */}
            <ProgressiveLoad threshold={0.2} height="120px">
              <GameHistoryFiltersLazy
                filters={filters}
                onFiltersChange={handleFiltersChange}
                loading={gamesLoading}
              />
            </ProgressiveLoad>
            
            {/* Export Component */}
            <ProgressiveLoad threshold={0.3} height="200px">
              <GameHistoryExportLazy
                gameHistory={games}
                statistics={statistics || undefined}
                loading={gamesLoading}
              />
            </ProgressiveLoad>
            
            {/* Virtualized Game History List */}
            <VirtualizedGameHistoryLazy
              games={games}
              loading={gamesLoading}
              hasNextPage={hasNextPage}
              onLoadMore={loadMore}
            />
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {transactionsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="xl" />
              </div>
            ) : transactions.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-gray-400">No transactions yet</p>
              </Card>
            ) : (
              <Suspense fallback={
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              }>
                <LazyTransactionHistory transactions={transactions} />
              </Suspense>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <Card>
              <h2 className="text-xl font-semibold mb-6">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  type="password"
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                  fullWidth
                />
                <Input
                  type="password"
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  helperText="Minimum 6 characters"
                  required
                  fullWidth
                />
                <Input
                  type="password"
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={changingPassword}
                  disabled={changingPassword}
                >
                  Change Password
                </Button>
              </form>
            </Card>
          </div>
        )}
      </>
    </div>
  );
};

export default OptimizedProfile;