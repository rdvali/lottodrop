import { useReducer, useCallback, useRef, useEffect } from 'react'
import { gameAnalytics } from '@services/analytics/gameAnalytics'

/**
 * Game Room State Machine
 *
 * Enforces proper event sequencing to prevent race conditions:
 * IDLE → COUNTDOWN → ANIMATION_STARTING → ANIMATION_PLAYING →
 * ANIMATION_COMPLETE → SHOWING_RESULTS → RESETTING → IDLE
 *
 * Fixes: BUG-001, BUG-003, BUG-004
 */

export type GamePhase =
  | 'IDLE'                  // Waiting for players to join
  | 'COUNTDOWN'             // 30-second countdown active
  | 'ANIMATION_STARTING'    // Animation-start event received, preparing VRF
  | 'ANIMATION_PLAYING'     // VRF animation in progress
  | 'ANIMATION_COMPLETE'    // Animation finished, ready for results
  | 'SHOWING_RESULTS'       // Winner modal displayed
  | 'RESETTING'             // Room resetting for next round

export type GameEvent =
  | { type: 'GAME_STARTING'; countdown: number }
  | { type: 'COUNTDOWN_TICK'; countdown: number }
  | { type: 'ANIMATION_START' }
  | { type: 'START_PLAYING' }  // Internal transition: ANIMATION_STARTING → ANIMATION_PLAYING
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'GAME_COMPLETED'; winners: any[] }
  | { type: 'SHOW_MODAL' }
  | { type: 'MODAL_DISMISSED' }
  | { type: 'ROOM_RESET' }
  | { type: 'USER_LEFT_ROOM' }

interface GameState {
  phase: GamePhase
  countdown: number | null
  winners: any[]
  canShowModal: boolean
  gameCompletedReceived: boolean
  animationCompleted: boolean
  // Audit trail for debugging
  lastTransition: {
    from: GamePhase
    to: GamePhase
    event: GameEvent['type']
    timestamp: number
  } | null
}

type GameAction = GameEvent

const initialState: GameState = {
  phase: 'IDLE',
  countdown: null,
  winners: [],
  canShowModal: false,
  gameCompletedReceived: false,
  animationCompleted: false,
  lastTransition: null,
}

/**
 * State machine reducer with strict transition rules
 */
