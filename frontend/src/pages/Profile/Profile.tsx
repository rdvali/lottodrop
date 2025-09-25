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

type TabType = 'games' | 'transactions' | 'settings'

const Profile = () => {
  const navigate = useNavigate()
  const { user, updateBalance: _updateBalance } = useAuth() // eslint-disable-line @typescript-eslint/no-unused-vars
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
    try {
      const response = await fetchCachedGameHistory(filters)
      setGameHistory(response.data)
      setPagination(response.pagination)

      // Prefetch next page for smoother pagination
      if (response.pagination.page < response.pagination.totalPages) {
        prefetchNextPage(filters)
      }
    } catch {
      toast.error('Failed to load game history')
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
      } catch {
        toast.error('Failed to load profile data')
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
              ${(user.balance || 0).toLocaleString()}
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
                ) : gameHistory.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-gray-400">No games found with current filters</p>
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
                            <p className="font-semibold">${(game.betAmount || game.entryFee || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Prize Pool</p>
                            <p className="font-semibold text-info">${(game.prizePool || 0).toFixed(2)}</p>
                          </div>
                          {(game.wonAmount > 0 || game.prize) && (
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Won Amount</p>
                              <p className="font-semibold text-success">
                                ${(game.wonAmount || game.prize || 0).toFixed(2)}
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
                        ${Math.abs(transaction.amount || 0).toLocaleString()}
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