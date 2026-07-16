import { 
  Budget, 
  AlertRule, 
  AlertNotification, 
  ModelUsageRecord, 
  ResourceMetrics, 
  OptimizationRecommendation,
  ScheduledJob,
  CostAuditLog
} from '../types';

export class CostRepository {
  private budgetsKey = 'nexus_cost_budgets';
  private rulesKey = 'nexus_cost_alert_rules';
  private alertsKey = 'nexus_cost_alerts';
  private usagesKey = 'nexus_cost_usages';
  private resourcesKey = 'nexus_cost_resources';
  private recommendationsKey = 'nexus_cost_recommendations';
  private schedulesKey = 'nexus_cost_schedules';
  private auditKey = 'nexus_cost_audit';

  constructor() {
    this.initializeDefaults();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) return defaultValue;
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  private initializeDefaults(): void {
    // Seed default budgets if empty
    const currentBudgets = this.getBudgets();
    if (currentBudgets.length === 0) {
      const start = Date.now();
      const end = start + 30 * 24 * 60 * 60 * 1000;
      const seedBudgets: Budget[] = [
        {
          id: 'b-global-monthly',
          name: 'Global Monthly Cap',
          type: 'monthly',
          limit: 1500.0,
          currentSpent: 420.50,
          startDate: start,
          endDate: end,
          ownerId: 'admin',
          alertThresholds: [0.5, 0.8, 1.0],
          notificationsSent: {},
          createdAt: start
        },
        {
          id: 'b-agent-marketplace',
          name: 'AI Agent Marketplace Sandbox',
          type: 'project',
          limit: 300.0,
          currentSpent: 285.40, // Trigger high warnings
          startDate: start,
          endDate: end,
          ownerId: 'agent-system',
          targetId: 'marketplace',
          alertThresholds: [0.5, 0.8, 0.9, 1.0],
          notificationsSent: { 0.5: true, 0.8: true },
          createdAt: start
        },
        {
          id: 'b-research-dev',
          name: 'R&D Department Budget',
          type: 'department',
          limit: 500.0,
          currentSpent: 120.00,
          startDate: start,
          endDate: end,
          ownerId: 'finops',
          targetId: 'rnd',
          alertThresholds: [0.8, 1.0],
          notificationsSent: {},
          createdAt: start
        }
      ];
      this.setStorageItem(this.budgetsKey, seedBudgets);
    }

    // Seed default Alert Rules
    const currentRules = this.getAlertRules();
    if (currentRules.length === 0) {
      const seedRules: AlertRule[] = [
        {
          id: 'rule-budget-90',
          name: 'Global Budget Warning at 90%',
          metricType: 'budget_breach',
          thresholdValue: 90.0, // %
          durationMinutes: 0,
          severity: 'warning',
          enabled: true
        },
        {
          id: 'rule-budget-100',
          name: 'Global Budget Breach Critical',
          metricType: 'budget_breach',
          thresholdValue: 100.0, // %
          durationMinutes: 0,
          severity: 'critical',
          enabled: true
        },
        {
          id: 'rule-gpu-spike',
          name: 'GPU Spike Anomaly',
          metricType: 'gpu',
          thresholdValue: 95.0, // %
          durationMinutes: 5,
          severity: 'critical',
          enabled: true
        },
        {
          id: 'rule-memory-leak',
          name: 'High Memory Leak Warning',
          metricType: 'memory',
          thresholdValue: 4096.0, // MB
          durationMinutes: 10,
          severity: 'warning',
          enabled: true
        }
      ];
      this.setStorageItem(this.rulesKey, seedRules);
    }

    // Seed recommendations
    const currentRecs = this.getRecommendations();
    if (currentRecs.length === 0) {
      const seedRecs: OptimizationRecommendation[] = [
        {
          id: 'rec-rag-switch',
          category: 'model_selection',
          title: 'Switch RAG search queries to gemini-2.5-flash',
          description: 'RAG Semantic Searcher is routing standard search queries to gemini-2.5-pro. Switching simple summarizations to gemini-2.5-flash yields 82% cost reduction with minimal semantic loss.',
          potentialSavingsUsd: 142.50,
          impactLevel: 'high',
          difficulty: 'easy',
          targetComponent: 'marketplace.rag.searcher',
          applied: false,
          timestamp: Date.now() - 3600000,
          actionDetails: {
            currentModel: 'gemini-2.5-pro',
            alternativeModel: 'gemini-2.5-flash',
            accuracyDelta: -0.015
          }
        },
        {
          id: 'rec-idle-collaboration',
          category: 'idle_resource',
          title: 'Deactivate idle agent containers in Collaboration Studio',
          description: 'We detected 3 Peer-to-Peer Model Broker instances running active loops without processing gradient transactions for 4 hours.',
          potentialSavingsUsd: 58.00,
          impactLevel: 'medium',
          difficulty: 'easy',
          targetComponent: 'collaboration-studio',
          applied: false,
          timestamp: Date.now() - 7200000,
          actionDetails: {
            idleHours: 4,
            containers: 3
          }
        },
        {
          id: 'rec-cache-mem',
          category: 'caching',
          title: 'Enable Universal Memory Cache on repetitive persona queries',
          description: 'Identical memory semantic lookups are queried over 120 times an hour. Caching these reads localizes execution and drops cognitive latency.',
          potentialSavingsUsd: 85.00,
          impactLevel: 'medium',
          difficulty: 'moderate',
          targetComponent: 'memory-search',
          applied: false,
          timestamp: Date.now() - 10800000,
          actionDetails: {
            cacheHitRateIncrease: 0.45
          }
        }
      ];
      this.setStorageItem(this.recommendationsKey, seedRecs);
    }

    // Seed historical usage
    const usages = this.getModelUsages();
    if (usages.length === 0) {
      const seedUsages: ModelUsageRecord[] = [];
      const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemma-2b-it'];
      const agents = ['marketplace.rag.searcher', 'marketplace.sentiment.oracle', 'marketplace.carbon.optimizer'];
      
      const now = Date.now();
      for (let i = 24; i >= 0; i--) {
        const hourTime = now - i * 3600000;
        seedUsages.push({
          timestamp: hourTime,
          modelName: models[i % models.length],
          inputTokens: 1200 + (i * 150) % 500,
          outputTokens: 600 + (i * 100) % 300,
          calculatedCost: 0.05 + (i * 0.1) % 0.8,
          agentId: agents[i % agents.length],
          workflowId: `wf-workflow-${i}`,
          userId: 'user-default'
        });
      }
      this.setStorageItem(this.usagesKey, seedUsages);
    }

    // Seed resource history
    const resources = this.getResourceHistory();
    if (resources.length === 0) {
      const seedResources: ResourceMetrics[] = [];
      const now = Date.now();
      for (let i = 24; i >= 0; i--) {
        const hourTime = now - i * 3600000;
        seedResources.push({
          timestamp: hourTime,
          cpuUtilization: 15 + (i * 7) % 60,
          memoryUsageMb: 1200 + (i * 128) % 2048,
          gpuUtilization: 5 + (i * 12) % 85,
          diskUsageGb: 45.2,
          storageUsageBytes: 150000 + i * 200,
          networkBandwidthKbps: 512 + (i * 32) % 2048,
          concurrentExecutions: 2 + i % 5,
          executionDurationMs: 400 + (i * 50) % 900,
          energyConsumptionKwh: 0.12 + (i * 0.05) % 0.8
        });
      }
      this.setStorageItem(this.resourcesKey, seedResources);
    }
  }

