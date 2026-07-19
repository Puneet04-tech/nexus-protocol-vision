import { CapabilityRegistry } from '../registry/CapabilityRegistry';
import { AgentInstaller } from '../installer/AgentInstaller';
import { mockAgentRepository } from '../repository/AgentRepository';
import { AgentValidator } from '../validators/AgentValidator';

export class AgentUpdater {
  private registry: CapabilityRegistry;
  private installer: AgentInstaller;
  private autoUpdate = false;
  private readonly autoUpdateKey = 'nexus_marketplace_auto_updates_enabled';

  constructor(registry: CapabilityRegistry, installer: AgentInstaller) {
    this.registry = registry;
    this.installer = installer;
    this.loadAutoUpdateConfig();
  }

  private loadAutoUpdateConfig(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    this.autoUpdate = localStorage.getItem(this.autoUpdateKey) === 'true';
  }

  public toggleAutomaticUpdates(enabled: boolean): void {
    this.autoUpdate = enabled;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.autoUpdateKey, enabled ? 'true' : 'false');
    }
  }

  public isAutoUpdateEnabled(): boolean {
    return this.autoUpdate;
  }

  /**
   * Scans local installed agents and compares versions with the marketplace.
   */
  public async checkForUpdates(): Promise<Record<string, { currentVersion: string; latestVersion: string; releaseNotes: string }>> {
    const updates: Record<string, { currentVersion: string; latestVersion: string; releaseNotes: string }> = {};
    const installed = this.registry.list();

    for (const local of installed) {
      const remote = mockAgentRepository.get(local.agentId);
      if (remote) {
        if (AgentValidator.compare(remote.version, local.version) > 0) {
          const latestVersionDetails = remote.versionsHistory.find(v => v.version === remote.version);
          updates[local.agentId] = {
            currentVersion: local.version,
            latestVersion: remote.version,
            releaseNotes: latestVersionDetails?.releaseNotes || 'No release notes.'
          };

          this.registry.updateStatus(local.agentId, { updateStatus: 'update-available' });
        } else {
          this.registry.updateStatus(local.agentId, { updateStatus: 'up-to-date' });
        }
      }
    }

    return updates;
  }

  /**
   * Runs an update for a single agent.
   */
  public async updateAgent(agentId: string): Promise<void> {
    const remote = mockAgentRepository.get(agentId);
    if (!remote) throw new Error(`Agent '${agentId}' not found in remote repository.`);
    
    const local = this.registry.get(agentId);
    if (!local) throw new Error(`Agent '${agentId}' is not installed.`);

    if (AgentValidator.compare(remote.version, local.version) <= 0) {
      return;
    }

    await this.installer.enqueue(agentId, remote.version, 'version-switch');
    this.registry.updateStatus(agentId, { updateStatus: 'up-to-date' });
  }

  /**
   * Scans and auto-updates all eligible agents if automatic updates are enabled.
   */
  public async triggerAutomaticUpdates(): Promise<void> {
    if (!this.autoUpdate) return;
    const updates = await this.checkForUpdates();
    for (const agentId of Object.keys(updates)) {
      try {
        await this.updateAgent(agentId);
      } catch (err) {
        console.error(`Automatic update failed for agent ${agentId}:`, err);
      }
    }
  }
}
