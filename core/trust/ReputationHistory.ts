import { ReputationHistoryEntry, TrustConfig } from './TrustTypes';

/**
 * Tracks historical trust score changes and updates.
 */
export class ReputationHistory {
  private entries: ReputationHistoryEntry[] = [];

  constructor(initialEntries: ReputationHistoryEntry[] = []) {
    this.entries = [...initialEntries];
  }

  /**
   * Logs a new reputation update event.
   */
  public addEntry(entry: ReputationHistoryEntry): void {
    this.entries.push(entry);
  }

  /**
   * Retrieves the reputation history, optionally filtered by agent ID.
   * Returns entries sorted newest first.
   */
  public getHistory(agentId?: string): ReputationHistoryEntry[] {
    const filtered = agentId
      ? this.entries.filter((e) => e.agentId === agentId)
      : this.entries;
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Prunes history records that fall outside the retention period window.
   */
  public pruneHistory(config: TrustConfig, currentTime: number): void {
    const retentionMs = config.historyRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = currentTime - retentionMs;
    this.entries = this.entries.filter((e) => e.timestamp >= cutoffTime);
  }

  /**
   * Returns all raw history entries.
   */
  public getEntries(): ReputationHistoryEntry[] {
    return this.entries;
  }
}
