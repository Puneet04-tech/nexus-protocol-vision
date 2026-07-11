import { CognitiveGraph } from '../sovereign-persona/CognitiveGraph';
import { GraphNode, GraphEdge } from '../sovereign-persona/types';
import { ResolutionStrategy } from './models/ResolutionRecommendation';
import { MergeDecision } from './models/MergeDecision';
import { InvalidStrategyError } from './utils/ConflictErrors';

/**
 * Executes changes on the Cognitive Graph based on a chosen resolution strategy
 */
export class ResolutionEngine {
  /**
   * Applies the resolution strategy to the graph.
   * Modifies the graph by exporting, altering, and importing back.
   */
  public resolve(
    graph: CognitiveGraph,
    conflictId: string,
    strategy: ResolutionStrategy,
    targetNodeId: string,
    conflictingNodeId?: string,
    customNodeState?: Partial<GraphNode>
  ): MergeDecision {
    const rawGraph = graph.exportGraph();
    const nodes = [...rawGraph.nodes];
    const edges = [...rawGraph.edges];

    const targetNode = nodes.find(n => n.id === targetNodeId);
    const conflictingNode = conflictingNodeId ? nodes.find(n => n.id === conflictingNodeId) : undefined;

    if (!targetNode) {
      throw new Error(`Target node '${targetNodeId}' not found in cognitive graph.`);
    }

    let chosenNodeState: GraphNode | null = null;
    let discardedNodeState: GraphNode | null = null;
    let mergedNodeState: GraphNode | undefined = undefined;

    switch (strategy) {
      case ResolutionStrategy.KEEP_EXISTING:
        chosenNodeState = { ...targetNode };
        if (conflictingNode) {
          discardedNodeState = { ...conflictingNode };
          // Remove conflicting node and its edges
          const index = nodes.findIndex(n => n.id === conflictingNode.id);
          if (index !== -1) nodes.splice(index, 1);
          this.removeEdgesForNode(edges, conflictingNode.id);
        }
        break;

      case ResolutionStrategy.REPLACE_EXISTING:
        if (!conflictingNode && !customNodeState) {
          throw new Error('REPLACE_EXISTING requires a conflicting node or custom state.');
        }
        discardedNodeState = { ...targetNode };
        const updatedNode: GraphNode = {
          ...targetNode,
          ...(customNodeState || conflictingNode),
          id: targetNode.id, // ID must remain constant
        };
        chosenNodeState = updatedNode;

        // Replace target node in array
        const targetIndex = nodes.findIndex(n => n.id === targetNode.id);
        if (targetIndex !== -1) {
          nodes[targetIndex] = updatedNode;
        }

        // If replacing from a separate node, remove the conflicting node from graph
        if (conflictingNode) {
          const conflictingIndex = nodes.findIndex(n => n.id === conflictingNode.id);
          if (conflictingIndex !== -1) nodes.splice(conflictingIndex, 1);
          
          // Re-route edges pointing to conflicting node to point to targetNode
          this.rerouteEdges(edges, conflictingNode.id, targetNode.id);
        }
        break;

      case ResolutionStrategy.MERGE:
        chosenNodeState = { ...targetNode };
        if (conflictingNode) {
          discardedNodeState = { ...conflictingNode };
        }

        // Perform merge
        const merged: GraphNode = {
          id: targetNode.id,
          domain: customNodeState?.domain || targetNode.domain || conflictingNode?.domain || 'general',
          complexity: customNodeState?.complexity !== undefined ? customNodeState.complexity : Math.max(targetNode.complexity, conflictingNode?.complexity || 0),
          confidence: customNodeState?.confidence !== undefined ? customNodeState.confidence : Math.min(1.0, (targetNode.confidence + (conflictingNode?.confidence || 0)) / 2 + 0.05),
          accessCount: targetNode.accessCount + (conflictingNode?.accessCount || 0),
          lastAccessed: Math.max(targetNode.lastAccessed, conflictingNode?.lastAccessed || 0),
          relatedConcepts: [...new Set([
            ...(targetNode.relatedConcepts || []),
            ...(conflictingNode?.relatedConcepts || []),
            ...(customNodeState?.relatedConcepts || [])
          ])],
          metadata: {
            ...conflictingNode?.metadata,
            ...targetNode.metadata,
            ...customNodeState?.metadata,
            context: {
              ...(conflictingNode?.metadata?.context || {}),
              ...(targetNode?.metadata?.context || {}),
              ...(customNodeState?.metadata?.context || {}),
              mergedAt: Date.now(),
              mergedStrategy: 'AUTO_MERGE'
            }
          }
        };

        mergedNodeState = merged;

        // Replace target node with merged state
        const idx = nodes.findIndex(n => n.id === targetNode.id);
        if (idx !== -1) {
          nodes[idx] = merged;
        }

        // If there was a separate conflicting node, remove it and reroute its edges
        if (conflictingNode) {
          const conflictingIndex = nodes.findIndex(n => n.id === conflictingNode.id);
          if (conflictingIndex !== -1) nodes.splice(conflictingIndex, 1);
          this.rerouteEdges(edges, conflictingNode.id, targetNode.id);
        }
        break;

      case ResolutionStrategy.KEEP_BOTH:
        chosenNodeState = { ...targetNode };
        if (conflictingNode) {
          discardedNodeState = null; // both kept
          
          // Disambiguate conflicting node by modifying its ID
          const newConflictingId = `${conflictingNode.id}_${conflictingNode.domain || 'alt'}`;
          const renamedNode: GraphNode = {
            ...conflictingNode,
            id: newConflictingId,
            metadata: {
              ...conflictingNode.metadata,
              context: {
                ...(conflictingNode.metadata?.context || {}),
                disambiguatedFrom: conflictingNode.id,
                disambiguatedAt: Date.now()
              }
            }
          };

          const confIdx = nodes.findIndex(n => n.id === conflictingNode.id);
          if (confIdx !== -1) {
            nodes[confIdx] = renamedNode;
          }

          // Reroute edges of conflicting node to point to the renamed ID
          this.rerouteEdges(edges, conflictingNode.id, newConflictingId);

          // Add a semantic link between the two kept nodes
          edges.push({
            id: `link-${targetNode.id}-${newConflictingId}`,
            source: targetNode.id,
            target: newConflictingId,
            weight: 0.5,
            type: 'related-concept',
            strength: 0.5
          });
        }
        break;

      case ResolutionStrategy.ARCHIVE:
        chosenNodeState = null;
        discardedNodeState = { ...targetNode };

        // Soft delete/Archive target node
        const idxArch = nodes.findIndex(n => n.id === targetNode.id);
        if (idxArch !== -1) {
          nodes.splice(idxArch, 1);
        }
        this.removeEdgesForNode(edges, targetNode.id);
        break;

      case ResolutionStrategy.IGNORE:
        chosenNodeState = { ...targetNode };
        if (conflictingNode) {
          discardedNodeState = { ...conflictingNode };
        }
        break;

      case ResolutionStrategy.MANUAL_REVIEW:
        if (customNodeState) {
          const idxMan = nodes.findIndex(n => n.id === targetNode.id);
          if (idxMan !== -1) {
            const updated = { ...nodes[idxMan], ...customNodeState };
            nodes[idxMan] = updated;
            chosenNodeState = updated;
          }
        }
        break;

      default:
        throw new InvalidStrategyError(strategy);
    }

    // Import the updated structures back
    graph.importGraph({ nodes, edges });

    const auditLogId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      conflictId,
      strategy,
      chosenNodeState,
      discardedNodeState,
      mergedNodeState,
      decidedBy: 'System', 
      decidedAt: Date.now(),
      auditLogId,
    };
  }

  private removeEdgesForNode(edges: GraphEdge[], nodeId: string): void {
    for (let i = edges.length - 1; i >= 0; i--) {
      if (edges[i].source === nodeId || edges[i].target === nodeId) {
        edges.splice(i, 1);
      }
    }
  }

  private rerouteEdges(edges: GraphEdge[], oldId: string, newId: string): void {
    for (const edge of edges) {
      if (edge.source === oldId) {
        edge.source = newId;
        edge.id = `${newId}-${edge.target}`;
      }
      if (edge.target === oldId) {
        edge.target = newId;
        edge.id = `${edge.source}-${newId}`;
      }
    }
  }
}
