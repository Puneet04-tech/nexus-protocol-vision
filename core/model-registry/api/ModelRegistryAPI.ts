import { ModelRegistryRepository } from '../repository/ModelRegistryRepository';
import { VersionManager } from '../versioning/VersionManager';
import { DeploymentManager } from '../deployment/DeploymentManager';
import { ValidationEngine } from '../validation/ValidationEngine';
import { AnalyticsService } from '../analytics/AnalyticsService';
import { SearchEngine } from '../search/SearchEngine';
import { SecurityService, UserRole } from '../services/SecurityService';
import { LifecycleManager } from '../lifecycle/LifecycleManager';
import { RollbackService } from '../rollback/RollbackService';
import { RegistryCache } from '../cache/RegistryCache';
import { RegistryValidator } from '../validators/RegistryValidator';
import { ReportGenerator } from '../exporters/ReportGenerator';
import {
  ModelMetadata,
  ModelVersion,
  DeploymentInfo,
  DeploymentHistoryEntry,
  ValidationRun,
  AnalyticsSnapshot,
  AuditLog,
  SearchCriteria,
  VersionDiff
} from '../types';

export class ModelRegistryAPI {
  private static instance: ModelRegistryAPI | null = null;

  private repository = ModelRegistryRepository.getInstance();
  private versionManager = VersionManager.getInstance();
  private deploymentManager = DeploymentManager.getInstance();
  private validationEngine = ValidationEngine.getInstance();
  private analyticsService = AnalyticsService.getInstance();
  private searchEngine = SearchEngine.getInstance();
  private securityService = SecurityService.getInstance();
  private lifecycleManager = LifecycleManager.getInstance();
  private rollbackService = RollbackService.getInstance();
  private cache = RegistryCache.getInstance();
  private validator = RegistryValidator.getInstance();

  private constructor() {}

  public static getInstance(): ModelRegistryAPI {
    if (!this.instance) {
      this.instance = new ModelRegistryAPI();
    }
    return this.instance;
  }

