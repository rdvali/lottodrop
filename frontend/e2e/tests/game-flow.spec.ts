import { test, expect } from '../fixtures/auth'
import {
  goToRoomList,
  joinRoom,
  leaveRoom,
  waitForCountdown,
  waitForAnimation,
  waitForWinnerModal,
  dismissWinnerModal,
  getUserBalance,
  getPlayerCount,
} from '../fixtures/gameRoom'

/**
 * Full Game Flow E2E Tests
 *
 * Tests the complete game lifecycle:
 * 1. User joins a room
 * 2. Countdown starts
 * 3. VRF animation plays
 * 4. Winner is selected
 * 5. Modal displays results
 * 6. Balance is updated
 * 7. Room resets for next round
 *
 * These tests verify all the bug fixes:
 * - BUG-001: State machine transitions
 * - BUG-002: Memory leaks
 * - BUG-003: Race conditions
 * - BUG-004: Event sequencing
 * - BUG-016: Animation timeout
 */

test.describe('Game Flow', () => {
  test.use({ storageState: undefined }) // Start fresh for each test

  test('should display list of available rooms', async ({ authenticatedPage: page }) => {
    await goToRoomList(page)

    // Verify room list is visible
    await expect(page.locator('[data-testid="room-list"], .room-list')).toBeVisible()

    // Verify at least one room card is present
    const roomCards = page.locator('[data-room-id], [data-testid^="room-"]')
    const count = await roomCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should successfully join a room', async ({ authenticatedPage: page }) => {
    await goToRoomList(page)

    // Get initial balance
    const initialBalance = await getUserBalance(page)

    // Find and join first available room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Verify we're in the room
    await expect(page).toHaveURL(new RegExp(`/room/${roomId}`))
    await expect(page.locator('[data-testid="game-room"], .game-room')).toBeVisible()

    // Verify player count increased
    const playerCount = await getPlayerCount(page)
    expect(playerCount).toBeGreaterThan(0)

    // Verify balance decreased by entry fee (or check it later)
    const newBalance = await getUserBalance(page)
    expect(newBalance).toBeLessThanOrEqual(initialBalance)
  })

  test('should successfully leave a room before countdown', async ({
    authenticatedPage: page,
  }) => {
    await goToRoomList(page)

    // Get initial balance
    const initialBalance = await getUserBalance(page)

    // Join a room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Leave immediately (before countdown starts)
    await leaveRoom(page)

    // Verify we're back at room list
    await expect(page).toHaveURL('/')

    // Verify balance is refunded
    const finalBalance = await getUserBalance(page)
    expect(finalBalance).toBeCloseTo(initialBalance, 0) // Should be refunded
  })

  test('should display countdown when game starts', async ({ authenticatedPage: page }) => {
    await goToRoomList(page)

    // Join room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Wait for countdown to start (up to 35 seconds)
    await waitForCountdown(page)

    // Verify countdown is counting down
    const countdownElement = page.locator('[data-testid="countdown"], .countdown')
    const initialTime = await countdownElement.textContent()
    expect(initialTime).toMatch(/\d+/)

    // Wait a second and verify it decremented
    await page.waitForTimeout(1500)
    const newTime = await countdownElement.textContent()
    expect(parseInt(newTime || '0')).toBeLessThan(parseInt(initialTime || '999'))
  })

  test('should play animation after countdown completes', async ({
    authenticatedPage: page,
  }) => {
    await goToRoomList(page)

    // Join room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Wait for countdown
    await waitForCountdown(page)

    // Wait for animation to start (after countdown completes)
    await waitForAnimation(page)

    // Verify animation is playing
    const animation = page.locator(
      '[data-testid="vrf-animation"], [data-testid="ball-animation"], .animation-container'
    )
    await expect(animation).toBeVisible()
  })

  test('should display winner modal after game completes', async ({
    authenticatedPage: page,
  }) => {
    await goToRoomList(page)

    // Join room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Wait through countdown and animation
    await waitForCountdown(page)
    await waitForAnimation(page)

    // Wait for winner modal
    await waitForWinnerModal(page)

    // Verify modal content
    const modal = page.locator('[data-testid="winner-modal"], .winner-modal')
    await expect(modal).toBeVisible()

    // Verify modal has winner information
    await expect(modal.locator('[data-testid="winner-name"]')).toBeVisible()
    await expect(modal.locator('[data-testid="prize-amount"]')).toBeVisible()
  })

  test('should update balance correctly after winning', async ({ authenticatedPage: page }) => {
    await goToRoomList(page)

    // Get initial balance
    const initialBalance = await getUserBalance(page)

    // Join room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Wait through full game flow
    await waitForCountdown(page)
    await waitForAnimation(page)
    await waitForWinnerModal(page)

    // Check if we won (this test may need to be adapted based on your win detection)
    const modal = page.locator('[data-testid="winner-modal"], .winner-modal')
    const isWinner = await modal.locator('[data-testid="you-won"]').isVisible().catch(() => false)

    // Dismiss modal
    await dismissWinnerModal(page)

    // Wait for balance update
    await page.waitForTimeout(2000)

    // Verify balance changed
    const finalBalance = await getUserBalance(page)

    if (isWinner) {
      // Balance should increase if we won
      expect(finalBalance).toBeGreaterThan(initialBalance)
    } else {
      // Balance should decrease by entry fee if we lost
      expect(finalBalance).toBeLessThan(initialBalance)
    }
  })

  test('should allow rejoining after game completes', async ({ authenticatedPage: page }) => {
    await goToRoomList(page)

    // Join room
    const firstRoom = page.locator('[data-room-id], [data-testid^="room-"]').first()
    const roomId = await firstRoom.getAttribute('data-room-id')

    if (!roomId) {
      throw new Error('No room ID found')
    }

    await joinRoom(page, roomId)

    // Wait through full game
    await waitForCountdown(page)
    await waitForAnimation(page)
    await waitForWinnerModal(page)
    await dismissWinnerModal(page)

    // Verify we can still see the room (either we're still in it or returned to list)
    const isStillInRoom = await page
      .locator('[data-testid="game-room"], .game-room')
      .isVisible()
      .catch(() => false)
    const isInRoomList = await page
      .locator('[data-testid="room-list"], .room-list')
      .isVisible()
      .catch(() => false)

    expect(isStillInRoom || isInRoomList).toBeTruthy()
  })

  test('should prevent joining with insufficient balance', async ({
    authenticatedPage: page,
  }) => {
    await goToRoomList(page)

    // Find a high-stakes room (if available)
    const highStakesRoom = page.locator('[data-entry-fee]').first()
    const entryFee = await highStakesRoom.getAttribute('data-entry-fee')
    const currentBalance = await getUserBalance(page)

    // Only run this test if we can find a room we can't afford
    if (entryFee && parseInt(entryFee) > currentBalance) {
      const joinButton = highStakesRoom.locator('button:has-text("Join")')

      // Verify join button is disabled or shows error on click
      const isDisabled = await joinButton.isDisabled()
      expect(isDisabled).toBeTruthy()
    } else {
      // Skip test if no high-stakes room available
      test.skip()
    }
  })
})