  // Budgets CRUD
  public getBudgets(): Budget[] {
    return this.getStorageItem<Budget[]>(this.budgetsKey, []);
  }

  public saveBudget(budget: Budget): void {
    const budgets = this.getBudgets();
    const index = budgets.findIndex(b => b.id === budget.id);
    if (index !== -1) {
      budgets[index] = budget;
    } else {
      budgets.push(budget);
    }
    this.setStorageItem(this.budgetsKey, budgets);
  }

  public deleteBudget(id: string): boolean {
    const budgets = this.getBudgets();
    const filtered = budgets.filter(b => b.id !== id);
    if (filtered.length !== budgets.length) {
      this.setStorageItem(this.budgetsKey, filtered);
      return true;
    }
    return false;
  }

  // Alert Rules
  public getAlertRules(): AlertRule[] {
    return this.getStorageItem<AlertRule[]>(this.rulesKey, []);
  }

  public saveAlertRule(rule: AlertRule): void {
    const rules = this.getAlertRules();
    const index = rules.findIndex(r => r.id === rule.id);
    if (index !== -1) {
      rules[index] = rule;
    } else {
      rules.push(rule);
    }
    this.setStorageItem(this.rulesKey, rules);
  }

  public deleteAlertRule(id: string): boolean {
    const rules = this.getAlertRules();
    const filtered = rules.filter(r => r.id !== id);
    if (filtered.length !== rules.length) {
      this.setStorageItem(this.rulesKey, filtered);
      return true;
    }
    return false;
  }

