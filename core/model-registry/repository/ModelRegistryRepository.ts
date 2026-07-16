import { LocalStorageAdapter } from '../../collaboration-studio/persistence/LocalStorageAdapter';
import {
  ModelMetadata,
  ModelVersion,
  DeploymentInfo,
  DeploymentHistoryEntry,
  ValidationRun,
  AnalyticsSnapshot,
  AuditLog
} from '../types';

export class ModelRegistryRepository {
  private static instance: ModelRegistryRepository | null = null;

  private readonly modelsKey = 'nexus_registered_models';
  private readonly versionsKey = 'nexus_model_versions';
  private readonly deploymentsKey = 'nexus_model_deployments';
  private readonly historyKey = 'nexus_deployment_history';
  private readonly validationsKey = 'nexus_validation_runs';
  private readonly auditKey = 'nexus_registry_audit_logs';
  private readonly analyticsKey = 'nexus_model_analytics';

  private constructor() {
    this.seedIfEmpty();
  }

  public static getInstance(): ModelRegistryRepository {
    if (!this.instance) {
      this.instance = new ModelRegistryRepository();
    }
    return this.instance;
  }

  private seedIfEmpty(): void {
    const models = LocalStorageAdapter.get<ModelMetadata>(this.modelsKey);
    if (models.length === 0) {
      const now = Date.now();
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

      // 1. Seed Models
      const seededModels: ModelMetadata[] = [
        {
          id: 'gemini-3.5-flash',
          name: 'Gemini 3.5 Flash',
          description: 'High-speed, multimodal foundation model optimized for high-volume agent tasks and real-time reasoning.',
          publisher: {
            name: 'Google AI',
            verified: true,
            reputationScore: 99,
            supportEmail: 'gemini-support@google.com',
            website: 'https://ai.google/gemini'
          },
          category: 'Multimodal',
          tags: ['multimodal', 'low-latency', 'reasoning', 'agent-orchestration'],
          framework: 'API Proxy',
          license: 'Proprietary',
          documentationUrl: 'https://ai.google/gemini/docs',
          status: 'active',
          createdAt: monthAgo,
          updatedAt: now
        },
        {
          id: 'sovereign-persona-boundary',
          name: 'Sovereign Persona Boundary Shield',
          description: 'Specialized alignment model acting as an executive filter, monitoring ethical borders and user privacy constraints.',
          publisher: {
            name: 'Nexus Security Guild',
            verified: true,
            reputationScore: 96,
            supportEmail: 'security@nexus-protocol.org',
            website: 'https://nexus-protocol.org/security'
          },
          category: 'Natural Language Processing',
          tags: ['alignment', 'safety', 'privacy', 'ethics-filter'],
          framework: 'ONNX',
          license: 'Apache-2.0',
          documentationUrl: 'https://nexus-protocol.org/docs/boundary-shield',
          status: 'active',
          createdAt: monthAgo + 5 * 24 * 60 * 60 * 1000,
          updatedAt: now
        },
        {
          id: 'llama-3-8b-instruct',
          name: 'Llama 3 8B Instruct',
          description: 'Meta\'s instruction-tuned open weights model, ideal for local text processing and structured data parsing.',
          publisher: {
            name: 'Meta AI',
            verified: true,
            reputationScore: 95,
            supportEmail: 'llama-support@meta.com',
            website: 'https://llama.meta.com'
          },
          category: 'Natural Language Processing',
          tags: ['open-weights', 'instruction-tuned', 'local-deploy'],
          framework: 'GGUF',
          license: 'Llama-3-Community',
          documentationUrl: 'https://llama.meta.com/docs',
          status: 'active',
          createdAt: monthAgo + 10 * 24 * 60 * 60 * 1000,
          updatedAt: now
        },
        {
          id: 'mistral-7b-v0.1',
          name: 'Mistral 7B v0.1',
          description: 'High-performance 7B parameter text generation foundation model.',
          publisher: {
            name: 'Mistral AI',
            verified: false,
            reputationScore: 88,
            supportEmail: 'support@mistral.ai',
            website: 'https://mistral.ai'
          },
          category: 'Natural Language Processing',
          tags: ['deprecated-weights', 'legacy-base'],
          framework: 'ONNX',
          license: 'Apache-2.0',
          documentationUrl: 'https://docs.mistral.ai',
          status: 'deprecated',
          createdAt: monthAgo - 10 * 24 * 60 * 60 * 1000,
          updatedAt: monthAgo
        }
      ];
      LocalStorageAdapter.set<ModelMetadata>(this.modelsKey, seededModels);

      // 2. Seed Versions
      const standardInputSchema = {
        fields: [
          { name: 'prompt', type: 'string' as const, description: 'Input query prompt', required: true },
          { name: 'temperature', type: 'number' as const, description: 'Generation temperature', required: false }
        ]
      };
      const standardOutputSchema = {
        fields: [
          { name: 'response', type: 'string' as const, description: 'Generated text response', required: true }
        ]
      };

      const seededVersions: ModelVersion[] = [
        {
          version: '1.0.0',
          modelId: 'gemini-3.5-flash',
          releaseNotes: 'Initial production-ready release of Gemini 3.5 Flash adapter.',
          releaseDate: monthAgo,
          checksum: 'sha256_8fa4402a7b11c97a5b172a6bcf3a1e94',
          sizeBytes: 0, // API Proxy
          inputSchema: standardInputSchema,
          outputSchema: standardOutputSchema,
          status: 'active',
          dependencies: {},
          hyperparameterSchema: {
            temperature: { type: 'number', default: 0.2, description: 'Temperature value' }
          },
          parametersCount: 'unknown'
        },
        {
          version: '1.1.0',
          modelId: 'gemini-3.5-flash',
          releaseNotes: 'Latency optimizations and system prompt safety enhancements.',
          releaseDate: monthAgo + 12 * 24 * 60 * 60 * 1000,
          checksum: 'sha256_3bcf2d6b38c2057d38cf32d2df26c888',
          sizeBytes: 0,
          inputSchema: standardInputSchema,
          outputSchema: standardOutputSchema,
          status: 'active',
          dependencies: {},
          hyperparameterSchema: {
            temperature: { type: 'number', default: 0.2, description: 'Temperature value' },
            topP: { type: 'number', default: 0.95, description: 'Top P selection threshold' }
          },
          parametersCount: 'unknown'
        },
        {
          version: '1.2.0',
          modelId: 'gemini-3.5-flash',
          releaseNotes: 'Structured output schema enforcement features enabled.',
          releaseDate: now - 3 * 24 * 60 * 60 * 1000,
          checksum: 'sha256_fd723da89b2c3a5b026d36e890c24d9c',
          sizeBytes: 0,
          inputSchema: {
            fields: [
              ...standardInputSchema.fields,
              { name: 'json_schema', type: 'object' as const, description: 'JSON structure constraint', required: false }
            ]
          },
          outputSchema: standardOutputSchema,
          status: 'active',
          dependencies: {},
          hyperparameterSchema: {
            temperature: { type: 'number', default: 0.1, description: 'Temperature value' },
            topP: { type: 'number', default: 0.95, description: 'Top P' },
            topK: { type: 'number', default: 40, description: 'Top K sampling count' }
          },
          parametersCount: 'unknown'
        },
        {
          version: '2.1.0',
          modelId: 'sovereign-persona-boundary',
          releaseNotes: 'Includes advanced jailbreak defense and privacy compliance check blocks.',
          releaseDate: monthAgo + 8 * 24 * 60 * 60 * 1000,
          checksum: 'sha256_f829d10c0e182390ff5b2a09c2a8c3d8',
          sizeBytes: 240 * 1024 * 1024,
          inputSchema: standardInputSchema,
          outputSchema: {
            fields: [
              { name: 'is_allowed', type: 'boolean' as const, description: 'Compliance pass state', required: true },
              { name: 'reason', type: 'string' as const, description: 'Failing audit justification', required: false }
            ]
          },
          status: 'active',
          dependencies: { 'onnxruntime': '>=1.15.0' },
          hyperparameterSchema: {
            threshold: { type: 'number', default: 0.85, description: 'Classification safety threshold' }
          },
          parametersCount: '1.5B'
        },
        {
          version: '1.0.0',
          modelId: 'llama-3-8b-instruct',
          releaseNotes: 'Meta base GGUF q4 quantization deployment version.',
          releaseDate: monthAgo + 15 * 24 * 60 * 60 * 1000,
          checksum: 'sha256_6e4c7b8d4f2c0192e10a26d7bcf3d890',
          sizeBytes: 4800 * 1024 * 1024,
          inputSchema: standardInputSchema,
          outputSchema: standardOutputSchema,
          status: 'active',
          dependencies: { 'llama.cpp': '>=b2600' },
          hyperparameterSchema: {
            temperature: { type: 'number', default: 0.7, description: 'Creativity ratio' }
          },
          parametersCount: '8B'
        },
        {
          version: '0.1.0',
          modelId: 'mistral-7b-v0.1',
          releaseNotes: 'Initial legacy checkpoint.',
          releaseDate: monthAgo - 9 * 24 * 60 * 60 * 1000,
          checksum: 'sha256_7b8cf2c010a26d72bcf3d89e4c7b8dfa',
          sizeBytes: 4200 * 1024 * 1024,
          inputSchema: standardInputSchema,
          outputSchema: standardOutputSchema,
          status: 'retired',
          dependencies: {},
          hyperparameterSchema: {},
          parametersCount: '7B'
        }
      ];
      LocalStorageAdapter.set<ModelVersion>(this.versionsKey, seededVersions);

      // 3. Seed Deployments
      const seededDeployments: DeploymentInfo[] = [
        {
          id: 'dep-gemini-prod-canary',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          environment: 'production',
          status: 'active',
          strategy: 'canary',
          currentTrafficWeight: 80,
          activeReplicas: 8,
          targetReplicas: 10,
          launchedAt: now - 2 * 24 * 60 * 60 * 1000,
          updatedAt: now,
          clusterConfig: {
            gpuType: 'Serverless API',
            minGpus: 0,
            maxGpus: 0,
            memoryPerReplicaGb: 0
          }
        },
        {
          id: 'dep-gemini-prod-stable',
          modelId: 'gemini-3.5-flash',
          version: '1.1.0',
          environment: 'production',
          status: 'active',
          strategy: 'standard',
          currentTrafficWeight: 20,
          activeReplicas: 2,
          targetReplicas: 2,
          launchedAt: monthAgo + 14 * 24 * 60 * 60 * 1000,
          updatedAt: now,
          clusterConfig: {
            gpuType: 'Serverless API',
            minGpus: 0,
            maxGpus: 0,
            memoryPerReplicaGb: 0
          }
        },
        {
          id: 'dep-gemini-staging',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          environment: 'staging',
          status: 'active',
          strategy: 'standard',
          currentTrafficWeight: 100,
          activeReplicas: 1,
          targetReplicas: 1,
          launchedAt: now - 3 * 24 * 60 * 60 * 1000,
          updatedAt: now,
          clusterConfig: {
            gpuType: 'Serverless API',
            minGpus: 0,
            maxGpus: 0,
            memoryPerReplicaGb: 0
          }
        },
        {
          id: 'dep-boundary-prod',
          modelId: 'sovereign-persona-boundary',
          version: '2.1.0',
          environment: 'production',
          status: 'active',
          strategy: 'standard',
          currentTrafficWeight: 100,
          activeReplicas: 4,
          targetReplicas: 4,
          launchedAt: monthAgo + 9 * 24 * 60 * 60 * 1000,
          updatedAt: now,
          clusterConfig: {
            gpuType: 'NVIDIA A10G',
            minGpus: 1,
            maxGpus: 4,
            memoryPerReplicaGb: 16
          }
        },
        {
          id: 'dep-llama-testing',
          modelId: 'llama-3-8b-instruct',
          version: '1.0.0',
          environment: 'testing',
          status: 'active',
          strategy: 'standard',
          currentTrafficWeight: 100,
          activeReplicas: 1,
          targetReplicas: 1,
          launchedAt: monthAgo + 16 * 24 * 60 * 60 * 1000,
          updatedAt: now,
          clusterConfig: {
            gpuType: 'NVIDIA RTX 4090',
            minGpus: 1,
            maxGpus: 1,
            memoryPerReplicaGb: 24
          }
        }
      ];
      LocalStorageAdapter.set<DeploymentInfo>(this.deploymentsKey, seededDeployments);

      // 4. Seed Deployment History
      const seededHistory: DeploymentHistoryEntry[] = [
        {
          id: 'dh-1',
          deploymentId: 'dep-boundary-prod',
          modelId: 'sovereign-persona-boundary',
          version: '2.1.0',
          environment: 'production',
          eventType: 'create',
          timestamp: monthAgo + 9 * 24 * 60 * 60 * 1000,
          message: 'Initial deployment pipeline triggered for Sovereign Persona Shield.',
          trafficWeight: 100,
          user: 'operator@nexus.org'
        },
        {
          id: 'dh-2',
          deploymentId: 'dep-gemini-prod-stable',
          modelId: 'gemini-3.5-flash',
          version: '1.1.0',
          environment: 'production',
          eventType: 'create',
          timestamp: monthAgo + 14 * 24 * 60 * 60 * 1000,
          message: 'Standard stable deployment created for Gemini 3.5 Flash v1.1.0.',
          trafficWeight: 100,
          user: 'operator@nexus.org'
        },
        {
          id: 'dh-3',
          deploymentId: 'dep-gemini-prod-canary',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          environment: 'production',
          eventType: 'create',
          timestamp: now - 2 * 24 * 60 * 60 * 1000,
          message: 'Canary rollout initialized for v1.2.0. Base traffic set to 10%.',
          trafficWeight: 10,
          user: 'architect@nexus.org'
        },
        {
          id: 'dh-4',
          deploymentId: 'dep-gemini-prod-canary',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          environment: 'production',
          eventType: 'traffic_shift',
          timestamp: now - 1 * 24 * 60 * 60 * 1000,
          message: 'Canary traffic promoted to 80%. Stable traffic decayed to 20%.',
          trafficWeight: 80,
          user: 'architect@nexus.org'
        }
      ];
      LocalStorageAdapter.set<DeploymentHistoryEntry>(this.historyKey, seededHistory);

      // 5. Seed Validation Runs
      const seededValidations: ValidationRun[] = [
        {
          id: 'val-1',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          type: 'compatibility',
          status: 'passed',
          durationMs: 450,
          results: {
            isValid: true,
            issues: [],
            validatedAt: now - 4 * 24 * 60 * 60 * 1000
          },
          checkedAt: now - 4 * 24 * 60 * 60 * 1000
        },
        {
          id: 'val-2',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          type: 'security',
          status: 'passed',
          durationMs: 1200,
          results: {
            isValid: true,
            issues: [
              { rule: 'API Key Sanitation', type: 'warning', message: 'Relies on environment credentials validation.' }
            ],
            validatedAt: now - 4 * 24 * 60 * 60 * 1000
          },
          checkedAt: now - 4 * 24 * 60 * 60 * 1000
        },
        {
          id: 'val-3',
          modelId: 'sovereign-persona-boundary',
          version: '2.1.0',
          type: 'performance',
          status: 'passed',
          durationMs: 5000,
          results: {
            isValid: true,
            issues: [],
            performanceScore: 92,
            validatedAt: monthAgo + 8 * 24 * 60 * 60 * 1000
          },
          checkedAt: monthAgo + 8 * 24 * 60 * 60 * 1000
        }
      ];
      LocalStorageAdapter.set<ValidationRun>(this.validationsKey, seededValidations);

      // 6. Seed Audit Logs
      const seededAudits: AuditLog[] = [
        {
          id: 'audit-1',
          action: 'MODEL_REGISTER',
          userId: 'architect@nexus.org',
          userRole: 'Architect',
          modelId: 'gemini-3.5-flash',
          details: 'Registered foundation model Gemini 3.5 Flash.',
          timestamp: monthAgo
        },
        {
          id: 'audit-2',
          action: 'VERSION_PUBLISH',
          userId: 'architect@nexus.org',
          userRole: 'Architect',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          details: 'Published new version v1.2.0 with JSON validation features.',
          timestamp: now - 4 * 24 * 60 * 60 * 1000
        },
        {
          id: 'audit-3',
          action: 'DEPLOYMENT_TRAFFIC_SHIFT',
          userId: 'operator@nexus.org',
          userRole: 'Operator',
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          details: 'Promoted canary deployment traffic weight to 80% in production environment.',
          timestamp: now - 1 * 24 * 60 * 60 * 1000
        }
      ];
      LocalStorageAdapter.set<AuditLog>(this.auditKey, seededAudits);

      // 7. Seed Analytics snapshots over the last 7 days (to draw charts)
      const seededAnalytics: AnalyticsSnapshot[] = [];
      for (let i = 6; i >= 0; i--) {
        const time = now - i * 24 * 60 * 60 * 1000;
        seededAnalytics.push({
          modelId: 'gemini-3.5-flash',
          version: '1.2.0',
          requestCount: 5000 + Math.floor(Math.random() * 2000),
          latencyP50: 110 + Math.floor(Math.random() * 20),
          latencyP95: 180 + Math.floor(Math.random() * 30),
          latencyP99: 250 + Math.floor(Math.random() * 50),
          errorRate: 0.1 + Math.random() * 0.4,
          throughputTokensSec: 120 + Math.floor(Math.random() * 40),
          costEstimate: 0.0015,
          cpuUtilization: 15 + Math.floor(Math.random() * 10),
          gpuMemoryMb: 0,
          activeDeploymentsCount: 2,
          timestamp: time
        });

        seededAnalytics.push({
          modelId: 'sovereign-persona-boundary',
          version: '2.1.0',
          requestCount: 8000 + Math.floor(Math.random() * 1000),
          latencyP50: 18 + Math.floor(Math.random() * 5),
          latencyP95: 28 + Math.floor(Math.random() * 8),
          latencyP99: 45 + Math.floor(Math.random() * 15),
          errorRate: 0.01 + Math.random() * 0.05,
          throughputTokensSec: 450 + Math.floor(Math.random() * 50),
          costEstimate: 0.0004,
          cpuUtilization: 45 + Math.floor(Math.random() * 15),
          gpuMemoryMb: 12300 + Math.floor(Math.random() * 100),
          activeDeploymentsCount: 1,
          timestamp: time
        });
      }
      LocalStorageAdapter.set<AnalyticsSnapshot>(this.analyticsKey, seededAnalytics);
    }
  }

