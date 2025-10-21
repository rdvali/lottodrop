# LottoDrop Audio Service

Production-grade audio service for real-time gaming platform with Web Audio API support, mobile autoplay compliance, and persistent user preferences.

## Features

- **Web Audio API with Fallback**: Uses Web Audio API for low-latency playback, falls back to HTMLAudioElement if unavailable
- **Format Detection**: Automatically detects supported formats (.ogg preferred, .mp3 fallback)
- **Mobile Autoplay Compliance**: Handles mobile browser autoplay policies correctly
- **Persistent Preferences**: Saves volume, mute, and enabled state to localStorage
- **Low-Latency Playback**: Target latency ≤50ms after trigger
- **Asset Preloading**: Preload critical sounds on initialization
- **Master Volume Control**: Global volume control with per-sound volume override
- **Event System**: Subscribe to audio events (play, stop, volume changes, etc.)
- **TypeScript Support**: Fully typed for type safety

## Installation

The audio service is already integrated into the LottoDrop frontend. Import it from the services directory:

```typescript
import { audioService } from '@/services/audio'
import { useAudio } from '@/hooks/useAudio'
```

## Quick Start

### 1. Initialize the Audio Service

Initialize the audio service early in your app (e.g., in `App.tsx` or a root provider):

```typescript
import { useEffect } from 'react'
import { audioService } from './services/audio'
import audioManifest from '../public/audio/manifest.json'

function App() {
  useEffect(() => {
    // Initialize audio service
    audioService.init(audioManifest).catch(error => {
      console.error('Failed to initialize audio:', error)
    })
  }, [])

  return <YourApp />
}
```

### 2. Use in Components with Hook

```typescript
import { useAudio } from '@/hooks/useAudio'

function GameRoom() {
  const { play, enable, isEnabled } = useAudio()

  // Enable audio on user interaction (required for mobile)
  const handleEnableSound = () => {
    enable()
  }

  // Play a sound
  const handleGameStart = () => {
    play('round.start')
  }

  return (
    <div>
      {!isEnabled && (
        <button onClick={handleEnableSound}>
          Enable Sound
        </button>
      )}
      <button onClick={handleGameStart}>Start Game</button>
    </div>
  )
}
```

## Usage Examples

### Basic Playback

```typescript
import { useAudio } from '@/hooks/useAudio'

function Component() {
  const { play } = useAudio()

  // Simple playback
  const playTick = () => {
    play('countdown.tick')
  }

  // Playback with options
  const playWin = () => {
    play('result.win', {
      volume: 0.9,        // Override volume for this instance
      fadeIn: 200,        // Fade in over 200ms
      delay: 100,         // Delay 100ms before playing
    })
  }

  return (
    <>
      <button onClick={playTick}>Play Tick</button>
      <button onClick={playWin}>Play Win Sound</button>
    </>
  )
}
```

### Volume Control

```typescript
function VolumeControl() {
  const { masterVolume, setVolume, mute, isMuted } = useAudio()

  return (
    <div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={masterVolume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
      />
      <button onClick={() => mute(!isMuted)}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  )
}
```

### Countdown Sequence

```typescript
function Countdown() {
  const { play } = useAudio()

  const startCountdown = async () => {
    // Play tick sounds
    for (let i = 3; i > 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      play('countdown.tick')
    }
    // Play go sound
    await new Promise(resolve => setTimeout(resolve, 1000))
    play('countdown.go')
  }

  return <button onClick={startCountdown}>Start Countdown</button>
}
```

### Game Room Integration

