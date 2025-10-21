/**
 * Audio Duration Analyzer
 * Measures precise audio file durations using Web Audio API
 *
 * Features:
 * - Millisecond-precision duration measurement
 * - Batch processing for multiple files
 * - Format support: OGG, MP3, WAV
 * - Caching to avoid re-fetching
 * - Error handling and retry logic
 *
 * @version 1.0.0
 * @author LottoDrop Development Team
 */

export interface AudioDurationResult {
  path: string
  duration: number // milliseconds
  durationSeconds: number // seconds (Web Audio native format)
  sampleRate: number
  numberOfChannels: number
  format: 'ogg' | 'mp3' | 'wav' | 'unknown'
  success: boolean
  error?: string
}

export interface AudioTimingReport {
  files: AudioDurationResult[]
  totalAnalyzed: number
  successCount: number
  failureCount: number
  analyzedAt: string
}

class AudioDurationAnalyzer {
  private audioContext: AudioContext | null = null
  private cache: Map<string, AudioDurationResult> = new Map()
  private isInitialized = false

  /**
   * Initialize the analyzer with an AudioContext
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[AudioDurationAnalyzer] Already initialized')
      return
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported')
      }

      this.audioContext = new AudioContextClass()
      this.isInitialized = true
      console.info('[AudioDurationAnalyzer] Initialized successfully')
    } catch (error) {
      console.error('[AudioDurationAnalyzer] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Measure duration of a single audio file
   */
  async measureDuration(path: string): Promise<AudioDurationResult> {
    if (!this.isInitialized || !this.audioContext) {
      await this.init()
    }

    // Check cache first
    if (this.cache.has(path)) {
      console.info(`[AudioDurationAnalyzer] Using cached result for ${path}`)
      return this.cache.get(path)!
    }

    try {
      // Fetch audio file
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Decode audio data
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)

      // Extract format from path
      const format = this.detectFormat(path)

      // Create result object
      const result: AudioDurationResult = {
        path,
        duration: Math.round(audioBuffer.duration * 1000), // Convert to milliseconds
        durationSeconds: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        format,
        success: true
      }

      // Cache result
      this.cache.set(path, result)

      console.info(`[AudioDurationAnalyzer] Measured ${path}: ${result.duration}ms`)

      return result
    } catch (error) {
      const errorResult: AudioDurationResult = {
        path,
        duration: 0,
        durationSeconds: 0,
        sampleRate: 0,
        numberOfChannels: 0,
        format: 'unknown',
        success: false,
        error: (error as Error).message
      }

      console.error(`[AudioDurationAnalyzer] Failed to measure ${path}:`, error)
      return errorResult
    }
  }

  /**
   * Measure durations for multiple audio files
   */
  async measureBatch(paths: string[]): Promise<AudioTimingReport> {
    console.info(`[AudioDurationAnalyzer] Starting batch analysis of ${paths.length} files`)

    const startTime = Date.now()
    const results = await Promise.all(
      paths.map(path => this.measureDuration(path))
    )
    const elapsed = Date.now() - startTime

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    const report: AudioTimingReport = {
      files: results,
      totalAnalyzed: paths.length,
      successCount,
      failureCount,
      analyzedAt: new Date().toISOString()
    }

    console.info(`[AudioDurationAnalyzer] Batch analysis complete in ${elapsed}ms`)
    console.info(`[AudioDurationAnalyzer] Success: ${successCount}, Failed: ${failureCount}`)

    return report
  }

  /**
   * Detect audio format from file path
   */
  private detectFormat(path: string): 'ogg' | 'mp3' | 'wav' | 'unknown' {
    const extension = path.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'ogg':
        return 'ogg'
      case 'mp3':
        return 'mp3'
      case 'wav':
        return 'wav'
      default:
        return 'unknown'
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    console.info('[AudioDurationAnalyzer] Cache cleared')
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.cache.clear()
    this.isInitialized = false
    console.info('[AudioDurationAnalyzer] Disposed')
  }
}

// Export singleton instance
export const audioDurationAnalyzer = new AudioDurationAnalyzer()
export default audioDurationAnalyzer

/**
 * Convenience function to analyze all LottoDrop audio files
 */
export async function analyzeLottoDropAudio(): Promise<AudioTimingReport> {
  const audioPaths = [
    // Countdown sounds
    '/sounds/countdown/tick_3.ogg',
    '/sounds/countdown/tick_2.ogg',
    '/sounds/countdown/tick_1.ogg',
    '/sounds/countdown/go.ogg',

    // Round sounds
    '/sounds/round/start.ogg',

    // Reveal sounds
    '/sounds/reveal/riser.ogg',
    '/sounds/reveal/tick.ogg',
    '/sounds/reveal/drum.ogg',
    '/sounds/reveal/explosion.ogg',

    // Result sounds
    '/sounds/result/win.ogg',
    '/sounds/result/lose.ogg'
  ]

  return await audioDurationAnalyzer.measureBatch(audioPaths)
}

/**
 * Generate formatted report for console output
 */
export function formatTimingReport(report: AudioTimingReport): string {
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('           LOTTODROP AUDIO TIMING ANALYSIS REPORT')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')
  lines.push(`Analysis Date: ${new Date(report.analyzedAt).toLocaleString()}`)
  lines.push(`Total Files: ${report.totalAnalyzed}`)
  lines.push(`Success: ${report.successCount} | Failed: ${report.failureCount}`)
  lines.push('')
  lines.push('───────────────────────────────────────────────────────────────')
  lines.push('FILE DURATIONS (milliseconds)')
  lines.push('───────────────────────────────────────────────────────────────')
  lines.push('')

  // Group by category
  const categories = {
    'COUNTDOWN': report.files.filter(f => f.path.includes('countdown')),
    'ROUND': report.files.filter(f => f.path.includes('round')),
    'REVEAL': report.files.filter(f => f.path.includes('reveal')),
    'RESULT': report.files.filter(f => f.path.includes('result'))
  }

  Object.entries(categories).forEach(([category, files]) => {
    if (files.length === 0) return

    lines.push(`${category}:`)
    files.forEach(file => {
      const filename = file.path.split('/').pop() || file.path
      const status = file.success ? '✓' : '✗'
      const duration = file.success ? `${file.duration}ms` : 'FAILED'
      const details = file.success
        ? `(${file.durationSeconds.toFixed(3)}s, ${file.sampleRate}Hz, ${file.numberOfChannels}ch)`
        : `(${file.error})`

      lines.push(`  ${status} ${filename.padEnd(20)} ${duration.padEnd(10)} ${details}`)
    })
    lines.push('')
  })

  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}
