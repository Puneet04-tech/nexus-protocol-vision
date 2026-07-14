export class BackupValidator {
  /**
   * Cleans filename to prevent path traversal, prototype pollution via file paths, and general invalid chars.
   */
  public static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return `backup_${Date.now()}.json`;
    }
    
    // Remove any path separators and dots sequence
    let clean = filename
      .replace(/\\/g, '')
      .replace(/\//g, '')
      .replace(/\.\./g, '');

    // Keep only alphanumeric characters, dashes, underscores, and single dots
    clean = clean.replace(/[^a-zA-Z0-9_\-\.]/g, '');

    if (clean === '' || clean === '.' || clean === '..') {
      return `backup_${Date.now()}.json`;
    }
    return clean;
  }

  /**
   * Checks a JSON string for proto pollution patterns before parsing.
   */
  public static validateJsonSafety(jsonStr: string): void {
    if (!jsonStr) return;

    // Reject outright if we find prototype pollution keywords in keys
    const pollutionPattern = /"__proto__"|"\bprototype\b"|"\bconstructor\b"/gi;
    if (pollutionPattern.test(jsonStr)) {
      throw new Error('Security Error: Potential prototype pollution attempt detected in JSON keys!');
    }

    try {
      JSON.parse(jsonStr, (key) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new Error('Security Error: Forbidden keyword in JSON parsing context');
        }
      });
    } catch (err: any) {
      if (err.message.includes('Security Error')) {
        throw err;
      }
      throw new Error('Malformed JSON syntax. Could not parse package.');
    }
  }

  /**
   * Asserts that the object matches the schema required for backup.
   */
  public static validateStructure(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      throw new Error('Invalid backup file: Root must be a JSON object.');
    }

    if (!obj.backup) {
      throw new Error('Invalid backup file: Missing root "backup" node.');
    }

    const b = obj.backup;
    if (
      !b.version ||
      !b.createdAt ||
      !b.personaId ||
      !b.checksum ||
      !b.encryptedPayload ||
      !b.metadata
    ) {
      throw new Error('Invalid backup file: Missing required schema fields.');
    }

    const meta = b.metadata;
    if (
      !meta.version ||
      !meta.createdAt ||
      !meta.personaId ||
      !meta.checksum ||
      !meta.selectedModules ||
      !meta.encryption ||
      !meta.encryption.salt ||
      !meta.encryption.iv
    ) {
      throw new Error('Invalid backup file: Metadata structure is incomplete.');
    }
  }
}
