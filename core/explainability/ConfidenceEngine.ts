import { EthicalCheck, PrivacyCheck, KnowledgeNode } from './ExplainabilityTypes';

export interface ConfidenceFactors {
  knowledgeNodes: KnowledgeNode[];
  ethicalChecks: EthicalCheck[];
  privacyChecks: PrivacyCheck[];
  historicalSimilarity?: number; // 0 to 1
  modelConfidence?: number; // 0 to 1
  executionTime?: number; // ms
  carbonImpact?: number; // kg CO2
  hasWarnings?: boolean;
}

export class ConfidenceEngine {
  /**
   * Calculate a normalized confidence score from 0 to 100 based on several factors.
   */
  static calculateConfidence(factors: ConfidenceFactors): number {
    const {
      knowledgeNodes,
      ethicalChecks,
      privacyChecks,
      historicalSimilarity = 0.85,
      modelConfidence = 0.90,
      executionTime = 100,
      carbonImpact = 0.1,
      hasWarnings = false
    } = factors;

    // 1. Knowledge Completeness (based on nodes and their weights)
    let knowledgeScore = 0.8; // default baseline if no nodes
    if (knowledgeNodes.length > 0) {
      const totalWeight = knowledgeNodes.reduce((sum, n) => sum + (n.weight || 0), 0);
      knowledgeScore = totalWeight / knowledgeNodes.length;
    }

    // 2. Ethical Certainty
    let ethicalScore = 1.0;
    if (ethicalChecks.length > 0) {
      let passedCount = 0;
      let totalPenalty = 0;
      for (const check of ethicalChecks) {
        if (check.status === 'passed') {
          passedCount++;
        } else {
          // Penalize based on severity
          if (check.severity === 'critical') totalPenalty += 0.8;
          else if (check.severity === 'high') totalPenalty += 0.5;
          else if (check.severity === 'medium') totalPenalty += 0.2;
          else totalPenalty += 0.05;
        }
      }
      ethicalScore = Math.max(0, (passedCount / ethicalChecks.length) - totalPenalty);
    }

    // 3. Privacy Certainty
    let privacyScore = 1.0;
    if (privacyChecks.length > 0) {
      let passedCount = 0;
      let totalPenalty = 0;
      for (const check of privacyChecks) {
        if (check.status === 'passed') {
          passedCount++;
        } else {
          // Penalize based on impact
          if (check.impact === 'critical' || check.impact === 'high') totalPenalty += 0.6;
          else if (check.impact === 'medium') totalPenalty += 0.3;
          else totalPenalty += 0.05;
        }
      }
      privacyScore = Math.max(0, (passedCount / privacyChecks.length) - totalPenalty);
    }

    // 4. Resource Constraints (Latency & Carbon penalties)
    let resourceScore = 1.0;
    // Penalize long execution times
    if (executionTime > 2000) {
      resourceScore -= 0.2;
    } else if (executionTime > 500) {
      resourceScore -= 0.1;
    }
    // Penalize high carbon footprint
    if (carbonImpact > 1.0) {
      resourceScore -= 0.25;
    } else if (carbonImpact > 0.5) {
      resourceScore -= 0.15;
    }
    if (hasWarnings) {
      resourceScore -= 0.1;
    }
    resourceScore = Math.max(0.3, resourceScore);

    // Weights for each factor
    const weights = {
      knowledge: 0.15,
      ethical: 0.30,
      privacy: 0.25,
      history: 0.10,
      model: 0.10,
      resource: 0.10
    };

    // Calculate final weighted score
    const weightedSum =
      knowledgeScore * weights.knowledge +
      ethicalScore * weights.ethical +
      privacyScore * weights.privacy +
      historicalSimilarity * weights.history +
      modelConfidence * weights.model +
      resourceScore * weights.resource;

    // Scale final score by ethicalScore and privacyScore to apply severe penalties if they are not 1.0
    let finalScore = weightedSum * 100;
    if (ethicalScore === 0) {
      finalScore *= 0.2; // severe ethical penalty
    } else {
      finalScore *= ethicalScore;
    }

    if (privacyScore === 0) {
      finalScore *= 0.3; // severe privacy penalty
    } else {
      finalScore *= privacyScore;
    }

    const normalizedScore = Math.round(finalScore);

    // Boundary guarantees
    return Math.min(100, Math.max(0, normalizedScore));
  }
}
