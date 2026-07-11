import { GraphNode } from '../../sovereign-persona/types';

/**
 * Snapshot of a node state at a specific point in time
 */
export interface KnowledgeVersion {
  versionId: string;
  nodeId: string;
  version: number;
  timestamp: number;
  author: string;
  nodeState: GraphNode;
  changeSummary: string;
  parentVersionId?: string;
}
