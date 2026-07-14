import { ConflictResolutionEngine } from '../ConflictResolutionEngine';
import { CognitiveGraph } from '../../sovereign-persona/CognitiveGraph';
import { KnowledgeConflict } from '../models/KnowledgeConflict';
import { ResolutionStrategy } from '../models/ResolutionRecommendation';
import { MergeDecision } from '../models/MergeDecision';
import { ValidationReport } from '../ConsistencyValidator';
import { GraphNode } from '../../sovereign-persona/types';

/**
 * Singleton service layer that exposes simple integration routines for the application
 */
export class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private engine: ConflictResolutionEngine;

  private constructor() {
    this.engine = new ConflictResolutionEngine();
  }

  public static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  public getEngine(): ConflictResolutionEngine {
    return this.engine;
  }

  /**
   * Scans a Cognitive Graph for conflicts, running detection algorithms
   */
  public scanForConflicts(graph: CognitiveGraph): KnowledgeConflict[] {
    return this.engine.runDetection(graph);
  }

  /**
   * Run static validations and audits on the graph
   */
  public runValidation(graph: CognitiveGraph): ValidationReport {
    return this.engine.validateGraph(graph);
  }

  /**
   * Executes a conflict resolution strategy
   */
  public resolve(
    graph: CognitiveGraph,
    conflictId: string,
    strategy: ResolutionStrategy,
    actor: string,
    notes?: string,
    customNodeState?: Partial<GraphNode>
  ): MergeDecision {
    return this.engine.resolveConflict(graph, conflictId, strategy, actor, notes, customNodeState);
  }

  /**
   * Rollback a concept to a previous version index
   */
  public rollback(
    graph: CognitiveGraph,
    nodeId: string,
    versionNumber: number,
    actor: string
  ): GraphNode {
    return this.engine.rollbackNode(graph, nodeId, versionNumber, actor);
  }

  /**
   * Trigger automatic graph validation during knowledge updates.
   * If a validation rule is violated, it creates a custom audit warning.
   */
  public validateUpdate(graph: CognitiveGraph, nodeId: string, actor: string): ValidationReport {
    const report = this.engine.validateGraph(graph);
    
    // Find if the updated node has active validation issues
    const nodeIssues = report.issues.filter(i => i.nodeId === nodeId);
    for (const issue of nodeIssues) {
      this.engine.getHistoryManager().log(
        'INTEGRITY_VIOLATION',
        actor,
        `Integrity issue of type '${issue.type}' detected on node '${nodeId}': ${issue.message}`,
        undefined,
        nodeId
      );
    }

    return report;
  }
}
