import { GraphNode, GraphEdge } from '../sovereign-persona/types';
import { DuplicateDetector } from './DuplicateDetector';
import { KnowledgeConflict, ConflictType, ConflictStatus } from './models/KnowledgeConflict';
import { ConflictEvidence } from './models/ConflictEvidence';

/**
 * Service that detects multiple categories of conflicts inside the Cognitive Graph
 */
export class ConflictDetector {
  private duplicateDetector: DuplicateDetector;

  constructor() {
    this.duplicateDetector = new DuplicateDetector();
  }

  /**
   * Scans nodes and edges of a Cognitive Graph for conflicts.
   */
  public detectConflicts(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): KnowledgeConflict[] {
    const conflicts: KnowledgeConflict[] = [];

    // 1. Detect Duplicates and Semantic Overlaps between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        if (this.duplicateDetector.isDuplicate(nodeA, nodeB)) {
          conflicts.push(this.createDuplicateConflict(nodeA, nodeB));
        } else {
          const overlap = this.duplicateDetector.detectSemanticOverlap(nodeA, nodeB);
          if (overlap.isOverlap) {
            conflicts.push(this.createSemanticOverlapConflict(nodeA, nodeB, overlap.score));
          }
        }
      }
    }

    // 2. Detect Attribute Conflicts and Fact Conflicts inside each node's history/metadata
    for (const node of nodes) {
      const metadata = node.metadata || {};
      const interactions = metadata.interactions || [];

      if (interactions.length > 1) {
        // Look for source and fact conflicts within interactions
        const sources = new Set(interactions.map(x => x.type || 'unknown'));
        if (sources.size > 1) {
          // Source conflict: multiple sources providing information for the same node
          const sourceDetails = Array.from(sources).join(', ');
          const firstInt = interactions[0];
          const lastInt = interactions[interactions.length - 1];

          // Check if confidences or contexts diverged significantly
          const diffConfidence = Math.abs((firstInt.context?.confidence || 0.5) - (lastInt.context?.confidence || 0.5));
          if (diffConfidence > 0.4) {
            conflicts.push(this.createSourceConflict(node, sourceDetails, diffConfidence));
          }
        }

        // Temporal / Outdated Information:
        // If a very old interaction claims high masteries, but a newer interaction claims low mastery with high confidence source
        const sortedInts = [...interactions].sort((a, b) => a.timestamp - b.timestamp);
        const earliest = sortedInts[0];
        const latest = sortedInts[sortedInts.length - 1];

        if (latest.timestamp - earliest.timestamp > 30 * 24 * 60 * 60 * 1000) { // > 30 days
          const valDiff = (earliest.context?.mastery || 0.5) - (latest.context?.mastery || 0.5);
          if (valDiff > 0.3) {
            conflicts.push(this.createOutdatedConflict(node, earliest.timestamp, latest.timestamp));
          }
        }
      }

      // Check for attribute conflicts: domain discrepancy
      if (node.confidence > 0.8 && node.complexity > 0.8 && node.domain === 'foundational') {
        if (node.metadata.context?.contradicting) {
          conflicts.push(this.createFactConflict(node, 'Contradicting assertions found in node context.'));
        }
      }
    }

    // 3. Detect Relationship Conflicts (e.g. cyclic dependencies or prerequisites)
    const adjList = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.type === 'prerequisite') {
        if (!adjList.has(edge.source)) adjList.set(edge.source, []);
        adjList.get(edge.source)!.push(edge.target);
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (curr: string, path: string[]) => {
      visited.add(curr);
      recStack.add(curr);
      path.push(curr);

      const neighbors = adjList.get(curr) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next, path);
        } else if (recStack.has(next)) {
          // Cycle detected!
          const cycleStart = path.indexOf(next);
          cycles.push(path.slice(cycleStart));
        }
      }

      path.pop();
      recStack.delete(curr);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    for (const cycle of cycles) {
      conflicts.push(this.createRelationshipConflict(cycle));
    }

    return conflicts;
  }

  private createDuplicateConflict(nodeA: GraphNode, nodeB: GraphNode): KnowledgeConflict {
    const evidence: ConflictEvidence[] = [
      {
        id: `ev-dup-${nodeA.id}-${nodeB.id}-1`,
        conflictId: `conf-dup-${nodeA.id}-${nodeB.id}`,
        source: 'DuplicateDetector',
        reliability: 0.95,
        confidence: 1.0,
        timestamp: Date.now(),
        supportingCount: 1,
        contradictingCount: 0,
        details: `Identifiers '${nodeA.id}' and '${nodeB.id}' match under alphanumeric normalization.`,
      },
    ];

    return {
      id: `conf-dup-${nodeA.id}-${nodeB.id}`,
      type: ConflictType.DUPLICATE_NODE,
      severity: 0.8,
      status: ConflictStatus.PENDING,
      targetNodeId: nodeA.id,
      conflictingNodeId: nodeB.id,
      description: `Identified duplicate concepts: '${nodeA.id}' and '${nodeB.id}' represent the same knowledge item.`,
      evidence,
      detectedAt: Date.now(),
    };
  }

  private createSemanticOverlapConflict(
    nodeA: GraphNode,
    nodeB: GraphNode,
    score: number
  ): KnowledgeConflict {
    const evidence: ConflictEvidence[] = [
      {
        id: `ev-sem-${nodeA.id}-${nodeB.id}-1`,
        conflictId: `conf-sem-${nodeA.id}-${nodeB.id}`,
        source: 'DuplicateDetector',
        reliability: 0.85,
        confidence: score,
        timestamp: Date.now(),
        supportingCount: 2,
        contradictingCount: 0,
        details: `High semantic overlap score (${(score * 100).toFixed(1)}%) based on label distance and related concepts.`,
      },
    ];

    return {
      id: `conf-sem-${nodeA.id}-${nodeB.id}`,
      type: ConflictType.SEMANTIC_OVERLAP,
      severity: 0.5,
      status: ConflictStatus.PENDING,
      targetNodeId: nodeA.id,
      conflictingNodeId: nodeB.id,
      description: `Semantic overlap detected between '${nodeA.id}' and '${nodeB.id}' (similarity score: ${score.toFixed(2)}).`,
      evidence,
      detectedAt: Date.now(),
    };
  }

  private createSourceConflict(
    node: GraphNode,
    sources: string,
    diff: number
  ): KnowledgeConflict {
    const evidence: ConflictEvidence[] = [
      {
        id: `ev-src-${node.id}-1`,
        conflictId: `conf-src-${node.id}`,
        source: 'ConflictDetector',
        reliability: 0.9,
        confidence: 0.8,
        timestamp: Date.now(),
        supportingCount: 0,
        contradictingCount: 1,
        details: `Varying source confidences for node '${node.id}' diverged by ${(diff * 100).toFixed(1)}%.`,
      },
    ];

    return {
      id: `conf-src-${node.id}`,
      type: ConflictType.SOURCE_CONFLICT,
      severity: 0.6,
      status: ConflictStatus.PENDING,
      targetNodeId: node.id,
      description: `Conflict between source inputs (${sources}) for concept '${node.id}'.`,
      evidence,
      detectedAt: Date.now(),
    };
  }

  private createOutdatedConflict(
    node: GraphNode,
    earliestTime: number,
    latestTime: number
  ): KnowledgeConflict {
    const evidence: ConflictEvidence[] = [
      {
        id: `ev-out-${node.id}-1`,
        conflictId: `conf-out-${node.id}`,
        source: 'ConflictDetector',
        reliability: 0.8,
        confidence: 0.85,
        timestamp: Date.now(),
        supportingCount: 1,
        contradictingCount: 0,
        details: `Age difference between earliest interaction (${new Date(earliestTime).toLocaleDateString()}) and latest interaction (${new Date(latestTime).toLocaleDateString()}).`,
      },
    ];

    return {
      id: `conf-out-${node.id}`,
      type: ConflictType.OUTDATED_INFORMATION,
      severity: 0.4,
      status: ConflictStatus.PENDING,
      targetNodeId: node.id,
      description: `Outdated knowledge content for '${node.id}': newer inputs override older assertions.`,
      evidence,
      detectedAt: Date.now(),
    };
  }

  private createFactConflict(node: GraphNode, rationale: string): KnowledgeConflict {
    const evidence: ConflictEvidence[] = [
      {
        id: `ev-fact-${node.id}-1`,
        conflictId: `conf-fact-${node.id}`,
        source: 'ContextAnalyzer',
        reliability: 0.9,
        confidence: 0.9,
        timestamp: Date.now(),
        supportingCount: 0,
        contradictingCount: 2,
        details: rationale,
      },
    ];

    return {
      id: `conf-fact-${node.id}`,
      type: ConflictType.FACT_CONFLICT,
      severity: 0.9,
      status: ConflictStatus.PENDING,
      targetNodeId: node.id,
      description: `Fact contradiction inside knowledge concept '${node.id}'.`,
      evidence,
      detectedAt: Date.now(),
    };
  }

  private createRelationshipConflict(cycle: string[]): KnowledgeConflict {
    const pathStr = cycle.join(' -> ') + ` -> ${cycle[0]}`;
    const target = cycle[0];

    const evidence: ConflictEvidence[] = [
      {
        id: `ev-rel-${target}-1`,
        conflictId: `conf-rel-${target}`,
        source: 'RelationshipAnalyzer',
        reliability: 0.95,
        confidence: 1.0,
        timestamp: Date.now(),
        supportingCount: 0,
        contradictingCount: cycle.length,
        details: `Dependency loop detected in path: ${pathStr}`,
      },
    ];

    return {
      id: `conf-rel-${target}`,
      type: ConflictType.RELATIONSHIP_CONFLICT,
      severity: 0.7,
      status: ConflictStatus.PENDING,
      targetNodeId: target,
      description: `Prerequisite dependency cycle detected involving nodes: ${cycle.join(', ')}.`,
      evidence,
      detectedAt: Date.now(),
    };
  }
}
