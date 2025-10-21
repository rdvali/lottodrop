# LottoDrop Audio System Implementation Checklist
## Step-by-Step Guide for New Sound Definitions

**Version**: 2.0.0
**Date**: 2025-10-20
**Status**: Ready for Implementation

---

## Phase 1: Audio Asset Generation (Highest Priority)

### Task 1.1: Generate Countdown Sounds
**Files to create**: `countdown_tick_3.{ogg,mp3}`, `countdown_tick_2.{ogg,mp3}`, `countdown_tick_1.{ogg,mp3}`, `countdown_go.{ogg,mp3}`

```bash
# Using ffmpeg + SoX for audio generation

# Countdown Tick 3 (450Hz, 200ms)
sox -n countdown_tick_3.wav synth 0.2 sine 450 fade t 0.005 0.190 0.005
ffmpeg -i countdown_tick_3.wav -c:a libvorbis -q:a 5 countdown_tick_3.ogg
ffmpeg -i countdown_tick_3.wav -c:a libmp3lame -q:a 2 countdown_tick_3.mp3

# Countdown Tick 2 (550Hz, 200ms)
sox -n countdown_tick_2.wav synth 0.2 sine 550 fade t 0.005 0.190 0.005
ffmpeg -i countdown_tick_2.wav -c:a libvorbis -q:a 5 countdown_tick_2.ogg
ffmpeg -i countdown_tick_2.wav -c:a libmp3lame -q:a 2 countdown_tick_2.mp3

# Countdown Tick 1 (650Hz, 200ms)
sox -n countdown_tick_1.wav synth 0.2 sine 650 fade t 0.005 0.190 0.005
ffmpeg -i countdown_tick_1.wav -c:a libvorbis -q:a 5 countdown_tick_1.ogg
ffmpeg -i countdown_tick_1.wav -c:a libmp3lame -q:a 2 countdown_tick_1.mp3

# Countdown Go (C major chord, 800ms)
sox -n countdown_go_C.wav synth 0.8 sine 261.63 fade t 0.05 0.60 0.15
sox -n countdown_go_E.wav synth 0.8 sine 329.63 fade t 0.05 0.60 0.15
sox -n countdown_go_G.wav synth 0.8 sine 392.00 fade t 0.05 0.60 0.15
sox -m countdown_go_C.wav countdown_go_E.wav countdown_go_G.wav countdown_go.wav
ffmpeg -i countdown_go.wav -c:a libvorbis -q:a 5 countdown_go.ogg
ffmpeg -i countdown_go.wav -c:a libmp3lame -q:a 2 countdown_go.mp3
```

**Output Directory**: `/frontend/public/audio/`

**Verification**:
- [ ] Files exist in both .ogg and .mp3 formats
- [ ] Durations are exactly 200ms (ticks) and 800ms (go) ±5ms
- [ ] No clipping or distortion in waveform
- [ ] File sizes: <10KB each

---

### Task 1.2: Generate Round Start Sound
**Files to create**: `round_start.{ogg,mp3}`

```bash
# Round Start (Whoosh, 700ms)
# Generate white noise with low-pass sweep from 100Hz to 8kHz
sox -n round_start.wav synth 0.7 whitenoise \
  fade t 0.1 0.5 0.1 \
  sinc -100-8000 \
  gain -n -10
ffmpeg -i round_start.wav -c:a libvorbis -q:a 5 round_start.ogg
ffmpeg -i round_start.wav -c:a libmp3lame -q:a 2 round_start.mp3
```

**Output Directory**: `/frontend/public/audio/`

**Verification**:
- [ ] Duration is exactly 700ms ±5ms
- [ ] Sounds like a "whoosh" (swoosh transition)
- [ ] Volume normalized to -10dB peak

---

### Task 1.3: Generate VRF Reveal Sounds
**Files to create**: `reveal_riser.{ogg,mp3}`, `reveal_tick.{ogg,mp3}`, `reveal_drum.{ogg,mp3}`

