import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../public/screenshots');
const BASE_URL = 'https://lottodrop.net';

async function waitForContent(page: Page) {
  // Wait for skeleton loaders to disappear and real content to appear
  try {
    // Wait for any skeleton elements to disappear
    await page.waitForSelector('[class*="skeleton"], [class*="Skeleton"]', { state: 'hidden', timeout: 5000 }).catch(() => {});

    // Additional wait for content to render
    await page.waitForTimeout(1500);
  } catch {
    // Continue even if skeletons not found
  }
}

async function dismissLoginModal(page: Page) {
  // Try to close login modal if it's open
  console.log('Attempting to dismiss login modal...');

  // Method 1: Click the X button
  try {
    const closeButton = page.locator('[role="dialog"] button:has(svg), .modal button:has(svg), button[aria-label*="close" i]').first();
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click({ force: true });
      await page.waitForTimeout(500);
      console.log('Closed modal via X button');
      return;
    }
  } catch {
    // Try next method
  }

  // Method 2: Press Escape
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    console.log('Closed modal via Escape key');
  } catch {
    // Ignore errors
  }

  // Method 3: Click outside the modal on the backdrop
  try {
    const backdrop = page.locator('.fixed.inset-0.bg-black\\/60').first();
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Click at a corner that's outside the modal
      await page.mouse.click(50, 50);
      await page.waitForTimeout(500);
      console.log('Closed modal via backdrop click');
    }
  } catch {
    // Ignore errors
  }
}

async function captureScreenshots() {
  console.log('Starting screenshot capture...');
  console.log('Screenshots will be saved to:', SCREENSHOTS_DIR);

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Set localStorage BEFORE navigating to dismiss sound banner
  await page.addInitScript(() => {
    localStorage.setItem('lottodrop_audio_preferences', JSON.stringify({
      enabled: false,
      volume: 0.7,
      dismissedBanner: true,
      lastUpdated: new Date().toISOString()
    }));
  });

  try {
    // Navigate to home page
    console.log('Navigating to home page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Dismiss login modal if it appears
    await dismissLoginModal(page);
    await page.waitForTimeout(1000);

    // Wait for lobby content to load (room cards)
    console.log('Waiting for lobby to load...');
    try {
      await page.waitForSelector('text=Fast Drop', { timeout: 15000 });
      console.log('Found "Fast Drop" - lobby loaded');
    } catch {
      console.log('Could not find "Fast Drop" text, checking page state...');
    }
    await waitForContent(page);

    // Verify modal is closed
    const modalStillVisible = await page.locator('text=Welcome Back!').isVisible().catch(() => false);
    if (modalStillVisible) {
      console.log('Modal still visible, trying additional methods...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // 1. Capture quick-start-demo.png - Lobby view
    console.log('Capturing quick-start-demo.png...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'quick-start-demo.png'),
      fullPage: false
    });
    console.log('✓ quick-start-demo.png captured');

    // 2. Capture join-room-process.png - Focus on a room card (clip region)
    console.log('Capturing join-room-process.png...');
    // Find the first room card and get its bounding box for a focused screenshot
    const roomCard = page.locator('[class*="room"], [class*="card"]').first();
    const cardBox = await roomCard.boundingBox().catch(() => null);

    if (cardBox) {
      // Capture with some padding around the card
      const padding = 20;
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'join-room-process.png'),
        clip: {
          x: Math.max(0, cardBox.x - padding),
          y: Math.max(0, cardBox.y - padding),
          width: cardBox.width + padding * 2,
          height: cardBox.height + padding * 2
        }
      });
    } else {
      // Fallback to full page screenshot (same as quick-start)
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'join-room-process.png'),
        fullPage: false
      });
    }
    console.log('✓ join-room-process.png captured');

    // 3. Capture countdown-timer.png - Use lobby view (shows room status)
    console.log('Capturing countdown-timer.png...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'countdown-timer.png'),
      fullPage: false
    });
    console.log('✓ countdown-timer.png captured');

    // 4. Navigate to Results page
    console.log('Navigating to Results page...');
    await page.goto(`${BASE_URL}/results`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await dismissLoginModal(page);
    await waitForContent(page);

    // 5. Capture winner-selection.png - Results page
    console.log('Capturing winner-selection.png...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'winner-selection.png'),
      fullPage: false
    });
    console.log('✓ winner-selection.png captured');

    // 6. Capture prize-distribution.png - Results page (scroll down)
    console.log('Capturing prize-distribution.png...');
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'prize-distribution.png'),
      fullPage: false
    });
    console.log('✓ prize-distribution.png captured');

    // 7. Navigate to How to Deposit page
    console.log('Navigating to How to Deposit page...');
    await page.goto(`${BASE_URL}/how-to-deposit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await dismissLoginModal(page);
    await waitForContent(page);

    // 8. Capture tips-strategies.png - How to Deposit page
    console.log('Capturing tips-strategies.png...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'tips-strategies.png'),
      fullPage: false
    });
    console.log('✓ tips-strategies.png captured');

    console.log('\n✅ All screenshots captured successfully!');

  } catch (error) {
    console.error('Error capturing screenshots:', error);
    // Take a debug screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'debug-error.png'),
      fullPage: true
    });
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
