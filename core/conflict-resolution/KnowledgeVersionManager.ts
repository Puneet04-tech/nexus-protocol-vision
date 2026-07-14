import { KnowledgeVersion } from './models/KnowledgeVersion';
import { GraphNode } from '../sovereign-persona/types';
import { CognitiveGraph } from '../sovereign-persona/CognitiveGraph';
import { VersionNotFoundError } from './utils/ConflictErrors';

/**
 * Handles backup versions, change history, and rollback capabilities for Cognitive Graph nodes
 */
export class KnowledgeVersionManager {
  private versions: Map<string, KnowledgeVersion[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Captures a snapshot of a node's current state and saves it.
   */
  public saveVersion(
    node: GraphNode,
    author: string,
    changeSummary: string
  ): KnowledgeVersion {
    const nodeId = node.id;
    const history = this.versions.get(nodeId) || [];
    
    // Determine next version number
    const nextVersionNum = history.length > 0
      ? history[history.length - 1].version + 1
      : 1;

    const parentVersionId = history.length > 0
      ? history[history.length - 1].versionId
      : undefined;

    const versionId = `v-${nodeId}-${nextVersionNum}-${Date.now()}`;

    const newVer: KnowledgeVersion = {
      versionId,
      nodeId,
      version: nextVersionNum,
      timestamp: Date.now(),
      author,
      nodeState: JSON.parse(JSON.stringify(node)), // Deep clone
      changeSummary,
      parentVersionId,
    };

    history.push(newVer);
    this.versions.set(nodeId, history);
    this.saveToStorage();

    return newVer;
  }

  /**
   * Retrieves the version history of a given node
   */
  public getHistory(nodeId: string): KnowledgeVersion[] {
    return this.versions.get(nodeId) || [];
  }

  /**
   * Rolls back a node in the graph to a previous version.
   * Modifies the graph, and saves a new version record of the rollback event.
   */
  public rollback(
    graph: CognitiveGraph,
    nodeId: string,
    versionNumber: number,
    actor: string
  ): GraphNode {
    const history = this.versions.get(nodeId) || [];
    const targetVer = history.find(v => v.version === versionNumber);

    if (!targetVer) {
      throw new VersionNotFoundError(nodeId, versionNumber);
    }

    const rawGraph = graph.exportGraph();
    const nodes = [...rawGraph.nodes];
    
    const nodeIdx = nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx === -1) {
      throw new Error(`Node '${nodeId}' not found in active graph for rollback.`);
    }

    // Restore state
    const restoredNodeState: GraphNode = JSON.parse(JSON.stringify(targetVer.nodeState));
    restoredNodeState.lastAccessed = Date.now();
    restoredNodeState.accessCount++;

    nodes[nodeIdx] = restoredNodeState;
    graph.importGraph({ nodes, edges: rawGraph.edges });

    // Save this rollback event as a NEW version
    this.saveVersion(
      restoredNodeState,
      actor,
      `Rolled back to version ${versionNumber} (Snapshot: ${targetVer.versionId})`
    );

    return restoredNodeState;
  }

  /**
   * Clears historical versions
   */
  public clear(): void {
    this.versions.clear();
    this.saveToStorage();
  }

  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.versions.entries()));
      localStorage.setItem('nexus_conflict_node_versions', serialized);
    } catch (e) {
      console.warn('Failed to save node versions to LocalStorage', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('nexus_conflict_node_versions');
      if (stored) {
        const parsed = JSON.parse(stored) as [string, KnowledgeVersion[]][];
        this.versions = new Map(parsed);
      }
    } catch (e) {
      console.warn('Failed to load node versions from LocalStorage', e);
    }
  }
}
