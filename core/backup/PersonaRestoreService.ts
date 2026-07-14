import { SovereignPersona } from '../sovereign-persona/SovereignPersona';
import {
  BackupPackage,
  BackupPayload,
  BackupSelection,
  ConflictReport,
  GraphConflict,
  RestoreEvent,
} from './BackupTypes';
import { BackupValidator } from './BackupValidator';
import { BackupVersionManager } from './BackupVersionManager';
import { BackupIntegrity } from './BackupIntegrity';
import { BackupEncryption } from './BackupEncryption';
import { BackupCompression } from './BackupCompression';
import { BackupSerializer } from './BackupSerializer';
import { BackupHistoryManager } from './BackupHistory';

export class PersonaRestoreService {
  /**
   * Safely inspects a backup string (from localStorage or file upload) and checks compatibility.
   */
  public static inspectBackup(backupJsonStr: string): {
    pkg: BackupPackage;
    compatibility: { compatible: boolean; reason?: string };
  } {
    // 1. Defend against Prototype Pollution in the JSON source
    BackupValidator.validateJsonSafety(backupJsonStr);

    const pkg = JSON.parse(backupJsonStr) as BackupPackage;
    
    // 2. Validate basic structure
    BackupValidator.validateStructure(pkg);

    // 3. Inspect version and check compatibility
    const comp = BackupVersionManager.checkCompatibility(pkg.backup.version);

    return { pkg, compatibility: comp };
  }

  /**
   * Computes conflicts between active Persona and backup data before restore commit.
   */
  public static checkConflicts(
    persona: SovereignPersona,
    payload: BackupPayload
  ): ConflictReport {
    const conflicts: GraphConflict[] = [];
    if (!payload.cognitiveGraph || !payload.cognitiveGraph.nodes) {
      return { conflicts, hasConflicts: false };
    }

    const localGraph = persona.getCognitiveGraph().exportGraph();
    const localNodeMap = new Map(localGraph.nodes.map((n) => [n.id, n]));

    for (const bNode of payload.cognitiveGraph.nodes) {
      const localNode = localNodeMap.get(bNode.id);
      if (localNode) {
        // If mastery levels or counts differ, report conflict
        if (
          localNode.confidence !== bNode.confidence ||
          localNode.accessCount !== bNode.accessCount
        ) {
          conflicts.push({
            nodeId: bNode.id,
            domain: bNode.domain,
            localConfidence: localNode.confidence,
            backupConfidence: bNode.confidence,
            localAccessCount: localNode.accessCount,
            backupAccessCount: bNode.accessCount,
          });
        }
      }
    }

    return { conflicts, hasConflicts: conflicts.length > 0 };
  }

  /**
   * Performs the decryption and decompression of backup package payload.
   */
  public static async decryptPayload(
    pkg: BackupPackage,
    password: string
  ): Promise<BackupPayload> {
    const b = pkg.backup;
    
    // 1. Verify Ciphertext integrity first to detect corruption
    const ciphertextBytes = BackupEncryption.base64ToBuf(b.encryptedPayload);
    await BackupIntegrity.assertIntegrity(ciphertextBytes, b.checksum);

    // 2. Decrypt the compressed bytes using PBKDF2 parameters in metadata
    const compressedBytes = await BackupEncryption.decrypt(
      b.encryptedPayload,
      password,
      b.metadata.encryption.salt,
      b.metadata.encryption.iv,
      b.metadata.encryption.pbkdf2Iterations
    );

    // 3. Decompress the plaintext bytes
    const plaintext = await BackupCompression.decompress(compressedBytes);

    // 4. Validate parsed JSON safety
    BackupValidator.validateJsonSafety(plaintext);
    
    return JSON.parse(plaintext) as BackupPayload;
  }

  /**
   * Final step: Restores the selected modules onto the active Persona, with rollback protection.
   */
  public static async executeRestore(
    persona: SovereignPersona,
    payload: BackupPayload,
    selection: BackupSelection,
    strategy: 'merge' | 'replace' | 'skip',
    backupId?: string
  ): Promise<void> {
    // 1. Take a full snapshot of active state for Rollback support
    const originalProfile = { ...persona.getProfile() };
    
    // Deep clone original profile lists
    originalProfile.ethicalBoundaries = originalProfile.ethicalBoundaries.map((eb) => ({
      domain: eb.domain,
      constraints: [...eb.constraints],
      severity: eb.severity,
    }));
    originalProfile.professionalContext = {
      ...originalProfile.professionalContext,
      skills: [...originalProfile.professionalContext.skills],
      goals: [...originalProfile.professionalContext.goals],
    };
    originalProfile.privacyPreferences = { ...originalProfile.privacyPreferences };
    
    const originalGraph = persona.getCognitiveGraph().exportGraph();
    const originalLocalStore = Array.from(persona.getLocalStore().entries());

    try {
      // 2. Apply deserialized backup state selectively
      BackupSerializer.deserializeAndApply(persona, payload, selection, strategy);
    } catch (err: any) {
      // 3. Transaction failed! Restore the pre-operation memory snapshot.
      persona.importPersona(
        originalProfile as any,
        {
          nodes: originalGraph.nodes,
          edges: originalGraph.edges,
        },
        originalLocalStore
      );

      // Log failure in history
      if (backupId) {
        this.logRestoreEvent(backupId, {
          timestamp: Date.now(),
          success: false,
          error: err.message || String(err),
          restoredModules: (Object.keys(selection) as (keyof BackupSelection)[]).filter(
            (k) => selection[k]
          ),
          strategy,
        });
      }

      throw new Error(`Restore failed. Your local persona state has been rolled back. Details: ${err.message}`);
    }

    // Log success in history
    if (backupId) {
      this.logRestoreEvent(backupId, {
        timestamp: Date.now(),
        success: true,
        restoredModules: (Object.keys(selection) as (keyof BackupSelection)[]).filter(
          (k) => selection[k]
        ),
        strategy,
      });
    }
  }

  private static logRestoreEvent(backupId: string, event: RestoreEvent): void {
    try {
      BackupHistoryManager.addRestoreEvent(backupId, event);
    } catch (e) {
      console.warn('Could not record restore event in history log:', e);
    }
  }
}
