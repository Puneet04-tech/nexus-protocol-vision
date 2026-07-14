import { GovernancePolicy, PolicyStatus, ApprovalState } from './models/GovernancePolicy';
import { PolicyVersion } from './models/PolicyVersion';
import { AuditLogger } from './AuditLogger';
import { SafeJson } from './utils/SafeJson';
import { ValidationError, UnauthorizedError, NotFoundError } from './utils/Errors';

export class PolicyManager {
  private static STORAGE_KEY = 'nexus_governance_policies';
  private static VERSIONS_KEY = 'nexus_governance_policy_versions';

  /**
   * Enforces Role-Based Access Control (RBAC)
   */
  private checkPermission(role: string, action: 'read' | 'write' | 'approve'): void {
    const r = role.toLowerCase();
    
    if (action === 'read') {
      const allowedRoles = ['admin', 'security officer', 'auditor', 'developer', 'read only'];
      if (!allowedRoles.includes(r)) {
        throw new UnauthorizedError(`Role '${role}' does not have read permissions for Governance.`);
      }
      return;
    }

    if (action === 'write' || action === 'approve') {
      const allowedRoles = ['admin', 'security officer'];
      if (!allowedRoles.includes(r)) {
        throw new UnauthorizedError(`Role '${role}' is unauthorized to perform modifications or approvals.`);
      }
    }
  }

  /**
   * Fetch all policies
   */
  public getPolicies(role: string = 'Read Only'): GovernancePolicy[] {
    this.checkPermission(role, 'read');
    
    try {
      const data = localStorage.getItem(PolicyManager.STORAGE_KEY);
      if (!data) return [];
      const parsed = SafeJson.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Get individual policy by ID
   */
  public getPolicyById(id: string, role: string = 'Read Only'): GovernancePolicy | undefined {
    this.checkPermission(role, 'read');
    return this.getPolicies(role).find((p) => p.id === id);
  }

  /**
   * Create a new policy
   */
  public createPolicy(
    policyData: Omit<GovernancePolicy, 'createdAt' | 'updatedAt' | 'version' | 'rollbackMetadata'>,
    role: string
  ): GovernancePolicy {
    this.checkPermission(role, 'write');
    this.validatePolicyStructure(policyData);

    const policies = this.getPolicies(role);
    if (policies.some((p) => p.id === policyData.id)) {
      throw new ValidationError(`Policy with ID '${policyData.id}' already exists.`);
    }

    const now = Date.now();
    const newPolicy: GovernancePolicy = {
      ...policyData,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
    };

    policies.push(newPolicy);
    this.savePolicies(policies);

    // Save initial version snapshot
    this.saveVersionSnapshot(newPolicy, role, 'Initial creation');

    AuditLogger.log('POLICY_CREATED', role, newPolicy.id, {
      name: newPolicy.name,
      status: newPolicy.status,
      approvalState: newPolicy.approvalState,
    });

    return newPolicy;
  }

  /**
   * Update an existing policy and record a version history snapshot
   */
  public updatePolicy(
    id: string,
    updatedData: Partial<Omit<GovernancePolicy, 'id' | 'createdAt' | 'updatedAt' | 'version'>>,
    role: string,
    changeSummary?: string
  ): GovernancePolicy {
    this.checkPermission(role, 'write');

    const policies = this.getPolicies(role);
    const index = policies.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Policy with ID '${id}' not found.`);
    }

    const current = policies[index];
    
    // Save history snapshot of current policy state before making the edits
    this.saveVersionSnapshot(current, role, changeSummary || 'System automatic update');

    // Generate new version identifier (e.g., bump patch version 1.0.0 -> 1.0.1)
    const newVersion = this.incrementVersion(current.version);

    // Merge changes securely
    const merged = SafeJson.secureMerge(current, updatedData) as GovernancePolicy;
    merged.version = newVersion;
    merged.updatedAt = Date.now();
    merged.updatedBy = role;

    // Reset rollbackMetadata if we are updating from a rolled-back state
    delete merged.rollbackMetadata;

    this.validatePolicyStructure(merged);
    policies[index] = merged;
    this.savePolicies(policies);

    AuditLogger.log('POLICY_UPDATED', role, id, {
      previousVersion: current.version,
      newVersion,
      changeSummary,
    });

    return merged;
  }

  /**
   * Delete a policy and its version history
   */
  public deletePolicy(id: string, role: string): void {
    this.checkPermission(role, 'write');

    const policies = this.getPolicies(role);
    const index = policies.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Policy with ID '${id}' not found.`);
    }

    const policy = policies[index];
    policies.splice(index, 1);
    this.savePolicies(policies);

    // Clean up version history
    this.deleteVersionHistory(id);

    AuditLogger.log('POLICY_DELETED', role, id, {
      name: policy.name,
      deletedVersion: policy.version,
    });
  }

