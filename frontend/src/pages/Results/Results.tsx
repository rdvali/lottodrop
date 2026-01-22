import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Spinner, Badge } from '@components/atoms'
import { socketService } from '@services/socket'
import { apiClient } from '@services/api/config'
import toast from 'react-hot-toast'

interface GameResult {
  roundId: string
  userId: string
  playerName: string
  roomName: string
  roomType: 'FAST_DROP' | 'TIME_DROP' | 'MEGA_DROP'
  prizeWon: number
  completedAt: string
  timeAgo: string
}

const Results = () => {
  const [results, setResults] = useState<GameResult[]>([])
  const [loading, setLoading] = useState(true)
  const [latestResult, setLatestResult] = useState<GameResult | null>(null)

  // Fetch initial results
  useEffect(() => {
    fetchResults()

    // Set up interval to refresh time ago values
    const interval = setInterval(fetchResults, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Listen for real-time updates
  useEffect(() => {
    const handleNewResult = (data: any) => {
      // Create new result entry from socket data
      const newResult: GameResult = {
        roundId: data.roundId || 'N/A',
        userId: data.winnerId || data.winners?.[0]?.userId || '',
        playerName: data.winnerName || data.winners?.[0]?.name || 'Unknown',
        roomName: data.roomName || 'Unknown Room',
        roomType: determineRoomType(data.roomName),
        prizeWon: data.winnerAmount || data.winners?.[0]?.prizeAmount || 0,
        completedAt: new Date().toISOString(),
        timeAgo: 'Just now'
      }

      // Set as latest result
      setLatestResult(newResult)

      // Add to beginning of results array (keep only 20)
      setResults(prev => [newResult, ...prev.slice(0, 19)])

      // Show toast notification
      toast.success(`🎉 ${newResult.playerName} won $${newResult.prizeWon}!`)
    }

    // Listen for game completed events
    socketService.onGlobalGameCompleted(handleNewResult)

    return () => {
      socketService.offGlobalGameCompleted(handleNewResult)
    }
  }, [])

  const fetchResults = async () => {
    try {
      setLoading(true)
      // SECURITY FIX (Week 4): Authentication via HttpOnly cookies, no token needed
      const response = await apiClient.get('/results')

      const data = response.data
      setResults(data.results || [])
      // Set the first result as latest if we have results
      if (data.results && data.results.length > 0) {
        setLatestResult(data.results[0])
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
      toast.error('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const determineRoomType = (roomName: string): 'FAST_DROP' | 'TIME_DROP' | 'MEGA_DROP' => {
    if (roomName.toLowerCase().includes('fast')) return 'FAST_DROP'
    if (roomName.toLowerCase().includes('time')) return 'TIME_DROP'
    if (roomName.toLowerCase().includes('mega')) return 'MEGA_DROP'
    return 'FAST_DROP'
  }

  const getRoomTypeBadge = (type: string) => {
    const badges: Record<string, { variant: 'success' | 'warning' | 'danger', label: string }> = {
      'FAST_DROP': { variant: 'success', label: 'Fast Drop' },
      'TIME_DROP': { variant: 'warning', label: 'Time Drop' },
      'MEGA_DROP': { variant: 'danger', label: 'Mega Drop' },
    }
    return badges[type] || badges['FAST_DROP']
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
          Tournament Results
        </h1>
        <p className="text-gray-400">
          Last 20 completed games
        </p>
      </div>

      {/* Latest Win Highlight */}
      <AnimatePresence>
        {latestResult && latestResult.timeAgo === 'Just now' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400/50">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className="text-5xl animate-bounce">🏆</div>
                  <div>
                    <div className="text-xs text-yellow-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <span>⭐</span> LATEST WIN! <span>⭐</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                      <span>👑</span> {latestResult.playerName}
                    </h2>
                    <p className="text-gray-300 text-sm sm:text-base">
                      Won <span className="text-yellow-400 font-bold">💰 ${latestResult.prizeWon.toLocaleString()}</span> in {latestResult.roomName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoomTypeBadge(latestResult.roomType).variant} size="lg">
                    {getRoomTypeBadge(latestResult.roomType).label}
                  </Badge>
                  <Badge variant="warning" size="lg" className="animate-pulse">
                    Just Now!
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Table */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🎯</span> Recent Results
            </h2>
            <Badge variant="secondary" className="flex items-center gap-2">
              <span>📊</span> Last 20 Games
            </Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-2">No results yet</p>
              <p className="text-gray-500 text-sm">Results will appear here when games are completed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-400 font-medium">
                      Round ID
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-400 font-medium">
                      Player
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-400 font-medium hidden sm:table-cell">
                      Game Room
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-400 font-medium">
                      Type
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-400 font-medium">
                      Prize Won
                    </th>
                    <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-400 font-medium">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {results.map((result, index) => (
                      <motion.tr
                        key={result.roundId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-gray-800 hover:bg-primary/5 transition-colors"
                      >
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs sm:text-sm text-gray-400 font-mono">
                            {result.roundId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-sm sm:text-base text-text-primary font-medium flex items-center gap-2">
                            <span className="text-lg">🏅</span> {result.playerName}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                          <span className="text-sm text-gray-300">
                            {result.roomName}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <Badge
                            variant={getRoomTypeBadge(result.roomType).variant}
                            size="sm"
                          >
                            {getRoomTypeBadge(result.roomType).label}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-sm sm:text-base font-bold text-green-400">
                            ${result.prizeWon.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs sm:text-sm text-gray-400">
                            {result.timeAgo}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default Results