import React, { useEffect, useState } from 'react'
import type { Notification } from '../../../types'
import './RoundResultModal.css'

interface RoundResultModalProps {
  notification: Notification | null
  isOpen: boolean
  onClose: () => void
}

export function RoundResultModal({ notification, isOpen, onClose }: RoundResultModalProps): React.ReactElement | null {
  const [showConfetti, setShowConfetti] = useState(false)

  // Determine if this is a win or loss
  const isWin = notification ? (
    (notification.type === 'success' && notification.isJackpot) ||
    notification.type === 'jackpot' ||
    (notification.amount && notification.amount > 0)
  ) : false

  // Simple confetti effect for wins only
  useEffect(() => {
    if (isOpen && isWin) {
      setShowConfetti(true)
      const timeout = setTimeout(() => setShowConfetti(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [isOpen, isWin])

  if (!isOpen || !notification) {
    return null
  }

  // Simple data extraction
  const data = notification.data as Record<string, any> | undefined
  const amount = notification.amount || (data?.amount as number) || 0
  const displayAmount = Math.abs(amount) / 100

  // Get room name directly from notification data
  const roomName = data?.roomName || 'Game Room'

  return (
    <>
      {/* Backdrop */}
      <div
        className="round-result-modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Simple Confetti for wins */}
      {showConfetti && (
        <div className="round-result-modal__confetti" aria-hidden="true">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="round-result-modal__confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'][Math.floor(Math.random() * 3)]
              }}
            />
          ))}
        </div>
      )}

      {/* Minimal Modal */}
      <div
        className={`round-result-modal round-result-modal--${isWin ? 'win' : 'loss'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="round-result-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="round-result-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        {/* Content */}
        <div className="round-result-modal__content">
          {/* Title with emoji */}
          <div className="round-result-modal__emoji">
            {isWin ? '🎉' : '😔'}
          </div>

          <h2 id="round-result-title" className="round-result-modal__title">
            {isWin ? 'Congratulations!' : 'Better luck next time!'}
          </h2>

          {/* Room name */}
          <p className="round-result-modal__room">{roomName}</p>

          {/* Amount */}
          <div className="round-result-modal__amount">
            <span className="round-result-modal__amount-sign">
              {isWin ? '+' : '-'}
            </span>
            <span className="round-result-modal__amount-value">
              ${displayAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default RoundResultModal