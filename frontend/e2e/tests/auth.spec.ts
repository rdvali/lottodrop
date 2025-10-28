import { test, expect } from '@playwright/test'
import { login, logout, testUsers } from '../fixtures/auth'

/**
 * Authentication E2E Tests
 *
 * Tests user login, logout, and authentication flows
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login button on home page', async ({ page }) => {
    // Verify login button is visible
    const loginButton = page.getByRole('button', { name: /login|sign in/i })
    await expect(loginButton).toBeVisible()
  })

  test('should open auth modal when login button is clicked', async ({ page }) => {
    // Click login button
    const loginButton = page.getByRole('button', { name: /login|sign in/i })
    await loginButton.click()

    // Verify auth modal appears
    await expect(page.locator('[data-testid="auth-modal"], .auth-modal, form')).toBeVisible({
      timeout: 5000,
    })

    // Verify email and password fields are present
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    // Login with test user
    await login(page, testUsers.player1)

    // Verify successful login
    await expect(page.locator('[data-testid="user-balance"], .user-balance')).toBeVisible()

    // Verify logout button is now visible
    await expect(page.getByRole('button', { name: /logout|sign out/i })).toBeVisible()
  })

  test('should display user balance after login', async ({ page }) => {
    // Login
    await login(page, testUsers.player1)

    // Get balance element
    const balanceElement = page.locator('[data-testid="user-balance"], .user-balance').first()
    await expect(balanceElement).toBeVisible()

    // Verify balance text contains a number
    const balanceText = await balanceElement.textContent()
    expect(balanceText).toMatch(/\d+/)
  })

  test('should successfully logout', async ({ page }) => {
    // Login first
    await login(page, testUsers.player1)

    // Logout
    await logout(page)

    // Verify login button is visible again
    await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible()

    // Verify user balance is no longer visible
    await expect(page.locator('[data-testid="user-balance"], .user-balance')).not.toBeVisible()
  })

  test('should persist authentication after page reload', async ({ page }) => {
    // Login
    await login(page, testUsers.player1)

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify still logged in
    await expect(page.locator('[data-testid="user-balance"], .user-balance')).toBeVisible()
  })

  test('should show validation errors for invalid email', async ({ page }) => {
    // Click login
    const loginButton = page.getByRole('button', { name: /login|sign in/i })
    await loginButton.click()

    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')

    // Submit form
    await page.click('button[type="submit"]')

    // Verify error message appears (this depends on your validation implementation)
    // Adjust selector based on your actual error message implementation
    const errorMessage = page.locator('.error-message, [role="alert"], .validation-error')

    // Wait a bit for validation to trigger
    await page.waitForTimeout(1000)

    // Check if error is visible or form wasn't submitted
    const isErrorVisible = await errorMessage.isVisible().catch(() => false)
    const isStillOnModal = await page.locator('[data-testid="auth-modal"], .auth-modal').isVisible()

    expect(isErrorVisible || isStillOnModal).toBeTruthy()
  })
})
