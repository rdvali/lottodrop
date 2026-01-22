import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import clsx from 'clsx'
import type { CreateDepositResponse } from '../../../types/deposit'

interface DepositAddressProps {
  deposit: CreateDepositResponse
  onExpired?: () => void
}

const DepositAddress = ({ deposit, onExpired }: DepositAddressProps) => {
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Calculate time remaining
  const calculateTimeLeft = useCallback(() => {
    const expiresAt = new Date(deposit.expiresAt).getTime()
    const now = Date.now()
    const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
    return diff
  }, [deposit.expiresAt])

  // Countdown timer
  useEffect(() => {
    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timer)
        onExpired?.()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [calculateTimeLeft, onExpired])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Truncate address for display (show first 8 and last 8 characters)
  const truncateAddress = (address: string): string => {
    if (address.length <= 20) return address
    return `${address.slice(0, 10)}...${address.slice(-10)}`
  }

  // Copy address to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deposit.depositAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const isExpired = timeLeft <= 0
  const isLowTime = timeLeft <= 300 && timeLeft > 0 // Less than 5 minutes

  return (
    <div className="space-y-4">
      {/* Timer - more compact */}
      <div
        className={clsx(
          'flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          isExpired
            ? 'bg-red-500/20 text-red-400'
            : isLowTime
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-primary/10 text-primary'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-medium">
          {isExpired ? 'Expired' : `Expires in ${formatTime(timeLeft)}`}
        </span>
      </div>

      {/* Amount info - more compact */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Send exactly</p>
        <p className="text-2xl font-bold text-text-primary">
          {deposit.expectedAmount.toFixed(2)} USDT
        </p>
        <p className="text-xs text-gray-400">
          via {deposit.network} ({deposit.tokenStandard})
        </p>
      </div>

      {/* QR Code - smaller */}
      <div className="flex justify-center">
        <div
          className={clsx(
            'p-3 bg-white rounded-lg',
            isExpired && 'opacity-50'
          )}
        >
          <QRCodeSVG
            value={deposit.depositAddress}
            size={140}
            level="H"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
      </div>

      {/* Address - clickable to copy */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Deposit Address
        </label>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isExpired}
          className={clsx(
            'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all',
            'bg-[#1A1A2E] border-primary/20',
            isExpired
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
          )}
        >
          <code className="text-sm text-text-primary font-mono tracking-wide">
            {truncateAddress(deposit.depositAddress)}
          </code>
          <div
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
              copied
                ? 'bg-green-500/20 text-green-400'
                : 'bg-primary/10 text-primary'
            )}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </div>
        </button>
      </div>

      {/* Warning - more compact, single line style */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <svg
          className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-xs text-yellow-200/90 leading-relaxed">
          Only send <span className="font-semibold text-yellow-200">USDT</span> on the{' '}
          <span className="font-semibold text-yellow-200">{deposit.network}</span> network.
          Sending other tokens will result in permanent loss.
        </p>
      </div>
    </div>
  )
}

export default DepositAddress
