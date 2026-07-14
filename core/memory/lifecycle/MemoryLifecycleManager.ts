import { MemoryItem, MemoryRetentionPolicy, MemoryStats } from './types';
import { MemoryImportanceScorer } from './MemoryImportanceScorer';
import { MemoryAgingEngine } from './MemoryAgingEngine';
import { DuplicateDetector } from './DuplicateDetector';
import { MemoryArchiveService } from './MemoryArchiveService';
import { MemoryCompressionService } from './MemoryCompressionService';
import { BackgroundOptimizer } from './BackgroundOptimizer';

export class MemoryLifecycleManager {
  private memories: Map<string, MemoryItem> = new Map();
  private policy: MemoryRetentionPolicy;
  private stats: MemoryStats;

  public scorer: MemoryImportanceScorer;
  public agingEngine: MemoryAgingEngine;
  public duplicateDetector: DuplicateDetector;
  public archiveService: MemoryArchiveService;
  public compressionService: MemoryCompressionService;
  public backgroundOptimizer: BackgroundOptimizer;

  private duplicateCount = 0;

  constructor(
    policy?: Partial<MemoryRetentionPolicy>,
    initialMemories: MemoryItem[] = []
  ) {
    this.policy = {
      archiveAfterDays: policy?.archiveAfterDays ?? 30,
      deleteAfterDays: policy?.deleteAfterDays ?? 90,
      compressionThreshold: policy?.compressionThreshold ?? 15,
      minimumImportance: policy?.minimumImportance ?? 0.25,
      optimizationInterval: policy?.optimizationInterval ?? 60,
    };

    this.scorer = new MemoryImportanceScorer();
    this.agingEngine = new MemoryAgingEngine();
    this.duplicateDetector = new DuplicateDetector();
    this.archiveService = new MemoryArchiveService();
    this.compressionService = new MemoryCompressionService();

    this.backgroundOptimizer = new BackgroundOptimizer(
      this.scorer,
      this.agingEngine,
      this.archiveService,
      this.compressionService
    );

    this.stats = {
      activeCount: 0,
      archivedCount: 0,
      pinnedCount: 0,
      duplicateCount: 0,
      totalSavingsBytes: 0,
      lastOptimizationTime: Date.now(),
      storageUsageBytes: 0,
    };

    // Load initial memories if provided
    for (const mem of initialMemories) {
      this.memories.set(mem.id, mem);
    }
    this.updateStats();
  }

  /**
   * Add a new memory to the lifecycle manager
   */
  async addMemory(
    content: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; item?: MemoryItem; duplicateOf?: string; similarity?: number; error?: string }> {
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Content cannot be empty' };
    }

    // 1. Run semantic duplicate detection
    const activeMemories = Array.from(this.memories.values());
    const dupResult = await this.duplicateDetector.findDuplicate(content, activeMemories);

    if (dupResult.isDuplicate) {
      this.duplicateCount++;
      this.updateStats();
      return {
        success: false,
        duplicateOf: dupResult.originalMemoryId,
        similarity: dupResult.similarity,
        error: 'Duplicate memory detected'
      };
    }

    // 2. Create memory item structure
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: MemoryItem = {
      id,
      content,
      importance: 0.5, // placeholder, scorer will calculate
      age: 0.0,
      accessCount: 1,
      lastAccessed: now,
      createdAt: now,
      status: 'active',
      isPinned: false,
      metadata: metadata || {},
    };

    // 3. Initial importance scoring
    newItem.importance = this.scorer.calculateScore(newItem, now);

    // Save item
    this.memories.set(id, newItem);
    this.updateStats();

    return {
      success: true,
      item: newItem,
      similarity: dupResult.similarity,
    };
  }

  /**
   * Retrieve a memory item, updating its access frequency and last accessed time.
   */
  async getMemory(id: string): Promise<MemoryItem | null> {
    const item = this.memories.get(id);
    if (!item) return null;

    // Record access
    item.lastAccessed = Date.now();
    item.accessCount++;

    // Re-score importance
    item.importance = this.scorer.calculateScore(item);

    this.updateStats();
    return item;
  }

  /**
   * Explicitly pin a memory to guarantee it is never auto-archived
   */
  async pinMemory(id: string): Promise<boolean> {
    const item = this.memories.get(id);
    if (!item) return false;

    item.isPinned = true;
    // Pinned memory immediately receives maximum importance score
    item.importance = 1.0;
    item.age = 0.0; // Reset age

    this.updateStats();
    return true;
  }

  /**
   * Unpin a memory
   */
  async unpinMemory(id: string): Promise<boolean> {
    const item = this.memories.get(id);
    if (!item) return false;

    item.isPinned = false;
    // Re-score immediately
    item.importance = this.scorer.calculateScore(item);

    this.updateStats();
    return true;
  }

  /**
   * Explicitly restore an archived memory
   */
  async restoreMemory(id: string): Promise<boolean> {
    const item = this.memories.get(id);
    if (!item) return false;

    const success = this.archiveService.restore(item);
    if (success) {
      item.importance = this.scorer.calculateScore(item);
      this.updateStats();
    }
    return success;
  }

  /**
   * Delete a memory item completely
   */
  async deleteMemory(id: string): Promise<boolean> {
    const success = this.memories.delete(id);
    if (success) {
      this.updateStats();
    }
    return success;
  }

  /**
   * Force active optimization run
   */
  async optimizeNow(force = true): Promise<void> {
    const memoriesList = Array.from(this.memories.values());
    await this.backgroundOptimizer.optimizeNow(
      memoriesList,
      this.policy,
      (updated, stats) => {
        // Sync map
        this.memories.clear();
        for (const item of updated) {
          this.memories.set(item.id, item);
        }
        // Retain duplicate counts
        stats.duplicateCount = this.duplicateCount;
        this.stats = stats;
      },
      force
    );
  }

  /**
   * Starts background optimizer loop
   */
  startBackgroundOptimization(): void {
    this.backgroundOptimizer.start(
      () => Array.from(this.memories.values()),
      () => this.policy,
      (updated, stats) => {
        this.memories.clear();
        for (const item of updated) {
          this.memories.set(item.id, item);
        }
        stats.duplicateCount = this.duplicateCount;
        this.stats = stats;
      },
      this.policy.optimizationInterval * 1000
    );
  }

  /**
   * Stops background optimizer loop
   */
  stopBackgroundOptimization(): void {
    this.backgroundOptimizer.stop();
  }

  /**
   * Get current policy
   */
  getPolicy(): MemoryRetentionPolicy {
    return { ...this.policy };
  }

  /**
   * Update retention policy configurations
   */
  updatePolicy(newPolicy: Partial<MemoryRetentionPolicy>): void {
    this.policy = {
      ...this.policy,
      ...newPolicy,
    };
  }

  /**
   * Get list of all memories
   */
  getAllMemories(): MemoryItem[] {
    return Array.from(this.memories.values());
  }

  /**
   * Get current dashboard statistics
   */
  getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Internal helper to recalculate stats
   */
  private updateStats(): void {
    const list = Array.from(this.memories.values());
    const optStats = this.backgroundOptimizer.calculateStats(list, this.stats.lastOptimizationTime);
    optStats.duplicateCount = this.duplicateCount;
    this.stats = optStats;
  }
}