  // Model CRUD
  public listModels(): ModelMetadata[] {
    return LocalStorageAdapter.get<ModelMetadata>(this.modelsKey);
  }

  public getModel(id: string): ModelMetadata | null {
    return LocalStorageAdapter.getOne<ModelMetadata>(this.modelsKey, m => m.id === id);
  }

  public saveModel(model: ModelMetadata): void {
    model.updatedAt = Date.now();
    LocalStorageAdapter.upsert<ModelMetadata>(this.modelsKey, model, m => m.id === model.id);
  }

  public deleteModel(id: string): boolean {
    return LocalStorageAdapter.delete<ModelMetadata>(this.modelsKey, m => m.id === id);
  }

  // Version CRUD
  public listVersions(): ModelVersion[] {
    return LocalStorageAdapter.get<ModelVersion>(this.versionsKey);
  }

  public getVersionsForModel(modelId: string): ModelVersion[] {
    return this.listVersions().filter(v => v.modelId === modelId);
  }

  public getVersion(modelId: string, version: string): ModelVersion | null {
    return LocalStorageAdapter.getOne<ModelVersion>(this.versionsKey, v => v.modelId === modelId && v.version === version);
  }

  public saveVersion(version: ModelVersion): void {
    LocalStorageAdapter.upsert<ModelVersion>(this.versionsKey, version, v => v.modelId === version.modelId && v.version === version.version);
  }

