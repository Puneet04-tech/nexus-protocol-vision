import { ResolutionStrategy } from './ResolutionRecommendation';
import { GraphNode } from '../../sovereign-persona/types';

/**
 * Audit record of a conflict resolution action applied to the graph
 */
export interface MergeDecision {
  conflictId: string;
  strategy: ResolutionStrategy;
  chosenNodeState: GraphNode | null;
  discardedNodeState: GraphNode | null;
  mergedNodeState?: GraphNode;
  decidedBy: string;
  decidedAt: number;
  auditLogId: string;
}