```bash
# Reveal Riser (Tension riser, 2300ms, seamless loop)
sox -n reveal_riser.wav synth 2.3 sawtooth 80-400 \
  fade t 0 2.3 0 \
  gain -n -12
# Ensure loop-friendly (no attack/release)
ffmpeg -i reveal_riser.wav -c:a libvorbis -q:a 6 reveal_riser.ogg
ffmpeg -i reveal_riser.wav -c:a libmp3lame -q:a 3 reveal_riser.mp3

# Reveal Tick (Click, 50ms)
sox -n reveal_tick.wav synth 0.05 sine 2000 \
  synth 0.05 sine mix 800 \
  fade t 0.002 0.045 0.003 \
  gain -n -14
ffmpeg -i reveal_tick.wav -c:a libvorbis -q:a 5 reveal_tick.ogg
ffmpeg -i reveal_tick.wav -c:a libmp3lame -q:a 2 reveal_tick.mp3

# Reveal Drum (Thump, 250ms)
sox -n reveal_drum.wav synth 0.25 sine 60 \
  synth 0.25 sine mix 200 \
  fade t 0.01 0.20 0.04 \
  gain -n -6
ffmpeg -i reveal_drum.wav -c:a libvorbis -q:a 6 reveal_drum.ogg
ffmpeg -i reveal_drum.wav -c:a libmp3lame -q:a 3 reveal_drum.mp3
```

**Output Directory**: `/frontend/public/audio/`

**Verification**:
- [ ] Riser loops seamlessly (no gaps when looping)
- [ ] Riser duration is exactly 2300ms ±10ms
- [ ] Tick is extremely short (50ms ±2ms)
- [ ] Drum has punchy impact (250ms ±5ms)

---

### Task 1.4: Generate Result Sounds
**Files to create**: `result_win.{ogg,mp3}`, `result_lose.{ogg,mp3}`

```bash
# Result Win (Sparkle up, 1000ms)
# Ascending arpeggio: C4 → E4 → G4 → C5
sox -n win_C4.wav synth 0.25 sine 261.63 fade t 0.05 0.15 0.05
sox -n win_E4.wav synth 0.25 sine 329.63 fade t 0.05 0.15 0.05
sox -n win_G4.wav synth 0.25 sine 392.00 fade t 0.05 0.15 0.05
sox -n win_C5.wav synth 0.25 sine 523.25 fade t 0.05 0.15 0.05
sox win_C4.wav win_E4.wav win_G4.wav win_C5.wav result_win.wav
ffmpeg -i result_win.wav -c:a libvorbis -q:a 6 result_win.ogg
ffmpeg -i result_win.wav -c:a libmp3lame -q:a 3 result_win.mp3

# Result Lose (Soft down, 800ms)
# Descending: C4 → G3
sox -n result_lose.wav synth 0.8 sine 261.63-196.00 \
  fade t 0.1 0.6 0.1 \
  gain -n -12
ffmpeg -i result_lose.wav -c:a libvorbis -q:a 5 result_lose.ogg
ffmpeg -i result_lose.wav -c:a libmp3lame -q:a 2 result_lose.mp3
```

**Output Directory**: `/frontend/public/audio/`

**Verification**:
- [ ] Win sound is ascending and uplifting (1000ms ±10ms)
- [ ] Lose sound is descending and empathetic (800ms ±10ms)
- [ ] No harsh transients or clipping

---

## Phase 2: Code Implementation

### Task 2.1: Update Audio Manifest ✅ DONE
**File**: `/frontend/src/services/audio/audioManifest.ts` (or equivalent)

**Status**: The system has already implemented sound key enum updates in `audio.types.ts`.
However, you still need to update the manifest JSON/object.

