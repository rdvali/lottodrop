// Network Icons for cryptocurrency networks
// Reusable component for displaying crypto network icons

import clsx from 'clsx'

export type CryptoNetworkType = 'TRON' | 'Ethereum' | 'Solana' | 'Bitcoin' | 'Litecoin'
export type CryptoCurrencyType = 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'LTC'

interface NetworkIconProps {
  network: CryptoNetworkType | string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface CryptoTransactionIconProps {
  currency: CryptoCurrencyType | string
  network: CryptoNetworkType | string
  className?: string
}

// Currency Icons (main token icons)
const USDTIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#26A17B" />
    <path
      d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
      fill="#fff"
    />
  </svg>
)

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
const NETWORK_ICONS: Record<string, React.FC<{ className?: string }>> = {
  TRON: TronIcon,
  Ethereum: EthereumIcon,
  Solana: SolanaIcon,
  Bitcoin: BitcoinIcon,
  Litecoin: LitecoinIcon
}

// Map currency to icon component
const CURRENCY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  USDT: USDTIcon,
  BTC: BitcoinIcon,
  ETH: EthereumIcon,
  SOL: SolanaIcon,
  LTC: LitecoinIcon
}

// Size classes
const SIZE_CLASSES = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10'
}

/**
 * NetworkIcon component
 * Displays the icon for a cryptocurrency network
 */
const NetworkIcon = ({ network, className, size = 'md' }: NetworkIconProps) => {
  const IconComponent = NETWORK_ICONS[network]

  if (!IconComponent) {
    // Fallback: show a generic crypto icon
    return (
      <div className={clsx(
        'rounded-full bg-gray-600 flex items-center justify-center text-white font-bold',
        SIZE_CLASSES[size],
        className
      )}>
        {network.charAt(0).toUpperCase()}
      </div>
    )
  }

  return <IconComponent className={clsx(SIZE_CLASSES[size], className)} />
}

export default NetworkIcon

/**
 * CryptoTransactionIcon component
 * Displays currency icon (USDT) with network icon as a badge overlay
 * Common pattern used by exchanges to show token on specific network
 */
export const CryptoTransactionIcon = ({
  currency,
  network,
  className
}: CryptoTransactionIconProps) => {
  const CurrencyIcon = CURRENCY_ICONS[currency] || CURRENCY_ICONS['USDT']
  const NetworkIconComponent = NETWORK_ICONS[network]

  return (
    <div className={clsx('relative inline-flex', className)}>
      {/* Main currency icon */}
      <div className="w-10 h-10">
        <CurrencyIcon className="w-full h-full" />
      </div>

      {/* Network badge - positioned bottom-right with offset */}
      {NetworkIconComponent && (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ring-2 ring-dark-bg">
          <NetworkIconComponent className="w-full h-full" />
        </div>
      )}
    </div>
  )
}

// Helper function to extract network from description
export function extractNetworkFromDescription(description: string): CryptoNetworkType | null {
  const networks: CryptoNetworkType[] = ['TRON', 'Ethereum', 'Solana', 'Bitcoin', 'Litecoin']

  for (const network of networks) {
    if (description.toLowerCase().includes(network.toLowerCase())) {
      return network
    }
  }

  return null
}

// Helper function to extract currency from description
export function extractCurrencyFromDescription(description: string): CryptoCurrencyType {
  if (description.toLowerCase().includes('usdt')) return 'USDT'
  if (description.toLowerCase().includes('btc') || description.toLowerCase().includes('bitcoin')) return 'BTC'
  if (description.toLowerCase().includes('eth')) return 'ETH'
  if (description.toLowerCase().includes('sol')) return 'SOL'
  if (description.toLowerCase().includes('ltc')) return 'LTC'
  return 'USDT' // Default to USDT
}
