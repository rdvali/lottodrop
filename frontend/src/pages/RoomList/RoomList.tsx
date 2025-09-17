import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room, RoomStatusUpdateData, GlobalGameCompletedData } from '../../types'
import { roomAPI } from '@services/api'
import { socketService } from '@services/socket'
import { TournamentCard } from '@components/organisms'
import { StatCard } from '@components/molecules'
import { Button, Badge, CardSkeleton, StatCardSkeleton } from '@components/atoms'
import { ParticleBackground } from '@components/animations'
import { useAuth } from '@contexts/AuthContext'
import { useModal } from '@hooks/useModal'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const RoomList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openAuthModal } = useModal()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'fast_drop' | 'time_drop'>('all')
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalGames: 0,
    totalPayouts: 0,
  })

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomAPI.getRooms()
        setRooms(data)
      } catch {
        toast.error('Failed to load rooms')
      } finally {
        setLoading(false)
      }
    }

    const fetchStats = async () => {
      try {
        const statsData = await roomAPI.getRoomStats()
        setStats({
          totalPlayers: statsData.totalPlayers,
          totalGames: statsData.totalGames,
          totalPayouts: statsData.totalPayouts,
        })
      } catch {
        // If stats fail, don't show error - just use default values
        console.error('Failed to fetch stats')
      }
    }

    fetchRooms()
    fetchStats()

    // Increase interval to reduce API calls - 30 seconds for better rate limiting
    const interval = setInterval(() => {
      fetchRooms()
      fetchStats()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Socket listeners
  useEffect(() => {
    const handleRoomStatusUpdate = (data: RoomStatusUpdateData) => {
      setRooms(prev => prev.map(room => 
        room.id === data.roomId 
          ? { ...room, status: data.status, currentParticipants: data.participantCount }
          : room
      ))
    }

    const handleGlobalGameCompleted = (data: GlobalGameCompletedData) => {
      toast.success(
        `🎉 ${data.winners[0]?.username} won $${data.winners[0]?.prize} in ${data.roomName}!`,
        { duration: 8000 }
      )
      
      // Refresh rooms
      roomAPI.getRooms().then(setRooms).catch(() => {})
    }

    socketService.onRoomStatusUpdate(handleRoomStatusUpdate)
    socketService.onGlobalGameCompleted(handleGlobalGameCompleted)

    return () => {
      socketService.offRoomStatusUpdate(handleRoomStatusUpdate)
      socketService.offGlobalGameCompleted(handleGlobalGameCompleted)
    }
  }, [])

  const handleJoinRoom = async (roomId: string) => {
    if (!user) {
      // Open auth modal directly without URL navigation
      openAuthModal()
      return
    }

    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    if (user.balance < room.entryFee) {
      toast.error('Insufficient balance')
      return
    }

    try {
      await roomAPI.joinRoom(roomId)
      setJoinedRooms(prev => new Set(prev).add(roomId))
      toast.success('Successfully joined room!')
      navigate(`/room/${roomId}`)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to join room'
      toast.error(errorMessage)
    }
  }

  const filteredRooms = rooms.filter(room => {
    if (filter === 'all') return true
    return room.type === filter
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Stats Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Room Grid Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Particle Background */}
      <ParticleBackground 
        particleCount={20} 
        color="#9D4EDD" 
        speed={0.2} 
        opacity={0.1} 
      />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard
          label="Players Online"
          value={stats.totalPlayers.toLocaleString()}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          label="Total Games"
          value={stats.totalGames.toLocaleString()}
          trend={{ value: 8.3, isPositive: true }}
        />
        <StatCard
          label="Total Payouts"
          value={`$${stats.totalPayouts.toLocaleString()}`}
          trend={{ value: 23.7, isPositive: true }}
        />
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="flex flex-wrap items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setFilter('all')}
          >
            All Rooms
            <Badge variant="default" className="ml-2">
              {rooms.length}
            </Badge>
          </Button>
          <Button
            variant={filter === 'fast_drop' ? 'primary' : 'ghost'}
            onClick={() => setFilter('fast_drop')}
          >
            Fast Drop
            <Badge variant="primary" className="ml-2">
              {rooms.filter(r => r.type === 'fast_drop').length}
            </Badge>
          </Button>
          <Button
            variant={filter === 'time_drop' ? 'primary' : 'ghost'}
            onClick={() => setFilter('time_drop')}
          >
            Time Drop
            <Badge variant="info" className="ml-2">
              {rooms.filter(r => r.type === 'time_drop').length}
            </Badge>
          </Button>
        </div>

        {user && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Your Balance</p>
            <p className="text-2xl font-bold text-success">
              ${user.balance.toLocaleString()}
            </p>
          </div>
        )}
      </motion.div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No rooms available</p>
          <p className="text-gray-500 mt-2">Check back later for new games!</p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {filteredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TournamentCard
                room={room}
                onJoin={handleJoinRoom}
                isJoined={joinedRooms.has(room.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
      </div>
    </>
  )
}

export default RoomList