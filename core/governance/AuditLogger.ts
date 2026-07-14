import { AuditEntry, GovernanceEventType } from './models/AuditEntry';

export class AuditLogger {
  private static STORAGE_KEY = 'nexus_governance_audit_logs';

  /**
   * Log a new governance event
   */
  public static log(
    eventType: GovernanceEventType,
    actor: string,
    policyId: string | undefined,
    details: Record<string, any>
  ): AuditEntry {
    const logs = this.getLogs();
    const previousHash = logs.length > 0 ? logs[logs.length - 1].hash : 'genesis_hash';

    const entryToHash: Omit<AuditEntry, 'hash'> = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      eventType,
      actor,
      policyId,
      details,
    };

    const hash = this.calculateHash(entryToHash, previousHash);
    const fullEntry: AuditEntry = { ...entryToHash, hash };

    logs.push(fullEntry);
    this.saveLogs(logs);

    return fullEntry;
  }

  /**
   * Fetch all logs
   */
  public static getLogs(): AuditEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all logs (only for testing or admin cleanup)
   */
  public static clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Verify the integrity of the audit log chain
   * Returns a report containing compatibility, chain break index if any
   */
  public static verifyIntegrity(): { verified: boolean; errorIndex?: number; message: string } {
    const logs = this.getLogs();
    if (logs.length === 0) {
      return { verified: true, message: 'Audit chain is empty and verified.' };
    }

    let previousHash = 'genesis_hash';
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const entryToHash: Omit<AuditEntry, 'hash'> = {
        id: log.id,
        timestamp: log.timestamp,
        eventType: log.eventType,
        actor: log.actor,
        policyId: log.policyId,
        details: log.details,
      };

      const calculated = this.calculateHash(entryToHash, previousHash);
      if (calculated !== log.hash) {
        return {
          verified: false,
          errorIndex: i,
          message: `Audit chain validation failed at index ${i}. Log ID: ${log.id}. Found mismatch.`,
        };
      }
      previousHash = log.hash;
    }

    return { verified: true, message: 'All audit logs verified successfully.' };
  }

  /**
   * Compute a hash of the audit record + previous record's hash to form a hash chain
   */
  private static calculateHash(entry: Omit<AuditEntry, 'hash'>, previousHash: string): string {
    const content = JSON.stringify(entry) + previousHash;
    let hashVal = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hashVal = (hashVal << 5) - hashVal + char;
      hashVal |= 0; // Convert to 32bit integer
    }
    return `hash_chain_${Math.abs(hashVal).toString(16)}`;
  }

  private static saveLogs(logs: AuditEntry[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
  }
}
