import { PluginManager } from '../../plugin-sdk/PluginManager';
import { PluginManifest } from '../../plugin-sdk/PluginTypes';
import { CapabilityRegistry } from '../registry/CapabilityRegistry';
import { SecurityVerifier } from '../verification/SecurityVerifier';
import { PermissionManager } from '../permissions/PermissionManager';
import { AgentValidator } from '../validators/AgentValidator';
import { mockAgentRepository } from '../repository/AgentRepository';
import { 
  CapabilityRegistryEntry, 
  InstallerQueueItem, 
  InstallerHistoryEntry, 
  MarketplaceAgent 
} from '../types';

export class AgentInstaller {
  private queue: InstallerQueueItem[] = [];
  private history: InstallerHistoryEntry[] = [];
  private isProcessing = false;
  private registry: CapabilityRegistry;
  private permissionManager: PermissionManager;
  
  private progressListeners: Set<(item: InstallerQueueItem) => void> = new Set();
  private queueListeners: Set<(queue: InstallerQueueItem[]) => void> = new Set();
  
  private readonly storageKeyHistory = 'nexus_marketplace_installer_history';

  constructor(registry: CapabilityRegistry, permissionManager: PermissionManager) {
    this.registry = registry;
    this.permissionManager = permissionManager;
    this.loadHistoryFromStorage();
  }

