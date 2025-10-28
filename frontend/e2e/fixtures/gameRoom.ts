import { Page, expect } from '@playwright/test'

/**
 * Game Room Helper Functions
 *
 * Utilities for interacting with game rooms in E2E tests
 */

export interface Room {
  id: string
  name: string
  entryFee: number
  prizePool: number
  playerCount: number
  maxPlayers: number
  status: 'waiting' | 'countdown' | 'playing' | 'completed'
}

/**
 * Navigate to room list
 */
export async function goToRoomList(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

/**
 * Find and click on a specific room
 */
export async function joinRoom(page: Page, roomId: string) {
  // Find room card by ID
  const roomCard = page.locator(`[data-room-id="${roomId}"], [data-testid="room-${roomId}"]`)
  await roomCard.waitFor({ state: 'visible', timeout: 10000 })

  // Click join button
  const joinButton = roomCard.locator('button:has-text("Join"), button:has-text("Enter")')
  await joinButton.click()

  // Wait for navigation to room page
  await page.waitForURL(`**/room/${roomId}`, { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  // Verify we're in the room
  await expect(page.locator('[data-testid="game-room"], .game-room')).toBeVisible()
}

/**
 * Leave current room
 */
export async function leaveRoom(page: Page) {
  // Find and click leave button
  const leaveButton = page.getByRole('button', { name: /leave|exit/i })
  await leaveButton.click()

  // Confirm leave if there's a confirmation dialog
  const confirmButton = page.getByRole('button', { name: /confirm|yes/i })
  if (await confirmButton.isVisible()) {
    await confirmButton.click()
  }

  // Wait for navigation back to room list
  await page.waitForURL('**/', { timeout: 10000 })
}

/**
 * Wait for game countdown to start
 */
export async function waitForCountdown(page: Page, timeout = 35000) {
  await page.waitForSelector('[data-testid="countdown"], .countdown', {
    timeout,
  })

  // Verify countdown is visible
  const countdown = page.locator('[data-testid="countdown"], .countdown')
  await expect(countdown).toBeVisible()
}

/**
 * Wait for animation to start
 */
export async function waitForAnimation(page: Page, timeout = 40000) {
  // Wait for VRF animation or ball drop animation
  await page.waitForSelector(
    '[data-testid="vrf-animation"], [data-testid="ball-animation"], .animation-container',
    { timeout }
  )

  const animation = page.locator(
    '[data-testid="vrf-animation"], [data-testid="ball-animation"], .animation-container'
  )
  await expect(animation).toBeVisible()
}

/**
 * Wait for winner modal
 */
export async function waitForWinnerModal(page: Page, timeout = 20000) {
  await page.waitForSelector('[data-testid="winner-modal"], .winner-modal', {
    timeout,
  })

  const modal = page.locator('[data-testid="winner-modal"], .winner-modal')
  await expect(modal).toBeVisible()
}

/**
 * Get winner information from modal
 */
export async function getWinnerInfo(page: Page) {
  const modal = page.locator('[data-testid="winner-modal"], .winner-modal')

  // Extract winner data
  const winnerName = await modal.locator('[data-testid="winner-name"]').textContent()
  const prizeAmount = await modal.locator('[data-testid="prize-amount"]').textContent()

  return {
    winnerName: winnerName?.trim() || '',
    prizeAmount: prizeAmount?.trim() || '',
  }
}

/**
 * Dismiss winner modal
 */
export async function dismissWinnerModal(page: Page) {
  const closeButton = page.locator('[data-testid="close-modal"], button:has-text("Close")')
  await closeButton.click()

  // Wait for modal to disappear
  await page.waitForSelector('[data-testid="winner-modal"], .winner-modal', {
    state: 'hidden',
    timeout: 5000,
  })
}

/**
 * Get current user balance
 */
export async function getUserBalance(page: Page): Promise<number> {
  const balanceElement = page.locator('[data-testid="user-balance"], .user-balance')
  const balanceText = await balanceElement.textContent()

  // Extract number from balance text (e.g., "$1,000.00" -> 1000)
  const balance = parseFloat(balanceText?.replace(/[^0-9.]/g, '') || '0')
  return balance
}

/**
 * Wait for balance update
 */
export async function waitForBalanceUpdate(
  page: Page,
  expectedBalance: number,
  timeout = 10000
) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const currentBalance = await getUserBalance(page)

    if (currentBalance === expectedBalance) {
      return true
    }

    // Wait a bit before checking again
    await page.waitForTimeout(500)
  }

  throw new Error(
    `Balance did not update to ${expectedBalance} within ${timeout}ms`
  )
}

/**
 * Get room players count
 */
export async function getPlayerCount(page: Page): Promise<number> {
  const playersElement = page.locator(
    '[data-testid="player-count"], .player-count'
  )
  const playersText = await playersElement.textContent()

  // Extract current count from text like "3/10 players"
  const match = playersText?.match(/(\d+)\s*\/\s*(\d+)/)
  return match ? parseInt(match[1]) : 0
}