  public deleteVersion(modelId: string, version: string): boolean {
    return LocalStorageAdapter.delete<ModelVersion>(this.versionsKey, v => v.modelId === modelId && v.version === version);
  }

  // Deployment CRUD
  public listDeployments(): DeploymentInfo[] {
    return LocalStorageAdapter.get<DeploymentInfo>(this.deploymentsKey);
  }

  public getDeploymentsForModel(modelId: string): DeploymentInfo[] {
    return this.listDeployments().filter(d => d.modelId === modelId);
  }

  public getDeployment(id: string): DeploymentInfo | null {
    return LocalStorageAdapter.getOne<DeploymentInfo>(this.deploymentsKey, d => d.id === id);
  }

  public saveDeployment(deployment: DeploymentInfo): void {
    deployment.updatedAt = Date.now();
    LocalStorageAdapter.upsert<DeploymentInfo>(this.deploymentsKey, deployment, d => d.id === deployment.id);
  }

  public deleteDeployment(id: string): boolean {
    return LocalStorageAdapter.delete<DeploymentInfo>(this.deploymentsKey, d => d.id === id);
  }

  // Deployment History
  public listHistory(): DeploymentHistoryEntry[] {
    return LocalStorageAdapter.get<DeploymentHistoryEntry>(this.historyKey);
  }

