import { ConflictEvidence } from './ConflictEvidence';
import { ResolutionStrategy } from './ResolutionRecommendation';

export enum ConflictType {
  FACT_CONFLICT = 'FACT_CONFLICT',
  TEMPORAL_CONFLICT = 'TEMPORAL_CONFLICT',
  DUPLICATE_NODE = 'DUPLICATE_NODE',
  OUTDATED_INFORMATION = 'OUTDATED_INFORMATION',
  SOURCE_CONFLICT = 'SOURCE_CONFLICT',
  ATTRIBUTE_CONFLICT = 'ATTRIBUTE_CONFLICT',
  RELATIONSHIP_CONFLICT = 'RELATIONSHIP_CONFLICT',
  SEMANTIC_OVERLAP = 'SEMANTIC_OVERLAP',
  CUSTOM = 'CUSTOM',
}

export enum ConflictStatus {
  PENDING = 'PENDING',
  RESOLVING = 'RESOLVING',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

export interface KnowledgeConflict {
  id: string;
  type: ConflictType;
  severity: number; // 0.0 to 1.0
  status: ConflictStatus;
  targetNodeId: string;
  conflictingNodeId?: string; // Optional, e.g. for duplicates or semantic overlap
  attributes?: string[]; // Specific attributes in conflict, e.g., 'confidence', 'domain', 'complexity'
  description: string;
  evidence: ConflictEvidence[];
  detectedAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  resolutionStrategy?: ResolutionStrategy;
  resolutionNotes?: string;
}
