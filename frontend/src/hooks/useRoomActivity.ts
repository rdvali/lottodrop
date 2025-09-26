import { useState, useEffect, useCallback, useRef } from 'react'

export type ActivityType = 'join' | 'leave' | null

interface RoomActivity {
  type: ActivityType
  timestamp: number
}

interface UseRoomActivityReturn {
  activityType: ActivityType
  triggerActivity: (type: 'join' | 'leave') => void
  isAnimating: boolean
}

/**
 * Custom hook to manage room join/leave animation states
 * Handles animation timing and cleanup
 */
export const useRoomActivity = (
  roomId: string,
  duration: number = 1500
): UseRoomActivityReturn => {
  const [activityType, setActivityType] = useState<ActivityType>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activityQueueRef = useRef<RoomActivity[]>([])
  const processingRef = useRef(false)

  // Process activity queue
  const processQueue = useCallback(() => {
    if (processingRef.current || activityQueueRef.current.length === 0) {
      return
    }

    const activity = activityQueueRef.current.shift()
    if (!activity) return

    processingRef.current = true
    setActivityType(activity.type)
    setIsAnimating(true)

    // Clear animation after duration
    timeoutRef.current = setTimeout(() => {
      setActivityType(null)
      setIsAnimating(false)
      processingRef.current = false

      // Process next item in queue if exists
      if (activityQueueRef.current.length > 0) {
        setTimeout(processQueue, 100) // Small delay between animations
      }
    }, duration)
  }, [duration])

  // Trigger new activity
  const triggerActivity = useCallback((type: 'join' | 'leave') => {
    const now = Date.now()

    // Add to queue
    activityQueueRef.current.push({ type, timestamp: now })

    // Limit queue size to prevent memory issues
    if (activityQueueRef.current.length > 5) {
      activityQueueRef.current = activityQueueRef.current.slice(-5)
    }

    // Start processing if not already
    processQueue()
  }, [processQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    activityType,
    triggerActivity,
    isAnimating
  }
}

/**
 * Hook to manage room activity across multiple rooms
 */
export const useRoomActivityManager = () => {
  const [roomActivities, setRoomActivities] = useState<Map<string, ActivityType>>(new Map())
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const triggerRoomActivity = useCallback((roomId: string, type: 'join' | 'leave', duration: number = 1500) => {
    // Clear existing timeout for this room
    const existingTimeout = timeoutsRef.current.get(roomId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new activity
    setRoomActivities(prev => {
      const next = new Map(prev)
      next.set(roomId, type)
      return next
    })

    // Set timeout to clear activity
    const timeout = setTimeout(() => {
      setRoomActivities(prev => {
        const next = new Map(prev)
        next.delete(roomId)
        return next
      })
      timeoutsRef.current.delete(roomId)
    }, duration)

    timeoutsRef.current.set(roomId, timeout)
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      timeoutsRef.current.clear()
    }
  }, [])

  return {
    roomActivities,
    triggerRoomActivity,
    getRoomActivity: (roomId: string) => roomActivities.get(roomId) || null
  }
}