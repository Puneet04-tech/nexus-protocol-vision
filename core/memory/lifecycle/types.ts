/**
 * Type definitions for Adaptive Memory Lifecycle Manager
 */

export interface MemoryItem {
  id: string;
  content: string;
  importance: number; // Score between 0.0 and 1.0
  age: number; // Value representing decay or age factor (0.0 to 1.0, 1.0 being fully aged)
  accessCount: number;
  lastAccessed: number; // Timestamp
  createdAt: number; // Timestamp
  status: 'active' | 'archived';
  isPinned: boolean;
  compressedContent?: string;
  isCompressed?: boolean;
  lastOptimizedTime?: number;
  metadata?: {
    tags?: string[];
    source?: string;
    cognitiveGraphNodeIds?: string[];
    importanceScoreOverride?: number;
    [key: string]: any;
  };
}

export interface MemoryRetentionPolicy {
  archiveAfterDays: number; // Days of inactivity before auto-archival
  deleteAfterDays: number; // Days in archive before auto-deletion (0 means keep forever)
  compressionThreshold: number; // Inactivity days before compressing active memory
  minimumImportance: number; // Min importance below which memories are prioritized for archive/compression
  optimizationInterval: number; // Background optimization run interval in seconds
}

export interface MemoryStats {
  activeCount: number;
  archivedCount: number;
  pinnedCount: number;
  duplicateCount: number;
  totalSavingsBytes: number; // Approximate savings from compression
  lastOptimizationTime: number;
  storageUsageBytes: number; // Current approximate storage footprint
}

export interface ImportanceScorerConfig {
  recencyWeight: number; // Weight for recency in score calculation (0.0 - 1.0)
  frequencyWeight: number; // Weight for access count in score calculation (0.0 - 1.0)
  graphConnectionWeight: number; // Weight for cognitive graph connections (0.0 - 1.0)
}

export interface AgingEngineConfig {
  baseDecayRate: number; // Standard decay rate coefficient
  decayFunction: 'linear' | 'exponential';
}

export interface SimilarityResult {
  isDuplicate: boolean;
  similarity: number;
  originalMemoryId?: string;
}
