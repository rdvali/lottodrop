import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Button, Logo } from '@components/atoms'
import { formatCurrency } from '../../../utils/currencyUtils'
import { useBalanceVisibility } from '@contexts/BalanceVisibilityContext'
import { useAudioManager } from '@hooks/useAudioManager'
import { useModal } from '@hooks/useModal'

// Eye icon (balance visible)
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

// EyeOff icon (balance hidden)
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// Sound On icon
const SoundOnIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
)

// Sound Off icon
const SoundOffIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
)

export interface HeaderProps {
  user?: {
    id: string
    username: string
    balance: number
  }
  onLogin?: () => void
  onLogout?: () => void
}

const Header = ({ user, onLogin, onLogout }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { isVisible: balanceVisible, toggleVisibility: toggleBalanceVisibility } = useBalanceVisibility()
  const { isEnabled: audioEnabled, toggleAudio } = useAudioManager()
  const { openDepositModal } = useModal()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])
  
  return (
    <header className="bg-secondary-bg border-b border-primary/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo size="md" showText={true} />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-300 hover:text-text-primary transition-colors"
            >
              Lobby
            </Link>
            <Link
              to="/results"
              className="text-gray-300 hover:text-text-primary transition-colors"
            >
              Results
            </Link>
            <Link
              to="/how-to-play"
              className="text-gray-300 hover:text-text-primary transition-colors"
            >
              How To Play
            </Link>
            <Link
              to="/how-to-deposit"
              className="text-gray-300 hover:text-text-primary transition-colors"
            >
              How To Deposit
            </Link>
          </nav>
          
          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Balance and Deposit */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="bg-primary/10 px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-sm text-gray-400">Balance:</span>
                    <span
                      className="font-bold text-text-primary transition-opacity duration-150"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {balanceVisible ? formatCurrency(user.balance) : <span aria-label="Hidden" className="font-bold text-lg">••••••</span>}
                    </span>
                    <button
                      onClick={toggleBalanceVisibility}
                      className="text-primary/70 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 flex-shrink-0 -mr-1"
                      aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                      aria-pressed={!balanceVisible}
                      type="button"
                    >
                      {balanceVisible ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
                  <button
                    onClick={openDepositModal}
                    className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5"
                    aria-label="Deposit USDT"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Deposit
                  </button>
                </div>
                
                {/* Sound Toggle */}
                <button
                  className="relative p-2 text-gray-400 hover:text-text-primary transition-colors"
                  onClick={toggleAudio}
                  aria-label={audioEnabled ? 'Disable sound' : 'Enable sound'}
                >
                  {audioEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
                </button>
                
                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    <Avatar userId={user.id} alt={user.username} size="sm" />
                    <span className="hidden sm:block text-text-primary font-medium">
                      {user.username}
                    </span>
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-secondary-bg rounded-lg shadow-xl border border-primary/20 py-2">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-300 hover:bg-primary/10 hover:text-text-primary"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-gray-300 hover:bg-primary/10 hover:text-text-primary"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <hr className="my-2 border-primary/20" />
                      <button
                        onClick={() => {
                          setUserMenuOpen(false)
                          onLogout?.()
                        }}
                        className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-primary/10 hover:text-text-primary"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button onClick={onLogin} size="sm">
                Login / Register
              </Button>
            )}
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-text-primary"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-primary/10">
            <Link
              to="/"
              className="block py-2 text-gray-300 hover:text-text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Lobby
            </Link>
            <Link
              to="/results"
              className="block py-2 text-gray-300 hover:text-text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Results
            </Link>
            <Link
              to="/how-to-play"
              className="block py-2 text-gray-300 hover:text-text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              How To Play
            </Link>
            <Link
              to="/how-to-deposit"
              className="block py-2 text-gray-300 hover:text-text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              How To Deposit
            </Link>
            {user && (
              <div className="mt-4 pt-4 border-t border-primary/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-gray-400">Balance:</div>
                    <div
                      className="font-bold text-text-primary transition-opacity duration-150"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {balanceVisible ? formatCurrency(user.balance) : <span aria-label="Hidden" className="font-bold text-lg">••••••</span>}
                    </div>
                  </div>
                  <button
                    onClick={toggleBalanceVisibility}
                    className="text-primary/70 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-2 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                    aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                    aria-pressed={!balanceVisible}
                    type="button"
                  >
                    {balanceVisible ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openDepositModal()
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Deposit USDT
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header