```typescript
// Update manifest with new sound keys and durations
export const audioManifest: AudioManifest = {
  groups: {
    master: { volume: 0.8 },
    sfx: { volume: 1.0 }
  },
  assets: {
    // Countdown sounds (NEW: separate keys)
    'countdown.tick_3': [
      '/audio/countdown_tick_3.ogg',
      '/audio/countdown_tick_3.mp3'
    ],
    'countdown.tick_2': [
      '/audio/countdown_tick_2.ogg',
      '/audio/countdown_tick_2.mp3'
    ],
    'countdown.tick_1': [
      '/audio/countdown_tick_1.ogg',
      '/audio/countdown_tick_1.mp3'
    ],
    'countdown.go': [
      '/audio/countdown_go.ogg',
      '/audio/countdown_go.mp3'
    ],

    // Round management
    'round.start': [
      '/audio/round_start.ogg',
      '/audio/round_start.mp3'
    ],

    // VRF reveal sequence
    'reveal.riser': [
      '/audio/reveal_riser.ogg',
      '/audio/reveal_riser.mp3'
    ],
    'reveal.tick': [
      '/audio/reveal_tick.ogg',
      '/audio/reveal_tick.mp3'
    ],
    'reveal.drum': [
      '/audio/reveal_drum.ogg',
      '/audio/reveal_drum.mp3'
    ],

    // Result sounds
    'result.win': [
      '/audio/result_win.ogg',
      '/audio/result_win.mp3'
    ],
    'result.lose': [
      '/audio/result_lose.ogg',
      '/audio/result_lose.mp3'
    ]
  },

  // NEW: Add duration metadata for sequencing
  durations: {
    'countdown.tick_3': 0.2,   // 200ms
    'countdown.tick_2': 0.2,   // 200ms
    'countdown.tick_1': 0.2,   // 200ms
    'countdown.go': 0.8,       // 800ms
    'round.start': 0.7,        // 700ms
    'reveal.riser': 2.3,       // 2300ms (loop)
    'reveal.tick': 0.05,       // 50ms
    'reveal.drum': 0.25,       // 250ms
    'result.win': 1.0,         // 1000ms
    'result.lose': 0.8         // 800ms
  },

  // NEW: Add type classification for behavioral hints
  types: {
    'countdown.tick_3': 'tick',
    'countdown.tick_2': 'tick',
    'countdown.tick_1': 'tick',
    'countdown.go': 'chime',
    'round.start': 'whoosh',
    'reveal.riser': 'riser',
    'reveal.tick': 'click',
    'reveal.drum': 'thump',
    'result.win': 'sparkle_up',
    'result.lose': 'soft_down'
  },

  preload: [
    'countdown.tick_3',
    'countdown.tick_2',
    'countdown.tick_1',
    'countdown.go',
    'round.start',
    'reveal.riser',
    'reveal.tick',
    'reveal.drum'
    // result sounds loaded on-demand
  ]
}
```

**Checklist**:
- [ ] Manifest object created with all 10 sounds
- [ ] All sounds have both .ogg and .mp3 paths
- [ ] Durations added to manifest
- [ ] Types added to manifest
- [ ] Preload array includes critical sounds
- [ ] TypeScript types updated to match

---

### Task 2.2: Update GameRoom Countdown Sound Keys
**File**: `/frontend/src/pages/GameRoom/GameRoom.tsx` (lines 462-477)

**Change Required**: Replace single `'countdown.tick'` with three distinct keys

```typescript
// BEFORE (incorrect):
audioService.play('countdown.tick', { scheduleTime: tick3Time })
audioService.play('countdown.tick', { scheduleTime: tick2Time })
audioService.play('countdown.tick', { scheduleTime: tick1Time })

// AFTER (correct):
audioService.play('countdown.tick_3', { scheduleTime: tick3Time })
audioService.play('countdown.tick_2', { scheduleTime: tick2Time })
audioService.play('countdown.tick_1', { scheduleTime: tick1Time })
```

