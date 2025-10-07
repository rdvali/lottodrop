import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RoundResultNotification, RoundResultData } from '../../molecules/RoundResultNotification';
import { socketService } from '../../../services/socket/socket.service';
import { useAuth } from '../../../contexts/AuthContext';
import './NotificationsRoot.css';

interface NotificationsRootProps {
  maxVisible?: number;
  defaultDuration?: number;
}

export const NotificationsRoot: React.FC<NotificationsRootProps> = ({
  maxVisible = 5,
  defaultDuration = 8000
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RoundResultData[]>([]);
  const processedIds = useRef<Set<string>>(new Set());
  const dedupeWindow = useRef<Map<string, number>>(new Map());

  // Cleanup old deduplication entries
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      dedupeWindow.current.forEach((time, key) => {
        if (now - time > 5000) { // 5 second deduplication window
          expired.push(key);
        }
      });

      expired.forEach(key => dedupeWindow.current.delete(key));
    }, 10000); // Cleanup every 10 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Create notification from round data
  const createNotification = useCallback((roundData: any): RoundResultData | null => {
    if (!user) return null;

    // Generate unique deduplication key
    const dedupeKey = `${roundData.roundId}-${roundData.userId || user.id}-${roundData.roomId}`;

    // Check if we've seen this recently
    if (dedupeWindow.current.has(dedupeKey)) {
      return null;
    }

    // Add to deduplication window
    dedupeWindow.current.set(dedupeKey, Date.now());

    // Determine result type
    let result: 'WIN' | 'LOST' | 'REFUND' | 'DRAW' = 'LOST';
    if (roundData.isWinner) {
      result = 'WIN';
    } else if (roundData.isRefund) {
      result = 'REFUND';
    } else if (roundData.isDraw) {
      result = 'DRAW';
    }

    const notificationId = `round-${roundData.roundId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: notificationId,
      roundId: roundData.roundId,
      roomId: roundData.roomId,
      roomName: roundData.roomName || `Room ${roundData.roomId}`,
      result,
      amount: roundData.prizeAmount || roundData.winnerAmount || roundData.amount || 0,
      position: roundData.position,
      totalPlayers: roundData.totalPlayers || roundData.totalParticipants,
      timestamp: roundData.timestamp || new Date().toISOString(),
      userId: roundData.userId || user.id
    };
  }, [user]);

  // Handle multi-round completion
  const handleMultiRoundCompleted = useCallback((data: any) => {
    if (!user || data.userId !== user.id) return;

    const newNotifications: RoundResultData[] = [];

    data.rounds.forEach((round: any) => {
      const notification = createNotification({
        ...round,
        userId: data.userId
      });

      if (notification && !processedIds.current.has(notification.roundId)) {
        newNotifications.push(notification);
        processedIds.current.add(notification.roundId);
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, maxVisible * 2));
    }
  }, [user, createNotification, maxVisible]);

  // Handle personal round completion
  const handlePersonalRoundCompleted = useCallback((data: any) => {
    if (!user || data.userId !== user.id) return;

    const notification = createNotification(data);

    if (notification && !processedIds.current.has(notification.roundId)) {
      processedIds.current.add(notification.roundId);
      setNotifications(prev => [notification, ...prev].slice(0, maxVisible * 2));
    }
  }, [user, createNotification, maxVisible]);

  // Handle global game completed (for winner announcements)
  const handleGlobalGameCompleted = useCallback((data: any) => {
    if (!user) return;

    // Check if current user is among winners
    let currentUserWon = false;
    let currentUserData = null;

    if (data.isMultiWinner && data.winners) {
      const winner = data.winners.find((w: any) => w.userId === user.id);
      if (winner) {
        currentUserWon = true;
        currentUserData = {
          ...winner,
          roomId: data.roomId,
          roomName: data.roomName,
          roundId: data.roundId,
          isWinner: true
        };
      }
    } else if (!data.isMultiWinner && data.winnerId === user.id) {
      currentUserWon = true;
      currentUserData = {
        userId: data.winnerId,
        roomId: data.roomId,
        roomName: data.roomName,
        roundId: data.roundId,
        isWinner: true,
        prizeAmount: data.winnerAmount,
        position: 1
      };
    }

    // If user won, create a WIN notification
    if (currentUserWon && currentUserData) {
      const notification = createNotification(currentUserData);

      if (notification && !processedIds.current.has(notification.roundId)) {
        processedIds.current.add(notification.roundId);
        setNotifications(prev => [notification, ...prev].slice(0, maxVisible * 2));
      }
    }
  }, [user, createNotification, maxVisible]);

  // Handle notification dismissal
  const handleDismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Register socket event listeners
  useEffect(() => {
    if (!socketService.isConnected || !user) return;

    // Register event handlers
    socketService.onMultiRoundCompleted(handleMultiRoundCompleted);
    socketService.onPersonalRoundCompleted(handlePersonalRoundCompleted);
    socketService.onGlobalGameCompleted(handleGlobalGameCompleted);

    // Cleanup
    return () => {
      socketService.offMultiRoundCompleted(handleMultiRoundCompleted);
      socketService.offPersonalRoundCompleted(handlePersonalRoundCompleted);
      socketService.offGlobalGameCompleted(handleGlobalGameCompleted);
    };
  }, [user, handleMultiRoundCompleted, handlePersonalRoundCompleted, handleGlobalGameCompleted]);

  // Clean up old processed IDs periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (processedIds.current.size > 100) {
        processedIds.current.clear();
      }
    }, 60000); // Every minute

    return () => clearInterval(cleanup);
  }, []);

  // Only show visible notifications
  const visibleNotifications = notifications.slice(0, maxVisible);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div
      className="notifications-root"
      role="region"
      aria-label="Game notifications"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <RoundResultNotification
            key={notification.id}
            data={notification}
            onDismiss={handleDismiss}
            autoClose={true}
            duration={defaultDuration}
          />
        ))}
      </AnimatePresence>

      {notifications.length > maxVisible && (
        <div className="notifications-overflow">
          +{notifications.length - maxVisible} more notifications
        </div>
      )}
    </div>
  );
};

export default NotificationsRoot;