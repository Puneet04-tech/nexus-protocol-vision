import { CollaborationWorkflow } from '../types';

export interface ScheduleRule {
  id: string;
  workflowId: string;
  enabled: boolean;
  type: 'interval' | 'cron' | 'event';
  value: string; // e.g. "30s", "*/5 * * * *", "sensor.telemetry.carbon"
  lastTriggered?: number;
}

export class WorkflowScheduler {
  private static rules: ScheduleRule[] = [];
  private static activeTimers = new Map<string, any>();

  /**
   * Registers a workflow scheduling rule.
   */
  public static registerRule(
    workflowId: string,
    type: 'interval' | 'cron' | 'event',
    value: string,
    onTrigger: (workflowId: string) => void
  ): ScheduleRule {
    const rule: ScheduleRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      workflowId,
      enabled: true,
      type,
      value
    };

    this.rules.push(rule);

    if (type === 'interval') {
      const match = value.match(/^(\d+)(s|m|h)$/);
      if (match) {
        const amt = parseInt(match[1], 10);
        const unit = match[2];
        let ms = amt * 1000;
        if (unit === 'm') ms *= 60;
        if (unit === 'h') ms *= 3600;

        const timer = setInterval(() => {
          if (rule.enabled) {
            rule.lastTriggered = Date.now();
            onTrigger(workflowId);
          }
        }, ms);
        this.activeTimers.set(rule.id, timer);
      }
    }

    return rule;
  }

  /**
   * Disables or deletes a rule.
   */
  public static disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
    const timer = this.activeTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(ruleId);
    }
  }

  public static listRules(): ScheduleRule[] {
    return this.rules;
  }

  public static clear(): void {
    this.activeTimers.forEach(timer => clearInterval(timer));
    this.activeTimers.clear();
    this.rules = [];
  }
}
