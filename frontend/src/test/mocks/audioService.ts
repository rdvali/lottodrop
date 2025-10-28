import { vi } from 'vitest'

/**
 * Mock Audio Service for testing
 */
export const mockAudioService = {
  init: vi.fn(() => Promise.resolve()),
  play: vi.fn(() => Promise.resolve()),
  stop: vi.fn(() => Promise.resolve()),
  setVolume: vi.fn(),
  setEnabled: vi.fn(),
  isEnabled: vi.fn(() => true),
  resumeContext: vi.fn(() => Promise.resolve()),
  getState: vi.fn(() => 'running'),
}
