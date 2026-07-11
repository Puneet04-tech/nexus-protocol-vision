import { GraphNode } from '../sovereign-persona/types';

/**
 * Utility to identify exact duplicate nodes and semantic overlaps inside the cognitive graph
 */
export class DuplicateDetector {
  /**
   * Compares two node names/IDs to check if they represent the same concept
   */
  public isDuplicate(node1: GraphNode, node2: GraphNode): boolean {
    if (node1.id === node2.id) {
      return true;
    }
    // Normalize IDs to compare alphanumeric formats
    const cleanId1 = node1.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanId2 = node2.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanId1 === cleanId2) {
      return true;
    }
    return false;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  public calculateLevenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[len1][len2];
  }

  /**
   * Calculates similarity between labels (0.0 to 1.0)
   */
  public calculateLabelSimilarity(label1: string, label2: string): number {
    const s1 = label1.toLowerCase().trim();
    const s2 = label2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    
    const distance = this.calculateLevenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    
    return 1 - distance / maxLength;
  }

  /**
   * Evaluates if two nodes have semantic overlap.
   * Semantic overlap occurs if there's high label similarity and common attributes.
   */
  public detectSemanticOverlap(node1: GraphNode, node2: GraphNode): { isOverlap: boolean; score: number } {
    if (node1.id === node2.id) {
      return { isOverlap: false, score: 0 };
    }

    const labelSim = this.calculateLabelSimilarity(node1.id, node2.id);
    
    // Shared concepts overlap
    const rel1 = node1.relatedConcepts || [];
    const rel2 = node2.relatedConcepts || [];
    let sharedCount = 0;
    for (const c of rel1) {
      if (rel2.includes(c)) sharedCount++;
    }
    
    const unionCount = new Set([...rel1, ...rel2]).size;
    const jaccardSim = unionCount > 0 ? sharedCount / unionCount : 0;

    let overlapScore = 0;
    // Weighted scoring
    overlapScore += labelSim * 0.6;
    if (node1.domain === node2.domain) {
      overlapScore += 0.2;
    }
    overlapScore += jaccardSim * 0.2;

    const isOverlap = overlapScore >= 0.7 && labelSim >= 0.65;
    return { isOverlap, score: overlapScore };
  }
}
