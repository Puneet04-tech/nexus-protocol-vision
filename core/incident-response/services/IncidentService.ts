import { IncidentRepository } from '../repository/IncidentRepository';
import { IncidentMetricsCollector } from '../monitoring/IncidentMetricsCollector';
import { IncidentDetector } from '../detection/IncidentDetector';
import { CheckpointManager } from '../checkpoints/CheckpointManager';
import { RecoveryEngine } from '../recovery/RecoveryEngine';
import { RecoveryScheduler } from '../scheduler/RecoveryScheduler';
import { AlertManager } from '../alerts/AlertManager';
import { IncidentAnalytics } from '../analytics/IncidentAnalytics';
import { ReportGenerator } from '../reporting/ReportGenerator';
import { TimelineManager } from '../timeline/TimelineManager';
import { Incident, Checkpoint, AlertRule, IncidentAlert, AuditLog, RecoveryJob, SreAnalytics } from '../types';

export class IncidentService {
  private static instance: IncidentService | null = null;

  // Dependencies
  private repo = IncidentRepository.getInstance();
  private collector = IncidentMetricsCollector.getInstance();
  private detector = IncidentDetector.getInstance();
  private cpManager = CheckpointManager.getInstance();
  private recoveryEngine = RecoveryEngine.getInstance();
  private scheduler = RecoveryScheduler.getInstance();
  private alertManager = AlertManager.getInstance();
  private analytics = IncidentAnalytics.getInstance();
  private reportGen = ReportGenerator.getInstance();
  private timeline = TimelineManager.getInstance();

  private constructor() {
    // Set up auto-recovery hooks
    this.detector.subscribeIncident((incident) => {
      // Trigger automated recovery for high/critical incidents
      if (incident.severity === 'critical' || incident.severity === 'high') {
        this.recoveryEngine.triggerRecovery(incident.id, incident.severity);
      }
    });

    // Subscribes alert to AlertManager notifications
    this.detector.subscribeAlert((alert) => {
      this.alertManager.notify(alert);
    });
  }

  public static getInstance(): IncidentService {
    if (!this.instance) {
      this.instance = new IncidentService();
    }
    return this.instance;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DATA QUERIES
  // ───────────────────────────────────────────────────────────────────────────

  public getIncidents(): Incident[] {
    return this.repo.getIncidents();
  }

  public getCheckpoints(): Checkpoint[] {
    return this.repo.getCheckpoints();
  }

  public getAlertRules(): AlertRule[] {
    return this.repo.getAlertRules();
  }

  public getAlerts(): IncidentAlert[] {
    return this.repo.getAlerts();
  }

  public getAuditLogs(): AuditLog[] {
    return this.repo.getAuditLogs();
  }

  public getRecoveryJobs(): RecoveryJob[] {
    return this.recoveryEngine.getRecoveryJobs();
  }

  public getAnalytics(): SreAnalytics {
    return this.analytics.calculateAnalytics();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MANUAL OVERRIDES & LIFE-CYCLE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Manually triggers a metric breach to test failovers
   */
  public manualTriggerIncident(ruleId: string): void {
    const rules = this.repo.getAlertRules();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found.`);

    // Force metric value to exceed rule threshold
    const forcedValue = rule.threshold + (rule.operator === 'lt' ? -5 : 5);
    this.collector.setGauge(rule.metricName, forcedValue);
    
    // Evaluate immediately
    this.detector.evaluateRules();

    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: 'ADMIN_OVERRIDE',
      action: 'TRIGGER_METRIC_BREACH',
      details: `Forced metric breach on ${rule.metricName} (value: ${forcedValue})`,
      success: true
    });
  }

  public manualAcknowledgeAlert(id: string, operatorName = 'ADMIN'): void {
    this.alertManager.acknowledgeAlert(id, operatorName);
  }

  public manualResolveIncident(id: string, operatorName = 'ADMIN'): void {
    const list = this.repo.getIncidents();
    const incident = list.find(i => i.id === id);
    if (incident) {
      incident.status = 'resolved';
      incident.resolvedAt = Date.now();
      this.timeline.appendEvent(incident, 'Incident manually closed by Administrator.', 'resolved', operatorName);
      
      // Also resolve active alert
      const activeAlert = this.repo.getAlerts().find(
        a => a.metricName === this.getMetricByComponent(incident.component) && !a.resolved
      );
      if (activeAlert) {
        activeAlert.resolved = true;
        activeAlert.resolvedAt = Date.now();
        this.repo.saveAlert(activeAlert);
      }

      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: operatorName,
        action: 'RESOLVE_INCIDENT',
        details: `Incident ${id} manually resolved by ${operatorName}`,
        success: true
      });
    }
  }

  public manualTriggerRecovery(incidentId: string, operatorName = 'ADMIN'): string {
    const list = this.repo.getIncidents();
    const incident = list.find(i => i.id === incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found.`);

    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: operatorName,
      action: 'MANUAL_TRIGGER_RECOVERY',
      details: `Manual recovery sequence started for incident ${incidentId}`,
      success: true
    });

