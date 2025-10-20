import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room, RoomStatusUpdateData, GlobalGameCompletedData } from '../../types'
import { roomAPI } from '@services/api'
import { socketService } from '@services/socket'
import { TournamentCard, RoomJoinConfirmationModal, NotificationCenter } from '@components/organisms'
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
  // IMPORTANT: This should ONLY be called when we have fresh participant data from the API
  const updateJoinedRooms = useCallback((roomsData: Room[]) => {
    if (user) {
      const userJoinedRooms = new Set<string>()
      roomsData.forEach(room => {
        // Check if current user is in the participants list
        // CRITICAL FIX: Only check userId to prevent username collision bugs
        // Safety check: ensure participants array exists and is valid
        const isUserParticipant = Array.isArray(room.participants) && room.participants.length > 0 &&
          room.participants.some(participant =>
            participant && participant.userId && participant.userId === user.id
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

    // Polling fallback - reduced frequency since WebSocket handles real-time updates
    const interval = setInterval(() => {
      fetchRooms()
    }, 60000) // Refresh every 60 seconds (fallback only)

    return () => clearInterval(interval)
  }, [user, updateJoinedRooms]) // Re-run when user changes

  // Helper function to map backend status values to frontend status values
  const mapBackendStatus = (backendStatus: string): 'waiting' | 'in_progress' | 'completed' => {
    switch (backendStatus) {
      case 'WAITING': return 'waiting'
      case 'ACTIVE': return 'in_progress'
      case 'COMPLETED': return 'completed'
      case 'RESETTING': return 'in_progress' // Treat RESETTING as in_progress during transition
      default: return 'waiting'
    }
  }

  // Socket listeners
  useEffect(() => {
    const handleRoomStatusUpdate = (data: RoomStatusUpdateData) => {
      // Map backend status to frontend status
      const mappedStatus = mapBackendStatus(data.status as string)

      setRooms(prev => prev.map(room =>
        room.id === data.roomId
          ? {
              ...room,
              status: mappedStatus,
              ...(data.participantCount !== undefined && { currentParticipants: data.participantCount })
            }
          : room
      ))

      // Trigger reset animation if room is resetting for a new round
      if (data.resetForNewRound) {
        triggerRoomActivity(data.roomId, 'reset')
      }
    }

    // Handle user joined event - informational only
    // Participant count is updated via room-status-update event (authoritative from database)
    // Animations are triggered by TournamentCard detecting count changes from room-status-update
    const handleUserJoined = (data: { userId: string; username?: string; roomId: string }) => {
      // NOTE: Do NOT modify participant count here to avoid double increment
      // The room-status-update event provides the authoritative count from the database
      // This event is kept for potential future use (notifications, user-specific actions, etc.)
    }

    // Handle user left event - informational only
    // Participant count is updated via room-status-update event (authoritative from database)
    // Animations are triggered by TournamentCard detecting count changes from room-status-update
    const handleUserLeft = (data: { userId: string; username?: string; roomId: string }) => {
      // Defensive programming: ensure all required fields exist
      if (!data.userId || !data.roomId) {
        return;
      }

      // If current user left - remove from joined rooms immediately for UI state
      if (user && data.userId === user.id) {
        setJoinedRooms(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.roomId)
          return newSet
        })
      }

      // NOTE: Do NOT modify participant count here to avoid double decrement
      // The room-status-update event provides the authoritative count from the database
      // This event is kept for potential future use (notifications, user-specific actions, etc.)
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

      // FIX: Don't differentiate between winners/losers - use unified approach
      // Update room status locally to 'completed' immediately for all users
      // The room-status-update event will handle the transition to 'waiting' after reset (10s later)
      setRooms(prev => prev.map(room =>
        room.id === data.roomId
          ? { ...room, status: 'completed', currentParticipants: 0 }
          : room
      ))

      // If current user was in this room, clear them from joinedRooms
      // The participant data will be refreshed via room-status-update when room resets
      if (user && joinedRooms.has(data.roomId)) {
        setJoinedRooms(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.roomId)
          return newSet
        })
      }
    }

    socketService.onRoomStatusUpdate(handleRoomStatusUpdate)
    socketService.onUserJoined(handleUserJoined)
    socketService.onUserLeft(handleUserLeft)
    socketService.onGlobalGameCompleted(handleGlobalGameCompleted)

    return () => {
      socketService.offRoomStatusUpdate(handleRoomStatusUpdate)
      socketService.offUserJoined(handleUserJoined)
      socketService.offUserLeft(handleUserLeft)
      socketService.offGlobalGameCompleted(handleGlobalGameCompleted)
    }
  }, [user, triggerRoomActivity]) // Remove updateJoinedRooms to prevent re-registration loops

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
          <div className="flex items-center gap-4">
            {/* Balance Display */}
            <div className="text-right">
              <p className="text-sm text-gray-400">Your Balance</p>
              <p className="text-2xl font-bold text-success">
                ${user.balance.toLocaleString()}
              </p>
            </div>
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

      {/* Game History / Notification Center */}
      <NotificationCenter />
    </>
  )
}

export default RoomList