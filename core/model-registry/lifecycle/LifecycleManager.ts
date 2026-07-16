import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { ModelMetadata, ModelVersion, ModelStatus } from '../types';

export class LifecycleManager {
  private static instance: LifecycleManager | null = null;
  private repository = ModelRegistryRepository.getInstance();

  private constructor() {}

  public static getInstance(): LifecycleManager {
    if (!this.instance) {
      this.instance = new LifecycleManager();
    }
    return this.instance;
  }

  /**
   * Updates model status (active, deprecated, retired) and updates all associated versions accordingly.
   */
  public updateModelStatus(modelId: string, status: ModelStatus): boolean {
    const model = this.repository.getModel(modelId);
    if (!model) return false;

    model.status = status;
    this.repository.saveModel(model);

    // If a model is retired, automatically retire all its versions
    if (status === 'retired') {
      const versions = this.repository.getVersionsForModel(modelId);
      versions.forEach(v => {
        v.status = 'retired';
        this.repository.saveVersion(v);
      });
    }

    return true;
  }

  /**
   * Transitions a specific version's lifecycle status.
   */
  public updateVersionStatus(modelId: string, version: string, status: ModelVersion['status']): boolean {
    const ver = this.repository.getVersion(modelId, version);
    if (!ver) return false;

    ver.status = status;
    this.repository.saveVersion(ver);

    return true;
  }

  /**
   * Checks if a version is eligible for deployment.
   * Retired versions are blocked from deployment.
   * Deprecated versions generate a warning but are permitted.
   */
  public checkVersionDeploymentViability(modelId: string, version: string): { viable: boolean; warning?: string; error?: string } {
    const model = this.repository.getModel(modelId);
    const ver = this.repository.getVersion(modelId, version);

    if (!model) {
      return { viable: false, error: 'Model not registered in catalog.' };
    }
    if (!ver) {
      return { viable: false, error: `Model version ${version} not found.` };
    }

    if (model.status === 'retired' || ver.status === 'retired') {
      return { viable: false, error: `Version ${version} is retired and cannot be deployed.` };
    }

    if (model.status === 'deprecated' || ver.status === 'deprecated') {
      return {
        viable: true,
        warning: `Version ${version} is deprecated. It is recommended to migrate to an active release.`
      };
    }

    return { viable: true };
  }
}
