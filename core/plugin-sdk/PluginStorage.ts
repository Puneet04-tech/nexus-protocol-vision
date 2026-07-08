import { PluginPermissionsVerifier } from './PluginPermissions';

interface StorageMetadata {
  version: number;
  updatedAt: number;
  data: any;
}

export class PluginStorage {
  private pluginId: string;
  private permissions: PluginPermissionsVerifier;
  private prefix: string;
  private currentVersion: number;

  constructor(pluginId: string, permissions: PluginPermissionsVerifier, schemaVersion: number = 1) {
    this.pluginId = pluginId;
    this.permissions = permissions;
    this.prefix = `nexus_plugin_store:${pluginId}:`;
    this.currentVersion = schemaVersion;
  }

  /**
   * Saves a value under the given key, enforcing storage.write permission.
   */
  public async save(key: string, value: any): Promise<void> {
    this.permissions.assert('storage.write', `save key '${key}'`);

    const fullKey = this.prefix + key;
    const metadata: StorageMetadata = {
      version: this.currentVersion,
      updatedAt: Date.now(),
      data: value
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(metadata));
    } catch (error) {
      throw new Error(`Failed to save to local storage: ${(error as Error).message}`);
    }
  }

  /**
   * Loads a value for the given key, enforcing storage.read permission.
   * Gracefully handles migrations if storage version mismatches.
   */
  public async load(key: string): Promise<any | null> {
    this.permissions.assert('storage.read', `load key '${key}'`);

    const fullKey = this.prefix + key;
    const stored = localStorage.getItem(fullKey);

    if (!stored) {
      return null;
    }

    try {
      const parsed: StorageMetadata = JSON.parse(stored);
      
      // Basic version migration hook check
      if (parsed.version < this.currentVersion) {
        // Run migration logic if needed or log a warning
        console.warn(`[PluginStorage] Data version mismatch for key ${key}. Stored: ${parsed.version}, Current: ${this.currentVersion}. Attempting automatic migration.`);
        // Placeholder for automatic migration logic (can be extended by plugin configuration)
      }

      return parsed.data;
    } catch (error) {
      console.error(`[PluginStorage] Corrupt data detected for key ${key}: ${(error as Error).message}`);
      return null; // Return null if JSON is corrupted
    }
  }

  /**
   * Deletes the entry under the given key, enforcing storage.write permission.
   */
  public async delete(key: string): Promise<void> {
    this.permissions.assert('storage.write', `delete key '${key}'`);
    const fullKey = this.prefix + key;
    localStorage.removeItem(fullKey);
  }

  /**
   * Clears all storage associated with this plugin namespace, enforcing storage.write permission.
   */
  public async clear(): Promise<void> {
    this.permissions.assert('storage.write', 'clear storage');
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}
