import { PluginContextServices } from './PluginTypes';
import { PluginPermissionsVerifier } from './PluginPermissions';

export class PluginSandbox {
  private pluginId: string;
  private permissions: PluginPermissionsVerifier;
  private context: PluginContextServices;

  constructor(pluginId: string, permissions: PluginPermissionsVerifier, context: PluginContextServices) {
    this.pluginId = pluginId;
    this.permissions = permissions;
    this.context = context;
  }

  /**
   * Executes the plugin source code in a scoped, sandboxed JavaScript environment.
   */
  public execute(sourceCode: string): void {
    // Determine fetch access
    const sandboxFetch = this.permissions.has('network.access')
      ? (input: RequestInfo | URL, init?: RequestInit) => {
          this.context.logger.info(`[Network] Fetching ${input}`);
          return window.fetch(input, init);
        }
      : () => {
          throw new Error("Security Violation: Network access is denied. Please request 'network.access' permission.");
        };

    // Shadowed global variables list to block direct browser API access
    const shadowedGlobals = {
      window: undefined,
      document: undefined,
      localStorage: undefined,
      sessionStorage: undefined,
      globalThis: undefined,
      location: undefined,
      history: undefined,
      eval: undefined,
      Function: undefined,
      fetch: sandboxFetch,
      XMLHttpRequest: undefined,
      WebSocket: undefined
    };

    const keys = Object.keys(shadowedGlobals);
    const values = Object.values(shadowedGlobals);

    try {
      // Create the sandboxed function executor
      // Code runs in strict mode and cannot escape the scoped variables passed as parameters
      const runner = new Function(
        'context',
        ...keys,
        `
        "use strict";
        try {
          ${sourceCode}
        } catch (err) {
          throw new Error("Runtime execution error: " + err.message);
        }
        `
      );

      // Execute with context and shadowed arguments
      runner.call(null, this.context, ...values);
    } catch (error) {
      const msg = (error as Error).message;
      this.context.logger.error(`Sandbox Error: ${msg}`);
      throw new Error(`[Sandbox Execution Error] ${msg}`);
    }
  }
}
