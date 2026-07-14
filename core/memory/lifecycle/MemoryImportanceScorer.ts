import { MemoryItem, ImportanceScorerConfig } from './types';

export class MemoryImportanceScorer {
  private config: ImportanceScorerConfig;

  constructor(config?: Partial<ImportanceScorerConfig>) {
    this.config = {
      recencyWeight: config?.recencyWeight ?? 0.4,
      frequencyWeight: config?.frequencyWeight ?? 0.3,
      graphConnectionWeight: config?.graphConnectionWeight ?? 0.3,
    };
  }

  /**
   * Calculate importance score for a given memory item
   */
  calculateScore(item: MemoryItem, currentTimestamp: number = Date.now()): number {
    // Pinned memories are always maximum importance
    if (item.isPinned) {
      return 1.0;
    }

    // Explicit override checks
    if (item.metadata?.importanceScoreOverride !== undefined) {
      return Math.max(0.0, Math.min(1.0, item.metadata.importanceScoreOverride));
    }

    // 1. Recency Score
    // Calculate time elapsed in hours/days (minimum 1 second to avoid division by zero)
    const elapsedMs = Math.max(1000, currentTimestamp - item.lastAccessed);
    const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
    // Sigmoid or simple decay curve for recency: decays as days pass
    const recencyScore = 1.0 / (1.0 + elapsedDays * 0.1); // Halves around 10 days

    // 2. Frequency Score
    // Logarithmic or threshold scaling for access frequency
    const frequencyScore = Math.min(1.0, item.accessCount / 15);

    // 3. Cognitive Graph Relationship Score
    const nodeCount = item.metadata?.cognitiveGraphNodeIds?.length ?? 0;
    const graphScore = Math.min(1.0, nodeCount / 5);

    // Weighted average
    const totalWeight = this.config.recencyWeight + this.config.frequencyWeight + this.config.graphConnectionWeight;
    if (totalWeight === 0) return 0.5;

    const weightedScore = (
      recencyScore * this.config.recencyWeight +
      frequencyScore * this.config.frequencyWeight +
      graphScore * this.config.graphConnectionWeight
    ) / totalWeight;

    // Clamp score strictly between 0.0 and 1.0
    return Math.max(0.0, Math.min(1.0, weightedScore));
  }

  /**
   * Update the configuration of the scorer dynamically
   */
  updateConfig(newConfig: Partial<ImportanceScorerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current weights configuration
   */
  getConfig(): ImportanceScorerConfig {
    return { ...this.config };
  }
}