  // Simulated latency delay helper
  private delay<T>(value: T, ms = 300): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), ms));
  }

  // 1. Model Registry Operations
  public async searchModels(criteria: SearchCriteria): Promise<ModelMetadata[]> {
    const results = this.searchEngine.search(criteria);
    return this.delay(results, 150);
  }

  public async getModel(id: string): Promise<ModelMetadata | null> {
    // Attempt cache check
    const cached = this.cache.get(id);
    if (cached) return this.delay(cached, 50);

    const model = this.repository.getModel(id);
    if (model) this.cache.set(id, model);

    return this.delay(model, 100);
  }

  public async registerModel(model: ModelMetadata, role: UserRole): Promise<void> {
    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'REGISTER_MODEL',
      `Registered model: ${model.name} (${model.id}) under license ${model.license}`,
      model.id
    );

    const check = this.validator.validateModelInputs(model);
    if (!check.isValid) {
      throw new Error(`Validation Error: ${check.errors.join('; ')}`);
    }

    // Check duplicate
    const existing = this.repository.getModel(model.id);
    if (existing) {
      throw new Error(`Conflict Error: A model with ID "${model.id}" already exists.`);
    }

    this.repository.saveModel(model);
    this.cache.invalidate(model.id);

    return this.delay(undefined, 400);
  }

  public async updateModelLifecycle(modelId: string, status: ModelMetadata['status'], role: UserRole): Promise<void> {
    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'LIFECYCLE_TRANSITION',
      `Updated model state to "${status}"`,
      modelId
    );

    const success = this.lifecycleManager.updateModelStatus(modelId, status);
    if (!success) {
      throw new Error(`Not Found: Model with ID "${modelId}" does not exist.`);
    }

    this.cache.invalidate(modelId);
    return this.delay(undefined, 200);
  }

  // 2. Version Management Operations
  public async getVersions(modelId: string): Promise<ModelVersion[]> {
    const list = this.repository.getVersionsForModel(modelId);
    return this.delay(list, 150);
  }

  public async publishVersion(version: ModelVersion, role: UserRole): Promise<void> {
    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'PUBLISH_VERSION',
      `Published model version ${version.version}`,
      version.modelId,
      version.version
    );

    const check = this.validator.validateVersionInputs(version);
    if (!check.isValid) {
      throw new Error(`Validation Error: ${check.errors.join('; ')}`);
    }

    // Verify model exists
    const model = this.repository.getModel(version.modelId);
    if (!model) {
      throw new Error(`Not Found: Target model "${version.modelId}" does not exist.`);
    }

    // Verify version is new
    const existing = this.repository.getVersion(version.modelId, version.version);
    if (existing) {
      throw new Error(`Conflict Error: Version "${version.version}" is already registered for this model.`);
    }

    this.repository.saveVersion(version);
    return this.delay(undefined, 400);
  }

  public async compareVersions(modelId: string, verCodeA: string, verCodeB: string): Promise<VersionDiff> {
    const verA = this.repository.getVersion(modelId, verCodeA);
    const verB = this.repository.getVersion(modelId, verCodeB);

    if (!verA || !verB) {
      throw new Error(`Versions missing: Make sure v${verCodeA} and v${verCodeB} exist.`);
    }

    const diff = this.versionManager.compareVersions(verA, verB);
    return this.delay(diff, 200);
  }

  // 3. Deployment Topology Operations
  public async getDeployments(): Promise<DeploymentInfo[]> {
    const list = this.repository.listDeployments();
    return this.delay(list, 100);
  }

  public async getDeploymentsForModel(modelId: string): Promise<DeploymentInfo[]> {
    const list = this.repository.getDeploymentsForModel(modelId);
    return this.delay(list, 100);
  }

  public async triggerDeployment(params: {
    modelId: string;
    version: string;
    environment: DeploymentInfo['environment'];
    strategy: DeploymentInfo['strategy'];
    gpuType?: string;
    minGpus?: number;
    maxGpus?: number;
    memoryPerReplicaGb?: number;
    role: UserRole;
  }): Promise<DeploymentInfo> {
    this.securityService.authorizeAndLog(
      'user-session',
      params.role,
      'DEPLOY_MODEL',
      `Triggered deployment in environment ${params.environment} using strategy ${params.strategy}`,
      params.modelId,
      params.version
    );

    const result = this.deploymentManager.triggerDeployment({
      modelId: params.modelId,
      version: params.version,
      environment: params.environment,
      strategy: params.strategy,
      operator: 'user-session',
      gpuType: params.gpuType,
      minGpus: params.minGpus,
      maxGpus: params.maxGpus,
      memoryPerReplicaGb: params.memoryPerReplicaGb
    });

    if (!result.success || !result.deployment) {
      throw new Error(result.error || 'Deployment pipeline execution failed.');
    }

    return this.delay(result.deployment, 500);
  }

  public async shiftTraffic(deploymentId: string, weight: number, role: UserRole): Promise<void> {
    const dep = this.repository.getDeployment(deploymentId);
    const modelId = dep ? dep.modelId : undefined;
    const version = dep ? dep.version : undefined;

    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'DEPLOYMENT_TRAFFIC_SHIFT',
      `Shifted traffic weight of deployment "${deploymentId}" to ${weight}%`,
      modelId,
      version
    );

    const success = this.deploymentManager.shiftTraffic(deploymentId, weight, 'user-session');
    if (!success) {
      throw new Error(`Deployment "${deploymentId}" is not currently in an active state.`);
    }

    return this.delay(undefined, 250);
  }

  public async rollbackDeployment(deploymentId: string, role: UserRole): Promise<string> {
    const dep = this.repository.getDeployment(deploymentId);
    const modelId = dep ? dep.modelId : undefined;
    const version = dep ? dep.version : undefined;

    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'DEPLOYMENT_ROLLBACK',
      `Rolled back deployment: ${deploymentId}`,
      modelId,
      version
    );

    const result = this.rollbackService.rollbackDeployment(deploymentId, 'user-session');
    if (!result.success || !result.rolledBackToVersion) {
      throw new Error(result.error || 'Rollback pipeline failed.');
    }

    return this.delay(result.rolledBackToVersion, 450);
  }

  public async getDeploymentHistory(modelId: string): Promise<DeploymentHistoryEntry[]> {
    const history = this.repository.getHistoryForModel(modelId);
    return this.delay(history, 150);
  }

  // 4. Pre-Deployment Validation Operations
  public async getValidationRuns(modelId: string, version: string): Promise<ValidationRun[]> {
    const list = this.repository.getValidationsForVersion(modelId, version);
    return this.delay(list, 150);
  }

  public async triggerPredeploymentValidation(modelId: string, version: string, role: UserRole): Promise<ValidationRun[]> {
    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'TRIGGER_VALIDATION',
      `Manually triggered pre-deployment verification for v${version}`,
      modelId,
      version
    );

    const runs = this.validationEngine.runPredeploymentValidation(modelId, version);
    return this.delay(runs, 600);
  }

  // 5. Analytics Operations
  public async getHistoricalTrends(modelId: string, days = 7): Promise<{ timestamp: number; requests: number; errorRate: number; latency: number }[]> {
    const trends = this.analyticsService.getHistoricalTrends(modelId, days);
    return this.delay(trends, 150);
  }

  public async getPerformanceSummary(modelId: string, version?: string): Promise<ReturnType<AnalyticsService['getPerformanceMetricsSummary']>> {
    const sum = this.analyticsService.getPerformanceMetricsSummary(modelId, version);
    return this.delay(sum, 150);
  }

  public async getVersionAdoption(modelId: string): Promise<ReturnType<AnalyticsService['getVersionAdoption']>> {
    const adoption = this.analyticsService.getVersionAdoption(modelId);
    return this.delay(adoption, 150);
  }

  // 6. Security Audit Logs Operations
  public async getAuditLogs(role: UserRole): Promise<AuditLog[]> {
    if (!this.securityService.isAuthorized(role, 'READ_AUDIT_LOGS')) {
      throw new Error('Access Denied: Inadequate privileges to view audit trail logs.');
    }

    const list = this.repository.listAuditLogs().sort((a, b) => b.timestamp - a.timestamp);
    return this.delay(list, 200);
  }

  // 7. Reporting & Export Functions
  public async exportCSV(modelId: string, category: 'models' | 'deployments' | 'versions' | 'validations'): Promise<string> {
    switch (category) {
      case 'models':
        return this.delay(ReportGenerator.exportModelsToCSV(this.repository.listModels()), 100);
      case 'deployments':
        return this.delay(ReportGenerator.exportDeploymentsToCSV(this.repository.getDeploymentsForModel(modelId)), 100);
      case 'versions':
        return this.delay(ReportGenerator.exportVersionsToCSV(this.repository.getVersionsForModel(modelId)), 100);
      case 'validations':
        // get all validation runs for this model
        const validations = this.repository.listValidations().filter(v => v.modelId === modelId);
        return this.delay(ReportGenerator.exportValidationsToCSV(validations), 100);
      default:
        throw new Error('Invalid export category.');
    }
  }

  public async getPrintHTML(modelId: string): Promise<string> {
    const model = this.repository.getModel(modelId);
    if (!model) throw new Error(`Model ${modelId} not found.`);

    const versions = this.repository.getVersionsForModel(modelId);
    const deployments = this.repository.getDeploymentsForModel(modelId);
    const validations = this.repository.listValidations().filter(v => v.modelId === modelId);

    const html = ReportGenerator.generatePrintableHTML(model, versions, deployments, validations);
    return this.delay(html, 150);
  }

  // 8. Maintenance / Test helper
  public async resetDatabase(role: UserRole): Promise<void> {
    this.securityService.authorizeAndLog(
      'user-session',
      role,
      'SYSTEM_RESET',
      'Flushed and re-seeded registry databases'
    );
    this.repository.clearAll();
    this.cache.clear();
    return this.delay(undefined, 300);
  }
}

export const mockModelRegistryAPI = ModelRegistryAPI.getInstance();
export default mockModelRegistryAPI;
