import { Incident, Checkpoint, AlertRule, IncidentAlert, AuditLog } from '../types';

export class IncidentRepository {
  private static instance: IncidentRepository | null = null;

  private keys = {
    incidents: 'nexus_incidents',
    checkpoints: 'nexus_checkpoints',
    rules: 'nexus_incident_rules',
    alerts: 'nexus_incident_alerts',
    auditLogs: 'nexus_incident_audit_logs'
  };

  private constructor() {
    this.seedDefaultRules();
  }

  public static getInstance(): IncidentRepository {
    if (!this.instance) {
      this.instance = new IncidentRepository();
    }
    return this.instance;
  }

  private seedDefaultRules(): void {
    const existing = localStorage.getItem(this.keys.rules);
    if (!existing) {
      const defaultRules: AlertRule[] = [
        {
          id: 'rule_agent_failure',
          metricName: 'detector.agent_failures',
          operator: 'gt',
          threshold: 0,
          severity: 'critical',
          description: 'AI Sovereign Agent execution crash or state failure',
          enabled: true
        },
        {
          id: 'rule_workflow_failure',
          metricName: 'detector.workflow_failures',
          operator: 'gt',
          threshold: 0,
          severity: 'high',
          description: 'Orchestrator task failure or execution block',
          enabled: true
        },
        {
          id: 'rule_api_timeout',
          metricName: 'detector.api_timeouts',
          operator: 'gt',
          threshold: 0,
          severity: 'medium',
          description: 'External endpoint or Gemini API response timeout',
          enabled: true
        },
        {
          id: 'rule_resource_exhaustion',
          metricName: 'detector.resource_exhaustion',
          operator: 'gt',
          threshold: 95,
          severity: 'critical',
          description: 'Compute space or storage capacity approaching exhaustion threshold',
          enabled: true
        },
        {
          id: 'rule_auth_failures',
          metricName: 'detector.auth_failures',
          operator: 'gt',
          threshold: 2,
          severity: 'critical',
          description: 'Multiple unauthorized digital twin access attempts',
          enabled: true
        }
      ];
      localStorage.setItem(this.keys.rules, JSON.stringify(defaultRules));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INCIDENTS PERSISTENCE
  // ───────────────────────────────────────────────────────────────────────────

  public getIncidents(): Incident[] {
    const data = localStorage.getItem(this.keys.incidents);
    return data ? JSON.parse(data) : [];
  }

  public saveIncident(incident: Incident): void {
    const list = this.getIncidents();
    const index = list.findIndex(i => i.id === incident.id);
    if (index !== -1) {
      list[index] = incident;
    } else {
      list.push(incident);
    }
    localStorage.setItem(this.keys.incidents, JSON.stringify(list));
  }

  public deleteIncident(id: string): void {
    const list = this.getIncidents();
    const filtered = list.filter(i => i.id !== id);
    localStorage.setItem(this.keys.incidents, JSON.stringify(filtered));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHECKPOINTS PERSISTENCE
  // ───────────────────────────────────────────────────────────────────────────

  public getCheckpoints(): Checkpoint[] {
    const data = localStorage.getItem(this.keys.checkpoints);
    return data ? JSON.parse(data) : [];
  }

  public saveCheckpoint(checkpoint: Checkpoint): void {
    const list = this.getCheckpoints();
    const index = list.findIndex(c => c.id === checkpoint.id);
    if (index !== -1) {
      list[index] = checkpoint;
    } else {
      list.push(checkpoint);
    }
    localStorage.setItem(this.keys.checkpoints, JSON.stringify(list));
  }

  public deleteCheckpoint(id: string): void {
    const list = this.getCheckpoints();
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(this.keys.checkpoints, JSON.stringify(filtered));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ALERT RULES PERSISTENCE
  // ───────────────────────────────────────────────────────────────────────────

  public getAlertRules(): AlertRule[] {
    const data = localStorage.getItem(this.keys.rules);
    return data ? JSON.parse(data) : [];
  }

  public saveAlertRule(rule: AlertRule): void {
    const list = this.getAlertRules();
    const index = list.findIndex(r => r.id === rule.id);
    if (index !== -1) {
      list[index] = rule;
    } else {
      list.push(rule);
    }
    localStorage.setItem(this.keys.rules, JSON.stringify(list));
  }

  public deleteAlertRule(id: string): void {
    const list = this.getAlertRules();
    const filtered = list.filter(r => r.id !== id);
    localStorage.setItem(this.keys.rules, JSON.stringify(filtered));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ALERT LOGS PERSISTENCE
  // ───────────────────────────────────────────────────────────────────────────

  public getAlerts(): IncidentAlert[] {
    const data = localStorage.getItem(this.keys.alerts);
    return data ? JSON.parse(data) : [];
  }

  public saveAlert(alert: IncidentAlert): void {
    const list = this.getAlerts();
    const index = list.findIndex(a => a.id === alert.id);
    if (index !== -1) {
      list[index] = alert;
    } else {
      list.push(alert);
    }
    localStorage.setItem(this.keys.alerts, JSON.stringify(list));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AUDIT LOGS PERSISTENCE
  // ───────────────────────────────────────────────────────────────────────────

  public getAuditLogs(): AuditLog[] {
    const data = localStorage.getItem(this.keys.auditLogs);
    return data ? JSON.parse(data) : [];
  }

  public saveAuditLog(log: AuditLog): void {
    const list = this.getAuditLogs();
    list.push(log);
    // Limit audit logs to last 1000 items to avoid quota breach
    if (list.length > 1000) {
      list.shift();
    }
    localStorage.setItem(this.keys.auditLogs, JSON.stringify(list));
  }

  public clearAllData(): void {
    localStorage.removeItem(this.keys.incidents);
    localStorage.removeItem(this.keys.checkpoints);
    localStorage.removeItem(this.keys.alerts);
    localStorage.removeItem(this.keys.auditLogs);
    this.seedDefaultRules();
  }
}
