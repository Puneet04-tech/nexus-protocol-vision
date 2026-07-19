import { Checkpoint, Incident, AlertRule } from '../types';

export class IncidentValidator {
  /**
   * Sanitizes strings to prevent basic HTML/script injection
   */
  public static sanitizeString(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validates a checkpoint instance
   */
  public static validateCheckpoint(checkpoint: any): checkpoint is Checkpoint {
    if (!checkpoint || typeof checkpoint !== 'object') {
      throw new Error('Checkpoint must be an object.');
    }
    if (typeof checkpoint.id !== 'string' || checkpoint.id.trim() === '') {
      throw new Error('Invalid checkpoint ID.');
    }
    if (typeof checkpoint.componentId !== 'string' || checkpoint.componentId.trim() === '') {
      throw new Error('Invalid checkpoint componentId.');
    }
    if (typeof checkpoint.workflowState !== 'string') {
      throw new Error('Checkpoint workflowState must be a string.');
    }
    if (!checkpoint.contextSnapshot || typeof checkpoint.contextSnapshot !== 'object') {
      throw new Error('Checkpoint contextSnapshot must be a valid object.');
    }
    if (typeof checkpoint.signature !== 'string' || checkpoint.signature.trim() === '') {
      throw new Error('Checkpoint checksum signature is missing or invalid.');
    }
    return true;
  }

  /**
   * Validates custom alert rule inputs
   */
  public static validateAlertRule(rule: Partial<AlertRule>): void {
    if (!rule.id || typeof rule.id !== 'string') {
      throw new Error('Alert Rule ID must be a valid non-empty string.');
    }
    if (!rule.metricName || typeof rule.metricName !== 'string' || rule.metricName.trim() === '') {
      throw new Error('Metric Name is required.');
    }
    if (!['gt', 'lt', 'eq', 'gte', 'lte'].includes(rule.operator || '')) {
      throw new Error('Invalid operator. Supported operators: gt, lt, eq, gte, lte');
    }
    if (typeof rule.threshold !== 'number' || isNaN(rule.threshold)) {
      throw new Error('Threshold must be a valid number.');
    }
    if (!['low', 'medium', 'high', 'critical'].includes(rule.severity || '')) {
      throw new Error('Invalid severity level.');
    }
    if (typeof rule.description !== 'string') {
      throw new Error('Description must be a string.');
    }
  }

  /**
   * Validates incoming Incident override details
   */
  public static validateIncidentUpdate(incident: Partial<Incident>): void {
    if (incident.title !== undefined && (typeof incident.title !== 'string' || incident.title.trim() === '')) {
      throw new Error('Incident title must be a non-empty string.');
    }
    if (incident.severity !== undefined && !['low', 'medium', 'high', 'critical'].includes(incident.severity)) {
      throw new Error('Incident severity must be low, medium, high, or critical.');
    }
    if (incident.status !== undefined && !['active', 'investigating', 'recovering', 'resolved'].includes(incident.status)) {
      throw new Error('Incident status must be active, investigating, recovering, or resolved.');
    }
  }
}
