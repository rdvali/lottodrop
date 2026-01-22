import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  DepositStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  type CryptoDeposit
} from '../../../types/deposit'

interface DepositStatusDisplayProps {
  deposit: CryptoDeposit
  onClose?: () => void
  onNewDeposit?: () => void
}

const StatusIcon = ({ status }: { status: DepositStatus }) => {
  switch (status) {
    case DepositStatus.CONFIRMED:
    case DepositStatus.OVERPAID:
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )

    case DepositStatus.PENDING:
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 border-yellow-400/30 border-t-yellow-400"
        />
      )

    case DepositStatus.EXPIRED:
    case DepositStatus.FAILED:
    case DepositStatus.CANCELED:
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </motion.div>
      )

    case DepositStatus.UNDERPAID:
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      )

    default:
      return null
  }
}

const DepositStatusDisplay = ({
  deposit,
  onClose,
  onNewDeposit
}: DepositStatusDisplayProps) => {
  const isSuccess = deposit.status === DepositStatus.CONFIRMED || deposit.status === DepositStatus.OVERPAID
  const isFailed = [DepositStatus.EXPIRED, DepositStatus.FAILED, DepositStatus.CANCELED].includes(deposit.status)
  const isPending = deposit.status === DepositStatus.PENDING

  return (
    <div className="space-y-6">
      {/* Status icon */}
      <div className="flex justify-center">
        <StatusIcon status={deposit.status} />
      </div>

      {/* Status text */}
      <div className="text-center">
        <h3 className={clsx('text-xl font-bold', STATUS_COLORS[deposit.status])}>
          {STATUS_LABELS[deposit.status]}
        </h3>
        <p className="text-gray-400 mt-1">
          {isPending && 'Waiting for blockchain confirmations...'}
          {isSuccess && 'Your deposit has been credited!'}
          {deposit.status === DepositStatus.EXPIRED && 'This deposit request has expired'}
          {deposit.status === DepositStatus.FAILED && 'The deposit could not be processed'}
          {deposit.status === DepositStatus.UNDERPAID && 'The received amount was less than expected'}
        </p>
      </div>

      {/* Amount details */}
      <div className="space-y-3 p-4 rounded-lg bg-dark-bg border border-primary/10">
        <div className="flex justify-between">
          <span className="text-gray-400">Expected</span>
          <span className="text-text-primary font-medium">
            {deposit.expectedAmount.toFixed(2)} USDT
          </span>
        </div>

        {deposit.receivedAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Received</span>
            <span
              className={clsx(
                'font-medium',
                deposit.receivedAmount >= deposit.expectedAmount
                  ? 'text-green-400'
                  : 'text-orange-400'
              )}
            >
              {deposit.receivedAmount.toFixed(2)} USDT
            </span>
          </div>
        )}

        {deposit.feeAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Fee</span>
            <span className="text-gray-300">
              -{deposit.feeAmount.toFixed(2)} USDT
            </span>
          </div>
        )}

        {isSuccess && deposit.netAmount > 0 && (
          <div className="flex justify-between pt-3 border-t border-primary/10">
            <span className="text-gray-300 font-medium">Credited</span>
            <span className="text-green-400 font-bold text-lg">
              ${deposit.netAmount.toFixed(2)}
            </span>
          </div>
        )}

        {/* Confirmations */}
        {deposit.confirmations !== undefined && deposit.confirmations > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">Confirmations</span>
            <span className="text-text-primary font-medium">
              {deposit.confirmations}
            </span>
          </div>
        )}

        {/* Transaction hash */}
        {deposit.txHash && (
          <div className="pt-3 border-t border-primary/10">
            <span className="text-gray-400 text-sm block mb-1">Transaction Hash</span>
            <code className="text-xs text-primary break-all">
              {deposit.txHash}
            </code>
          </div>
        )}
      </div>

      {/* Network info */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <span>{deposit.network}</span>
        <span>|</span>
        <span>{deposit.tokenStandard}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {(isSuccess || isFailed) && onNewDeposit && (
          <button
            type="button"
            onClick={onNewDeposit}
            className={clsx(
              'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
              'bg-primary/20 text-primary hover:bg-primary/30'
            )}
          >
            New Deposit
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
              isSuccess
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            )}
          >
            {isSuccess ? 'Done' : 'Close'}
          </button>
        )}
      </div>
    </div>
  )
}

export default DepositStatusDisplay
