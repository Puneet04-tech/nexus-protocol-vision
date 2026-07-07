import { ResourceMetrics } from './MonitoringTypes';

/**
 * Tracks concurrency and active resource consumption
 */
export class ResourceMonitor {
  private activeUsers: number = 1;
  private activeAgents: number = 4; // GreetingAgent, KnowledgeAssistant, MetricsCollector, EventLogger
  private networkBytesSent: number = 0;
  private networkBytesReceived: number = 0;
  
  constructor() {
    this.networkBytesSent = 45 * 1024; // Initial base sizes
    this.networkBytesReceived = 180 * 1024;
  }

  public recordNetworkActivity(bytesSent: number, bytesReceived: number): void {
    this.networkBytesSent += bytesSent;
    this.networkBytesReceived += bytesReceived;
  }

  public setUsersCount(count: number): void {
    this.activeUsers = Math.max(1, count);
  }

  public setActiveAgentsCount(count: number): void {
    this.activeAgents = Math.max(0, count);
  }

  /**
   * Calculate local storage space utilized in bytes
   */
  private getStorageSize(): number {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += key.length * 2; // UTF-16 character = 2 bytes
          const val = localStorage.getItem(key);
          if (val) {
            totalBytes += val.length * 2;
          }
        }
      }
    } catch (e) {}
    return totalBytes;
  }

  public collect(): ResourceMetrics {
    // Add minor mock variation to network activity
    this.networkBytesSent += Math.floor(Math.random() * 512);
    this.networkBytesReceived += Math.floor(Math.random() * 2048);

    return {
      activeUsers: this.activeUsers,
      activeAgents: this.activeAgents,
      storageSizeBytes: this.getStorageSize(),
      networkBytesSent: this.networkBytesSent,
      networkBytesReceived: this.networkBytesReceived,
      timestamp: Date.now()
    };
  }
}
