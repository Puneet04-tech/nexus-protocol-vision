import { PluginManifest, PluginInfo, PluginLifecycleState, PluginLog, PluginMetrics } from './PluginTypes';
import { PluginRegistry } from './PluginRegistry';
import { PluginLoader, LoadedPluginInstance } from './PluginLoader';
import { PluginEventBus } from './PluginEvents';
import { PluginValidator } from './PluginValidator';

export class PluginManager {
  private static instance: PluginManager;
  private registry: PluginRegistry;
  private loader: PluginLoader;
  private eventBus: PluginEventBus;
  private activeInstances: Map<string, LoadedPluginInstance> = new Map();
  private personaInstance: any;

  private constructor(personaInstance: any) {
    this.personaInstance = personaInstance;
    this.eventBus = PluginEventBus.getInstance();
    this.registry = new PluginRegistry();
    
    // Instantiate the loader with metrics hooks linked to registry
    this.loader = new PluginLoader(
      this.eventBus,
      personaInstance,
      (pluginId) => this.registry.incrementMetrics(pluginId, 'apiCallsCount'),
      (pluginId) => this.registry.incrementMetrics(pluginId, 'eventsProcessed')
    );
  }

  /**
   * Gets or initializes the PluginManager singleton.
   */
  public static getInstance(personaInstance?: any): PluginManager {
    if (!PluginManager.instance) {
      if (!personaInstance) {
        throw new Error('PluginManager must be initialized with a SovereignPersona instance first.');
      }
      PluginManager.instance = new PluginManager(personaInstance);
    }
    return PluginManager.instance;
  }

  /**
   * Resets the singleton instance (primarily for testing cleanup).
   */
  public static resetInstance(): void {
    if (PluginManager.instance) {
      PluginManager.instance.unloadAllSync();
      PluginManager.instance = undefined as any;
    }
  }

  private unloadAllSync(): void {
    for (const [id, instance] of this.activeInstances.entries()) {
      try {
        this.loader.unload(instance);
      } catch (e) {
        // Suppress shutdown unload errors
      }
    }
    this.activeInstances.clear();
    this.eventBus.clearAllListeners();
  }

  /**
   * Registers a plugin, validates it, and saves it in the registry.
   */
  public registerPlugin(manifest: PluginManifest): PluginInfo {
    // 1. Validate manifest and code
    const validation = PluginValidator.validate(manifest);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join('; ')}`);
    }

    // Check if already registered
    const existing = this.registry.get(manifest.id);
    if (existing) {
      throw new Error(`Plugin with ID '${manifest.id}' is already registered.`);
    }

    // 2. Add to registry
    return this.registry.register(manifest);
  }

  /**
   * Unregisters a plugin, first disabling and unloading if it is active.
   */
  public async unregisterPlugin(id: string): Promise<boolean> {
    const instance = this.activeInstances.get(id);
    if (instance) {
      await this.disablePlugin(id);
    }
    return this.registry.unregister(id);
  }

  /**
   * Enables a plugin by loading its sandbox and invoking onEnable.
   */
  public async enablePlugin(id: string, config: Record<string, any> = {}): Promise<void> {
    const info = this.registry.get(id);
    if (!info) {
      throw new Error(`Cannot enable plugin '${id}': plugin is not registered.`);
    }

    if (info.status.state === 'ENABLED') {
      return; // Already enabled
    }

    // Unload if in loaded state to ensure fresh start
    if (this.activeInstances.has(id)) {
      const active = this.activeInstances.get(id)!;
      await this.loader.unload(active);
      this.activeInstances.delete(id);
    }

    const startCpu = performance.now();
    try {
      // 1. Load sandbox and run lifecycle (loads + calls onInstall & onLoad)
      const instance = await this.loader.load(info.manifest, config);
      this.activeInstances.set(id, instance);

      // Wire logs from logger to registry buffer
      const unsubLog = instance.logger.onLog((log) => {
        this.registry.addLog(id, log);
      });
      instance.unsubscribeCallbacks.push(unsubLog);

      // 2. Invoke onEnable hook
      await instance.lifecycle.invokeHook(instance.context, 'onEnable');
      instance.lifecycle.transitionTo('ENABLED');

      // Update registry status
      this.registry.updateStatus(id, 'ENABLED');
      
      // Update startup cpu metrics
      const duration = performance.now() - startCpu;
      this.registry.updateMetrics(id, { cpuTimeMs: duration });
    } catch (err: any) {
      const msg = err.message || String(err);
      this.registry.updateStatus(id, 'ERROR', msg);
      
      const duration = performance.now() - startCpu;
      this.registry.incrementMetrics(id, 'cpuTimeMs', duration);
      throw err;
    }
  }

  /**
   * Disables a plugin by invoking onDisable and tearing down subscriptions.
   */
  public async disablePlugin(id: string): Promise<void> {
    const instance = this.activeInstances.get(id);
    if (!instance) {
      // If not active, just update registry state if registered
      const info = this.registry.get(id);
      if (info && info.status.state !== 'DISABLED') {
        this.registry.updateStatus(id, 'DISABLED');
      }
      return;
    }

    const startCpu = performance.now();
    try {
      // Invoke onDisable hook
      await instance.lifecycle.invokeHook(instance.context, 'onDisable');
      
      // Transition state
      instance.lifecycle.transitionTo('DISABLED');
      
      // Unload active sandbox resources
      await this.loader.unload(instance);
      this.activeInstances.delete(id);

      this.registry.updateStatus(id, 'DISABLED');
    } catch (err: any) {
      const msg = err.message || String(err);
      this.registry.updateStatus(id, 'ERROR', msg);
      throw err;
    } finally {
      const duration = performance.now() - startCpu;
      this.registry.incrementMetrics(id, 'cpuTimeMs', duration);
    }
  }

  /**
   * Performs hot reloading by disabling and then enabling the plugin immediately.
   */
  public async reloadPlugin(id: string, config: Record<string, any> = {}): Promise<void> {
    const info = this.registry.get(id);
    if (!info) {
      throw new Error(`Cannot reload plugin '${id}': plugin is not registered.`);
    }

    // Disable first (ignoring if not active)
    await this.disablePlugin(id);

    // Re-enable
    await this.enablePlugin(id, config);
  }

  /**
   * Returns a list of all registered plugins.
   */
  public listPlugins(): PluginInfo[] {
    return this.registry.list();
  }

  /**
   * Gets specific registered plugin details.
   */
  public getPlugin(id: string): PluginInfo | undefined {
    return this.registry.get(id);
  }

  /**
   * Expose global event bus for system integration.
   */
  public getEventBus(): PluginEventBus {
    return this.eventBus;
  }

  /**
   * Exposes active loaded instances (internal use).
   */
  public getActiveInstances(): Map<string, LoadedPluginInstance> {
    return this.activeInstances;
  }
}
