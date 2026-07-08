import { PluginLog } from './PluginTypes';

export class PluginLogger {
  private pluginId: string;
  private logs: PluginLog[] = [];
  private static MAX_LOGS = 200;
  private onLogCallbacks: ((log: PluginLog) => void)[] = [];

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  /**
   * Log a debug level message.
   */
  public debug(message: string): void {
    this.addLog('debug', message);
  }

  /**
   * Log an info level message.
   */
  public info(message: string): void {
    this.addLog('info', message);
  }

  /**
   * Log a warn level message.
   */
  public warn(message: string): void {
    this.addLog('warn', message);
  }

  /**
   * Log an error level message.
   */
  public error(message: string): void {
    this.addLog('error', message);
  }

  /**
   * Retrieve all buffered logs.
   */
  public getLogs(): PluginLog[] {
    return [...this.logs];
  }

  /**
   * Clear all buffered logs.
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Register a listener for new log entries.
   */
  public onLog(callback: (log: PluginLog) => void): () => void {
    this.onLogCallbacks.push(callback);
    return () => {
      this.onLogCallbacks = this.onLogCallbacks.filter(cb => cb !== callback);
    };
  }

  private addLog(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const log: PluginLog = {
      timestamp: Date.now(),
      level,
      message: `[${this.pluginId}] ${message}`
    };

    this.logs.push(log);
    if (this.logs.length > PluginLogger.MAX_LOGS) {
      this.logs.shift();
    }

    // Call any registered listeners
    for (const callback of this.onLogCallbacks) {
      try {
        callback(log);
      } catch (e) {
        // Ignore logger subscriber failures
      }
    }
  }
}
