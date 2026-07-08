import { PluginManager } from '../PluginManager';
import { PluginManifest, PluginEvent } from '../PluginTypes';
import { PluginEventBus } from '../PluginEvents';

export interface TestCaseResult {
  name: string;
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}

export class PluginTestSuite {
  /**
   * Run all Plugin SDK tests and return results.
   */
  public static async runTests(personaInstance: any): Promise<SuiteResults> {
    const start = Date.now();
    const tests: TestCaseResult[] = [];

    const runTest = async (suite: string, name: string, fn: () => void | Promise<void>) => {
      const tStart = Date.now();
      try {
        await fn();
        tests.push({
          suite,
          name,
          passed: true,
          duration: Date.now() - tStart
        });
      } catch (err: any) {
        tests.push({
          suite,
          name,
          passed: false,
          duration: Date.now() - tStart,
          error: err.message || String(err)
        });
      }
    };

    // Helper: clean manager before/after tests
    const resetManager = () => {
      PluginManager.resetInstance();
      localStorage.clear();
      // Re-initialize manager
      return PluginManager.getInstance(personaInstance);
    };

    // ==========================================
    // SECURITY: Sandbox Isolation Tests
    // ==========================================
    await runTest('Sandbox Security', 'blocks direct access to global window and document objects', async () => {
      const manager = resetManager();
      const manifest: PluginManifest = {
        id: 'test.sandbox_violation',
        name: 'Sandbox Violator',
        version: '1.0.0',
        author: 'Tester',
        description: 'Attempts window access',
        permissions: [],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onLoad = function() {
            var x = window; // Should be undefined or throw error
            if (x !== undefined) {
              throw new Error("Direct window access succeeded!");
            }
            var d = document;
            if (d !== undefined) {
              throw new Error("Direct document access succeeded!");
            }
          };
        `
      };

      manager.registerPlugin(manifest);
      await manager.enablePlugin(manifest.id);
      
      const info = manager.getPlugin(manifest.id);
      if (info?.status.state !== 'ENABLED') {
        throw new Error(`Expected plugin to be ENABLED, got ${info?.status.state}`);
      }
    });

    await runTest('Sandbox Security', 'enforces network fetch restrictions based on permissions', async () => {
      const manager = resetManager();
      const manifest: PluginManifest = {
        id: 'test.fetch_violation',
        name: 'Fetch Violator',
        version: '1.0.0',
        author: 'Tester',
        description: 'Attempts fetch without permissions',
        permissions: [],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onLoad = function() {
            fetch("https://google.com").catch(function() {});
          };
        `
      };

      manager.registerPlugin(manifest);
      
      try {
        await manager.enablePlugin(manifest.id);
        throw new Error("Plugin loaded without throwing security violation!");
      } catch (err: any) {
        if (!err.message.includes('Network access is denied') && !err.message.includes('network.access')) {
          throw new Error(`Unexpected error thrown: ${err.message}`);
        }
      }
      
      const info = manager.getPlugin(manifest.id);
      if (info?.status.state !== 'ERROR') {
        throw new Error(`Expected plugin to transition to ERROR state, got ${info?.status.state}`);
      }
    });

    // ==========================================
    // ACCESS CONTROL: Permission Enforcement
    // ==========================================
    await runTest('Access Control', 'prevents reading persona info without persona.read permission', async () => {
      const manager = resetManager();
      const manifest: PluginManifest = {
        id: 'test.persona_read_violation',
        name: 'Persona Violator',
        version: '1.0.0',
        author: 'Tester',
        description: 'Attempts persona read without permission',
        permissions: [],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onLoad = function() {
            if (context.persona !== undefined) {
              throw new Error("Persona context was exposed without permission!");
            }
          };
        `
      };

      manager.registerPlugin(manifest);
      await manager.enablePlugin(manifest.id);
    });

    await runTest('Access Control', 'prevents modifying cognitive graph without graph.write permission', async () => {
      const manager = resetManager();
      const manifest: PluginManifest = {
        id: 'test.graph_write_violation',
        name: 'Graph Violator',
        version: '1.0.0',
        author: 'Tester',
        description: 'Attempts graph assimilate with only graph.read',
        permissions: ['graph.read'],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onEnable = function() {
            context.graph.assimilate("new topic").catch(function(e) {
              context.logger.error(e.message);
            });
          };
        `
      };

      manager.registerPlugin(manifest);
      await manager.enablePlugin(manifest.id);
      
      const logs = manager.getPlugin(manifest.id)?.logs || [];
      const hasViolationLog = logs.some(l => l.message.includes('Security Violation') && l.message.includes('graph.write'));
      
      if (!hasViolationLog) {
        throw new Error('Graph write security violation was not logged or thrown.');
      }
    });

    // ==========================================
    // EVENTS: Event Bus Priorities & Wildcards
    // ==========================================
    await runTest('Event Bus', 'dispatches events in descending order of priority', async () => {
      const eventBus = PluginEventBus.getInstance();
      eventBus.clearAllListeners();

      const order: number[] = [];
      const mockPerms: any = { assert: () => {}, has: () => true };

      eventBus.subscribe('p1', mockPerms, 'test_event', () => order.push(1), 10);
      eventBus.subscribe('p2', mockPerms, 'test_event', () => order.push(2), 20);
      eventBus.subscribe('p3', mockPerms, 'test_event', () => order.push(3), 5);

      eventBus.publish('tester', mockPerms, 'test_event', {});

      if (JSON.stringify(order) !== '[2,1,3]') {
        throw new Error(`Expected execution order [2, 1, 3], got ${JSON.stringify(order)}`);
      }
    });

    await runTest('Event Bus', 'notifies wildcard subscribers of all dispatched event types', async () => {
      const eventBus = PluginEventBus.getInstance();
      eventBus.clearAllListeners();

      const received: string[] = [];
      const mockPerms: any = { assert: () => {}, has: () => true };

      eventBus.subscribe('wildcard_agent', mockPerms, '*', (e) => {
        received.push(e.type);
      });

      eventBus.publish('tester', mockPerms, 'custom.one', {});
      eventBus.publish('tester', mockPerms, 'custom.two', {});

      if (received.length !== 2 || !received.includes('custom.one') || !received.includes('custom.two')) {
        throw new Error(`Wildcard subscriber failed to receive all events. Got: ${JSON.stringify(received)}`);
      }
    });

    // ==========================================
    // STORAGE: Isolated Local Storage
    // ==========================================
    await runTest('Isolated Storage', 'prevents cross-plugin namespace access and data pollution', async () => {
      const manager = resetManager();

      const manifestA: PluginManifest = {
        id: 'plugin.a',
        name: 'Plugin A',
        version: '1.0.0',
        author: 'Tester',
        description: 'Writes storage key',
        permissions: ['storage.write', 'storage.read'],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onLoad = function() {
            context.storage.save("key_one", "value_a");
          };
        `
      };

      const manifestB: PluginManifest = {
        id: 'plugin.b',
        name: 'Plugin B',
        version: '1.0.0',
        author: 'Tester',
        description: 'Reads storage key',
        permissions: ['storage.write', 'storage.read'],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onLoad = function() {
            context.storage.save("key_one", "value_b");
          };
        `
      };

      manager.registerPlugin(manifestA);
      manager.registerPlugin(manifestB);

      await manager.enablePlugin(manifestA.id);
      await manager.enablePlugin(manifestB.id);

      const valA = localStorage.getItem('nexus_plugin_store:plugin.a:key_one');
      const valB = localStorage.getItem('nexus_plugin_store:plugin.b:key_one');

      if (!valA || !valB || valA === valB) {
        throw new Error('Storage collision: plugin namespaces were not correctly isolated.');
      }
    });

    // ==========================================
    // LIFECYCLE: Sequence Transitions
    // ==========================================
    await runTest('Lifecycle Hooks', 'fires hooks in correct sequence: onInstall -> onLoad -> onEnable', async () => {
      const manager = resetManager();
      const seq: string[] = [];

      const manifest: PluginManifest = {
        id: 'test.lifecycle_seq',
        name: 'Lifecycle Sequencer',
        version: '1.0.0',
        author: 'Tester',
        description: 'Tracks hooks sequence',
        permissions: [],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onInstall = function() { context.logger.info("INSTALL"); };
          context.onLoad = function() { context.logger.info("LOAD"); };
          context.onEnable = function() { context.logger.info("ENABLE"); };
        `
      };

      manager.registerPlugin(manifest);
      await manager.enablePlugin(manifest.id);

      const logs = manager.getPlugin(manifest.id)?.logs || [];
      const hookLogs = logs.map(l => l.message.split(' ').pop()).filter(msg => ['INSTALL', 'LOAD', 'ENABLE'].includes(msg || ''));

      if (JSON.stringify(hookLogs) !== '["INSTALL","LOAD","ENABLE"]') {
        throw new Error(`Expected sequence ["INSTALL", "LOAD", "ENABLE"], got ${JSON.stringify(hookLogs)}`);
      }
    });

    // ==========================================
    // FAULT TOLERANCE: Failure Recovery
    // ==========================================
    await runTest('Fault Tolerance', 'recovers gracefully from runtime errors during hook execution', async () => {
      const manager = resetManager();
      const manifest: PluginManifest = {
        id: 'test.faulty_plugin',
        name: 'Faulty Agent',
        version: '1.0.0',
        author: 'Tester',
        description: 'Throws error on load',
        permissions: [],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onLoad = function() {
            throw new Error("Intentional Crash during onLoad!");
          };
        `
      };

      manager.registerPlugin(manifest);

      try {
        await manager.enablePlugin(manifest.id);
        throw new Error("Faulty plugin loaded without throwing!");
      } catch (err: any) {
        if (!err.message.includes('Intentional Crash')) {
          throw err;
        }
      }

      const info = manager.getPlugin(manifest.id);
      if (info?.status.state !== 'ERROR' || !info.status.error?.includes('Intentional Crash')) {
        throw new Error(`Expected status ERROR with description, got state=${info?.status.state}, error=${info?.status.error}`);
      }
    });

    // ==========================================
    // HOT RELOADING
    // ==========================================
    await runTest('Hot Reloading', 'supports reloading dynamic scripts without rebooting manager', async () => {
      const manager = resetManager();
      const manifest: PluginManifest = {
        id: 'test.hot_reload',
        name: 'Reloadable Agent',
        version: '1.0.0',
        author: 'Tester',
        description: 'Logs count',
        permissions: [],
        supportedProtocolVersion: '1.0.0',
        entry: `
          context.onEnable = function() {
            context.logger.info("VERSION 1");
          };
        `
      };

      manager.registerPlugin(manifest);
      await manager.enablePlugin(manifest.id);

      // Verify V1 loaded
      let logs = manager.getPlugin(manifest.id)?.logs || [];
      if (!logs.some(l => l.message.includes('VERSION 1'))) {
        throw new Error('V1 did not execute correctly.');
      }

      // Update script (Simulated developer changes)
      manifest.entry = `
        context.onEnable = function() {
          context.logger.info("VERSION 2");
        };
      `;

      // Reload
      await manager.reloadPlugin(manifest.id);

      // Verify V2 loaded
      logs = manager.getPlugin(manifest.id)?.logs || [];
      if (!logs.some(l => l.message.includes('VERSION 2'))) {
        throw new Error('V2 hot reload was not picked up.');
      }
    });

    // Cleanup
    PluginManager.resetInstance();

    const end = Date.now();
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;

    return {
      total: tests.length,
      passed,
      failed,
      duration: end - start,
      tests
    };
  }
}
