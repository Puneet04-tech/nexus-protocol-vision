/**
 * Mathematical and formatting helper utilities for monitoring metrics
 */

export class MonitoringUtils {
  /**
   * Measure execution time of a synchronous function
   */
  public static measureSync<T>(fn: () => T): { result: T; durationMs: number } {
    const start = performance.now();
    const result = fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
  }

  /**
   * Measure execution time of an asynchronous function
   */
  public static async measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
  }

  /**
   * Calculate average of an array of numbers
   */
  public static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
  }

  /**
   * Calculate arbitrary percentile of sorted numbers
   */
  public static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get standard P50, P95, and P99 latency percentiles
   */
  public static calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number } {
    return {
      p50: this.calculatePercentile(values, 50),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99)
    };
  }

  /**
   * Safe input validation for metrics publishing
   */
  public static validateMetric(name: string, value: number): boolean {
    if (!name || typeof name !== 'string' || name.trim() === '') return false;
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return false;
    return true;
  }

  /**
   * Format bytes into human-readable strings
   */
  public static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format seconds into human-readable uptime string
   */
  public static formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }
}
