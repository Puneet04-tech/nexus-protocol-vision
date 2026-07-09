export class BackupVersionManager {
  private static readonly CURRENT_VERSION = '1.0.0';

  public static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Check if a backup version is compatible with the current system version.
   * Uses major-minor-patch semantic parsing.
   */
  public static checkCompatibility(backupVersion: string): {
    compatible: boolean;
    reason?: string;
  } {
    if (!backupVersion || typeof backupVersion !== 'string') {
      return { compatible: false, reason: 'Invalid or missing version descriptor' };
    }

    const [currentMajor, currentMinor] = this.CURRENT_VERSION.split('.').map(Number);
    const versionParts = backupVersion.split('.').map(Number);

    if (versionParts.length < 1 || versionParts.some(isNaN)) {
      return { compatible: false, reason: 'Malformed semantic version string' };
    }

    const [backupMajor, backupMinor] = versionParts;

    // Major version mismatch
    if (backupMajor > currentMajor) {
      return {
        compatible: false,
        reason: `Backup version ${backupVersion} is newer than the current system version ${this.CURRENT_VERSION}. Please upgrade your engine.`,
      };
    }

    if (backupMajor < currentMajor) {
      // Legacy support check (e.g. if we had older major versions, we would check migrations)
      // For now, major version 0 might be allowed or not.
      return {
        compatible: true,
        reason: `Legacy major version detected. Attempting automatic migration from v${backupVersion}.`,
      };
    }

    // Minor version check
    if (backupMinor > currentMinor) {
      return {
        compatible: true,
        reason: `Minor version warning: Backup has minor version ${backupMinor} while current system is ${currentMinor}. Some newer features might be skipped.`,
      };
    }

    return { compatible: true };
  }
}
