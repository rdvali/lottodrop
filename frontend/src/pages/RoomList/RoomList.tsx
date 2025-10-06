import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room, RoomStatusUpdateData, GlobalGameCompletedData } from '../../types'
import { roomAPI } from '@services/api'
import { socketService } from '@services/socket'
import { TournamentCard, RoomJoinConfirmationModal, NotificationCenter } from '@components/organisms'
import { Button, Badge, CardSkeleton } from '@components/atoms'
import { ParticleBackground } from '@components/animations'
import { useAuth } from '@contexts/AuthContext'
import { useNotifications } from '@contexts/NotificationContext'
import { useModal } from '@hooks/useModal'
import { useRoomActivityManager } from '@hooks/useRoomActivity'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const RoomList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openAuthModal } = useModal()
  const { state: notificationState, toggleNotificationCenter } = useNotifications()
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

        // Only update the status and participant count, preserve all other data including participants array
        return prev.map(room =>
          room.id === data.roomId
            ? { ...room, status: data.status, currentParticipants: data.participantCount }
            : room
        )
      })

      // IMPORTANT: Do NOT call updateJoinedRooms here!
      // The RoomStatusUpdateData doesn't contain participant list data,
      // so we can't determine if the current user has joined.
      // The joinedRooms state should only be updated when we have full room data
      // with participants array (from API calls or initial load)
    }

    // Handle user joined event
    const handleUserJoined = (data: { userId: string; username?: string; roomId: string }) => {
      // Defensive programming: ensure all required fields exist
      if (!data.userId || !data.roomId) {
        console.warn('🚨 Invalid USER_JOINED event - missing required fields:', data);
        return;
      }

      // CRITICAL: Only update joined state for the CURRENT user
      if (user && data.userId === user.id) {
        // Current user joined - add to joined rooms immediately
        setJoinedRooms(prev => new Set(prev).add(data.roomId))
      }
      // If it's another user joining, we do NOTHING to joinedRooms state

      // Update participant count for the specific room (for ALL users to see)
      setRooms(prev => prev.map(room =>
        room.id === data.roomId
          ? { ...room, currentParticipants: Math.min((room.currentParticipants || 0) + 1, room.maxParticipants) }
          : room
      ))

      // Trigger join animation for visual feedback
      triggerRoomActivity(data.roomId, 'join')
    }

    // Handle user left event
    const handleUserLeft = (data: { userId: string; username?: string; roomId: string }) => {
      // Defensive programming: ensure all required fields exist
      if (!data.userId || !data.roomId) {
        console.warn('🚨 Invalid USER_LEFT event - missing required fields:', data);
        return;
      }

      // SECURITY FIX: Only check userId to prevent username collision bugs
      // Username check removed to prevent state pollution when users have similar usernames
      if (user && data.userId === user.id) {
        // Current user left - remove from joined rooms immediately
        setJoinedRooms(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.roomId)
          return newSet
        })
      }

      // Update participant count for the specific room
      setRooms(prev => prev.map(room =>
        room.id === data.roomId
          ? { ...room, currentParticipants: Math.max((room.currentParticipants || 0) - 1, 0) }
          : room
      ))

      // Trigger leave animation
      triggerRoomActivity(data.roomId, 'leave')
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
      // SECURITY FIX: Only check userId to prevent username collision bugs
      const userWasParticipant = user && data.winners?.some(winner =>
        winner.userId === user.id
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
            {/* Game History Button */}
            <button
              onClick={() => toggleNotificationCenter()}
              className="relative p-2 rounded-lg bg-secondary-bg hover:bg-primary/10 transition-colors"
              data-notification-button
              aria-label="Game History"
              title="View Game History"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-300"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M12 7v5l4 2"/>
              </svg>
              {notificationState.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationState.unreadCount > 9 ? '9+' : notificationState.unreadCount}
                </span>
              )}
            </button>

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