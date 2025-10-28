import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Badge, Spinner } from '@components/atoms'
import { useAuth } from '@contexts/AuthContext'
import { authAPI, balanceAPI } from '@services/api'
import type {
  Transaction,
  GameHistory,
  GameHistoryFilters,
  PaginationData,
  ChangePasswordForm
} from '../../types'
import { GameHistoryPagination } from '../../components/profile/GameHistoryPagination'
import { useGameHistoryCache } from '../../hooks/useGameHistoryCache'
import toast from 'react-hot-toast'
import { dateFormatters } from '../../utils/dateUtils'
import { formatCurrency } from '../../utils/currencyUtils'
import { useBalanceVisibility } from '@contexts/BalanceVisibilityContext'

type TabType = 'games' | 'transactions' | 'settings'

const Profile = () => {
  const navigate = useNavigate()
  const { user, updateBalance: _updateBalance } = useAuth() // eslint-disable-line @typescript-eslint/no-unused-vars
  const { isVisible: balanceVisible } = useBalanceVisibility()
  const [activeTab, setActiveTab] = useState<TabType>('games')
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState<GameHistoryFilters>({
    page: 1,
    limit: 10
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)

  // Use cached game history hook
  const {
    fetchGameHistory: fetchCachedGameHistory,
    prefetchNextPage,
    clearCache: _clearCache, // eslint-disable-line @typescript-eslint/no-unused-vars
    loading: _cacheLoading, // eslint-disable-line @typescript-eslint/no-unused-vars
    error: _cacheError // eslint-disable-line @typescript-eslint/no-unused-vars
  } = useGameHistoryCache()

  // Fetch game history with caching - memoized to prevent recreating
  const fetchGameHistory = useCallback(async () => {
    setGamesLoading(true)
    setGamesError(null)
    try {
      const response = await fetchCachedGameHistory(filters)
      setGameHistory(response.data)
      setPagination(response.pagination)

      // Prefetch next page for smoother pagination
      if (response.pagination.page < response.pagination.totalPages) {
        prefetchNextPage(filters)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load game history'
      setGamesError(errorMessage)
      toast.error(errorMessage)
      console.error('[Profile] Game history fetch error:', error)
    } finally {
      setGamesLoading(false)
    }
  }, [filters, fetchCachedGameHistory, prefetchNextPage])

  // Initial data load - only run once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gameResponse, trans] = await Promise.all([
          balanceAPI.getGameHistory(filters),
          balanceAPI.getTransactions(),
        ])
        setGameHistory(gameResponse.data)
        setPagination(gameResponse.pagination)
        setTransactions(trans)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load profile data'
        setGamesError(errorMessage)
        toast.error(errorMessage)
        console.error('[Profile] Initial data load error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - only run once on mount

  // Track if initial load is complete
  const initialLoadComplete = useRef(false)

  // Debounce timer ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch game history when filters change (with debouncing)
  useEffect(() => {
    // Skip if initial load hasn't completed
    if (!initialLoadComplete.current || loading) {
      return
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new debounced call
    debounceTimer.current = setTimeout(() => {
      fetchGameHistory()
    }, 500) // 500ms debounce

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [filters, fetchGameHistory, loading])

  // Mark initial load as complete
  useEffect(() => {
    if (!loading) {
      initialLoadComplete.current = true
    }
  }, [loading])

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleGameClick = (game: GameHistory) => {
    // Only navigate if the game is pending and has a roomId
    if (game.result === 'pending' && game.roomId) {
      navigate(`/room/${game.roomId}`)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      toast.success('Password changed successfully')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to change password'
      toast.error(errorMessage)
    } finally {
      setChangingPassword(false)
    }
  }

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'win':
        return <Badge variant="success">Won</Badge>
      case 'loss':
        return <Badge variant="danger">Lost</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      default:
        return null
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="success">Deposit</Badge>
      case 'withdrawal':
        return <Badge variant="danger">Withdrawal</Badge>
      case 'entry_fee':
        return <Badge variant="warning">Entry Fee</Badge>
      case 'winnings':
        return <Badge variant="success">Winnings</Badge>
      case 'refund':
        return <Badge variant="info">Refund</Badge>
      default:
        return <Badge variant="default">{type}</Badge>
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <p className="text-gray-400">Please login to view your profile</p>
        </Card>
      </div>
    )
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
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400 mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-success">
              {balanceVisible ? formatCurrency(user.balance || 0) : <span className="font-bold text-3xl">••••••</span>}
            </p>
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
          onClick={() => setActiveTab('games')}
        >
          Game History
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="xl" />
        </div>
      ) : (
        <>
          {/* Game History Tab */}
          {activeTab === 'games' && (
            <div className="space-y-6">
              {/* Game History List */}
              <div className="space-y-4">
                {gamesLoading && !gameHistory.length ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="xl" />
                  </div>
                ) : gamesError ? (
                  <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Failed to Load Game History</h3>
                        <p className="text-gray-400 mb-4">{gamesError}</p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => fetchGameHistory()}
                      >
                        Try Again
                      </Button>
                    </div>
                  </Card>
                ) : gameHistory.length === 0 ? (
                  <Card className="text-center py-16">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div className="max-w-md">
                        <h3 className="text-2xl font-bold text-text-primary mb-3">
                          Ready to Start Playing?
                        </h3>
                        <p className="text-gray-400 mb-2">
                          Your game history will appear here once you join your first room!
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                          Join active rooms, compete with other players, and track all your wins and games in one place.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => navigate('/')}
                        className="px-8"
                      >
                        Browse Active Rooms
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {gameHistory.map((game) => (
                      <Card
                        key={game.id}
                        className={`flex items-center justify-between transition-all ${
                          game.result === 'pending'
                            ? 'cursor-pointer hover:bg-primary/10 border-2 border-warning/50 bg-warning/5'
                            : ''
                        }`}
                        onClick={() => handleGameClick(game)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text-primary">
                              {game.roomName}
                            </h3>
                            {game.result === 'pending' && (
                              <span className="text-xs text-warning font-medium animate-pulse">
                                LIVE
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {dateFormatters.historyTimestamp(game.playedAt)}
                          </p>
                          {game.position && (
                            <p className="text-sm text-primary mt-1">
                              Position: #{game.position}
                            </p>
                          )}
                          {game.result === 'pending' && (
                            <p className="text-sm text-warning mt-2 font-medium">
                              Click to rejoin room →
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Bet Amount</p>
                            <p className="font-semibold">{formatCurrency(game.betAmount || game.entryFee || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Prize Pool</p>
                            <p className="font-semibold text-info">{formatCurrency(game.prizePool || 0)}</p>
                          </div>
                          {(game.wonAmount > 0 || game.prize) && (
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Won Amount</p>
                              <p className="font-semibold text-success">
                                {formatCurrency(game.wonAmount || game.prize || 0)}
                              </p>
                            </div>
                          )}
                          {getResultBadge(game.result)}
                        </div>
                      </Card>
                    ))}
                    
                    {/* Pagination */}
                    <GameHistoryPagination
                      pagination={pagination}
                      onPageChange={handlePageChange}
                      loading={gamesLoading}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <Card className="text-center py-12">
                  <p className="text-gray-400">No transactions yet</p>
                </Card>
              ) : (
                transactions.map((transaction) => (
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
                      <p
                        className={`font-bold text-lg ${
                          transaction.type === 'deposit' || transaction.type === 'winnings'
                            ? 'text-success'
                            : 'text-error'
                        }`}
                      >
                        {transaction.type === 'deposit' || transaction.type === 'winnings' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount || 0))}
                      </p>
                      {getTransactionBadge(transaction.type)}
                    </div>
                  </Card>
                ))
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
      )}
    </div>
  )
}

export default Profile