import { IncidentRepository } from '../repository/IncidentRepository';

export class IncidentMetricsCollector {
  private static instance: IncidentMetricsCollector | null = null;
  private metrics: Map<string, number> = new Map();
  private repo = IncidentRepository.getInstance();

  private constructor() {
    this.resetMetrics();
  }

  public static getInstance(): IncidentMetricsCollector {
    if (!this.instance) {
      this.instance = new IncidentMetricsCollector();
    }
    return this.instance;
  }

  public resetMetrics(): void {
    this.metrics.set('detector.agent_failures', 0);
    this.metrics.set('detector.workflow_failures', 0);
    this.metrics.set('detector.api_timeouts', 0);
    this.metrics.set('detector.communication_failures', 0);
    this.metrics.set('detector.resource_exhaustion', 0); // percentage 0-100
    this.metrics.set('detector.auth_failures', 0);
    this.metrics.set('detector.plugin_failures', 0);
    this.metrics.set('detector.network_connectivity_issues', 0); // 0 = fine, 1 = disconnected
    this.metrics.set('detector.unexpected_exceptions', 0);
  }

  public increment(metric: string, count = 1): void {
    const val = this.metrics.get(metric) || 0;
    this.metrics.set(metric, val + count);
  }

  public setGauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  public getMetric(metric: string): number {
    return this.metrics.get(metric) || 0;
  }

  public getAllMetrics(): Record<string, number> {
    const res: Record<string, number> = {};
    for (const [key, val] of this.metrics.entries()) {
      res[key] = val;
    }
    return res;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONVENIENCE RECORDER WRAPPERS
  // ───────────────────────────────────────────────────────────────────────────

  public recordAgentFailure(): void {
    this.increment('detector.agent_failures');
    this.increment('detector.unexpected_exceptions');
  }

  public recordWorkflowFailure(): void {
    this.increment('detector.workflow_failures');
  }

  public recordApiTimeout(): void {
    this.increment('detector.api_timeouts');
    this.increment('detector.communication_failures');
  }

  public recordResourceExhaustion(cpuPercent: number, storagePercent: number): void {
    const maxVal = Math.max(cpuPercent, storagePercent);
    this.setGauge('detector.resource_exhaustion', maxVal);
  }

  public recordAuthFailure(): void {
    this.increment('detector.auth_failures');
  }

  public recordPluginFailure(): void {
    this.increment('detector.plugin_failures');
  }

  public recordNetworkOutage(disconnected: boolean): void {
    this.setGauge('detector.network_connectivity_issues', disconnected ? 1 : 0);
    if (disconnected) {
      this.increment('detector.communication_failures');
    }
  }

  public recordUnexpectedException(): void {
    this.increment('detector.unexpected_exceptions');
  }
}
