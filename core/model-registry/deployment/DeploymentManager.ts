import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { LifecycleManager } from '../lifecycle/LifecycleManager';
import { ValidationEngine } from '../validation/ValidationEngine';
import {
  DeploymentInfo,
  DeploymentEnvironment,
  DeploymentStrategy,
  ClusterConfig,
  DeploymentHistoryEntry
} from '../types';

export class DeploymentManager {
  private static instance: DeploymentManager | null = null;
  private repository = ModelRegistryRepository.getInstance();
  private lifecycle = LifecycleManager.getInstance();
  private validation = ValidationEngine.getInstance();

  private constructor() {}

  public static getInstance(): DeploymentManager {
    if (!this.instance) {
      this.instance = new DeploymentManager();
    }
    return this.instance;
  }

  /**
   * Triggers a new deployment pipeline.
   * Runs pre-deployment validation.
   * Configures traffic splits based on strategy (Canary, Blue/Green, Standard).
   */
  public triggerDeployment(params: {
    modelId: string;
    version: string;
    environment: DeploymentEnvironment;
    strategy: DeploymentStrategy;
    operator: string;
    gpuType?: string;
    minGpus?: number;
    maxGpus?: number;
    memoryPerReplicaGb?: number;
  }): { success: boolean; deployment?: DeploymentInfo; error?: string } {
    const { modelId, version, environment, strategy, operator } = params;

    // 1. Check lifecycle viability
    const viability = this.lifecycle.checkVersionDeploymentViability(modelId, version);
    if (!viability.viable) {
      return { success: false, error: viability.error };
    }

    // 2. Trigger validation run automatically
    const validationRuns = this.validation.runPredeploymentValidation(modelId, version);
    const hasFailedChecks = validationRuns.some(run => run.status === 'failed');
    if (hasFailedChecks) {
      return {
        success: false,
        error: 'Pre-deployment validation checks failed. Inspect validation logs for compatibility or integrity errors.'
      };
    }

    // 3. Traffic configurations
    let initialTraffic = 100;
    if (strategy === 'canary') {
      initialTraffic = 10; // Start at 10% traffic for canary
    }

    // 4. Setup cluster settings
    const clusterConfig: ClusterConfig = {
      gpuType: params.gpuType || 'Serverless API',
      minGpus: params.minGpus !== undefined ? params.minGpus : 0,
      maxGpus: params.maxGpus !== undefined ? params.maxGpus : 0,
      memoryPerReplicaGb: params.memoryPerReplicaGb !== undefined ? params.memoryPerReplicaGb : 8
    };

    // 5. Decommission any duplicate active versions or adjust traffic splits
    const existing = this.repository.listDeployments().filter(
      d => d.modelId === modelId && d.environment === environment && d.status === 'active'
    );

    if (strategy === 'standard' || strategy === 'blue-green') {
      // Standard or Blue/Green replaces existing ones
      existing.forEach(d => {
        d.status = 'retired';
        d.currentTrafficWeight = 0;
        d.targetReplicas = 0;
        this.repository.saveDeployment(d);

        this.logHistory(
          d,
          'complete',
          `Replaced by new version v${version}. Decommissioned container.`,
          operator
        );
      });
    } else if (strategy === 'canary') {
      // Sibling stable traffic is reduced to accommodate canary start
      existing.forEach(d => {
        d.currentTrafficWeight = 90;
        this.repository.saveDeployment(d);

        this.logHistory(
          d,
          'traffic_shift',
          `Traffic decayed to 90% to accommodate canary launch of v${version}.`,
          operator
        );
      });
    }

    // 6. Create deployment entry
    const deploymentId = `dep_${Date.now()}`;
    const newDeployment: DeploymentInfo = {
      id: deploymentId,
      modelId,
      version,
      environment,
      status: 'deploying',
      strategy,
      currentTrafficWeight: initialTraffic,
      activeReplicas: 0,
      targetReplicas: environment === 'production' ? 4 : 1,
      launchedAt: Date.now(),
      updatedAt: Date.now(),
      clusterConfig,
      activeColor: strategy === 'blue-green' ? 'green' : undefined
    };

    this.repository.saveDeployment(newDeployment);

    // Save history logs
    this.logHistory(
      newDeployment,
      'create',
      `Triggered deployment using ${strategy} strategy in ${environment}. Validation passed.`,
      operator
    );

    return {
      success: true,
      deployment: newDeployment
    };
  }

  /**
   * Promotes Canary traffic manually.
   */
  public shiftTraffic(deploymentId: string, weight: number, operator: string): boolean {
    const deployment = this.repository.getDeployment(deploymentId);
    if (!deployment || deployment.status !== 'active') return false;

    const prevWeight = deployment.currentTrafficWeight;
    deployment.currentTrafficWeight = weight;
    deployment.updatedAt = Date.now();
    this.repository.saveDeployment(deployment);

    this.logHistory(
      deployment,
      'traffic_shift',
      `Manual traffic adjustments: Shifted traffic weight from ${prevWeight}% to ${weight}%.`,
      operator
    );

    // Re-adjust sibling stable versions
    const siblingStable = this.repository.listDeployments().find(
      d =>
        d.modelId === deployment.modelId &&
        d.environment === deployment.environment &&
        d.id !== deployment.id &&
        d.status === 'active'
    );

    if (siblingStable) {
      siblingStable.currentTrafficWeight = 100 - weight;
      this.repository.saveDeployment(siblingStable);

      if (siblingStable.currentTrafficWeight === 0) {
        siblingStable.status = 'retired';
        this.repository.saveDeployment(siblingStable);
        this.logHistory(
          siblingStable,
          'complete',
          `Canary migration complete. Retired legacy version ${siblingStable.version}.`,
          operator
        );
      }
    }

    return true;
  }

  private logHistory(
    dep: DeploymentInfo,
    eventType: DeploymentHistoryEntry['eventType'],
    message: string,
    operator: string
  ): void {
    const entry: DeploymentHistoryEntry = {
      id: `dh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      deploymentId: dep.id,
      modelId: dep.modelId,
      version: dep.version,
      environment: dep.environment,
      eventType,
      timestamp: Date.now(),
      message,
      trafficWeight: dep.currentTrafficWeight,
      user: operator
    };
    this.repository.saveHistoryEntry(entry);
  }
}