**Checklist**:
- [ ] Line 463: `'countdown.tick'` → `'countdown.tick_3'`
- [ ] Line 469: `'countdown.tick'` → `'countdown.tick_2'`
- [ ] Line 475: `'countdown.tick'` → `'countdown.tick_1'`
- [ ] Test countdown with Web Audio API scheduler
- [ ] Verify sounds play at correct visual frames

---

### Task 2.3: Update WinnerReveal Random Sound Selection
**File**: `/frontend/src/components/animations/WinnerReveal.tsx` (lines 169-191)

**Change Required**: Update `playRandom()` calls to only use `reveal.tick`

**Rationale**: Current implementation uses `playRandom(['reveal.tick', 'reveal.drum'])` but drum should ONLY play at the final winner landing (line 201). Random drums during cycling create confusion.

```typescript
// BEFORE (lines 173, 181, 189):
audioService.playRandom(['reveal.tick', 'reveal.drum'])

// AFTER:
audioService.play('reveal.tick')
```

**Checklist**:
- [ ] Line 173: Remove `playRandom`, use `play('reveal.tick')`
- [ ] Line 181: Remove `playRandom`, use `play('reveal.tick')`
- [ ] Line 189: Remove `playRandom`, use `play('reveal.tick')`
- [ ] Line 201: Keep `play('reveal.drum')` - this is correct
- [ ] Test climax sequence sounds correct with tick-only cycling
- [ ] Verify drum impact is unique and dramatic

**Alternative**: If randomness is desired for variety, use ONLY ticks:
```typescript
// If you want pitch variation:
const tickSounds = ['reveal.tick'] // Currently only one tick sound
audioService.play('reveal.tick', {
  volume: 0.8 + Math.random() * 0.2 // Random volume 0.8-1.0
})
```

---

### Task 2.4: Remove Explosion Sound References
**File**: `/frontend/src/components/animations/WinnerReveal.tsx` (lines 305, 355)

**Status**: ✅ Already commented out! Delete entirely.

```typescript
// Lines 305-306: DELETE these commented lines
// console.log('[WinnerReveal] Playing EXPLOSION sound - visual burst!')
// audioService.play('reveal.explosion').catch(err => console.warn('Audio playback failed:', err))

// Lines 355-356: DELETE these commented lines
// console.log('[WinnerReveal-Fast] Playing EXPLOSION sound - visual burst!')
// audioService.play('reveal.explosion').catch(err => console.warn('Audio playback failed:', err))
```

**Checklist**:
- [ ] Delete commented explosion sound calls (lines 305-306)
- [ ] Delete commented explosion sound calls (lines 355-356)
- [ ] Verify explosion phase remains silent (visual-only)
- [ ] Ensure no references to `'reveal.explosion'` exist in codebase

---

### Task 2.5: Update Audio Duration Constants ✅ PARTIALLY DONE
**File**: `/frontend/src/utils/audioTimingMap.ts` (lines 23-42)

**Status**: AudioService now reads durations from manifest. However, timing map should be updated for documentation consistency.

```typescript
export const AUDIO_DURATIONS = {
  // Countdown (UPDATED to new durations)
  COUNTDOWN_TICK_3: 200,  // ← CHANGE: 150 → 200ms
  COUNTDOWN_TICK_2: 200,  // ← CHANGE: 150 → 200ms
  COUNTDOWN_TICK_1: 200,  // ← CHANGE: 150 → 200ms
  COUNTDOWN_GO: 800,      // ← CHANGE: 400 → 800ms

  // Round start
  ROUND_START: 700,       // ← CHANGE: 600 → 700ms

  // VRF Reveal sequence
  REVEAL_RISER: 2300,     // ← CHANGE: 2000 → 2300ms
  REVEAL_TICK: 50,        // ← CHANGE: 100 → 50ms
  REVEAL_DRUM: 250,       // ← CHANGE: 800 → 250ms
  // REVEAL_EXPLOSION: REMOVED ← DELETE THIS LINE

  // Result sounds
  RESULT_WIN: 1000,       // ← CHANGE: 1500 → 1000ms
  RESULT_LOSE: 800        // Same
} as const
```