  private loadHistoryFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const data = localStorage.getItem(this.storageKeyHistory);
      if (data) {
        this.history = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load installer history from storage:', e);
    }
  }

  private saveHistoryToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(this.storageKeyHistory, JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save installer history to storage:', e);
    }
  }

  public getQueue(): InstallerQueueItem[] {
    return [...this.queue];
  }

  public getHistory(): InstallerHistoryEntry[] {
    return [...this.history];
  }

  public onProgress(callback: (item: InstallerQueueItem) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  public onQueueChange(callback: (queue: InstallerQueueItem[]) => void): () => void {
    this.queueListeners.add(callback);
    return () => this.queueListeners.delete(callback);
  }

  private notifyProgress(item: InstallerQueueItem): void {
    this.progressListeners.forEach(cb => cb(item));
  }

  private notifyQueueChange(): void {
    this.queueListeners.forEach(cb => cb([...this.queue]));
  }

  private recordHistory(
    agentId: string,
    version: string,
    action: InstallerHistoryEntry['action'],
    status: 'success' | 'failure',
    error?: string
  ): void {
    const entry: InstallerHistoryEntry = {
      timestamp: Date.now(),
      agentId,
      version,
      action,
      status,
      error
    };
    this.history.unshift(entry);
    if (this.history.length > 100) {
      this.history.pop();
    }
    this.saveHistoryToStorage();
  }

  /**
   * Enqueues an installation operation.
   */
  public enqueue(
    agentId: string,
    version: string,
    type: InstallerQueueItem['type']
  ): Promise<void> {
    const queueItem: InstallerQueueItem = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      agentId,
      version,
      type,
      status: 'pending',
      progress: 0
    };

    this.queue.push(queueItem);
    this.notifyQueueChange();

    // Trigger queue processing asynchronously
    this.processQueue();

    return new Promise((resolve, reject) => {
      const unsub = this.onProgress((item) => {
        if (item.id === queueItem.id) {
          if (item.status === 'completed') {
            unsub();
            resolve();
          } else if (item.status === 'failed') {
            unsub();
            reject(new Error(item.error || 'Operation failed'));
          }
        }
      });
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      item.status = 'running';
      this.notifyQueueChange();

      try {
        await this.executeTransaction(item);
        item.status = 'completed';
        item.progress = 100;
        this.notifyProgress(item);
        this.recordHistory(item.agentId, item.version, item.type, 'success');
      } catch (err: any) {
        item.status = 'failed';
        item.error = err.message || String(err);
        this.notifyProgress(item);
        this.recordHistory(item.agentId, item.version, item.type, 'failure', item.error);
      }

      this.queue.shift();
      this.notifyQueueChange();
    }

    this.isProcessing = false;
  }

  private async executeTransaction(item: InstallerQueueItem): Promise<void> {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    const setProgress = async (progress: number, message?: string) => {
      item.progress = progress;
      this.notifyProgress(item);
      await delay(200); // realistic animation pacing
    };

    const agent = mockAgentRepository.get(item.agentId);
    if (!agent) {
      throw new Error(`Agent '${item.agentId}' not found in marketplace.`);
    }

    const versionDetails = agent.versionsHistory.find(v => v.version === item.version);
    if (!versionDetails) {
      throw new Error(`Agent version '${item.version}' does not exist.`);
    }

    switch (item.type) {
      case 'install':
      case 'version-switch': {
        await setProgress(10);
        // 1. Dependency Resolution
        const installedAgentIds = this.registry.list().map(e => e.agentId);
        await setProgress(30);

        // 2. Permission Check
        if (agent.permissions.length > 0 && !this.permissionManager.hasApproved(agent.id, agent.permissions)) {
          throw new Error(`Security Exception: Permissions not authorized by user. Required: ${agent.permissions.join(', ')}`);
        }

        // 3. Security Verification
        const verification = SecurityVerifier.verify(agent, item.version, installedAgentIds);
        if (verification.errors.length > 0) {
          throw new Error(`Security Verification failed: ${verification.errors.join('; ')}`);
        }
        await setProgress(60);

        // 4. Clean existing runtime instance if present (for upgrades/switches)
        try {
          const pm = PluginManager.getInstance();
          if (pm.getPlugin(agent.id)) {
            await pm.unregisterPlugin(agent.id);
          }
        } catch (e) {
          // Ignore unregister errors if not active
        }
        await setProgress(80);

        // 5. Register with Plugin SDK sandbox
        const pm = PluginManager.getInstance();
        const manifest: PluginManifest = {
          id: agent.id,
          name: agent.name,
          version: item.version,
          author: agent.publisher.name,
          description: agent.description,
          entry: versionDetails.entry,
          permissions: agent.permissions,
          supportedProtocolVersion: '1.0.0',
          dependencies: agent.dependencies
        };
        pm.registerPlugin(manifest);
        await setProgress(90);

        // 6. Save in Registry
        const entry: CapabilityRegistryEntry = {
          agentId: agent.id,
          capabilities: agent.capabilities,
          supportedTasks: agent.supportedTasks,
          inputs: agent.supportedTasks.flatMap(t => t.inputs),
          outputs: agent.supportedTasks.flatMap(t => t.outputs),
          version: item.version,
          compatibility: agent.compatibility,
          permissions: agent.permissions,
          executionMode: agent.executionMode,
          dependencies: agent.dependencies,
          healthStatus: 'healthy',
          publisher: agent.publisher.name,
          digitalSignature: versionDetails.digitalSignature,
          installStatus: 'installed',
          updateStatus: 'up-to-date'
        };
        this.registry.register(entry);
        break;
      }

      case 'uninstall': {
        await setProgress(25);
        // 1. Disable and remove from core runtime
        try {
          const pm = PluginManager.getInstance();
          if (pm.getPlugin(agent.id)) {
            await pm.unregisterPlugin(agent.id);
          }
        } catch (e) {
          // Ignore
        }
        await setProgress(75);

        // 2. Remove from Registry and permissions
        this.registry.unregister(agent.id);
        this.permissionManager.revokePermissions(agent.id);
        break;
      }

      case 'repair': {
        await setProgress(20);
        // Recalculate checksums and reinstall if corrupt
        const checksumValid = SecurityVerifier.validateChecksum(versionDetails.entry, versionDetails.checksum);
        if (!checksumValid) {
          throw new Error('Integrity Audit failure: Checksum validation failed during repair.');
        }
        await setProgress(50);
        
        // Reinstall
        try {
          const pm = PluginManager.getInstance();
          if (pm.getPlugin(agent.id)) {
            await pm.unregisterPlugin(agent.id);
          }
        } catch (e) {}

        const pm = PluginManager.getInstance();
        const manifest: PluginManifest = {
          id: agent.id,
          name: agent.name,
          version: item.version,
          author: agent.publisher.name,
          description: agent.description,
          entry: versionDetails.entry,
          permissions: agent.permissions,
          supportedProtocolVersion: '1.0.0',
          dependencies: agent.dependencies
        };
        pm.registerPlugin(manifest);
        await setProgress(80);

        this.registry.updateStatus(agent.id, { healthStatus: 'healthy' });
        break;
      }

      case 'rollback': {
        await setProgress(20);
        // Find previous version in history for this agent
        const pastVersions = this.history
          .filter(h => h.agentId === agent.id && h.status === 'success' && (h.action === 'install' || h.action === 'version-switch'))
          .map(h => h.version);
        
        const currentVersion = this.registry.get(agent.id)?.version;
        const previousVersion = pastVersions.find(v => v !== currentVersion);
        
        if (!previousVersion) {
          throw new Error(`Rollback failed: No historical version found for '${agent.id}'.`);
        }
        await setProgress(40);

        // Re-execute installer with the previous version
        item.version = previousVersion; // update progress version
        item.type = 'version-switch';
        await this.executeTransaction(item);
        break;
      }
    }
  }

  public async enable(agentId: string): Promise<void> {
    const entry = this.registry.get(agentId);
    if (!entry) throw new Error(`Agent '${agentId}' is not installed.`);
    
    // Enable in core PluginManager
    const pm = PluginManager.getInstance();
    await pm.enablePlugin(agentId);
  }

  public async disable(agentId: string): Promise<void> {
    const entry = this.registry.get(agentId);
    if (!entry) throw new Error(`Agent '${agentId}' is not installed.`);
    
    // Disable in core PluginManager
    const pm = PluginManager.getInstance();
    await pm.disablePlugin(agentId);
  }
}
