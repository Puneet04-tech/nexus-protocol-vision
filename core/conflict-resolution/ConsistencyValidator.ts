import { GraphNode, GraphEdge } from '../sovereign-persona/types';
import { DuplicateDetector } from './DuplicateDetector';

export interface ValidationIssue {
  id: string;
  type: 'DUPLICATE_KEY' | 'CYCLIC_DEPENDENCY' | 'ORPHAN_NODE' | 'INVALID_RELATIONSHIP' | 'CONTRADICTING_ATTRIBUTES' | 'INTEGRITY_VIOLATION';
  severity: 'low' | 'medium' | 'high' | 'critical';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  graphHealthScore: number; // 0 to 100
  isValid: boolean;
}

/**
 * Service to execute static validation checks across graph nodes and edges
 */
export class ConsistencyValidator {
  private duplicateDetector: DuplicateDetector;

  constructor() {
    this.duplicateDetector = new DuplicateDetector();
  }

  /**
   * Performs a full static integrity analysis of the graph
   */
  public validate(nodes: GraphNode[], edges: GraphEdge[]): ValidationReport {
    const issues: ValidationIssue[] = [];

    const nodeIds = new Set(nodes.map(n => n.id));

    // 1. Check for Duplicate Nodes (Duplicate IDs or Normalization clashes)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        if (this.duplicateDetector.isDuplicate(nodeA, nodeB)) {
          issues.push({
            id: `val-issue-dup-${nodeA.id}-${nodeB.id}`,
            type: 'DUPLICATE_KEY',
            severity: 'high',
            nodeId: nodeA.id,
            message: `Node key collision: '${nodeA.id}' matches '${nodeB.id}' under normalisation checks.`,
          });
        }
      }
    }

    // 2. Check for Contradicting Attributes
    for (const node of nodes) {
      if (node.complexity < 0 || node.complexity > 1.0) {
        issues.push({
          id: `val-issue-attr-comp-${node.id}`,
          type: 'CONTRADICTING_ATTRIBUTES',
          severity: 'medium',
          nodeId: node.id,
          message: `Complexity score for node '${node.id}' must be between 0.0 and 1.0. Current: ${node.complexity}`,
        });
      }
      if (node.confidence < 0 || node.confidence > 1.0) {
        issues.push({
          id: `val-issue-attr-conf-${node.id}`,
          type: 'CONTRADICTING_ATTRIBUTES',
          severity: 'medium',
          nodeId: node.id,
          message: `Confidence score for node '${node.id}' must be between 0.0 and 1.0. Current: ${node.confidence}`,
        });
      }
      if (!node.domain || node.domain.trim() === '') {
        issues.push({
          id: `val-issue-attr-dom-${node.id}`,
          type: 'CONTRADICTING_ATTRIBUTES',
          severity: 'low',
          nodeId: node.id,
          message: `Domain classification is missing or empty for node '${node.id}'.`,
        });
      }
    }

    // 3. Check for Invalid Relationships (missing source or target)
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        issues.push({
          id: `val-issue-rel-src-${edge.id}`,
          type: 'INVALID_RELATIONSHIP',
          severity: 'critical',
          edgeId: edge.id,
          message: `Relationship edge '${edge.id}' has non-existent source concept ID: '${edge.source}'.`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        issues.push({
          id: `val-issue-rel-tgt-${edge.id}`,
          type: 'INVALID_RELATIONSHIP',
          severity: 'critical',
          edgeId: edge.id,
          message: `Relationship edge '${edge.id}' has non-existent target concept ID: '${edge.target}'.`,
        });
      }
    }

    // 4. Check for Orphan Nodes (nodes with 0 connected edges)
    const connectedNodes = new Set<string>();
    for (const edge of edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }
    
    const baseNodes = ['mathematics', 'programming', 'ethics', 'communication'];
    for (const node of nodes) {
      if (!connectedNodes.has(node.id) && !baseNodes.includes(node.id)) {
        issues.push({
          id: `val-issue-orphan-${node.id}`,
          type: 'ORPHAN_NODE',
          severity: 'low',
          nodeId: node.id,
          message: `Orphan concept node '${node.id}' has zero relationships pointing to or from it.`,
        });
      }
    }

    // 5. Cyclic dependency check (for prerequisite edges)
    const adjList = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.type === 'prerequisite') {
        if (!adjList.has(edge.source)) adjList.set(edge.source, []);
        adjList.get(edge.source)!.push(edge.target);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycleNodes = new Set<string>();

    const dfs = (curr: string) => {
      visited.add(curr);
      recStack.add(curr);

      const neighbors = adjList.get(curr) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next);
        } else if (recStack.has(next)) {
          cycleNodes.add(curr);
          cycleNodes.add(next);
        }
      }

      recStack.delete(curr);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    if (cycleNodes.size > 0) {
      issues.push({
        id: `val-issue-cycle-${Date.now()}`,
        type: 'CYCLIC_DEPENDENCY',
        severity: 'high',
        message: `Cyclic prerequisite dependency loop detected involving nodes: ${Array.from(cycleNodes).join(', ')}.`,
      });
    }

    // Calculate health score dynamically
    let healthScore = 100;
    for (const issue of issues) {
      if (issue.severity === 'critical') healthScore -= 25;
      else if (issue.severity === 'high') healthScore -= 15;
      else if (issue.severity === 'medium') healthScore -= 8;
      else if (issue.severity === 'low') healthScore -= 3;
    }

    healthScore = Math.max(0, healthScore);
    const isValid = !issues.some(i => i.severity === 'critical' || i.severity === 'high');

    return {
      issues,
      graphHealthScore: healthScore,
      isValid,
    };
  }
}