  /**
   * Transitions policy approval status (draft -> pending_approval -> approved/rejected)
   */
  public transitionApprovalState(id: string, state: ApprovalState, role: string): GovernancePolicy {
    this.checkPermission(role, 'approve');

    const policies = this.getPolicies(role);
    const index = policies.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Policy with ID '${id}' not found.`);
    }

    const current = policies[index];
    if (current.approvalState === state) {
      return current;
    }

    // Save version history before transition
    this.saveVersionSnapshot(current, role, `Approval transition to ${state}`);

    const newVersion = this.incrementVersion(current.version);
    current.approvalState = state;
    current.version = newVersion;
    current.updatedAt = Date.now();
    current.updatedBy = role;

    // If rejected, deactivate immediately
    if (state === 'rejected' || state === 'draft') {
      current.status = 'inactive';
    }

    policies[index] = current;
    this.savePolicies(policies);

    AuditLogger.log('POLICY_UPDATED', role, id, {
      action: 'APPROVAL_TRANSITION',
      newState: state,
      newVersion,
    });

    return current;
  }

  /**
   * Toggles status: active or inactive. Checks that active status requires approved state.
   */
  public setStatus(id: string, status: PolicyStatus, role: string): GovernancePolicy {
    this.checkPermission(role, 'write');

    const policies = this.getPolicies(role);
    const index = policies.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Policy with ID '${id}' not found.`);
    }

    const current = policies[index];
    if (current.status === status) {
      return current;
    }

    if (status === 'active' && current.approvalState !== 'approved') {
      throw new ValidationError(`Cannot activate policy '${current.name}' without explicit approval. Current state is '${current.approvalState}'.`);
    }

    // Save history snapshot
    this.saveVersionSnapshot(current, role, `Status toggled to ${status}`);

    const newVersion = this.incrementVersion(current.version);
    current.status = status;
    current.version = newVersion;
    current.updatedAt = Date.now();
    current.updatedBy = role;

    policies[index] = current;
    this.savePolicies(policies);

    const eventType = status === 'active' ? 'POLICY_ACTIVATED' : 'POLICY_DISABLED';
    AuditLogger.log(eventType, role, id, {
      version: newVersion,
    });

    return current;
  }

  /**
   * Restores a policy to a previous version snapshot
   */
  public rollbackPolicy(id: string, targetVersion: string, role: string): GovernancePolicy {
    this.checkPermission(role, 'write');

    const versions = this.getVersions(id);
    const targetSnapshot = versions.find((v) => v.version === targetVersion);
    if (!targetSnapshot) {
      throw new NotFoundError(`Version snapshot '${targetVersion}' for policy '${id}' not found.`);
    }

    const policies = this.getPolicies(role);
    const index = policies.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundError(`Active policy record with ID '${id}' not found to perform rollback on.`);
    }

    const current = policies[index];

    // Safely parse target policy data
    const restoredPolicy = SafeJson.parse(targetSnapshot.policyData) as GovernancePolicy;

    // Check approval and state validation
    this.validatePolicyStructure(restoredPolicy);

    // Save snapshot of current state before rollback
    this.saveVersionSnapshot(current, role, `Pre-rollback snapshot (targeting v${targetVersion})`);

    // Bump version and set rollback metadata
    const nextVersion = this.incrementVersion(current.version);
    
    restoredPolicy.version = nextVersion;
    restoredPolicy.updatedAt = Date.now();
    restoredPolicy.updatedBy = role;
    restoredPolicy.rollbackMetadata = {
      rolledBackFromVersion: current.version,
      rolledBackAt: Date.now(),
      rolledBackBy: role,
      comment: `Rolled back to v${targetVersion} details.`,
    };

    policies[index] = restoredPolicy;
    this.savePolicies(policies);

    AuditLogger.log('ROLLBACK_EXECUTED', role, id, {
      fromVersion: current.version,
      toVersion: targetVersion,
      newVersion: nextVersion,
    });

    return restoredPolicy;
  }

  /**
   * Retrieve all snapshot versions for a specific policy
   */
  public getVersions(policyId: string): PolicyVersion[] {
    try {
      const data = localStorage.getItem(PolicyManager.VERSIONS_KEY);
      if (!data) return [];
      const parsed = SafeJson.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((v: PolicyVersion) => v.policyId === policyId);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Seed default policies in storage if empty
   */
  public seedDefaultPolicies(defaultPolicies: GovernancePolicy[], role: string = 'Admin'): void {
    const existing = this.getPolicies(role);
    if (existing.length === 0) {
      this.savePolicies(defaultPolicies);
      defaultPolicies.forEach((p) => {
        this.saveVersionSnapshot(p, role, 'Seeded default policy');
        AuditLogger.log('POLICY_CREATED', role, p.id, {
          name: p.name,
          status: p.status,
          approvalState: p.approvalState,
          note: 'System database seeded default values',
        });
      });
    }
  }

  /**
   * Helper to write policies array to storage
   */
  private savePolicies(policies: GovernancePolicy[]): void {
    localStorage.setItem(PolicyManager.STORAGE_KEY, JSON.stringify(policies));
  }

  /**
   * Save a policy revision snapshot to the versions collection
   */
  private saveVersionSnapshot(policy: GovernancePolicy, actor: string, changeSummary: string): void {
    try {
      const rawVersions = localStorage.getItem(PolicyManager.VERSIONS_KEY);
      const list: PolicyVersion[] = rawVersions ? SafeJson.parse(rawVersions) || [] : [];
      
      const snapshot: PolicyVersion = {
        policyId: policy.id,
        version: policy.version,
        policyData: JSON.stringify(policy),
        timestamp: Date.now(),
        updatedBy: actor,
        changeSummary,
      };

      list.push(snapshot);
      localStorage.setItem(PolicyManager.VERSIONS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save version snapshot:', e);
    }
  }

  /**
   * Clean versions when a policy is deleted
   */
  private deleteVersionHistory(policyId: string): void {
    try {
      const rawVersions = localStorage.getItem(PolicyManager.VERSIONS_KEY);
      if (rawVersions) {
        const list: PolicyVersion[] = SafeJson.parse(rawVersions) || [];
        const filtered = list.filter((v) => v.policyId !== policyId);
        localStorage.setItem(PolicyManager.VERSIONS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to delete version history:', e);
    }
  }

  /**
   * Bumps version string major.minor.patch (e.g. 1.0.2 -> 1.0.3)
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length === 3) {
      const patch = parseInt(parts[2], 10);
      if (!isNaN(patch)) {
        return `${parts[0]}.${parts[1]}.${patch + 1}`;
      }
    }
    return `${version}.1`; // Fallback
  }

  /**
   * Validates policy structure dynamically at runtime
   */
  private validatePolicyStructure(policy: any): void {
    if (!policy.id || typeof policy.id !== 'string') {
      throw new ValidationError('Policy ID must be a non-empty string.');
    }
    if (!policy.name || typeof policy.name !== 'string') {
      throw new ValidationError('Policy name must be a non-empty string.');
    }
    if (!['active', 'inactive'].includes(policy.status)) {
      throw new ValidationError(`Invalid policy status: '${policy.status}'.`);
    }
    if (!['draft', 'pending_approval', 'approved', 'rejected'].includes(policy.approvalState)) {
      throw new ValidationError(`Invalid policy approval state: '${policy.approvalState}'.`);
    }
    if (!Array.isArray(policy.rules)) {
      throw new ValidationError('Policy must contain a list of rules.');
    }
    
    // Validate rules
    for (const rule of policy.rules) {
      if (!rule.id || typeof rule.id !== 'string') {
        throw new ValidationError('Rule ID must be a non-empty string.');
      }
      if (!rule.name || typeof rule.name !== 'string') {
        throw new ValidationError('Rule name must be a non-empty string.');
      }
      if (!['ALLOW', 'DENY', 'WARN', 'AUDIT', 'REQUIRE_APPROVAL', 'CUSTOM_ACTION'].includes(rule.action)) {
        throw new ValidationError(`Invalid rule action: '${rule.action}'.`);
      }
      if (!rule.scope || typeof rule.scope !== 'string') {
        throw new ValidationError('Rule scope must be a non-empty string.');
      }
      if (!rule.condition || typeof rule.condition.operator !== 'string') {
        throw new ValidationError(`Rule '${rule.name}' condition must contain a valid operator.`);
      }
    }
  }
}
