import { BackupEncryption } from './BackupEncryption';

export class BackupIntegrity {
  /**
   * Calculates SHA-256 checksum of raw data (Uint8Array)
   */
  public static async calculateChecksum(data: Uint8Array): Promise<string> {
    const cryptoObj = globalThis.crypto;
    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error('Web Crypto API is required for integrity checks.');
    }
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    return BackupEncryption.bufToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Verifies that the data matches the expected SHA-256 checksum
   */
  public static async verifyChecksum(
    data: Uint8Array,
    expectedChecksum: string
  ): Promise<boolean> {
    const currentChecksum = await this.calculateChecksum(data);
    return currentChecksum === expectedChecksum;
  }

  /**
   * Asserts integrity. Throws detailed error if tampered or corrupted.
   */
  public static async assertIntegrity(
    data: Uint8Array,
    expectedChecksum: string
  ): Promise<void> {
    const isValid = await this.verifyChecksum(data, expectedChecksum);
    if (!isValid) {
      throw new Error(
        'Integrity verification failed! The backup file appears to be corrupted, altered, or tampered with.'
      );
    }
  }
}
