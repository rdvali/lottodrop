/**
 * Performance Monitoring for Animation Systems
 * Tracks FPS and generates performance reports
 * Part of WinnerReveal animation optimization
 */

export interface PerformanceReport {
  averageFPS: number
  minFPS: number
  maxFPS: number
  totalFrames: number
  droppedFrames: number
  duration: number
  meets60FPSTarget: boolean
  meets55FPSTarget: boolean
  frameTimings: number[]
}

export class PerformanceMonitor {
  private startTime: number = 0
  private lastFrameTime: number = 0
  private frameTimes: number[] = []
  private isMonitoring: boolean = false
  private rafId: number | null = null

  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.isMonitoring) return

    this.startTime = performance.now()
    this.lastFrameTime = this.startTime
    this.frameTimes = []
    this.isMonitoring = true

    this.measureFrame()
  }

  /**
   * Stop monitoring and return report
   */
  stop(): PerformanceReport {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    this.isMonitoring = false

    return this.generateReport()
  }

  /**
   * Measure a single frame
   */
  private measureFrame = (): void => {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastFrameTime

    this.frameTimes.push(deltaTime)
    this.lastFrameTime = currentTime

    this.rafId = requestAnimationFrame(this.measureFrame)
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    if (this.frameTimes.length === 0) {
      return {
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        totalFrames: 0,
        droppedFrames: 0,
        duration: 0,
        meets60FPSTarget: false,
        meets55FPSTarget: false,
        frameTimings: []
      }
    }

    const totalDuration = performance.now() - this.startTime

    // Convert frame times (ms) to FPS
    const fpsValues = this.frameTimes.map(time => 1000 / time)

    const averageFPS = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length
    const minFPS = Math.min(...fpsValues)
    const maxFPS = Math.max(...fpsValues)

    // Count dropped frames (frames that took longer than 16.67ms for 60fps)
    const droppedFrames = this.frameTimes.filter(time => time > 16.67).length

    return {
      averageFPS: Math.round(averageFPS * 10) / 10,
      minFPS: Math.round(minFPS * 10) / 10,
      maxFPS: Math.round(maxFPS * 10) / 10,
      totalFrames: this.frameTimes.length,
      droppedFrames,
      duration: Math.round(totalDuration),
      meets60FPSTarget: averageFPS >= 60 && minFPS >= 55,
      meets55FPSTarget: averageFPS >= 55 && minFPS >= 50,
      frameTimings: this.frameTimes
    }
  }

  /**
   * Reset the monitor
   */
  reset(): void {
    this.stop()
    this.startTime = 0
    this.lastFrameTime = 0
    this.frameTimes = []
  }

  /**
   * Get current FPS (instantaneous)
   */
  getCurrentFPS(): number {
    if (this.frameTimes.length === 0) return 0

    const lastFrameTime = this.frameTimes[this.frameTimes.length - 1]
    return Math.round((1000 / lastFrameTime) * 10) / 10
  }

  /**
   * Log report to console (development only)
   */
  logReport(): void {
    if (process.env.NODE_ENV !== 'development') return

    const report = this.generateReport()

    console.group('<¯ Animation Performance Report')
    console.log(`Average FPS: ${report.averageFPS}`)
    console.log(`Min FPS: ${report.minFPS}`)
    console.log(`Max FPS: ${report.maxFPS}`)
    console.log(`Total Frames: ${report.totalFrames}`)
    console.log(`Dropped Frames: ${report.droppedFrames} (${((report.droppedFrames / report.totalFrames) * 100).toFixed(1)}%)`)
    console.log(`Duration: ${report.duration}ms`)
    console.log(`Meets 60 FPS Target: ${report.meets60FPSTarget ? '' : 'L'}`)
    console.log(`Meets 55 FPS Target: ${report.meets55FPSTarget ? '' : 'L'}`)
    console.groupEnd()
  }
}

/**
 * Create a new performance monitor instance
 */
export const createPerformanceMonitor = (): PerformanceMonitor => {
  return new PerformanceMonitor()
}

/**
 * Simple function to measure animation FPS
 * @param duration - How long to measure (ms)
 * @returns Promise that resolves with performance report
 */
export const measureAnimationFPS = (duration: number = 2000): Promise<PerformanceReport> => {
  return new Promise((resolve) => {
    const monitor = new PerformanceMonitor()
    monitor.start()

    setTimeout(() => {
      const report = monitor.stop()
      resolve(report)
    }, duration)
  })
}
