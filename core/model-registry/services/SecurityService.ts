import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { AuditLog } from '../types';

export type UserRole = 'Architect' | 'Operator' | 'Auditor';

export class SecurityService {
  private static instance: SecurityService | null = null;
  private repository = ModelRegistryRepository.getInstance();

  // Rate limiting map for simulation: tracks request count per modelId
  private requestBuckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private readonly MAX_TOKENS = 100;
  private readonly REFILL_RATE_MS = 1000; // Refill 10 tokens per second

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!this.instance) {
      this.instance = new SecurityService();
    }
    return this.instance;
  }

  /**
   * Evaluates if a role has permissions for a given registry action.
   */
  public isAuthorized(role: UserRole, action: string): boolean {
    switch (action) {
      case 'REGISTER_MODEL':
      case 'PUBLISH_VERSION':
      case 'DELETE_MODEL':
      case 'DELETE_VERSION':
      case 'LIFECYCLE_TRANSITION':
        return role === 'Architect';

      case 'DEPLOY_MODEL':
      case 'DEPLOYMENT_TRAFFIC_SHIFT':
      case 'DEPLOYMENT_ROLLBACK':
      case 'TRIGGER_VALIDATION':
        return role === 'Architect' || role === 'Operator';

      case 'READ_AUDIT_LOGS':
      case 'READ_ANALYTICS':
      case 'SEARCH_REGISTRY':
        return true; // All roles can read/search

      default:
        return false;
    }
  }

  /**
   * Checks authorization and writes an audit log entry.
   * Throws an Error if authorization fails.
   */
  public authorizeAndLog(
    userId: string,
    role: UserRole,
    action: string,
    details: string,
    modelId?: string,
    version?: string
  ): void {
    if (!this.isAuthorized(role, action)) {
      const errorMsg = `Authorization failed: User with role "${role}" is not permitted to perform "${action}".`;
      
      // Log the unauthorized attempt
      const failedAuditLog: AuditLog = {
        id: `audit_failed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        action: `UNAUTHORIZED_${action}`,
        userId,
        userRole: role,
        modelId,
        version,
        details: `Access Denied: Attempted details: ${details}`,
        timestamp: Date.now()
      };
      this.repository.saveAuditLog(failedAuditLog);
      
      throw new Error(errorMsg);
    }

    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      userId,
      userRole: role,
      modelId,
      version,
      details,
      timestamp: Date.now()
    };

    this.repository.saveAuditLog(auditLog);
  }

  /**
   * Simulates Token Bucket Rate Limiting for models.
   * Each model starts with 100 requests capacity, refills at 10 requests per second.
   */
  public checkRateLimit(modelId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    let bucket = this.requestBuckets.get(modelId);

    if (!bucket) {
      bucket = { tokens: this.MAX_TOKENS, lastRefill: now };
      this.requestBuckets.set(modelId, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    if (elapsed > this.REFILL_RATE_MS) {
      const refillAmount = Math.floor(elapsed / this.REFILL_RATE_MS) * 10;
      bucket.tokens = Math.min(this.MAX_TOKENS, bucket.tokens + refillAmount);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      this.requestBuckets.set(modelId, bucket);
      return { allowed: true, remaining: bucket.tokens };
    }

    return { allowed: false, remaining: 0 };
  }
}
