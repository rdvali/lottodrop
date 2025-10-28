import { test as base, Page } from '@playwright/test'

/**
 * Authentication Fixture
 *
 * Provides authenticated user context for E2E tests
 */

export interface AuthUser {
  email: string
  password: string
  userId: string
  balance: number
}

// Test users for E2E testing
export const testUsers = {
  player1: {
    email: 'e2e-player1@lottodrop.test',
    password: 'TestPassword123!',
    userId: 'e2e-user-1',
    balance: 1000,
  },
  player2: {
    email: 'e2e-player2@lottodrop.test',
    password: 'TestPassword123!',
    userId: 'e2e-user-2',
    balance: 500,
  },
} as const

/**
 * Login helper function
 */
export async function login(page: Page, user: AuthUser) {
  // Navigate to home page
  await page.goto('/')

  // Wait for page to load
  await page.waitForLoadState('networkidle')

  // Click login/signup button
  const loginButton = page.getByRole('button', { name: /login|sign in/i })
  await loginButton.click()

  // Wait for auth modal
  await page.waitForSelector('[data-testid="auth-modal"], .auth-modal, form', {
    timeout: 5000,
  })

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', user.email)
  await page.fill('input[type="password"], input[name="password"]', user.password)

  // Submit form
  await page.click('button[type="submit"], button:has-text("Sign In")')

  // Wait for successful authentication
  await page.waitForSelector('[data-testid="user-balance"], .user-balance', {
    timeout: 10000,
  })

  // Verify we're logged in
  const balanceElement = await page.locator('[data-testid="user-balance"], .user-balance').first()
  await balanceElement.waitFor({ state: 'visible' })
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Click logout button (usually in header/nav)
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
  await logoutButton.click()

  // Wait for logout to complete
  await page.waitForSelector('[data-testid="auth-modal"], button:has-text("Login")', {
    timeout: 5000,
  })
}

/**
 * Extended test fixture with authentication
 */
export const test = base.extend<{
  authenticatedPage: Page
  user: AuthUser
}>({
  user: async ({}, use) => {
    // Default to player1
    await use(testUsers.player1)
  },

  authenticatedPage: async ({ page, user }, use) => {
    // Login before test
    await login(page, user)

    // Use the authenticated page
    await use(page)

    // Logout after test (cleanup)
    try {
      await logout(page)
    } catch (error) {
      console.warn('Logout failed during cleanup:', error)
    }
  },
})

export { expect } from '@playwright/test'
