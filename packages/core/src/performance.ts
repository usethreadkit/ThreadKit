/**
 * Performance monitoring utilities for ThreadKit
 *
 * Usage:
 *   const perf = new PerformanceMonitor({ enabled: debug });
 *
 *   // Automatic timing
 *   await perf.measure('fetch-comments', () => fetchComments());
 *
 *   // Manual timing
 *   perf.start('complex-operation');
 *   // ... do work
 *   perf.end('complex-operation');
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMonitorOptions {
  enabled?: boolean;
  onMetric?: (metric: PerformanceMetric) => void;
  threshold?: number; // Log warning if duration exceeds threshold (ms)
}

export class PerformanceMonitor {
  private enabled: boolean;
  private onMetric?: (metric: PerformanceMetric) => void;
  private threshold: number;
  private marks = new Map<string, number>();
  private metrics: PerformanceMetric[] = [];

  constructor(options: PerformanceMonitorOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.onMetric = options.onMetric;
    this.threshold = options.threshold ?? 1000; // Default: warn if >1s
  }

  /**
   * Start a performance measurement
   */
  start(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());

    // Also use native Performance API for browser DevTools
    if (typeof performance.mark === 'function') {
      performance.mark(`threadkit-${name}-start`);
    }
  }

  /**
   * End a performance measurement
   */
  end(name: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const endTime = performance.now();
    const startTime = this.marks.get(name);

    if (startTime === undefined) {
      console.warn(`[ThreadKit Perf] No start mark found for "${name}"`);
      return;
    }

    const duration = endTime - startTime;
    this.marks.delete(name);

    // Use native Performance API
    if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
      performance.mark(`threadkit-${name}-end`);
      try {
        performance.measure(`threadkit-${name}`, `threadkit-${name}-start`, `threadkit-${name}-end`);
      } catch (e) {
        // Ignore errors (marks might have been cleared)
      }
    }

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Call callback
    this.onMetric?.(metric);

    // Warn on slow operations
    if (duration > this.threshold) {
      console.warn(
        `[ThreadKit Perf] Slow operation: "${name}" took ${duration.toFixed(2)}ms`,
        metadata
      );
    }
  }

  /**
   * Measure an async operation
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name, metadata);
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name, metadata);
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; total: number; min: number; max: number }> = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.total += metric.duration;
      s.min = Math.min(s.min, metric.duration);
      s.max = Math.max(s.max, metric.duration);
    }

    // Convert to final format with average
    const result: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    for (const [name, stats] of Object.entries(summary)) {
      result[name] = {
        count: stats.count,
        avg: stats.total / stats.count,
        min: stats.min,
        max: stats.max,
      };
    }

    return result;
  }
}

/**
 * Global performance monitor (disabled by default)
 * Enable via: enableGlobalPerformanceMonitoring()
 */
let globalMonitor: PerformanceMonitor | null = null;

export function enableGlobalPerformanceMonitoring(options?: PerformanceMonitorOptions): PerformanceMonitor {
  globalMonitor = new PerformanceMonitor({ ...options, enabled: true });

  // Expose to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__THREADKIT_PERFORMANCE__ = {
      monitor: globalMonitor,
      getMetrics: () => globalMonitor?.getMetrics(),
      getSummary: () => globalMonitor?.getSummary(),
      clear: () => globalMonitor?.clear(),
    };
  }

  return globalMonitor;
}

export function getGlobalPerformanceMonitor(): PerformanceMonitor | null {
  return globalMonitor;
}

/**
 * Auto-instrument an object's methods with performance monitoring
 *
 * Usage:
 *   const store = iperf(new CommentStore(...), {
 *     methods: ['fetch', 'post', 'vote'],
 *     monitor: perfMonitor,
 *   });
 */
export function iperf<T extends Record<string, any>>(
  target: T,
  options: {
    methods?: string[];
    monitor: PerformanceMonitor;
    prefix?: string;
  }
): T {
  const { methods, monitor, prefix = '' } = options;

  // Auto-detect methods if not specified
  const methodsToInstrument = methods ||
    Object.getOwnPropertyNames(Object.getPrototypeOf(target))
      .filter(key => typeof (target as any)[key] === 'function' && key !== 'constructor');

  for (const methodName of methodsToInstrument) {
    const original = target[methodName];
    if (typeof original !== 'function') continue;

    const metricName = prefix ? `${prefix}.${methodName}` : methodName;

    target[methodName] = function (this: any, ...args: any[]) {
      const result = original.apply(this, args);

      // Handle async functions
      if (result && typeof result.then === 'function') {
        return monitor.measure(metricName, () => result);
      }

      // Handle sync functions
      return monitor.measureSync(metricName, () => result);
    } as any;
  }

  return target;
}
