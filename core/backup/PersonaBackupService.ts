import { SovereignPersona } from '../sovereign-persona/SovereignPersona';
import { BackupSelection, BackupPackage, BackupHistoryEntry } from './BackupTypes';
import { BackupSerializer } from './BackupSerializer';
import { BackupCompression } from './BackupCompression';
import { BackupEncryption } from './BackupEncryption';
import { BackupIntegrity } from './BackupIntegrity';
import { BackupMetadataHelper } from './BackupMetadata';
import { BackupHistoryManager } from './BackupHistory';
import { BackupStorage } from './BackupStorage';

export class PersonaBackupService {
  /**
   * Creates an encrypted backup package of the Sovereign Persona.
   */
  public static async createBackup(
    persona: SovereignPersona,
    selection: BackupSelection,
    password: string,
    backupName?: string
  ): Promise<BackupPackage> {
    if (!password) {
      throw new Error('A security password is required to encrypt the backup.');
    }

    const activeProfile = persona.getProfile();
    const personaId = activeProfile.id;

    // 1. Serialize the chosen components
    const payload = BackupSerializer.serialize(persona, selection);
    const jsonStr = JSON.stringify(payload);

    // 2. Compress the string content
    const compressedBytes = await BackupCompression.compress(jsonStr);

    // 3. Encrypt the compressed data
    const iterations = 100000;
    const { ciphertext, salt, iv } = await BackupEncryption.encrypt(
      compressedBytes,
      password,
      iterations
    );

    // 4. Calculate integrity checksum on the ciphertext bytes
    const ciphertextBytes = BackupEncryption.base64ToBuf(ciphertext);
    const checksum = await BackupIntegrity.calculateChecksum(ciphertextBytes);

    // 5. Structure metadata and wrap package
    const approximateSize = JSON.stringify(payload).length; // Plaintext size estimation
    const metadata = BackupMetadataHelper.createMetadata(
      personaId,
      approximateSize,
      (Object.keys(selection) as (keyof BackupSelection)[]).filter(
        (key) => selection[key]
      ),
      salt,
      iv,
      checksum,
      iterations
    );

    const backupPkg: BackupPackage = {
      backup: {
        version: metadata.version,
        createdAt: metadata.createdAt,
        personaId: metadata.personaId,
        checksum: metadata.checksum,
        encryptedPayload: ciphertext,
        metadata: metadata,
      },
    };

    // 6. Register backup record in history log
    const backupId = `bk_${metadata.createdAt}`;
    const defaultName = `Backup_${new Date(metadata.createdAt)
      .toISOString()
      .split('T')[0]}_${new Date(metadata.createdAt).toTimeString().split(' ')[0].replace(/:/g, '-')}`;
    
    const historyEntry: BackupHistoryEntry = {
      id: backupId,
      name: backupName || defaultName,
      timestamp: metadata.createdAt,
      version: metadata.version,
      size: approximateSize,
      modulesIncluded: metadata.selectedModules,
      encryptionAlgorithm: metadata.encryption.algorithm,
      status: 'success',
      restoreEvents: [],
    };

    BackupHistoryManager.addEntry(historyEntry);

    // 7. Store encrypted backup payload in localStorage
    const pkgJsonStr = JSON.stringify(backupPkg);
    BackupStorage.saveBackupPayload(backupId, pkgJsonStr);

    return backupPkg;
  }
}
