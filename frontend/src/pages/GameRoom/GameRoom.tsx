import { useState, useEffect, useRef, useCallback } from 'react'
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
import { useWinnerResults } from '@contexts/WinnerResultsContext'
import { useModal } from '@hooks/useModal'
import { useIsMobile } from '@hooks/useResponsive'
import { useGameStateMachine } from '@hooks/useGameStateMachine'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user, updateBalance, rollbackBalance } = useAuth()
  const { openAuthModal } = useModal()
  const { showToast } = useNotifications()
  const isMobile = useIsMobile()

  // Initialize game state machine (fixes BUG-001, BUG-003, BUG-004)
  const gameStateMachine = useGameStateMachine()

  // Winner results context (fixes BUG-005, BUG-012, BUG-017)
  const winnerResults = useWinnerResults()

  // Operation locking to prevent race conditions (fixes BUG-006)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const operationInProgress = isJoining || isLeaving

  // Event idempotency tracking (fixes BUG-007)
  const processedEventsRef = useRef<Set<string>>(new Set())

  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const [winners, setWinners] = useState<Winner[]>([])
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showFullScreenCountdown, setShowFullScreenCountdown] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false) // Track if user has interacted with countdown

  // REMOVED: Modal data state - now managed by WinnerResultsContext (fixes BUG-005, BUG-012, BUG-017)
  // - showWinnerModal → winnerResults.isModalOpen
  // - modalWinnerData → winnerResults.currentResults
  // - modalDataLocked → handled by context's persistence logic
  // - modalWinnerDataRef / backupModalDataRef → no longer needed

  const [previousPrizePool, setPreviousPrizePool] = useState<number>(0)
  const [platformFeeData, setPlatformFeeData] = useState<{ amount: number, rate: number }>({ amount: 0, rate: 0.1 })
  const [vrfData, setVrfData] = useState<{ seed?: string, proof?: string }>({})
  const [recentPlayerAction, setRecentPlayerAction] = useState<{
    type: 'join' | 'leave'
    userId: string
    timestamp: number
  } | null>(null)

  const isParticipant = participants.some(p => p.userId === user?.id)

  // Component mount tracking to prevent state updates after unmount (fixes BUG-008)
  const isMountedRef = useRef(true)

  // Refs to track current state values in socket handlers
  const participantsRef = useRef(participants)
  const countdownRef = useRef(countdown)
  const userRef = useRef(user)
  const animatingRef = useRef(animating)
  const winnersRef = useRef(winners)

  // Extract stable handler from state machine (CRITICAL: prevents infinite useEffect loop)
  const stateMachineAnimationComplete = gameStateMachine.handleAnimationComplete

  // Stable callback for WinnerReveal onComplete (fixes BUG-023: prevents useEffect restart loop)
  const handleWinnerAnimationComplete = useCallback(() => {
    console.log('[GameRoom] Winner animation complete callback triggered')
    // Notify state machine that animation is complete
    stateMachineAnimationComplete()

    // Delay setting animating to false to allow exit animation to complete
    setTimeout(() => {
      setAnimating(false)
      // Notify backend that animation is complete
      if (roomId) {
        socketService.emit('animation-complete', roomId)
      }
    }, 600)
  }, [stateMachineAnimationComplete, roomId])

  // Stable callback for Celebration onComplete (fixes BUG-024: frozen confetti particles)
  const handleCelebrationComplete = useCallback(() => {
    console.log('[GameRoom] Celebration animation complete, resetting trigger')
    // Auto-reset celebration trigger when animation completes
    setShowCelebration(false)
  }, [])

  // Set up component mount tracking (fixes BUG-008)
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log('[GameRoom] Component unmounting, setting isMountedRef to false')
      isMountedRef.current = false
    }
  }, [])

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
  
  // Show modal for new winners using WinnerResultsContext (fixes BUG-005, BUG-012, BUG-017)
  // Context handles persistence independently of room state changes
  useEffect(() => {
    // Don't process if modal is already open or no winners
    if (winners.length === 0 || winnerResults.isModalOpen) {
      return
    }

    // Create unique identifier for this set of winners
    const winnersId = winners.map(w => w.userId).join('-')

    // Check if we've already shown these winners
    if (winnerResults.currentResults?.roundId === winnersId) {
      return
    }

    // Prepare winner data for context
    const currentUser = userRef.current
    const userWasParticipant = currentUser ? participantsRef.current.some(p => p.userId === currentUser.id) : false
    // Use previousPrizePool which persists after room resets (fixes BUG-026)
    const actualPrizePool = previousPrizePool || room?.prizePool || 0

    const winnerData = {
      winners: [...winners],
      prizePool: actualPrizePool,
      platformFeeAmount: platformFeeData.amount,
      platformFeeRate: platformFeeData.rate,
      roundId: winnersId,
      timestamp: Date.now(),
      wasParticipant: userWasParticipant,
      roomStatus: room?.status || 'waiting',
      entryFee: room?.entryFee || 0,
      vrfSeed: vrfData.seed,
      vrfProof: vrfData.proof
    }

    // Set winner results in context - triggers modal opening
    winnerResults.setWinnerResults(winnerData)
  }, [winners, previousPrizePool, room?.prizePool, room?.status, room?.entryFee, platformFeeData, vrfData, winnerResults])

  // Clear local winners state when room resets (context handles modal persistence)
  useEffect(() => {
    if (room?.status === 'waiting' && winners.length > 0 && !winnerResults.isModalOpen) {
      // Clear local winners array - context preserves modal data
      setWinners([])
    }
  }, [room?.status, winners.length, winnerResults.isModalOpen])


  useEffect(() => {
    if (!roomId) return

    const fetchRoom = async () => {
      try {
        const data = await roomAPI.getRoom(roomId)
        if (!isMountedRef.current) return // Component unmounted during fetch

        setRoom(data)
        setParticipants(data.participants || [])
        socketService.joinRoom(roomId)
      } catch {
        if (!isMountedRef.current) return // Component unmounted during error

        showToast({
          type: 'error',
          subtype: 'system_alert',
          title: 'Failed to load room',
          message: 'Unable to load room details',
          priority: 2
        })
        navigate('/')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchRoom()

    return () => {
      if (roomId) {
        socketService.leaveRoom(roomId)
      }
    }
  }, [roomId, navigate])

  // Update modal data with new room status when it changes (fixes BUG-005)
  useEffect(() => {
    if (winnerResults.isModalOpen && room?.status) {
      // Update room status in context - this updates the Join Room button state
      winnerResults.updateRoomStatus(room.status)
    }
  }, [room?.status, winnerResults])

  // Socket listeners
  useEffect(() => {
    if (!roomId) return

    const handleRoomState = (data: any) => {
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

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

        // FIX BUG-029: Use transformedParticipants.length as primary source (most accurate)
        // The actual participant list is the ground truth, not the server's count
        const currentParticipants = transformedParticipants.length ||
                                   data.room.currentPlayers ||
                                   parseInt(data.room.current_players) ||
                                   0

        console.log(`[GameRoom] Participant count: transformedParticipants=${transformedParticipants.length}, currentPlayers=${data.room.currentPlayers}, current_players=${data.room.current_players}`)

        // Prize pool: Prefer server value, fallback to client calculation (fixes BUG-028, BUG-029)
        // Use the same currentParticipants calculation for consistency
        let prizePool = 0
        if (data.room.currentPrizePool !== undefined && data.room.currentPrizePool !== null) {
          prizePool = typeof data.room.currentPrizePool === 'number' ?
            data.room.currentPrizePool : parseFloat(data.room.currentPrizePool)
        } else if (data.room.current_prize_pool) {
          prizePool = parseFloat(data.room.current_prize_pool)
        } else {
          // Fallback: Calculate from currentParticipants (using actual participant array length)
          // This handles edge cases where server count is stale but participant list is accurate
          prizePool = currentParticipants * entryFee
          console.log(`[GameRoom] Prize pool calculated client-side: ${currentParticipants} × $${entryFee} = $${prizePool}`)
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

      // Only update participants if they've changed (fixes BUG-014 - participant flicker)
      const currentParticipants = participantsRef.current
      const hasChanged = currentParticipants.length !== transformedParticipants.length ||
        transformedParticipants.some((newP: any) =>
          !currentParticipants.find(p => p.userId === newP.userId)
        )

      if (hasChanged) {
        setParticipants(transformedParticipants)
      }
    }

    const handleUserJoined = (data: any) => {
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

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

          // FIX BUG-031: Update prize pool immediately so other users see the update
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
                currentParticipants: newParticipants.length,
                // Calculate prize pool immediately (fixes BUG-031)
                prizePool: newParticipants.length * prev.entryFee
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
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

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

          // FIX BUG-031: Update prize pool immediately so other users see the update
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
                currentParticipants: newParticipants.length,
                // Calculate prize pool immediately (fixes BUG-031)
                prizePool: newParticipants.length * prev.entryFee
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
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

      console.log('[GameRoom] handleGameStarting event received:', data)
      if (data.roomId === roomId) {
        const countdownValue = data.countdown || 30
        console.log('[GameRoom] Countdown value:', countdownValue)

        // Use state machine transition (fixes BUG-001)
        gameStateMachine.handleGameStarting(countdownValue)
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

        // Use state machine transition (fixes BUG-003)
        gameStateMachine.handleCountdownTick(countdownValue)
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
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

      if (data.roomId === roomId) {
        // Use state machine transition (fixes BUG-001, BUG-003)
        gameStateMachine.handleAnimationStart()
        setAnimating(true)
        setCountdown(null)

        // Play suspense sound when animation starts (countdown ends and reveal begins)
        console.log('[GameRoom] Playing suspense sound for winner reveal animation')
        audioService.play('reveal.suspense').catch(err => console.warn('Audio playback failed:', err))
      }
    }

    const handleGameCompleted = (data: any) => {
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

      // Removed: console.log('[GameRoom] game-completed event received:', data)
      // Removed: console.log('[GameRoom] Current roomId:', roomId)
      // Removed: console.log('[GameRoom] Event roomId:', data.roomId)
      // Removed: console.log('[GameRoom] RoomId match:', data.roomId === roomId)

      if (data.roomId === roomId) {
        // Idempotency check - prevent duplicate processing (fixes BUG-007)
        const eventId = `game-completed-${data.roomId}-${data.roundId || Date.now()}`
        if (processedEventsRef.current.has(eventId)) {
          console.warn('[GameRoom] Duplicate game-completed event detected, skipping:', eventId)
          return
        }
        processedEventsRef.current.add(eventId)

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

        // Use state machine transition (fixes BUG-001, BUG-004)
        gameStateMachine.handleGameCompleted(winnersArray)
        setWinners(winnersArray)

        // Store platform fee data from the event
        const platformFee = data.platformFeeAmount || data.commissionAmount || 0
        const totalPrize = data.totalPrize || (winnersArray.reduce((sum, w) => sum + w.prize, 0) / 0.9) // Estimate if not provided

        // Store in state for modal opening via context
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

          // REMOVED: Optimistic balance update (fixes BUG-020)
          // Wait for authoritative balance-updated event from server
          // const newBalance = currentUser.balance + data.winnerAmount
          // updateBalance(newBalance, 'optimistic')
        }

        // Handle multi-winner format
        if (data.winners && Array.isArray(data.winners)) {
          const userWinner = data.winners.find((w: Winner) => w.userId === currentUser?.id)
          if (userWinner && currentUser) {
            setShowCelebration(true)

            // REMOVED: Optimistic balance update (fixes BUG-020)
            // Wait for authoritative balance-updated event from server
            // const newBalance = currentUser.balance + userWinner.prize
            // updateBalance(newBalance, 'optimistic')
          }
        }

        // Notification creation is handled by NotificationsRoot component
        // This prevents duplicate notifications from appearing
      } else {
        // Removed: console.log('[GameRoom] game-completed event for different room, ignoring')
      }
    }

    const handleBalanceUpdated = (data: any) => {
      if (!isMountedRef.current) return // Component unmounted (BUG-008)

      const currentUser = userRef.current
      // Type-safe comparison: Convert both to strings (fixes BUG-013)
      const dataUserId = String(data.userId)
      const currentUserId = String(currentUser?.id)

      if (dataUserId === currentUserId && currentUser) {
        // Removed: console.log(`[GameRoom] Received balance update for user ${data.userId}: ${data.newBalance}`)
        // Server balance is authoritative (fixes BUG-020 balance reconciliation)
        updateBalance(data.newBalance, 'socket')
      } else if (data.userId && currentUser?.id && dataUserId !== currentUserId) {
        console.warn('[GameRoom] Balance update userId mismatch:', {
          eventUserId: dataUserId,
          currentUserId: currentUserId
        })
      }
    }

    const handleRoomStatusUpdate = (data: any) => {
      if (data.roomId === roomId) {
        // Map backend status to frontend status
        const mappedStatus = data.status === 'RESETTING' ? 'in_progress' :
                            data.status === 'WAITING' ? 'waiting' :
                            data.status === 'ACTIVE' ? 'in_progress' : 'completed'

        // Update room status when backend emits status changes (including RESETTING)
        setRoom(prev => {
          if (!prev) return null
          return {
            ...prev,
            status: mappedStatus
          }
        })

        // Update modal status in context (fixes BUG-005)
        winnerResults.updateRoomStatus(mappedStatus)
      }
    }

    const handleRoomReadyForJoins = (data: any) => {
      if (data.roomId === roomId) {
        // Room is now ready to accept joins after reset
        setRoom(prev => {
          if (!prev) return null
          return {
            ...prev,
            status: 'waiting'
          }
        })

        // Update modal status in context (fixes BUG-005)
        winnerResults.updateRoomStatus('waiting')
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
  }, [roomId]) // FIXED: Removed user?.id dependency to prevent memory leak (fixes BUG-002, BUG-007, BUG-021)
  // All handlers use userRef.current instead of user?.id to prevent stale closures

  const handleJoinRoom = async () => {
    if (!room) return

    // Prevent concurrent operations (fixes BUG-006)
    if (operationInProgress) {
      console.warn('[GameRoom] Operation already in progress, ignoring join request')
      return
    }

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

    // Set operation lock
    setIsJoining(true)

    try {
      // Optimistic update: Immediately deduct entry fee from displayed balance
      const newBalance = originalBalance - entryFee
      // Removed: console.log(`[GameRoom] Deducting entry fee: ${originalBalance} - ${entryFee} = ${newBalance}`)
      updateBalance(newBalance, 'optimistic')

      // Optimistic participant update (fixes BUG-019)
      if (user) {
        setParticipants(prev => {
          // Check if already in list
          if (prev.some(p => p.userId === user.id)) {
            return prev
          }
          return [...prev, {
            id: user.id,
            userId: user.id,
            username: user.username || user.email,
            avatarUrl: undefined,
            joinedAt: new Date().toISOString(),
            status: 'active' as const
          }]
        })
      }

      await roomAPI.joinRoom(room.id)
      if (!isMountedRef.current) return // Component unmounted after API call (BUG-008)

      // FIX BUG-030: Fetch fresh room data immediately after joining to ensure
      // Prize Pool and Players counter display correct values
      try {
        const updatedRoomData = await roomAPI.getRoom(room.id)
        if (!isMountedRef.current) return // Check again after async operation

        setRoom(updatedRoomData)
        setParticipants(updatedRoomData.participants || [])
        console.log(`[GameRoom] Refreshed room data after join: ${updatedRoomData.currentParticipants} participants, prize pool: $${updatedRoomData.prizePool}`)
      } catch (error) {
        console.error('[GameRoom] Failed to fetch updated room data after join:', error)
        // Continue anyway - WebSocket events will eventually update the data
      }

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
      if (!isMountedRef.current) return // Component unmounted during error (BUG-008)

      // Rollback optimistic updates on failure
      rollbackBalance()
      // Rollback optimistic participant update
      if (user) {
        setParticipants(prev => prev.filter(p => p.userId !== user.id))
      }

      showToast({
        type: 'error',
        subtype: 'system_alert',
        title: 'Join Failed',
        message: error.response?.data?.error || 'Failed to join room',
        priority: 2
      })
    } finally {
      if (isMountedRef.current) {
        // Release operation lock only if still mounted
        setIsJoining(false)
      }
    }
  }

  const handleLeaveRoom = async () => {
    if (!room || !user) return

    // Prevent concurrent operations (fixes BUG-006)
    if (operationInProgress) {
      console.warn('[GameRoom] Operation already in progress, ignoring leave request')
      return
    }

    // Store original balance for rollback if needed
    const originalBalance = user.balance
    const refundAmount = room.entryFee

    // Set operation lock
    setIsLeaving(true)

    try {
      // Optimistic update: Immediately add refund to displayed balance
      // Removed: console.log(`[GameRoom] Refunding entry fee: ${originalBalance} + ${refundAmount} = ${originalBalance + refundAmount}`)
      updateBalance(originalBalance + refundAmount, 'optimistic')

      // Optimistic participant removal (fixes BUG-019)
      setParticipants(prev => prev.filter(p => p.userId !== user.id))

      await roomAPI.leaveRoom(room.id)
      if (!isMountedRef.current) return // Component unmounted after API call (BUG-008)

      showToast({
        type: 'success',
        subtype: 'system_alert',
        title: 'Left Room',
        message: 'Left room successfully - entry fee refunded!',
        priority: 2
      })

      // Balance is already updated optimistically
      // Socket events will provide authoritative balance if different

      // Notify state machine that user left
      gameStateMachine.handleUserLeftRoom()

      navigate('/')
    } catch (error: any) {
      if (!isMountedRef.current) return // Component unmounted during error (BUG-008)

      // Rollback optimistic updates on failure
      // Removed: console.log('[GameRoom] Leave room failed, rolling back balance')
      rollbackBalance()

      // Rollback optimistic participant removal - re-add user
      if (user) {
        setParticipants(prev => {
          // Check if already back in list
          if (prev.some(p => p.userId === user.id)) {
            return prev
          }
          return [...prev, {
            id: user.id,
            userId: user.id,
            username: user.username || user.email,
            avatarUrl: undefined,
            joinedAt: new Date().toISOString(),
            status: 'active' as const
          }]
        })
      }

      showToast({
        type: 'error',
        subtype: 'system_alert',
        title: 'Leave Failed',
        message: error.response?.data?.error || 'Failed to leave room',
        priority: 2
      })
    } finally {
      if (isMountedRef.current) {
        // Release operation lock only if still mounted
        setIsLeaving(false)
        setShowLeaveModal(false)
      }
    }
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

  // CRITICAL: Use WinnerResultsContext for persistent modal data (fixes BUG-005, BUG-012, BUG-017)
  // Context ensures modal data persists through room resets independently
  // Priority: winnerResults.currentResults (managed by context)
  const persistedModalData = winnerResults.currentResults

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
                        onComplete={handleWinnerAnimationComplete}
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
                      onComplete={handleWinnerAnimationComplete}
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
          onComplete={handleCelebrationComplete}
        />

        {/* Winner Announcement Modal - Using WinnerResultsContext (fixes BUG-005, BUG-012, BUG-017) */}
        {winnerResults.currentResults && (
          <Modal
            isOpen={winnerResults.isModalOpen}
            onClose={() => {
              setShowCelebration(false) // Stop celebration when closing modal
              setAnimating(false) // Hide VRF animation modal (fixes BUG-025)
              winnerResults.dismissResults() // Dismiss results from context
            }}
            title="Round Result"
            size="lg"
            className="text-center"
          >
            <div className="space-y-3">
              {/* YOUR RESULT - Compact version */}
              {user && winnerResults.currentResults.wasParticipant && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={clsx(
                    "rounded-lg p-3 text-center",
                    winnerResults.currentResults.winners.some(w => w.userId === user.id)
                      ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500"
                      : "bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500"
                  )}
                >
                  {winnerResults.currentResults.winners.some(w => w.userId === user.id) ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-4xl">🏆</div>
                      <div>
                        <h2 className="text-xl font-bold text-green-400">YOU WON!</h2>
                        <p className="text-lg font-bold text-white">
                          +${winnerResults.currentResults.winners.find(w => w.userId === user.id)?.prize || 0}
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
                  roomStatus={winnerResults.currentResults.roomStatus || 'waiting'}
                  entryFee={winnerResults.currentResults.entryFee || room?.entryFee || 0}
                  isWinner={!!winnerResults.currentResults.winners.find(w => w.userId === user?.id)}
                  onJoin={async () => {
                    // Close modal first
                    setShowCelebration(false)
                    setAnimating(false) // Hide VRF animation modal (fixes BUG-025 for Join button)
                    winnerResults.dismissResults()

                    // Then join room
                    await handleJoinRoom()
                  }}
                  disabled={!user || (user && user.balance < (winnerResults.currentResults.entryFee || room?.entryFee || 0))}
                />
              </div>

              {/* Balance warning if insufficient */}
              {user && user.balance < (winnerResults.currentResults.entryFee || room?.entryFee || 0) && (
                <p className="text-xs text-red-400 text-center">
                  Insufficient balance. Need ${winnerResults.currentResults.entryFee || room?.entryFee || 0}
                </p>
              )}

              {/* Game Summary - Compact grid */}
              <div className="bg-secondary-bg/50 rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2">
                    <span className="text-xs text-gray-400 block">Prize Pool</span>
                    <span className="text-sm font-bold text-text-primary">
                      ${winnerResults.currentResults.prizePool || 0}
                    </span>
                  </div>
                  <div className="p-2">
                    <span className="text-xs text-gray-400 block">Distributed</span>
                    <span className="text-sm font-bold text-green-400">
                      ${((winnerResults.currentResults.prizePool || 0) * 0.9).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2">
                    <span className="text-xs text-gray-400 block">Platform Fee</span>
                    <span className="text-sm text-yellow-400">
                      ${((winnerResults.currentResults.prizePool || 0) * 0.1).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2">
                    <span className="text-xs text-gray-400 block">Winners</span>
                    <span className="text-sm font-semibold text-text-primary">
                      {winnerResults.currentResults.winners.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Winners List - Collapsed by default */}
              <details className="bg-secondary-bg/50 rounded-lg">
                <summary className="cursor-pointer p-2 text-xs text-gray-400 uppercase tracking-wider text-center hover:text-gray-300">
                  View All Winners ({winnerResults.currentResults.winners.length || 0})
                </summary>
                <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
                  {winnerResults.currentResults.winners.length > 0 ? (
                    winnerResults.currentResults.winners.map((winner, index) => (
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
            </div>
          </Modal>
        )}
      </div>
    </>
  )
}

export default GameRoom