function gameStateMachineReducer(state: GameState, action: GameAction): GameState {
  const timestamp = Date.now()

  switch (action.type) {
    case 'GAME_STARTING': {
      // Can only start from IDLE or RESETTING
      if (state.phase !== 'IDLE' && state.phase !== 'RESETTING') {
        console.warn(`[GameStateMachine] Invalid transition: Cannot GAME_STARTING from ${state.phase}`)
        return state
      }

      const newState = {
        ...state,
        phase: 'COUNTDOWN' as GamePhase,
        countdown: action.countdown,
        winners: [],
        canShowModal: false,
        gameCompletedReceived: false,
        animationCompleted: false,
        lastTransition: {
          from: state.phase,
          to: 'COUNTDOWN' as GamePhase,
          event: 'GAME_STARTING' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'COUNTDOWN',
          duration,
          event: 'GAME_STARTING',
        })
      }

      return newState
    }

    case 'COUNTDOWN_TICK': {
      // Countdown can only tick during COUNTDOWN phase
      if (state.phase !== 'COUNTDOWN') {
        console.warn(`[GameStateMachine] Invalid transition: Cannot COUNTDOWN_TICK from ${state.phase}`)
        return state
      }

      return {
        ...state,
        countdown: action.countdown,
      }
    }

    case 'ANIMATION_START': {
      // Animation can only start from COUNTDOWN phase
      if (state.phase !== 'COUNTDOWN') {
        console.warn(`[GameStateMachine] Invalid transition: Cannot ANIMATION_START from ${state.phase}`)
        return state
      }

      const newState = {
        ...state,
        phase: 'ANIMATION_STARTING' as GamePhase,
        countdown: null,
        lastTransition: {
          from: state.phase,
          to: 'ANIMATION_STARTING' as GamePhase,
          event: 'ANIMATION_START' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'ANIMATION_STARTING',
          duration,
          event: 'ANIMATION_START',
        })
      }

      return newState
    }

    case 'START_PLAYING': {
      // Internal transition: ANIMATION_STARTING → ANIMATION_PLAYING
      if (state.phase !== 'ANIMATION_STARTING') {
        console.warn(`[GameStateMachine] Invalid transition: Cannot START_PLAYING from ${state.phase}`)
        return state
      }

      const newState = {
        ...state,
        phase: 'ANIMATION_PLAYING' as GamePhase,
        lastTransition: {
          from: state.phase,
          to: 'ANIMATION_PLAYING' as GamePhase,
          event: 'START_PLAYING' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'ANIMATION_PLAYING',
          duration,
          event: 'START_PLAYING' as GameEvent['type'],
        })
      }

      return newState
    }

    case 'GAME_COMPLETED': {
      // Game-completed can arrive during COUNTDOWN, ANIMATION_STARTING, or ANIMATION_PLAYING
      // Store winners but don't show modal until animation completes
      const currentPhase = state.phase

      // If we're in ANIMATION_PLAYING, just store the data
      if (currentPhase === 'ANIMATION_PLAYING' || currentPhase === 'ANIMATION_STARTING') {
        return {
          ...state,
          winners: action.winners,
          gameCompletedReceived: true,
          // Don't change phase yet - wait for ANIMATION_COMPLETE
        }
      }

      // If countdown still active, transition to ANIMATION_STARTING and store data
      if (currentPhase === 'COUNTDOWN') {
        const newState = {
          ...state,
          phase: 'ANIMATION_STARTING' as GamePhase,
          winners: action.winners,
          gameCompletedReceived: true,
          countdown: null,
          lastTransition: {
            from: currentPhase,
            to: 'ANIMATION_STARTING' as GamePhase,
            event: 'GAME_COMPLETED' as GameEvent['type'],
            timestamp,
          },
        }

        // Track analytics for phase transition
        if (state.lastTransition) {
          const duration = timestamp - state.lastTransition.timestamp
          gameAnalytics.trackStateTransition({
            from: currentPhase,
            to: 'ANIMATION_STARTING',
            duration,
            event: 'GAME_COMPLETED',
          })
        }

        return newState
      }

      console.warn(`[GameStateMachine] Unexpected GAME_COMPLETED during ${currentPhase}`)
      return state
    }

    case 'ANIMATION_COMPLETE': {
      // Animation complete can only come from ANIMATION_PLAYING or ANIMATION_STARTING
      if (state.phase !== 'ANIMATION_PLAYING' && state.phase !== 'ANIMATION_STARTING') {
        console.warn(`[GameStateMachine] Invalid transition: Cannot ANIMATION_COMPLETE from ${state.phase}`)
        return state
      }

      // Mark animation as complete
      const newState: GameState = {
        ...state,
        phase: 'ANIMATION_COMPLETE',
        animationCompleted: true,
        lastTransition: {
          from: state.phase,
          to: 'ANIMATION_COMPLETE',
          event: 'ANIMATION_COMPLETE' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'ANIMATION_COMPLETE',
          duration,
          event: 'ANIMATION_COMPLETE' as GameEvent['type'],
        })
      }

      // If we already received game-completed data, we can show modal now
      if (state.gameCompletedReceived && state.winners.length > 0) {
        newState.canShowModal = true
      }

      return newState
    }

    case 'SHOW_MODAL': {
      // Can only show modal from ANIMATION_COMPLETE phase
      if (state.phase !== 'ANIMATION_COMPLETE') {
        console.warn(`[GameStateMachine] Invalid transition: Cannot SHOW_MODAL from ${state.phase}`)
        return state
      }

      // Must have winners data and game-completed must have been received
      if (!state.gameCompletedReceived || state.winners.length === 0) {
        console.warn('[GameStateMachine] Cannot show modal: No winner data available')
        return state
      }

      const newState = {
        ...state,
        phase: 'SHOWING_RESULTS' as GamePhase,
        canShowModal: true,
        lastTransition: {
          from: state.phase,
          to: 'SHOWING_RESULTS' as GamePhase,
          event: 'SHOW_MODAL' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'SHOWING_RESULTS',
          duration,
          event: 'SHOW_MODAL' as GameEvent['type'],
        })
      }

      return newState
    }

    case 'MODAL_DISMISSED': {
      // Modal can be dismissed from SHOWING_RESULTS
      if (state.phase !== 'SHOWING_RESULTS') {
        return state
      }

      const newState = {
        ...state,
        phase: 'RESETTING' as GamePhase,
        canShowModal: false,
        lastTransition: {
          from: state.phase,
          to: 'RESETTING' as GamePhase,
          event: 'MODAL_DISMISSED' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'RESETTING',
          duration,
          event: 'MODAL_DISMISSED' as GameEvent['type'],
        })
      }

      return newState
    }

    case 'ROOM_RESET': {
      // Room can reset from RESETTING or SHOWING_RESULTS
      const newState = {
        ...initialState,
        phase: 'IDLE' as GamePhase,
        lastTransition: {
          from: state.phase,
          to: 'IDLE' as GamePhase,
          event: 'ROOM_RESET' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'IDLE',
          duration,
          event: 'ROOM_RESET' as GameEvent['type'],
        })
      }

      return newState
    }

    case 'USER_LEFT_ROOM': {
      // User leaving resets everything
      const newState = {
        ...initialState,
        phase: 'IDLE' as GamePhase,
        lastTransition: {
          from: state.phase,
          to: 'IDLE' as GamePhase,
          event: 'USER_LEFT_ROOM' as GameEvent['type'],
          timestamp,
        },
      }

      // Track analytics
      if (state.lastTransition) {
        const duration = timestamp - state.lastTransition.timestamp
        gameAnalytics.trackStateTransition({
          from: state.phase,
          to: 'IDLE',
          duration,
          event: 'USER_LEFT_ROOM' as GameEvent['type'],
        })
      }

      return newState
    }

    default:
      return state
  }
}

