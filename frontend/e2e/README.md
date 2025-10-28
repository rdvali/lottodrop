# E2E Testing with Playwright

## Overview

End-to-end tests for LottoDrop gaming platform using Playwright. These tests validate the complete user journey from authentication through game completion.

## Test Coverage

### Authentication Tests (`auth.spec.ts`)
- ✅ Display login button on home page
- ✅ Open auth modal when login clicked
- ✅ Successfully login with valid credentials
- ✅ Display user balance after login
- ✅ Successfully logout
- ✅ Persist authentication after page reload
- ✅ Show validation errors for invalid email

### Game Flow Tests (`game-flow.spec.ts`)
- ✅ Display list of available rooms
- ✅ Successfully join a room
- ✅ Successfully leave a room before countdown
- ✅ Display countdown when game starts
- ✅ Play animation after countdown completes
- ✅ Display winner modal after game completes
- ✅ Update balance correctly after winning
- ✅ Allow rejoining after game completes
- ✅ Prevent joining with insufficient balance

## Architecture

### Fixtures

**`fixtures/auth.ts`**
- Authentication helpers (login, logout)
- Test user credentials
- Authenticated page fixture

**`fixtures/gameRoom.ts`**
- Room navigation helpers
- Game flow helpers (countdown, animation, winner modal)
- Balance and player count utilities

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug mode (step through tests)
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Configuration

Configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:5173` (dev server)
- **Timeout**: 60 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Browser**: Chromium (Desktop Chrome)
- **Screenshots**: On failure only
- **Videos**: Retained on failure

## Writing New Tests

### Basic Structure

```typescript
import { test, expect } from '../fixtures/auth'
import { goToRoomList, joinRoom } from '../fixtures/gameRoom'

test.describe('Feature Name', () => {
  test('should do something', async ({ authenticatedPage: page }) => {
    // Test code here
    await expect(page.locator('selector')).toBeVisible()
  })
})
```

### Using Authenticated Page

```typescript
test('my test', async ({ authenticatedPage: page }) => {
  // page is already logged in as player1
  // Use page normally
})
```

### Using Specific User

```typescript
test('my test', async ({ page, user }) => {
  // Use testUsers.player2 instead of default player1
  await login(page, testUsers.player2)
})
```

## Test Data

Test users are defined in `fixtures/auth.ts`:

```typescript
testUsers.player1 = {
  email: 'e2e-player1@lottodrop.test',
  password: 'TestPassword123!',
  userId: 'e2e-user-1',
  balance: 1000,
}

testUsers.player2 = {
  email: 'e2e-player2@lottodrop.test',
  password: 'TestPassword123!',
  userId: 'e2e-user-2',
  balance: 500,
}
```

**Note**: These test users must exist in your test database. Set them up before running E2E tests.

## Test Data Setup

### Backend Requirements

Before running E2E tests, ensure:

1. **Test Database**: Use a separate test database
2. **Test Users**: Create test users with appropriate balances
3. **Test Rooms**: Create game rooms with various entry fees
4. **Socket Server**: WebSocket server must be running

### Environment Setup

Create `.env.test` or configure your test environment:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Failed Tests

### View HTML Report
```bash
npm run test:e2e:report
```

The report includes:
- Screenshots at failure point
- Video recordings (if enabled)
- Step-by-step trace
- Network activity
- Console logs

### Debug Mode
```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through tests line by line
- Inspect page state at any point
- View locator suggestions
- Record new test actions

### Common Issues

**Test timeout**
- Increase timeout in test or config
- Check if server is running
- Verify network is not throttled

**Element not found**
- Verify selectors match your components
- Check if element is in shadow DOM
- Use `page.pause()` to inspect live

**Authentication fails**
- Ensure test users exist in database
- Check credentials in `fixtures/auth.ts`
- Verify JWT tokens are being set correctly

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Keep tests independent** - each test should be runnable alone
3. **Clean up after tests** - logout, reset state
4. **Use fixtures** for shared logic
5. **Make tests readable** - clear describe/test names
6. **Handle timing** - use Playwright's auto-waiting, avoid arbitrary waits
7. **Test critical paths** - focus on high-value user journeys

## Performance

- Tests run in parallel by default (configurable)
- Average test execution: 10-30 seconds per test
- Full suite: ~5-10 minutes (depends on game timing)

## Bug Coverage

These E2E tests verify fixes for:
- **BUG-001**: State machine transitions work correctly
- **BUG-002**: No memory leaks during game cycles
- **BUG-003**: Race conditions handled properly
- **BUG-004**: Event sequencing is correct
- **BUG-016**: Animation timeout failsafe works

## Next Steps

1. Add mobile browser testing (iOS Safari, Android Chrome)
2. Add visual regression testing
3. Add performance testing (Core Web Vitals)
4. Add accessibility testing (axe-core integration)
5. Add load testing (multiple concurrent users)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
