import { PluginManifest, PluginInfo, PluginLifecycleState, PluginMetrics, PluginLog } from './PluginTypes';

export class PluginRegistry {
  private registry: Map<string, PluginInfo> = new Map();

  /**
   * Registers a new plugin in the registry with default metrics and state.
   */
  public register(manifest: PluginManifest): PluginInfo {
    const info: PluginInfo = {
      manifest,
      status: {
        state: 'INSTALLED',
        installedAt: Date.now()
      },
      metrics: {
        cpuTimeMs: 0,
        apiCallsCount: 0,
        eventsProcessed: 0
      },
      logs: []
    };
    this.registry.set(manifest.id, info);
    return info;
  }

  /**
   * Unregisters a plugin.
   */
  public unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Retrieves a plugin's current registration record.
   */
  public get(id: string): PluginInfo | undefined {
    return this.registry.get(id);
  }

  /**
   * Returns a list of all registered plugins.
   */
  public list(): PluginInfo[] {
    return Array.from(this.registry.values());
  }

  /**
   * Updates a plugin's lifecycle state and errors.
   */
  public updateStatus(id: string, state: PluginLifecycleState, error?: string): void {
    const info = this.registry.get(id);
    if (info) {
      info.status.state = state;
      info.status.error = error;
      if (state === 'LOADED') {
        info.status.loadedAt = Date.now();
      } else if (state === 'ENABLED') {
        info.status.enabledAt = Date.now();
      }
    }
  }

  /**
   * Increments metrics for a plugin.
   */
  public incrementMetrics(id: string, key: keyof PluginMetrics, incrementValue: number = 1): void {
    const info = this.registry.get(id);
    if (info) {
      if (info.metrics[key] !== undefined) {
        info.metrics[key]! += incrementValue;
      }
    }
  }

  /**
   * Updates general metrics details (like execution duration).
   */
  public updateMetrics(id: string, updates: Partial<PluginMetrics>): void {
    const info = this.registry.get(id);
    if (info) {
      info.metrics = {
        ...info.metrics,
        ...updates
      };
    }
  }

  /**
   * Appends a log entry to a plugin's buffer.
   */
  public addLog(id: string, log: PluginLog): void {
    const info = this.registry.get(id);
    if (info) {
      info.logs.push(log);
      if (info.logs.length > 200) {
        info.logs.shift();
      }
    }
  }
}