/**
 * Hook to manage game room state machine
 */
export function useGameStateMachine() {
  const [state, dispatch] = useReducer(gameStateMachineReducer, initialState)
  const stateRef = useRef(state)

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Automatically transition from ANIMATION_STARTING to ANIMATION_PLAYING
  useEffect(() => {
    if (state.phase === 'ANIMATION_STARTING') {
      // Small delay to ensure animation component has mounted
      const timer = setTimeout(() => {
        dispatch({ type: 'START_PLAYING' })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [state.phase])

  // Automatically show modal when canShowModal becomes true
  useEffect(() => {
    if (state.canShowModal && state.phase === 'ANIMATION_COMPLETE') {
      // Add a small delay for smooth transition
      const timer = setTimeout(() => {
        dispatch({ type: 'SHOW_MODAL' })
      }, 350)

      return () => clearTimeout(timer)
    }
  }, [state.canShowModal, state.phase])

  // Animation timeout failsafe (BUG-016)
  // Force animation completion if it takes longer than 15 seconds
  useEffect(() => {
    if (state.phase === 'ANIMATION_PLAYING') {
      console.log('[GameStateMachine] Animation started, setting 15s timeout failsafe')

      const ANIMATION_TIMEOUT = 15000 // 15 seconds
      const timeoutTimer = setTimeout(() => {
        // Check if still stuck in ANIMATION_PLAYING
        if (stateRef.current.phase === 'ANIMATION_PLAYING') {
          console.warn('[GameStateMachine] Animation timeout triggered! Forcing completion after 15s')
          dispatch({ type: 'ANIMATION_COMPLETE' })
        }
      }, ANIMATION_TIMEOUT)

      return () => clearTimeout(timeoutTimer)
    }
  }, [state.phase])

  const handleGameStarting = useCallback((countdown: number) => {
    dispatch({ type: 'GAME_STARTING', countdown })
  }, [])

  const handleCountdownTick = useCallback((countdown: number) => {
    dispatch({ type: 'COUNTDOWN_TICK', countdown })
  }, [])

  const handleAnimationStart = useCallback(() => {
    dispatch({ type: 'ANIMATION_START' })
  }, [])

  const handleAnimationComplete = useCallback(() => {
    dispatch({ type: 'ANIMATION_COMPLETE' })
  }, [])

  const handleGameCompleted = useCallback((winners: any[]) => {
    dispatch({ type: 'GAME_COMPLETED', winners })
  }, [])

  const handleModalDismissed = useCallback(() => {
    dispatch({ type: 'MODAL_DISMISSED' })
  }, [])

  const handleRoomReset = useCallback(() => {
    dispatch({ type: 'ROOM_RESET' })
  }, [])

  const handleUserLeftRoom = useCallback(() => {
    dispatch({ type: 'USER_LEFT_ROOM' })
  }, [])

  return {
    // State
    phase: state.phase,
    countdown: state.countdown,
    winners: state.winners,
    canShowModal: state.canShowModal,
    gameCompletedReceived: state.gameCompletedReceived,
    animationCompleted: state.animationCompleted,
    lastTransition: state.lastTransition,

    // Actions
    handleGameStarting,
    handleCountdownTick,
    handleAnimationStart,
    handleAnimationComplete,
    handleGameCompleted,
    handleModalDismissed,
    handleRoomReset,
    handleUserLeftRoom,

    // Computed helpers
    isCountdownActive: state.phase === 'COUNTDOWN',
    isAnimationPlaying: state.phase === 'ANIMATION_PLAYING' || state.phase === 'ANIMATION_STARTING',
    shouldShowModal: state.phase === 'SHOWING_RESULTS',
    isIdle: state.phase === 'IDLE',
  }
}
