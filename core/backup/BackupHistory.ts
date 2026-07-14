import { BackupHistoryEntry, RestoreEvent } from './BackupTypes';

export class BackupHistoryManager {
  private static readonly STORAGE_KEY = 'nexus_backup_history';

  /**
   * Load history log from localStorage with parsing safety.
   */
  public static loadHistory(): BackupHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse backup history, resetting log:', err);
      return [];
    }
  }

  /**
   * Write history log back to localStorage.
   */
  public static saveHistory(history: BackupHistoryEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save backup history:', err);
    }
  }

  /**
   * Append a new backup record to history.
   */
  public static addEntry(entry: BackupHistoryEntry): void {
    const history = this.loadHistory();
    history.unshift(entry); // Newest first
    this.saveHistory(history);
  }

  /**
   * Record a restore event inside a backup record.
   */
  public static addRestoreEvent(backupId: string, event: RestoreEvent): void {
    const history = this.loadHistory();
    const entry = history.find((e) => e.id === backupId);
    if (entry) {
      if (!entry.restoreEvents) entry.restoreEvents = [];
      entry.restoreEvents.push(event);
      this.saveHistory(history);
    }
  }

  /**
   * Remove a backup record from history.
   */
  public static deleteEntry(backupId: string): void {
    const history = this.loadHistory();
    const updated = history.filter((e) => e.id !== backupId);
    this.saveHistory(updated);
  }

  /**
   * Rename a backup record.
   */
  public static renameEntry(backupId: string, newName: string): void {
    const history = this.loadHistory();
    const entry = history.find((e) => e.id === backupId);
    if (entry) {
      entry.name = newName;
      this.saveHistory(history);
    }
  }
}
