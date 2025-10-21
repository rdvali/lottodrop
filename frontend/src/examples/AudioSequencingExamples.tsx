/**
 * Audio Sequencing Examples
 * Demonstrates duration-aware audio patterns for LottoDrop
 *
 * These examples show best practices for implementing
 * game audio with the upgraded AudioService v2.0
 */

import React, { useState } from 'react'
import { audioService } from '../services/audio/AudioService'
import { SoundKey } from '../types/audio.types'

// ============================================================================
// EXAMPLE 1: Basic Duration-Aware Playback
// ============================================================================

export const Example1_BasicDuration: React.FC = () => {
  const [playbackInfo, setPlaybackInfo] = useState<string>('')

  const playWithInfo = async () => {
    const result = await audioService.play('countdown.tick_3')

    setPlaybackInfo(`
      Sound: ${result.key}
      Duration: ${result.duration}s
      Scheduled: ${result.scheduledTime?.toFixed(3)}s
      End Time: ${result.endTime?.toFixed(3)}s
    `)
  }

  return (
    <div className="example-card">
      <h3>Example 1: Basic Duration Info</h3>
      <button onClick={playWithInfo}>
        Play Countdown Tick 3
      </button>
      <pre>{playbackInfo}</pre>
    </div>
  )
}

// ============================================================================
// EXAMPLE 2: Sequential Countdown with Durations
// ============================================================================

export const Example2_SequentialCountdown: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready')

  const playCountdown = async () => {
    setStatus('Playing countdown...')

    const ctx = audioService.audioContext
    if (!ctx) {
      setStatus('Audio context not available')
      return
    }

    // Method A: Manual sequencing with endTime
    let time = ctx.currentTime

    const tick3 = await audioService.play('countdown.tick_3', {
      scheduleTime: time
    })
    setStatus(`Tick 3 scheduled at ${time.toFixed(3)}s`)
    time = tick3.endTime! // Jump to end of sound

    const tick2 = await audioService.play('countdown.tick_2', {
      scheduleTime: time
    })
    setStatus(`Tick 2 scheduled at ${time.toFixed(3)}s`)
    time = tick2.endTime!

    const tick1 = await audioService.play('countdown.tick_1', {
      scheduleTime: time
    })
    setStatus(`Tick 1 scheduled at ${time.toFixed(3)}s`)
    time = tick1.endTime!

    const go = await audioService.play('countdown.go', {
      scheduleTime: time
    })
    setStatus(`Go scheduled at ${time.toFixed(3)}s`)

    // Wait for entire sequence to complete
    setTimeout(() => {
      setStatus('Countdown complete!')
    }, (go.endTime! - ctx.currentTime) * 1000)
  }

  return (
    <div className="example-card">
      <h3>Example 2: Sequential Countdown</h3>
      <button onClick={playCountdown}>
        Play Full Countdown
      </button>
      <p className="status">{status}</p>
    </div>
  )
}

// ============================================================================
// EXAMPLE 3: Using playSequence() Helper
// ============================================================================

