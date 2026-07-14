import { MemoryItem, MemoryRetentionPolicy, MemoryStats } from './types';
import { MemoryImportanceScorer } from './MemoryImportanceScorer';
import { MemoryAgingEngine } from './MemoryAgingEngine';
import { MemoryArchiveService } from './MemoryArchiveService';
import { MemoryCompressionService } from './MemoryCompressionService';

export class BackgroundOptimizer {
  private scorer: MemoryImportanceScorer;
  private agingEngine: MemoryAgingEngine;
  private archiveService: MemoryArchiveService;
  private compressionService: MemoryCompressionService;
  private intervalId: any = null;
  private isOptimizing = false;

  constructor(
    scorer: MemoryImportanceScorer,
    agingEngine: MemoryAgingEngine,
    archiveService: MemoryArchiveService,
    compressionService: MemoryCompressionService
  ) {
    this.scorer = scorer;
    this.agingEngine = agingEngine;
    this.archiveService = archiveService;
    this.compressionService = compressionService;
  }

  /**
   * Starts periodic background optimization.
   */
  start(
    memoriesProvider: () => MemoryItem[],
    policyProvider: () => MemoryRetentionPolicy,
    onComplete: (updatedMemories: MemoryItem[], stats: MemoryStats) => void,
    intervalMs: number = 30000
  ): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      if (this.isOptimizing) return;
      await this.runOptimization(memoriesProvider(), policyProvider(), onComplete);
    }, intervalMs);
  }

  /**
   * Stops periodic background optimization.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Explicitly triggers optimization once.
   */
  async optimizeNow(
    memories: MemoryItem[],
    policy: MemoryRetentionPolicy,
    onComplete: (updatedMemories: MemoryItem[], stats: MemoryStats) => void,
    force = true
  ): Promise<void> {
    await this.runOptimization(memories, policy, onComplete, force);
  }

  /**
   * Asynchronous, batched optimization routine.
   */
  private async runOptimization(
    memories: MemoryItem[],
    policy: MemoryRetentionPolicy,
    onComplete: (updatedMemories: MemoryItem[], stats: MemoryStats) => void,
    force = false
  ): Promise<void> {
    this.isOptimizing = true;
    const now = Date.now();

    // 1. Filter out only changed memories since last optimization (or all if force is true)
    const changedMemories = memories.filter(
      (m) =>
        force ||
        !m.lastOptimizedTime ||
        m.lastAccessed > m.lastOptimizedTime ||
        m.createdAt > m.lastOptimizedTime
    );

    const unchangedMemories = memories.filter(
      (m) =>
        !force &&
        m.lastOptimizedTime &&
        m.lastAccessed <= m.lastOptimizedTime &&
        m.createdAt <= m.lastOptimizedTime
    );

    const processedMemories: MemoryItem[] = [];
    const batchSize = 5; // Yield control after processing 5 items to keep UI fluid

    for (let i = 0; i < changedMemories.length; i += batchSize) {
      const batch = changedMemories.slice(i, i + batchSize);

      for (const item of batch) {
        // Recalculate Age
        item.age = this.agingEngine.calculateAge(item, now);

        // Recalculate Importance (and apply decay adjustment)
        const baseImportance = this.scorer.calculateScore(item, now);
        item.importance = this.agingEngine.decayScore(baseImportance, item.age);

        // Evaluate for archival or compression based on policy
        if (item.status === 'active' && !item.isPinned) {
          const inactiveDays = (now - item.lastAccessed) / (24 * 60 * 60 * 1000);

          // Archive check
          if (inactiveDays >= policy.archiveAfterDays || item.importance < policy.minimumImportance) {
            try {
              this.archiveService.archive(item);
            } catch (e) {
              console.error(e);
            }
          }
          // Compression check
          else if (inactiveDays >= policy.compressionThreshold && !item.isCompressed) {
            await this.compressionService.compress(item);
          }
        }

        item.lastOptimizedTime = now;
        processedMemories.push(item);
      }

      // Yield event loop execution back to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Combine updated memories with unchanged ones
    const allMemories = [...unchangedMemories, ...processedMemories];

    // Compute updated stats
    const stats = this.calculateStats(allMemories, now);

    this.isOptimizing = false;
    onComplete(allMemories, stats);
  }

  /**
   * Computes memory statistics
   */
  calculateStats(memories: MemoryItem[], optimizationTime: number): MemoryStats {
    let activeCount = 0;
    let archivedCount = 0;
    let pinnedCount = 0;
    let totalSavings = 0;
    let totalStorage = 0;

    for (const m of memories) {
      if (m.status === 'active') activeCount++;
      if (m.status === 'archived') archivedCount++;
      if (m.isPinned) pinnedCount++;

      // Storage calculation: approximate JSON string length in bytes (2 bytes per char in JS UTF-16)
      const serializedLength = JSON.stringify(m).length * 2;
      totalStorage += serializedLength;

      if (m.isCompressed && m.compressedContent) {
        // Calculate savings: difference in content length
        const savingsBytes = Math.max(0, m.content.length - m.compressedContent.length) * 2;
        totalSavings += savingsBytes;
      }
    }

    return {
      activeCount,
      archivedCount,
      pinnedCount,
      duplicateCount: 0, // Duplicate counts are set by duplicate manager during ingestions
      totalSavingsBytes: totalSavings,
      lastOptimizationTime: optimizationTime,
      storageUsageBytes: totalStorage,
    };
  }
}
