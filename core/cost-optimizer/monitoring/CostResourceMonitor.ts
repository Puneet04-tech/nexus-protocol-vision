import { Monitoring } from '../../monitoring/Monitoring';
import { ModelPricing, ModelUsageRecord, ResourceMetrics } from '../types';
import { CostRepository } from '../repository/CostRepository';

export class CostResourceMonitor {
  private repository: CostRepository;
  
  // Provider pricing definitions per 1,000 tokens
  private pricingCatalog: Map<string, ModelPricing> = new Map([
    [
      'gemini-2.5-pro',
      {
        modelName: 'gemini-2.5-pro',
        provider: 'Google Gemini',
        inputTokenCostPerK: 0.00125,  // $0.00125 per 1k input tokens
        outputTokenCostPerK: 0.00375, // $0.00375 per 1k output tokens
        baseExecutionCost: 0.005      // flat $0.005 execution surcharge
      }
    ],
    [
      'gemini-2.5-flash',
      {
        modelName: 'gemini-2.5-flash',
        provider: 'Google Gemini',
        inputTokenCostPerK: 0.000075, // $0.000075 per 1k input tokens
        outputTokenCostPerK: 0.0003,  // $0.0003 per 1k output tokens
        baseExecutionCost: 0.0002
      }
    ],
    [
      'gemma-2b-it',
      {
        modelName: 'gemma-2b-it',
        provider: 'Google Gemma',
        inputTokenCostPerK: 0.00002,  // $0.00002 per 1k input tokens
        outputTokenCostPerK: 0.00006,  // $0.00006 per 1k output tokens
        baseExecutionCost: 0.0
      }
    ]
  ]);

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  public getPricingCatalog(): ModelPricing[] {
    return Array.from(this.pricingCatalog.values());
  }

  public updateModelPricing(pricing: ModelPricing): void {
    this.pricingCatalog.set(pricing.modelName, pricing);
  }

  /**
   * Log an AI model execution cost based on tokens utilized
   */
  public recordInvocation(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
    userId: string = 'user-default',
    agentId?: string,
    workflowId?: string
  ): ModelUsageRecord {
    const pricing = this.pricingCatalog.get(modelName) || {
      modelName,
      provider: 'Custom Provider',
      inputTokenCostPerK: 0.0001,
      outputTokenCostPerK: 0.0002,
      baseExecutionCost: 0.0
    };

    const inputCost = (inputTokens / 1000) * pricing.inputTokenCostPerK;
    const outputCost = (outputTokens / 1000) * pricing.outputTokenCostPerK;
    const baseCost = pricing.baseExecutionCost || 0;
    const totalCost = Number((inputCost + outputCost + baseCost).toFixed(6));

    const record: ModelUsageRecord = {
      timestamp: Date.now(),
      modelName,
      inputTokens,
      outputTokens,
      calculatedCost: totalCost,
      agentId,
      workflowId,
      userId
    };

    // 1. Save locally in our cost repository
    this.repository.addModelUsage(record);

    // 2. Feed back into general system telemetry tracker
    try {
      const mon = Monitoring.getInstance();
      mon.recordTokenUsage(modelName, inputTokens, outputTokens);
      // Publish cost event into general observability aggregator
      mon.publishMetric('cost.dollars_spent', totalCost, { 
        model: modelName, 
        agent: agentId || 'none',
        workflow: workflowId || 'none'
      });
    } catch (e) {
      // In non-browser environments during tests, bypass singleton
    }

    // 3. Increment current budget spending dynamically
    this.adjustBudgets(totalCost, agentId, workflowId);

    return record;
  }

  /**
   * Gather active resource usages (CPU, GPU, memory, disks)
   */
  public collectResourceMetrics(): ResourceMetrics {
    let cpu = 12;
    let memory = 1024;
    let activeAgents = 2;
    let storage = 10000;
    let netSent = 5000;
    let netRecv = 15000;
    let carbonEmissions = 0.01;

    try {
      const mon = Monitoring.getInstance();
      const sys = mon.systemCollector.collect();
      const res = mon.resourceMonitor.collect();
      const carbon = mon.carbonCollector.collect();

      cpu = sys.cpuLoadPercent;
      memory = sys.memoryUsageMb;
      activeAgents = res.activeAgents;
      storage = res.storageSizeBytes;
      netSent = res.networkBytesSent;
      netRecv = res.networkBytesReceived;
      carbonEmissions = carbon.totalEmissionsKg;
    } catch (e) {
      // fallback metrics during test execution
    }

    // Simulating GPU utilization dynamic changes based on agent load
    const gpu = activeAgents > 3 ? Math.min(95, 25 + activeAgents * 12 + Math.floor(Math.random() * 10)) : Math.max(5, 5 + Math.floor(Math.random() * 15));
    const concurrentExec = activeAgents;
    
    // Simulating disk usage in GB (base + storage factor)
    const disk = Number((40.5 + storage / (1024 * 1024 * 1024)).toFixed(3));
    
    const record: ResourceMetrics = {
      timestamp: Date.now(),
      cpuUtilization: cpu,
      memoryUsageMb: memory,
      gpuUtilization: gpu,
      diskUsageGb: disk,
      storageUsageBytes: storage,
      networkBandwidthKbps: Number(((netSent + netRecv) * 8 / 1024 / 10).toFixed(2)) || 256.0, // pseudo bits/sec
      concurrentExecutions: concurrentExec,
      executionDurationMs: 350 + Math.floor(Math.random() * 450),
      energyConsumptionKwh: carbonEmissions / 0.385 // 0.385 kg CO2 per KWh global average
    };

    this.repository.addResourceMetrics(record);
    return record;
  }

  /**
   * Automatically adds cost spent to matching active budgets
   */
  private adjustBudgets(cost: number, agentId?: string, workflowId?: string): void {
    const budgets = this.repository.getBudgets();
    let updated = false;

    for (const budget of budgets) {
      // Check date bounds
      const now = Date.now();
      if (now < budget.startDate || now > budget.endDate) continue;

      let isMatch = false;

      if (budget.type === 'project' && budget.targetId === 'marketplace' && agentId) {
        isMatch = true;
      } else if (budget.type === 'department' && budget.targetId === 'rnd') {
        isMatch = true;
      } else if (budget.type === 'daily' || budget.type === 'weekly' || budget.type === 'monthly') {
        isMatch = true; // global limits
      }

      if (isMatch) {
        budget.currentSpent = Number((budget.currentSpent + cost).toFixed(6));
        this.repository.saveBudget(budget);
        updated = true;
      }
    }

    if (updated) {
      // Trigger a check in alert service if bound
    }
  }
}
