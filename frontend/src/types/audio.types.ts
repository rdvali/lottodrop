/**
 * Audio Service Type Definitions
 *
 * Production-grade audio types for LottoDrop gaming platform
 * Supports Web Audio API with HTMLAudioElement fallback
 */

// Audio playback options
export interface AudioPlayOptions {
  volume?: number // 0-1 range, overrides master volume for this instance
  loop?: boolean // Whether to loop the audio
  fadeIn?: number // Fade in duration in milliseconds
  fadeOut?: number // Fade out duration when stopping in milliseconds
  delay?: number // Delay before playing in milliseconds
  scheduleTime?: number // Absolute time to schedule playback (Web Audio API only, in AudioContext.currentTime)
}

// Audio asset configuration
export interface AudioAsset {
  key: string // Unique identifier (e.g., "countdown.tick_3")
  sources: string[] // Array of file paths in priority order [.ogg, .mp3]
  preload?: boolean // Whether to preload this asset
  volume?: number // Default volume for this asset (0-1)
  pool?: number // Number of instances to create for polyphonic playback
  duration?: number // Sound duration in seconds (for sequencing)
  type?: SoundType // Sound category for behavioral hints
}

// Sound type classification
export type SoundType =
  | 'tick' // Short percussive sound
  | 'chime' // Melodic notification
  | 'whoosh' // Transition/swoosh effect
  | 'riser' // Building tension/crescendo
  | 'click' // UI interaction
  | 'thump' // Impact/drum hit
  | 'sparkle_up' // Positive feedback (ascending)
  | 'soft_down' // Negative feedback (descending)
  | 'hover' // Hover state feedback
  | 'ambient' // Background/loop

// Audio manifest structure
export interface AudioManifest {
  groups: {
    master: {
      volume: number // Master volume (0-1)
    }
    sfx?: {
      volume?: number // Sound effects group volume
    }
    music?: {
      volume?: number // Music group volume
    }
  }
  assets: Record<string, string[]> // key -> [ogg, mp3] paths
  preload?: string[] // Array of asset keys to preload
  durations?: Record<string, number> // key -> duration in seconds (for sequencing)
  types?: Record<string, SoundType> // key -> sound type classification
}

// Audio player state
export interface AudioPlayerState {
  isPlaying: boolean
  isPaused: boolean
  duration: number
  currentTime: number
  volume: number
  loop: boolean
}

// Audio service status
export interface AudioServiceStatus {
  isInitialized: boolean
  isEnabled: boolean
  isMuted: boolean
  masterVolume: number
  loadedAssets: string[]
  failedAssets: string[]
  activeAudioAPI: 'WebAudio' | 'HTMLAudio' | 'None'
  canAutoplay: boolean
}

// Audio loading result
export interface AudioLoadResult {
  key: string
  success: boolean
  error?: string
  format?: 'ogg' | 'mp3'
}

// Audio playback result (returned by play())
export interface AudioPlayResult {
  key: string
  duration: number // Sound duration in seconds
  scheduledTime?: number // When sound was scheduled (Web Audio API time)
  endTime?: number // Calculated end time (scheduledTime + duration)
}

// Web Audio API buffer cache
export interface AudioBufferCache {
  buffer: AudioBuffer
  sources: AudioBufferSourceNode[]
  gainNode: GainNode
}

// HTML Audio element cache
export interface HTMLAudioCache {
  element: HTMLAudioElement
  isPlaying: boolean
}

// Audio context state
export interface AudioContextState {
  context: AudioContext | null
  masterGain: GainNode | null
  buffers: Map<string, AudioBufferCache>
}

// HTML Audio fallback state
export interface HTMLAudioState {
  elements: Map<string, HTMLAudioCache>
}

// Error types for audio operations
export type AudioErrorType =
  | 'INITIALIZATION_FAILED'
  | 'LOAD_FAILED'
  | 'PLAY_FAILED'
  | 'UNSUPPORTED_FORMAT'
  | 'AUTOPLAY_BLOCKED'
  | 'CONTEXT_SUSPENDED'
  | 'NOT_FOUND'
  | 'ALREADY_PLAYING';

// Audio error interface
export interface AudioError {
  type: AudioErrorType
  message: string
  key?: string
  originalError?: Error
}

// Audio event types
export type AudioEventType =
  | 'initialized'
  | 'enabled'
  | 'disabled'
  | 'assetLoaded'
  | 'assetFailed'
  | 'play'
  | 'stop'
  | 'volumeChanged'
  | 'muted'
  | 'unmuted'
  | 'statusChanged'
  | 'error';

// Audio event listener
export type AudioEventListener = (event: AudioEventType, data?: any) => void;

// Sound keys enum for type safety
export enum SoundKey {
  // Countdown phase (differentiated by position)
  COUNTDOWN_TICK_3 = 'countdown.tick_3',
  COUNTDOWN_TICK_2 = 'countdown.tick_2',
  COUNTDOWN_TICK_1 = 'countdown.tick_1',
  COUNTDOWN_GO = 'countdown.go',

  // Round phase
  ROUND_START = 'round.start',

  // Reveal phase (VRF winner selection)
  REVEAL_RISER = 'reveal.riser',
  REVEAL_TICK = 'reveal.tick',
  REVEAL_DRUM = 'reveal.drum',
  REVEAL_SUSPENSE = 'reveal.suspense',

  // Result phase
  RESULT_WIN = 'result.win',
  RESULT_LOSE = 'result.lose',

  // UI interactions
  UI_BUTTON_CLICK = 'ui.button_click',
  UI_HOVER = 'ui.hover',
}

// Audio format detection result
export interface AudioFormatSupport {
  ogg: boolean
  mp3: boolean
  wav: boolean
  aac: boolean
  preferredFormat: 'ogg' | 'mp3' | 'wav' | 'none'
}
