import { GraphNode, GraphEdge } from '../../sovereign-persona/types';

export enum ResolutionStrategy {
  KEEP_EXISTING = 'KEEP_EXISTING',
  REPLACE_EXISTING = 'REPLACE_EXISTING',
  MERGE = 'MERGE',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  KEEP_BOTH = 'KEEP_BOTH',
  ARCHIVE = 'ARCHIVE',
  IGNORE = 'IGNORE',
  CUSTOM = 'CUSTOM',
}

export interface ResolutionRecommendation {
  conflictId: string;
  strategy: ResolutionStrategy;
  confidence: number; // 0.0 to 1.0
  rationale: string;
  suggestedNodeState?: Partial<GraphNode>;
  suggestedMergeResult?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  createdAt: number;
}
