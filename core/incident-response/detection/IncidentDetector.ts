import { IncidentRepository } from '../repository/IncidentRepository';
import { IncidentMetricsCollector } from '../monitoring/IncidentMetricsCollector';
import { Incident, IncidentAlert, IncidentSeverity } from '../types';
import { IncidentValidator } from '../validators/IncidentValidator';

export class IncidentDetector {
  private static instance: IncidentDetector | null = null;
  private repo = IncidentRepository.getInstance();
  private collector = IncidentMetricsCollector.getInstance();
  private alertListeners: Set<(alert: IncidentAlert) => void> = new Set();
  private incidentListeners: Set<(incident: Incident) => void> = new Set();

  private constructor() {}

  public static getInstance(): IncidentDetector {
    if (!this.instance) {
      this.instance = new IncidentDetector();
    }
    return this.instance;
  }

  public subscribeAlert(listener: (alert: IncidentAlert) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public subscribeIncident(listener: (incident: Incident) => void): () => void {
    this.incidentListeners.add(listener);
    return () => this.incidentListeners.delete(listener);
  }

  /**
   * Run the evaluation cycle of active metrics against alert rules.
   * Can be triggered manually or run on a scheduler loop.
   */
  public evaluateRules(): void {
    const rules = this.repo.getAlertRules();
    const metrics = this.collector.getAllMetrics();

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const value = metrics[rule.metricName] ?? 0;
      const breached = this.checkCondition(value, rule.operator, rule.threshold);

      if (breached) {
        this.triggerAlertAndIncident(rule.id, rule.metricName, value, rule.severity, rule.description);
      }
    }
  }

  private checkCondition(val: number, op: 'gt' | 'lt' | 'eq' | 'gte' | 'lte', threshold: number): boolean {
    switch (op) {
      case 'gt': return val > threshold;
      case 'lt': return val < threshold;
      case 'eq': return val === threshold;
      case 'gte': return val >= threshold;
      case 'lte': return val <= threshold;
      default: return false;
    }
  }

  private triggerAlertAndIncident(
    ruleId: string,
    metricName: string,
    value: number,
    severity: IncidentSeverity,
    description: string
  ): void {
    const alerts = this.repo.getAlerts();
    // Prevent duplicate triggers if alert is already active for this rule
    const isAlreadyActive = alerts.some(a => a.ruleId === ruleId && !a.resolved);
    if (isAlreadyActive) return;

    // 1. Create and Save Incident Alert
    const alertId = `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const alert: IncidentAlert = {
      id: alertId,
      ruleId,
      metricName,
      value,
      severity,
      message: `${description} (Current value: ${value})`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };

    this.repo.saveAlert(alert);
    this.notifyAlertListeners(alert);

    // 2. Create corresponding Incident
    const incidentId = `inc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const component = this.getComponentByMetric(metricName);
    const rootCause = this.getRootCauseByMetric(metricName, value);

    const incident: Incident = {
      id: incidentId,
      title: `Critical Breach: ${IncidentValidator.sanitizeString(description)}`,
      description: `Telemetry anomaly detected on ${metricName}. Threshold breached with value ${value}.`,
      status: 'active',
      severity,
      component,
      rootCause,
      detectedAt: Date.now(),
      timeline: [
        {
          id: `time_${Date.now()}_1`,
          timestamp: Date.now(),
          message: `Incident created due to alert ${alertId}. Metric: ${metricName}`,
          type: 'alert'
        }
      ],
      recoveryStepsTaken: [],
      logs: [`[INFO] Incident created. Severity: ${severity.toUpperCase()}. Component: ${component}`]
    };

    this.repo.saveIncident(incident);
    this.notifyIncidentListeners(incident);
  }

  private getComponentByMetric(metric: string): string {
    switch (metric) {
      case 'detector.agent_failures': return 'Sovereign Persona';
      case 'detector.workflow_failures': return 'Workflow Orchestrator';
      case 'detector.api_timeouts': return 'Google Gemini API Gateway';
      case 'detector.resource_exhaustion': return 'Compute Resource Allocator';
      case 'detector.auth_failures': return 'Digital Twin Security Registry';
      case 'detector.plugin_failures': return 'Plugin Execution Sandbox';
      case 'detector.network_connectivity_issues': return 'Decentralized P2P Mesh Network';
      case 'detector.communication_failures': return 'Inter-Agent Communication Hub';
      case 'detector.unexpected_exceptions': return 'Core System Kernel';
      default: return 'General Operations';
    }
  }

  private getRootCauseByMetric(metric: string, val: number): string {
    switch (metric) {
      case 'detector.agent_failures':
        return 'Sovereign Persona thread deadlock due to conflicting privacy and ethical policies.';
      case 'detector.workflow_failures':
        return 'Workflow Execution Graph loop constraint detected, causing parallel tasks crash.';
      case 'detector.api_timeouts':
        return 'Gemini API tokens limit rate hit (HTTP 429) or transient backend timeout.';
      case 'detector.resource_exhaustion':
        return `Memory consumption limit breached, exceeding SLA threshold (${val}%).`;
      case 'detector.auth_failures':
        return 'Sovereign identity signature verification failed. Potential brute-force attempt.';
      case 'detector.plugin_failures':
        return 'Sandbox boundary violation in dynamic Plugin execution sandbox.';
      case 'detector.network_connectivity_issues':
        return 'Node lost connection to the decentralized bootstrap mesh gateways.';
      case 'detector.communication_failures':
        return 'Decentralized cryptographic peer negotiations failed to sign weight transfers.';
      case 'detector.unexpected_exceptions':
        return 'Unhandled JavaScript heap memory exception or stack overflow error.';
      default:
        return 'Unexpected SRE telemetry metric variation.';
    }
  }

  private notifyAlertListeners(alert: IncidentAlert): void {
    for (const l of this.alertListeners) {
      try {
        l(alert);
      } catch (e) {}
    }
  }

  private notifyIncidentListeners(incident: Incident): void {
    for (const l of this.incidentListeners) {
      try {
        l(incident);
      } catch (e) {}
    }
  }
}
