import { ConflictEvidence } from './models/ConflictEvidence';
import { KnowledgeConflict } from './models/KnowledgeConflict';
import { GraphNode } from '../sovereign-persona/types';

/**
 * Service to score conflict severity and evidence metrics using multi-criteria weighted formulas
 */
export class EvidenceAnalyzer {
  /**
   * Calculates the overall Strength of a single piece of evidence.
   * Evidence Strength = (reliability * 0.4) + (confidence * 0.3) + (freshness * 0.15) + (historicalAcceptance * 0.15)
   */
  public calculateEvidenceStrength(evidence: ConflictEvidence): number {
    const ageInDays = (Date.now() - evidence.timestamp) / (1000 * 60 * 60 * 24);
    const freshness = Math.max(0, 1 - ageInDays / 365); // decays to 0 over 1 year
    const acceptance = evidence.acceptanceRate !== undefined ? evidence.acceptanceRate : 0.8;

    return (
      evidence.reliability * 0.4 +
      evidence.confidence * 0.3 +
      freshness * 0.15 +
      acceptance * 0.15
    );
  }

  /**
   * Calculates the total reliability score of a node based on its attributes and accesses.
   * Knowledge Reliability = (confidence * 0.5) + (masteryAgeFactor * 0.2) + (accessFrequencyFactor * 0.3)
   */
  public calculateKnowledgeReliability(node: GraphNode): number {
    const ageInDays = (Date.now() - node.lastAccessed) / (1000 * 60 * 60 * 24);
    const masteryAgeFactor = Math.max(0.1, 1 - ageInDays / 180); // decay over 6 months
    const accessFrequencyFactor = Math.min(1.0, node.accessCount / 50); // caps at 50 accesses

    return (
      node.confidence * 0.5 +
      masteryAgeFactor * 0.2 +
      accessFrequencyFactor * 0.3
    );
  }

  /**
   * Calculates conflict severity.
   */
  public calculateConflictSeverity(
    conflict: Omit<KnowledgeConflict, 'severity'>,
    targetNode: GraphNode,
    conflictingNode?: GraphNode
  ): number {
    let baseSeverity = 0.5;

    switch (conflict.type) {
      case 'FACT_CONFLICT':
        baseSeverity = 0.9;
        break;
      case 'DUPLICATE_NODE':
        baseSeverity = 0.75;
        break;
      case 'RELATIONSHIP_CONFLICT':
        baseSeverity = 0.7;
        break;
      case 'SOURCE_CONFLICT':
        baseSeverity = 0.6;
        break;
      case 'SEMANTIC_OVERLAP':
        baseSeverity = 0.45;
        break;
      case 'OUTDATED_INFORMATION':
        baseSeverity = 0.35;
        break;
      case 'TEMPORAL_CONFLICT':
        baseSeverity = 0.35;
        break;
      case 'ATTRIBUTE_CONFLICT':
        baseSeverity = 0.4;
        break;
      default:
        baseSeverity = 0.5;
        break;
    }

    if (conflictingNode) {
      const relDiff = Math.abs(
        this.calculateKnowledgeReliability(targetNode) -
        this.calculateKnowledgeReliability(conflictingNode)
      );
      // If two nodes are equally reliable but contradict, severity is higher
      baseSeverity += (1 - relDiff) * 0.1;
    }

    const maxEvidence = conflict.evidence.length > 0
      ? Math.max(...conflict.evidence.map(e => this.calculateEvidenceStrength(e)))
      : 0.5;

    return Math.min(1.0, Math.max(0.1, baseSeverity * 0.8 + maxEvidence * 0.2));
  }

  /**
   * Calculates Resolution Confidence.
   * Based on average evidence strength and count of supporting relationships.
   */
  public calculateResolutionConfidence(evidence: ConflictEvidence[]): number {
    if (evidence.length === 0) return 0.5;
    const avgStrength = evidence.reduce((sum, e) => sum + this.calculateEvidenceStrength(e), 0) / evidence.length;
    const totalSupporting = evidence.reduce((sum, e) => sum + e.supportingCount, 0);
    const totalContradicting = evidence.reduce((sum, e) => sum + e.contradictingCount, 0);
    
    const supportRatio = (totalSupporting + 1) / (totalSupporting + totalContradicting + 2);
    return Math.min(1.0, Math.max(0.1, avgStrength * 0.7 + supportRatio * 0.3));
  }
}
