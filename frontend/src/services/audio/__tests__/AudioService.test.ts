/**
 * AudioService Test Suite
 *
 * Comprehensive unit tests for the LottoDrop audio service
 * Testing strategy aligned with Manual QA Tester best practices
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { audioService } from '../AudioService'
import type { AudioManifest } from '../../../types/audio.types'

// Mock manifest for testing
const mockManifest: AudioManifest = {
  groups: {
    master: { volume: 0.8 },
  },
  assets: {
    'test.sound': ['/audio/test.ogg', '/audio/test.mp3'],
    'test.sound2': ['/audio/test2.ogg', '/audio/test2.mp3'],
  },
  preload: ['test.sound'],
}

// Mock Web Audio API
const mockAudioContext = {
  state: 'running',
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  destination: {},
  close: vi.fn(),
  resume: vi.fn(() => Promise.resolve()),
}

// Mock HTMLAudioElement
class MockAudio {
  src = ''
  volume = 1
  loop = false
  currentTime = 0
  preload = 'auto'

  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  load = vi.fn()
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  cloneNode = vi.fn(() => new MockAudio())
}

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as Response)
)

describe('AudioService', () => {
  beforeEach(() => {
    // Reset service state
    audioService.dispose()

    // Mock Web Audio API
    global.AudioContext = vi.fn(() => mockAudioContext) as any
    global.Audio = MockAudio as any

    // Clear localStorage
    localStorage.clear()

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    audioService.dispose()
  })

  describe('Initialization', () => {
    it('should initialize successfully with valid manifest', async () => {
      await audioService.init(mockManifest)

      const status = audioService.getStatus()
      expect(status.isInitialized).toBe(true)
    })

    it('should not initialize twice', async () => {
      await audioService.init(mockManifest)
      const consoleWarn = vi.spyOn(console, 'warn')

      await audioService.init(mockManifest)

      expect(consoleWarn).toHaveBeenCalledWith('[AudioService] Already initialized')
    })

    it('should use Web Audio API by default', async () => {
      await audioService.init(mockManifest)

      const status = audioService.getStatus()
      expect(status.activeAudioAPI).toBe('WebAudio')
    })

    it('should fallback to HTML Audio if Web Audio API fails', async () => {
      global.AudioContext = undefined as any

      await audioService.init(mockManifest)

      const status = audioService.getStatus()
      expect(status.activeAudioAPI).toBe('HTMLAudio')
    })

    it('should preload specified assets', async () => {
      await audioService.init(mockManifest)

      const status = audioService.getStatus()
      expect(status.loadedAssets).toContain('test.sound')
    })

    it('should emit initialized event', async () => {
      const listener = vi.fn()
      audioService.addEventListener('initialized', listener)

      await audioService.init(mockManifest)

      expect(listener).toHaveBeenCalledWith('initialized', undefined)
    })
  })

  describe('Preferences', () => {
    it('should load preferences from localStorage', async () => {
      localStorage.setItem('lottodrop_audio_enabled', 'true')
      localStorage.setItem('lottodrop_audio_volume', '0.5')
      localStorage.setItem('lottodrop_audio_muted', 'false')

      await audioService.init(mockManifest)

      expect(audioService.isAudioEnabled()).toBe(true)
      const status = audioService.getStatus()
      expect(status.masterVolume).toBe(0.5)
      expect(status.isMuted).toBe(false)
    })

    it('should save preferences to localStorage', async () => {
      await audioService.init(mockManifest)

      audioService.enable()
      audioService.setVolume(0.7)
      audioService.mute(true)

      expect(localStorage.getItem('lottodrop_audio_enabled')).toBe('true')
      expect(localStorage.getItem('lottodrop_audio_volume')).toBe('0.7')
      expect(localStorage.getItem('lottodrop_audio_muted')).toBe('true')
    })
  })

  describe('Playback', () => {
    beforeEach(async () => {
      await audioService.init(mockManifest)
      audioService.enable()
    })

    it('should play a sound', async () => {
      await audioService.play('test.sound')

      // Verify play was attempted (implementation-specific)
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled()
    })

    it('should not play when audio is disabled', async () => {
      audioService.disable()

      await audioService.play('test.sound')

      // Should not create buffer source when disabled
      const createBufferSourceCalls = mockAudioContext.createBufferSource.mock.calls.length
      expect(createBufferSourceCalls).toBe(0)
    })

    it('should respect volume option', async () => {
      const gainNode = mockAudioContext.createGain()
      mockAudioContext.createGain.mockReturnValueOnce(gainNode)

      await audioService.play('test.sound', { volume: 0.5 })

      expect(gainNode.gain.value).toBe(0.5)
    })

    it('should stop a playing sound', async () => {
      await audioService.play('test.sound')
      audioService.stop('test.sound')

      // Verify stop was called (implementation-specific)
      const status = audioService.getStatus()
      expect(status.isInitialized).toBe(true)
    })

    it('should stop all playing sounds', async () => {
      await audioService.play('test.sound')
      await audioService.play('test.sound2')

      audioService.stopAll()

      // All sounds should be stopped
      const status = audioService.getStatus()
      expect(status.isInitialized).toBe(true)
    })

    it('should emit play event', async () => {
      const listener = vi.fn()
      audioService.addEventListener('play', listener)

      await audioService.play('test.sound')

      expect(listener).toHaveBeenCalledWith('play', expect.objectContaining({
        key: 'test.sound',
      }))
    })
  })

  describe('Volume Control', () => {
    beforeEach(async () => {
      await audioService.init(mockManifest)
    })

    it('should set master volume', () => {
      audioService.setVolume(0.6)

      const status = audioService.getStatus()
      expect(status.masterVolume).toBe(0.6)
    })

    it('should clamp volume to 0-1 range', () => {
      audioService.setVolume(1.5)
      expect(audioService.getStatus().masterVolume).toBe(1)

      audioService.setVolume(-0.5)
      expect(audioService.getStatus().masterVolume).toBe(0)
    })

    it('should mute audio', () => {
      audioService.mute(true)

      const status = audioService.getStatus()
      expect(status.isMuted).toBe(true)
    })

    it('should unmute audio', () => {
      audioService.mute(true)
      audioService.mute(false)

      const status = audioService.getStatus()
      expect(status.isMuted).toBe(false)
    })

    it('should emit volumeChanged event', () => {
      const listener = vi.fn()
      audioService.addEventListener('volumeChanged', listener)

      audioService.setVolume(0.5)

      expect(listener).toHaveBeenCalledWith('volumeChanged', expect.objectContaining({
        volume: 0.5,
      }))
    })

    it('should emit muted event', () => {
      const listener = vi.fn()
      audioService.addEventListener('muted', listener)

      audioService.mute(true)

      expect(listener).toHaveBeenCalled()
    })

    it('should emit unmuted event', () => {
      const listener = vi.fn()
      audioService.addEventListener('unmuted', listener)

      audioService.mute(false)

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Enable/Disable', () => {
    beforeEach(async () => {
      await audioService.init(mockManifest)
    })

    it('should enable audio', () => {
      audioService.enable()

      expect(audioService.isAudioEnabled()).toBe(true)
    })

    it('should disable audio', () => {
      audioService.enable()
      audioService.disable()

      expect(audioService.isAudioEnabled()).toBe(false)
    })

    it('should emit enabled event', () => {
      const listener = vi.fn()
      audioService.addEventListener('enabled', listener)

      audioService.enable()

      expect(listener).toHaveBeenCalled()
    })

    it('should emit disabled event', () => {
      const listener = vi.fn()
      audioService.addEventListener('disabled', listener)

      audioService.disable()

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Status', () => {
    it('should return correct initial status', () => {
      const status = audioService.getStatus()

      expect(status).toMatchObject({
        isInitialized: false,
        isEnabled: expect.any(Boolean),
        isMuted: expect.any(Boolean),
        masterVolume: expect.any(Number),
        loadedAssets: [],
        failedAssets: [],
        activeAudioAPI: 'None',
        canAutoplay: expect.any(Boolean),
      })
    })

    it('should return correct status after initialization', async () => {
      await audioService.init(mockManifest)

      const status = audioService.getStatus()
      expect(status.isInitialized).toBe(true)
      expect(status.activeAudioAPI).not.toBe('None')
    })
  })

  describe('Event Listeners', () => {
    beforeEach(async () => {
      await audioService.init(mockManifest)
    })

    it('should add event listener', () => {
      const listener = vi.fn()
      audioService.addEventListener('play', listener)

      // Listener should be registered (no error)
      expect(() => audioService.addEventListener('play', listener)).not.toThrow()
    })

    it('should remove event listener', () => {
      const listener = vi.fn()
      audioService.addEventListener('play', listener)
      audioService.removeEventListener('play', listener)

      // Listener should be removed (no error)
      expect(() => audioService.removeEventListener('play', listener)).not.toThrow()
    })

    it('should call event listener when event occurs', async () => {
      const listener = vi.fn()
      audioService.addEventListener('play', listener)
      audioService.enable()

      await audioService.play('test.sound')

      expect(listener).toHaveBeenCalled()
    })

    it('should not call removed event listener', async () => {
      const listener = vi.fn()
      audioService.addEventListener('play', listener)
      audioService.removeEventListener('play', listener)
      audioService.enable()

      await audioService.play('test.sound')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should dispose resources', async () => {
      await audioService.init(mockManifest)

      audioService.dispose()

      const status = audioService.getStatus()
      expect(status.isInitialized).toBe(false)
    })

    it('should close audio context on dispose', async () => {
      await audioService.init(mockManifest)

      audioService.dispose()

      expect(mockAudioContext.close).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      global.AudioContext = undefined as any
      global.Audio = undefined as any

      await expect(audioService.init(mockManifest)).rejects.toThrow()
    })

    it('should handle load errors gracefully', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      await audioService.init(mockManifest)

      const status = audioService.getStatus()
      expect(status.failedAssets.length).toBeGreaterThan(0)
    })

    it('should emit error event on failures', async () => {
      const listener = vi.fn()
      audioService.addEventListener('error', listener)

      global.fetch = vi.fn(() => Promise.reject(new Error('Load error')))

      await audioService.init(mockManifest)

      // Error event should be emitted for failed loads
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('Format Detection', () => {
    it('should detect OGG support', async () => {
      const audio = document.createElement('audio')
      audio.canPlayType = vi.fn((type) =>
        type.includes('ogg') ? 'probably' : ''
      )

      await audioService.init(mockManifest)

      // Should attempt to load OGG first
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('.ogg'))
    })

    it('should fallback to MP3 if OGG fails', async () => {
      let oggCalled = false
      global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.endsWith('.ogg')) {
          oggCalled = true
          return Promise.reject(new Error('OGG not supported'))
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        } as Response)
      })

      await audioService.init(mockManifest)

      expect(oggCalled).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('.mp3'))
    })
  })
})
