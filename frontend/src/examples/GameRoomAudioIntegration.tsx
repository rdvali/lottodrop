/**
 * GameRoom Audio Integration Example
 *
 * Comprehensive example showing how to integrate audio service
 * into a LottoDrop game room component
 *
 * Features demonstrated:
 * - Audio initialization and user interaction handling
 * - WebSocket event sound triggers
 * - Countdown sequences with synchronized audio
 * - Win/lose result audio feedback
 * - Volume controls and settings UI
 * - Mobile-friendly autoplay compliance
 */

import { useEffect, useState, useCallback } from 'react'
import { useAudio } from '../hooks/useAudio'
import { socketService } from '../services/socket'
import type {
  GameStartingData,
  CountdownData,
  AnimationStartData,
  GameCompletedData,
  UserJoinedData,
  UserLeftData,
} from '../types'

interface GameRoomAudioIntegrationProps {
  roomId: string
  userId: string
  isParticipant: boolean
}

export function GameRoomAudioIntegration({
  roomId,
  userId,
  isParticipant,
}: GameRoomAudioIntegrationProps) {
  const {
    play,
    stop,
    enable,
    disable,
    setVolume,
    mute,
    isEnabled,
    isMuted,
    masterVolume,
    canAutoplay,
    status,
  } = useAudio()

  const [showVolumeControl, setShowVolumeControl] = useState(false)
  const [showAudioPrompt, setShowAudioPrompt] = useState(false)

  // Check if user needs to enable audio (mobile autoplay policy)
  useEffect(() => {
    if (!canAutoplay && !isEnabled) {
      setShowAudioPrompt(true)
    } else {
      setShowAudioPrompt(false)
    }
  }, [canAutoplay, isEnabled])

  // Handle user enabling audio
  const handleEnableAudio = useCallback(() => {
    enable()
    setShowAudioPrompt(false)
  }, [enable])

  // ============================================================================
  // GAME EVENT AUDIO HANDLERS
  // ============================================================================

  // Handle game starting event
  const handleGameStarting = useCallback(
    (data: GameStartingData) => {
      console.log('[GameRoom] Game starting:', data)
      play('round.start', { fadeIn: 150 })
    },
    [play]
  )

  // Handle countdown tick
  const handleCountdown = useCallback(
    (data: CountdownData) => {
      console.log('[GameRoom] Countdown:', data.countdown)

      if (data.countdown > 0) {
        // Play tick sound for 3, 2, 1
        play('countdown.tick', { volume: 0.9 })
      } else {
        // Play "go" sound when countdown reaches 0
        play('countdown.go', { volume: 1.0 })
      }
    },
    [play]
  )

  // Handle animation start (reveal phase)
  const handleAnimationStart = useCallback(
    (data: AnimationStartData) => {
      console.log('[GameRoom] Animation start:', data)

      // Play tension-building riser sound
      play('reveal.riser', { fadeIn: 200 })

      // Optional: Play periodic tick sounds during reveal
      const tickInterval = setInterval(() => {
        play('reveal.tick', { volume: 0.6 })
      }, 500)

      // Stop ticks after reveal duration
      setTimeout(() => {
        clearInterval(tickInterval)
        stop('reveal.riser')
      }, data.duration)
    },
    [play, stop]
  )

  // Handle game completion (winner announcement)
  const handleGameCompleted = useCallback(
    (data: GameCompletedData) => {
      console.log('[GameRoom] Game completed:', data)

      // Check if current user won
      const isWinner = data.winners.some((winner) => winner.userId === userId)

      if (isWinner) {
        // Play win fanfare
        play('result.win', {
          volume: 1.0,
          fadeIn: 100,
        })
      } else if (isParticipant) {
        // Only play lose sound if user was participating
        play('result.lose', {
          volume: 0.8,
          fadeIn: 50,
        })
      }
    },
    [play, userId, isParticipant]
  )

  // Handle user joined
  const handleUserJoined = useCallback(
    (data: UserJoinedData) => {
      console.log('[GameRoom] User joined:', data)
      play('join.room', { volume: 0.5 })
    },
    [play]
  )

  // Handle user left
  const handleUserLeft = useCallback(
    (data: UserLeftData) => {
      console.log('[GameRoom] User left:', data)
      play('leave.room', { volume: 0.5 })
    },
    [play]
  )

  // ============================================================================
  // SOCKET EVENT SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    // Only attach listeners if audio is enabled
    if (!isEnabled) {
      return
    }

    // Register socket event listeners
    socketService.onGameStarting(handleGameStarting)
    socketService.onCountdown(handleCountdown)
    socketService.onAnimationStart(handleAnimationStart)
    socketService.onGameCompleted(handleGameCompleted)
    socketService.onUserJoined(handleUserJoined)
    socketService.onUserLeft(handleUserLeft)

    // Cleanup listeners on unmount
    return () => {
      socketService.offGameStarting(handleGameStarting)
      socketService.offCountdown(handleCountdown)
      socketService.offAnimationStart(handleAnimationStart)
      socketService.offGameCompleted(handleGameCompleted)
      socketService.offUserJoined(handleUserJoined)
      socketService.offUserLeft(handleUserLeft)
    }
  }, [
    isEnabled,
    handleGameStarting,
    handleCountdown,
    handleAnimationStart,
    handleGameCompleted,
    handleUserJoined,
    handleUserLeft,
  ])

  // ============================================================================
  // UI INTERACTION AUDIO
  // ============================================================================

  const handleButtonClick = () => {
    play('button.click', { volume: 0.7 })
  }

  const handleButtonHover = () => {
    play('button.hover', { volume: 0.4 })
  }

  // ============================================================================
  // VOLUME CONTROL UI
  // ============================================================================

  const VolumeControl = () => (
    <div className="volume-control">
      <div className="volume-control-header">
        <h4>Audio Settings</h4>
        <button
          onClick={() => setShowVolumeControl(false)}
          className="close-btn"
          aria-label="Close volume control"
        >
          ×
        </button>
      </div>

      <div className="volume-control-body">
        {/* Enable/Disable Audio */}
        <div className="setting-row">
          <label htmlFor="audio-enabled">Enable Sound</label>
          <input
            id="audio-enabled"
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => (e.target.checked ? enable() : disable())}
            className="toggle-switch"
          />
        </div>

        {/* Master Volume Slider */}
        <div className="setting-row">
          <label htmlFor="master-volume">
            Master Volume: {Math.round(masterVolume * 100)}%
          </label>
          <input
            id="master-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={!isEnabled}
            className="volume-slider"
          />
        </div>

        {/* Mute Toggle */}
        <div className="setting-row">
          <label htmlFor="audio-muted">Mute All</label>
          <input
            id="audio-muted"
            type="checkbox"
            checked={isMuted}
            onChange={(e) => mute(e.target.checked)}
            disabled={!isEnabled}
            className="toggle-switch"
          />
        </div>

        {/* Audio Status Info */}
        <div className="audio-status">
          <p className="status-item">
            <span className="status-label">API:</span>
            <span className="status-value">{status.activeAudioAPI}</span>
          </p>
          <p className="status-item">
            <span className="status-label">Loaded:</span>
            <span className="status-value">{status.loadedAssets.length} sounds</span>
          </p>
          {status.failedAssets.length > 0 && (
            <p className="status-item error">
              <span className="status-label">Failed:</span>
              <span className="status-value">{status.failedAssets.length} sounds</span>
            </p>
          )}
        </div>

        {/* Test Sounds */}
        <div className="test-sounds">
          <h5>Test Sounds:</h5>
          <div className="test-buttons">
            <button
              onClick={() => play('countdown.tick')}
              disabled={!isEnabled}
              className="test-btn"
            >
              Tick
            </button>
            <button
              onClick={() => play('countdown.go')}
              disabled={!isEnabled}
              className="test-btn"
            >
              Go
            </button>
            <button
              onClick={() => play('result.win')}
              disabled={!isEnabled}
              className="test-btn"
            >
              Win
            </button>
            <button
              onClick={() => play('result.lose')}
              disabled={!isEnabled}
              className="test-btn"
            >
              Lose
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ============================================================================
  // MOBILE AUDIO PROMPT
  // ============================================================================

  const AudioPrompt = () => (
    <div className="audio-prompt-overlay">
      <div className="audio-prompt-card">
        <div className="audio-prompt-icon">🔊</div>
        <h3>Enable Game Audio</h3>
        <p>
          Experience the full excitement with sound effects and audio feedback
        </p>
        <button onClick={handleEnableAudio} className="enable-audio-btn">
          Enable Sound
        </button>
        <button
          onClick={() => setShowAudioPrompt(false)}
          className="skip-audio-btn"
        >
          Play Without Sound
        </button>
      </div>
    </div>
  )

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="game-room-audio-integration">
      {/* Mobile Audio Prompt */}
      {showAudioPrompt && <AudioPrompt />}

      {/* Volume Control Panel */}
      {showVolumeControl && (
        <div className="volume-control-overlay">
          <VolumeControl />
        </div>
      )}

      {/* Audio Control Button */}
      <div className="audio-controls">
        <button
          onClick={() => setShowVolumeControl(!showVolumeControl)}
          className={`audio-control-btn ${isEnabled ? 'enabled' : 'disabled'}`}
          aria-label="Audio settings"
          title={isEnabled ? 'Audio enabled' : 'Audio disabled'}
        >
          {isMuted ? '🔇' : isEnabled ? '🔊' : '🔈'}
        </button>

        {/* Quick mute toggle */}
        {isEnabled && (
          <button
            onClick={() => mute(!isMuted)}
            className="quick-mute-btn"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>

      {/* Example Game Buttons with Audio Feedback */}
      <div className="game-actions">
        <button
          onClick={handleButtonClick}
          onMouseEnter={handleButtonHover}
          className="game-action-btn"
        >
          Join Game
        </button>
        <button
          onClick={handleButtonClick}
          onMouseEnter={handleButtonHover}
          className="game-action-btn"
        >
          Leave Game
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE STYLES (CSS-in-JS or separate CSS file)
// ============================================================================

export const audioIntegrationStyles = `
.audio-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.audio-prompt-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.audio-prompt-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: pulse 2s ease-in-out infinite;
}

.enable-audio-btn {
  background: #fff;
  color: #667eea;
  border: none;
  border-radius: 8px;
  padding: 12px 32px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin: 1rem 0;
  transition: transform 0.2s;
}

.enable-audio-btn:hover {
  transform: scale(1.05);
}

.skip-audio-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: underline;
}

.volume-control-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.volume-control {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
}

.volume-slider {
  width: 60%;
}

.audio-status {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.test-sounds {
  margin-top: 1rem;
}

.test-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.test-btn {
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
`

export default GameRoomAudioIntegration
