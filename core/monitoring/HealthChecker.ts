import { HealthStatus, SubsystemHealth } from './MonitoringTypes';

/**
 * Monitors and acts as the health status registrar for all Nexus subsystems
 */
export class HealthChecker {
  private healthReports: Map<string, SubsystemHealth> = new Map();

  constructor() {
    this.initializeDefaultHealths();
  }

  /**
   * Pre-populate statuses so we never return undefined values
   */
  private initializeDefaultHealths(): void {
    const systems = ['Persona', 'Graph', 'Privacy', 'Carbon', 'Federated', 'MorphNet', 'Immune', 'Plugins'];
    for (const sys of systems) {
      this.healthReports.set(sys, {
        status: 'Healthy',
        lastUpdate: Date.now(),
        responseTime: 10 + Math.floor(Math.random() * 20),
        errorRate: 0,
        availability: 100.0
      });
    }
  }

  /**
   * Update a subsystem's health parameters
   */
  public reportStatus(
    systemName: string,
    status: HealthStatus,
    responseTimeMs: number,
    errorRate: number,
    availability: number
  ): void {
    this.healthReports.set(systemName, {
      status,
      lastUpdate: Date.now(),
      responseTime: responseTimeMs,
      errorRate: Math.max(0, Math.min(100, errorRate)),
      availability: Math.max(0, Math.min(100, availability))
    });
  }

  /**
   * Evaluate health status dynamically based on latency/errors
   */
  public evaluateSystemStatus(
    systemName: string,
    responseTimeMs: number,
    hasError: boolean
  ): HealthStatus {
    const existing = this.healthReports.get(systemName);
    
    let nextStatus: HealthStatus = 'Healthy';
    let nextErrorRate = existing ? existing.errorRate : 0;
    
    // Smooth error rate rolling average
    nextErrorRate = hasError 
      ? Math.min(100, nextErrorRate * 0.8 + 20) 
      : Math.max(0, nextErrorRate * 0.8);

    if (hasError || nextErrorRate > 15) {
      nextStatus = 'Critical';
    } else if (responseTimeMs > 250 || nextErrorRate > 3) {
      nextStatus = 'Warning';
    }

    const nextAvailability = hasError 
      ? Math.max(80, (existing ? existing.availability : 100) - 1.5)
      : Math.min(100, (existing ? existing.availability : 100) + 0.1);

    this.reportStatus(systemName, nextStatus, responseTimeMs, nextErrorRate, nextAvailability);
    return nextStatus;
  }

  public getSystemHealth(systemName: string): SubsystemHealth | undefined {
    return this.healthReports.get(systemName);
  }

  public getAllHealthReports(): Record<string, SubsystemHealth> {
    const report: Record<string, SubsystemHealth> = {};
    for (const [sys, val] of this.healthReports.entries()) {
      report[sys] = { ...val };
    }
    return report;
  }

  /**
   * Compute aggregate system health based on individual subsystems
   */
  public getOverallStatus(): HealthStatus {
    let hasCritical = false;
    let hasWarning = false;
    let offlineCount = 0;

    for (const report of this.healthReports.values()) {
      if (report.status === 'Critical') hasCritical = true;
      if (report.status === 'Warning') hasWarning = true;
      if (report.status === 'Offline') offlineCount++;
    }

    if (offlineCount === this.healthReports.size) return 'Offline';
    if (hasCritical) return 'Critical';
    if (hasWarning) return 'Warning';
    return 'Healthy';
  }
}
