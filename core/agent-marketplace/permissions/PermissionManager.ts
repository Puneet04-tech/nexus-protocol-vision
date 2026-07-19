import { PluginPermission } from '../../plugin-sdk/PluginTypes';

export class PermissionManager {
  private approvedConsent: Map<string, PluginPermission[]> = new Map();
  private readonly storageKey = 'nexus_marketplace_permission_consent';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [id, perms] of Object.entries(parsed)) {
            if (Array.isArray(perms)) {
              this.approvedConsent.set(id, perms as PluginPermission[]);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load permission consent from storage:', e);
    }
  }

  public saveToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const obj: Record<string, PluginPermission[]> = {};
      for (const [id, perms] of this.approvedConsent.entries()) {
        obj[id] = perms;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save permission consent to storage:', e);
    }
  }

  /**
   * Grant permissions for an agent.
   */
  public grantPermissions(agentId: string, permissions: PluginPermission[]): void {
    this.approvedConsent.set(agentId, [...permissions]);
    this.saveToStorage();
  }

  /**
   * Revoke all approved permissions for an agent.
   */
  public revokePermissions(agentId: string): void {
    this.approvedConsent.delete(agentId);
    this.saveToStorage();
  }

  /**
   * Get approved permissions for an agent.
   */
  public getApprovedPermissions(agentId: string): PluginPermission[] {
    return this.approvedConsent.get(agentId) || [];
  }

  /**
   * Check if user has approved the specified set of permissions for the agent.
   */
  public hasApproved(agentId: string, required: PluginPermission[]): boolean {
    const approved = this.getApprovedPermissions(agentId);
    return required.every(perm => approved.includes(perm));
  }

  /**
   * Wipe all consent history.
   */
  public clearConsentData(): void {
    this.approvedConsent.clear();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}
