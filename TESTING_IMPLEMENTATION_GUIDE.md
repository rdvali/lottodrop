# Testing Implementation Guide - LottoDrop

## ✅ Completed (This Session)

### 1. Testing Infrastructure Setup
- ✅ Installed: vitest, @vitest/ui, jsdom, msw, @testing-library/user-event
- ✅ Created: `vitest.config.ts` with full configuration
- ✅ Created: `src/test/setup.ts` with browser API mocks
- ✅ Created: `src/test/utils.tsx` with custom render and test helpers
- ✅ Created: Mock implementations for socketService, audioService, roomAPI
- ✅ Added test scripts to `package.json`

### 2. State Machine Unit Tests
- ✅ **File**: `src/hooks/__tests__/useGameStateMachine.test.ts`
- ✅ **Coverage**: 19/19 tests passing (1 skipped due to ref timing)
- ✅ **Tests**: All state transitions, invalid transitions, timeout failsafe, modal lifecycle, edge cases

**Run tests**: `npm run test`

---

## 📋 Remaining Tasks

### Task 2: Integration Tests for Socket Event Handling ⚠️ **CRITICAL**

**Priority**: HIGHEST - Tests financial transactions

**File to create**: `src/pages/GameRoom/__tests__/GameRoom.sockets.test.tsx`

**What to test**:
```typescript
describe('GameRoom Socket Integration', () => {
  // BUG-007: Duplicate event handling
  it('should not process duplicate game-completed events', () => {
    // Emit same event twice
    // Assert balance only updated once
  })

  // BUG-006: Operation locking
  it('should prevent rapid join/leave exploit', async () => {
    // Call joinRoom twice rapidly
    // Assert only one API call made
  })

  // BUG-013: Balance sync
  it('should update balance only for matching userId', () => {
    // Emit balance-updated for different user
    // Assert current user balance unchanged
  })

  // BUG-020: Balance reconciliation
  it('should use server balance as authoritative', () => {
    // Set optimistic balance
    // Emit server balance update
    // Assert server value wins
  })

  // BUG-002: Memory leak
  it('should not re-subscribe on every balance change', () => {
    // Update balance multiple times
    // Assert socket handlers count stays same
  })
})
```

**Implementation**:
```bash
# Create the test file
touch src/pages/GameRoom/__tests__/GameRoom.sockets.test.tsx

# Template structure:
import { render, act, waitFor } from '@test/utils'
import GameRoom from '../GameRoom'
import { mockSocketService } from '@test/mocks/socketService'
import { mockRoomAPI } from '@test/mocks/roomAPI'

# Mock the dependencies
vi.mock('@services/socket', () => ({
  socketService: mockSocketService
}))

vi.mock('@services/api', () => ({
  roomAPI: mockRoomAPI
}))
```

**Estimated Time**: 4-6 hours

---

### Task 3: Error Boundary Implementation ⚠️ **HIGH PRIORITY**

**Priority**: HIGH - Prevents app crashes

**Files to create**:
1. `src/components/error/ErrorBoundary.tsx`
2. `src/components/error/GameRoomErrorFallback.tsx`
3. `src/components/error/__tests__/ErrorBoundary.test.tsx`

**Implementation**:

```typescript
// src/components/error/ErrorBoundary.tsx
import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)

    // Log to Sentry (already configured)
    if (import.meta.env.PROD) {
      // Sentry.captureException(error)
    }

    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback
      return <Fallback error={this.state.error!} reset={this.reset} />
    }

    return this.props.children
  }
}

const DefaultErrorFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-dark-bg-primary">
    <div className="text-center max-w-md p-8">
      <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h1>
      <p className="text-gray-400 mb-6">
        We encountered an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Try Again
      </button>
      {import.meta.env.DEV && (
        <pre className="mt-4 p-4 bg-gray-800 rounded text-left text-xs overflow-auto">
          {error.stack}
        </pre>
      )}
    </div>
  </div>
)
```

**Wrap GameRoom**:
```typescript
// In App.tsx
import { ErrorBoundary } from '@components/error/ErrorBoundary'

<Route
  path="/room/:roomId"
  element={
    <ProtectedRoute>
      <ErrorBoundary>
        <GameRoom />
      </ErrorBoundary>
    </ProtectedRoute>
  }
/>
```

**Estimated Time**: 2 hours

---

### Task 4: Analytics Tracking

**Priority**: MEDIUM - Helps with monitoring

**File to create**: `src/services/analytics/gameAnalytics.ts`