**Checklist**:
- [ ] Update all duration constants
- [ ] Remove `REVEAL_EXPLOSION` constant
- [ ] Update timing map validation functions if needed
- [ ] Run TypeScript compiler to check for errors

---

## Phase 3: Testing & Validation

### Task 3.1: Audio File Quality Tests
**Tool**: Audacity or ffmpeg

```bash
# Verify exact durations
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 countdown_tick_3.ogg
# Expected: 0.200000 (±0.005)

ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 reveal_riser.ogg
# Expected: 2.300000 (±0.010)

# Check for clipping
ffmpeg -i countdown_go.ogg -af "volumedetect" -f null /dev/null 2>&1 | grep max_volume
# Expected: max_volume should be < 0.0 dB (no clipping)
```

**Checklist**:
- [ ] All sounds have correct durations (±tolerance)
- [ ] No clipping or distortion detected
- [ ] File sizes are reasonable (<50KB each)
- [ ] Both .ogg and .mp3 formats present

---

### Task 3.2: Manual Audio-Visual Sync Tests

**Test 1: Countdown Sync**
1. Start a game with 30-second countdown
2. Watch for visual "3", "2", "1", "0" transitions
3. Verify each tick sound plays EXACTLY when number appears
4. Tolerance: ±50ms perceived latency

**Checklist**:
- [ ] Tick 3 syncs with visual "3" (±50ms)
- [ ] Tick 2 syncs with visual "2" (±50ms)
- [ ] Tick 1 syncs with visual "1" (±50ms)
- [ ] "Go" sound syncs with visual "0" (±50ms)

---

**Test 2: VRF Riser Loop**
1. Wait for VRF loading phase to begin
2. Listen to riser for at least 3 loops (6.9s+)
3. Check for seamless looping (no gaps or clicks)

**Checklist**:
- [ ] Riser starts immediately at gathering phase
- [ ] Riser loops seamlessly (no audible gaps)
- [ ] Riser maintains consistent volume
- [ ] Riser fades out cleanly before drum

---

**Test 3: Climax Sequence Rhythm**
1. Trigger VRF climax (wait for winner data)
2. Count name changes and listen to ticks
3. Verify rhythm: fast → slow → slower → drum

**Checklist**:
- [ ] Rapid phase: 5 ticks @ 100ms intervals (consistent rhythm)
- [ ] Slow phase: 3 ticks @ 200ms intervals (deceleration felt)
- [ ] Final phase: 2 ticks @ 400ms intervals (dramatic pause)
- [ ] 50ms silence gap between riser end and drum
- [ ] Drum hits EXACTLY when winner name locks (±30ms)

---

**Test 4: Result Sound Timing**
1. Complete full animation sequence
2. Check that result sound plays ONLY at completion phase
3. Verify no premature audio spoilers

**Checklist**:
- [ ] No result sound during explosion phase
- [ ] No result sound during count-up phase
- [ ] Result sound plays at "complete" phase (+100ms delay)
- [ ] Win sound plays for winners (1000ms duration)
- [ ] Lose sound plays for losers (800ms duration)

---

### Task 3.3: Performance Tests

**Test 1: 60fps Maintenance**
1. Open Chrome DevTools Performance tab
2. Start recording
3. Trigger VRF reveal with explosion phase
4. Check framerate never drops below 60fps

**Checklist**:
- [ ] Framerate: 60fps sustained during particle explosion
- [ ] No audio stuttering or dropouts
- [ ] CPU usage remains reasonable (<80%)

---

**Test 2: Mobile Device Testing**
Devices: iPhone 12, Samsung Galaxy S21, Pixel 6

