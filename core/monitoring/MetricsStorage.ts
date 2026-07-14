import { MetricRecord, StorageAdapter, TimeResolution } from './MonitoringTypes';
import { MetricsSerializer } from './MetricsSerializer';

/**
 * Default Local Storage Adapter for browser SPA environments
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'nexus_metrics:';
  private historyPrefix = 'nexus_history:';

  public async saveMetric(record: MetricRecord): Promise<void> {
    try {
      const key = `${this.prefix}${record.name}`;
      const existingRaw = localStorage.getItem(key);
      const list: string[] = existingRaw ? JSON.parse(existingRaw) : [];

      const serialized = MetricsSerializer.serialize(record);
      if (serialized) {
        list.push(serialized);
        // Keep a maximum of 500 detailed raw metrics per key to prevent LocalStorage quota exhaustion
        if (list.length > 500) {
          list.shift();
        }
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        this.runAggressivePruning();
      }
    }
  }

  public async saveMetrics(records: MetricRecord[]): Promise<void> {
    for (const record of records) {
      await this.saveMetric(record);
    }
  }

  public async getMetrics(name: string, startTime: number, endTime: number): Promise<MetricRecord[]> {
    try {
      const key = `${this.prefix}${name}`;
      const raw = localStorage.getItem(key);
      if (!raw) return [];

      const serializedList: string[] = JSON.parse(raw);
      const records: MetricRecord[] = [];

      for (const item of serializedList) {
        const decompressed = MetricsSerializer.deserialize(item);
        if (decompressed && decompressed.timestamp >= startTime && decompressed.timestamp <= endTime) {
          records.push(decompressed);
        }
      }

      return records;
    } catch (e) {
      return [];
    }
  }

  public async saveHistory(resolution: TimeResolution, timestamp: number, snapshot: Record<string, any>): Promise<void> {
    try {
      const key = `${this.historyPrefix}${resolution}`;
      const existingRaw = localStorage.getItem(key);
      const historyList: Array<{ t: number; s: Record<string, any> }> = existingRaw ? JSON.parse(existingRaw) : [];

      historyList.push({ t: timestamp, s: snapshot });

      // Cap histories to prevent infinite growth
      let maxItems = 1000;
      if (resolution === 'hour') maxItems = 168; // 1 week of hourly stats
      else if (resolution === 'day') maxItems = 365; // 1 year of daily stats
      else if (resolution === 'week') maxItems = 52;
      else if (resolution === 'month') maxItems = 24;

      if (historyList.length > maxItems) {
        historyList.shift();
      }

      localStorage.setItem(key, JSON.stringify(historyList));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        this.runAggressivePruning();
      }
    }
  }

  public async getHistory(resolution: TimeResolution, startTime: number, endTime: number): Promise<Record<string, any>[]> {
    try {
      const key = `${this.historyPrefix}${resolution}`;
      const raw = localStorage.getItem(key);
      if (!raw) return [];

      const historyList: Array<{ t: number; s: Record<string, any> }> = JSON.parse(raw);
      return historyList
        .filter(item => item.t >= startTime && item.t <= endTime)
        .map(item => ({ ...item.s, timestamp: item.t }));
    } catch (e) {
      return [];
    }
  }

  public async clearOldMetrics(beforeTimestamp: number): Promise<void> {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: string[] = JSON.parse(raw);
            const filtered = list.filter(item => {
              const record = MetricsSerializer.deserialize(item);
              return record ? record.timestamp >= beforeTimestamp : false;
            });
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      }
    } catch (e) {
      // Gracefully handle storage failures
    }
  }

  /**
   * Run data reduction if storage is full
   */
  private runAggressivePruning(): void {
    try {
      // Clear half of raw detailed data points for all metric keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: string[] = JSON.parse(raw);
            if (list.length > 50) {
              const trimmed = list.slice(Math.floor(list.length / 2));
              localStorage.setItem(key, JSON.stringify(trimmed));
            }
          }
        }
      }
    } catch (e) {}
  }
}

/**
 * Storage Manager manages the active adapter
 */
export class MetricsStorage {
  private static activeAdapter: StorageAdapter = new LocalStorageAdapter();

  public static registerAdapter(adapter: StorageAdapter): void {
    this.activeAdapter = adapter;
  }

  public static getAdapter(): StorageAdapter {
    return this.activeAdapter;
  }
}
