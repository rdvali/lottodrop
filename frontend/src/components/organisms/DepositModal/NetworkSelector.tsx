import { useState } from 'react'
import clsx from 'clsx'
import type { NetworkConfig, CryptoNetwork } from '../../../types/deposit'

interface NetworkSelectorProps {
  networks: NetworkConfig[]
  selectedNetwork: NetworkConfig | null
  onSelect: (network: NetworkConfig) => void
  disabled?: boolean
}

// Network Icons as SVG components
const TronIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#EF0027"
    />
    <path
      d="M21.932 9.913L7.5 7.257l7.595 19.112 10.583-12.894-3.746-3.562zm-.232 1.17l2.208 2.099-6.038 1.093 3.83-3.192zm-5.142 2.058l-6.886 5.94 3.796-9.545 3.09 3.605zm.987.439l6.436-1.165-8.25 10.055 1.814-8.89zm-7.615 4.512l8.878-3.319-1.78 8.727-7.098-5.408z"
      fill="#fff"
    />
  </svg>
)

const EthereumIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#627EEA"
    />
    <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity={0.602} />
    <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff" />
    <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity={0.602} />
    <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="#fff" />
    <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="#fff" fillOpacity={0.2} />
    <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="#fff" fillOpacity={0.602} />
  </svg>
)

const SolanaIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#000"
    />
    <path
      d="M9.925 19.687a.64.64 0 01.453-.188h14.86a.32.32 0 01.227.547l-2.89 2.89a.64.64 0 01-.454.188H7.262a.32.32 0 01-.227-.547l2.89-2.89z"
      fill="url(#solana-gradient-1)"
    />
    <path
      d="M9.925 9.188a.658.658 0 01.453-.188h14.86a.32.32 0 01.227.547l-2.89 2.89a.64.64 0 01-.454.188H7.262a.32.32 0 01-.227-.547l2.89-2.89z"
      fill="url(#solana-gradient-2)"
    />
    <path
      d="M22.121 14.406a.64.64 0 00-.454-.188H6.807a.32.32 0 00-.227.547l2.89 2.89a.64.64 0 00.454.188h14.859a.32.32 0 00.227-.547l-2.89-2.89z"
      fill="url(#solana-gradient-3)"
    />
    <defs>
      <linearGradient id="solana-gradient-1" x1="7.035" y1="23.124" x2="25.465" y2="19.499" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="solana-gradient-2" x1="7.035" y1="12.624" x2="25.465" y2="9" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <linearGradient id="solana-gradient-3" x1="7.035" y1="17.843" x2="25.465" y2="14.218" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
  </svg>
)

const BitcoinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#F7931A"
    />
    <path
      d="M22.5 14.06c.313-2.09-1.28-3.215-3.458-3.965l.707-2.835-1.726-.43-.688 2.76c-.454-.113-.92-.22-1.385-.326l.693-2.778-1.725-.43-.707 2.833c-.376-.086-.744-.17-1.1-.26l.002-.01-2.38-.594-.46 1.843s1.28.293 1.253.312c.698.174.824.635.803 1.001l-.804 3.226c.048.012.11.03.18.058l-.183-.046-1.126 4.516c-.086.212-.302.53-.79.41.017.025-1.254-.313-1.254-.313l-.857 1.975 2.246.56c.418.105.827.215 1.23.318l-.714 2.867 1.724.43.707-2.837c.472.128.93.246 1.38.358l-.706 2.826 1.726.43.714-2.861c2.946.558 5.162.333 6.095-2.332.752-2.144-.037-3.382-1.586-4.188 1.128-.26 1.977-1.003 2.204-2.538zm-3.945 5.53c-.535 2.145-4.152.985-5.325.694l.95-3.806c1.173.293 4.93.872 4.375 3.112zm.534-5.561c-.487 1.953-3.498.96-4.474.717l.861-3.453c.976.243 4.118.697 3.613 2.736z"
      fill="#fff"
    />
  </svg>
)

const LitecoinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z"
      fill="#A6A9AA"
    />
    <path
      d="M12.29 14.573l-1.42.546.532-1.975 1.42-.546 1.54-5.73h3.84l-1.19 4.43 1.42-.545-.533 1.975-1.42.545-2.1 7.814h6.765l-.664 2.477H10.21l1.54-5.73-1.42.546.532-1.976 1.428-.545.002-.286z"
      fill="#fff"
    />
  </svg>
)

// Map network to icon component
const NETWORK_ICONS: Record<CryptoNetwork, React.FC<{ className?: string }>> = {
  TRON: TronIcon,
  Ethereum: EthereumIcon,
  Solana: SolanaIcon,
  Bitcoin: BitcoinIcon,
  Litecoin: LitecoinIcon
}

// Display names for networks
const NETWORK_DISPLAY_NAMES: Record<CryptoNetwork, string> = {
  TRON: 'TRON',
  Ethereum: 'Ethereum Network',
  Solana: 'Solana Network',
  Bitcoin: 'Bitcoin',
  Litecoin: 'Litecoin'
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

  const getNetworkIcon = (network: CryptoNetwork) => {
    const IconComponent = NETWORK_ICONS[network]
    return IconComponent ? <IconComponent className="w-7 h-7" /> : null
  }

  const getDisplayName = (network: NetworkConfig) => {
    const baseName = NETWORK_DISPLAY_NAMES[network.network as CryptoNetwork] || network.network
    return `${baseName} (${network.tokenStandard})`
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
            {getNetworkIcon(selectedNetwork.network as CryptoNetwork)}
            <span className="text-text-primary font-medium">
              {getDisplayName(selectedNetwork)}
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

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1A1A2E] border border-primary/20 rounded-lg shadow-2xl overflow-hidden">
          {networks.map((network) => (
            <button
              key={`${network.network}-${network.tokenStandard}`}
              type="button"
              onClick={() => handleSelect(network)}
              className={clsx(
                'w-full px-4 py-3.5 flex items-center justify-between transition-colors text-left',
                'hover:bg-primary/10 bg-[#1A1A2E]',
                selectedNetwork?.network === network.network &&
                  selectedNetwork?.tokenStandard === network.tokenStandard &&
                  'bg-primary/20'
              )}
            >
              <div className="flex items-center gap-3">
                {getNetworkIcon(network.network as CryptoNetwork)}
                <div>
                  <span className="text-text-primary font-medium block">
                    {getDisplayName(network)}
                  </span>
                  <span className="text-xs text-gray-400">
                    Min: ${network.minAmount} · Max: ${network.maxAmount.toLocaleString()}
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
    </div>
  )
}

export default NetworkSelector