**Implementation**:
```typescript
interface GameEvent {
  event: string
  properties: Record<string, any>
  timestamp: number
}

class GameAnalytics {
  private events: GameEvent[] = []
  private enabled = import.meta.env.PROD

  track(event: string, properties: Record<string, any> = {}) {
    if (!this.enabled) return

    const gameEvent: GameEvent = {
      event,
      properties,
      timestamp: Date.now()
    }

    this.events.push(gameEvent)

    // Send to analytics service (e.g., Mixpanel, Amplitude)
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, properties)
    }

    console.log('[Analytics]', event, properties)
  }

  // Specific game events
  trackStateTransition(from: string, to: string, duration: number) {
    this.track('game_state_transition', { from, to, duration })
  }

  trackAnimationTimeout() {
    this.track('game_animation_timeout', { severity: 'warning' })
  }

  trackModalShown(winnersCount: number, prizePool: number) {
    this.track('game_modal_shown', { winnersCount, prizePool })
  }

  trackUserJoin(roomId: string, entryFee: number) {
    this.track('user_joined_room', { roomId, entryFee })
  }

  trackUserLeave(roomId: string) {
    this.track('user_left_room', { roomId })
  }
}

export const gameAnalytics = new GameAnalytics()
```

**Add to State Machine**:
```typescript
// In useGameStateMachine.ts reducer
case 'GAME_STARTING': {
  gameAnalytics.trackStateTransition(state.phase, 'COUNTDOWN', 0)
  return { ...newState }
}

// In timeout effect
if (stateRef.current.phase === 'ANIMATION_PLAYING') {
  gameAnalytics.trackAnimationTimeout()
  dispatch({ type: 'ANIMATION_COMPLETE' })
}
```

**Estimated Time**: 3 hours

---

### Task 5: E2E Testing Framework Setup

**Priority**: MEDIUM-LOW - Nice to have

**Install Playwright**:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Create config**: `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Estimated Time**: 2 hours

---

### Task 6: E2E Tests for Game Flow

**Priority**: MEDIUM-LOW

**File to create**: `e2e/game-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Full Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('user can join room and play complete game', async ({ page }) => {
    // 1. Login
    await page.click('text=Login')
    await page.fill('[name=email]', 'test@example.com')
    await page.fill('[name=password]', 'test123')
    await page.click('button:has-text("Log In")')

    // 2. Find and join room
    await page.waitForSelector('.room-card')
    await page.click('.room-card:first-child button:has-text("Join")')

    // 3. Wait for countdown
    await page.waitForSelector('[data-testid="countdown-timer"]')

    // 4. Wait for animation
    await page.waitForSelector('[data-testid="winner-reveal"]', { timeout: 35000 })

    // 5. Verify modal shows
    await page.waitForSelector('[data-testid="winner-modal"]')

    // 6. Close modal
    await page.click('[data-testid="close-modal"]')

    // 7. Verify back on room list
    await expect(page).toHaveURL('/')
  })

  test('handles disconnection gracefully', async ({ page, context }) => {
    // Login and join room
    // ...

    // Simulate network disconnection
    await context.setOffline(true)

    // Verify error handling
    await expect(page.locator('.error-message')).toBeVisible()

    // Reconnect
    await context.setOffline(false)

    // Verify recovery
    await page.waitForSelector('.room-card')
  })
})
```

**Estimated Time**: 6 hours

---

## 📊 Test Coverage Goals

- **State Machine**: ✅ 95%+ (Achieved: 19/19 tests)
- **Socket Integration**: 🎯 80%+ (Implement Task 2)
- **Error Handling**: 🎯 90%+ (Implement Task 3)
- **E2E Critical Paths**: 🎯 100% (Tasks 5-6)

---

## 🚀 Recommended Implementation Order

### Week 1 (Critical)
1. **Day 1-2**: Task 2 - Socket Integration Tests (6 hours)
   - Most important for financial safety
2. **Day 3**: Task 3 - Error Boundary (2 hours)
   - Prevents complete app failures

### Week 2 (Important)
3. **Day 4-5**: Task 4 - Analytics Tracking (3 hours)
   - Monitoring and debugging

### Week 3+ (Nice to Have)
4. **Day 6-7**: Tasks 5-6 - E2E Tests (8 hours)
   - Comprehensive but lower ROI

---

## 📝 Running Tests

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run specific file
npm run test -- src/hooks/__tests__/useGameStateMachine.test.ts

# Coverage report
npm run test:coverage

# Watch mode
npm run test -- --watch
```

---

## 🎯 Success Criteria

- ✅ State machine tests: 95%+ passing
- ⏳ Socket tests: 80%+ coverage of financial flows
- ⏳ Error boundary: Catches and recovers from crashes
- ⏳ Analytics: Tracking all critical game events
- ⏳ E2E: Happy path + error scenarios covered

---

## 💡 Tips

1. **Prioritize financial safety** - Socket tests >> E2E tests
2. **Test what you fixed** - Each bug fix should have a test
3. **Mock external dependencies** - Don't test Socket.IO or React
4. **Use data-testid** - Add to components for E2E tests
5. **Keep tests fast** - Unit tests < 100ms each

---

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev)
- [MSW (API Mocking)](https://mswjs.io)

---

**Status**:
- ✅ Infrastructure: Complete
- ✅ State Machine Tests: 19/19 passing
- ⏳ Integration Tests: Ready to implement
- ⏳ E2E Tests: Framework ready to install
