import { Budget, AlertRule, ScheduledJob } from '../types';

export class CostValidator {
  public static validateBudget(budget: Partial<Budget>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!budget.id || typeof budget.id !== 'string') {
      errors.push('Budget ID is required and must be a string.');
    }
    if (!budget.name || typeof budget.name !== 'string' || budget.name.trim().length === 0) {
      errors.push('Budget name is required and cannot be empty.');
    }
    if (!budget.type || !['daily', 'weekly', 'monthly', 'project', 'team', 'department'].includes(budget.type)) {
      errors.push('Budget type must be one of: daily, weekly, monthly, project, team, department.');
    }
    if (budget.limit === undefined || typeof budget.limit !== 'number' || budget.limit <= 0) {
      errors.push('Budget limit must be a positive number.');
    }
    if (budget.alertThresholds && Array.isArray(budget.alertThresholds)) {
      for (const threshold of budget.alertThresholds) {
        if (typeof threshold !== 'number' || threshold <= 0 || threshold > 2.0) {
          errors.push('Alert thresholds must be numbers between 0 and 2.0 (representing up to 200% overspend limit).');
        }
      }
    } else {
      errors.push('Alert thresholds must be an array of numbers.');
    }
    if (!budget.ownerId || typeof budget.ownerId !== 'string') {
      errors.push('Budget owner ID is required.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public static validateAlertRule(rule: Partial<AlertRule>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.id || typeof rule.id !== 'string') {
      errors.push('Rule ID is required.');
    }
    if (!rule.name || typeof rule.name !== 'string' || rule.name.trim().length === 0) {
      errors.push('Rule name is required and cannot be empty.');
    }
    if (!rule.metricType || !['cost', 'cpu', 'memory', 'gpu', 'budget_breach', 'concurrency'].includes(rule.metricType)) {
      errors.push('Invalid metric type.');
    }
    if (rule.thresholdValue === undefined || typeof rule.thresholdValue !== 'number' || rule.thresholdValue < 0) {
      errors.push('Threshold value must be a non-negative number.');
    }
    if (rule.durationMinutes === undefined || typeof rule.durationMinutes !== 'number' || rule.durationMinutes < 0) {
      errors.push('Duration in minutes must be a non-negative number.');
    }
    if (!rule.severity || !['info', 'warning', 'critical'].includes(rule.severity)) {
      errors.push('Severity must be info, warning, or critical.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public static validateScheduledJob(job: Partial<ScheduledJob>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!job.id || typeof job.id !== 'string') {
      errors.push('Job ID is required.');
    }
    if (!job.name || typeof job.name !== 'string' || job.name.trim().length === 0) {
      errors.push('Job name is required.');
    }
    if (!job.targetModel || typeof job.targetModel !== 'string') {
      errors.push('Target model is required.');
    }
    if (job.estimatedCostUsd === undefined || typeof job.estimatedCostUsd !== 'number' || job.estimatedCostUsd < 0) {
      errors.push('Estimated cost must be a non-negative number.');
    }
    if (!job.carbonPriority || !['low', 'medium', 'high'].includes(job.carbonPriority)) {
      errors.push('Carbon priority must be low, medium, or high.');
    }
    if (job.scheduledTime === undefined || typeof job.scheduledTime !== 'number' || job.scheduledTime < Date.now()) {
      errors.push('Scheduled time must be a timestamp in the future.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
export const defaultCostValidator = new CostValidator();