**Checklist**:
- [ ] Audio unlocks after user interaction
- [ ] Countdown scheduling works on mobile
- [ ] VRF riser loops without gaps
- [ ] Perceived latency <60ms
- [ ] No crashes or freezes

---

**Test 3: Web Audio Scheduler Precision**
1. Open browser console
2. Enable AudioService debug timing (DEBUG_TIMING: true)
3. Trigger countdown
4. Check console logs for jitter

**Expected Console Output**:
```
[AUDIO] T+27000ms: countdown.tick_3 [scheduled at 27.000s] [duration: 0.2s]
[AUDIO] T+28000ms: countdown.tick_2 [scheduled at 28.000s] [duration: 0.2s]
[AUDIO] T+29000ms: countdown.tick_1 [scheduled at 29.000s] [duration: 0.2s]
[AUDIO] T+30000ms: countdown.go [scheduled at 30.000s] [duration: 0.8s]
```

**Checklist**:
- [ ] Scheduler jitter <5ms
- [ ] Scheduled times align with visual frames
- [ ] No missed or duplicate sounds

---

## Phase 4: Deployment

### Task 4.1: Build & Bundle Verification

```bash
# Frontend build
cd frontend
npm run build

# Check bundle sizes
ls -lh dist/audio/*.{ogg,mp3}

# Verify assets are included in build
find dist -name "*.ogg" -o -name "*.mp3"
```

**Checklist**:
- [ ] All 10 sounds (×2 formats) = 20 files present in dist/
- [ ] Total audio asset size <500KB
- [ ] No broken asset references in build

---

### Task 4.2: Docker Deployment (if applicable)

```bash
# Rebuild frontend container
docker-compose build frontend

# Deploy with no downtime
docker-compose up -d frontend

# Check logs for audio init
docker logs lottodrop-frontend --tail 50 | grep AudioService
```

**Expected Log Output**:
```
[AudioService] Format support: { ogg: true, mp3: true, preferredFormat: 'ogg' }
[AudioService] Using Web Audio API
[AudioService] Initialized successfully { api: 'WebAudio', preloaded: 8, failed: 0 }
```

**Checklist**:
- [ ] AudioService initializes successfully
- [ ] All 8 preloaded assets load without errors
- [ ] No 404 errors for audio files in network tab

---

### Task 4.3: Production Smoke Tests

**Test on https://lottodrop.net:**

1. Join a room
2. Wait for countdown
3. Listen for countdown ticks (should be increasing pitch)
4. Wait for VRF reveal
5. Listen for riser loop (should be seamless)
6. Wait for winner announcement
7. Listen for drum hit (should be exactly when winner locks)
8. Check result sound (win or lose)

**Checklist**:
- [ ] All sounds play correctly in production
- [ ] No 404 errors in browser console
- [ ] Audio-visual sync maintained
- [ ] Performance metrics normal (Lighthouse >90)

---

## Phase 5: Documentation & Handoff

### Task 5.1: Update README

Add audio system documentation to `/frontend/README.md`:

```markdown
## Audio System

LottoDrop uses a production-grade audio system with Web Audio API for precise synchronization.

### Sound Assets
Located in `/public/audio/`:
- Countdown: `countdown_tick_3`, `countdown_tick_2`, `countdown_tick_1`, `countdown_go`
- VRF Reveal: `reveal_riser`, `reveal_tick`, `reveal_drum`
- Results: `result_win`, `result_lose`

### Key Features
- Web Audio API scheduling (±5ms precision)
- 80ms latency compensation for perfect sync
- Seamless audio looping (reveal.riser)
- Duration-aware sequencing
- Mobile autoplay compliance

### Testing Audio
```bash
npm run test:audio  # Run audio unit tests
npm run dev         # Test in browser
```

See `/frontend/AUDIO_VISUAL_SYNC_MAP.md` for detailed timing specifications.
```

**Checklist**:
- [ ] README updated with audio system overview
- [ ] Audio testing instructions added
- [ ] Link to timing specifications included

