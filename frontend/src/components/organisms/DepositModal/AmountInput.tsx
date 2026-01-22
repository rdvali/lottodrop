import { useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import type { NetworkConfig } from '../../../types/deposit'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  selectedNetwork: NetworkConfig | null
  disabled?: boolean
}

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000]

const AmountInput = ({
  value,
  onChange,
  selectedNetwork,
  disabled = false
}: AmountInputProps) => {
  const [inputValue, setInputValue] = useState(value.toString())
  const [error, setError] = useState<string | null>(null)

  const minAmount = selectedNetwork?.minAmount ?? 10
  const maxAmount = selectedNetwork?.maxAmount ?? 100000

  // Validate amount
  const validateAmount = useCallback((amount: number): string | null => {
    if (!selectedNetwork) {
      return 'Please select a network first'
    }
    if (isNaN(amount) || amount <= 0) {
      return 'Please enter a valid amount'
    }
    if (amount < minAmount) {
      return `Minimum deposit is $${minAmount}`
    }
    if (amount > maxAmount) {
      return `Maximum deposit is $${maxAmount.toLocaleString()}`
    }
    return null
  }, [selectedNetwork, minAmount, maxAmount])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d.]/g, '')

    // Prevent multiple decimals
    const parts = rawValue.split('.')
    const cleanValue = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : rawValue

    setInputValue(cleanValue)

    const numValue = parseFloat(cleanValue) || 0
    const validationError = validateAmount(numValue)
    setError(validationError)

    if (!validationError) {
      onChange(numValue)
    }
  }

  // Handle blur - format value
  const handleBlur = () => {
    const numValue = parseFloat(inputValue) || 0
    if (numValue > 0) {
      setInputValue(numValue.toFixed(2))
    }
  }

  // Handle quick amount selection
  const handleQuickAmount = (amount: number) => {
    if (disabled) return
    setInputValue(amount.toFixed(2))
    onChange(amount)
    setError(validateAmount(amount))
  }

  // Sync with external value changes
  useEffect(() => {
    if (value !== parseFloat(inputValue)) {
      setInputValue(value > 0 ? value.toFixed(2) : '')
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Revalidate when network changes
  useEffect(() => {
    if (value > 0) {
      const validationError = validateAmount(value)
      setError(validationError)
    }
  }, [selectedNetwork, value, validateAmount])

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Amount (USDT)
      </label>

      {/* Main input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled || !selectedNetwork}
          placeholder="0.00"
          className={clsx(
            'w-full pl-8 pr-16 py-3 rounded-lg border text-lg font-medium transition-all',
            'bg-dark-bg placeholder-gray-500 text-text-primary',
            disabled || !selectedNetwork
              ? 'opacity-50 cursor-not-allowed'
              : 'focus:outline-none focus:ring-2 focus:ring-primary/50',
            error
              ? 'border-red-500/50 focus:border-red-500'
              : 'border-primary/20 focus:border-primary'
          )}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          USDT
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Quick amount buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.filter(amt => amt >= minAmount && amt <= maxAmount).map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleQuickAmount(amount)}
            disabled={disabled || !selectedNetwork}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              'border',
              disabled || !selectedNetwork
                ? 'opacity-50 cursor-not-allowed border-gray-600 text-gray-500'
                : value === amount
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-dark-bg border-primary/20 text-gray-300 hover:border-primary/40 hover:text-primary'
            )}
          >
            ${amount}
          </button>
        ))}
      </div>

      {/* Min/Max info */}
      {selectedNetwork && (
        <p className="text-xs text-gray-400">
          Min: ${minAmount} | Max: ${maxAmount.toLocaleString()} USDT
        </p>
      )}
    </div>
  )
}

export default AmountInput
