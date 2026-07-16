import { OptimizationRecommendation, ResourceMetrics, ModelUsageRecord } from '../types';
import { CostRepository } from '../repository/CostRepository';

export class OptimizationEngine {
  private repository: CostRepository;

  constructor(repository: CostRepository) {
    this.repository = repository;
  }

  public getRecommendations(): OptimizationRecommendation[] {
    return this.repository.getRecommendations();
  }

  /**
   * Run optimization scans over recent usage logs to generate recommendations
   */
  public runOptimizationScan(): OptimizationRecommendation[] {
    const usages = this.repository.getModelUsages();
    const resources = this.repository.getResourceHistory();
    const currentRecs = this.repository.getRecommendations();

    const newRecommendations: OptimizationRecommendation[] = [...currentRecs];

    // 1. Scan for Model switching alternatives (gemini-2.5-pro -> gemini-2.5-flash)
    const proUsages = usages.filter(u => u.modelName === 'gemini-2.5-pro');
    if (proUsages.length > 5) {
      const alreadyExists = currentRecs.some(r => r.id === 'rec-pro-switch-auto');
      if (!alreadyExists) {
        newRecommendations.push({
          id: 'rec-pro-switch-auto',
          category: 'model_selection',
          title: 'Switch recurring agents to gemini-2.5-flash',
          description: 'We detected frequent simple summarizing tasks routed to gemini-2.5-pro. Migrating these calls to gemini-2.5-flash will save approximately 90% of model execution cost.',
          potentialSavingsUsd: 180.00,
          impactLevel: 'high',
          difficulty: 'easy',
          targetComponent: 'marketplace.sentiment.oracle',
          applied: false,
          timestamp: Date.now(),
          actionDetails: {
            callsScanned: proUsages.length,
            currentModel: 'gemini-2.5-pro',
            alternativeModel: 'gemini-2.5-flash'
          }
        });
      }
    }

    // 2. Scan for idle GPU allocations
    const recentResources = resources.slice(-10);
    const lowGpuCount = recentResources.filter(r => r.gpuUtilization < 10).length;
    if (lowGpuCount >= 8 && recentResources.length > 0) {
      const alreadyExists = currentRecs.some(r => r.id === 'rec-idle-gpu-auto');
      if (!alreadyExists) {
        newRecommendations.push({
          id: 'rec-idle-gpu-auto',
          category: 'idle_resource',
          title: 'Release inactive GPU allocation nodes',
          description: 'GPU utilization has remained below 10% for the past 10 polling intervals. Deallocating the idle secondary GPU cluster will reclaim memory buffers and prevent passive carbon charges.',
          potentialSavingsUsd: 110.00,
          impactLevel: 'medium',
          difficulty: 'easy',
          targetComponent: 'collaboration-studio-gpu',
          applied: false,
          timestamp: Date.now(),
          actionDetails: {
            averageUtilization: 4.5,
            idleThreshold: 10.0
          }
        });
      }
    }

    // 3. Scan for downscaling opportunities (e.g. concurrent executions are low)
    const avgConcurrent = recentResources.reduce((sum, r) => sum + r.concurrentExecutions, 0) / (recentResources.length || 1);
    if (avgConcurrent < 1.5 && recentResources.length > 0) {
      const alreadyExists = currentRecs.some(r => r.id === 'rec-downscale-auto');
      if (!alreadyExists) {
        newRecommendations.push({
          id: 'rec-downscale-auto',
          category: 'workload_scaling',
          title: 'Downscale orchestration server node capacity',
          description: 'Orchestrator concurrent instances average less than 1.5. Reducing peak container capacity by 50% lowers reservation fees while fully satisfying incoming requests.',
          potentialSavingsUsd: 45.00,
          impactLevel: 'low',
          difficulty: 'moderate',
          targetComponent: 'workflow-orchestrator',
          applied: false,
          timestamp: Date.now(),
          actionDetails: {
            averageConcurrent: Number(avgConcurrent.toFixed(2)),
            targetInstances: 1
          }
        });
      }
    }

    this.repository.saveRecommendation(newRecommendations[newRecommendations.length - 1]);
    
    // Save all to repository
    newRecommendations.forEach(rec => this.repository.saveRecommendation(rec));

    return newRecommendations;
  }

  /**
   * Apply an optimization recommendation
   */
  public applyRecommendation(id: string): boolean {
    const recs = this.repository.getRecommendations();
    const recommendation = recs.find(r => r.id === id);
    if (!recommendation || recommendation.applied) return false;

    recommendation.applied = true;
    this.repository.saveRecommendation(recommendation);

    // Simulated action triggers (e.g., executing changes)
    if (recommendation.category === 'model_selection') {
      // In practice, this would dynamically update the routing configuration
    } else if (recommendation.category === 'idle_resource') {
      // Release resources
    }

    // Log action to audits
    this.repository.addAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      userId: 'admin',
      action: 'APPLY_OPTIMIZATION',
      details: `Applied optimization: ${recommendation.title}. Saved estimation: $${recommendation.potentialSavingsUsd}`,
      success: true
    });

    return true;
  }
}
