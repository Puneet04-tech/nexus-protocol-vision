import { PluginContextServices, PluginEvent } from './PluginTypes';
import { PluginPermissionsVerifier } from './PluginPermissions';
import { PluginLogger } from './PluginLogger';
import { PluginStorage } from './PluginStorage';
import { PluginEventBus } from './PluginEvents';

export class PluginContextBuilder {
  /**
   * Builds the secure services context object exposed to the plugin.
   */
  public static build(
    pluginId: string,
    permissions: PluginPermissionsVerifier,
    logger: PluginLogger,
    storage: PluginStorage,
    eventBus: PluginEventBus,
    personaInstance: any, // SovereignPersona instance
    config: Record<string, any> = {},
    recordApiCall: () => void,
    onSubscribe?: (unsub: () => void) => void,
    recordEventProcessed?: () => void
  ): PluginContextServices {
    
    // Logger interface (unprotected)
    const secureLogger = {
      debug: (msg: string) => { recordApiCall(); logger.debug(msg); },
      info: (msg: string) => { recordApiCall(); logger.info(msg); },
      warn: (msg: string) => { recordApiCall(); logger.warn(msg); },
      error: (msg: string) => { recordApiCall(); logger.error(msg); }
    };

    // Storage interface (protected internally by PluginStorage and permissions)
    const secureStorage = {
      save: async (key: string, value: any) => {
        recordApiCall();
        permissions.assert('storage.write', `save key '${key}'`);
        await storage.save(key, value);
      },
      load: async (key: string) => {
        recordApiCall();
        permissions.assert('storage.read', `load key '${key}'`);
        return await storage.load(key);
      },
      delete: async (key: string) => {
        recordApiCall();
        permissions.assert('storage.write', `delete key '${key}'`);
        await storage.delete(key);
      },
      clear: async () => {
        recordApiCall();
        permissions.assert('storage.write', 'clear storage');
        await storage.clear();
      }
    };

    // Events interface (protected by events.subscribe / events.publish)
    const secureEvents = {
      publish: (type: string, payload: any) => {
        recordApiCall();
        permissions.assert('events.publish', `publish event '${type}'`);
        eventBus.publish(pluginId, permissions, type, payload);
      },
      subscribe: (type: string, handler: (event: PluginEvent) => void) => {
        recordApiCall();
        permissions.assert('events.subscribe', `subscribe to event '${type}'`);
        const unsub = eventBus.subscribe(pluginId, permissions, type, (e) => {
          // Increment event count on handler trigger
          recordApiCall();
          if (recordEventProcessed) {
            recordEventProcessed();
          }
          handler(e);
        });
        if (onSubscribe) {
          onSubscribe(unsub);
        }
        return unsub;
      }
    };

    // Optional Persona interface (protected by persona.read / persona.write)
    const securePersona = {
      getProfile: async () => {
        recordApiCall();
        permissions.assert('persona.read', 'read Sovereign Persona profile');
        if (!personaInstance) {
          throw new Error('Sovereign Persona service is not available.');
        }
        // Accessing private profile dynamically
        return JSON.parse(JSON.stringify(personaInstance.profile || (personaInstance as any).profile || {}));
      },
      updateProfile: async (profileUpdates: any) => {
        recordApiCall();
        permissions.assert('persona.write', 'update Sovereign Persona profile');
        if (!personaInstance) {
          throw new Error('Sovereign Persona service is not available.');
        }
        const currentProfile = personaInstance.profile || (personaInstance as any).profile;
        if (currentProfile) {
          Object.assign(currentProfile, profileUpdates);
          return JSON.parse(JSON.stringify(currentProfile));
        }
        throw new Error('Could not update Sovereign Persona profile.');
      }
    };

    // Optional Cognitive Graph interface (protected by graph.read / graph.write)
    const secureGraph = {
      getGraphState: async () => {
        recordApiCall();
        permissions.assert('graph.read', 'read Cognitive Graph state');
        if (!personaInstance) {
          throw new Error('Cognitive Graph service is not available (no persona loaded).');
        }
        const graph = personaInstance.cognitiveGraph || (personaInstance as any).cognitiveGraph;
        if (!graph) {
          throw new Error('Cognitive Graph is not initialized.');
        }
        return graph.getCurrentState();
      },
      assimilate: async (content: string, type: string = 'learning') => {
        recordApiCall();
        permissions.assert('graph.write', `assimilate content '${content}'`);
        if (!personaInstance) {
          throw new Error('Cognitive Graph service is not available.');
        }
        const graph = personaInstance.cognitiveGraph || (personaInstance as any).cognitiveGraph;
        if (!graph) {
          throw new Error('Cognitive Graph is not initialized.');
        }
        return await graph.assimilate({
          type,
          content,
          context: { source: `plugin:${pluginId}` },
          timestamp: Date.now()
        });
      }
    };

    // Custom metrics hook
    const secureMetrics = {
      recordCustomMetric: (key: string, value: number) => {
        recordApiCall();
        logger.info(`[Metric] ${key}: ${value}`);
      }
    };

    return {
      logger: secureLogger,
      storage: secureStorage,
      events: secureEvents,
      persona: permissions.has('persona.read') || permissions.has('persona.write') ? securePersona : undefined,
      graph: permissions.has('graph.read') || permissions.has('graph.write') ? secureGraph : undefined,
      configuration: config,
      metrics: secureMetrics
    };
  }
}
