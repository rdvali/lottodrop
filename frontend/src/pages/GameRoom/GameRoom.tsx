import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Room, Participant, Winner } from '../../types'
import { roomAPI } from '@services/api'
import { socketService } from '@services/socket'
import { audioService } from '@services/audio/AudioService'
import { Card, Button, Badge, Spinner, PlayerCardSkeleton, JoinRoomButton } from '@components/atoms'
import { Modal } from '@components/organisms'
import {
  WinnerReveal,
  CountdownTimer,
  Celebration,
  ParticleBackground
} from '@components/animations'
import { PlayerTransitions } from '@components/animations/PlayerTransitions'
import { useAuth } from '@contexts/AuthContext'
import { useNotifications } from '@contexts/NotificationContext'
import { useModal } from '@hooks/useModal'
import { useIsMobile } from '@hooks/useResponsive'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user, updateBalance, rollbackBalance } = useAuth()
  const { openAuthModal } = useModal()
  const { showToast } = useNotifications()
  const isMobile = useIsMobile()
  
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
  const [showFullScreenCountdown, setShowFullScreenCountdown] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false) // Track if user has interacted with countdown

  // Separate modal data state - persists independently of room state
  const [modalWinnerData, setModalWinnerData] = useState<{
    winners: Winner[]
    prizePool: number
    platformFeeAmount?: number
    platformFeeRate?: number
    roundId: string | null
    timestamp?: number // Add timestamp to track when data was captured
    wasParticipant?: boolean // Track if user was a participant when modal opened
    roomStatus?: 'waiting' | 'in_progress' | 'completed' // Track room status for Join Room button
    entryFee?: number // Store entry fee for Join Room button
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
    roomStatus?: 'waiting' | 'in_progress' | 'completed' // Track room status for Join Room button
    entryFee?: number // Store entry fee for Join Room button
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
    roomStatus?: 'waiting' | 'in_progress' | 'completed' // Track room status for Join Room button
    entryFee?: number // Store entry fee for Join Room button
  } | null>(null)

  const [previousPrizePool, setPreviousPrizePool] = useState<number>(0)
  const [platformFeeData, setPlatformFeeData] = useState<{ amount: number, rate: number }>({ amount: 0, rate: 0.1 })
  const [vrfData, setVrfData] = useState<{ seed?: string, proof?: string }>({})
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
    // Trigger full-screen countdown on mobile when ≤ 5 seconds
    // Only auto-trigger if user hasn't manually closed it
    if (countdown !== null && countdown <= 5 && isMobile && !showFullScreenCountdown && !hasUserInteracted) {
      setShowFullScreenCountdown(true)
    }

    // REMOVED: Countdown audio now scheduled precisely using Web Audio API in handleGameStarting
    // This prevents React state update delays (50-200ms) that caused late audio playback

    // Reset interaction state when countdown resets
    if (countdown === null) {
      setShowFullScreenCountdown(false)
      setHasUserInteracted(false)
    }
  }, [countdown, isMobile, showFullScreenCountdown, hasUserInteracted])
  
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    animatingRef.current = animating
  }, [animating])

  useEffect(() => {
    winnersRef.current = winners
  }, [winners])
  
  // Show modal only for NEW winners that haven't been shown yet
  // This effect only triggers when we get new winners, independent of room status changes
  useEffect(() => {
    // Don't process new winners if modal data is locked (modal is currently open)
    // WinnerReveal animation disabled, so no need to check !animating
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
          wasParticipant: userWasParticipant, // Store participant status at time of modal opening
          roomStatus: room?.status || 'waiting', // Store current room status
          entryFee: room?.entryFee || 0 // Store entry fee for Join Room button
        }

        // Store in both state and ref for persistence
        setModalWinnerData(winnerData)
        modalWinnerDataRef.current = winnerData
        // Also store in backup ref for extra safety
        backupModalDataRef.current = winnerData

        // Lock the modal data to prevent any updates while modal is open
        setModalDataLocked(true)
        setShowWinnerModal(true)
      }
    }
  }, [winners, currentRoundWinners, modalDataLocked, animating]) // CRITICAL: No room dependency to prevent modal data reset on status change

  // Removed auto-close functionality - modal now requires manual close

  // Reset winners state for new rounds (but preserve modal data until user dismisses)
  // CRITICAL: This effect must NOT interfere with modal data persistence
  useEffect(() => {
    // Only clear winners if modal data is NOT locked (i.e., modal is not open)
    if (room?.status === 'waiting' && winners.length > 0 && !modalDataLocked) {
      // Clear winners array for room state
      setWinners([])
      // Also clear the current round winners tracker when room resets for a new round
      // This allows the next round's winners to be properly displayed
      setCurrentRoundWinners(null)

      // CRITICAL: Never touch modalWinnerData, modalWinnerDataRef, currentRoundWinners, or showWinnerModal here
      // These must ONLY be cleared when user manually closes the modal
    }
  }, [room?.status, winners.length, modalDataLocked])


  useEffect(() => {
    if (!roomId) return

    const fetchRoom = async () => {
      try {
        const data = await roomAPI.getRoom(roomId)
        setRoom(data)
        setParticipants(data.participants || [])
        socketService.joinRoom(roomId)
      } catch {
        showToast({
          type: 'error',
          subtype: 'system_alert',
          title: 'Failed to load room',
          message: 'Unable to load room details',
          priority: 2
        })
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

  // Update modal data with new room status when it changes
  useEffect(() => {
    if (showWinnerModal && room) {
      // Update room status in modal data refs when room status changes
      if (modalWinnerDataRef.current) {
        modalWinnerDataRef.current.roomStatus = room.status
      }
      if (backupModalDataRef.current) {
        backupModalDataRef.current.roomStatus = room.status
      }
      // Also update state to trigger re-render
      setModalWinnerData(prev => prev ? { ...prev, roomStatus: room.status } : prev)
    }
  }, [room?.status, showWinnerModal])

  // Socket listeners
  useEffect(() => {
    if (!roomId) return

    const handleRoomState = (data: any) => {
      // CRITICAL: Never clear modal data during room state updates
      // Modal data must persist until user manually closes it

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
                    data.room.status === 'ACTIVE' ? 'in_progress' :
                    data.room.status === 'RESETTING' ? 'in_progress' : 'completed',
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
          showToast({
            type: 'info',
            subtype: 'system_alert',
            title: 'Player Joined',
            message: `${data.username} joined the room`,
            priority: 3
          })
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
                showToast({
                  type: 'success',
                  subtype: 'game_result',
                  title: 'Game Starting',
                  message: `Minimum ${minPlayers} players reached! Game starting in 30 seconds...`,
                  priority: 2
                })
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
          showToast({
            type: 'info',
            subtype: 'system_alert',
            title: 'Player Left',
            message: `${data.username} left the room`,
            priority: 3
          })
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
                showToast({
                  type: 'warning',
                  subtype: 'system_alert',
                  title: 'Countdown Stopped',
                  message: `Players dropped below minimum ${minPlayers}. Countdown stopped.`,
                  priority: 2
                })
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

    const handleGameStarting = async (data: any) => {
      console.log('[GameRoom] handleGameStarting event received:', data)
      if (data.roomId === roomId) {
        const countdownValue = data.countdown || 30
        console.log('[GameRoom] Countdown value:', countdownValue)
        setCountdown(countdownValue)
        showToast({
          type: 'success',
          subtype: 'game_result',
          title: 'Game Starting',
          message: 'Game is starting!',
          priority: 2
        })

        // REMOVED: Duplicate audio initialization
        // Audio is already enabled when user joins room (handleJoinRoom)
        // No need to enable it again here
      } else {
        console.log('[GameRoom] handleGameStarting ignored - different roomId')
      }
    }

    const handleCountdown = (data: any) => {
      console.log('[GameRoom] countdown event received:', data)
      if (data.roomId === roomId) {
        const countdownValue = data.countdown
        console.log('[GameRoom] Setting countdown to:', countdownValue)
        setCountdown(countdownValue)

        // FRAME-PERFECT: Play sound EXACTLY when countdown value changes
        // Sounds ONLY on: 3, 2, 1, and 0 (GO)
        if (countdownValue === 3) {
          console.log('[GameRoom] Playing tick_3 (countdown shows 3)')
          audioService.play('countdown.tick_3').catch(err => console.warn('Audio playback failed:', err))
        } else if (countdownValue === 2) {
          console.log('[GameRoom] Playing tick_2 (countdown shows 2)')
          audioService.play('countdown.tick_2').catch(err => console.warn('Audio playback failed:', err))
        } else if (countdownValue === 1) {
          console.log('[GameRoom] Playing tick_1 (countdown shows 1)')
          audioService.play('countdown.tick_1').catch(err => console.warn('Audio playback failed:', err))
        } else if (countdownValue === 0) {
          console.log('[GameRoom] Playing GO (countdown shows 0)')
          audioService.play('countdown.go').catch(err => console.warn('Audio playback failed:', err))
        }
      }
    }

    const handleAnimationStart = (data: any) => {
      if (data.roomId === roomId) {
        setAnimating(true)
        setCountdown(null)

        // Play suspense sound when animation starts (countdown ends and reveal begins)
        console.log('[GameRoom] Playing suspense sound for winner reveal animation')
        audioService.play('reveal.suspense').catch(err => console.warn('Audio playback failed:', err))
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

        // Extract and store VRF data
        setVrfData({
          seed: data.vrfSeed || data.seed,
          proof: data.vrfProof || data.proof
        })

        // Don't automatically show modal here - let the useEffect handle it
        // This ensures each client controls their own modal state
        
        // Get current values
        const currentUser = userRef.current

        // REMOVED: Result sounds (win/lose) moved to WinnerReveal component
        // This ensures audio plays when user SEES the visual reveal, not when socket event arrives
        // Prevents audio-visual desynchronization (sounds were playing before visual reveal completed)

        // Handle single winner format (backward compatibility)
        if (data.isMultiWinner === false && data.winnerId === currentUser?.id && currentUser) {
          setShowCelebration(true)

          // Optimistic balance update for immediate UI feedback
          const newBalance = currentUser.balance + data.winnerAmount
          updateBalance(newBalance, 'optimistic')
        }

        // Handle multi-winner format
        if (data.winners && Array.isArray(data.winners)) {
          const userWinner = data.winners.find((w: Winner) => w.userId === currentUser?.id)
          if (userWinner && currentUser) {
            setShowCelebration(true)

            // Optimistic balance update for immediate UI feedback
            const newBalance = currentUser.balance + userWinner.prize
            updateBalance(newBalance, 'optimistic')

            // Socket event will provide authoritative balance update
          }
        }

        // Notification creation is handled by NotificationsRoot component
        // This prevents duplicate notifications from appearing
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

    const handleRoomStatusUpdate = (data: any) => {
      if (data.roomId === roomId) {
        // Update room status when backend emits status changes (including RESETTING)
        setRoom(prev => {
          if (!prev) return null
          return {
            ...prev,
            status: data.status === 'RESETTING' ? 'in_progress' :
                    data.status === 'WAITING' ? 'waiting' :
                    data.status === 'ACTIVE' ? 'in_progress' : 'completed'
          }
        })

        // FIX: Always update modal data refs, even if modal not yet open
        // This prevents race condition where events arrive before modal opens
        const mappedStatus = data.status === 'RESETTING' ? 'in_progress' :
                            data.status === 'WAITING' ? 'waiting' :
                            data.status === 'ACTIVE' ? 'in_progress' : 'completed'

        if (modalWinnerDataRef.current) {
          modalWinnerDataRef.current.roomStatus = mappedStatus
        }
        if (backupModalDataRef.current) {
          backupModalDataRef.current.roomStatus = mappedStatus
        }
        setModalWinnerData(prev => prev ? { ...prev, roomStatus: mappedStatus } : prev)
      }
    }

    const handleRoomReadyForJoins = (data: any) => {
      if (data.roomId === roomId) {
        // Room is now ready to accept joins after reset
        // Ensure room status is set to waiting
        setRoom(prev => {
          if (!prev) return null
          return {
            ...prev,
            status: 'waiting'
          }
        })

        // FIX: Always update modal data with waiting status, even if modal not yet open
        // This ensures button will show correct status when modal opens
        if (modalWinnerDataRef.current) {
          modalWinnerDataRef.current.roomStatus = 'waiting'
        }
        if (backupModalDataRef.current) {
          backupModalDataRef.current.roomStatus = 'waiting'
        }
        setModalWinnerData(prev => prev ? { ...prev, roomStatus: 'waiting' } : prev)
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
    socketService.onRoomStatusUpdate(handleRoomStatusUpdate)
    socketService.onRoomReadyForJoins(handleRoomReadyForJoins)

    return () => {
      socketService.offRoomState(handleRoomState)
      socketService.offUserJoined(handleUserJoined)
      socketService.offUserLeft(handleUserLeft)
      socketService.offGameStarting(handleGameStarting)
      socketService.offCountdown(handleCountdown)
      socketService.offAnimationStart(handleAnimationStart)
      socketService.offGameCompleted(handleGameCompleted)
      socketService.offBalanceUpdated(handleBalanceUpdated)
      socketService.offRoomStatusUpdate(handleRoomStatusUpdate)
      socketService.offRoomReadyForJoins(handleRoomReadyForJoins)
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
      showToast({
        type: 'error',
        subtype: 'system_alert',
        title: 'Insufficient Balance',
        message: 'You do not have enough balance to join this room',
        priority: 2
      })
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

      // Resume audio context for browser autoplay policies
      // DON'T force-enable audio - respect user's preference (they may have it off)
      try {
        await audioService.resumeContext()
        console.log('[GameRoom] Audio context resumed - respecting user preference')
      } catch (error) {
        console.warn('[GameRoom] Failed to resume audio context:', error)
      }

      showToast({
        type: 'success',
        subtype: 'system_alert',
        title: 'Room Joined',
        message: 'Successfully joined the room!',
        priority: 2
      })

      // Balance is already updated optimistically
      // Socket events will provide authoritative balance if different

    } catch (error: any) {
      // Rollback optimistic update on failure
      rollbackBalance()
      showToast({
        type: 'error',
        subtype: 'system_alert',
        title: 'Join Failed',
        message: error.response?.data?.error || 'Failed to join room',
        priority: 2
      })
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
      showToast({
        type: 'success',
        subtype: 'system_alert',
        title: 'Left Room',
        message: 'Left room successfully - entry fee refunded!',
        priority: 2
      })
      
      // Balance is already updated optimistically
      // Socket events will provide authoritative balance if different
      
      navigate('/')
    } catch (error: any) {
      // Rollback optimistic update on failure
      // Removed: console.log('[GameRoom] Leave room failed, rolling back balance')
      rollbackBalance()
      showToast({
        type: 'error',
        subtype: 'system_alert',
        title: 'Leave Failed',
        message: error.response?.data?.error || 'Failed to leave room',
        priority: 2
      })
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

      <div className="container mx-auto px-4 py-8 relative z-10" style={{ paddingTop: isMobile && countdown !== null && countdown > 5 ? '120px' : undefined }}>
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

        {/* Responsive Countdown System - Completely Different Experiences */}
        <AnimatePresence>
          {countdown !== null && (
            <>
              {/* Mobile: Advanced Floating Overlay Countdown System */}
              {isMobile && (
                <>
                  {/* Full-Screen Countdown for final moments (≤5 seconds) */}
                  {countdown <= 5 && (
                    <motion.div
                      key="fullscreen-countdown"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
                    >
                      {/* Close button for accessibility */}
                      <button
                        onClick={() => {
                          setShowFullScreenCountdown(false)
                          setHasUserInteracted(true)
                        }}
                        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white text-2xl p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Close full-screen countdown"
                        title="Close full-screen view"
                      >
                        ×
                      </button>

                      <div className="text-center px-6">
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <h1 className="text-6xl font-bold gradient-text mb-4">
                            GET READY!
                          </h1>
                          <div className="relative">
                            <CountdownTimer
                              seconds={countdown}
                              size="xl"
                              onComplete={() => {
                                setCountdown(null)
                                setShowFullScreenCountdown(false)
                              }}
                              className="mx-auto"
                            />
                          </div>
                          <p className="text-xl text-gray-300 mt-6">
                            The draw begins in...
                          </p>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* Floating Sticky Countdown for mobile (>5 seconds) */}
                  {countdown > 5 && (
                    <motion.div
                      key="mobile-floating-countdown"
                      initial={{ y: -100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -100, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-sm"
                    >
                      <Card
                        className="bg-gradient-to-r from-primary/95 to-purple-600/95 backdrop-blur-md border-primary/30 shadow-2xl cursor-pointer transition-transform hover:scale-105"
                        onClick={() => {
                          setShowFullScreenCountdown(true)
                          setHasUserInteracted(true)
                        }}
                      >
                        <div className="px-4 py-3 text-center">
                          <h3 className="text-lg font-bold text-white mb-2">
                            🎰 Game Starting!
                          </h3>
                          <div className="flex items-center justify-center space-x-3">
                            <CountdownTimer
                              seconds={countdown}
                              size="md"
                              onComplete={() => setCountdown(null)}
                              showProgress={false}
                            />
                            <div className="text-left">
                              <p className="text-sm text-white/90 font-medium">
                                Get Ready!
                              </p>
                              <p className="text-xs text-white/70">
                                ${room.prizePool?.toLocaleString()} Prize Pool
                              </p>
                            </div>
                          </div>

                          {/* Tap to expand hint */}
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="mt-2"
                          >
                            <p className="text-xs text-white/50 text-center">
                              Tap to expand →
                            </p>
                          </motion.div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </>
              )}

              {/* Desktop: Original Simple Inline Countdown (Restored) */}
              {!isMobile && (
                <motion.div
                  key="desktop-countdown"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-8"
                >
                  <Card className="text-center">
                    <div className="py-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4">
                        Game Starting In
                      </h2>
                      <CountdownTimer
                        seconds={countdown}
                        size="lg"
                        onComplete={() => setCountdown(null)}
                      />
                      <p className="text-gray-400 mt-3 text-sm">
                        Prize Pool: ${room.prizePool?.toLocaleString()}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Responsive VRF Winner Selection Animation System */}
        {/* Shows VRF selection animation only, then goes directly to Result Modal */}
        <AnimatePresence>
          {animating && (
            <>
              {/* Mobile: Full-Screen VRF Animation Experience */}
              {isMobile && (
                <motion.div
                  key="mobile-fullscreen-vrf"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-gradient-to-br from-black/95 to-purple-900/95 backdrop-blur-sm flex items-center justify-center"
                >
                  {/* Background particles for mobile */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full opacity-30"
                        initial={{
                          x: Math.random() * window.innerWidth,
                          y: window.innerHeight + 10,
                        }}
                        animate={{
                          y: -10,
                          opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                          duration: Math.random() * 3 + 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                          ease: "linear"
                        }}
                      />
                    ))}
                  </div>

                  {/* Full-screen VRF animation container */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center px-4">
                    <div className="w-full max-w-md">
                      <WinnerReveal
                        winners={winners}
                        prizePool={room.prizePool}
                        seed={vrfData.seed}
                        proof={vrfData.proof}
                        onComplete={() => {
                          // Delay setting animating to false to allow exit animation to complete
                          // This prevents overlap between WinnerReveal exit and Result Modal entrance
                          setTimeout(() => {
                            setAnimating(false)
                            // Notify backend that animation is complete to trigger winner processing
                            socketService.emit('animation-complete', roomId)
                            // Modal will be shown by useEffect when animating becomes false and winners exist
                          }, 600) // 600ms allows AnimatePresence exit animation to complete
                        }}
                        onClose={() => setAnimating(false)}
                      />
                    </div>
                  </div>

                  {/* Mobile VRF indicator */}
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-8 left-0 right-0 text-center"
                  >
                    <p className="text-white/70 text-sm font-medium">
                      🎰 Drawing Winner...
                    </p>
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mt-2"
                    >
                      <div className="w-12 h-1 bg-gradient-to-r from-primary to-purple-500 rounded-full mx-auto" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}

              {/* Desktop: Original Inline VRF Animation */}
              {!isMobile && (
                <motion.div
                  key="desktop-vrf"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-8"
                >
                  <Card className="border border-primary/30 bg-gradient-to-br from-secondary-bg to-secondary-bg/50 shadow-2xl">
                    <WinnerReveal
                      winners={winners}
                      prizePool={room.prizePool}
                      seed={vrfData.seed}
                      proof={vrfData.proof}
                      onComplete={() => {
                        // Delay setting animating to false to allow exit animation to complete
                        // This prevents overlap between WinnerReveal exit and Result Modal entrance
                        setTimeout(() => {
                          setAnimating(false)
                          // Notify backend that animation is complete to trigger winner processing
                          socketService.emit('animation-complete', roomId)
                          // Modal will be shown by useEffect when animating becomes false and winners exist
                        }, 600) // 600ms allows AnimatePresence exit animation to complete
                      }}
                      onClose={() => setAnimating(false)}
                    />
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
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
          duration={2500}
          onComplete={() => {
            // Auto-reset celebration trigger when animation completes
            setShowCelebration(false)
          }}
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

          // FIX: Celebration is already triggered when game completes (lines 540, 553)
          // No need to trigger again when modal opens - this prevents double-triggering

          return (
            <Modal
              isOpen={showWinnerModal}
              onClose={() => {
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
              }}
          title="Round Result"
          size="lg"
          className="text-center"
        >
          <div className="space-y-3">
            {/* Handle case where data is missing */}
            {!activeModalData ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm mb-2">Loading game results...</p>
                <p className="text-xs text-gray-500">If this persists, please refresh the page.</p>
              </div>
            ) : (
              <>
            {/* YOUR RESULT - Compact version */}
            {user && activeModalData && activeModalData.wasParticipant && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={clsx(
                  "rounded-lg p-3 text-center",
                  activeModalData.winners && activeModalData.winners.some(w => w.userId === user.id)
                    ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500"
                    : "bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500"
                )}
              >
                {activeModalData.winners && activeModalData.winners.some(w => w.userId === user.id) ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-4xl">🏆</div>
                    <div>
                      <h2 className="text-xl font-bold text-green-400">YOU WON!</h2>
                      <p className="text-lg font-bold text-white">
                        +${activeModalData.winners.find(w => w.userId === user.id)?.prize || 0}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-4xl">😔</div>
                    <div>
                      <h2 className="text-xl font-bold text-red-400">YOU LOST</h2>
                      <p className="text-sm text-gray-300">Better luck next time!</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Join Room Button - Prominent position */}
            <div className="flex justify-center">
              <JoinRoomButton
                roomStatus={activeModalData?.roomStatus || 'waiting'}
                entryFee={activeModalData?.entryFee || room?.entryFee || 0}
                isWinner={!!userWinner}
                onJoin={async () => {
                  // Close modal first
                  setShowWinnerModal(false)
                  setShowCelebration(false)
                  setModalDataLocked(false)
                  setModalWinnerData(null)
                  modalWinnerDataRef.current = null
                  backupModalDataRef.current = null

                  // Then join room
                  await handleJoinRoom()
                }}
                disabled={!user || (user && user.balance < (activeModalData?.entryFee || room?.entryFee || 0))}
              />
            </div>


            {/* Balance warning if insufficient */}
            {user && user.balance < (activeModalData?.entryFee || room?.entryFee || 0) && (
              <p className="text-xs text-red-400 text-center">
                Insufficient balance. Need ${activeModalData?.entryFee || room?.entryFee || 0}
              </p>
            )}

            {/* Game Summary - Compact grid */}
            <div className="bg-secondary-bg/50 rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2">
                  <span className="text-xs text-gray-400 block">Prize Pool</span>
                  <span className="text-sm font-bold text-text-primary">
                    ${activeModalData?.prizePool || 0}
                  </span>
                </div>
                <div className="p-2">
                  <span className="text-xs text-gray-400 block">Distributed</span>
                  <span className="text-sm font-bold text-green-400">
                    ${((activeModalData?.prizePool || 0) * 0.9).toFixed(2)}
                  </span>
                </div>
                <div className="p-2">
                  <span className="text-xs text-gray-400 block">Platform Fee</span>
                  <span className="text-sm text-yellow-400">
                    ${((activeModalData?.prizePool || 0) * 0.1).toFixed(2)}
                  </span>
                </div>
                <div className="p-2">
                  <span className="text-xs text-gray-400 block">Winners</span>
                  <span className="text-sm font-semibold text-text-primary">
                    {activeModalData?.winners?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Winners List - Collapsed by default */}
            <details className="bg-secondary-bg/50 rounded-lg">
              <summary className="cursor-pointer p-2 text-xs text-gray-400 uppercase tracking-wider text-center hover:text-gray-300">
                View All Winners ({activeModalData?.winners?.length || 0})
              </summary>
              <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
                {activeModalData?.winners && activeModalData.winners.length > 0 ? (
                  activeModalData.winners.map((winner, index) => (
                    <div
                      key={winner.userId}
                      className={clsx(
                        "flex justify-between items-center p-2 rounded text-sm",
                        winner.userId === user?.id
                          ? "bg-green-500/10"
                          : "bg-secondary-bg"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                        <span className="text-text-primary">
                          {winner.username}
                          {winner.userId === user?.id && (
                            <span className="text-green-400 ml-1 text-xs">(You)</span>
                          )}
                        </span>
                      </div>
                      <span className="font-bold text-green-400">
                        +${winner.prize}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-2 text-xs">No winners data</p>
                )}
              </div>
            </details>
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