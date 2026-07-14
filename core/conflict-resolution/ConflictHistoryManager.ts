import { KnowledgeConflict, ConflictStatus } from './models/KnowledgeConflict';
import { MergeDecision } from './models/MergeDecision';

export interface ConflictAuditEntry {
  index: number;
  timestamp: number;
  eventType: string; // e.g. CONFLICT_DETECTED, RECOMMENDATION_GENERATED, CONFLICT_RESOLVED, ROLLBACK_EXECUTED
  actor: string;
  conflictId?: string;
  nodeId?: string;
  details: string;
  hash: string;
  previousHash: string;
}

/**
 * Handles persistence and cryptographic logging of conflicts and resolution events
 */
export class ConflictHistoryManager {
  private conflicts: Map<string, KnowledgeConflict> = new Map();
  private decisions: MergeDecision[] = [];
  private auditLogs: ConflictAuditEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Appends an entry to the cryptographic audit trail log.
   */
  public log(
    eventType: string,
    actor: string,
    details: string,
    conflictId?: string,
    nodeId?: string
  ): ConflictAuditEntry {
    const timestamp = Date.now();
    const index = this.auditLogs.length;
    const previousHash = index > 0 ? this.auditLogs[index - 1].hash : '00000000000000000000000000000000';
    
    // Compute polynomial hash payload string
    const payload = `${index}|${timestamp}|${eventType}|${actor}|${conflictId || ''}|${nodeId || ''}|${details}|${previousHash}`;
    const hash = this.computeSimpleHash(payload);

    const entry: ConflictAuditEntry = {
      index,
      timestamp,
      eventType,
      actor,
      conflictId,
      nodeId,
      details,
      hash,
      previousHash,
    };

    this.auditLogs.push(entry);
    this.saveToStorage();
    return entry;
  }

  /**
   * Verifies the cryptographic chain integrity.
   * Re-hashes and checks each chain element. Returns validation report.
   */
  public verifyIntegrity(): { verified: boolean; message: string } {
    if (this.auditLogs.length === 0) {
      return { verified: true, message: 'Audit chain is empty. Integrity verified.' };
    }

    for (let i = 0; i < this.auditLogs.length; i++) {
      const log = this.auditLogs[i];

      // Verify index order
      if (log.index !== i) {
        return { verified: false, message: `Integrity broken: unexpected sequence index at position ${i}.` };
      }

      // Verify previous hash matching
      if (i > 0) {
        const prevLog = this.auditLogs[i - 1];
        if (log.previousHash !== prevLog.hash) {
          return { verified: false, message: `Integrity broken: previous hash mismatch at item index ${i}.` };
        }
      } else {
        if (log.previousHash !== '00000000000000000000000000000000') {
          return { verified: false, message: 'Integrity broken: genesis block previous hash is corrupted.' };
        }
      }

      // Verify current hash computation
      const payload = `${log.index}|${log.timestamp}|${log.eventType}|${log.actor}|${log.conflictId || ''}|${log.nodeId || ''}|${log.details}|${log.previousHash}`;
      const calculatedHash = this.computeSimpleHash(payload);
      if (log.hash !== calculatedHash) {
        return { verified: false, message: `Integrity broken: hash mismatch at index ${i}. Record has been tampered with.` };
      }
    }

    return { verified: true, message: `All ${this.auditLogs.length} audit trail blocks successfully verified. Hash-chain is valid.` };
  }

  /**
   * Saves a detected conflict
   */
  public saveConflict(conflict: KnowledgeConflict): void {
    this.conflicts.set(conflict.id, conflict);
    this.saveToStorage();
  }

  /**
   * Save multiple detected conflicts (bulk updates)
   */
  public saveConflicts(list: KnowledgeConflict[]): void {
    for (const c of list) {
      if (!this.conflicts.has(c.id)) {
        this.conflicts.set(c.id, c);
        this.log('CONFLICT_DETECTED', 'System', `Detected conflict of type '${c.type}' on node '${c.targetNodeId}'`, c.id, c.targetNodeId);
      }
    }
    this.saveToStorage();
  }

  /**
   * Gets a specific conflict by ID
   */
  public getConflict(conflictId: string): KnowledgeConflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Returns list of conflicts
   */
  public getConflicts(): KnowledgeConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Save a merge decision and update the status of the associated conflict
   */
  public saveDecision(decision: MergeDecision, actor: string, notes?: string): void {
    this.decisions.push(decision);
    const conflict = this.conflicts.get(decision.conflictId);
    if (conflict) {
      conflict.status = decision.strategy === 'IGNORE' ? ConflictStatus.IGNORED : ConflictStatus.RESOLVED;
      conflict.resolvedAt = Date.now();
      conflict.resolvedBy = actor;
      conflict.resolutionStrategy = decision.strategy;
      conflict.resolutionNotes = notes || `Resolved via ${decision.strategy}`;
      this.conflicts.set(conflict.id, conflict);
    }
    this.log(
      'CONFLICT_RESOLVED',
      actor,
      `Resolved conflict '${decision.conflictId}' using strategy '${decision.strategy}'. Notes: ${notes || 'none'}`,
      decision.conflictId,
      decision.chosenNodeState?.id || conflict?.targetNodeId
    );
    this.saveToStorage();
  }

  /**
   * Returns all merge decisions
   */
  public getDecisions(): MergeDecision[] {
    return this.decisions;
  }

  /**
   * Returns all audit logs
   */
  public getAuditLogs(): ConflictAuditEntry[] {
    return this.auditLogs;
  }

  /**
   * Resets local storage
   */
  public clear(): void {
    this.conflicts.clear();
    this.decisions = [];
    this.auditLogs = [];
    this.saveToStorage();
  }

  private computeSimpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36) + '-' + input.length;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('nexus_conflict_list', JSON.stringify(Array.from(this.conflicts.entries())));
      localStorage.setItem('nexus_conflict_decisions', JSON.stringify(this.decisions));
      localStorage.setItem('nexus_conflict_audit_logs', JSON.stringify(this.auditLogs));
    } catch (e) {
      console.warn('Failed to save conflict history data to LocalStorage', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const storedConflicts = localStorage.getItem('nexus_conflict_list');
      const storedDecisions = localStorage.getItem('nexus_conflict_decisions');
      const storedLogs = localStorage.getItem('nexus_conflict_audit_logs');

      if (storedConflicts) {
        this.conflicts = new Map(JSON.parse(storedConflicts));
      }
      if (storedDecisions) {
        this.decisions = JSON.parse(storedDecisions);
      }
      if (storedLogs) {
        this.auditLogs = JSON.parse(storedLogs);
      }
    } catch (e) {
      console.warn('Failed to load conflict history data from LocalStorage', e);
    }
  }
}
