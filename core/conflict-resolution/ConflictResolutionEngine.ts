import { CognitiveGraph } from '../sovereign-persona/CognitiveGraph';
import { GraphNode } from '../sovereign-persona/types';
import { ConflictDetector } from './ConflictDetector';
import { ConsistencyValidator, ValidationReport } from './ConsistencyValidator';
import { ResolutionRecommendationEngine } from './ResolutionRecommendationEngine';
import { ResolutionEngine } from './ResolutionEngine';
import { KnowledgeVersionManager } from './KnowledgeVersionManager';
import { ConflictHistoryManager } from './ConflictHistoryManager';
import { KnowledgeConflict } from './models/KnowledgeConflict';
import { ResolutionRecommendation } from './models/ResolutionRecommendation';
import { MergeDecision } from './models/MergeDecision';
import { ResolutionStrategy } from './models/ResolutionRecommendation';
import { ConflictNotFoundError } from './utils/ConflictErrors';

/**
 * Main coordinator facade for the Conflict Resolution module
 */
export class ConflictResolutionEngine {
  private detector: ConflictDetector;
  private validator: ConsistencyValidator;
  private recommender: ResolutionRecommendationEngine;
  private resolver: ResolutionEngine;
  private versionManager: KnowledgeVersionManager;
  private historyManager: ConflictHistoryManager;

  constructor() {
    this.detector = new ConflictDetector();
    this.validator = new ConsistencyValidator();
    this.recommender = new ResolutionRecommendationEngine();
    this.resolver = new ResolutionEngine();
    this.versionManager = new KnowledgeVersionManager();
    this.historyManager = new ConflictHistoryManager();
  }

  /**
   * Scans the CognitiveGraph and updates detected conflicts in the history log
   */
  public runDetection(graph: CognitiveGraph): KnowledgeConflict[] {
    const { nodes, edges } = graph.exportGraph();
    
    // Detect raw conflicts
    const detected = this.detector.detectConflicts(nodes, edges);

    // Save/update conflicts in database
    this.historyManager.saveConflicts(detected);

    return this.historyManager.getConflicts();
  }

  /**
   * Performs full static checks and outputs validation reports
   */
  public validateGraph(graph: CognitiveGraph): ValidationReport {
    const { nodes, edges } = graph.exportGraph();
    return this.validator.validate(nodes, edges);
  }

  /**
   * Generates a ranked list of resolution recommendations for a conflict
   */
  public getRecommendationsForConflict(conflictId: string, graph: CognitiveGraph): ResolutionRecommendation[] {
    const conflict = this.historyManager.getConflict(conflictId);
    if (!conflict) {
      throw new ConflictNotFoundError(conflictId);
    }

    const { nodes } = graph.exportGraph();
    const targetNode = nodes.find(n => n.id === conflict.targetNodeId);
    const conflictingNode = conflict.conflictingNodeId 
      ? nodes.find(n => n.id === conflict.conflictingNodeId) 
      : undefined;

    if (!targetNode) {
      throw new Error(`Target node '${conflict.targetNodeId}' not found in Cognitive Graph.`);
    }

    return this.recommender.generateRecommendations(conflict, targetNode, conflictingNode);
  }

  /**
   * Executes a resolution decision on the graph
   */
  public resolveConflict(
    graph: CognitiveGraph,
    conflictId: string,
    strategy: ResolutionStrategy,
    actor: string,
    notes?: string,
    customNodeState?: Partial<GraphNode>
  ): MergeDecision {
    const conflict = this.historyManager.getConflict(conflictId);
    if (!conflict) {
      throw new ConflictNotFoundError(conflictId);
    }

    const { nodes } = graph.exportGraph();
    const targetNode = nodes.find(n => n.id === conflict.targetNodeId);

    // Pre-save backup version before applying modifications
    if (targetNode) {
      this.versionManager.saveVersion(
        targetNode,
        'System (Pre-Conflict Backup)',
        `Snapshot saved before resolving conflict '${conflictId}'`
      );
    }

    const decision = this.resolver.resolve(
      graph,
      conflictId,
      strategy,
      conflict.targetNodeId,
      conflict.conflictingNodeId,
      customNodeState
    );

    // Set active actor context
    decision.decidedBy = actor;

    // Persist resolution state and log
    this.historyManager.saveDecision(decision, actor, notes);

    // Save version of targetNode post-resolution if target is still active
    const postGraph = graph.exportGraph();
    const postNode = postGraph.nodes.find(n => n.id === conflict.targetNodeId);
    if (postNode && strategy !== ResolutionStrategy.ARCHIVE) {
      this.versionManager.saveVersion(
        postNode,
        actor,
        `Resolved conflict '${conflictId}' using ${strategy}`
      );
    }

    return decision;
  }

  /**
   * Rollback a node to a specific version index
   */
  public rollbackNode(
    graph: CognitiveGraph,
    nodeId: string,
    versionNumber: number,
    actor: string
  ): GraphNode {
    const restored = this.versionManager.rollback(graph, nodeId, versionNumber, actor);
    this.historyManager.log(
      'ROLLBACK_EXECUTED',
      actor,
      `Rolled back node '${nodeId}' to version ${versionNumber}`,
      undefined,
      nodeId
    );
    return restored;
  }

  // Getters
  public getHistoryManager(): ConflictHistoryManager {
    return this.historyManager;
  }

  public getVersionManager(): KnowledgeVersionManager {
    return this.versionManager;
  }

  public getDetector(): ConflictDetector {
    return this.detector;
  }
}
