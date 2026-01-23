import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Badge, Spinner, NetworkIcon, extractNetworkFromDescription } from '@components/atoms'
import { useAuth } from '@contexts/AuthContext'
import { authAPI, balanceAPI } from '@services/api'
import type {
  Transaction,
  TransactionFilters,
  GameHistory,
  GameHistoryFilters,
  PaginationData,
  ChangePasswordForm,
  UserLog,
  UserLogFilters
} from '../../types'
import { GameHistoryPagination } from '../../components/profile/GameHistoryPagination'
import { useGameHistoryCache } from '../../hooks/useGameHistoryCache'
import toast from 'react-hot-toast'
import { dateFormatters } from '../../utils/dateUtils'
import { formatCurrency } from '../../utils/currencyUtils'
import { useBalanceVisibility } from '@contexts/BalanceVisibilityContext'
import {
  validatePassword,
  validatePasswordMatch,
  getPasswordErrorMessages,
  PASSWORD_HELPER_TEXT,
} from '../../utils/passwordValidator'

type TabType = 'games' | 'transactions' | 'logs' | 'settings'

// Helper function to normalize IPv4-mapped IPv6 addresses
const normalizeIP = (ip: string): string => {
  return ip?.startsWith('::ffff:') ? ip.replace('::ffff:', '') : ip
}

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
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 10
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionPagination, setTransactionPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  // User logs state
  const [userLogFilters, setUserLogFilters] = useState<UserLogFilters>({
    page: 1,
    limit: 10
  })
  const [userLogs, setUserLogs] = useState<UserLog[]>([])
  const [userLogPagination, setUserLogPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [userLogsLoading, setUserLogsLoading] = useState(false)
  const [userLogsError, setUserLogsError] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [backendPasswordError, setBackendPasswordError] = useState<string | null>(null)

  // Refs for focus management
  const currentPasswordRef = useRef<HTMLInputElement>(null)
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

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

  // Fetch transactions with pagination - memoized to prevent recreating
  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true)
    setTransactionsError(null)
    try {
      const response = await balanceAPI.getTransactions(transactionFilters)
      setTransactions(response.data)
      setTransactionPagination(response.pagination)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load transactions'
      setTransactionsError(errorMessage)
      toast.error(errorMessage)
      console.error('[Profile] Transactions fetch error:', error)
    } finally {
      setTransactionsLoading(false)
    }
  }, [transactionFilters])

  // Initial data load - only run once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gameResponse, transResponse] = await Promise.all([
          balanceAPI.getGameHistory(filters),
          balanceAPI.getTransactions(transactionFilters),
        ])
        setGameHistory(gameResponse.data)
        setPagination(gameResponse.pagination)
        setTransactions(transResponse.data)
        setTransactionPagination(transResponse.pagination)
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

  // Fetch transactions when filters change (with debouncing)
  const transactionDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Skip if initial load hasn't completed
    if (!initialLoadComplete.current || loading) {
      return
    }

    // Clear existing timer
    if (transactionDebounceTimer.current) {
      clearTimeout(transactionDebounceTimer.current)
    }

    // Set new debounced call
    transactionDebounceTimer.current = setTimeout(() => {
      fetchTransactions()
    }, 500) // 500ms debounce

    // Cleanup
    return () => {
      if (transactionDebounceTimer.current) {
        clearTimeout(transactionDebounceTimer.current)
      }
    }
  }, [transactionFilters, fetchTransactions, loading])

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleTransactionPageChange = (page: number) => {
    setTransactionFilters(prev => ({ ...prev, page }))
  }

  // Fetch user logs with pagination - memoized
  const fetchUserLogs = useCallback(async () => {
    setUserLogsLoading(true)
    setUserLogsError(null)
    try {
      const response = await authAPI.getUserLogs(userLogFilters)
      setUserLogs(response.data)
      setUserLogPagination(response.pagination)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user logs'
      setUserLogsError(errorMessage)
      toast.error(errorMessage)
      console.error('[Profile] User logs fetch error:', error)
    } finally {
      setUserLogsLoading(false)
    }
  }, [userLogFilters])

  // Handler for user log page changes
  const handleUserLogPageChange = (page: number) => {
    setUserLogFilters(prev => ({ ...prev, page }))
  }

  // Fetch user logs when filters change (with debouncing)
  const userLogDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Skip if initial load hasn't completed
    if (!initialLoadComplete.current || loading) {
      return
    }

    // Clear existing timer
    if (userLogDebounceTimer.current) {
      clearTimeout(userLogDebounceTimer.current)
    }

    // Set new debounced call
    userLogDebounceTimer.current = setTimeout(() => {
      fetchUserLogs()
    }, 500) // 500ms debounce

    // Cleanup
    return () => {
      if (userLogDebounceTimer.current) {
        clearTimeout(userLogDebounceTimer.current)
      }
    }
  }, [userLogFilters, fetchUserLogs, loading])

  const handleGameClick = (game: GameHistory) => {
    // Only navigate if the game is pending and has a roomId
    if (game.result === 'pending' && game.roomId) {
      navigate(`/room/${game.roomId}`)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous backend error
    setBackendPasswordError(null)

    // Mark all fields as touched for validation
    setNewPasswordTouched(true)
    setConfirmPasswordTouched(true)

    // Validate all required fields
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setBackendPasswordError('Please fill in all fields')
      // Focus on first empty field
      if (!passwordForm.currentPassword && currentPasswordRef.current) {
        currentPasswordRef.current.focus()
      } else if (!passwordForm.newPassword && newPasswordRef.current) {
        newPasswordRef.current.focus()
      } else if (!passwordForm.confirmPassword && confirmPasswordRef.current) {
        confirmPasswordRef.current.focus()
      }
      return
    }

    // Validate password requirements (frontend)
    const passwordValidation = validatePassword(passwordForm.newPassword)
    if (!passwordValidation.valid) {
      // Focus on password field
      if (newPasswordRef.current) {
        newPasswordRef.current.focus()
      }
      return
    }

    // Validate password match
    const passwordsMatch = validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword)
    if (!passwordsMatch) {
      // Focus on confirm password field
      if (confirmPasswordRef.current) {
        confirmPasswordRef.current.focus()
      }
      return
    }

    setChangingPassword(true)
    try {
      const response = await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      // Display backend success message
      toast.success(response.message || 'Password changed successfully')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setNewPasswordTouched(false)
      setConfirmPasswordTouched(false)
      setBackendPasswordError(null)
    } catch (error: unknown) {
      // Extract backend error from axios response
      let errorMessage = 'Failed to change password'

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } }
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Display error inline
      setBackendPasswordError(errorMessage)

      // Focus on current password field (most common error is wrong current password)
      if (currentPasswordRef.current) {
        currentPasswordRef.current.focus()
      }
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
            activeTab === 'logs'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          User Logs
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
            <div className="space-y-6">
              {/* Transactions List */}
              <div className="space-y-4">
                {transactionsLoading && !transactions.length ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="xl" />
                  </div>
                ) : transactionsError ? (
                  <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Failed to Load Transactions</h3>
                        <p className="text-gray-400 mb-4">{transactionsError}</p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => fetchTransactions()}
                      >
                        Try Again
                      </Button>
                    </div>
                  </Card>
                ) : transactions.length === 0 ? (
                  <Card className="text-center py-16">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div className="max-w-md">
                        <h3 className="text-2xl font-bold text-text-primary mb-3">
                          No Transactions Yet
                        </h3>
                        <p className="text-gray-400 mb-2">
                          Your transaction history will appear here once you make your first deposit or play a game!
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                          All deposits, withdrawals, entry fees, and winnings will be tracked here.
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
                    {transactions.map((transaction) => {
                      // Extract network from description for crypto deposits
                      const isCryptoDeposit = transaction.description?.toLowerCase().includes('crypto deposit')
                      const network = isCryptoDeposit ? extractNetworkFromDescription(transaction.description || '') : null

                      return (
                        <Card key={transaction.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Network Icon for crypto deposits */}
                            {network && (
                              <NetworkIcon network={network} size="md" />
                            )}
                            <div>
                              <h3 className="font-semibold text-text-primary">
                                {transaction.description}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {dateFormatters.historyTimestamp(transaction.createdAt)}
                              </p>
                            </div>
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
                      )
                    })}

                    {/* Pagination */}
                    <GameHistoryPagination
                      pagination={transactionPagination}
                      onPageChange={handleTransactionPageChange}
                      loading={transactionsLoading}
                      itemName="transactions"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* User Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              {/* User Logs List */}
              <div className="space-y-4">
                {userLogsLoading && !userLogs.length ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="xl" />
                  </div>
                ) : userLogsError ? (
                  <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-text-primary font-medium mb-2">{userLogsError}</p>
                        <button
                          onClick={() => fetchUserLogs()}
                          className="text-primary hover:text-primary-hover font-medium"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </Card>
                ) : userLogs.length === 0 ? (
                  <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center">
                        <svg className="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-text-primary font-medium mb-1">No Activity Logs</p>
                        <p className="text-text-secondary text-sm">Your account activity will appear here</p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <>
                    {userLogs.map((log) => (
                      <Card key={log.id} className="hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start gap-4">
                          {/* Left: Date & Time + Action */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm text-text-secondary">
                                {new Date(log.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </p>
                            </div>
                            <p className="text-base font-medium text-text-primary">
                              {log.action.replace(/_/g, ' ')}
                            </p>
                          </div>

                          {/* Middle: IP & Device */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm text-text-secondary">{log.device}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              <p className="text-sm text-text-secondary">{normalizeIP(log.ip)}</p>
                            </div>
                          </div>

                          {/* Right: Status Badge */}
                          <div className="flex items-center">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                log.status === 'SUCCESS'
                                  ? 'bg-success/20 text-success'
                                  : 'bg-error/20 text-error'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}

                    {/* Pagination */}
                    <GameHistoryPagination
                      pagination={userLogPagination}
                      onPageChange={handleUserLogPageChange}
                      loading={userLogsLoading}
                      itemName="logs"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card>
                <h2 className="text-xl font-semibold mb-6">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {/* Backend error display */}
                  {backendPasswordError && (
                    <div
                      className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm"
                      role="alert"
                      aria-live="assertive"
                    >
                      <p className="font-medium">{backendPasswordError}</p>
                    </div>
                  )}

                  <Input
                    ref={currentPasswordRef}
                    type="password"
                    label="Current Password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      // Clear error when user starts typing
                      if (backendPasswordError) {
                        setBackendPasswordError(null)
                      }
                    }}
                    required
                    fullWidth
                  />
                  <Input
                    ref={newPasswordRef}
                    type="password"
                    label="New Password"
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      // Clear error when user starts typing
                      if (backendPasswordError) {
                        setBackendPasswordError(null)
                      }
                    }}
                    onBlur={() => setNewPasswordTouched(true)}
                    helperText={!newPasswordTouched ? PASSWORD_HELPER_TEXT : undefined}
                    errorList={
                      newPasswordTouched && !validatePassword(passwordForm.newPassword).valid
                        ? getPasswordErrorMessages(validatePassword(passwordForm.newPassword).errors)
                        : undefined
                    }
                    required
                    fullWidth
                  />
                  <Input
                    ref={confirmPasswordRef}
                    type="password"
                    label="Confirm New Password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      // Clear error when user starts typing
                      if (backendPasswordError) {
                        setBackendPasswordError(null)
                      }
                    }}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    error={
                      confirmPasswordTouched &&
                      passwordForm.confirmPassword &&
                      !validatePasswordMatch(passwordForm.newPassword, passwordForm.confirmPassword)
                        ? 'Passwords do not match'
                        : undefined
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