    return this.recoveryEngine.triggerRecovery(incidentId, incident.severity);
  }

  public manualRollbackToCheckpoint(incidentId: string, checkpointId: string, operatorName = 'ADMIN'): void {
    const list = this.repo.getIncidents();
    const incident = list.find(i => i.id === incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found.`);

    // Restore checkpoint and verify signature integrity
    const checkpoint = this.cpManager.restoreCheckpoint(checkpointId);

    incident.checkpointId = checkpoint.id;
    incident.logs.push(`[ROLLBACK] MANUALLY rolled back workflow to checkpoint ${checkpointId}.`);
    this.timeline.appendEvent(
      incident,
      `Manual rollback triggered successfully to state signature ${checkpoint.signature.slice(0, 10)}...`,
      'recovery_step',
      operatorName
    );

    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: operatorName,
      action: 'ROLLBACK_TO_CHECKPOINT',
      details: `Manually rolled back incident ${incidentId} to checkpoint ${checkpointId}`,
      success: true
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECKPOINT CONFIG
  // ───────────────────────────────────────────────────────────────────────────

  public createCheckpoint(
    componentId: string,
    workflowState: string,
    contextSnapshot: Record<string, any>
  ): Checkpoint {
    return this.cpManager.createCheckpoint('manual', componentId, workflowState, contextSnapshot);
  }

  public deleteCheckpoint(id: string): void {
    this.repo.deleteCheckpoint(id);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ALERT RULES CONFIG
  // ───────────────────────────────────────────────────────────────────────────

  public createAlertRule(rule: Partial<AlertRule>): AlertRule {
    return this.alertManager.createRule(rule);
  }

  public toggleAlertRule(id: string, enabled: boolean): void {
    this.alertManager.toggleRule(id, enabled);
  }

  public deleteAlertRule(id: string): void {
    this.alertManager.deleteRule(id);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REPORTS
  // ───────────────────────────────────────────────────────────────────────────

  public exportReport(format: 'json' | 'csv' | 'pdf'): string | Blob {
    const analytics = this.getAnalytics();
    const incidents = this.getIncidents();
    if (format === 'json') {
      return this.reportGen.exportToJson(analytics, incidents);
    } else if (format === 'csv') {
      return this.reportGen.exportToCsv(incidents);
    } else {
      return this.reportGen.exportToPdf(analytics, incidents);
    }
  }

  public clearAllData(): void {
    this.repo.clearAllData();
    this.collector.resetMetrics();
  }

  public toggleSimulation(enabled: boolean): void {
    this.scheduler.setSimulationMode(enabled);
  }

  public getSimulationMode(): boolean {
    return this.scheduler.getSimulationMode();
  }

  private getMetricByComponent(component: string): string {
    switch (component) {
      case 'Sovereign Persona': return 'detector.agent_failures';
      case 'Workflow Orchestrator': return 'detector.workflow_failures';
      case 'Google Gemini API Gateway': return 'detector.api_timeouts';
      case 'Compute Resource Allocator': return 'detector.resource_exhaustion';
      case 'Digital Twin Security Registry': return 'detector.auth_failures';
      case 'Plugin Execution Sandbox': return 'detector.plugin_failures';
      case 'Decentralized P2P Mesh Network': return 'detector.network_connectivity_issues';
      case 'Inter-Agent Communication Hub': return 'detector.communication_failures';
      case 'Core System Kernel': return 'detector.unexpected_exceptions';
      default: return '';
    }
  }
}
export const incidentService = IncidentService.getInstance();