```typescript
import { useEffect } from 'react'
import { useAudio } from '@/hooks/useAudio'
import { socketService } from '@/services/socket'

function GameRoom({ roomId }: { roomId: string }) {
  const { play, enable, isEnabled } = useAudio()

  useEffect(() => {
    // Listen for game events
    const handleGameStarting = () => {
      play('round.start', { fadeIn: 100 })
    }

    const handleCountdown = (data: { countdown: number }) => {
      if (data.countdown > 0) {
        play('countdown.tick')
      } else {
        play('countdown.go')
      }
    }

    const handleGameCompleted = (data: { winners: any[] }) => {
      const isWinner = data.winners.some(w => w.userId === currentUserId)
      play(isWinner ? 'result.win' : 'result.lose')
    }

    socketService.onGameStarting(handleGameStarting)
    socketService.onCountdown(handleCountdown)
    socketService.onGameCompleted(handleGameCompleted)

    return () => {
      socketService.offGameStarting(handleGameStarting)
      socketService.offCountdown(handleCountdown)
      socketService.offGameCompleted(handleGameCompleted)
    }
  }, [roomId, play])

  return (
    <div>
      {!isEnabled && (
        <button onClick={enable} className="enable-sound-btn">
          🔊 Enable Sound
        </button>
      )}
      {/* Game room content */}
    </div>
  )
}
```

### Mobile Autoplay Handling

```typescript
function MobileAudioEnabler() {
  const { enable, isEnabled, canAutoplay } = useAudio()

  // Show prompt on mobile if audio isn't enabled
  if (!isEnabled && !canAutoplay) {
    return (
      <div className="audio-prompt-overlay">
        <div className="audio-prompt-card">
          <h3>Enable Sound</h3>
          <p>Tap to enable game sounds and effects</p>
          <button onClick={enable}>Enable Audio</button>
        </div>
      </div>
    )
  }

  return null
}
```

### Settings Integration

```typescript
function AudioSettings() {
  const {
    isEnabled,
    enable,
    disable,
    masterVolume,
    setVolume,
    isMuted,
    mute,
    status,
  } = useAudio()

  return (
    <div className="audio-settings">
      <h3>Audio Settings</h3>

      <div className="setting-row">
        <label>Enable Sound</label>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => e.target.checked ? enable() : disable()}
        />
      </div>

      <div className="setting-row">
        <label>Master Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={masterVolume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          disabled={!isEnabled}
        />
        <span>{Math.round(masterVolume * 100)}%</span>
      </div>

      <div className="setting-row">
        <label>Mute All</label>
        <input
          type="checkbox"
          checked={isMuted}
          onChange={(e) => mute(e.target.checked)}
          disabled={!isEnabled}
        />
      </div>

      <div className="audio-info">
        <p>Audio API: {status.activeAudioAPI}</p>
        <p>Loaded Assets: {status.loadedAssets.length}</p>
        <p>Failed Assets: {status.failedAssets.length}</p>
      </div>
    </div>
  )
}
```

## Advanced Usage

### Direct Service Access

```typescript
import { audioService } from '@/services/audio'

// Play sound without hook
audioService.play('button.click', { volume: 0.8 })

// Stop specific sound
audioService.stop('reveal.riser')

// Stop all sounds
audioService.stopAll()

// Get detailed status
const status = audioService.getStatus()
console.log('Audio status:', status)
```

### Event Listeners

```typescript
import { audioService } from '@/services/audio'

// Listen for audio events
audioService.addEventListener('play', (event, data) => {
  console.log('Sound played:', data.key)
})

audioService.addEventListener('volumeChanged', (event, data) => {
  console.log('Volume changed to:', data.volume)
})

audioService.addEventListener('error', (event, error) => {
  console.error('Audio error:', error)
})
```

### Looping Background Audio

```typescript
function BackgroundMusic() {
  const { play, stop } = useAudio()

  useEffect(() => {
    // Start looping music
    play('background.music', { loop: true, volume: 0.3 })

    return () => {
      // Stop music on unmount
      stop('background.music')
    }
  }, [play, stop])

  return null
}
```

## Sound Manifest Structure

The `manifest.json` file defines all available sounds:

```json
{
  "groups": {
    "master": { "volume": 0.8 },
    "sfx": { "volume": 1.0 },
    "music": { "volume": 0.6 }
  },
  "assets": {
    "countdown.tick": [
      "/audio/sfx/count_tick.ogg",
      "/audio/sfx/count_tick.mp3"
    ]
  },
  "preload": ["countdown.tick", "round.start"]
}
```

### Available Sound Keys

