export type ModelStatus = 'active' | 'deprecated' | 'retired' | 'experimental';
export type ModelCategory = 'Natural Language Processing' | 'Computer Vision' | 'Speech & Audio' | 'Reinforcement Learning' | 'Multimodal' | 'Custom';
export type ModelFramework = 'PyTorch' | 'TensorFlow' | 'ONNX' | 'JAX' | 'GGUF' | 'Hugging Face Transformers' | 'API Proxy';

export interface PublisherProfile {
  name: string;
  verified: boolean;
  reputationScore: number; // 0 to 100
  supportEmail: string;
  website: string;
}

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  publisher: PublisherProfile;
  category: ModelCategory;
  tags: string[];
  framework: ModelFramework;
  license: string;
  documentationUrl: string;
  status: ModelStatus;
  createdAt: number;
  updatedAt: number;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
}

export interface IOModelSchema {
  fields: SchemaField[];
}

export interface ModelVersion {
  version: string; // SemVer
  modelId: string;
  releaseNotes: string;
  releaseDate: number;
  checksum: string;
  sizeBytes: number;
  inputSchema: IOModelSchema;
  outputSchema: IOModelSchema;
  status: 'active' | 'deprecated' | 'retired';
  dependencies: Record<string, string>; // e.g. { "transformers": ">=4.36.0", "onnxruntime": "^1.16.0" }
  hyperparameterSchema: Record<string, { type: string; default: number | string; description: string }>;
  parametersCount: string; // e.g. "8B", "70B"
}

export type DeploymentEnvironment = 'development' | 'testing' | 'staging' | 'production';
export type DeploymentStrategy = 'standard' | 'canary' | 'blue-green';
export type DeploymentStatus = 'pending' | 'deploying' | 'active' | 'failed' | 'rollback' | 'retired';

export interface ClusterConfig {
  gpuType: string;
  minGpus: number;
  maxGpus: number;
  memoryPerReplicaGb: number;
}

export interface DeploymentInfo {
  id: string;
  modelId: string;
  version: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  strategy: DeploymentStrategy;
  currentTrafficWeight: number; // 0 to 100
  activeReplicas: number;
  targetReplicas: number;
  launchedAt: number;
  updatedAt: number;
  error?: string;
  clusterConfig: ClusterConfig;
  activeColor?: 'blue' | 'green'; // For blue/green deployment strategy
}

export interface DeploymentHistoryEntry {
  id: string;
  deploymentId: string;
  modelId: string;
  version: string;
  environment: DeploymentEnvironment;
  eventType: 'create' | 'update' | 'rollback' | 'traffic_shift' | 'fail' | 'complete';
  timestamp: number;
  message: string;
  trafficWeight: number;
  user: string;
}

export interface ValidationIssue {
  rule: string;
  type: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  performanceScore?: number; // 0 - 100
  validatedAt: number;
}

export interface ValidationRun {
  id: string;
  modelId: string;
  version: string;
  type: 'compatibility' | 'dependency' | 'schema' | 'performance' | 'security';
  status: 'passed' | 'failed' | 'warning';
  durationMs: number;
  results: ValidationResult;
  checkedAt: number;
}

export interface AnalyticsSnapshot {
  modelId: string;
  version: string;
  requestCount: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number; // percentage 0 to 100
  throughputTokensSec: number;
  costEstimate: number; // USD per 1k requests
  cpuUtilization: number; // percentage
  gpuMemoryMb: number;
  activeDeploymentsCount: number;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userRole: 'Architect' | 'Operator' | 'Auditor';
  modelId?: string;
  version?: string;
  details: string;
  timestamp: number;
}

export interface SearchCriteria {
  query?: string;
  capability?: string;
  publisher?: string;
  tags?: string[];
  framework?: ModelFramework;
  version?: string;
  deploymentStatus?: DeploymentStatus;
  compatibility?: string;
  sortBy?: 'name' | 'newest' | 'requests' | 'latency';
  sortOrder?: 'asc' | 'desc';
}

export interface VersionDiff {
  versionA: string;
  versionB: string;
  parameterDiff: { sizeA: string; sizeB: string; changed: boolean };
  dependenciesDiff: { name: string; verA?: string; verB?: string; changeType: 'added' | 'removed' | 'changed' | 'none' }[];
  schemaDiff: { inputChanged: boolean; outputChanged: boolean; message: string };
  hyperparameterDiff: { name: string; defaultA?: string | number; defaultB?: string | number; changeType: 'added' | 'removed' | 'changed' }[];
}
