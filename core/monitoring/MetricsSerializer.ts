import { MetricRecord } from './MonitoringTypes';

/**
 * Handles safe serialization/deserialization and sanitization of telemetry data
 */
export class MetricsSerializer {
  /**
   * Safe serialization of metric records
   */
  public static serialize(record: MetricRecord): string {
    try {
      // Basic structure validation
      if (!record.name || typeof record.value !== 'number') {
        throw new Error('Invalid record format');
      }
      return JSON.stringify({
        n: record.name,
        v: record.value,
        t: record.timestamp,
        g: record.tags || undefined
      });
    } catch (e: any) {
      return '';
    }
  }

  /**
   * Safe deserialization of metric records, returning null on corrupt data
   */
  public static deserialize(serialized: string): MetricRecord | null {
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized);
      if (!parsed || typeof parsed !== 'object') return null;

      // Extract keys and rebuild type-safe record
      const name = parsed.n || parsed.name;
      const value = typeof parsed.v === 'number' ? parsed.v : parsed.value;
      const timestamp = typeof parsed.t === 'number' ? parsed.t : parsed.timestamp;
      const tags = parsed.g || parsed.tags;

      if (typeof name !== 'string' || typeof value !== 'number' || typeof timestamp !== 'number') {
        return null;
      }

      return {
        name,
        value,
        timestamp,
        tags: tags && typeof tags === 'object' ? tags : undefined
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Sanitize string outputs to prevent XSS vulnerability on the dashboard
   */
  public static sanitizeString(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize tags dictionary
   */
  public static sanitizeTags(tags?: Record<string, string>): Record<string, string> | undefined {
    if (!tags) return undefined;
    const clean: Record<string, string> = {};
    for (const [key, val] of Object.entries(tags)) {
      const cleanKey = this.sanitizeString(key).substring(0, 50);
      const cleanVal = this.sanitizeString(val).substring(0, 200);
      if (cleanKey) {
        clean[cleanKey] = cleanVal;
      }
    }
    return clean;
  }
}
