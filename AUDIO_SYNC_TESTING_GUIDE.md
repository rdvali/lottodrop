# Audio Synchronization Testing Guide

## Overview
This guide provides step-by-step instructions to verify that all audio synchronization fixes are working correctly in the LottoDrop gaming platform.

## Implemented Fixes (October 20, 2025)

### 1. Debouncing (Prevents Double-Triggers)
**Location**: `frontend/src/services/audio/AudioService.ts:345-353`
- **What**: 100ms threshold prevents same sound from playing twice
- **Why**: Socket events can fire multiple times, causing round start to play twice
- **Test**: Watch console for "[AudioService] Debounced" warnings (should not appear)

### 2. Latency Compensation
**Location**: `frontend/src/services/audio/AudioService.ts:40-48, 423-437`
- **What**: Audio pre-triggered by 30ms for audio-visual sync
- **Why**: Browser audio latency causes sounds to lag behind visuals
- **Test**: Countdown ticks should align precisely with on-screen timer

### 3. Timing Debug Logs
**Location**: `frontend/src/services/audio/AudioService.ts:355-360, 507-512`
- **What**: All audio events logged with millisecond timestamps
- **Format**: `[AUDIO] T+{elapsed}ms: {soundKey} [scheduled at {time}s]`
- **Test**: Console logs should show precise timing for all sounds

### 4. Sequential Audio (Prevents Overlaps)
**Location**: `frontend/src/components/animations/WinnerReveal.tsx:193-203`
- **What**: Riser stops → 250ms wait → drum plays → result sounds play
- **Why**: Prevents overlapping sounds during winner reveal
- **Test**: No audio overlaps; clean transitions between phases

### 5. Result Sound Delays
**Location**: `frontend/src/components/animations/WinnerReveal.tsx:310-329, 357-373`
- **What**: 100ms delay (standard) or 50ms delay (fast) before win/lose sounds
- **Why**: Ensures user sees full visual reveal before hearing result
- **Test**: Result sound plays AFTER explosion animation completes

---

## Testing Procedure

### Prerequisites
1. Open browser (Chrome/Firefox recommended)
2. Open Developer Console (F12 or Cmd+Option+I)
3. Navigate to http://localhost or https://lottodrop.net
4. Enable audio when prompted (click "Enable Audio" banner)
5. Create test account and add balance if needed
6. Join an active game room or wait for next round

### Test 1: Countdown Synchronization
**Expected Behavior**: Ticks at 3, 2, 1, 0 seconds align with on-screen countdown

**Steps**:
1. Wait for countdown phase to start (30 seconds before round ends)
2. Watch on-screen countdown timer
3. Listen for tick sounds at 3, 2, 1 seconds
4. Check console logs

**Success Criteria**:
- ✅ Tick sounds play exactly when visual timer shows 3, 2, 1
- ✅ Console shows: `[AUDIO] T+{time}ms: countdown.tick` at regular intervals
- ✅ No "[AudioService] Debounced" warnings
- ✅ Timing difference < 50ms (perceived as instant)

**Console Log Example** (30-second countdown):
```
[AUDIO] T+27000ms: countdown.tick { volume: 1.0 }
[AUDIO] T+28000ms: countdown.tick { volume: 1.0 }
[AUDIO] T+29000ms: countdown.tick { volume: 1.0 }
[AUDIO] T+30000ms: countdown.go { volume: 1.0 }
```

### Test 2: Round Start Sound
**Expected Behavior**: Plays once immediately when round starts (no double-trigger)

**Steps**:
1. Wait for countdown to complete (0 seconds)
2. Listen for round start sound
3. Check console logs

**Success Criteria**:
- ✅ Round start sound plays exactly once
- ✅ Console shows: `[AUDIO] T+{time}ms: round.start`
- ✅ No duplicate plays within 100ms
- ✅ No "[AudioService] Debounced: round.start" warnings

### Test 3: VRF Reveal Sequence (Critical Test)
**Expected Behavior**: Riser → Ticks → Drum → Explosion → Result (smooth transitions, no overlaps)

**Steps**:
1. Wait for VRF reveal phase (after betting closes)
2. Watch winner reveal animation unfold
3. Listen carefully to audio sequence
4. Monitor console logs throughout

**Success Criteria**:
- ✅ Riser starts looping immediately with reveal animation
- ✅ Tick sounds play during rapid name cycling (5×100ms, 3×200ms, 2×400ms)
- ✅ Riser stops cleanly with 200ms fade-out
- ✅ 250ms pause after riser stops (silence)
- ✅ Drum sound plays when winner's name lands
- ✅ Explosion sound plays during visual burst
- ✅ 100ms pause after explosion
- ✅ Result sound (win/lose) plays AFTER user sees full visual reveal
- ✅ No sound overlaps at any point

