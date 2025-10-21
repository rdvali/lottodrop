# LottoDrop Audio Service - Quick Reference Card

## 🚀 Quick Start (3 Steps)

### 1. Initialize in App.tsx
```typescript
import { useEffect } from 'react'
import { audioService } from './services/audio'
import audioManifest from '../public/audio/manifest.json'

function App() {
  useEffect(() => {
    audioService.init(audioManifest)
      .then(() => console.log('Audio ready'))
      .catch(err => console.error('Audio error:', err))
    return () => audioService.dispose()
  }, [])

  return <YourApp />
}
```

### 2. Use in Components
```typescript
import { useAudio } from '@/hooks/useAudio'

function Component() {
  const { play, enable, isEnabled } = useAudio()

  return (
    <>
      {!isEnabled && <button onClick={enable}>🔊 Enable Sound</button>}
      <button onClick={() => play('countdown.tick')}>Play Sound</button>
    </>
  )
}
```

### 3. Connect to Game Events
```typescript
socketService.onCountdown((data) => {
  play(data.countdown > 0 ? 'countdown.tick' : 'countdown.go')
})

socketService.onGameCompleted((data) => {
  const isWinner = data.winners.some(w => w.userId === userId)
  play(isWinner ? 'result.win' : 'result.lose')
})
```

---

## 🎵 Available Sounds

| Key | Description | When to Use |
|-----|-------------|-------------|
| `countdown.tick` | Timer tick (3,2,1) | During countdown |
| `countdown.go` | Countdown finish | When countdown reaches 0 |
| `round.start` | Round start fanfare | Game round begins |
| `reveal.riser` | Tension builder | Winner reveal phase |
| `reveal.tick` | Reveal tick | Number reveal animation |
| `result.win` | Win celebration | Player wins |
| `result.lose` | Loss feedback | Player loses |
| `button.click` | Button feedback | Any button click |
| `button.hover` | Hover sound | Button hover (subtle) |
| `notification.sound` | Alert sound | Notifications |
| `balance.update` | Balance change | Funds added/removed |
| `join.room` | Join sound | User joins room |
| `leave.room` | Leave sound | User leaves room |

---

## 🎮 Common Usage Patterns

### Play with Options
```typescript
play('result.win', {
  volume: 0.9,      // Override volume (0-1)
  fadeIn: 200,      // Fade in over 200ms
  delay: 100,       // Wait 100ms before playing
  loop: false       // Don't loop
})
```

### Volume Controls
```typescript
const { setVolume, mute, masterVolume, isMuted } = useAudio()

setVolume(0.8)           // Set master volume
mute(true)               // Mute all sounds
mute(false)              // Unmute
console.log(masterVolume) // Current volume (0-1)
```

### Enable/Disable
```typescript
const { enable, disable, isEnabled } = useAudio()

enable()                 // Enable audio (required on mobile)
disable()                // Disable all audio
console.log(isEnabled)   // Check if enabled
```

### Stop Sounds
```typescript
const { stop, stopAll } = useAudio()

stop('reveal.riser')     // Stop specific sound
stopAll()                // Stop all playing sounds
```

---

## 📱 Mobile Integration

### Show Enable Prompt
```typescript
const { enable, isEnabled, canAutoplay } = useAudio()

{!canAutoplay && !isEnabled && (
  <div className="audio-prompt">
    <h3>🔊 Enable Game Audio</h3>
    <button onClick={enable}>Enable Sound</button>
  </div>
)}
```

### Auto-enable on First Interaction
```typescript
useEffect(() => {
  const handleFirstClick = () => {
    if (!isEnabled) enable()
    document.removeEventListener('click', handleFirstClick)
  }
  document.addEventListener('click', handleFirstClick)
  return () => document.removeEventListener('click', handleFirstClick)
}, [isEnabled, enable])
```

---

## 🎯 Game Event Mapping

### Countdown Events
```typescript
socketService.onGameStarting(() => play('round.start', { fadeIn: 150 }))
socketService.onCountdown((data) => {
  play(data.countdown > 0 ? 'countdown.tick' : 'countdown.go')
})
```

