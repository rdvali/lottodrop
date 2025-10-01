import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './RoundResultNotification.css';

export interface RoundResultData {
  id: string;
  roundId: string;
  roomId: string;
  roomName: string;
  result: 'WIN' | 'LOST' | 'REFUND' | 'DRAW';
  amount?: number;
  position?: number;
  totalPlayers?: number;
  timestamp: string;
  userId: string;
}

interface RoundResultNotificationProps {
  data: RoundResultData;
  onDismiss?: (id: string) => void;
  autoClose?: boolean;
  duration?: number;
}

export const RoundResultNotification: React.FC<RoundResultNotificationProps> = ({
  data,
  onDismiss,
  autoClose = true,
  duration = 8000
}) => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.(data.id);
    }, 300);
  };

  const handleNavigate = () => {
    navigate(`/room/${data.roomId}`);
    handleDismiss();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderContent = () => {
    switch (data.result) {
      case 'WIN':
        return {
          headline: `🎉 Congratulations! $${data.amount?.toFixed(2) || '0.00'}`,
          subtext: `You won $${data.amount?.toFixed(2) || '0.00'} in Room ${data.roomName}.${data.position ? ` Position: #${data.position}` : ''}`,
          badgeClass: 'badge-win',
          cardClass: 'card-win'
        };
      case 'LOST':
        return {
          headline: 'Game Completed',
          subtext: `Better luck next time! You lost in Room ${data.roomName}.`,
          badgeClass: 'badge-lost',
          cardClass: 'card-lost'
        };
      case 'REFUND':
        return {
          headline: 'Round Refunded',
          subtext: `This round in Room ${data.roomName} was refunded.`,
          badgeClass: 'badge-refund',
          cardClass: 'card-refund'
        };
      case 'DRAW':
        return {
          headline: 'Round Draw',
          subtext: `The round ended in a draw in Room ${data.roomName}.`,
          badgeClass: 'badge-draw',
          cardClass: 'card-draw'
        };
      default:
        return {
          headline: 'Round Completed',
          subtext: `Round finished in Room ${data.roomName}.`,
          badgeClass: 'badge-default',
          cardClass: 'card-default'
        };
    }
  };

  const content = renderContent();

  return (
    <motion.div
      className={`round-result-notification ${content.cardClass} ${isExiting ? 'exiting' : ''}`}
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      role="alert"
      aria-live="polite"
    >
      <button
        className="notification-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>

      <div className={`notification-badge ${content.badgeClass}`}>
        {data.result}
      </div>

      <div className="notification-content">
        <div className="notification-header">
          <div className="room-icon">🎰</div>
          <div className="notification-text">
            <h4 className="notification-headline">{content.headline}</h4>
            <p className="notification-subtext">{content.subtext}</p>
          </div>
        </div>

        <div className="notification-footer">
          <span className="notification-time">{getTimeAgo(data.timestamp)}</span>
          <button
            className="notification-action"
            onClick={handleNavigate}
            aria-label={`View game result for ${data.roomName}`}
          >
            GAME RESULT
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RoundResultNotification;