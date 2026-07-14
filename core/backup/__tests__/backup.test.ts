import { SovereignPersona } from '../../sovereign-persona/SovereignPersona';
import { BackupUtils } from '../BackupUtils';
import { BackupVersionManager } from '../BackupVersionManager';
import { BackupValidator } from '../BackupValidator';
import { BackupEncryption } from '../BackupEncryption';
import { BackupCompression } from '../BackupCompression';
import { BackupIntegrity } from '../BackupIntegrity';
import { BackupSerializer } from '../BackupSerializer';
import { PersonaBackupService } from '../PersonaBackupService';
import { PersonaRestoreService } from '../PersonaRestoreService';
import { SuiteResults, TestCaseResult, BackupSelection } from '../BackupTypes';

export class BackupTestSuite {
  /**
   * Runs all diagnostic tests for the Backup and Restore module.
   */
  public static async runTests(persona: SovereignPersona): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

    const runTest = async (
      suite: string,
      name: string,
      fn: () => void | Promise<void>
    ) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart,
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err),
        });
      }
    };

    // ==========================================
    // UNIT TESTS: BackupUtils & Versioning
    // ==========================================
    await runTest('Backup Utilities', 'validates password strength levels', () => {
      const weak = BackupUtils.checkPasswordStrength('123');
      if (weak.score >= 2 || weak.label !== 'Weak') {
        throw new Error('Expected "123" to be classified as Weak.');
      }

      const strong = BackupUtils.checkPasswordStrength('SecurePassword2026!');
      if (strong.score < 4 || strong.label !== 'Strong') {
        throw new Error('Expected complex password to be Strong.');
      }
    });

    await runTest('Backup Utilities', 'formats sizes correctly', () => {
      const formattedBytes = BackupUtils.formatSize(256);
      if (formattedBytes !== '256 B') {
        throw new Error(`Expected "256 B", got "${formattedBytes}"`);
      }

      const formattedKb = BackupUtils.formatSize(2048);
      if (formattedKb !== '2 KB') {
        throw new Error(`Expected "2 KB", got "${formattedKb}"`);
      }
    });

    await runTest('Version Management', 'verifies semantic compatibility bounds', () => {
      const compSame = BackupVersionManager.checkCompatibility('1.0.0');
      if (!compSame.compatible) {
        throw new Error('Expected v1.0.0 to be fully compatible.');
      }

      const compNewer = BackupVersionManager.checkCompatibility('2.0.0');
      if (compNewer.compatible) {
        throw new Error('Expected v2.0.0 (newer major version) to be incompatible.');
      }

      const compOlder = BackupVersionManager.checkCompatibility('0.9.0');
      if (!compOlder.compatible) {
        throw new Error('Expected older minor/major version compatibility with warning.');
      }
    });

    // ==========================================
    // SECURITY TESTS: Filename & Injection
    // ==========================================
    await runTest('Security Validation', 'sanitizes filename path traversals', () => {
      const input = '../../etc/passwd';
      const output = BackupValidator.sanitizeFilename(input);
      if (output.includes('/') || output.includes('..')) {
        throw new Error(`Path traversal failed to sanitize. Output was: ${output}`);
      }
    });

    await runTest('Security Validation', 'detects and blocks prototype pollution', () => {
      const maliciousPayloadStr = '{"backup": {"version": "1.0.0"}, "__proto__": {"polluted": true}}';
      try {
        BackupValidator.validateJsonSafety(maliciousPayloadStr);
        throw new Error('Expected prototype pollution to raise an exception');
      } catch (err: any) {
        if (!err.message.includes('prototype pollution')) {
          throw new Error(`Unexpected error message during pollution check: ${err.message}`);
        }
      }
    });

    await runTest('Security Validation', 'rejects malformed package schemas', () => {
      const badObj = { backup: { version: '1.0.0' } };
      try {
        BackupValidator.validateStructure(badObj);
        throw new Error('Expected incomplete structure check to raise error');
      } catch (err: any) {
        if (!err.message.includes('Missing required schema fields')) {
          throw new Error(`Unexpected structure validation error: ${err.message}`);
        }
      }
    });

    // ==========================================
    // CRYPTO & INTEGRITY TESTS
    // ==========================================
    await runTest('Crypto & Integrity', 'runs compression loop integrity', async () => {
      const originalString = JSON.stringify({ a: 1, b: 'test', c: [1, 2, 3] });
      const compressed = await BackupCompression.compress(originalString);
      const decompressed = await BackupCompression.decompress(compressed);
      if (decompressed !== originalString) {
        throw new Error('Decompressed string does not match original.');
      }
    });

    await runTest('Crypto & Integrity', 'encrypts and decrypts with password', async () => {
      const plaintext = new TextEncoder().encode('Highly Secret Digital Twin Data');
      const password = 'test-password';
      
      const { ciphertext, salt, iv } = await BackupEncryption.encrypt(
        plaintext,
        password,
        1000 // lower iterations for faster test run
      );

      const decrypted = await BackupEncryption.decrypt(
        ciphertext,
        password,
        salt,
        iv,
        1000
      );

      const decryptedStr = new TextDecoder().decode(decrypted);
      if (decryptedStr !== 'Highly Secret Digital Twin Data') {
        throw new Error('Decryption payload mismatch.');
      }

      // Check wrong password exception
      try {
        await BackupEncryption.decrypt(ciphertext, 'wrong-pass', salt, iv, 1000);
        throw new Error('Decryption with wrong password should fail.');
      } catch (err: any) {
        if (!err.message.includes('check if the password is correct')) {
          throw new Error(`Unexpected decryption failure message: ${err.message}`);
        }
      }
    });

    await runTest('Crypto & Integrity', 'detects data tampering/corruption', async () => {
      const data = new TextEncoder().encode('Integrity Check Data');
      const checksum = await BackupIntegrity.calculateChecksum(data);
      
      // Should verify fine
      const isOk = await BackupIntegrity.verifyChecksum(data, checksum);
      if (!isOk) {
        throw new Error('Checksum verification failed for original data.');
      }

      // Corrupt a byte
      const corruptedData = new Uint8Array(data);
      corruptedData[0] = corruptedData[0] ^ 0xFF;

      const isCorruptedOk = await BackupIntegrity.verifyChecksum(corruptedData, checksum);
      if (isCorruptedOk) {
        throw new Error('Integrity validation failed to detect single-byte corruption.');
      }
    });

    // ==========================================
    // INTEGRATION TESTS: Backup and Restore
    // ==========================================
    await runTest('Orchestration Service', 'runs full selective backup and restore loop', async () => {
      // 1. Set some unique values in active persona profile/goals
      const activeGoals = [...persona.getProfile().professionalContext.goals];
      persona.getProfile().professionalContext.goals = ['UniqueGoal1', 'UniqueGoal2'];

      const selection: BackupSelection = {
        knowledgeGraph: false,
        ethicalBoundaries: false,
        learningHistory: false,
        privacyPreferences: false,
        professionalContext: false,
        goals: true, // ONLY Goals
        settings: false,
        carbonPreferences: false,
        interactionMemory: false,
        customPreferences: false,
      };

      // 2. Perform backup
      const backupPkg = await PersonaBackupService.createBackup(
        persona,
        selection,
        'pass123',
        'SelectiveGoalsTest'
      );

      // Clean active goals in memory
      persona.getProfile().professionalContext.goals = ['ClearedGoals'];

      // 3. Inspect backup metadata
      const { pkg, compatibility } = PersonaRestoreService.inspectBackup(
        JSON.stringify(backupPkg)
      );
      if (!compatibility.compatible) {
        throw new Error('Backup should be compatible.');
      }

      // 4. Decrypt payload
      const payload = await PersonaRestoreService.decryptPayload(pkg, 'pass123');

      // 5. Execute restore (Replace strategy)
      await PersonaRestoreService.executeRestore(
        persona,
        payload,
        selection,
        'replace'
      );

      const restoredGoals = persona.getProfile().professionalContext.goals;
      if (
        restoredGoals.length !== 2 ||
        !restoredGoals.includes('UniqueGoal1') ||
        !restoredGoals.includes('UniqueGoal2')
      ) {
        throw new Error(`Selective goals restore failed. Found: ${restoredGoals.join(', ')}`);
      }

      // Clean up backup history log created during test
      const history = localStorage.getItem('nexus_backup_history');
      if (history) {
        const parsed = JSON.parse(history);
        const filtered = parsed.filter((item: any) => item.name !== 'SelectiveGoalsTest');
        localStorage.setItem('nexus_backup_history', JSON.stringify(filtered));
      }
      localStorage.removeItem(`nexus_backup_payload_bk_${backupPkg.backup.createdAt}`);

      // Restore active goals
      persona.getProfile().professionalContext.goals = activeGoals;
    });

    await runTest('Orchestration Service', 'rolls back state if restore operation fails', async () => {
      // 1. Record original state
      const originalGoals = [...persona.getProfile().professionalContext.goals];
      persona.getProfile().professionalContext.goals = ['GoalBeforeFail'];

      // Create a corrupted backup payload structure that fails in deserializer
      const corruptedPayload = {
        personaId: persona.getProfile().id,
        exportedAt: Date.now(),
        profile: {
          professionalContext: {
            // This will cause an error if we try to access or map a non-array or trigger an internal error
            get goals() {
              throw new Error('Simulated write failure during goals mapping');
            },
          },
        },
      } as any;

      const selection: BackupSelection = {
        knowledgeGraph: false,
        ethicalBoundaries: false,
        learningHistory: false,
        privacyPreferences: false,
        professionalContext: false,
        goals: true,
        settings: false,
        carbonPreferences: false,
        interactionMemory: false,
        customPreferences: false,
      };

      try {
        await PersonaRestoreService.executeRestore(
          persona,
          corruptedPayload,
          selection,
          'replace'
        );
        throw new Error('Restore execution should have failed.');
      } catch (err: any) {
        if (!err.message.includes('Persona state has been rolled back')) {
          throw new Error(`Rollback warning missing in error: ${err.message}`);
        }
      }

      // Verify that active goals matches state before restoration attempt
      const activeGoals = persona.getProfile().professionalContext.goals;
      if (activeGoals.length !== 1 || activeGoals[0] !== 'GoalBeforeFail') {
        throw new Error(`Rollback failed. Expected ["GoalBeforeFail"], got: ${JSON.stringify(activeGoals)}`);
      }

      // Restore original goals
      persona.getProfile().professionalContext.goals = originalGoals;
    });

    const end = Date.now();
    const passed = tests.filter((t) => t.passed).length;
    const failed = tests.filter((t) => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests,
    };
  }
}