  public getHistoryForModel(modelId: string): DeploymentHistoryEntry[] {
    return this.listHistory().filter(h => h.modelId === modelId);
  }

  public saveHistoryEntry(entry: DeploymentHistoryEntry): void {
    LocalStorageAdapter.upsert<DeploymentHistoryEntry>(this.historyKey, entry, e => e.id === entry.id);
  }

  // Validation Runs
  public listValidations(): ValidationRun[] {
    return LocalStorageAdapter.get<ValidationRun>(this.validationsKey);
  }

  public getValidationsForVersion(modelId: string, version: string): ValidationRun[] {
    return this.listValidations().filter(vr => vr.modelId === modelId && vr.version === version);
  }

  public saveValidationRun(run: ValidationRun): void {
    LocalStorageAdapter.upsert<ValidationRun>(this.validationsKey, run, r => r.id === run.id);
  }

  // Audit Logs
  public listAuditLogs(): AuditLog[] {
    return LocalStorageAdapter.get<AuditLog>(this.auditKey);
  }

  public saveAuditLog(log: AuditLog): void {
    LocalStorageAdapter.upsert<AuditLog>(this.auditKey, log, l => l.id === log.id);
  }

  // Analytics Snapshots
  public listAnalytics(): AnalyticsSnapshot[] {
    return LocalStorageAdapter.get<AnalyticsSnapshot>(this.analyticsKey);
  }

  public getAnalyticsForModel(modelId: string): AnalyticsSnapshot[] {
    return this.listAnalytics().filter(a => a.modelId === modelId);
  }

  public saveAnalyticsSnapshot(snapshot: AnalyticsSnapshot): void {
    LocalStorageAdapter.upsert<AnalyticsSnapshot>(this.analyticsKey, snapshot, s => s.modelId === snapshot.modelId && s.version === snapshot.version && s.timestamp === snapshot.timestamp);
  }

  // General maintenance
  public clearAll(): void {
    LocalStorageAdapter.clear(this.modelsKey);
    LocalStorageAdapter.clear(this.versionsKey);
    LocalStorageAdapter.clear(this.deploymentsKey);
    LocalStorageAdapter.clear(this.historyKey);
    LocalStorageAdapter.clear(this.validationsKey);
    LocalStorageAdapter.clear(this.auditKey);
    LocalStorageAdapter.clear(this.analyticsKey);
    this.seedIfEmpty();
  }
}
