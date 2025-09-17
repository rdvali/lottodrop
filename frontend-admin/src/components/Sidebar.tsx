import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

// Lucide React Icons
const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9"/>
    <rect x="14" y="3" width="7" height="5"/>
    <rect x="14" y="12" width="7" height="9"/>
    <rect x="3" y="16" width="7" height="5"/>
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const GameIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const DiceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <path d="M9 9h.01"/>
    <path d="M15 9h.01"/>
    <path d="M9 15h.01"/>
    <path d="M15 15h.01"/>
  </svg>
);

const TransactionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const AnalyticsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5l-3 3m-6-6l-3 3m0 6l3 3m6-6l3 3"/>
  </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const menuItems = [
    { path: '/', icon: DashboardIcon, label: 'Dashboard' },
    { path: '/users', icon: UsersIcon, label: 'Users' },
    { path: '/rooms', icon: GameIcon, label: 'Rooms' },
    { path: '/rounds', icon: DiceIcon, label: 'Rounds' },
    { path: '/transactions', icon: TransactionIcon, label: 'Transactions' },
    { path: '/analytics', icon: AnalyticsIcon, label: 'Analytics' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button lg:hidden"
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isMobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="sidebarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <rect x="8" y="8" width="24" height="24" rx="4" fill="#0F172A" transform="rotate(45 20 20)"/>
              <rect x="8" y="8" width="24" height="24" rx="4" fill="url(#sidebarGradient)" opacity="0.2" transform="rotate(45 20 20)"/>
              <path d="M20 8 L30 20 L20 32 L10 20 Z" fill="url(#sidebarGradient)" opacity="0.8"/>
              <circle cx="20" cy="20" r="5" fill="url(#sidebarGradient)"/>
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-main">LottoDrop</span>
            <span className="logo-sub">Admin</span>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            className="mobile-close-button lg:hidden"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          >
            <CloseIcon className="close-icon" />
          </button>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <IconComponent className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                <div className="nav-indicator" aria-hidden="true"></div>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" aria-hidden="true">
              <span className="user-initials">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <div className="user-details">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="logout-btn"
            aria-label="Sign out of admin panel"
          >
            <LogoutIcon className="logout-icon" />
            <span className="logout-text">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

// Export mobile menu hook for potential use in other components
export const useMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);
  
  return { isOpen, toggle, close, open };
};