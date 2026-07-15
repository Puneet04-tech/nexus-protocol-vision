import { CapabilityRegistryEntry } from '../types';

export class CapabilityRegistry {
  private entries: Map<string, CapabilityRegistryEntry> = new Map();
  private readonly storageKey = 'nexus_marketplace_capability_registry';

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
        if (Array.isArray(parsed)) {
          parsed.forEach((entry: CapabilityRegistryEntry) => {
            this.entries.set(entry.agentId, entry);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load capability registry from storage:', e);
    }
  }

  public saveToStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const arr = Array.from(this.entries.values());
      localStorage.setItem(this.storageKey, JSON.stringify(arr));
    } catch (e) {
      console.error('Failed to save capability registry to storage:', e);
    }
  }

  /**
   * Register a new agent or capability entry.
   */
  public register(entry: CapabilityRegistryEntry): void {
    this.entries.set(entry.agentId, {
      ...entry,
      installedAt: entry.installedAt || Date.now(),
      lastUpdatedAt: entry.lastUpdatedAt || Date.now()
    });
    this.saveToStorage();
  }

  /**
   * Unregister an agent.
   */
  public unregister(agentId: string): boolean {
    const deleted = this.entries.delete(agentId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Fetch an entry.
   */
  public get(agentId: string): CapabilityRegistryEntry | undefined {
    return this.entries.get(agentId);
  }

  /**
   * List all capability entries.
   */
  public list(): CapabilityRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Update status details for an agent.
   */
  public updateStatus(agentId: string, updates: Partial<CapabilityRegistryEntry>): boolean {
    const entry = this.entries.get(agentId);
    if (!entry) return false;

    this.entries.set(agentId, {
      ...entry,
      ...updates,
      lastUpdatedAt: Date.now()
    });
    this.saveToStorage();
    return true;
  }

  /**
   * Query registered entries that match a set of capability keywords.
   */
  public queryCapabilities(capabilities: string[]): CapabilityRegistryEntry[] {
    if (!capabilities || capabilities.length === 0) return this.list();
    return this.list().filter(entry =>
      capabilities.every(req =>
        entry.capabilities.some(cap => cap.toLowerCase() === req.toLowerCase())
      )
    );
  }

  /**
   * Query registered entries that match a task name pattern.
   */
  public queryTasks(taskNamePattern: string): CapabilityRegistryEntry[] {
    const query = taskNamePattern.toLowerCase();
    return this.list().filter(entry =>
      entry.supportedTasks.some(task =>
        task.name.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query)
      )
    );
  }

  /**
   * Wipes the registry.
   */
  public clearRegistry(): void {
    this.entries.clear();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}
