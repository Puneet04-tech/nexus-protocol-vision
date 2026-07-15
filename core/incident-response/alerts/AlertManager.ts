import { AlertRule, IncidentAlert, IncidentSeverity } from '../types';
import { IncidentRepository } from '../repository/IncidentRepository';
import { IncidentValidator } from '../validators/IncidentValidator';

export class AlertManager {
  private static instance: AlertManager | null = null;
  private repo = IncidentRepository.getInstance();
  private listeners: Set<(alert: IncidentAlert) => void> = new Set();

  private constructor() {}

  public static getInstance(): AlertManager {
    if (!this.instance) {
      this.instance = new AlertManager();
    }
    return this.instance;
  }

  public subscribe(listener: (alert: IncidentAlert) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(alert: IncidentAlert): void {
    for (const l of this.listeners) {
      try {
        l(alert);
      } catch (e) {}
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RULE CONTROLLERS
  // ───────────────────────────────────────────────────────────────────────────

  public getRules(): AlertRule[] {
    return this.repo.getAlertRules();
  }

  public createRule(rule: Partial<AlertRule>): AlertRule {
    const id = rule.id || `rule_${Date.now()}`;
    const newRule: AlertRule = {
      id,
      metricName: rule.metricName || '',
      operator: rule.operator || 'gt',
      threshold: rule.threshold !== undefined ? rule.threshold : 0,
      severity: rule.severity || 'medium',
      description: rule.description || 'Custom Alert Trigger',
      enabled: rule.enabled !== undefined ? rule.enabled : true
    };

    IncidentValidator.validateAlertRule(newRule);
    this.repo.saveAlertRule(newRule);
    
    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: 'ADMIN',
      action: 'CREATE_ALERT_RULE',
      details: `Created alert rule ${id} for metric ${newRule.metricName}`,
      success: true
    });

    return newRule;
  }

  public toggleRule(id: string, enabled: boolean): void {
    const rules = this.repo.getAlertRules();
    const rule = rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = enabled;
      this.repo.saveAlertRule(rule);

      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: 'ADMIN',
        action: 'TOGGLE_ALERT_RULE',
        details: `Toggled rule ${id} to ${enabled ? 'ENABLED' : 'DISABLED'}`,
        success: true
      });
    }
  }

  public deleteRule(id: string): void {
    this.repo.deleteAlertRule(id);
    this.repo.saveAuditLog({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      operator: 'ADMIN',
      action: 'DELETE_ALERT_RULE',
      details: `Deleted rule ${id}`,
      success: true
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ALERTS LIFECYCLE
  // ───────────────────────────────────────────────────────────────────────────

  public getActiveAlerts(): IncidentAlert[] {
    return this.repo.getAlerts().filter(a => !a.resolved);
  }

  public getAlertHistory(): IncidentAlert[] {
    return this.repo.getAlerts();
  }

  public acknowledgeAlert(id: string, operatorName = 'ADMIN'): void {
    const list = this.repo.getAlerts();
    const alert = list.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = operatorName;
      this.repo.saveAlert(alert);

      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: operatorName,
        action: 'ACKNOWLEDGE_ALERT',
        details: `Acknowledged alert ${id}`,
        success: true
      });
    }
  }

  public resolveAlert(id: string): void {
    const list = this.repo.getAlerts();
    const alert = list.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.repo.saveAlert(alert);

      this.repo.saveAuditLog({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        operator: 'SYSTEM',
        action: 'RESOLVE_ALERT',
        details: `Resolved alert ${id}`,
        success: true
      });
    }
  }
}
