import { ModelUsageRecord, CostForecast, Budget } from '../types';
import { CostRepository } from '../repository/CostRepository';

export class CostForecaster {
  private repository: CostRepository;

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  /**
   * Project future spending over a target number of days using linear regression
   */
  public generateForecast(daysAhead: number = 7): CostForecast {
    const usages = this.repository.getModelUsages();
    const now = Date.now();
    
    // Group costs by day for the last 14 days
    const dailyCosts: Map<string, number> = new Map();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Initialize day map
    for (let i = 13; i >= 0; i--) {
      const dayKey = new Date(now - i * oneDayMs).toDateString();
      dailyCosts.set(dayKey, 0);
    }

    usages.forEach(u => {
      const dateStr = new Date(u.timestamp).toDateString();
      if (dailyCosts.has(dateStr)) {
        dailyCosts.set(dateStr, (dailyCosts.get(dateStr) || 0) + u.calculatedCost);
      }
    });

    const values = Array.from(dailyCosts.values());
    const xValues = Array.from({ length: values.length }, (_, idx) => idx); // 0, 1, 2...
    
    // Perform Simple Linear Regression (y = mx + c)
    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += values[i];
      sumXY += xValues[i] * values[i];
      sumXX += xValues[i] * xValues[i];
    }

    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;

    // Estimate future value at target index
    const targetIdx = n + daysAhead - 1;
    const baseProjectedValue = Math.max(0.01, intercept + slope * targetIdx);

    // Calculate sample variance and standard deviation for confidence boundaries
    const mean = sumY / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
    const stdDev = Math.sqrt(variance);

    // Confidence margins (1.96 for 95% confidence bounds)
    const confidenceMargin = 1.96 * (stdDev / Math.sqrt(n)) * Math.sqrt(daysAhead);
    
    let trend: 'stable' | 'upward' | 'downward' = 'stable';
    if (slope > 0.05) trend = 'upward';
    if (slope < -0.05) trend = 'downward';

    return {
      targetDate: now + daysAhead * oneDayMs,
      projectedCost: Number(baseProjectedValue.toFixed(4)),
      confidenceLowerBound: Number(Math.max(0, baseProjectedValue - confidenceMargin).toFixed(4)),
      confidenceUpperBound: Number((baseProjectedValue + confidenceMargin).toFixed(4)),
      trend
    };
  }

  /**
   * Predict the date when a budget limit will be breached
   */
  public predictBudgetBreach(budget: Budget): { 
    willBreach: boolean; 
    estimatedDaysRemaining: number; 
    estimatedBreachDate?: number;
  } {
    if (budget.currentSpent >= budget.limit) {
      return { willBreach: true, estimatedDaysRemaining: 0, estimatedBreachDate: Date.now() };
    }

    const usages = this.repository.getModelUsages();
    const budgetUsages = usages.filter(u => {
      // Basic target matching
      if (budget.type === 'project' && budget.targetId === 'marketplace' && !u.agentId) return false;
      return u.timestamp >= budget.startDate;
    });

    if (budgetUsages.length === 0) {
      return { willBreach: false, estimatedDaysRemaining: 999 };
    }

    const elapsedMs = Date.now() - budget.startDate;
    const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
    const averageSpentPerDay = elapsedDays > 0.1 ? budget.currentSpent / elapsedDays : budget.currentSpent;

    if (averageSpentPerDay <= 0.001) {
      return { willBreach: false, estimatedDaysRemaining: 999 };
    }

    const remainingBudget = budget.limit - budget.currentSpent;
    const daysRemaining = remainingBudget / averageSpentPerDay;

    const budgetCycleTotalDays = (budget.endDate - budget.startDate) / (24 * 60 * 60 * 1000);
    const currentDayOfCycle = elapsedDays;
    const projectedBreachDay = currentDayOfCycle + daysRemaining;

    const willBreach = projectedBreachDay <= budgetCycleTotalDays;

    return {
      willBreach,
      estimatedDaysRemaining: Number(daysRemaining.toFixed(1)),
      estimatedBreachDate: willBreach ? Date.now() + daysRemaining * 24 * 60 * 60 * 1000 : undefined
    };
  }
}
