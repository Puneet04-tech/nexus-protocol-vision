import { PluginPermission } from '../../plugin-sdk/PluginTypes';

export type ExecutionMode = 'isolated' | 'orchestrated' | 'peer-to-peer';
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';
export type InstallStatus = 'installed' | 'uninstalled';
export type UpdateStatus = 'up-to-date' | 'update-available';

export interface TaskIOField {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface SupportedTask {
  name: string;
  description: string;
  inputs: TaskIOField[];
  outputs: TaskIOField[];
}

export interface CapabilityRegistryEntry {
  agentId: string;
  capabilities: string[];
  supportedTasks: SupportedTask[];
  inputs: TaskIOField[];
  outputs: TaskIOField[];
  version: string;
  compatibility: string; // e.g. ">=1.0.0"
  permissions: PluginPermission[];
  executionMode: ExecutionMode;
  dependencies: Record<string, string>;
  healthStatus: HealthStatus;
  publisher: string;
  digitalSignature: string;
  installStatus: InstallStatus;
  updateStatus: UpdateStatus;
  installedAt?: number;
  lastUpdatedAt?: number;
}

export interface AgentReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface PublisherProfile {
  name: string;
  verified: boolean;
  reputationScore: number; // 0 to 100
  supportEmail: string;
  website: string;
}

export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  publisher: PublisherProfile;
  categories: string[];
  tags: string[];
  capabilities: string[];
  supportedTasks: SupportedTask[];
  version: string;
  compatibility: string;
  permissions: PluginPermission[];
  executionMode: ExecutionMode;
  dependencies: Record<string, string>;
  digitalSignature: string;
  checksum: string;
  rating: number;
  downloadCount: number;
  releaseDate: string;
  versionsHistory: {
    version: string;
    releaseNotes: string;
    checksum: string;
    digitalSignature: string;
    entry: string; // JavaScript source code entry point
  }[];
  reviews: AgentReview[];
}

export interface VerificationReport {
  isValidSignature: boolean;
  isValidChecksum: boolean;
  isCompatible: boolean;
  dependenciesResolved: boolean;
  riskScore: number; // 0 to 100
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  errors: string[];
}

export interface InstallerQueueItem {
  id: string;
  agentId: string;
  version: string;
  type: 'install' | 'uninstall' | 'repair' | 'rollback' | 'version-switch';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0 to 100
  error?: string;
}

export interface InstallerHistoryEntry {
  timestamp: number;
  agentId: string;
  version: string;
  action: 'install' | 'uninstall' | 'repair' | 'rollback' | 'version-switch';
  status: 'success' | 'failure';
  error?: string;
}

export interface SearchCriteria {
  query?: string;
  capabilities?: string[];
  categories?: string[];
  tags?: string[];
  publisher?: string;
  compatibility?: string;
  sortBy?: 'downloads' | 'rating' | 'newest' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  agents: MarketplaceAgent[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
