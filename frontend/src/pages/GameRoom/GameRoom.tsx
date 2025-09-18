import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Room, Participant, Winner } from '../../types'
import { roomAPI } from '@services/api'
import { socketService } from '@services/socket'
import { Card, Button, Badge, Spinner, PlayerCardSkeleton } from '@components/atoms'
import { Modal } from '@components/organisms'
import { 
  VRFWinnerSelection, 
  CountdownTimer, 
  Celebration,
  ParticleBackground 
} from '@components/animations'
import { PlayerTransitions } from '@components/animations/PlayerTransitions'
import { useAuth } from '@contexts/AuthContext'
import { useModal } from '@hooks/useModal'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user, updateBalance, rollbackBalance } = useAuth()
  const { openAuthModal } = useModal()
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const [winners, setWinners] = useState<Winner[]>([])
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [currentRoundWinners, setCurrentRoundWinners] = useState<string | null>(null) // Track which round's winners we've shown
  const [modalDataLocked, setModalDataLocked] = useState(false) // CRITICAL: Prevents modal data from being overwritten while modal is open

  // Separate modal data state - persists independently of room state
  const [modalWinnerData, setModalWinnerData] = useState<{
    winners: Winner[]
    prizePool: number
    platformFeeAmount?: number
    platformFeeRate?: number
    roundId: string | null
    timestamp?: number // Add timestamp to track when data was captured
    wasParticipant?: boolean // Track if user was a participant when modal opened
  } | null>(null)

  // Use ref to ensure modal data persists across re-renders
  const modalWinnerDataRef = useRef<{
    winners: Winner[]
    prizePool: number
    platformFeeAmount?: number
    platformFeeRate?: number
    roundId: string | null
    timestamp: number // Add timestamp to track when data was captured
    wasParticipant: boolean // Track if user was a participant when modal opened
  } | null>(null)

  // Additional backup ref that's never cleared by room state changes
  const backupModalDataRef = useRef<{
    winners: Winner[]
    prizePool: number
    platformFeeAmount?: number
    platformFeeRate?: number
    roundId: string | null
    timestamp: number // Add timestamp to track when data was captured
    wasParticipant: boolean // Track if user was a participant when modal opened
  } | null>(null)

  const [previousPrizePool, setPreviousPrizePool] = useState<number>(0)
  const [platformFeeData, setPlatformFeeData] = useState<{ amount: number, rate: number }>({ amount: 0, rate: 0.1 })
  const [recentPlayerAction, setRecentPlayerAction] = useState<{
    type: 'join' | 'leave'
    userId: string
    timestamp: number
  } | null>(null)
  
  const isParticipant = participants.some(p => p.userId === user?.id)
  
  // Refs to track current state values in socket handlers
  const participantsRef = useRef(participants)
  const countdownRef = useRef(countdown)
  const userRef = useRef(user)
  const animatingRef = useRef(animating)
  const winnersRef = useRef(winners)
  
  // Update refs when state changes
  useEffect(() => {
    participantsRef.current = participants
  }, [participants])
  
  useEffect(() => {
    countdownRef.current = countdown
    // Removed: console.log('[GameRoom] countdown state changed to:', countdown)
  }, [countdown])
  
  useEffect(() => {
    userRef.current = user
  }, [user])
  
  useEffect(() => {
    animatingRef.current = animating
    // Removed: console.log('[GameRoom] animating state changed to:', animating)
  }, [animating])
  
  useEffect(() => {
    winnersRef.current = winners
    // Removed: console.log('[GameRoom] winners state changed to:', winners)
  }, [winners])
  
  // Show modal only for NEW winners that haven't been shown yet
  // This effect only triggers when we get new winners, independent of room status changes
  useEffect(() => {
    // Don't process new winners if modal data is locked (modal is currently open)
    if (winners.length > 0 && !modalDataLocked) {
      // Create a unique identifier for this set of winners
      const winnersId = winners.map(w => w.userId).join('-')

      // Only show modal if these are new winners we haven't shown yet
      if (winnersId !== currentRoundWinners) {
        setCurrentRoundWinners(winnersId)

        // Use the actual prize pool from room state or calculate from participants
        // The prize pool is the sum of all entry fees, not derived from winner prizes
        const actualPrizePool = room?.prizePool ||
          (participantsRef.current.length * (room?.entryFee || 0))

        // Check if current user was a participant at the time of winning
        const currentUser = userRef.current
        const userWasParticipant = currentUser ? participantsRef.current.some(p => p.userId === currentUser.id) : false

        // Store winner data separately for modal display - this persists until user closes modal
        const winnerData = {
          winners: [...winners], // Create a copy to avoid reference issues
          prizePool: actualPrizePool || 0, // Use actual prize pool
          platformFeeAmount: platformFeeData.amount || (actualPrizePool * (room?.platformFeeRate || 0.1)), // Use stored or calculate
          platformFeeRate: platformFeeData.rate || room?.platformFeeRate || 0.1, // Use stored or default
          roundId: winnersId,
          timestamp: Date.now(), // Add timestamp to track when data was captured
          wasParticipant: userWasParticipant // Store participant status at time of modal opening
        }

        // Store in both state and ref for persistence
        setModalWinnerData(winnerData)
        modalWinnerDataRef.current = winnerData
        // Also store in backup ref for extra safety
        backupModalDataRef.current = winnerData

        // Lock the modal data to prevent any updates while modal is open
        setModalDataLocked(true)
        setShowWinnerModal(true)
        console.log('[GameRoom] Modal winner data set:', {
          winners: winners.length,
          prizePool: actualPrizePool,
          roundId: winnersId,
          wasParticipant: userWasParticipant,
          userId: currentUser?.id,
          participantsCount: participantsRef.current.length,
          entryFee: room?.entryFee
        })
      }
    }
  }, [winners, currentRoundWinners, modalDataLocked]) // CRITICAL: No room dependency to prevent modal data reset on status change

  // Removed auto-close functionality - modal now requires manual close

  // Reset winners state for new rounds (but preserve modal data until user dismisses)
  // CRITICAL: This effect must NOT interfere with modal data persistence
  useEffect(() => {
    // Only clear winners if modal data is NOT locked (i.e., modal is not open)
    if (room?.status === 'waiting' && winners.length > 0 && !modalDataLocked) {
      console.log('[GameRoom] Room reset to waiting, clearing winners array and round tracking')
      // Clear winners array for room state
      setWinners([])
      // Also clear the current round winners tracker when room resets for a new round
      // This allows the next round's winners to be properly displayed
      setCurrentRoundWinners(null)

      // EXTRA SAFEGUARD: Ensure modal data refs are NEVER affected by room status changes
      // Log both refs to confirm they're still intact
      if (modalWinnerDataRef.current || backupModalDataRef.current) {
        console.log('[GameRoom] Modal data refs confirmed intact after room reset:', {
          mainRef: !!modalWinnerDataRef.current,
          backupRef: !!backupModalDataRef.current,
          winnersCount: (modalWinnerDataRef.current || backupModalDataRef.current)?.winners.length || 0,
          prizePool: (modalWinnerDataRef.current || backupModalDataRef.current)?.prizePool || 0
        })
      }

      // CRITICAL: Never touch modalWinnerData, modalWinnerDataRef, currentRoundWinners, or showWinnerModal here
      // These must ONLY be cleared when user manually closes the modal
    }
  }, [room?.status, winners.length, modalDataLocked])

  // Debug effect to continuously monitor modal data persistence
  useEffect(() => {
    if (showWinnerModal) {
      const checkInterval = setInterval(() => {
        console.log('[GameRoom] MODAL DATA MONITOR:', {
          mainRef: !!modalWinnerDataRef.current,
          backupRef: !!backupModalDataRef.current,
          state: !!modalWinnerData,
          persistedData: !!(modalWinnerDataRef.current || backupModalDataRef.current || modalWinnerData),
          isModalOpen: showWinnerModal,
          roomStatus: room?.status,
          timestamp: new Date().toISOString()
        })
      }, 2000) // Check every 2 seconds

      return () => clearInterval(checkInterval)
    }
  }, [showWinnerModal])

  useEffect(() => {
    if (!roomId) return

    const fetchRoom = async () => {
      try {
        const data = await roomAPI.getRoom(roomId)
        setRoom(data)
        setParticipants(data.participants || [])
        socketService.joinRoom(roomId)
      } catch (error) {
        toast.error('Failed to load room')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()

    return () => {
      if (roomId) {
        socketService.leaveRoom(roomId)
      }
    }
  }, [roomId, navigate])

  // Socket listeners
  useEffect(() => {
    if (!roomId) return

    const handleRoomState = (data: any) => {
      // CRITICAL: Never clear modal data during room state updates
      // Modal data must persist until user manually closes it
      console.log('[GameRoom] Room state update received, preserving modal data if present')

      // Transform participants to have username field
      const transformedParticipants = (data.participants || []).map((p: any) => ({
        id: p.id || p.userId,
        userId: p.userId || p.id,
        username: p.username || 
                 (p.first_name && p.last_name ? `${p.first_name} ${p.last_name}`.trim() : null) ||
                 (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}`.trim() : null) ||
                 'Player',
        avatarUrl: p.avatarUrl || p.avatar_url || p.avatar || p.profileImage || p.profile_image,
        joinedAt: p.joinedAt || p.joined_at || new Date().toISOString(),
        status: (p.status || 'active') as 'active' | 'eliminated' | 'winner'
      }))
      
      // Transform the room data from socket just like from API
      if (data.room) {
        const entryFee = parseFloat(data.room.bet_amount) || 0
        const currentParticipants = data.room.currentPlayers || 
                                   parseInt(data.room.current_players) || 
                                   data.participants?.length || 0
        
        // Calculate prize pool - check multiple sources
        let prizePool = 0
        if (data.room.currentPrizePool !== undefined && data.room.currentPrizePool !== null) {
          prizePool = typeof data.room.currentPrizePool === 'number' ? 
            data.room.currentPrizePool : parseFloat(data.room.currentPrizePool)
        } else if (data.room.current_prize_pool) {
          prizePool = parseFloat(data.room.current_prize_pool)
        } else if (currentParticipants > 0 && entryFee > 0) {
          // Calculate based on participants if prize pool not provided
          prizePool = currentParticipants * entryFee
        }
        prizePool = isNaN(prizePool) ? 0 : prizePool
        
        // Update room state and set previous prize pool for animation
        setRoom(prev => {
          if (prev) {
            setPreviousPrizePool(prev.prizePool)
          }
          
          return {
            id: data.room.id,
            name: data.room.name,
            type: data.room.type.toLowerCase(),
            status: data.room.status === 'WAITING' ? 'waiting' :
                    data.room.status === 'ACTIVE' ? 'in_progress' : 'completed',
            entryFee,
            prizePool,
            currentParticipants,
            minParticipants: data.room.min_players || 3,
            maxParticipants: data.room.max_players || 10,
            winnersCount: data.room.number_of_winners || 1,
            participants: transformedParticipants,
            winners: [], // Room object doesn't store winners, they're in separate state
            startTime: undefined,
            endTime: undefined,
            createdAt: data.room.created_at,
            updatedAt: data.room.updated_at
          }
        })
      }
      setParticipants(transformedParticipants)
    }

    const handleUserJoined = (data: any) => {
      if (data.roomId === roomId) {
        // Check if user is already in participants (prevents duplicate adds)
        const currentParticipants = participantsRef.current
        const isAlreadyParticipant = currentParticipants.some(p => p.userId === data.userId)
        
        if (!isAlreadyParticipant) {
          toast.success(`${data.username} joined the room`)
          const newParticipants = [...currentParticipants, {
            id: data.userId,
            userId: data.userId,
            username: data.username,
            avatarUrl: data.avatarUrl || data.avatar_url,
            joinedAt: new Date().toISOString(),
            status: 'active' as const
          }]
          setParticipants(newParticipants)
          
          // Don't modify prize pool here - let room-state event handle it
          // The backend sends the authoritative prize pool value
          setRoom(prev => {
            if (prev) {
              // Check if minimum players reached and countdown not started
              const minPlayers = prev.minParticipants
              const currentCountdown = countdownRef.current
              if (newParticipants.length >= minPlayers && prev.status === 'waiting' && currentCountdown === null) {
                toast.success(`Minimum ${minPlayers} players reached! Game starting in 30 seconds...`)
                // Socket event will trigger countdown from backend
              }
              
              return {
                ...prev,
                currentParticipants: newParticipants.length
                // Don't modify prize pool - backend handles this via room-state event
              }
            }
            return null
          })
          
          setRecentPlayerAction({
            type: 'join',
            userId: data.userId,
            timestamp: Date.now()
          })
        }
      }
    }

    const handleUserLeft = (data: any) => {
      if (data.roomId === roomId) {
        // Check if user was actually in participants
        const currentParticipants = participantsRef.current
        const wasParticipant = currentParticipants.some(p => p.userId === data.userId)
        
        if (wasParticipant) {
          toast(`${data.username} left the room`)
          const newParticipants = currentParticipants.filter(p => p.userId !== data.userId)
          setParticipants(newParticipants)
          
          // Don't modify prize pool here - let room-state event handle it
          // The backend sends the authoritative prize pool value
          setRoom(prev => {
            if (prev) {
              // Check if we dropped below minimum during countdown
              const minPlayers = prev.minParticipants
              const currentCountdown = countdownRef.current
              if (newParticipants.length < minPlayers && currentCountdown !== null) {
                toast(`Players dropped below minimum ${minPlayers}. Countdown stopped.`, { icon: '⚠️' })
                setCountdown(null)
              }
              
              return {
                ...prev,
                currentParticipants: newParticipants.length
                // Don't modify prize pool - backend handles this via room-state event
              }
            }
            return null
          })
          
          setRecentPlayerAction({
            type: 'leave',
            userId: data.userId,
            timestamp: Date.now()
          })
        }
      }
    }

    const handleGameStarting = (data: any) => {
      // Removed: console.log('[GameRoom] game-starting event received:', data)
      if (data.roomId === roomId) {
        const countdownValue = data.countdown || 30
        // Removed: console.log('[GameRoom] Setting countdown to:', countdownValue)
        setCountdown(countdownValue)
        toast.success('Game is starting!')
      }
    }

    const handleCountdown = (data: any) => {
      // Removed: console.log('[GameRoom] countdown event received:', data)
      if (data.roomId === roomId) {
        // Removed: console.log('[GameRoom] Setting countdown to:', data.countdown)
        setCountdown(data.countdown)
      }
    }

    const handleAnimationStart = (data: any) => {
      // Removed: console.log('[GameRoom] animation-start event received:', data)
      if (data.roomId === roomId) {
        // Removed: console.log('[GameRoom] Setting animating to true and countdown to null')
        setAnimating(true)
        setCountdown(null)
      }
    }

    const handleGameCompleted = (data: any) => {
      // Removed: console.log('[GameRoom] game-completed event received:', data)
      // Removed: console.log('[GameRoom] Current roomId:', roomId)
      // Removed: console.log('[GameRoom] Event roomId:', data.roomId)
      // Removed: console.log('[GameRoom] RoomId match:', data.roomId === roomId)
      
      if (data.roomId === roomId) {
        // Removed: console.log('[GameRoom] Processing game-completed for matching room')
        // Removed: console.log('[GameRoom] Winners data:', data.winners)
        
        // Transform the winners data based on the format received
        let winnersArray: Winner[] = []
        
        if (data.isMultiWinner === false && data.winnerId) {
          // Single winner format
          // Removed: console.log('[GameRoom] Single winner format detected')
          winnersArray = [{
            userId: data.winnerId,
            username: data.winnerName || 'Unknown',
            prize: data.winnerAmount || 0,
            position: 1
          }]
        } else if (data.winners && Array.isArray(data.winners)) {
          // Multi-winner format
          // Removed: console.log('[GameRoom] Multi-winner format detected')
          winnersArray = data.winners.map((w: any) => ({
            userId: w.userId,
            username: w.name || w.username || 'Unknown',
            prize: w.prizeAmount || w.prize || 0,
            position: w.position || 1
          }))
        }
        
        // Removed: console.log('[GameRoom] Setting transformed winners array:', winnersArray)
        
        setWinners(winnersArray)

        // Store platform fee data from the event
        const platformFee = data.platformFeeAmount || data.commissionAmount || 0
        const totalPrize = data.totalPrize || (winnersArray.reduce((sum, w) => sum + w.prize, 0) / 0.9) // Estimate if not provided

        // Update modal data refs with platform fee information
        if (modalWinnerDataRef.current) {
          modalWinnerDataRef.current.platformFeeAmount = platformFee
        }
        if (backupModalDataRef.current) {
          backupModalDataRef.current.platformFeeAmount = platformFee
        }

        // Store in state for next modal opening
        setPlatformFeeData({
          amount: platformFee,
          rate: platformFee && totalPrize ? platformFee / totalPrize : 0.1
        })

        // Don't automatically show modal here - let the useEffect handle it
        // This ensures each client controls their own modal state
        
        // Animation can continue running in the background
        // setAnimating(false) // Don't stop animation here
        
        // Get current values
        const currentUser = userRef.current

        // Handle single winner format (backward compatibility)
        if (data.isMultiWinner === false && data.winnerId === currentUser?.id && currentUser) {
          // Removed: console.log(`[GameRoom] User won single winner prize: ${data.winnerAmount}`)
          setShowCelebration(true)
          
          // Optimistic balance update for immediate UI feedback
          const newBalance = currentUser.balance + data.winnerAmount
          // Removed: console.log(`[GameRoom] Optimistically updating balance: ${currentUser.balance} + ${data.winnerAmount} = ${newBalance}`)
          updateBalance(newBalance, 'optimistic')
        }
        
        // Handle multi-winner format
        if (data.winners && Array.isArray(data.winners)) {
          const userWinner = data.winners.find((w: Winner) => w.userId === currentUser?.id)
          if (userWinner && currentUser) {
            // Removed: console.log(`[GameRoom] User won prize: ${userWinner.prize}`)
            setShowCelebration(true)
            
            // Optimistic balance update for immediate UI feedback
            const newBalance = currentUser.balance + userWinner.prize
            // Removed: console.log(`[GameRoom] Optimistically updating balance: ${currentUser.balance} + ${userWinner.prize} = ${newBalance}`)
            updateBalance(newBalance, 'optimistic')
            
            // Socket event will provide authoritative balance update
          }
        }
      } else {
        // Removed: console.log('[GameRoom] game-completed event for different room, ignoring')
      }
    }

    const handleBalanceUpdated = (data: any) => {
      const currentUser = userRef.current
      if (data.userId === currentUser?.id) {
        // Removed: console.log(`[GameRoom] Received balance update for user ${data.userId}: ${data.newBalance}`)
        updateBalance(data.newBalance, 'socket')
      }
    }

    socketService.onRoomState(handleRoomState)
    socketService.onUserJoined(handleUserJoined)
    socketService.onUserLeft(handleUserLeft)
    socketService.onGameStarting(handleGameStarting)
    socketService.onCountdown(handleCountdown)
    socketService.onAnimationStart(handleAnimationStart)
    socketService.onGameCompleted(handleGameCompleted)
    socketService.onBalanceUpdated(handleBalanceUpdated)

    return () => {
      socketService.offRoomState(handleRoomState)
      socketService.offUserJoined(handleUserJoined)
      socketService.offUserLeft(handleUserLeft)
      socketService.offGameStarting(handleGameStarting)
      socketService.offCountdown(handleCountdown)
      socketService.offAnimationStart(handleAnimationStart)
      socketService.offGameCompleted(handleGameCompleted)
      socketService.offBalanceUpdated(handleBalanceUpdated)
    }
  }, [roomId, user?.id]) // Simplified dependencies with refs for stale closures

  const handleJoinRoom = async () => {
    if (!room) return
    
    if (!user) {
      // Open auth modal directly without URL navigation
      openAuthModal()
      return
    }

    if (user.balance < room.entryFee) {
      toast.error('Insufficient balance')
      return
    }

    // Store original balance for rollback if needed
    const originalBalance = user.balance
    const entryFee = room.entryFee
    
    // Removed: console.log(`[GameRoom] Joining room - current balance: ${originalBalance}, entry fee: ${entryFee}`)
    
    try {
      // Optimistic update: Immediately deduct entry fee from displayed balance
      const newBalance = originalBalance - entryFee
      // Removed: console.log(`[GameRoom] Deducting entry fee: ${originalBalance} - ${entryFee} = ${newBalance}`)
      updateBalance(newBalance, 'optimistic')
      
      await roomAPI.joinRoom(room.id)
      toast.success('Successfully joined!')
      
      // Balance is already updated optimistically
      // Socket events will provide authoritative balance if different
      
    } catch (error: any) {
      // Rollback optimistic update on failure
      rollbackBalance()
      toast.error(error.response?.data?.error || 'Failed to join')
    }
  }

  const handleLeaveRoom = async () => {
    if (!room || !user) return

    // Store original balance for rollback if needed
    const originalBalance = user.balance
    const refundAmount = room.entryFee
    
    try {
      // Optimistic update: Immediately add refund to displayed balance
      // Removed: console.log(`[GameRoom] Refunding entry fee: ${originalBalance} + ${refundAmount} = ${originalBalance + refundAmount}`)
      updateBalance(originalBalance + refundAmount, 'optimistic')
      
      await roomAPI.leaveRoom(room.id)
      toast.success('Left room successfully - entry fee refunded!')
      
      // Balance is already updated optimistically
      // Socket events will provide authoritative balance if different
      
      navigate('/')
    } catch (error: any) {
      // Rollback optimistic update on failure
      // Removed: console.log('[GameRoom] Leave room failed, rolling back balance')
      rollbackBalance()
      toast.error(error.response?.data?.error || 'Failed to leave')
    }
    setShowLeaveModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="xl" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <p className="text-gray-400">Room not found</p>
        </Card>
      </div>
    )
  }

  // CRITICAL: Always prefer refs over state to ensure data persists through room resets
  // Priority order: modalWinnerDataRef > backupModalDataRef > modalWinnerData
  // This ensures modal data is NEVER lost during room status changes
  const persistedModalData = modalWinnerDataRef.current || backupModalDataRef.current || modalWinnerData

  // Find user winner from persisted data ONLY - never from current winners state
  // This prevents the modal from losing winner info when room resets
  const userWinner = persistedModalData?.winners?.find(w => w.userId === user?.id)

  return (
    <>
      {/* Particle Background for active games */}
      {room.status === 'in_progress' && (
        <ParticleBackground 
          particleCount={30} 
          color="#9D4EDD" 
          speed={0.3} 
          opacity={0.2} 
        />
      )}

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Room Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8 border border-primary/20 shadow-xl bg-secondary-bg">
            {/* Header Section with Title and Leave Room Button */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary/10">
              <h1 className="text-2xl font-bold text-text-primary">{room.name}</h1>
              
              {isParticipant && room.status === 'waiting' && (
                <Button 
                  variant="danger" 
                  onClick={() => setShowLeaveModal(true)}
                  className="text-sm"
                >
                  Leave Room
                </Button>
              )}
              
              {!isParticipant && room.status === 'waiting' && (
                <Button 
                  variant="primary" 
                  onClick={handleJoinRoom}
                  className="text-sm"
                >
                  Join Room (${room.entryFee})
                </Button>
              )}
            </div>

            {/* Status Pills - Smaller and More Subtle */}
            <div className="flex items-center gap-2 mb-6">
              <Badge 
                variant="primary" 
                className="text-xs py-1 px-2 opacity-90"
              >
                {room.type.replace('_', ' ')}
              </Badge>
              <Badge 
                variant={room.status === 'waiting' ? 'success' : 'warning'}
                className="text-xs py-1 px-2 opacity-90"
              >
                {room.status}
              </Badge>
              {room.status === 'waiting' && (
                <Badge 
                  variant={participants.length >= room.minParticipants ? 'success' : 'secondary'}
                  className="text-xs py-1 px-2 opacity-90"
                >
                  {participants.length >= room.minParticipants ? '✅ Ready' : `⏳ Need ${room.minParticipants - participants.length} more`}
                </Badge>
              )}
            </div>

            {/* Main Content - 2x2 Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Entry Fee - Top Left */}
              <div className="bg-primary/10 backdrop-blur-sm rounded-lg p-4 border border-primary/15">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Entry Fee</p>
                <p className="text-2xl font-bold text-text-primary">
                  ${(room.entryFee || 0).toLocaleString()}
                </p>
              </div>
              
              {/* Prize Pool - Top Right (More Prominent) */}
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/20 rounded-lg p-4 border border-purple-500/25 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prize Pool</p>
                <p className="text-3xl font-bold text-text-primary">
                  ${(room.prizePool || 0).toLocaleString()}
                </p>
                {room.status === 'waiting' && previousPrizePool < room.prizePool && (
                  <p className="text-xs text-success mt-1 font-medium">
                    +${(room.prizePool - previousPrizePool).toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Players - Bottom Left */}
              <div className="rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Players</p>
                <p className="text-2xl font-bold text-text-primary">
                  {room.currentParticipants}/{room.maxParticipants}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Min: {room.minParticipants}
                </p>
              </div>
              
              {/* Winners - Bottom Right */}
              <div className="rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Winners</p>
                <p className="text-2xl font-bold text-text-primary">
                  {room.winnersCount || 1}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {room.winnersCount > 1 ? 'Multiple winners' : 'Single winner'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Game Status with Countdown Timer */}
        {countdown !== null && (
          <Card className="mb-8">
            <div className="relative">
              {/* Background effects matching VRF animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-highlight-1/10 rounded-xl blur-3xl" />
              
              {/* Title */}
              <motion.div
                className="text-center mb-6 relative"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-3xl font-bold gradient-text mb-2">
                  Game Starting Soon!
                </h2>
                <p className="text-gray-400">
                  Get ready for the draw
                </p>
              </motion.div>
              
              {/* Countdown Timer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center relative"
              >
                <CountdownTimer 
                  seconds={countdown} 
                  size="xl"
                  onComplete={() => setCountdown(null)}
                />
              </motion.div>
            </div>
          </Card>
        )}

        {/* VRF Winner Selection Animation */}
        {animating && (
          <Card className="mb-8">
            <VRFWinnerSelection
              participants={participants}
              winners={winners}
              isAnimating={animating}
              duration={30}
              onAnimationComplete={() => {
                setAnimating(false)
                // Notify backend that animation is complete to trigger winner processing
                socketService.emit('animation-complete', roomId)
                // Modal will be shown by useEffect when animating becomes false and winners exist
              }}
            />
          </Card>
        )}
        {/* Participants with Player Transitions */}
        <Card>
          <h2 className="text-xl font-bold mb-4">
            Participants ({participants.length})
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <PlayerCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <PlayerTransitions
              participants={participants}
              minParticipants={room.minParticipants}
              maxParticipants={room.maxParticipants}
              recentAction={recentPlayerAction}
              onAnimationComplete={() => {
                // Clear recent action after animation
                setTimeout(() => setRecentPlayerAction(null), 2000)
              }}
            />
          )}
        </Card>

        {/* Leave Room Modal */}
        <Modal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Leave Room?"
          size="sm"
        >
          <p className="text-gray-300 mb-6">
            Are you sure you want to leave? You will receive a refund of your entry fee.
          </p>
          <div className="flex gap-4 justify-end">
            <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLeaveRoom}>
              Leave Room
            </Button>
          </div>
        </Modal>

        {/* Winner Celebration */}
        <Celebration
          trigger={showCelebration}
          type="confetti"
          message="Congratulations!"
          prize={userWinner?.prize}
          duration={5000}
        />

        {/* Winner Announcement Modal */}
        {/* CRITICAL: Always use ref as primary source to ensure persistence across re-renders */}
        {(() => {
          // ALWAYS prioritize refs over state to ensure data persists during room status changes
          // Check all three sources for winner data to ensure maximum persistence
          const activeModalData = modalWinnerDataRef.current || backupModalDataRef.current || modalWinnerData

          // Only show modal if we have winner data and the modal should be visible
          if (!showWinnerModal) {
            return null
          }

          // If modal should be shown but data is missing, try to recover from backup sources
          if (!activeModalData) {
            console.warn('[GameRoom] Modal is open but no winner data found in any source!')
            // Don't return null here - let the modal render with a fallback message
          }

          // Debug logging to track data persistence
          console.log('[GameRoom] Rendering modal with data:', {
            hasActiveData: !!activeModalData,
            winnersCount: activeModalData?.winners?.length || 0,
            prizePool: activeModalData?.prizePool || 0,
            roundId: activeModalData?.roundId,
            timestamp: activeModalData?.timestamp,
            wasParticipant: activeModalData?.wasParticipant,
            userId: user?.id,
            dataSource: modalWinnerDataRef.current ? 'mainRef' :
                       backupModalDataRef.current ? 'backupRef' :
                       modalWinnerData ? 'state' : 'none'
          })

          // Trigger celebration when modal opens if user won
          const userWon = user && activeModalData?.winners?.some(w => w.userId === user.id)
          if (userWon && !showCelebration) {
            setShowCelebration(true)
            setTimeout(() => setShowCelebration(false), 5000)
          }

          return (
            <Modal
              isOpen={showWinnerModal}
              onClose={() => {
                console.log('[GameRoom] User manually closing winner modal, clearing modal display data')
                setShowWinnerModal(false)
                setShowCelebration(false) // Stop celebration when closing modal

                // Unlock modal data to allow new rounds
                setModalDataLocked(false)

                // Clear modal display data ONLY on user dismissal
                setModalWinnerData(null)
                modalWinnerDataRef.current = null
                backupModalDataRef.current = null

                // IMPORTANT: Do NOT clear currentRoundWinners here
                // Keep it to prevent the modal from re-opening with the same winners
                // It will be naturally replaced when new winners arrive
                // setCurrentRoundWinners(null) // REMOVED - this was causing the modal to reopen

                console.log('[GameRoom] Modal closed, keeping currentRoundWinners to prevent reopening')
              }}
          title="Round Result"
          size="lg"
        >
          <div className="space-y-6">
            {/* Handle case where data is missing */}
            {!activeModalData ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg mb-4">Loading game results...</p>
                <p className="text-sm text-gray-500">If this persists, please refresh the page.</p>
              </div>
            ) : (
              <>
            {/* YOUR RESULT - MOST PROMINENT */}
            {/* Use persisted wasParticipant flag instead of current participants array */}
            {user && activeModalData && activeModalData.wasParticipant && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className={clsx(
                  "rounded-xl p-6 text-center",
                  activeModalData.winners && activeModalData.winners.some(w => w.userId === user.id)
                    ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500"
                    : "bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500"
                )}
              >
                {activeModalData.winners && activeModalData.winners.some(w => w.userId === user.id) ? (
                  <>
                    <div className="flex justify-center mb-3">
                      <div className="text-6xl animate-bounce">
                        🏆
                      </div>
                    </div>
                    <h2 className="text-4xl font-bold text-green-400 mb-3">
                      YOU WON!
                    </h2>
                    <p className="text-3xl font-bold text-white mb-2">
                      +${activeModalData.winners.find(w => w.userId === user.id)?.prize || 0}
                    </p>
                    <p className="text-sm text-gray-300">
                      Added to your balance
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-3">
                      <div className="text-6xl">
                        😔
                      </div>
                    </div>
                    <h2 className="text-4xl font-bold text-red-400 mb-3">
                      YOU LOST
                    </h2>
                    <p className="text-lg text-gray-300">
                      Better luck next time!
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* Game Summary */}
            <div className="bg-secondary-bg/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Prize Pool</span>
                <span className="text-xl font-bold text-text-primary">
                  ${activeModalData?.prizePool || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  Platform Fee
                  <span className="text-xs text-gray-500 ml-1">
                    ({activeModalData?.platformFeeAmount && activeModalData?.prizePool
                      ? Math.round((activeModalData.platformFeeAmount / activeModalData.prizePool) * 100)
                      : 10}%)
                  </span>
                </span>
                <span className="text-lg text-yellow-400">
                  -${(activeModalData?.platformFeeAmount || ((activeModalData?.prizePool || 0) * 0.1)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <span className="text-sm text-gray-400 font-semibold">Total Distributed</span>
                <span className="text-xl font-bold text-green-400">
                  ${((activeModalData?.prizePool || 0) - (activeModalData?.platformFeeAmount || ((activeModalData?.prizePool || 0) * 0.1))).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="text-sm text-gray-400">Total Winners</span>
                <span className="text-lg font-semibold text-text-primary">
                  {activeModalData?.winners?.length || 0} player{activeModalData?.winners?.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Platform fee explanation */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center italic">
                  * A {activeModalData?.platformFeeAmount && activeModalData?.prizePool
                    ? Math.round((activeModalData.platformFeeAmount / activeModalData.prizePool) * 100)
                    : 10}% platform fee is deducted from the prize pool to maintain the service
                </p>
              </div>
            </div>

            {/* Winners List - Simplified */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400 uppercase tracking-wider">All Winners</p>
              {activeModalData?.winners && activeModalData.winners.length > 0 ? (
                activeModalData.winners.map((winner, index) => (
                  <div
                    key={winner.userId}
                    className={clsx(
                      "flex justify-between items-center p-3 rounded-lg",
                      winner.userId === user?.id
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-secondary-bg border border-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">#{index + 1}</span>
                      <span className="font-medium text-text-primary">
                        {winner.username}
                        {winner.userId === user?.id && (
                          <span className="text-green-400 ml-2">(You)</span>
                        )}
                      </span>
                    </div>
                    <span className="font-bold text-green-400">
                      +${winner.prize}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4">No winners data</p>
              )}
            </div>

            {/* Close button instruction */}
            <div className="text-center text-sm text-gray-500">
              Click the close button or press ESC to close this window
            </div>
              </>
            )}
          </div>
        </Modal>
          )
        })()}
      </div>
    </>
  )
}

export default GameRoom