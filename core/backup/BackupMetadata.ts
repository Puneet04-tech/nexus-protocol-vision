import { BackupMetadata, BackupSelection } from './BackupTypes';
import { BackupVersionManager } from './BackupVersionManager';

export class BackupMetadataHelper {
  /**
   * Create a standardized metadata record
   */
  public static createMetadata(
    personaId: string,
    size: number,
    selectedModules: (keyof BackupSelection)[],
    saltHex: string,
    ivHex: string,
    checksum: string,
    iterations: number
  ): BackupMetadata {
    return {
      version: BackupVersionManager.getCurrentVersion(),
      createdAt: Date.now(),
      personaId,
      checksum,
      size,
      selectedModules,
      encryption: {
        algorithm: 'AES-256-GCM',
        salt: saltHex,
        iv: ivHex,
        pbkdf2Iterations: iterations,
      },
      compression: {
        algorithm: 'gzip',
      },
      hashAlgorithm: 'SHA-256',
    };
  }

  /**
   * Safe parser for extracting metadata from a backup package string
   */
  public static inspectMetadata(backupJsonStr: string): BackupMetadata {
    try {
      const obj = JSON.parse(backupJsonStr);
      if (!obj.backup || !obj.backup.metadata) {
        throw new Error('Missing backup metadata wrapper');
      }

      const metadata = obj.backup.metadata as BackupMetadata;

      // Basic integrity of metadata keys
      if (
        !metadata.version ||
        !metadata.createdAt ||
        !metadata.personaId ||
        !metadata.checksum ||
        !metadata.selectedModules ||
        !metadata.encryption ||
        !metadata.encryption.salt ||
        !metadata.encryption.iv
      ) {
        throw new Error('Incomplete metadata payload');
      }

      return metadata;
    } catch (err: any) {
      throw new Error(`Invalid backup metadata: ${err.message}`);
    }
  }
}