- `countdown.tick` - Countdown tick sound
- `countdown.go` - Countdown finish sound
- `round.start` - Round start fanfare
- `reveal.riser` - Tension-building riser
- `reveal.tick` - Reveal tick sound
- `result.win` - Win celebration fanfare
- `result.lose` - Loss sting
- `button.click` - Button click feedback
- `button.hover` - Button hover sound
- `notification.sound` - Notification alert
- `balance.update` - Balance change sound
- `join.room` - Room join sound
- `leave.room` - Room leave sound

## Audio Asset Requirements

For optimal performance, audio files should meet these specifications:

- **Format**: OGG Vorbis (primary) + MP3 (fallback)
- **Sample Rate**: 44.1 kHz
- **Channels**: Mono
- **File Size**: ≤40 KB per file
- **Loudness**: −18 to −20 LUFS (normalized)
- **Duration**: 0.1s to 3s (keep sounds short)

### Audio Production Tips

1. **Export dual formats**: Always provide both .ogg and .mp3
2. **Normalize volume**: Use a loudness meter to target −18 LUFS
3. **Trim silence**: Remove leading/trailing silence
4. **Use compression**: Apply light compression for consistent volume
5. **Test on mobile**: Verify sounds work on iOS Safari and Android Chrome

## Browser Support

- **Chrome/Edge**: Full Web Audio API support
- **Firefox**: Full Web Audio API support
- **Safari (Desktop)**: Full Web Audio API support
- **Safari (iOS)**: Requires user interaction, HTML Audio fallback
- **Chrome (Android)**: Full Web Audio API support

## Performance Considerations

### Preloading Strategy

Preload only critical sounds to minimize initial load time:

```json
{
  "preload": [
    "countdown.tick",
    "countdown.go",
    "round.start",
    "result.win",
    "result.lose"
  ]
}
```

### Memory Management

- Sounds are cached after first load
- Use `audioService.dispose()` to free memory on unmount
- Limit concurrent sounds to avoid performance issues

### Latency Optimization

- Web Audio API provides lowest latency (5-10ms)
- HTML Audio fallback has higher latency (50-100ms)
- Preloading eliminates load time latency
- Use `fadeIn` option for smoother playback

## Troubleshooting

### Sound not playing on mobile

**Solution**: Ensure user interaction before calling `enable()`:

```typescript
<button onClick={() => enable()}>Enable Sound</button>
```

### Volume too low/high

**Solution**: Adjust master volume or per-sound volume:

```typescript
// Global volume
setVolume(0.8)

// Per-sound volume
play('sound.key', { volume: 0.6 })
```

### Failed to load assets

**Solution**: Check console for errors, verify file paths in manifest:

```typescript
const status = audioService.getStatus()
console.log('Failed assets:', status.failedAssets)
```

### Audio context suspended

**Solution**: Resume context on user interaction (handled automatically):

```typescript
// Automatically handled by service
enable()
```

## API Reference

### AudioService Methods

```typescript
// Initialize service
init(manifest: AudioManifest): Promise<void>

// Playback control
play(key: string, options?: AudioPlayOptions): Promise<void>
stop(key: string): void
stopAll(): void

// Volume control
setVolume(volume: number): void
mute(shouldMute: boolean): void

// Enable/disable
enable(): void
disable(): void
isAudioEnabled(): boolean

// Status
getStatus(): AudioServiceStatus

// Events
addEventListener(event: AudioEventType, listener: AudioEventListener): void
removeEventListener(event: AudioEventType, listener: AudioEventListener): void

// Cleanup
dispose(): void
```

### useAudio Hook Return Values

```typescript
{
  // Playback
  play: (key: string, options?: AudioPlayOptions) => Promise<void>
  stop: (key: string) => void
  stopAll: () => void

  // Volume
  setVolume: (volume: number) => void
  mute: (shouldMute: boolean) => void

  // Enable/disable
  enable: () => void
  disable: () => void

  // Status
  isEnabled: boolean
  isInitialized: boolean
  isMuted: boolean
  masterVolume: number
  status: AudioServiceStatus
  canAutoplay: boolean
}
```

## License

Proprietary - LottoDrop Platform
