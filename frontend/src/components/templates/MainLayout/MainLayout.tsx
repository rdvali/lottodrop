import type { ReactNode } from 'react'
import { Header, Footer } from '@components/organisms'

export interface MainLayoutProps {
  children: ReactNode
  user?: {
    id: string
    username: string
    balance: number
  }
  onLogin?: () => void
  onLogout?: () => void
  notificationCount?: number
}

const MainLayout = ({
  children,
  user,
  onLogin,
  onLogout,
  notificationCount,
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-primary-bg">
      <Header
        user={user}
        onLogin={onLogin}
        onLogout={onLogout}
        notificationCount={notificationCount}
      />
      
      <main className="flex-1">
        {children}
      </main>
      
      <Footer />
    </div>
  )
}

export default MainLayout