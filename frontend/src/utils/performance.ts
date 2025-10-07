import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'
import type { Metric } from 'web-vitals'

export interface PerformanceMetrics {
  CLS?: number  // Cumulative Layout Shift
  FCP?: number  // First Contentful Paint
  LCP?: number  // Largest Contentful Paint
  TTFB?: number // Time to First Byte
  INP?: number  // Interaction to Next Paint
  longTasks?: Array<{duration: number, startTime: number}> // Long tasks
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private callbacks: Set<(metrics: PerformanceMetrics) => void> = new Set()
  private reportEndpoint: string | null = null

  constructor() {
    this.initializeMonitoring()
  }

  private initializeMonitoring() {
    // Core Web Vitals
    onCLS(this.handleMetric('CLS'))
    onFCP(this.handleMetric('FCP'))
    onLCP(this.handleMetric('LCP'))
    onTTFB(this.handleMetric('TTFB'))
    onINP(this.handleMetric('INP'))

    // Custom performance marks
    if (typeof window !== 'undefined' && window.performance) {
      this.markNavigationTiming()
      this.observeResources()
      this.observeLongTasks()
    }
  }

  private handleMetric = (name: Exclude<keyof PerformanceMetrics, 'longTasks'>) => (metric: Metric) => {
    this.metrics[name] = metric.value

    // Notify callbacks
    this.callbacks.forEach(callback => callback(this.metrics))

    // Send to analytics
    this.reportToAnalytics(name, metric)
  }

  private markNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navigation) {
      // Mark key navigation events
      performance.mark('navigation-start')
      
      const timings = {
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        tlsNegotiation: navigation.secureConnectionStart > 0 
          ? navigation.connectEnd - navigation.secureConnectionStart 
          : 0,
        serverResponse: navigation.responseEnd - navigation.requestStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        domComplete: navigation.domComplete - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart
      }

      // Timings recorded for potential future use
      void timings
    }
  }

  private observeResources() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach(entry => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          
          // Track slow resources
          if (resource.duration > 1000) {
            console.warn(`[Performance] Slow resource detected:`, {
              name: resource.name,
              duration: resource.duration.toFixed(2),
              type: resource.initiatorType
            })
          }
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['resource'] })
    } catch {
      // PerformanceObserver not supported
    }
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          
          entries.forEach(entry => {
            if (entry.duration > 50) {
              console.warn(`[Performance] Long task detected:`, {
                duration: entry.duration.toFixed(2),
                startTime: entry.startTime.toFixed(2)
              })

              // Track in metrics
              if (!this.metrics.longTasks) {
                this.metrics.longTasks = []
              }
              this.metrics.longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime
              })
            }
          })
        })

        observer.observe({ entryTypes: ['longtask'] })
      } catch {
        // Long task observer not supported
      }
    }
  }

  private reportToAnalytics(name: string, metric: Metric) {
    // Report to analytics service
    if (this.reportEndpoint) {
      const body = JSON.stringify({
        metric: name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now()
      })

      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.reportEndpoint, body)
      } else {
        // Fallback to fetch
        fetch(this.reportEndpoint, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true
        }).catch(() => {
          // Silently fail
        })
      }
    }
  }

  public setReportEndpoint(endpoint: string) {
    this.reportEndpoint = endpoint
  }

  public subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public markEvent(name: string) {
    performance.mark(name)
  }

  public measureBetween(startMark: string, endMark: string, measureName?: string) {
    const name = measureName || `${startMark}-to-${endMark}`
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name, 'measure')[0]

      return measure?.duration
    } catch (e) {
      console.error('[Performance] Measurement failed:', e)
      return null
    }
  }

  public clearMarks() {
    performance.clearMarks()
  }

  public clearMeasures() {
    performance.clearMeasures()
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Helper function to report custom metrics
export const reportMetric = (name: string, value: number) => {
  // Custom metrics recorded
  void name
  void value
  // You can extend this to send to your analytics service
}

// Helper to measure component render time
export const measureComponentPerformance = (componentName: string) => {
  const startMark = `${componentName}-render-start`
  const endMark = `${componentName}-render-end`
  
  return {
    start: () => performanceMonitor.markEvent(startMark),
    end: () => performanceMonitor.measureBetween(startMark, endMark)
  }
}