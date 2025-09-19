import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Logo } from '@components/atoms'

export interface HeaderProps {
  user?: {
    id: string
    username: string
    balance: number
  }
  onLogin?: () => void
  onLogout?: () => void
  notificationCount?: number
}

const Header = ({ user, onLogin, onLogout, notificationCount = 0 }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
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
          </nav>
          
          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Balance */}
                <div className="hidden sm:block">
                  <div className="bg-primary/10 px-4 py-2 rounded-lg">
                    <span className="text-sm text-gray-400">Balance:</span>
                    <span className="ml-2 font-bold text-text-primary">
                      ${user.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <Badge
                      variant="danger"
                      size="sm"
                      className="absolute -top-1 -right-1 min-w-[20px] h-5"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </button>
                
                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
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
            {user && (
              <div className="mt-4 pt-4 border-t border-primary/10">
                <div className="text-sm text-gray-400">Balance:</div>
                <div className="font-bold text-text-primary">
                  ${user.balance.toLocaleString()}
                </div>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header