export const Example3_PlaySequence: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready')

  const playSimpleSequence = async () => {
    setStatus('Playing sequence...')

    // Much simpler than Example 2!
    await audioService.playSequence([
      'countdown.tick_3',
      'countdown.tick_2',
      'countdown.tick_1',
      'countdown.go'
    ])

    setStatus('Sequence complete!')
  }

  const playSequenceWithOptions = async () => {
    setStatus('Playing sequence with custom volumes...')

    await audioService.playSequence(
      [
        'countdown.tick_3',
        'countdown.tick_2',
        'countdown.tick_1',
        'countdown.go'
      ],
      [
        { volume: 0.7 },
        { volume: 0.8 },
        { volume: 0.9 },
        { volume: 1.0 } // Crescendo effect
      ]
    )

    setStatus('Sequence complete!')
  }

  return (
    <div className="example-card">
      <h3>Example 3: playSequence() Helper</h3>
      <button onClick={playSimpleSequence}>
        Simple Sequence
      </button>
      <button onClick={playSequenceWithOptions}>
        Sequence with Volume Crescendo
      </button>
      <p className="status">{status}</p>
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Random Sound Selection (Reveal Phase)
// ============================================================================

export const Example4_RandomSounds: React.FC = () => {
  const [playHistory, setPlayHistory] = useState<string[]>([])

  const playRandomTickOrDrum = async () => {
    const result = await audioService.playRandom([
      'reveal.tick',
      'reveal.drum'
    ])

    setPlayHistory(prev => [...prev, result.key].slice(-5)) // Keep last 5
  }

  const simulateRevealPhase = async () => {
    setPlayHistory([])

    // Simulate rapid cycling phase
    for (let i = 0; i < 5; i++) {
      const result = await audioService.playRandom([
        'reveal.tick',
        'reveal.drum'
      ])
      setPlayHistory(prev => [...prev, result.key])

      // Wait for sound duration + small gap
      await delay(result.duration * 1000 + 100)
    }
  }

  return (
    <div className="example-card">
      <h3>Example 4: Random Sound Selection</h3>
      <button onClick={playRandomTickOrDrum}>
        Play Random Tick/Drum
      </button>
      <button onClick={simulateRevealPhase}>
        Simulate Reveal Phase (5x)
      </button>
      <div className="history">
        <strong>Play History:</strong>
        {playHistory.map((sound, i) => (
          <span key={i} className="badge">
            {sound}
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 5: UI Sound Integration
// ============================================================================

export const Example5_UISounds: React.FC = () => {
  const [clickCount, setClickCount] = useState(0)
  const [hoverCount, setHoverCount] = useState(0)

  const handleClick = async () => {
    await audioService.play(SoundKey.UI_BUTTON_CLICK)
    setClickCount(prev => prev + 1)
  }

  const handleHover = async () => {
    await audioService.play(SoundKey.UI_HOVER)
    setHoverCount(prev => prev + 1)
  }

  return (
    <div className="example-card">
      <h3>Example 5: UI Sound Feedback</h3>
      <button
        onClick={handleClick}
        onMouseEnter={handleHover}
        className="ui-button"
      >
        Interactive Button
      </button>
      <div className="stats">
        <p>Clicks: {clickCount}</p>
        <p>Hovers: {hoverCount}</p>
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 6: Advanced - Looping Riser with Timed Stop
// ============================================================================

export const Example6_LoopingRiser: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const startRiser = async () => {
    setIsPlaying(true)
    setElapsed(0)

    // Start looping riser
    await audioService.play('reveal.riser', { loop: true })

    // Update elapsed time every 100ms
    const interval = setInterval(() => {
      setElapsed(prev => prev + 0.1)
    }, 100)

    // Stop after 5 seconds
    setTimeout(() => {
      audioService.stop('reveal.riser', { fadeOut: 200 })
      clearInterval(interval)
      setIsPlaying(false)
      setElapsed(0)
    }, 5000)
  }

  return (
    <div className="example-card">
      <h3>Example 6: Looping Riser with Fade-out</h3>
      <button onClick={startRiser} disabled={isPlaying}>
        {isPlaying ? `Playing... ${elapsed.toFixed(1)}s` : 'Start 5s Riser'}
      </button>
      <p className="info">
        Riser loops continuously, then fades out after 5s
      </p>
    </div>
  )
}

// ============================================================================
// EXAMPLE 7: Real-World - Winner Reveal Audio Sequence
// ============================================================================

export const Example7_WinnerRevealSequence: React.FC = () => {
  const [phase, setPhase] = useState<string>('Ready')

  const playWinnerReveal = async () => {
    // Phase 1: Start riser (looping)
    setPhase('Phase 1: Tension building...')
    await audioService.play('reveal.riser', { loop: true })

    await delay(2000)

    // Phase 2: Rapid cycling with random sounds
    setPhase('Phase 2: Rapid cycling...')
    for (let i = 0; i < 5; i++) {
      await audioService.playRandom(['reveal.tick', 'reveal.drum'])
      await delay(100)
    }

    // Phase 3: Slow down
    setPhase('Phase 3: Slowing down...')
    for (let i = 0; i < 3; i++) {
      await audioService.playRandom(['reveal.tick', 'reveal.drum'])
      await delay(200)
    }

    // Phase 4: Final deceleration
    setPhase('Phase 4: Final approach...')
    for (let i = 0; i < 2; i++) {
      await audioService.playRandom(['reveal.tick', 'reveal.drum'])
      await delay(400)
    }

    // Phase 5: Winner locked - stop riser, play drum
    setPhase('Phase 5: Winner locked!')
    audioService.stop('reveal.riser', { fadeOut: 200 })
    await delay(250) // Wait for fade
    await audioService.play('reveal.drum')
    await delay(550)

    // Phase 6: Result
    setPhase('Phase 6: Winner announcement!')
    await audioService.play('result.win')

    await delay(1000)
    setPhase('Complete!')
  }

  return (
    <div className="example-card">
      <h3>Example 7: Complete Winner Reveal</h3>
      <button onClick={playWinnerReveal}>
        Play Full Winner Sequence
      </button>
      <p className="phase-indicator">{phase}</p>
    </div>
  )
}

// ============================================================================
// EXAMPLE 8: Comparing Old vs New Patterns
// ============================================================================

export const Example8_OldVsNew: React.FC = () => {
  const playOldWay = async () => {
    // OLD: Hardcoded delays, no duration info
    audioService.play('countdown.tick_3')
    await delay(200) // Hardcoded!

    audioService.play('countdown.tick_2')
    await delay(200)

    audioService.play('countdown.tick_1')
    await delay(200)

    audioService.play('countdown.go')
    // No idea when it ends...
  }

  const playNewWay = async () => {
    // NEW: Duration-aware, automatic timing
    const results = []

    let tick3 = await audioService.play('countdown.tick_3')
    results.push(tick3)
    await delay(tick3.duration * 1000) // Use actual duration!

    let tick2 = await audioService.play('countdown.tick_2')
    results.push(tick2)
    await delay(tick2.duration * 1000)

    let tick1 = await audioService.play('countdown.tick_1')
    results.push(tick1)
    await delay(tick1.duration * 1000)

    let go = await audioService.play('countdown.go')
    results.push(go)
    await delay(go.duration * 1000)

    console.log('Sequence complete:', results)
  }

  const playBestWay = async () => {
    // BEST: Use helper method
    await audioService.playSequence([
      'countdown.tick_3',
      'countdown.tick_2',
      'countdown.tick_1',
      'countdown.go'
    ])
  }

  return (
    <div className="example-card">
      <h3>Example 8: Old vs New Patterns</h3>
      <div className="button-group">
        <button onClick={playOldWay} className="old">
          Old Way (Hardcoded)
        </button>
        <button onClick={playNewWay} className="new">
          New Way (Duration-Aware)
        </button>
        <button onClick={playBestWay} className="best">
          Best Way (Helper Method)
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Demo Page Component (combines all examples)
// ============================================================================

export const AudioSequencingDemo: React.FC = () => {
  return (
    <div className="audio-demo-page">
      <header>
        <h1>Audio Sequencing Examples</h1>
        <p>LottoDrop Audio System v2.0 - Duration-Aware Sequencing</p>
      </header>

      <main className="examples-grid">
        <Example1_BasicDuration />
        <Example2_SequentialCountdown />
        <Example3_PlaySequence />
        <Example4_RandomSounds />
        <Example5_UISounds />
        <Example6_LoopingRiser />
        <Example7_WinnerRevealSequence />
        <Example8_OldVsNew />
      </main>

      <style>{`
        .audio-demo-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .example-card {
          background: var(--color-secondary-bg, #1a1a2e);
          border: 2px solid var(--color-primary, #9D4EDD);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .example-card h3 {
          margin-top: 0;
          color: var(--color-primary, #9D4EDD);
        }

        .example-card button {
          background: var(--color-primary, #9D4EDD);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin: 0.5rem 0.5rem 0.5rem 0;
          transition: opacity 0.2s;
        }

        .example-card button:hover:not(:disabled) {
          opacity: 0.8;
        }

        .example-card button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status, .phase-indicator {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(157, 78, 221, 0.1);
          border-radius: 6px;
          font-family: monospace;
        }

        .history {
          margin-top: 1rem;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          margin: 0.25rem;
          background: var(--color-primary, #9D4EDD);
          color: white;
          border-radius: 12px;
          font-size: 0.875rem;
        }

        .stats {
          display: flex;
          gap: 2rem;
          margin-top: 1rem;
        }

        .info {
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #999;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .button-group button.old {
          background: #dc3545;
        }

        .button-group button.new {
          background: #ffc107;
        }

        .button-group button.best {
          background: #28a745;
        }

        pre {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}

export default AudioSequencingDemo