### Reveal Phase
```typescript
socketService.onAnimationStart((data) => {
  play('reveal.riser', { fadeIn: 200 })

  // Optional: periodic ticks during reveal
  const interval = setInterval(() => play('reveal.tick', { volume: 0.6 }), 500)
  setTimeout(() => clearInterval(interval), data.duration)
})
```

### Results
```typescript
socketService.onGameCompleted((data) => {
  const isWinner = data.winners.some(w => w.userId === currentUserId)
  play(isWinner ? 'result.win' : 'result.lose', {
    volume: isWinner ? 1.0 : 0.8,
    fadeIn: 100
  })
})
```

### Room Activity
```typescript
socketService.onUserJoined(() => play('join.room', { volume: 0.5 }))
socketService.onUserLeft(() => play('leave.room', { volume: 0.5 }))
```

---

## 🔧 Settings UI Component

```typescript
function AudioSettings() {
  const { isEnabled, enable, disable, masterVolume, setVolume, isMuted, mute } = useAudio()

  return (
    <div className="audio-settings">
      <label>
        <input type="checkbox" checked={isEnabled}
               onChange={(e) => e.target.checked ? enable() : disable()} />
        Enable Sound
      </label>

      <label>
        Volume: {Math.round(masterVolume * 100)}%
        <input type="range" min="0" max="1" step="0.05"
               value={masterVolume} onChange={(e) => setVolume(+e.target.value)}
               disabled={!isEnabled} />
      </label>

      <label>
        <input type="checkbox" checked={isMuted}
               onChange={(e) => mute(e.target.checked)} disabled={!isEnabled} />
        Mute All
      </label>
    </div>
  )
}
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| No sound on mobile | Call `enable()` on user interaction |
| Volume too low | Adjust `setVolume(0.8)` or check asset loudness |
| Sounds not loading | Verify files exist in `/public/audio/sfx/` |
| Multiple instances | Normal - polyphonic playback is supported |
| Memory leak | Call `audioService.dispose()` in cleanup |

---

## 📊 Status Monitoring

```typescript
const { status } = useAudio()

console.log({
  isInitialized: status.isInitialized,
  audioAPI: status.activeAudioAPI,        // 'WebAudio' or 'HTMLAudio'
  loadedAssets: status.loadedAssets,      // Array of loaded sound keys
  failedAssets: status.failedAssets,      // Array of failed sound keys
  canAutoplay: status.canAutoplay         // Mobile autoplay allowed?
})
```

---

## 🎨 Custom Sounds

### Add New Sound
1. Create OGG and MP3 files
2. Place in `/public/audio/sfx/`
3. Update `/public/audio/manifest.json`:
```json
{
  "assets": {
    "my.custom.sound": [
      "/audio/sfx/my_sound.ogg",
      "/audio/sfx/my_sound.mp3"
    ]
  }
}
```
4. Use in code:
```typescript
play('my.custom.sound')
```

---

## 📝 TypeScript Types

```typescript
import type {
  AudioPlayOptions,
  AudioServiceStatus,
  SoundKey
} from '@/types/audio.types'

// Play options
const options: AudioPlayOptions = {
  volume: 0.8,
  loop: false,
  fadeIn: 200,
  delay: 0
}

// Using enum for type safety
play(SoundKey.COUNTDOWN_TICK)  // Compile-time checking
```

---

## 🔗 Useful Links

- **Full Documentation**: `/frontend/src/services/audio/README.md`
- **Integration Examples**: `/frontend/src/examples/GameRoomAudioIntegration.tsx`
- **Implementation Summary**: `/AUDIO_SERVICE_IMPLEMENTATION.md`
- **Test Suite**: `/frontend/src/services/audio/__tests__/AudioService.test.ts`

---

## 💡 Pro Tips

1. **Preload Critical Sounds**: Add to manifest's `preload` array
2. **Use Fade In**: Smooths playback start, sounds more polished
3. **Lower Volume for Ambient**: Use `{ volume: 0.5 }` for background sounds
4. **Test on iOS Safari**: Mobile autoplay is the biggest gotcha
5. **Monitor Status**: Check `failedAssets` to catch loading issues
6. **Use Type Safety**: Import `SoundKey` enum for compile-time validation

---

**Need Help?** Check the full README or integration examples!
