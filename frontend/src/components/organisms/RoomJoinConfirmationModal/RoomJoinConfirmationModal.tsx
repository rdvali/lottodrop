import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Badge } from '@components/atoms'
import { Modal } from '@components/organisms'
import type { Room } from '../../../types'
import styles from './RoomJoinConfirmationModal.module.css'
import clsx from 'clsx'

interface RoomJoinConfirmationModalProps {
  room: Room | null
  userBalance: number
  isOpen: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const RoomJoinConfirmationModal = ({
  room,
  userBalance,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}: RoomJoinConfirmationModalProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Focus on cancel button by default for safety
      setTimeout(() => cancelButtonRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!room) return null

  const balanceAfterJoin = userBalance - room.entryFee
  const hasInsufficientBalance = balanceAfterJoin < 0
  const isLowBalance = balanceAfterJoin < room.entryFee // Can't join another room after this

  const getRoomTypeColor = () => {
    switch (room.type) {
      case 'fast_drop':
        return 'primary'
      case 'time_drop':
        return 'info'
      case 'special':
        return 'warning'
      default:
        return 'default'
    }
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: { duration: 0.2 }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onCancel}
          title="Confirm Room Entry"
          className={styles.confirmationModal}
        >
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={styles.modalContent}
          >
            {/* Room Information Section */}
            <div className={styles.roomInfo}>
              <div className={styles.roomHeader}>
                <h3 className={styles.roomName}>{room.name}</h3>
                <Badge variant={getRoomTypeColor() as any} size="md">
                  {room.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Entry Fee</span>
                  <span className={clsx(styles.statValue, styles.entryFee)}>
                    ${room.entryFee.toLocaleString()}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Prize Pool</span>
                  <span className={clsx(styles.statValue, styles.prizePool)}>
                    ${room.prizePool.toLocaleString()}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Players</span>
                  <span className={styles.statValue}>
                    {room.currentParticipants}/{room.maxParticipants}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Winners</span>
                  <span className={styles.statValue}>{room.winnersCount}</span>
                </div>
              </div>
            </div>

            {/* Financial Impact Section */}
            <motion.div
              className={styles.financialSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.balanceInfo}>
                <div className={styles.balanceRow}>
                  <span>Current Balance:</span>
                  <span className={styles.currentBalance}>
                    ${userBalance.toLocaleString()}
                  </span>
                </div>
                <div className={styles.balanceRow}>
                  <span>Entry Fee:</span>
                  <span className={styles.feeAmount}>
                    -${room.entryFee.toLocaleString()}
                  </span>
                </div>
                <div className={clsx(styles.balanceRow, styles.divider)}>
                  <span>Balance After Join:</span>
                  <span className={clsx(
                    styles.remainingBalance,
                    hasInsufficientBalance && styles.insufficient,
                    isLowBalance && !hasInsufficientBalance && styles.low
                  )}>
                    ${balanceAfterJoin.toLocaleString()}
                  </span>
                </div>
              </div>

              {hasInsufficientBalance && (
                <motion.div
                  className={styles.warningBox}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  ⚠️ Insufficient balance to join this room
                </motion.div>
              )}

              {isLowBalance && !hasInsufficientBalance && (
                <motion.div
                  className={styles.cautionBox}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  ⚠️ This will be your last room with current balance
                </motion.div>
              )}
            </motion.div>

            {/* Confirmation Question - More compact on mobile */}
            {!isMobile ? (
              <div className={styles.confirmationText}>
                <p>Are you sure you want to join this room?</p>
                {!hasInsufficientBalance && (
                  <p className={styles.subText}>
                    ${room.entryFee} will be deducted from your balance
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.confirmationText}>
                <p>Confirm ${room.entryFee} entry fee?</p>
              </div>
            )}

            {/* Action Buttons */}
            <motion.div
              className={styles.actionButtons}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                ref={cancelButtonRef}
                variant="secondary"
                size="lg"
                onClick={onCancel}
                disabled={isLoading}
                className={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={onConfirm}
                disabled={hasInsufficientBalance || isLoading}
                isLoading={isLoading}
                className={styles.confirmButton}
              >
                {isLoading ? 'Joining...' : 'Yes, Join Room'}
              </Button>
            </motion.div>

            {/* Terms Notice - Hide on mobile to save space */}
            {!isMobile && (
              <motion.p
                className={styles.termsNotice}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.4 }}
              >
                By joining, you agree to the game rules and understand this is a game of chance
              </motion.p>
            )}
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  )
}

export default RoomJoinConfirmationModal