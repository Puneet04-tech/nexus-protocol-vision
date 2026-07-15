import { CostRepository, mockCostRepository } from '../repository/CostRepository';
import { CostResourceMonitor } from '../monitoring/CostResourceMonitor';
import { CostAnalytics } from '../analytics/CostAnalytics';
import { CostForecaster } from '../forecasting/CostForecaster';
import { BudgetManager } from '../budgeting/BudgetManager';
import { OptimizationEngine } from '../optimization/OptimizationEngine';
import { WorkloadScheduler } from '../scheduler/WorkloadScheduler';
import { AlertService } from '../alerts/AlertService';
import { ReportGenerator } from '../reporting/ReportGenerator';

export class CostOptimizerService {
  private static instance: CostOptimizerService;

  public readonly repository: CostRepository;
  public readonly monitor: CostResourceMonitor;
  public readonly analytics: CostAnalytics;
  public readonly forecaster: CostForecaster;
  public readonly budgeting: BudgetManager;
  public readonly optimization: OptimizationEngine;
  public readonly scheduler: WorkloadScheduler;
  public readonly alerts: AlertService;
  public readonly reports: ReportGenerator;

  private constructor() {
    this.repository = mockCostRepository;
    this.monitor = new CostResourceMonitor(this.repository);
    this.analytics = new CostAnalytics(this.repository);
    this.forecaster = new CostForecaster(this.repository);
    this.budgeting = new BudgetManager(this.repository);
    this.optimization = new OptimizationEngine(this.repository);
    this.scheduler = new WorkloadScheduler(this.repository);
    this.alerts = new AlertService(this.repository);
    this.reports = new ReportGenerator(this.repository, this.analytics);
  }

  public static getInstance(): CostOptimizerService {
    if (!CostOptimizerService.instance) {
      CostOptimizerService.instance = new CostOptimizerService();
    }
    return CostOptimizerService.instance;
  }
}
export const mockCostOptimizerService = CostOptimizerService.getInstance();
