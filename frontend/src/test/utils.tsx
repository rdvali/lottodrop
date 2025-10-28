import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@contexts/AuthContext'
import { NotificationProvider } from '@contexts/NotificationContext'
import { WinnerResultsProvider } from '@contexts/WinnerResultsContext'
import { ModalProvider } from '../providers'

/**
 * Custom render function that wraps components with all necessary providers
 */
interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <WinnerResultsProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </WinnerResultsProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

/**
 * Wait for a specific amount of time (useful for async operations)
 */
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  balance: 1000,
  createdAt: new Date().toISOString(),
  ...overrides,
})

/**
 * Create a mock room for testing
 */
export const createMockRoom = (overrides = {}) => ({
  id: 'room-1',
  name: 'Test Room',
  type: 'standard',
  status: 'waiting',
  entryFee: 10,
  prizePool: 100,
  currentParticipants: 3,
  minParticipants: 3,
  maxParticipants: 10,
  winnersCount: 1,
  participants: [],
  winners: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

/**
 * Create mock participants for testing
 */
export const createMockParticipants = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    userId: `user-${i + 1}`,
    username: `Player ${i + 1}`,
    joinedAt: new Date().toISOString(),
    status: 'active' as const,
  }))
}

/**
 * Create mock winners for testing
 */
export const createMockWinners = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i + 1}`,
    username: `Winner ${i + 1}`,
    position: i + 1,
    winnerAmount: 100 - i * 10,
    avatarUrl: undefined,
  }))
}
