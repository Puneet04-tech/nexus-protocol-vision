import { ModelUsageRecord, ResourceMetrics, OptimizationRecommendation } from '../types';
import { CostRepository } from '../repository/CostRepository';

export interface TrendDataPoint {
  label: string;
  timestamp: number;
  cost: number;
  tokens: number;
}

export interface ModelEfficiencyProfile {
  modelName: string;
  totalCost: number;
  totalInvocations: number;
  averageCostPerCall: number;
  costPerMillionTokens: number;
}

export interface ComponentBreakdown {
  id: string;
  type: 'agent' | 'workflow' | 'user' | 'model';
  spent: number;
  percentage: number;
}

export class CostAnalytics {
  private repository: CostRepository;

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  /**
   * Get total cost spent in a specific time duration
   */
  public getTotalCostSpent(startTime: number, endTime: number): number {
    const usages = this.repository.getModelUsages();
    const sum = usages
      .filter(u => u.timestamp >= startTime && u.timestamp <= endTime)
      .reduce((acc, u) => acc + u.calculatedCost, 0);
    return Number(sum.toFixed(4));
  }

  /**
   * Calculate cost trends grouped by hour for the past 24 hours
   */
  public getHourlyTrend(hoursCount: number = 24): TrendDataPoint[] {
    const usages = this.repository.getModelUsages();
    const now = Date.now();
    const trend: TrendDataPoint[] = [];

    for (let i = hoursCount - 1; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const hourEnd = now - i * 3600000;

      const hourUsages = usages.filter(u => u.timestamp >= hourStart && u.timestamp < hourEnd);
      const cost = hourUsages.reduce((acc, u) => acc + u.calculatedCost, 0);
      const tokens = hourUsages.reduce((acc, u) => acc + u.inputTokens + u.outputTokens, 0);

      const dateObj = new Date(hourStart);
      const label = `${String(dateObj.getHours()).padStart(2, '0')}:00`;

      trend.push({
        label,
        timestamp: hourStart,
        cost: Number(cost.toFixed(4)),
        tokens
      });
    }

    return trend;
  }

  /**
   * Build efficiency profile for all used models
   */
  public getModelEfficiency(): ModelEfficiencyProfile[] {
    const usages = this.repository.getModelUsages();
    const models = Array.from(new Set(usages.map(u => u.modelName)));

    return models.map(model => {
      const modelUsages = usages.filter(u => u.modelName === model);
      const totalCost = modelUsages.reduce((acc, u) => acc + u.calculatedCost, 0);
      const invocations = modelUsages.length;
      const totalTokens = modelUsages.reduce((acc, u) => acc + u.inputTokens + u.outputTokens, 0);

      const averageCostPerCall = invocations > 0 ? totalCost / invocations : 0;
      const costPerMillionTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000000 : 0;

      return {
        modelName: model,
        totalCost: Number(totalCost.toFixed(4)),
        totalInvocations: invocations,
        averageCostPerCall: Number(averageCostPerCall.toFixed(6)),
        costPerMillionTokens: Number(costPerMillionTokens.toFixed(4))
      };
    });
  }

  /**
   * Break down cost by agents
   */
  public getAgentBreakdown(): ComponentBreakdown[] {
    const usages = this.repository.getModelUsages();
    const totalCost = usages.reduce((acc, u) => acc + u.calculatedCost, 0);
    const agentMap: Map<string, number> = new Map();

    usages.forEach(u => {
      const agent = u.agentId || 'direct-api-call';
      agentMap.set(agent, (agentMap.get(agent) || 0) + u.calculatedCost);
    });

    const breakdown: ComponentBreakdown[] = [];
    agentMap.forEach((spent, agent) => {
      breakdown.push({
        id: agent,
        type: 'agent',
        spent: Number(spent.toFixed(4)),
        percentage: totalCost > 0 ? Number(((spent / totalCost) * 100).toFixed(2)) : 0
      });
    });

    return breakdown.sort((a, b) => b.spent - a.spent);
  }

  /**
   * Break down cost by workflows
   */
  public getWorkflowBreakdown(): ComponentBreakdown[] {
    const usages = this.repository.getModelUsages();
    const totalCost = usages.reduce((acc, u) => acc + u.calculatedCost, 0);
    const workflowMap: Map<string, number> = new Map();

    usages.forEach(u => {
      const workflow = u.workflowId || 'manual-trigger';
      workflowMap.set(workflow, (workflowMap.get(workflow) || 0) + u.calculatedCost);
    });

    const breakdown: ComponentBreakdown[] = [];
    workflowMap.forEach((spent, workflow) => {
      breakdown.push({
        id: workflow,
        type: 'workflow',
        spent: Number(spent.toFixed(4)),
        percentage: totalCost > 0 ? Number(((spent / totalCost) * 100).toFixed(2)) : 0
      });
    });

    return breakdown.sort((a, b) => b.spent - a.spent);
  }

  /**
   * Calculate resource utilization aggregates (average, peak load)
   */
  public getResourceUtilizationSummary(historyLength: number = 24): {
    avgCpu: number;
    peakCpu: number;
    avgGpu: number;
    peakGpu: number;
    avgMemoryMb: number;
    peakMemoryMb: number;
    totalEnergyKwh: number;
  } {
    const history = this.repository.getResourceHistory().slice(-historyLength);
    if (history.length === 0) {
      return { avgCpu: 0, peakCpu: 0, avgGpu: 0, peakGpu: 0, avgMemoryMb: 0, peakMemoryMb: 0, totalEnergyKwh: 0 };
    }

    const cpuSum = history.reduce((sum, h) => sum + h.cpuUtilization, 0);
    const gpuSum = history.reduce((sum, h) => sum + h.gpuUtilization, 0);
    const memSum = history.reduce((sum, h) => sum + h.memoryUsageMb, 0);
    const energySum = history.reduce((sum, h) => sum + h.energyConsumptionKwh, 0);

    return {
      avgCpu: Number((cpuSum / history.length).toFixed(1)),
      peakCpu: Math.max(...history.map(h => h.cpuUtilization)),
      avgGpu: Number((gpuSum / history.length).toFixed(1)),
      peakGpu: Math.max(...history.map(h => h.gpuUtilization)),
      avgMemoryMb: Math.round(memSum / history.length),
      peakMemoryMb: Math.max(...history.map(h => h.memoryUsageMb)),
      totalEnergyKwh: Number(energySum.toFixed(3))
    };
  }

  /**
   * Calculate return on investment (ROI) based on applied optimizations
   */
  public getSavingsROI(): {
    totalSavingsUsd: number;
    appliedOptimizationsCount: number;
    potentialSavingsRemainingUsd: number;
    roiFactor: number; // savings compared to core budget
  } {
    const recs = this.repository.getRecommendations();
    const applied = recs.filter(r => r.applied);
    const pending = recs.filter(r => !r.applied);

    const totalSavings = applied.reduce((sum, r) => sum + r.potentialSavingsUsd, 0);
    const potentialSavings = pending.reduce((sum, r) => sum + r.potentialSavingsUsd, 0);

    const budgets = this.repository.getBudgets();
    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    
    // ROI as percentage of savings vs total budget limit
    const roiFactor = totalBudgetLimit > 0 ? Number(((totalSavings / totalBudgetLimit) * 100).toFixed(2)) : 0;

    return {
      totalSavingsUsd: Number(totalSavings.toFixed(2)),
      appliedOptimizationsCount: applied.length,
      potentialSavingsRemainingUsd: Number(potentialSavings.toFixed(2)),
      roiFactor
    };
  }
}