**Console Log Example**:
```
[WinnerReveal] Starting VRF reveal riser (looping)
[AUDIO] T+45000ms: reveal.riser { loop: true }
[WinnerReveal] Climax sequence: Rapid phase (5 ticks @ 100ms)
[AUDIO] T+45100ms: reveal.tick
[AUDIO] T+45200ms: reveal.tick
[AUDIO] T+45300ms: reveal.tick
[AUDIO] T+45400ms: reveal.tick
[AUDIO] T+45500ms: reveal.tick
[WinnerReveal] Climax sequence: Slow phase (3 ticks @ 200ms)
[AUDIO] T+45700ms: reveal.tick
[AUDIO] T+45900ms: reveal.tick
[AUDIO] T+46100ms: reveal.tick
[WinnerReveal] Climax sequence: Final deceleration (2 ticks @ 400ms)
[AUDIO] T+46500ms: reveal.tick
[AUDIO] T+46900ms: reveal.tick
[WinnerReveal] Stopping riser with 200ms fade-out
[AUDIO-STOP] T+47300ms: reveal.riser [fade: 200ms]
[WinnerReveal] Playing DRUM sound - winner revealed!
[AUDIO] T+47550ms: reveal.drum
[WinnerReveal] Playing EXPLOSION sound - visual burst!
[AUDIO] T+48350ms: reveal.explosion
[WinnerReveal] Playing WIN sound for winner
[AUDIO] T+49250ms: result.win
```

### Test 4: Fast Variant (Mobile/Low-Performance)
**Expected Behavior**: Shortened sequence with 50ms delays (still clean transitions)

**Steps**:
1. Reduce browser window to trigger fast variant (optional)
2. Wait for VRF reveal
3. Monitor sequence timing

**Success Criteria**:
- ✅ Faster animation with shorter delays
- ✅ 50ms delay before result sound (vs 100ms standard)
- ✅ All transitions still clean (no overlaps)
- ✅ Console shows `[WinnerReveal-Fast]` prefix

### Test 5: No Sound Overlaps (Regression Test)
**Expected Behavior**: Only one sound plays at a time (except riser loop)

**Steps**:
1. Play through multiple rounds
2. Test different scenarios: winner, loser, observer
3. Monitor console for timing conflicts

**Success Criteria**:
- ✅ No concurrent sounds (except riser which loops)
- ✅ All `[AUDIO-STOP]` logs occur before next `[AUDIO]` log
- ✅ Minimum 50ms gap between stop and next play
- ✅ No audio glitches or crackling

---

## Timing Specifications

### Countdown Phase (Last 30 seconds)
| Event | Visual Timer | Audio Trigger | Expected Log Time |
|-------|-------------|---------------|-------------------|
| Tick 3 | 00:03 | T+27000ms | `[AUDIO] T+27000ms: countdown.tick` |
| Tick 2 | 00:02 | T+28000ms | `[AUDIO] T+28000ms: countdown.tick` |
| Tick 1 | 00:01 | T+29000ms | `[AUDIO] T+29000ms: countdown.tick` |
| Go | 00:00 | T+30000ms | `[AUDIO] T+30000ms: countdown.go` |
| Round Start | 00:00 | T+30100ms | `[AUDIO] T+30100ms: round.start` |

### VRF Reveal Sequence (Standard Variant)
| Phase | Duration | Audio Event | Expected Timing |
|-------|----------|-------------|-----------------|
| Riser Start | 0ms | `reveal.riser` (loop) | Instant |
| Rapid Ticks | 500ms | 5× `reveal.tick` @ 100ms | T+0 to T+500ms |
| Slow Ticks | 600ms | 3× `reveal.tick` @ 200ms | T+500 to T+1100ms |
| Final Ticks | 800ms | 2× `reveal.tick` @ 400ms | T+1100 to T+1900ms |
| Riser Stop | 200ms fade | `AUDIO-STOP reveal.riser` | T+1900ms |
| Silence | 50ms | (none) | T+1900 to T+1950ms |
| Drum | 0ms | `reveal.drum` | T+1950ms (250ms after stop) |
| Pause | 800ms | (none) | T+1950 to T+2750ms |
| Explosion | 0ms | `reveal.explosion` | T+2750ms |
| Pause | 800ms | (none) | T+2750 to T+3550ms |
| Delay | 100ms | (none) | T+3550 to T+3650ms |
| Result | 0ms | `result.win` or `result.lose` | T+3650ms |

**Total Sequence Duration**: ~3650ms (3.65 seconds)

---

## Troubleshooting

### Issue: Countdown ticks lag by >50ms
**Possible Causes**:
- Browser tab throttled (not focused)
- High CPU usage
- Audio context suspended (mobile autoplay policy)

**Solutions**:
1. Keep browser tab focused during testing
2. Close other applications
3. Click anywhere on page to resume audio context
4. Check `AudioContext.state` in console: should be "running"