---

### Task 5.2: Create Audio Asset Inventory

**File**: `/frontend/public/audio/INVENTORY.md`

```markdown
# Audio Asset Inventory

## Countdown Phase (4 files × 2 formats = 8 files)
- countdown_tick_3.{ogg,mp3} - 450Hz, 200ms
- countdown_tick_2.{ogg,mp3} - 550Hz, 200ms
- countdown_tick_1.{ogg,mp3} - 650Hz, 200ms
- countdown_go.{ogg,mp3} - C major chime, 800ms

## Round Management (2 files × 2 formats = 4 files)
- round_start.{ogg,mp3} - Whoosh, 700ms

## VRF Reveal Phase (3 files × 2 formats = 6 files)
- reveal_riser.{ogg,mp3} - Tension riser, 2300ms (loops)
- reveal_tick.{ogg,mp3} - Click, 50ms
- reveal_drum.{ogg,mp3} - Thump, 250ms

## Result Phase (2 files × 2 formats = 4 files)
- result_win.{ogg,mp3} - Sparkle up, 1000ms
- result_lose.{ogg,mp3} - Soft down, 800ms

**Total**: 20 audio files
**Total Size**: ~250KB (estimated)
**Generated**: 2025-10-20
```

**Checklist**:
- [ ] Inventory file created
- [ ] All files documented with durations
- [ ] Total size calculated

---

## Summary Checklist

### Critical Path (Must Complete)
- [ ] **Phase 1**: Generate all 10 sounds (×2 formats = 20 files)
- [ ] **Phase 2.1**: Update audio manifest with new keys
- [ ] **Phase 2.2**: Update GameRoom countdown sound keys
- [ ] **Phase 2.3**: Fix WinnerReveal random sound selection
- [ ] **Phase 3.1**: Verify audio file durations
- [ ] **Phase 3.2**: Test audio-visual sync manually
- [ ] **Phase 4.1**: Build and verify bundle
- [ ] **Phase 4.3**: Production smoke test

### Optional (Recommended)
- [ ] **Phase 2.4**: Remove explosion sound comments
- [ ] **Phase 2.5**: Update timing map constants
- [ ] **Phase 3.3**: Performance testing
- [ ] **Phase 4.2**: Docker deployment
- [ ] **Phase 5**: Documentation updates

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Audio files not generated correctly | HIGH | LOW | Use ffprobe to verify durations |
| Countdown sounds late/early | HIGH | MEDIUM | Use Web Audio API scheduler (already done) |
| Riser loop has gaps | MEDIUM | MEDIUM | Test in Audacity, ensure exactly 2300ms |
| Mobile autoplay blocked | MEDIUM | HIGH | Already handled by AudioService |
| Performance degradation | LOW | LOW | Audio is lightweight (<500KB total) |

---

## Time Estimates

- **Phase 1** (Audio Generation): 2-4 hours
- **Phase 2** (Code Updates): 1-2 hours
- **Phase 3** (Testing): 2-3 hours
- **Phase 4** (Deployment): 1 hour
- **Phase 5** (Documentation): 1 hour

**Total Estimated Time**: 7-12 hours

---

## Success Criteria

The audio system rebuild is considered successful when:

1. ✅ All 20 audio files exist with correct durations
2. ✅ Countdown ticks sync with visual numbers (±50ms)
3. ✅ VRF riser loops seamlessly without gaps
4. ✅ Drum hits exactly when winner name locks (±30ms)
5. ✅ Result sounds play only at animation completion
6. ✅ No audio stuttering or performance issues
7. ✅ Mobile devices unlock and play audio correctly
8. ✅ Production deployment successful with no errors

---

**Document Version**: 2.0.0
**Last Updated**: 2025-10-20
**Author**: Casino Animation Specialist + React Frontend Expert
**Status**: Ready for Implementation ✅
