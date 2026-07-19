import { Checkpoint, CheckpointType } from '../types';
import { IncidentRepository } from '../repository/IncidentRepository';
import { IncidentValidator } from '../validators/IncidentValidator';

export class CheckpointManager {
  private static instance: CheckpointManager | null = null;
  private repo = IncidentRepository.getInstance();

  private constructor() {}

  public static getInstance(): CheckpointManager {
    if (!this.instance) {
      this.instance = new CheckpointManager();
    }
    return this.instance;
  }

  /**
   * Helper to generate a checksum of the checkpoint fields
   */
  public generateSignature(componentId: string, state: string, ctx: Record<string, any>): string {
    const serializedCtx = JSON.stringify(ctx);
    const content = `${componentId}:${state}:${serializedCtx}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `sha256_cp_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Creates a checkpoint
   */
  public createCheckpoint(
    type: CheckpointType,
    componentId: string,
    workflowState: string,
    contextSnapshot: Record<string, any>
  ): Checkpoint {
    const id = `cp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const signature = this.generateSignature(componentId, workflowState, contextSnapshot);

    const checkpoint: Checkpoint = {
      id,
      timestamp: Date.now(),
      type,
      componentId,
      workflowState,
      contextSnapshot,
      signature
    };

    IncidentValidator.validateCheckpoint(checkpoint);
    this.repo.saveCheckpoint(checkpoint);

    // Save SRE audit log
    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: 'SYSTEM',
      action: 'CREATE_CHECKPOINT',
      details: `Checkpoint ${id} created for ${componentId} (${type})`,
      success: true
    });

    return checkpoint;
  }

  /**
   * Validates a checkpoint's signature
   */
  public validateCheckpointIntegrity(checkpoint: Checkpoint): boolean {
    try {
      const recalculated = this.generateSignature(
        checkpoint.componentId,
        checkpoint.workflowState,
        checkpoint.contextSnapshot
      );
      return checkpoint.signature === recalculated;
    } catch (e) {
      return false;
    }
  }

  /**
   * Restores a checkpoint, validating integrity first
   */
  public restoreCheckpoint(id: string): Checkpoint {
    const list = this.repo.getCheckpoints();
    const checkpoint = list.find(c => c.id === id);

    if (!checkpoint) {
      throw new Error(`Checkpoint ${id} not found.`);
    }

    const isValid = this.validateCheckpointIntegrity(checkpoint);
    if (!isValid) {
      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: 'SYSTEM',
        action: 'RESTORE_CHECKPOINT_FAILED',
        details: `Integrity signature mismatch on restoring checkpoint ${id}`,
        success: false
      });
      throw new Error(`Integrity verification failed for checkpoint ${id}. Data has been modified or corrupted.`);
    }

    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: 'SYSTEM',
      action: 'RESTORE_CHECKPOINT',
      details: `Checkpoint ${id} restored successfully. Returning state to ${checkpoint.componentId}`,
      success: true
    });

    return checkpoint;
  }

  /**
   * Cleanup checkpoints older than maxAgeHrs
   */
  public cleanupOldCheckpoints(maxAgeHrs: number): void {
    const limit = Date.now() - maxAgeHrs * 60 * 60 * 1000;
    const list = this.repo.getCheckpoints();
    const beforeCount = list.length;
    const active = list.filter(c => c.timestamp >= limit);
    
    if (active.length < beforeCount) {
      localStorage.setItem('nexus_checkpoints', JSON.stringify(active));
      
      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: 'SYSTEM',
        action: 'CLEANUP_CHECKPOINTS',
        details: `Pruned ${beforeCount - active.length} expired checkpoints older than ${maxAgeHrs} hours`,
        success: true
      });
    }
  }
}
