import { PluginPermission } from './PluginTypes';

export class PluginPermissionsVerifier {
  private allowedPermissions: Set<PluginPermission>;
  private pluginId: string;

  constructor(pluginId: string, permissions: PluginPermission[]) {
    this.pluginId = pluginId;
    this.allowedPermissions = new Set(permissions);
  }

  /**
   * Returns true if the plugin has been granted the specified permission scope.
   */
  public has(permission: PluginPermission): boolean {
    return this.allowedPermissions.has(permission);
  }

  /**
   * Asserts that a permission is granted. Throws an error if not.
   */
  public assert(permission: PluginPermission, actionDescription?: string): void {
    if (!this.has(permission)) {
      const detail = actionDescription ? ` to ${actionDescription}` : '';
      throw new Error(`Security Violation: Plugin '${this.pluginId}' does not have the required permission '${permission}'${detail}.`);
    }
  }

  /**
   * Lists all permissions currently granted.
   */
  public list(): PluginPermission[] {
    return Array.from(this.allowedPermissions);
  }
}
