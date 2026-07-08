import { BackupValidator } from './BackupValidator';

export class BackupStorage {
  private static readonly PAYLOAD_PREFIX = 'nexus_backup_payload_';

  /**
   * Save a backup package string to localStorage.
   */
  public static saveBackupPayload(backupId: string, backupPkgStr: string): void {
    try {
      localStorage.setItem(`${this.PAYLOAD_PREFIX}${backupId}`, backupPkgStr);
    } catch (err: any) {
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        throw new Error('Local browser storage is full. Please delete older backups or export your backup to a file.');
      }
      throw err;
    }
  }

  /**
   * Load backup package string from localStorage.
   */
  public static loadBackupPayload(backupId: string): string {
    const data = localStorage.getItem(`${this.PAYLOAD_PREFIX}${backupId}`);
    if (!data) {
      throw new Error(`Backup data not found for ID: ${backupId}`);
    }
    return data;
  }

  /**
   * Remove backup package from localStorage.
   */
  public static deleteBackupPayload(backupId: string): void {
    localStorage.removeItem(`${this.PAYLOAD_PREFIX}${backupId}`);
  }

  /**
   * Triggers a browser file download of the backup package.
   */
  public static downloadBackupFile(backupPkgStr: string, name: string): void {
    const sanitized = BackupValidator.sanitizeFilename(name);
    const blob = new Blob([backupPkgStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitized.endsWith('.json') ? sanitized : `${sanitized}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Read file content as text.
   */
  public static readBackupFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text string'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error.'));
      reader.readAsText(file);
    });
  }
}
