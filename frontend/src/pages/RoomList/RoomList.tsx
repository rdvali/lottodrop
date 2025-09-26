import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room, RoomStatusUpdateData, GlobalGameCompletedData } from '../../types'
import { roomAPI } from '@services/api'
import { socketService } from '@services/socket'
import { TournamentCard, RoomJoinConfirmationModal } from '@components/organisms'
import { Button, Badge, CardSkeleton } from '@components/atoms'
import { ParticleBackground } from '@components/animations'
import { useAuth } from '@contexts/AuthContext'
import { useModal } from '@hooks/useModal'
import { useRoomActivityManager } from '@hooks/useRoomActivity'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const RoomList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openAuthModal } = useModal()
  const { roomActivities, triggerRoomActivity } = useRoomActivityManager()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'fast_drop' | 'time_drop'>('all')
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set())
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Helper function to update joined rooms based on room data
  const updateJoinedRooms = useCallback((roomsData: Room[]) => {
    if (user) {
      const userJoinedRooms = new Set<string>()
      roomsData.forEach(room => {
        // Check if current user is in the participants list
        const isUserParticipant = room.participants?.some(
          participant => participant.userId === user.id || participant.username === user.username
        )
        if (isUserParticipant) {
          userJoinedRooms.add(room.id)
        }
      })
      setJoinedRooms(userJoinedRooms)
    }
  }, [user])

  // Fetch rooms and determine which ones user has joined
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await roomAPI.getRooms()
        setRooms(data)
        updateJoinedRooms(data) // Use helper function
      } catch {
        toast.error('Failed to load rooms')
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()

    // Increase interval to reduce API calls - 30 seconds for better rate limiting
    const interval = setInterval(() => {
      fetchRooms()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [user]) // Re-run when user changes

  // Socket listeners
  useEffect(() => {
    const handleRoomStatusUpdate = (data: RoomStatusUpdateData) => {
      setRooms(prev => {
        const prevRoom = prev.find(r => r.id === data.roomId)
        if (prevRoom && prevRoom.currentParticipants !== data.participantCount) {
          // Trigger animation based on participant change
          if (data.participantCount > prevRoom.currentParticipants) {
            triggerRoomActivity(data.roomId, 'join')
          } else if (data.participantCount < prevRoom.currentParticipants) {
            triggerRoomActivity(data.roomId, 'leave')
          }
        }

        const updatedRooms = prev.map(room =>
          room.id === data.roomId
            ? { ...room, status: data.status, currentParticipants: data.participantCount }
            : room
        )

        // CRITICAL FIX: Update joinedRooms state after room data changes
        // This prevents the bug where buttons show incorrect state temporarily
        updateJoinedRooms(updatedRooms)

        return updatedRooms
      })
    }

    const handleGlobalGameCompleted = (data: GlobalGameCompletedData) => {
      // Show winner notification for all users (this is fine)
      if (data.winners && data.winners.length > 0) {
        const winner = data.winners[0]
        if (winner) {
          toast.success(
            `🎉 ${winner.username || 'Player'} won $${winner.prize || winner.prizeAmount || 0} in ${data.roomName}!`,
            { duration: 8000 }
          )
        }
      }

      // CRITICAL FIX: Only refresh room data if the current user was a participant
      // This prevents button flickering for non-participants
      const userWasParticipant = user && data.winners?.some(winner =>
        winner.userId === user.id || winner.username === user.username
      )

      if (userWasParticipant) {
        // Only participants need fresh room data after game completion
        roomAPI.getRooms().then(roomsData => {
          setRooms(roomsData)
          updateJoinedRooms(roomsData)
        }).catch(() => {})
      } else {
        // For non-participants, only update the specific room status without refetching
        setRooms(prev => prev.map(room =>
          room.id === data.roomId
            ? { ...room, status: 'completed' as const, currentParticipants: 0 }
            : room
        ))
      }
    }

    socketService.onRoomStatusUpdate(handleRoomStatusUpdate)
    socketService.onGlobalGameCompleted(handleGlobalGameCompleted)

    return () => {
      socketService.offRoomStatusUpdate(handleRoomStatusUpdate)
      socketService.offGlobalGameCompleted(handleGlobalGameCompleted)
    }
  }, [user, updateJoinedRooms, triggerRoomActivity]) // Add all dependencies

  const handleJoinRoom = (roomId: string) => {
    if (!user) {
      // Open auth modal directly without URL navigation
      openAuthModal()
      return
    }

    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    // Open confirmation modal instead of joining directly
    setSelectedRoom(room)
    setConfirmModalOpen(true)
  }

  const handleViewRoom = (roomId: string) => {
    // Navigate directly to room without confirmation for joined rooms
    navigate(`/room/${roomId}`)
  }

  const handleConfirmJoin = async () => {
    if (!selectedRoom || !user) return

    // Optimistic update - immediately show joined state to prevent flickering
    setJoinedRooms(prev => new Set(prev).add(selectedRoom.id))

    setIsJoining(true)
    try {
      await roomAPI.joinRoom(selectedRoom.id)
      toast.success('Successfully joined room!')
      setConfirmModalOpen(false)
      navigate(`/room/${selectedRoom.id}`)
    } catch (error: unknown) {
      // Rollback optimistic update on error
      setJoinedRooms(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedRoom.id)
        return newSet
      })

      const errorMessage = error instanceof Error ? error.message :
        (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to join room'
      toast.error(errorMessage)
    } finally {
      setIsJoining(false)
    }
  }

  const handleCancelJoin = () => {
    setConfirmModalOpen(false)
    setSelectedRoom(null)
    setIsJoining(false)
  }

  const filteredRooms = rooms.filter(room => {
    if (filter === 'all') return true
    return room.type === filter
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
      {/* Filters */}
      <motion.div
        className="flex flex-wrap items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
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
          transition={{ duration: 0.5, delay: 0.2 }}
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
                onView={handleViewRoom}
                isJoined={joinedRooms.has(room.id)}
                activityType={roomActivities.get(room.id) || null}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
      </div>

      {/* Room Join Confirmation Modal */}
      <RoomJoinConfirmationModal
        room={selectedRoom}
        userBalance={user?.balance || 0}
        isOpen={confirmModalOpen}
        onConfirm={handleConfirmJoin}
        onCancel={handleCancelJoin}
        isLoading={isJoining}
      />
    </>
  )
}

export default RoomList