  // Generated Alerts
  public getAlertNotifications(): AlertNotification[] {
    return this.getStorageItem<AlertNotification[]>(this.alertsKey, []);
  }

  public addAlertNotification(alert: AlertNotification): void {
    const alerts = this.getAlertNotifications();
    alerts.unshift(alert); // newest first
    // cap at 100 alerts
    if (alerts.length > 100) {
      alerts.pop();
    }
    this.setStorageItem(this.alertsKey, alerts);
  }

  public acknowledgeAlert(id: string): void {
    const alerts = this.getAlertNotifications();
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      this.setStorageItem(this.alertsKey, alerts);
    }
  }

  public clearAllAlerts(): void {
    this.setStorageItem(this.alertsKey, []);
  }

  // Model Usages
  public getModelUsages(): ModelUsageRecord[] {
    return this.getStorageItem<ModelUsageRecord[]>(this.usagesKey, []);
  }

  public addModelUsage(record: ModelUsageRecord): void {
    const usages = this.getModelUsages();
    usages.push(record);
    // limit local history to 5000 records
    if (usages.length > 5000) {
      usages.shift();
    }
    this.setStorageItem(this.usagesKey, usages);
  }

  // Resource History
  public getResourceHistory(): ResourceMetrics[] {
    return this.getStorageItem<ResourceMetrics[]>(this.resourcesKey, []);
  }

  public addResourceMetrics(record: ResourceMetrics): void {
    const resources = this.getResourceHistory();
    resources.push(record);
    // limit history to 500 records
    if (resources.length > 500) {
      resources.shift();
    }
    this.setStorageItem(this.resourcesKey, resources);
  }

  // Recommendations
  public getRecommendations(): OptimizationRecommendation[] {
    return this.getStorageItem<OptimizationRecommendation[]>(this.recommendationsKey, []);
  }

  public saveRecommendation(rec: OptimizationRecommendation): void {
    const recs = this.getRecommendations();
    const index = recs.findIndex(r => r.id === rec.id);
    if (index !== -1) {
      recs[index] = rec;
    } else {
      recs.push(rec);
    }
    this.setStorageItem(this.recommendationsKey, recs);
  }

  // Scheduled Jobs
  public getScheduledJobs(): ScheduledJob[] {
    return this.getStorageItem<ScheduledJob[]>(this.schedulesKey, []);
  }

  public saveScheduledJob(job: ScheduledJob): void {
    const jobs = this.getScheduledJobs();
    const index = jobs.findIndex(j => j.id === job.id);
    if (index !== -1) {
      jobs[index] = job;
    } else {
      jobs.push(job);
    }
    this.setStorageItem(this.schedulesKey, jobs);
  }

  public deleteScheduledJob(id: string): boolean {
    const jobs = this.getScheduledJobs();
    const filtered = jobs.filter(j => j.id !== id);
    if (filtered.length !== jobs.length) {
      this.setStorageItem(this.schedulesKey, filtered);
      return true;
    }
    return false;
  }

  // Audit Logs
  public getAuditLogs(): CostAuditLog[] {
    return this.getStorageItem<CostAuditLog[]>(this.auditKey, []);
  }

  public addAuditLog(log: CostAuditLog): void {
    const logs = this.getAuditLogs();
    logs.unshift(log); // newest first
    if (logs.length > 500) {
      logs.pop();
    }
    this.setStorageItem(this.auditKey, logs);
  }

  // Clear workspace for testing
  public clearAllData(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(this.budgetsKey);
    localStorage.removeItem(this.rulesKey);
    localStorage.removeItem(this.alertsKey);
    localStorage.removeItem(this.usagesKey);
    localStorage.removeItem(this.resourcesKey);
    localStorage.removeItem(this.recommendationsKey);
    localStorage.removeItem(this.schedulesKey);
    localStorage.removeItem(this.auditKey);
    this.initializeDefaults();
  }
}
export const mockCostRepository = new CostRepository();