### Issue: Riser doesn't stop before drum
**Check**:
1. Console should show `[AUDIO-STOP] reveal.riser` BEFORE `[AUDIO] reveal.drum`
2. Time gap should be ~250ms between logs
3. If not, check WinnerReveal.tsx:193-203 implementation

### Issue: Result sound plays too early
**Check**:
1. Console should show 100ms delay after explosion
2. Log format: `[WinnerReveal] Playing WIN/LOSE sound`
3. Should appear AFTER visual burst completes
4. If not, check WinnerReveal.tsx:310-329 implementation

### Issue: Sounds play twice (double-trigger)
**Check**:
1. Console should show `[AudioService] Debounced` warning
2. This indicates socket event fired twice within 100ms
3. If warning appears, debouncing is working correctly (preventing double-play)
4. If sound STILL plays twice, increase DEBOUNCE_THRESHOLD in AudioService.ts

### Issue: No audio at all
**Check**:
1. Audio banner dismissed? Click "Enable Audio" if present
2. Check browser console for autoplay policy errors
3. Verify `audioService.getStatus().isEnabled === true`
4. Check browser audio not muted
5. Verify audio files loading (Network tab should show 200 OK for /sounds/*)

---

## Performance Benchmarks

### Target Latency
- **Desktop**: < 30ms (imperceptible)
- **Mobile**: < 50ms (acceptable)
- **Maximum**: < 100ms (noticeable but tolerable)

### Frame Rate
- **Target**: 60fps maintained during audio playback
- **Minimum**: 30fps (acceptable on low-end devices)

### Audio File Sizes (Verified)
```
countdown/tick_1.ogg: 3,944 bytes (~0.3s)
countdown/tick_2.ogg: 4,105 bytes (~0.3s)
countdown/tick_3.ogg: 4,106 bytes (~0.3s)
countdown/go.ogg: 5,938 bytes (~0.5s)
round/start.ogg: 4,377 bytes (~0.4s)
reveal/riser.ogg: 4,671 bytes (~0.5s loop)
reveal/tick.ogg: 3,730 bytes (~0.2s)
reveal/drum.ogg: 4,575 bytes (~0.4s)
reveal/explosion.ogg: 7,884 bytes (~0.7s)
result/win.ogg: 8,316 bytes (~0.8s)
result/lose.ogg: 5,617 bytes (~0.5s)
```

---

## Manual Verification Checklist

Use this checklist during testing:

### Countdown Phase
- [ ] Audio enabled and context running
- [ ] Tick sounds align with visual timer (±50ms)
- [ ] Console logs show correct timing
- [ ] No debounce warnings

### Round Start
- [ ] Sound plays exactly once
- [ ] No double-trigger
- [ ] Timing aligned with visual transition

### VRF Reveal (Critical)
- [ ] Riser starts immediately with animation
- [ ] Tick sounds during name cycling
- [ ] Riser stops cleanly (no overlap with drum)
- [ ] 250ms silence after riser stops
- [ ] Drum plays when winner lands
- [ ] Explosion plays during visual burst
- [ ] 100ms pause before result sound
- [ ] Result sound plays AFTER user sees result
- [ ] Console logs show correct sequence

### Overall Quality
- [ ] No sound overlaps anywhere
- [ ] No missing sounds
- [ ] No audio glitches or crackling
- [ ] 60fps maintained during playback
- [ ] < 50ms perceived latency
- [ ] Works on mobile devices (iOS/Android)
- [ ] Works in different browsers (Chrome/Firefox/Safari)

---

## Success Criteria Summary

✅ **Phase 1 Complete** if:
- All countdown ticks align within 50ms
- Round start plays once (no double-trigger)
- Console logs show precise timing

✅ **Phase 2 Complete** if:
- VRF sequence plays in correct order
- No sound overlaps
- Riser stops before drum
- Result sound plays after visual reveal

✅ **Production Ready** if:
- All above criteria met
- Works across devices (desktop/mobile)
- Works across browsers
- No performance degradation
- No console errors or warnings

---

## Next Steps After Testing

### If Issues Found:
1. Document exact issue with console log timestamps
2. Identify which phase has the problem
3. Check corresponding code location (see above)
4. Adjust timing constants if needed
5. Rebuild and redeploy
6. Retest

### If All Tests Pass:
1. Mark testing tasks complete
2. Deploy to production
3. Monitor production logs for timing issues
4. Collect user feedback
5. Consider adding telemetry for audio timing metrics

---

## Additional Resources

- AudioService implementation: `frontend/src/services/audio/AudioService.ts`
- WinnerReveal component: `frontend/src/components/animations/WinnerReveal.tsx`
- Audio types: `frontend/src/types/audio.types.ts`
- Audio hook: `frontend/src/hooks/useAudioManager.ts`

---

**Document Version**: 1.0
**Last Updated**: October 20, 2025
**Implementation Status**: ✅ Deployed to Docker (container a2dc4d4b6924)
**Testing Status**: ⏳ Awaiting manual verification
