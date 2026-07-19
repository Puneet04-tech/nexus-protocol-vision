import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { DeploymentInfo, DeploymentHistoryEntry } from '../types';

export class RollbackService {
  private static instance: RollbackService | null = null;
  private repository = ModelRegistryRepository.getInstance();

  private constructor() {}

  public static getInstance(): RollbackService {
    if (!this.instance) {
      this.instance = new RollbackService();
    }
    return this.instance;
  }

  /**
   * Finds the last successful version deployed in a given environment for a model.
   * Scrapes history logs looking for active version mappings before the current one.
   */
  public findLastStableVersion(modelId: string, environment: string): string | null {
    const history = this.repository.listHistory()
      .filter(h => h.modelId === modelId && h.environment === environment)
      .sort((a, b) => b.timestamp - a.timestamp);

    const activeDeployments = this.repository.listDeployments()
      .filter(d => d.modelId === modelId && d.environment === environment && d.status === 'active');

    const currentVersions = new Set(activeDeployments.map(d => d.version));

    // Find the newest history entry that was successfully completed or created,
    // and is NOT in the current deployed versions list.
    for (const entry of history) {
      if (
        (entry.eventType === 'complete' || entry.eventType === 'create') &&
        !currentVersions.has(entry.version)
      ) {
        return entry.version;
      }
    }

    return null;
  }

  /**
   * Performs rollback of a deployment. Replaces the target version with the last stable one.
   */
  public rollbackDeployment(deploymentId: string, operator: string): { success: boolean; rolledBackToVersion?: string; error?: string } {
    const deployment = this.repository.getDeployment(deploymentId);
    if (!deployment) {
      return { success: false, error: `Deployment with ID "${deploymentId}" not found.` };
    }

    const previousStableVersion = this.findLastStableVersion(deployment.modelId, deployment.environment);
    if (!previousStableVersion) {
      return {
        success: false,
        error: `No previous stable deployment version found in "${deployment.environment}" history for model "${deployment.modelId}".`
      };
    }

    // Save history record of rollback
    const historyId = `dh_${Date.now()}`;
    const rollbackHistoryEntry: DeploymentHistoryEntry = {
      id: historyId,
      deploymentId: deployment.id,
      modelId: deployment.modelId,
      version: previousStableVersion,
      environment: deployment.environment,
      eventType: 'rollback',
      timestamp: Date.now(),
      message: `Deployment rolled back from v${deployment.version} to v${previousStableVersion}.`,
      trafficWeight: 100,
      user: operator
    };
    this.repository.saveHistoryEntry(rollbackHistoryEntry);

    // Update active deployment
    deployment.version = previousStableVersion;
    deployment.status = 'active';
    deployment.strategy = 'standard';
    deployment.currentTrafficWeight = 100;
    deployment.error = undefined;
    deployment.updatedAt = Date.now();

    this.repository.saveDeployment(deployment);

    return {
      success: true,
      rolledBackToVersion: previousStableVersion
    };
  }
}
