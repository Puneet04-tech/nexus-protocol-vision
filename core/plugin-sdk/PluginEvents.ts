import { PluginEvent } from './PluginTypes';
import { PluginPermissionsVerifier } from './PluginPermissions';

export interface EventListener {
  pluginId: string;
  handler: (event: PluginEvent) => void;
  priority: number;
  once: boolean;
}

export class PluginEventBus {
  private static instance: PluginEventBus;
  private listeners: Map<string, EventListener[]> = new Map();
  private wildcardListeners: EventListener[] = [];
  
  private constructor() {}

  public static getInstance(): PluginEventBus {
    if (!PluginEventBus.instance) {
      PluginEventBus.instance = new PluginEventBus();
    }
    return PluginEventBus.instance;
  }

  /**
   * Clears all listeners (useful for testing or hot reloads).
   */
  public clearAllListeners(): void {
    this.listeners.clear();
    this.wildcardListeners = [];
  }

  /**
   * Subscribe to events of a specific type or all events ('*').
   */
  public subscribe(
    pluginId: string,
    permissions: PluginPermissionsVerifier,
    type: string,
    handler: (event: PluginEvent) => void,
    priority: number = 0,
    once: boolean = false
  ): () => void {
    permissions.assert('events.subscribe', `subscribe to event type '${type}'`);

    const listener: EventListener = {
      pluginId,
      handler,
      priority,
      once
    };

    if (type === '*') {
      this.wildcardListeners.push(listener);
      this.wildcardListeners.sort((a, b) => b.priority - a.priority);
      
      return () => {
        this.wildcardListeners = this.wildcardListeners.filter(l => l !== listener);
      };
    } else {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, []);
      }
      
      const list = this.listeners.get(type)!;
      list.push(listener);
      list.sort((a, b) => b.priority - a.priority);

      return () => {
        const currentList = this.listeners.get(type);
        if (currentList) {
          this.listeners.set(type, currentList.filter(l => l !== listener));
        }
      };
    }
  }

  /**
   * Publish an event to the bus.
   */
  public publish(
    emitterId: string,
    permissions: PluginPermissionsVerifier | null,
    type: string,
    payload: any
  ): void {
    if (permissions) {
      permissions.assert('events.publish', `publish event type '${type}'`);
    }

    const event: PluginEvent = {
      type,
      payload,
      timestamp: Date.now(),
      emitterId
    };

    // Get specific listeners and wildcards
    const targetListeners = this.listeners.get(type) || [];
    const allListeners = [...targetListeners, ...this.wildcardListeners];
    
    // Sort combined list by priority (descending)
    allListeners.sort((a, b) => b.priority - a.priority);

    // Track once listeners to remove
    const onceListenersToRemove: { type: string; listener: EventListener }[] = [];

    for (const listener of allListeners) {
      try {
        listener.handler(event);
      } catch (error) {
        console.error(`[PluginEventBus] Error in listener for plugin '${listener.pluginId}' on event '${type}':`, error);
        // Error handling policy: a failing listener shouldn't block other listeners
      }

      if (listener.once) {
        if (this.wildcardListeners.includes(listener)) {
          onceListenersToRemove.push({ type: '*', listener });
        } else {
          onceListenersToRemove.push({ type, listener });
        }
      }
    }

    // Clean up once listeners
    for (const item of onceListenersToRemove) {
      if (item.type === '*') {
        this.wildcardListeners = this.wildcardListeners.filter(l => l !== item.listener);
      } else {
        const list = this.listeners.get(item.type);
        if (list) {
          this.listeners.set(item.type, list.filter(l => l !== item.listener));
        }
      }
    }
  }
}
