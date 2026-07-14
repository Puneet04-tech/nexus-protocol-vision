import { AlertRule, ActiveAlert, MetricRecord } from './MonitoringTypes';

export type AlertCallback = (alert: ActiveAlert, action: 'trigger' | 'resolve') => void;

/**
 * Handles checking metric conditions, managing threshold breaches, and notifying listeners
 */
export class AlertEngine {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private history: ActiveAlert[] = [];
  private callbacks: Set<AlertCallback> = new Set();

  constructor() {
    this.seedDefaultRules();
  }

  private seedDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'rule_cpu_high',
        metricName: 'system.cpu_load_percent',
        operator: 'gt',
        threshold: 85,
        severity: 'warning',
        description: 'System CPU Load is unusually high'
      },
      {
        id: 'rule_mem_high',
        metricName: 'system.memory_usage_mb',
        operator: 'gt',
        threshold: 6000,
        severity: 'warning',
        description: 'Memory usage exceeds warning threshold (6000 MB)'
      },
      {
        id: 'rule_event_loop_lag',
        metricName: 'system.event_loop_delay_ms',
        operator: 'gt',
        threshold: 150,
        severity: 'warning',
        description: 'Severe event loop delay / thread lag detected'
      },
      {
        id: 'rule_error_rate_high',
        metricName: 'perf.error_rate',
        operator: 'gt',
        threshold: 8,
        severity: 'critical',
        description: 'System request failure rate exceeds critical limit'
      },
      {
        id: 'rule_threat_spike',
        metricName: 'threat.active_count',
        operator: 'gt',
        threshold: 0,
        severity: 'critical',
        description: 'Active adversarial threat detected in execution sandbox'
      },
      {
        id: 'rule_carbon_budget_exceeded',
        metricName: 'carbon.budget_used_percent',
        operator: 'gt',
        threshold: 90,
        severity: 'warning',
        description: 'Carbon emissions approaching daily budget ceiling'
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }
  }

  public subscribe(cb: AlertCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(id: string): void {
    this.rules.delete(id);
    this.resolveAlertByRule(id);
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(): ActiveAlert[] {
    return this.history;
  }

  /**
   * Evaluates incoming telemetry record against all matching rules
   */
  public evaluateMetric(record: MetricRecord): void {
    for (const rule of this.rules.values()) {
      if (rule.metricName !== record.name) continue;

      const breached = this.checkCondition(record.value, rule.operator, rule.threshold);
      const alertId = `${rule.id}:${record.name}`;

      if (breached) {
        if (!this.activeAlerts.has(alertId)) {
          // Trigger new alert
          const newAlert: ActiveAlert = {
            id: alertId,
            ruleId: rule.id,
            metricName: record.name,
            value: record.value,
            severity: rule.severity,
            message: `${rule.description} (Value: ${record.value})`,
            timestamp: Date.now()
          };
          this.activeAlerts.set(alertId, newAlert);
          this.history.push({ ...newAlert });
          if (this.history.length > 200) this.history.shift();
          
          this.notifyListeners(newAlert, 'trigger');
        }
      } else {
        if (this.activeAlerts.has(alertId)) {
          // Resolve existing alert
          const active = this.activeAlerts.get(alertId)!;
          active.resolvedAt = Date.now();
          this.activeAlerts.delete(alertId);

          // Update resolution in history list
          const histIndex = this.history.findIndex(h => h.id === alertId && !h.resolvedAt);
          if (histIndex !== -1) {
            this.history[histIndex].resolvedAt = Date.now();
          }

          this.notifyListeners(active, 'resolve');
        }
      }
    }
  }

  private checkCondition(val: number, op: AlertRule['operator'], threshold: number): boolean {
    switch (op) {
      case 'gt': return val > threshold;
      case 'lt': return val < threshold;
      case 'eq': return val === threshold;
      case 'gte': return val >= threshold;
      case 'lte': return val <= threshold;
      default: return false;
    }
  }

  private resolveAlertByRule(ruleId: string): void {
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.ruleId === ruleId) {
        alert.resolvedAt = Date.now();
        this.activeAlerts.delete(alertId);
        this.notifyListeners(alert, 'resolve');
      }
    }
  }

  private notifyListeners(alert: ActiveAlert, action: 'trigger' | 'resolve'): void {
    for (const cb of this.callbacks) {
      try {
        cb(alert, action);
      } catch (e) {}
    }
  }
}
