import { useState } from 'react'
import clsx from 'clsx'
import type { NetworkConfig, CryptoNetwork } from '../../../types/deposit'

interface NetworkSelectorProps {
  networks: NetworkConfig[]
  selectedNetwork: NetworkConfig | null
  onSelect: (network: NetworkConfig) => void
  disabled?: boolean
}

const NETWORK_COLORS: Record<CryptoNetwork, string> = {
  TRON: 'text-red-400 border-red-400/30 bg-red-400/10',
  Ethereum: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  Solana: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  Bitcoin: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  Litecoin: 'text-gray-400 border-gray-400/30 bg-gray-400/10'
}

const NetworkSelector = ({
  networks,
  selectedNetwork,
  onSelect,
  disabled = false
}: NetworkSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (network: NetworkConfig) => {
    if (disabled) return
    onSelect(network)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select Network
      </label>

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full px-4 py-3 rounded-lg border transition-all text-left flex items-center justify-between',
          'bg-dark-bg border-primary/20',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-primary/40 cursor-pointer',
          isOpen && 'border-primary ring-1 ring-primary/30'
        )}
      >
        {selectedNetwork ? (
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'px-2 py-1 rounded text-xs font-semibold',
                NETWORK_COLORS[selectedNetwork.network as CryptoNetwork]
              )}
            >
              {selectedNetwork.tokenStandard}
            </span>
            <span className="text-text-primary font-medium">
              {selectedNetwork.displayName}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">Choose a network...</span>
        )}
        <svg
          className={clsx(
            'w-5 h-5 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-dark-bg border border-primary/20 rounded-lg shadow-xl overflow-hidden">
          {networks.map((network) => (
            <button
              key={`${network.network}-${network.tokenStandard}`}
              type="button"
              onClick={() => handleSelect(network)}
              className={clsx(
                'w-full px-4 py-3 flex items-center justify-between transition-colors text-left',
                'hover:bg-primary/10',
                selectedNetwork?.network === network.network &&
                  selectedNetwork?.tokenStandard === network.tokenStandard &&
                  'bg-primary/20'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-semibold',
                    NETWORK_COLORS[network.network as CryptoNetwork]
                  )}
                >
                  {network.tokenStandard}
                </span>
                <div>
                  <span className="text-text-primary font-medium block">
                    {network.displayName}
                  </span>
                  <span className="text-xs text-gray-400">
                    Min: ${network.minAmount} - Max: ${network.maxAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              {selectedNetwork?.network === network.network &&
                selectedNetwork?.tokenStandard === network.tokenStandard && (
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
            </button>
          ))}
        </div>
      )}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default NetworkSelector
