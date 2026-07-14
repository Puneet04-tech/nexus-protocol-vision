import { PersonaProfile } from '../sovereign-persona/SovereignPersona';
import { GraphNode, GraphEdge } from '../sovereign-persona/types';

export interface BackupSelection {
  knowledgeGraph: boolean;
  ethicalBoundaries: boolean;
  learningHistory: boolean; // interactions metadata inside Cognitive Graph nodes
  privacyPreferences: boolean;
  professionalContext: boolean;
  goals: boolean;
  settings: boolean;
  carbonPreferences: boolean;
  interactionMemory: boolean; // SovereignPersona localStore
  customPreferences: boolean;
}

export interface BackupMetadata {
  version: string;
  createdAt: number;
  personaId: string;
  checksum: string;
  size: number;
  selectedModules: (keyof BackupSelection)[];
  encryption: {
    algorithm: string;
    salt: string; // hex
    iv: string; // hex
    pbkdf2Iterations: number;
  };
  compression: {
    algorithm: string;
  };
  hashAlgorithm: string;
}

export interface BackupPackage {
  backup: {
    version: string;
    createdAt: number;
    personaId: string;
    checksum: string;
    encryptedPayload: string; // Base64 ciphertext
    metadata: BackupMetadata;
  };
}

export interface BackupHistoryEntry {
  id: string;
  name: string;
  timestamp: number;
  version: string;
  size: number;
  modulesIncluded: (keyof BackupSelection)[];
  encryptionAlgorithm: string;
  status: 'success' | 'failed';
  restoreEvents: RestoreEvent[];
}

export interface RestoreEvent {
  timestamp: number;
  success: boolean;
  error?: string;
  restoredModules: (keyof BackupSelection)[];
  strategy: 'merge' | 'replace' | 'skip';
}

export interface BackupPayload {
  personaId: string;
  exportedAt: number;
  profile?: Partial<PersonaProfile>;
  cognitiveGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  localStore?: Array<[string, any]>;
}

// Conflict checking types
export interface GraphConflict {
  nodeId: string;
  domain: string;
  localConfidence: number;
  backupConfidence: number;
  localAccessCount: number;
  backupAccessCount: number;
}

export interface ConflictReport {
  conflicts: GraphConflict[];
  hasConflicts: boolean;
}

// Test runner interfaces
export interface TestCaseResult {
  name: string;
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface SuiteResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestCaseResult[];
}
