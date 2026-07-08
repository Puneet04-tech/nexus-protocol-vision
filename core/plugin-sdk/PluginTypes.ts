export type PluginLifecycleState = 'INSTALLED' | 'LOADED' | 'ENABLED' | 'DISABLED' | 'ERROR';

export type PluginPermission =
  | 'persona.read'
  | 'persona.write'
  | 'graph.read'
  | 'graph.write'
  | 'events.subscribe'
  | 'events.publish'
  | 'storage.read'
  | 'storage.write'
  | 'network.access';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  entry: string; // JavaScript source code entry point string
  permissions: PluginPermission[];
  supportedProtocolVersion: string;
  dependencies?: Record<string, string>;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export interface PluginMetrics {
  cpuTimeMs: number;
  apiCallsCount: number;
  eventsProcessed: number;
  memoryEstimateBytes?: number;
}

export interface PluginLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

export interface PluginStatus {
  state: PluginLifecycleState;
  error?: string;
  enabledAt?: number;
  loadedAt?: number;
  installedAt: number;
}

export interface PluginInfo {
  manifest: PluginManifest;
  status: PluginStatus;
  metrics: PluginMetrics;
  logs: PluginLog[];
}

export interface PluginEvent {
  type: string;
  payload: any;
  timestamp: number;
  emitterId: string;
}

export interface PluginContextServices {
  logger: {
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  storage: {
    save(key: string, value: any): Promise<void>;
    load(key: string): Promise<any | null>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };
  events: {
    publish(type: string, payload: any): void;
    subscribe(type: string, handler: (event: PluginEvent) => void): () => void;
  };
  persona?: {
    getProfile(): Promise<any>;
    updateProfile(profileUpdates: any): Promise<any>;
  };
  graph?: {
    getGraphState(): Promise<any>;
    assimilate(content: string, type?: string): Promise<any>;
  };
  configuration: Record<string, any>;
  metrics: {
    recordCustomMetric(key: string, value: number): void;
  };
}
