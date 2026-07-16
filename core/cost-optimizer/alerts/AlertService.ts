import { AlertRule, AlertNotification, ResourceMetrics, Budget } from '../types';
import { CostRepository } from '../repository/CostRepository';
import { CostValidator } from '../validators/CostValidator';

export class AlertService {
  private repository: CostRepository;

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  public getAlertRules(): AlertRule[] {
    return this.repository.getAlertRules();
  }

  public getNotifications(): AlertNotification[] {
    return this.repository.getAlertNotifications();
  }

  public saveRule(ruleData: Partial<AlertRule>): { success: boolean; errors: string[] } {
    const id = ruleData.id || `rule-${Date.now()}`;
    const rule: AlertRule = {
      id,
      name: ruleData.name || 'Custom Rule',
      metricType: ruleData.metricType || 'cpu',
      thresholdValue: ruleData.thresholdValue !== undefined ? ruleData.thresholdValue : 80,
      durationMinutes: ruleData.durationMinutes !== undefined ? ruleData.durationMinutes : 5,
      severity: ruleData.severity || 'warning',
      enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
      targetId: ruleData.targetId
    };

    const validation = CostValidator.validateAlertRule(rule);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    this.repository.saveAlertRule(rule);
    
    // Add audit log
    this.repository.addAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      userId: 'admin',
      action: 'SAVE_ALERT_RULE',
      details: `Saved alert rule "${rule.name}" for metric ${rule.metricType}`,
      success: true
    });

    return { success: true, errors: [] };
  }

  public deleteRule(id: string): boolean {
    const deleted = this.repository.deleteAlertRule(id);
    if (deleted) {
      this.repository.addAuditLog({
        id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        userId: 'admin',
        action: 'DELETE_ALERT_RULE',
        details: `Deleted alert rule ID: ${id}`,
        success: true
      });
      return true;
    }
    return false;
  }

  public acknowledgeAlert(id: string): void {
    this.repository.acknowledgeAlert(id);
  }

  public clearAllAlerts(): void {
    this.repository.clearAllAlerts();
  }

  /**
   * Evaluates resource metrics logs to check for threshold violations
   */
  public evaluateResourceMetrics(metrics: ResourceMetrics): AlertNotification[] {
    const rules = this.repository.getAlertRules().filter(r => r.enabled);
    const triggered: AlertNotification[] = [];

    rules.forEach(rule => {
      let isBreached = false;
      let currentValue = 0;
      let unit = '';

      if (rule.metricType === 'cpu') {
        isBreached = metrics.cpuUtilization >= rule.thresholdValue;
        currentValue = metrics.cpuUtilization;
        unit = '%';
      } else if (rule.metricType === 'gpu') {
        isBreached = metrics.gpuUtilization >= rule.thresholdValue;
        currentValue = metrics.gpuUtilization;
        unit = '%';
      } else if (rule.metricType === 'memory') {
        isBreached = metrics.memoryUsageMb >= rule.thresholdValue;
        currentValue = metrics.memoryUsageMb;
        unit = ' MB';
      } else if (rule.metricType === 'concurrency') {
        isBreached = metrics.concurrentExecutions >= rule.thresholdValue;
        currentValue = metrics.concurrentExecutions;
        unit = ' tasks';
      }

      if (isBreached) {
        const id = `alert-${Date.now()}-${rule.id}`;
        const alert: AlertNotification = {
          id,
          ruleId: rule.id,
          title: `Resource Warning: ${rule.name}`,
          message: `Metric value ${currentValue}${unit} exceeded limit ${rule.thresholdValue}${unit} on active system nodes.`,
          severity: rule.severity,
          value: currentValue,
          timestamp: Date.now(),
          acknowledged: false
        };

        this.repository.addAlertNotification(alert);
        triggered.push(alert);
      }
    });

    return triggered;
  }

  /**
   * Evaluates budget updates to check for budget limit breaches
   */
  public evaluateBudgetStatus(budget: Budget, newlyTriggeredThresholds: number[]): AlertNotification[] {
    const triggered: AlertNotification[] = [];

    newlyTriggeredThresholds.forEach(threshold => {
      const severity = threshold >= 1.0 ? 'critical' : 'warning';
      const percentageStr = `${Math.round(threshold * 100)}%`;
      const id = `alert-${Date.now()}-budget-${budget.id}-${threshold}`;
      
      const alert: AlertNotification = {
        id,
        ruleId: `rule-budget-${budget.id}`,
        title: `Budget Alert: ${budget.name}`,
        message: `Spending reached ${percentageStr} of the total $${budget.limit} limit. (Spent: $${budget.currentSpent.toFixed(2)})`,
        severity,
        value: Number((budget.currentSpent / budget.limit * 100).toFixed(1)),
        timestamp: Date.now(),
        acknowledged: false
      };

      this.repository.addAlertNotification(alert);
      triggered.push(alert);
    });

    return triggered;
  }
}
