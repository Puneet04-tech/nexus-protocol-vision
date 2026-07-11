import { KnowledgeConflict } from './models/KnowledgeConflict';
import { ResolutionRecommendation, ResolutionStrategy } from './models/ResolutionRecommendation';
import { GraphNode } from '../sovereign-persona/types';
import { EvidenceAnalyzer } from './EvidenceAnalyzer';

/**
 * Generates and ranks strategies to resolve identified knowledge conflicts
 */
export class ResolutionRecommendationEngine {
  private evidenceAnalyzer: EvidenceAnalyzer;

  constructor() {
    this.evidenceAnalyzer = new EvidenceAnalyzer();
  }

  /**
   * Generates a ranked list of resolution recommendations for a conflict
   */
  public generateRecommendations(
    conflict: KnowledgeConflict,
    targetNode: GraphNode,
    conflictingNode?: GraphNode
  ): ResolutionRecommendation[] {
    const recommendations: ResolutionRecommendation[] = [];

    // Analyze evidence strength
    const resConfidence = this.evidenceAnalyzer.calculateResolutionConfidence(conflict.evidence);

    switch (conflict.type) {
      case 'DUPLICATE_NODE':
        if (conflictingNode) {
          const relTarget = this.evidenceAnalyzer.calculateKnowledgeReliability(targetNode);
          const relConflict = this.evidenceAnalyzer.calculateKnowledgeReliability(conflictingNode);

          // Recommendation 1: Merge them (usually recommended for duplicates)
          const mergedNodeState: Partial<GraphNode> = {
            domain: targetNode.domain || conflictingNode.domain,
            complexity: Math.max(targetNode.complexity, conflictingNode.complexity),
            confidence: Math.min(1.0, (targetNode.confidence + conflictingNode.confidence) / 2 + 0.05),
            relatedConcepts: [...new Set([...(targetNode.relatedConcepts || []), ...(conflictingNode.relatedConcepts || [])])],
            accessCount: targetNode.accessCount + conflictingNode.accessCount,
            lastAccessed: Math.max(targetNode.lastAccessed, conflictingNode.lastAccessed),
            metadata: {
              ...conflictingNode.metadata,
              ...targetNode.metadata,
              context: {
                ...(conflictingNode.metadata?.context || {}),
                ...(targetNode.metadata?.context || {}),
                mergedAt: Date.now(),
                mergedFrom: conflictingNode.id,
              }
            }
          };

          recommendations.push({
            conflictId: conflict.id,
            strategy: ResolutionStrategy.MERGE,
            confidence: Math.min(0.95, resConfidence + 0.1),
            rationale: `Merge is the optimal strategy because both concepts represent the same knowledge node. The merged concept retains connections from both sources and computes average masteries.`,
            suggestedNodeState: mergedNodeState,
            createdAt: Date.now(),
          });

          // Recommendation 2: Keep Existing (if existing node is vastly more reliable)
          if (relTarget > relConflict + 0.2) {
            recommendations.push({
              conflictId: conflict.id,
              strategy: ResolutionStrategy.KEEP_EXISTING,
              confidence: 0.8,
              rationale: `Existing node '${targetNode.id}' (reliability: ${relTarget.toFixed(2)}) is significantly more established than conflicting node '${conflictingNode.id}' (reliability: ${relConflict.toFixed(2)}).`,
              createdAt: Date.now(),
            });
          }

          // Recommendation 3: Replace Existing
          if (relConflict > relTarget + 0.2) {
            recommendations.push({
              conflictId: conflict.id,
              strategy: ResolutionStrategy.REPLACE_EXISTING,
              confidence: 0.8,
              rationale: `The conflicting node '${conflictingNode.id}' is fresher and more reliable (reliability: ${relConflict.toFixed(2)}) than the existing node '${targetNode.id}' (reliability: ${relTarget.toFixed(2)}).`,
              suggestedNodeState: { ...conflictingNode, id: targetNode.id }, // keeps the id of the target node
              createdAt: Date.now(),
            });
          }

          // Recommendation 4: Keep Both (Disambiguate namespaces)
          recommendations.push({
            conflictId: conflict.id,
            strategy: ResolutionStrategy.KEEP_BOTH,
            confidence: 0.4,
            rationale: `Keep both nodes if they actually represent distinct concepts under different scopes. They will be namespaced, e.g. '${targetNode.id}_${targetNode.domain}' and '${conflictingNode.id}_${conflictingNode.domain}'.`,
            createdAt: Date.now(),
          });
        }
        break;

      case 'SEMANTIC_OVERLAP':
        if (conflictingNode) {
          // Recommend KEEP_BOTH or MERGE
          recommendations.push({
            conflictId: conflict.id,
            strategy: ResolutionStrategy.KEEP_BOTH,
            confidence: 0.75,
            rationale: `Keep both nodes since they are distinct but semantically overlap. Suggest defining a relationship between them to represent their similarity.`,
            createdAt: Date.now(),
          });

          recommendations.push({
            conflictId: conflict.id,
            strategy: ResolutionStrategy.MERGE,
            confidence: 0.6,
            rationale: `Merge them if they are too similar and represent duplicate work under slightly different names.`,
            suggestedNodeState: {
              relatedConcepts: [...new Set([...(targetNode.relatedConcepts || []), ...(conflictingNode.relatedConcepts || [])])],
              metadata: {
                ...conflictingNode.metadata,
                ...targetNode.metadata,
                context: {
                  ...(conflictingNode.metadata?.context || {}),
                  ...(targetNode.metadata?.context || {}),
                  overlapMerged: true
                }
              }
            },
            createdAt: Date.now(),
          });
        }
        break;

      case 'FACT_CONFLICT':
      case 'SOURCE_CONFLICT':
        recommendations.push({
          conflictId: conflict.id,
          strategy: ResolutionStrategy.MANUAL_REVIEW,
          confidence: 0.9,
          rationale: `Fact contradictions or source discrepancies represent fundamental logic conflicts. A manual audit is required to decide which assertion is correct.`,
          createdAt: Date.now(),
        });

        recommendations.push({
          conflictId: conflict.id,
          strategy: ResolutionStrategy.KEEP_EXISTING,
          confidence: 0.6,
          rationale: `Keep current state to prevent corrupting existing knowledge with unverified assertions.`,
          createdAt: Date.now(),
        });
        break;

      case 'OUTDATED_INFORMATION':
      case 'TEMPORAL_CONFLICT':
        recommendations.push({
          conflictId: conflict.id,
          strategy: ResolutionStrategy.REPLACE_EXISTING,
          confidence: 0.85,
          rationale: `Outdated information should be replaced by the newer updates to maintain temporal freshness in the cognitive state.`,
          createdAt: Date.now(),
        });
        
        recommendations.push({
          conflictId: conflict.id,
          strategy: ResolutionStrategy.MERGE,
          confidence: 0.65,
          rationale: `Merge the temporal records, keeping the highest confidence values but updating timestamps to the latest.`,
          suggestedNodeState: {
            lastAccessed: Date.now(),
            confidence: targetNode.confidence,
          },
          createdAt: Date.now(),
        });
        break;

      case 'RELATIONSHIP_CONFLICT':
        recommendations.push({
          conflictId: conflict.id,
          strategy: ResolutionStrategy.MANUAL_REVIEW,
          confidence: 0.95,
          rationale: `Dependency loops violate prerequisite logic. The graph requires manual cycle remediation.`,
          createdAt: Date.now(),
        });
        break;

      default:
        recommendations.push({
          conflictId: conflict.id,
          strategy: ResolutionStrategy.MANUAL_REVIEW,
          confidence: 0.5,
          rationale: `Generic or Custom conflict category. Manual analysis is recommended.`,
          createdAt: Date.now(),
        });
        break;
    }

    // Sort recommendations by confidence descending
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}
