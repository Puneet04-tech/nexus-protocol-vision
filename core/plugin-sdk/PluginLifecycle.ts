import { PluginLifecycleState, PluginStatus } from './PluginTypes';

export class PluginLifecycleManager {
  private pluginId: string;
  private state: PluginLifecycleState = 'INSTALLED';
  private error?: string;
  private enabledAt?: number;
  private loadedAt?: number;
  private installedAt: number = Date.now();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  public getStatus(): PluginStatus {
    return {
      state: this.state,
      error: this.error,
      enabledAt: this.enabledAt,
      loadedAt: this.loadedAt,
      installedAt: this.installedAt
    };
  }

  public transitionTo(nextState: PluginLifecycleState, errMessage?: string): void {
    const validTransitions: Record<PluginLifecycleState, PluginLifecycleState[]> = {
      INSTALLED: ['LOADED', 'ERROR'],
      LOADED: ['ENABLED', 'DISABLED', 'ERROR'],
      ENABLED: ['DISABLED', 'ERROR'],
      DISABLED: ['ENABLED', 'LOADED', 'ERROR'],
      ERROR: ['INSTALLED', 'LOADED', 'ENABLED', 'DISABLED']
    };

    const allowed = validTransitions[this.state];
    if (!allowed.includes(nextState) && nextState !== 'ERROR') {
      console.warn(`[Lifecycle] Invalid transition warning: ${this.state} -> ${nextState} for plugin ${this.pluginId}`);
    }

    this.state = nextState;
    if (nextState === 'LOADED') {
      this.loadedAt = Date.now();
    } else if (nextState === 'ENABLED') {
      this.enabledAt = Date.now();
    } else if (nextState === 'ERROR') {
      this.error = errMessage || 'An unknown error occurred.';
    }

    if (nextState !== 'ERROR') {
      this.error = undefined;
    }
  }

  /**
   * Safely invokes a lifecycle hook registered on the context.
   */
  public async invokeHook(context: any, hookName: string, ...args: any[]): Promise<void> {
    const hook = context[hookName];
    if (hook && typeof hook === 'function') {
      try {
        await Promise.resolve(hook(...args));
      } catch (err: any) {
        const errorMsg = err.message || String(err);
        this.transitionTo('ERROR', `Error in hook ${hookName}: ${errorMsg}`);
        
        // Invoke onError hook if available
        if (hookName !== 'onError' && context.onError && typeof context.onError === 'function') {
          try {
            await Promise.resolve(context.onError(err));
          } catch (nestedErr) {
            console.error(`[Lifecycle] Nested error in onError hook for plugin ${this.pluginId}:`, nestedErr);
          }
        }
        
        throw new Error(`[Plugin Hook Error] ${hookName} failed: ${errorMsg}`);
      }
    }
  }
}
