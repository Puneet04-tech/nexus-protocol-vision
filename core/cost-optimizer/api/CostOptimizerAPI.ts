import { CostOptimizerService } from '../services/CostOptimizerService';
import { Budget, ScheduledJob, AlertRule, AlertNotification } from '../types';

export class CostOptimizerAPI {
  private service: CostOptimizerService;
  private lastRequestTime: number = 0;
  private rateLimitWindowMs: number = 100; // 100ms request threshold

  constructor(service: CostOptimizerService) {
    this.service = service;
  }

  /**
   * Rate Limiting check
   */
  private checkRateLimit(): { allowed: boolean; error?: string } {
    const now = Date.now();
    if (now - this.lastRequestTime < this.rateLimitWindowMs) {
      return { allowed: false, error: 'Rate limit exceeded: Please wait before sending another request.' };
    }
    this.lastRequestTime = now;
    return { allowed: true };
  }

  /**
   * Log API operations
   */
  private logAudit(userId: string, action: string, details: string, success: boolean): void {
    this.service.repository.addAuditLog({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      userId,
      action,
      details,
      success
    });
  }

  // Budgets API
  public getBudgets(role: string): Budget[] {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);
    
    // Access permission check
    if (!['admin', 'finops', 'viewer'].includes(role)) {
      this.logAudit('unknown', 'GET_BUDGETS', 'Access Denied: Invalid role permissions', false);
      throw new Error('Access Denied: Insufficient privileges.');
    }

    return this.service.budgeting.getBudgets();
  }

  public createBudget(budgetData: Partial<Budget>, role: string): { success: boolean; errors: string[] } {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) return { success: false, errors: [limitCheck.error!] };

    const result = this.service.budgeting.saveBudget(budgetData, role);
    this.logAudit(budgetData.ownerId || 'admin', 'CREATE_BUDGET', `Result success: ${result.success}. Limit: ${budgetData.limit}`, result.success);
    return result;
  }

  public deleteBudget(id: string, role: string): { success: boolean; errors: string[] } {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) return { success: false, errors: [limitCheck.error!] };

    const result = this.service.budgeting.deleteBudget(id, role);
    this.logAudit('operator', 'DELETE_BUDGET', `Deleted budget ID: ${id}, Success: ${result.success}`, result.success);
    return result;
  }

  // Recommendations API
  public getRecommendations(): any {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);

    // Dynamic scan run
    this.service.optimization.runOptimizationScan();
    return this.service.optimization.getRecommendations();
  }

  public applyRecommendation(id: string): boolean {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);

    const success = this.service.optimization.applyRecommendation(id);
    this.logAudit('admin', 'APPLY_RECOMMENDATION', `Applied recommendation ${id}, Success: ${success}`, success);
    return success;
  }

  // Workload scheduling API
  public getScheduledJobs(): ScheduledJob[] {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);
    return this.service.scheduler.getScheduledJobs();
  }

  public scheduleJob(jobData: Partial<ScheduledJob>): { success: boolean; errors: string[] } {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) return { success: false, errors: [limitCheck.error!] };

    const result = this.service.scheduler.scheduleJob(jobData);
    this.logAudit(jobData.userId || 'admin', 'SCHEDULE_JOB', `Scheduled job ${jobData.name}, Success: ${result.success}`, result.success);
    return result;
  }

  public cancelJob(id: string): boolean {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);

    const result = this.service.scheduler.cancelJob(id);
    this.logAudit('admin', 'CANCEL_JOB', `Cancelled job ${id}, Success: ${result}`, result);
    return result;
  }

  // Alerts API
  public getAlerts(): AlertNotification[] {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);
    return this.service.alerts.getNotifications();
  }

  public getAlertRules(): AlertRule[] {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);
    return this.service.alerts.getAlertRules();
  }

  public createAlertRule(rule: Partial<AlertRule>): { success: boolean; errors: string[] } {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) return { success: false, errors: [limitCheck.error!] };

    const result = this.service.alerts.saveRule(rule);
    this.logAudit('admin', 'CREATE_ALERT_RULE', `Rule name: ${rule.name}, Success: ${result.success}`, result.success);
    return result;
  }

  public deleteAlertRule(id: string): boolean {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);
    
    return this.service.alerts.deleteRule(id);
  }

  public acknowledgeAlert(id: string): void {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);
    this.service.alerts.acknowledgeAlert(id);
  }

  public clearAllAlerts(): void {
    this.service.alerts.clearAllAlerts();
  }

  // Analytics & Forecasts
  public getCostSummaryData(): any {
    const limitCheck = this.checkRateLimit();
    if (!limitCheck.allowed) throw new Error(limitCheck.error);

    const now = Date.now();
    const start = now - 30 * 24 * 60 * 60 * 1000;
    
    return {
      totalSpent30Days: this.service.analytics.getTotalCostSpent(start, now),
      hourlyTrend: this.service.analytics.getHourlyTrend(24),
      modelEfficiency: this.service.analytics.getModelEfficiency(),
      agentBreakdown: this.service.analytics.getAgentBreakdown(),
      workflowBreakdown: this.service.analytics.getWorkflowBreakdown(),
      resourceAverages: this.service.analytics.getResourceUtilizationSummary(24),
      roi: this.service.analytics.getSavingsROI(),
      forecast: this.service.forecaster.generateForecast(7)
    };
  }

  // Exporters
  public exportData(format: 'csv' | 'json' | 'pdf'): { fileName: string; content: string; mimeType: string } {
    return this.service.reports.downloadReport(format);
  }

  // Audit Logs
  public getAuditLogs(): any[] {
    return this.service.repository.getAuditLogs();
  }
}
