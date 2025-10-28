import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { Winner } from '../types'

/**
 * WinnerResultsContext - Decoupled modal data lifecycle
 *
 * Fixes: BUG-005, BUG-012, BUG-017
 *
 * Problem: Winner modal data was tied to room state, causing data loss
 * when room status changed to 'waiting' before user dismissed modal.
 *
 * Solution: Store winner results in separate context that persists
 * independently of room state changes until explicit user dismissal.
 */

export interface WinnerResultsData {
  winners: Winner[]
  prizePool: number
  platformFeeAmount?: number
  platformFeeRate?: number
  roundId: string
  timestamp: number
  wasParticipant: boolean
  roomStatus?: 'waiting' | 'in_progress' | 'completed'
  entryFee?: number
  vrfSeed?: string
  vrfProof?: string
}

interface WinnerResultsContextType {
  // Current results being displayed
  currentResults: WinnerResultsData | null

  // Whether modal should be shown
  isModalOpen: boolean

  // Set new winner results (triggers modal opening)
  setWinnerResults: (data: WinnerResultsData) => void

  // Update room status in current results (for Join Room button)
  updateRoomStatus: (status: 'waiting' | 'in_progress' | 'completed') => void

  // Dismiss modal and clear results
  dismissResults: () => void

  // Check if results are still "fresh" (within display time)
  isFresh: boolean

  // Time remaining until results can be auto-cleared (in ms)
  timeRemaining: number
}

const WinnerResultsContext = createContext<WinnerResultsContextType | undefined>(undefined)

const MINIMUM_DISPLAY_TIME = 10000 // 10 seconds minimum display time

export const WinnerResultsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentResults, setCurrentResults] = useState<WinnerResultsData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [displayStartTime, setDisplayStartTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Ref to prevent duplicate result setting
  const lastRoundIdRef = useRef<string | null>(null)

  // Calculate if results are still fresh (within minimum display time)
  const isFresh = displayStartTime !== null && (Date.now() - displayStartTime) < MINIMUM_DISPLAY_TIME

  // Set new winner results and open modal
  const setWinnerResults = useCallback((data: WinnerResultsData) => {
    // Prevent duplicate results for same round
    if (lastRoundIdRef.current === data.roundId) {
      console.warn('[WinnerResultsContext] Duplicate results for round:', data.roundId)
      return
    }

    console.log('[WinnerResultsContext] Setting new winner results:', {
      roundId: data.roundId,
      winnersCount: data.winners.length,
      prizePool: data.prizePool,
      timestamp: data.timestamp
    })

    lastRoundIdRef.current = data.roundId
    setCurrentResults(data)
    setIsModalOpen(true)
    setDisplayStartTime(Date.now())
  }, [])

  // Update room status in current results (for dynamic button state)
  const updateRoomStatus = useCallback((status: 'waiting' | 'in_progress' | 'completed') => {
    setCurrentResults(prev => {
      if (!prev) return null
      return {
        ...prev,
        roomStatus: status
      }
    })
  }, [])

  // Dismiss modal and clear results
  const dismissResults = useCallback(() => {
    console.log('[WinnerResultsContext] Dismissing results')
    setIsModalOpen(false)

    // Small delay before clearing data to allow modal close animation
    setTimeout(() => {
      setCurrentResults(null)
      setDisplayStartTime(null)
      setTimeRemaining(0)
      lastRoundIdRef.current = null
    }, 300)
  }, [])

  // Update time remaining counter
  useEffect(() => {
    if (!displayStartTime || !isModalOpen) {
      setTimeRemaining(0)
      return
    }

    const updateTimer = () => {
      const elapsed = Date.now() - displayStartTime
      const remaining = Math.max(0, MINIMUM_DISPLAY_TIME - elapsed)
      setTimeRemaining(remaining)
    }

    // Update immediately
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [displayStartTime, isModalOpen])

  // Auto-clear results after minimum display time + buffer (optional safety)
  // This is a safety mechanism - manual dismissal is preferred
  useEffect(() => {
    if (!currentResults || !displayStartTime || isModalOpen) {
      return
    }

    // If modal is closed and results are stale (older than 30 seconds), clear them
    const STALE_THRESHOLD = 30000 // 30 seconds
    const elapsed = Date.now() - displayStartTime

    if (elapsed > STALE_THRESHOLD) {
      console.log('[WinnerResultsContext] Auto-clearing stale results (30s elapsed)')
      setCurrentResults(null)
      setDisplayStartTime(null)
      lastRoundIdRef.current = null
    }
  }, [currentResults, displayStartTime, isModalOpen])

  const value: WinnerResultsContextType = {
    currentResults,
    isModalOpen,
    setWinnerResults,
    updateRoomStatus,
    dismissResults,
    isFresh,
    timeRemaining
  }

  return (
    <WinnerResultsContext.Provider value={value}>
      {children}
    </WinnerResultsContext.Provider>
  )
}

export const useWinnerResults = (): WinnerResultsContextType => {
  const context = useContext(WinnerResultsContext)
  if (!context) {
    throw new Error('useWinnerResults must be used within WinnerResultsProvider')
  }
  return context
}
