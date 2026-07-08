import { PluginManifest, PluginContextServices } from './PluginTypes';
import { PluginPermissionsVerifier } from './PluginPermissions';
import { PluginLogger } from './PluginLogger';
import { PluginStorage } from './PluginStorage';
import { PluginEventBus } from './PluginEvents';
import { PluginContextBuilder } from './PluginContext';
import { PluginSandbox } from './PluginSandbox';
import { PluginLifecycleManager } from './PluginLifecycle';

export interface LoadedPluginInstance {
  manifest: PluginManifest;
  context: PluginContextServices;
  permissions: PluginPermissionsVerifier;
  logger: PluginLogger;
  storage: PluginStorage;
  lifecycle: PluginLifecycleManager;
  unsubscribeCallbacks: (() => void)[];
}

export class PluginLoader {
  private eventBus: PluginEventBus;
  private personaInstance: any;
  private onApiCall?: (pluginId: string) => void;
  private onEventProcessed?: (pluginId: string) => void;

  constructor(
    eventBus: PluginEventBus,
    personaInstance: any,
    onApiCall?: (pluginId: string) => void,
    onEventProcessed?: (pluginId: string) => void
  ) {
    this.eventBus = eventBus;
    this.personaInstance = personaInstance;
    this.onApiCall = onApiCall;
    this.onEventProcessed = onEventProcessed;
  }

  /**
   * Instantiates a plugin, sets up its sandbox/context, and calls onInstall/onLoad hooks.
   */
  public async load(manifest: PluginManifest, config: Record<string, any> = {}): Promise<LoadedPluginInstance> {
    const permissions = new PluginPermissionsVerifier(manifest.id, manifest.permissions);
    const logger = new PluginLogger(manifest.id);
    const storage = new PluginStorage(manifest.id, permissions);
    const lifecycle = new PluginLifecycleManager(manifest.id);
    const unsubscribeCallbacks: (() => void)[] = [];

    const recordApiCall = () => {
      if (this.onApiCall) {
        this.onApiCall(manifest.id);
      }
    };

    const recordEventProcessed = () => {
      if (this.onEventProcessed) {
        this.onEventProcessed(manifest.id);
      }
    };

    const context = PluginContextBuilder.build(
      manifest.id,
      permissions,
      logger,
      storage,
      this.eventBus,
      this.personaInstance,
      config,
      recordApiCall,
      (unsub) => unsubscribeCallbacks.push(unsub),
      recordEventProcessed
    );

    const sandbox = new PluginSandbox(manifest.id, permissions, context);

    try {
      // 1. Run Sandbox execution (defines hook callbacks on context)
      sandbox.execute(manifest.entry);

      // 2. Lifecycle sequence: onInstall
      await lifecycle.invokeHook(context, 'onInstall');

      // 3. Lifecycle sequence: onLoad
      await lifecycle.invokeHook(context, 'onLoad');
      lifecycle.transitionTo('LOADED');

      return {
        manifest,
        context,
        permissions,
        logger,
        storage,
        lifecycle,
        unsubscribeCallbacks
      };
    } catch (error: any) {
      lifecycle.transitionTo('ERROR', error.message || 'Execution load failure.');
      throw error;
    }
  }

  /**
   * Tears down a plugin instance, unsubscribing from event listeners and invoking cleanup hooks.
   */
  public async unload(instance: LoadedPluginInstance): Promise<void> {
    const { context, lifecycle, unsubscribeCallbacks } = instance;
    try {
      // 1. Invoke onUnload hook
      await lifecycle.invokeHook(context, 'onUnload');
      
      // 2. Invoke onDestroy hook
      await lifecycle.invokeHook(context, 'onDestroy');
    } catch (err) {
      console.error(`[PluginLoader] Error unloading plugin ${instance.manifest.id}:`, err);
    } finally {
      // 3. Clear event subscriptions
      for (const unsub of unsubscribeCallbacks) {
        try {
          unsub();
        } catch (e) {
          // Ignore unsubscribe failures
        }
      }
      instance.unsubscribeCallbacks = [];
    }
  }
}
